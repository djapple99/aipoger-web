// src/app/battle/setup/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isAuthBypassEnabled, mockUserId } from '@/lib/auth-bypass';
import { useI18n } from '@/lib/i18n';
import { readFighterNameFromStorage, writeFighterNameToStorage } from '@/lib/fighter-name-storage';
import { loadFighterNameFromProfile, saveFighterNameToProfile } from '@/lib/user-profile-fighter-name';
import SafetyNotice from '@/components/safety-notice';
import {
  buildDropBattleSchedulePayload,
  cancelCurrentBattleIntent,
  DROP_BATTLE_SCHEDULE_MAX_LEAD_MS,
  DROP_BATTLE_SCHEDULE_MIN_LEAD_MS,
  DROP_BATTLE_SCHEDULE_PRESETS,
  isDropChallengeAcceptable,
  type DropBattleSchedulePreset,
  type DropBattleScheduleValidationError,
  validateDropBattleScheduledStart,
} from '@/lib/battle-pool-client';
import { ACTIVE_DAILY_BATTLE_STATUSES, DAILY_BATTLE_ACTIVE_LIMIT } from '@/lib/daily-battle-rules';
import { fileFromDataUrl, parseAudioMetadata } from '@/lib/audio-metadata';
import { sha256File } from '@/lib/file-hash';

type GenreOption = { value: string; labelKey: string };

const GENRES: GenreOption[] = [
  { value: '流行舞曲', labelKey: 'genre_pop' },
  { value: '感人抒情', labelKey: 'genre_emotion' },
  { value: '熱血搖滾', labelKey: 'genre_rock' },
  { value: '動感電音', labelKey: 'genre_edm' },
  { value: '自我風格', labelKey: 'genre_custom' },
];

const AI_TOOLS = [
  'Suno', 'Udio', 'Lyria', 'Mureka', 'AceStudio', 'MiniMax', 'ElevenLabs', '其他',
];

const ACTIVE_QUEUE_STATUSES = ["pending", "searching", "waiting", "waiting_challenge", "matched", "active"];
const ACTIVE_BATTLE_STATUSES = ["pending", "active", "live"];
const REPLACEABLE_QUEUE_STATUSES = new Set(["pending", "searching", "waiting", "waiting_challenge"]);
const CLOSED_BATTLE_STATUSES = new Set(["finished", "cancelled", "cancelled_no_challenger", "cancelled_founder", "completed", "expired"]);

type BattleDraft = {
  audioPath: string;
  audioSha256?: string;
  hookStart: string;
  hookEnd: string;
  hookDuration: string;
  lyrics: string;
};

type ActiveBattleLock =
  | { kind: "queue"; id: string; status: string; battleId?: string | null }
  | { kind: "battle"; id: string; status: string };

type BattleMode = 'instant' | 'daily';
type InstantPairingMode = 'auto' | 'invite';
type DailyPairingMode = 'auto' | 'invite';

function imageContentType(file: File): string {
  if (file.type && file.type.startsWith('image/')) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return map[ext] ?? 'image/jpeg';
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_DAILY_AUDIO_BYTES = 200 * 1024 * 1024;
const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp';
const DAILY_AUDIO_ACCEPT = 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aiff,audio/x-aiff,audio/mp4,audio/aac,.mp3,.wav,.aif,.aiff,.m4a,.aac';
const DAILY_LYRICS_ACCEPT = '.txt,.lrc,text/plain';
const MAX_LYRICS_CHARS = 8000;
const PENDING_AUDIO_COVER_KEY = 'aipoger:pending-audio-cover';
type BattleStartOption = DropBattleSchedulePreset | 'custom';

function safeAudioFileName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || `daily-track-${Date.now()}`;
}

function audioContentTypeFallback(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.aif') || name.endsWith('.aiff')) return 'audio/aiff';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.m4a')) return 'audio/mp4';
  if (name.endsWith('.aac')) return 'audio/aac';
  return file.type || 'audio/mpeg';
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function isAllowedAvatarFile(file: File): boolean {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
}

function storeBattleAssetSession(avatarUrl: string | null, coverUrl: string | null): string | null {
  if (typeof window === 'undefined') return null;
  if (!avatarUrl && !coverUrl) return null;
  const key = `setup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(
    `aipoger:battle-assets:${key}`,
    JSON.stringify({ avatarUrl, coverUrl }),
  );
  return key;
}

function setCompactParam(params: URLSearchParams, key: string, value: string | null | undefined, maxLength = 1800) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > maxLength) return;
  params.set(key, trimmed);
}

async function findActiveBattleLock(userId: string): Promise<ActiveBattleLock | null> {
  const { data: queueRows, error: queueError } = await supabase
    .from("battle_queue")
    .select("id, status, match_group_id, created_at")
    .eq("user_id", userId)
    .in("status", ACTIVE_QUEUE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1);

  if (queueError) throw queueError;
  const activeQueue = queueRows?.[0] as { id: string; status: string; match_group_id?: string | null } | undefined;
  if (activeQueue?.id) {
    if (activeQueue.match_group_id) {
      const { data: linkedBattle } = await supabase
        .from("battles")
        .select("id, status, battle_ended_at")
        .eq("id", activeQueue.match_group_id)
        .maybeSingle();
      const status = typeof linkedBattle?.status === "string" ? linkedBattle.status : "";
      if (linkedBattle?.battle_ended_at || CLOSED_BATTLE_STATUSES.has(status)) {
        void supabase.from("battle_queue").update({ status: "completed" }).eq("id", activeQueue.id);
        return null;
      }
    }
    return { kind: "queue", id: activeQueue.id, status: activeQueue.status, battleId: activeQueue.match_group_id ?? null };
  }

  const { data: battleRows, error: battleError } = await supabase
    .from("battles")
    .select("id, status, battle_ended_at, created_at")
    .or(`fighter_a_user_id.eq.${userId},fighter_b_user_id.eq.${userId}`)
    .in("status", ACTIVE_BATTLE_STATUSES)
    .is("battle_ended_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (battleError) throw battleError;
  const activeBattle = battleRows?.[0] as { id: string; status: string } | undefined;
  return activeBattle?.id ? { kind: "battle", id: activeBattle.id, status: activeBattle.status } : null;
}

function canReplaceActiveBattleLock(lock: ActiveBattleLock): boolean {
  return lock.kind === "queue" && !lock.battleId && REPLACEABLE_QUEUE_STATUSES.has(lock.status);
}

function existingBattleMessage(lang: string): string {
  return lang === "zh"
    ? "你目前已有一張 Drop Battle 戰帖卡正在等待挑戰。要挑戰這首歌，系統會先取消你原本等待中的 Drop。"
    : "You already have one Drop Battle challenge card waiting. To challenge this track, your previous waiting Drop will be cancelled first.";
}

function lockedBattleMessage(lang: string): string {
  return lang === "zh"
    ? "你目前已有一場 Drop Battle 進行中。請先完成或取消目前這場 Drop，再開始下一場 Drop。"
    : "You already have an active Drop Battle. Finish or cancel this Drop before starting another one.";
}

function extractErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    return [rec.message, rec.details, rec.hint, rec.error]
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join(' ')
      .trim();
  }
  return '';
}

function isDailySchemaMissingMessage(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (!lower.includes('daily_battle_entries')) return false;
  return (
    lower.includes('does not exist')
    || lower.includes('42p01')
    || lower.includes('relation')
    || lower.includes('schema cache')
    || lower.includes('could not find the table')
  );
}

function isMissingAudioHashColumnMessage(raw: string): boolean {
  return /audio_sha256|schema cache|column.*does not exist|PGRST204/i.test(raw);
}

function isDuplicateAudioHashMessage(raw: string): boolean {
  return /audio_sha256|duplicate key value|23505/i.test(raw);
}

function friendlyDailyErrorMessage(lang: string, err: unknown): string {
  const raw = extractErrorMessage(err);
  const lower = raw.toLowerCase();
  const fallback = lang === 'zh' ? '上傳失敗，請稍後再試。' : 'Upload failed. Please try again.';
  if (!raw) return fallback;

  if (
    lower.includes('daily_battle_entries_one_active_per_user')
    || lower.includes('今日 daily battle 已達 1 場')
    || lower.includes('24h full song 挑戰尚未結束')
    || lower.includes('duplicate key value')
  ) {
    if (isDuplicateAudioHashMessage(raw)) {
      return lang === 'zh'
        ? '這個音檔已經上傳過了，請換另一首歌。'
        : 'This exact audio file has already been uploaded. Please choose another track.';
    }
    return lang === 'zh'
      ? '你目前已有一場 24H Full Song 挑戰尚未結束。請先完成、取消或等它過期後再發起下一場。'
      : 'You already have one active 24H Full Song battle. Finish, cancel, or let it expire before starting another.';
  }

  if (isDailySchemaMissingMessage(raw)) {
    return lang === 'zh'
      ? '24H Daily Battle 尚未在資料庫啟用，請先執行 `supabase/daily_battle_system.sql`。'
      : '24H Daily Battle tables are not ready in Supabase yet. Run `supabase/daily_battle_system.sql` first.';
  }

  if (
    lower.includes('maximum allowed size')
    || lower.includes('object exceeded')
    || lower.includes('too large')
    || lower.includes('entity too large')
    || lower.includes('payload too large')
    || lower.includes('413')
  ) {
    return lang === 'zh'
      ? '整首音檔超過目前可上傳大小上限。請改用較小檔案（建議 MP3 / M4A），或請管理員把 battle-audio 容量上限調高。'
      : 'Full track is larger than the upload limit. Use a smaller file (MP3 / M4A recommended), or ask admin to raise battle-audio size limit.';
  }

  if (
    lower.includes('mime')
    || lower.includes('invalidmimetype')
    || lower.includes('unsupported media type')
    || lower.includes('415')
  ) {
    return lang === 'zh'
      ? '音檔格式目前不被儲存桶接受。請先用 MP3 / WAV / M4A，再上傳一次。'
      : 'This audio MIME type is not allowed by the storage bucket. Try MP3 / WAV / M4A.';
  }

  if (
    lower.includes('row-level security')
    || lower.includes('permission denied')
    || lower.includes('not authenticated')
    || lower.includes('42501')
  ) {
    return lang === 'zh'
      ? '權限驗證失敗，請重新登入後再試。'
      : 'Permission check failed. Please sign in again and retry.';
  }

  return lang === 'zh' ? `上傳失敗：${raw}` : `Upload failed: ${raw}`;
}

function currentReturnPath(): string {
  if (typeof window === 'undefined') return '/battle/setup';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function authHrefForCurrentPage(): string {
  return `/auth?next=${encodeURIComponent(currentReturnPath())}`;
}

async function getFreshSession() {
  const current = await supabase.auth.getSession();
  if (current.data.session?.user) return current.data.session;
  const refreshed = await supabase.auth.refreshSession().catch(() => null);
  return refreshed?.data.session ?? null;
}

function toDatetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
}

function defaultHookBattleAtValue() {
  const date = new Date(Date.now() + 10 * 60 * 1000);
  date.setSeconds(0, 0);
  return toDatetimeLocalValue(date);
}

function datetimeLocalToIso(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function hookBattleAtValueForPreset(minutes: DropBattleSchedulePreset) {
  const date = new Date(Date.now() + minutes * 60 * 1000);
  date.setSeconds(0, 0);
  return toDatetimeLocalValue(date);
}

function scheduleErrorMessage(lang: string, error: DropBattleScheduleValidationError) {
  if (error === 'too_late') {
    return lang === 'zh'
      ? '自訂開戰時間必須在 24 小時內。'
      : 'Custom start time must be within 24 hours.';
  }
  if (error === 'past') {
    return lang === 'zh'
      ? '開戰時間不能是過去，至少要保留 1 分鐘。'
      : 'Start time cannot be in the past. Leave at least 1 minute.';
  }
  return lang === 'zh'
    ? '請設定有效的開戰時間。'
    : 'Set a valid start time.';
}

export default function BattleSetupPage() {
  const router = useRouter();
  const { t, lang } = useI18n();

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);
  const [savedCoverUrl, setSavedCoverUrl] = useState<string | null>(null);

  const [fighterName, setFighterName] = useState('');
  const [songName, setSongName] = useState('');
  const [genre, setGenre] = useState('');
  const [aiTool, setAiTool] = useState('');
  const [otherTool, setOtherTool] = useState('');
  const [challengeEntryId, setChallengeEntryId] = useState<string | null>(null);
  const [challengeDailyEntryId, setChallengeDailyEntryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BattleDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const [battleMode, setBattleMode] = useState<BattleMode>('instant');
  const [instantPairingMode, setInstantPairingMode] = useState<InstantPairingMode>('auto');
  const [dailyPairingMode, setDailyPairingMode] = useState<DailyPairingMode>('auto');
  const [hookBattleAt, setHookBattleAt] = useState(defaultHookBattleAtValue);
  const [battleStartOption, setBattleStartOption] = useState<BattleStartOption>('custom');
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [dailyBattleCount, setDailyBattleCount] = useState(0);
  const [dailySchemaMissing, setDailySchemaMissing] = useState(false);
  const [dailyAudioFile, setDailyAudioFile] = useState<File | null>(null);
  const [dailyUploadBusy, setDailyUploadBusy] = useState(false);
  const [dailyLyricsFileName, setDailyLyricsFileName] = useState<string | null>(null);
  const [dailyDetectedLyrics, setDailyDetectedLyrics] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarUploadSectionRef = useRef<HTMLDivElement>(null);
  const dailyAudioInputRef = useRef<HTMLInputElement>(null);
  const dailyLyricsInputRef = useRef<HTMLInputElement>(null);

  const [uploadUserId, setUploadUserId] = useState<string | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUploadUserId(data.session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || coverPreview || coverFile) return;
    const raw = window.sessionStorage.getItem(PENDING_AUDIO_COVER_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { dataUrl?: unknown; fileName?: unknown };
      if (typeof parsed.dataUrl !== 'string' || !parsed.dataUrl.startsWith('data:image/')) return;
      const file = fileFromDataUrl(parsed.dataUrl, typeof parsed.fileName === 'string' ? parsed.fileName : 'embedded-cover.jpg');
      setCoverFile(file);
      setCoverPreview(parsed.dataUrl);
      window.sessionStorage.removeItem(PENDING_AUDIO_COVER_KEY);
    } catch {
      window.sessionStorage.removeItem(PENDING_AUDIO_COVER_KEY);
    }
  }, [coverFile, coverPreview]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlName = params.get('fighterName');
        const urlSongName = params.get('songName');
        const urlGenre = params.get('genre');
        const urlAiTool = params.get('aiTool');
        const urlChallengeEntryId = params.get('challengeEntryId');
        const urlChallengeDailyEntryId = params.get('challengeDailyEntryId');
        const urlAudioPath = params.get('audioPath');
        const urlAudioSha256 = params.get('audioSha256');
        const urlBattleMode = params.get('battleMode');
        const urlInstantPairing = params.get('instantPairing');
        const urlDailyPairing = params.get('dailyPairing');
        const urlHookBattleAt = params.get('hookBattleAt') || params.get('scheduledBattleAt');
        if (urlGenre) setGenre(urlGenre);
        if (urlSongName) setSongName(urlSongName);
        if (urlAiTool) setAiTool(urlAiTool);
        if (urlBattleMode === 'daily') setBattleMode('daily');
        if (urlInstantPairing === 'invite') setInstantPairingMode('invite');
        if (urlDailyPairing === 'invite') setDailyPairingMode('invite');
        if (urlHookBattleAt) {
          const parsed = new Date(urlHookBattleAt);
          if (Number.isFinite(parsed.getTime())) setHookBattleAt(toDatetimeLocalValue(parsed));
          else setHookBattleAt(urlHookBattleAt);
          setBattleStartOption('custom');
        }
        if (urlAudioPath) {
          setDraft({
            audioPath: urlAudioPath,
            hookStart: params.get('hookStart') ?? '',
            hookEnd: params.get('hookEnd') ?? '',
            hookDuration: params.get('hookDuration') ?? '',
            lyrics: params.get('lyrics') ?? '',
            audioSha256: /^[a-f0-9]{64}$/i.test(urlAudioSha256 ?? '') ? urlAudioSha256!.toLowerCase() : undefined,
          });
        }
        if (urlChallengeEntryId && /^[0-9a-f-]{36}$/i.test(urlChallengeEntryId)) {
          setChallengeEntryId(urlChallengeEntryId);
          setInstantPairingMode('auto');
        }
        if (urlChallengeDailyEntryId && /^[0-9a-f-]{36}$/i.test(urlChallengeDailyEntryId)) {
          setChallengeDailyEntryId(urlChallengeDailyEntryId);
          setBattleMode('daily');
          setDailyPairingMode('invite');
        }
        if (urlName) {
          try {
            setFighterName(decodeURIComponent(urlName.replace(/\+/g, ' ')));
          } catch {
            setFighterName(urlName);
          }
        }
        if (isAuthBypassEnabled) {
          if (!urlName) {
            const ls = readFighterNameFromStorage();
            if (ls) setFighterName(ls);
          }
          setDraftChecked(true);
          return;
        }
        const session = await getFreshSession();
        if ((urlChallengeEntryId || urlChallengeDailyEntryId) && !session?.user) {
          router.replace(authHrefForCurrentPage());
          setDraftChecked(true);
          return;
        }
        if (session?.user) {
        if (!urlName) {
          const fromProfile = await loadFighterNameFromProfile(session.user.id);
          if (fromProfile) setFighterName(fromProfile);
        }
        const [{ data, error: avErr }, { data: fighterProfile }] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('avatar_url')
            .eq('id', session.user.id)
            .maybeSingle(),
          supabase
            .from('fighter_profiles')
            .select('avatar_url, song_cover_url')
            .eq('id', session.user.id)
            .maybeSingle(),
        ]);
        if (typeof fighterProfile?.avatar_url === 'string' && fighterProfile.avatar_url.length > 0) {
          setSavedAvatarUrl(fighterProfile.avatar_url);
        }
        if (typeof fighterProfile?.song_cover_url === 'string' && fighterProfile.song_cover_url.length > 0) {
          setSavedCoverUrl(fighterProfile.song_cover_url);
        }
        if (!avErr && typeof data?.avatar_url === 'string' && data.avatar_url.length > 0) {
          setProfileAvatarPreview(data.avatar_url);
        } else {
          const meta = session.user.user_metadata as Record<string, unknown> | undefined;
          const oauthAvatar = typeof meta?.avatar_url === 'string'
            ? meta.avatar_url
            : typeof meta?.picture === 'string'
              ? meta.picture
              : null;
          if (oauthAvatar) setProfileAvatarPreview(oauthAvatar);
        }
        const { count: activeDailyCount, error: dailyCountError } = await supabase
          .from('daily_battle_entries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .in('status', ACTIVE_DAILY_BATTLE_STATUSES);
        if (!dailyCountError) {
          setDailyBattleCount(activeDailyCount ?? 0);
        } else if (isDailySchemaMissingMessage(extractErrorMessage(dailyCountError))) {
          setDailySchemaMissing(true);
          setFormError(
            lang === 'zh'
              ? '24H Daily Battle 尚未啟用（資料表缺失）。請先執行 `supabase/daily_battle_system.sql`。'
              : '24H Daily Battle is not enabled yet (missing tables). Run `supabase/daily_battle_system.sql` first.',
          );
          setBattleMode('instant');
        }
        setDraftChecked(true);
        return;
      }
        if (!urlName) {
          const ls = readFighterNameFromStorage();
          if (ls) setFighterName(ls);
        }
      } catch (error) {
        console.warn('[battle-setup] initial load fallback', error);
      }
      setDraftChecked(true);
    })();
  }, [lang, router]);

  useEffect(() => {
    if (dailyBattleCount >= DAILY_BATTLE_ACTIVE_LIMIT && battleMode === 'daily') {
      setBattleMode('instant');
    }
  }, [battleMode, dailyBattleCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#avatar-upload') return;
    const timer = window.setTimeout(() => {
      avatarUploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  // ── 頭像上傳 ──────────────────────────────────────────
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAllowedAvatarFile(file)) {
      alert(t('avatar_invalid_type'));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      alert(t('avatar_max_2mb'));
      return;
    }
    setFormError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const openAvatarPicker = () => {
    if (isAuthBypassEnabled) {
      alert('開發模式（AUTH_BYPASS）無法上傳至 Storage，請關閉後再試。');
      return;
    }
    if (!uploadUserId) {
      alert(t('setup_need_login'));
      router.push(authHrefForCurrentPage());
      return;
    }
    avatarInputRef.current?.click();
  };

  // ── 封面圖上傳 ────────────────────────────────────────
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('封面圖片不能超過 5MB');
      return;
    }
    setFormError(null);
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDailyAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    setFormError(null);
    if (!file) {
      setDailyAudioFile(null);
      setDailyDetectedLyrics('');
      return;
    }

    if (file.size > MAX_DAILY_AUDIO_BYTES) {
      setDailyAudioFile(null);
      setDailyDetectedLyrics('');
      setFormError(
        lang === 'zh'
          ? `檔案過大（${formatBytes(file.size)}）。目前 24H Battle 上傳上限是 ${formatBytes(MAX_DAILY_AUDIO_BYTES)}，請先壓縮後再上傳。`
          : `File too large (${formatBytes(file.size)}). 24H Battle limit is ${formatBytes(MAX_DAILY_AUDIO_BYTES)}. Please compress first.`,
      );
      return;
    }

    setDailyAudioFile(file);

    const metadata = await parseAudioMetadata(file);
    setSongName((current) => current.trim() || metadata.title || metadata.fallbackTitle);
    setFighterName((current) => current.trim() || metadata.artist || current);
    if (metadata.genre && metadata.genre.toLowerCase() !== 'ai music') {
      setGenre((current) => current.trim() || metadata.genre || current);
    }
    if (metadata.lyrics) setDailyDetectedLyrics(metadata.lyrics.slice(0, MAX_LYRICS_CHARS));
    if (metadata.cover && !coverFile && !coverPreview) {
      setCoverFile(new File([metadata.cover.blob], metadata.cover.fileName, { type: metadata.cover.mimeType }));
      setCoverPreview(metadata.cover.previewUrl);
    }
  };

  const handleDailyLyricsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormError(null);
    const text = (await file.text()).slice(0, MAX_LYRICS_CHARS);
    setDraft((prev) => (prev ? { ...prev, lyrics: text } : prev));
    setDailyLyricsFileName(file.name);
  };

  // ── 上傳檔案到 Supabase Storage ───────────────────────
  const uploadFile = async (file: File, userId: string, type: 'avatar' | 'cover'): Promise<string | null> => {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${type}.${ext}`;
    const contentType = imageContentType(file);

    const { error } = await supabase.storage
      .from('battle-audio')
      .upload(path, file, { upsert: true, contentType });

    if (error) {
      console.error(`Upload ${type} failed:`, error);
      return null;
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('battle-audio')
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1年有效期

    if (signErr) {
      console.error(`Signed URL ${type}:`, signErr);
      return null;
    }

    return signed?.signedUrl ?? null;
  };

  const uploadDailyFullAudio = async () => {
    if (!dailyAudioFile) {
      setFormError(lang === 'zh' ? '請先選擇要進入 24H Daily Battle 的整首歌曲。' : 'Choose a full track for 24H Daily Battle first.');
      return;
    }

    setFormError(null);
    setDailyUploadBusy(true);
    setUploadProgress(lang === 'zh' ? '上傳整首歌曲…' : 'Uploading full track…');
    try {
      let userId = mockUserId;
      if (!isAuthBypassEnabled) {
        const session = await getFreshSession();
        if (!session?.user) {
          alert(t('setup_need_login'));
          router.push(authHrefForCurrentPage());
          setDailyUploadBusy(false);
          return;
        }
        userId = session.user.id;
      }

      const audioSha256 = await sha256File(dailyAudioFile);
      const duplicateCheck = await supabase
        .from('daily_battle_entries')
        .select('id,title,status')
        .eq('audio_sha256', audioSha256)
        .in('status', ['queued', 'matched', 'live'])
        .limit(1)
        .maybeSingle<{ id: string; title: string | null; status: string | null }>();
      if (duplicateCheck.error) {
        const msg = extractErrorMessage(duplicateCheck.error);
        if (!isMissingAudioHashColumnMessage(msg)) throw duplicateCheck.error;
      }
      if (duplicateCheck.data?.id) {
        throw new Error(
          lang === 'zh'
            ? `這個音檔已經在 24H Battle 裡了：${duplicateCheck.data.title || '未命名歌曲'}。請換另一首歌。`
            : `This exact audio file is already in 24H Battle: ${duplicateCheck.data.title || 'Untitled'}. Choose another track.`,
        );
      }

      let audioPath = '';
      if (isAuthBypassEnabled) {
        audioPath = URL.createObjectURL(dailyAudioFile);
      } else {
        const storagePath = `${userId}/daily/${Date.now()}-${safeAudioFileName(dailyAudioFile.name)}`;
        const { error } = await supabase.storage
          .from('battle-audio')
          .upload(storagePath, dailyAudioFile, {
            upsert: false,
            contentType: audioContentTypeFallback(dailyAudioFile),
          });
        if (error) throw error;
        audioPath = storagePath;
      }

      setDraft((prev) => ({
        audioPath,
        audioSha256,
        hookStart: '0',
        hookEnd: '',
        hookDuration: 'full',
        lyrics: prev?.lyrics || dailyDetectedLyrics,
      }));
      setUploadProgress(lang === 'zh' ? '整首歌已上傳，補資料後建立 24H Battle。' : 'Full track uploaded. Finish the card to create 24H Battle.');
      window.setTimeout(() => {
        document.getElementById('battle-info')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    } catch (error) {
      console.error('[daily-battle full upload]', error);
      setFormError(friendlyDailyErrorMessage(lang, error));
    } finally {
      setDailyUploadBusy(false);
    }
  };

  // ── 儲存 fighter_profile ──────────────────────────────
  const saveFighterProfile = async (
    userId: string,
    name: string,
    avatarUrl: string | null,
    coverUrl: string | null,
  ) => {
    await supabase.from('fighter_profiles').upsert(
      {
        id: userId,
        display_name: name,
        avatar_url: avatarUrl,
        song_cover_url: coverUrl,
      },
      { onConflict: 'id' },
    );
  };

  // ── 提交 ─────────────────────────────────────────────
  const handleSubmit = async () => {
    const finalAiTool = aiTool === '其他' ? otherTool.trim() : aiTool;
    const shouldScheduleDropBattle = battleMode === 'instant' && instantPairingMode === 'invite' && !challengeEntryId;
    const scheduledHookStartIso = shouldScheduleDropBattle ? datetimeLocalToIso(hookBattleAt) : null;
    const scheduleValidation = shouldScheduleDropBattle
      ? validateDropBattleScheduledStart(scheduledHookStartIso)
      : null;

    if (scheduleValidation) {
      const message = scheduleErrorMessage(lang, scheduleValidation);
      setScheduleError(message);
      return;
    }
    setScheduleError(null);

    if (!draft?.audioPath) {
      if (battleMode === 'daily') {
        setFormError(lang === 'zh' ? '24H Daily Battle 使用整首歌，請先上傳完整音檔。' : '24H Daily Battle uses the full track. Upload the complete audio first.');
        return;
      }
      const params = new URLSearchParams({
        flow: 'upload-first',
        lang,
        battleMode,
        instantPairing: instantPairingMode,
        dailyPairing: dailyPairingMode,
      });
      if (challengeEntryId) params.set('challengeEntryId', challengeEntryId);
      if (challengeDailyEntryId) params.set('challengeDailyEntryId', challengeDailyEntryId);
      if (challengeEntryId && genre.trim()) params.set('genre', genre.trim());
      if (shouldScheduleDropBattle) {
        params.set('hookBattleAt', hookBattleAt);
      }
      router.push(`/battle/hook-cut?${params.toString()}`);
      return;
    }

    if (!fighterName.trim() || !songName.trim() || (!challengeEntryId && !genre) || (aiTool === '其他' && !finalAiTool)) {
      setFormError(t('setup_required_error'));
      return;
    }

    setFormError(null);
    setUploading(true);
    setUploadProgress('準備上傳…');

    try {
      let userId: string;
      let accessToken = "";
      if (isAuthBypassEnabled) {
        userId = mockUserId;
      } else {
        const session = await getFreshSession();
        if (!session?.user) {
          alert(t('setup_need_login'));
          router.push(authHrefForCurrentPage());
          setUploading(false);
          return;
        }
        userId = session.user.id;
        accessToken = session.access_token;
      }

      // 上傳頭像（略過遠端儲存：開發 bypass 無有效 JWT，無法通過 Storage RLS）
      let avatarUrl: string | null = null;
      if (avatarFile && !isAuthBypassEnabled) {
        setUploadProgress('上傳頭像…');
        avatarUrl = await uploadFile(avatarFile, userId, 'avatar');
        if (!avatarUrl) {
          alert(t('storage_upload_failed'));
          setUploading(false);
          return;
        }
      }

      let coverUrl: string | null = null;
      if (coverFile && !isAuthBypassEnabled) {
        setUploadProgress('上傳封面…');
        coverUrl = await uploadFile(coverFile, userId, 'cover');
        if (!coverUrl) {
          alert(t('storage_upload_failed'));
          setUploading(false);
          return;
        }
      }

      const finalAvatarUrl = avatarUrl ?? savedAvatarUrl ?? profileAvatarPreview;
      const finalCoverUrl = coverUrl ?? savedCoverUrl;

      setUploadProgress('儲存資料…');

      if (!isAuthBypassEnabled) {
        await saveFighterProfile(userId, fighterName.trim(), finalAvatarUrl, finalCoverUrl);
        await saveFighterNameToProfile(userId, fighterName.trim());
      } else {
        writeFighterNameToStorage(fighterName.trim());
      }

      const safeQueryImage = (value: string | null) => {
        if (!value) return null;
        if (value.startsWith('data:')) return null;
        return value.length < 8000 ? value : null;
      };
      const avatarForBattle = safeQueryImage(finalAvatarUrl);
      const coverForBattle = safeQueryImage(finalCoverUrl);

      const assetKey = storeBattleAssetSession(
        avatarForBattle ? null : displayAvatarUrl,
        coverForBattle ? null : displayCoverUrl,
      );

      if (battleMode === 'daily') {
        if (dailySchemaMissing) {
          setFormError(
            lang === 'zh'
              ? '24H Daily Battle 尚未啟用（資料表缺失），請先執行 `supabase/daily_battle_system.sql`。'
              : '24H Daily Battle is not enabled yet (missing tables). Run `supabase/daily_battle_system.sql` first.',
          );
          setUploading(false);
          return;
        }
        if (!isAuthBypassEnabled && dailyBattleCount >= DAILY_BATTLE_ACTIVE_LIMIT) {
          setFormError(
            lang === 'zh'
              ? '你目前已有一場 24H Full Song 挑戰尚未結束。請先完成、取消或等它過期後再發起下一場。'
              : 'You already have one active 24H Full Song battle. Finish, cancel, or let it expire before starting another.',
          );
          setUploading(false);
          return;
        }

        setUploadProgress(lang === 'zh' ? '建立 24H Daily Battle…' : 'Creating 24H Daily Battle…');

        let dailyPayload: { error?: string; entryId?: string; battleId?: string | null } | null = null;
        if (!isAuthBypassEnabled) {
          const response = await fetch('/api/daily-battle/create-entry', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              title: songName.trim(),
              genre: genre.trim(),
              aiTool: finalAiTool.trim() || null,
              audioPath: draft.audioPath,
              audioSha256: draft.audioSha256 ?? null,
              avatarUrl: avatarForBattle ?? finalAvatarUrl,
              coverUrl: coverForBattle ?? finalCoverUrl,
              lyrics: draft.lyrics.trim() || null,
              pairingMode: dailyPairingMode,
              fighterName: fighterName.trim(),
              challengeDailyEntryId,
            }),
          });
          dailyPayload = (await response.json().catch(() => null)) as { error?: string; entryId?: string; battleId?: string | null } | null;
          if (!response.ok) {
            throw new Error(dailyPayload?.error || (lang === 'zh' ? '建立 24H Daily Battle 失敗。' : 'Failed to create 24H Daily Battle.'));
          }

          if (dailyPayload?.battleId) {
            setUploadProgress(lang === 'zh' ? '挑戰成立，進入 24H 戰場…' : 'Challenge created. Entering 24H room...');
            router.push(`/battle/daily/${dailyPayload.battleId}?lang=${lang}`);
            return;
          }
        }

        setDailyBattleCount((count) => count + 1);
        setUploadProgress(lang === 'zh' ? '完成！進入 24H 等待房…' : 'Done. Entering 24H waiting room...');
        if (dailyPayload?.entryId) {
          router.push(`/battle/daily/waiting-room/${dailyPayload.entryId}?lang=${lang}`);
        } else {
          const params = new URLSearchParams({ lang, dailyBattle: 'queued', mode: dailyPairingMode });
          router.push(`/battle?${params.toString()}`);
        }
        return;
      }

      setUploadProgress('建立 Battle Pool…');

      let queueIdForNav: string;
      let battleGenre = genre.trim();
      if (isAuthBypassEnabled) {
        queueIdForNav = `mock-${Date.now()}`;
      } else {
        const activeLock = await findActiveBattleLock(userId);
        if (activeLock) {
          if (challengeEntryId && canReplaceActiveBattleLock(activeLock)) {
            const ok = window.confirm(existingBattleMessage(lang));
            if (!ok) {
              setUploading(false);
              return;
            }
            setUploadProgress(lang === "zh" ? "取消原本等待中的 Drop…" : "Cancelling previous waiting Drop…");
            await cancelCurrentBattleIntent({ accessToken });
          } else {
            alert(lockedBattleMessage(lang));
            setUploading(false);
            return;
          }
        }

        if (challengeEntryId) {
          let { data: targetEntry, error: targetError } = await supabase
            .from('battle_queue')
            .select('id,user_id,status,genre,expires_at,scheduled_start_at,cancellation_evaluation_at')
            .eq('id', challengeEntryId)
            .maybeSingle<{ id: string; user_id: string; status: string; genre: string | null; expires_at: string | null; scheduled_start_at?: string | null; cancellation_evaluation_at?: string | null }>();
          if (targetError) {
            const msg = `${targetError.message ?? ''} ${targetError.details ?? ''} ${targetError.hint ?? ''}`;
            const missingScheduleColumn = /scheduled_start_at|cancellation_evaluation_at|schema cache|column.*does not exist|PGRST204/i.test(msg);
            if (missingScheduleColumn) {
              const legacyRead = await supabase
                .from('battle_queue')
                .select('id,user_id,status,genre,expires_at')
                .eq('id', challengeEntryId)
                .maybeSingle<{ id: string; user_id: string; status: string; genre: string | null; expires_at: string | null }>();
              targetEntry = legacyRead.data;
              targetError = legacyRead.error;
            }
          }
          if (targetError) throw targetError;
          if (!targetEntry?.id) {
            throw new Error(lang === 'zh' ? '這張 Drop Battle 挑戰卡已不存在，請回公開挑戰池重新選一場。' : 'This Drop Battle card no longer exists. Choose another one from the pool.');
          }
          if (targetEntry.user_id === userId) {
            throw new Error(lang === 'zh' ? '不能接受自己的 Drop Battle 挑戰卡。' : 'You cannot accept your own Drop Battle challenge.');
          }
          if (!isDropChallengeAcceptable(targetEntry)) {
            throw new Error(lang === 'zh' ? '這張 Drop Battle 挑戰卡已失效或已被接受，請回公開挑戰池重新選一場。' : 'This Drop Battle challenge is no longer open. Choose another one from the pool.');
          }
          if (targetEntry.genre?.trim()) {
            battleGenre = targetEntry.genre.trim();
            if (battleGenre !== genre.trim()) setGenre(battleGenre);
          }
        }

        const initialQueueStatus: "searching" | "waiting_challenge" =
          challengeEntryId || instantPairingMode === 'auto' ? 'searching' : 'waiting_challenge';
        if (draft.audioSha256) {
          const duplicateCheck = await supabase
            .from('battle_queue')
            .select('id, original_file_name, status')
            .eq('audio_sha256', draft.audioSha256)
            .in('status', ACTIVE_QUEUE_STATUSES)
            .limit(1)
            .maybeSingle<{ id: string; original_file_name: string | null; status: string | null }>();
          if (duplicateCheck.error) {
            const msg = extractErrorMessage(duplicateCheck.error);
            if (!isMissingAudioHashColumnMessage(msg)) throw duplicateCheck.error;
          }
          if (duplicateCheck.data?.id) {
            throw new Error(
              lang === 'zh'
                ? `這個 Drop 音檔已經在 Battle Pool 裡了：${duplicateCheck.data.original_file_name || '未命名 Drop'}。請換另一段 Drop。`
                : `This exact Drop is already in the Battle Pool: ${duplicateCheck.data.original_file_name || 'Untitled Drop'}. Choose another Drop.`,
            );
          }
        }
        const baseRow = {
          user_id: userId,
          fighter_name: fighterName.trim(),
          genre: battleGenre,
          audio_path: draft.audioPath,
          audio_sha256: draft.audioSha256 ?? null,
          original_file_name: songName.trim().slice(0, 500),
          status: initialQueueStatus,
        };
        const optionalChallenge =
          challengeEntryId && /^[0-9a-f-]{36}$/i.test(challengeEntryId)
            ? { challenge_target_queue_id: challengeEntryId }
            : {};
        const schedulePayload = buildDropBattleSchedulePayload(scheduledHookStartIso);
        const optionalSchedule = schedulePayload
          ? { expires_at: schedulePayload.scheduled_start_at, ...schedulePayload }
          : {};
        const legacySchedule = schedulePayload ? { expires_at: schedulePayload.scheduled_start_at } : {};
        const lyricsForSave = draft.lyrics.trim();
        const baseRowWithoutAudioHash = { ...baseRow };
        delete (baseRowWithoutAudioHash as Record<string, unknown>).audio_sha256;
        const insertAttempts: Array<Record<string, unknown>> = [
          { ...baseRow, ...optionalChallenge, ...optionalSchedule, ai_tool: finalAiTool.trim() || null, lyrics: lyricsForSave || null },
          { ...baseRow, ...optionalChallenge, ...optionalSchedule, ai_tool: finalAiTool.trim() || null },
          { ...baseRow, ...optionalChallenge, ...optionalSchedule, lyrics: lyricsForSave || null },
          { ...baseRow, ...optionalChallenge, ...optionalSchedule },
          { ...baseRow, ...optionalChallenge, ...legacySchedule, ai_tool: finalAiTool.trim() || null, lyrics: lyricsForSave || null },
          { ...baseRow, ...optionalChallenge, ...legacySchedule, ai_tool: finalAiTool.trim() || null },
          { ...baseRow, ...optionalChallenge, ...legacySchedule, lyrics: lyricsForSave || null },
          { ...baseRow, ...optionalChallenge, ...legacySchedule },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...optionalSchedule, ai_tool: finalAiTool.trim() || null, lyrics: lyricsForSave || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...optionalSchedule, ai_tool: finalAiTool.trim() || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...optionalSchedule, lyrics: lyricsForSave || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...optionalSchedule },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...legacySchedule, ai_tool: finalAiTool.trim() || null, lyrics: lyricsForSave || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...legacySchedule, ai_tool: finalAiTool.trim() || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...legacySchedule, lyrics: lyricsForSave || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...legacySchedule },
        ];

        let queueRows: { id: string }[] | null = null;
        let queueError: { message?: string; code?: string; details?: string; hint?: string } | null = null;
        for (const row of insertAttempts) {
          const res = await supabase.from('battle_queue').insert(row).select('id');
          queueError = res.error;
          queueRows = res.data;
          if (!queueError) break;
          const msg = `${queueError.message ?? ''} ${queueError.details ?? ''} ${queueError.hint ?? ''}`;
          const missingOptionalCol = /ai_tool|lyrics|audio_sha256|expires_at|scheduled_start_at|cancellation_evaluation_at|column.*does not exist|schema cache/i.test(msg) || queueError.code === 'PGRST204';
          if (!missingOptionalCol) break;
        }
        if (queueError) throw queueError;
        const first = queueRows?.[0];
        if (!first?.id) throw new Error('queue insert returned no id');
        queueIdForNav = first.id;
      }

      if (!challengeEntryId && instantPairingMode === 'invite') {
        setUploadProgress(lang === 'zh' ? 'Drop Battle 戰場已開啟…' : 'Drop Battle arena is live...');
        router.push(`/battle/${queueIdForNav}?lang=${lang}`);
        return;
      }

      setUploadProgress('完成！即將開始配對…');

      const params = new URLSearchParams({
        fighterName: fighterName.trim(),
        songName: songName.trim(),
        genre: battleGenre,
        aiTool: finalAiTool.trim(),
        lang,
        audioPath: draft.audioPath,
        queueId: queueIdForNav,
      });
      if (draft.hookStart) params.set('hookStart', draft.hookStart);
      if (draft.hookEnd) params.set('hookEnd', draft.hookEnd);
      if (draft.hookDuration) params.set('hookDuration', draft.hookDuration);
      params.set('instantPairing', instantPairingMode);
      if (challengeEntryId) params.set('challengeEntryId', challengeEntryId);
      if (challengeDailyEntryId) params.set('challengeDailyEntryId', challengeDailyEntryId);
      if (avatarForBattle) params.set('avatarUrl', avatarForBattle);
      if (coverForBattle) params.set('coverUrl', coverForBattle);
      if (assetKey) params.set('assetKey', assetKey);
      setCompactParam(params, 'lyrics', draft.lyrics);

      router.push(`/battle/matchmaking?${params.toString()}`);
    } catch (err) {
      console.error(err);
      const msg = friendlyDailyErrorMessage(lang, err);
      setFormError(msg);
      alert(msg);
      setUploading(false);
    }
  };

  const displayAvatarUrl = avatarPreview ?? savedAvatarUrl ?? profileAvatarPreview;
  const displayCoverUrl = coverPreview ?? savedCoverUrl;
  const hookDurationLabel = draft?.hookDuration ? `${Number(draft.hookDuration).toFixed(1)}s` : '45s';
  const dailyBattleLocked = dailyBattleCount >= DAILY_BATTLE_ACTIVE_LIMIT;
  const dailyModeDisabled = dailyBattleLocked || dailySchemaMissing;
  const showDropBattleSchedule = battleMode === 'instant' && instantPairingMode === 'invite' && !challengeEntryId;
  const customScheduleMin = toDatetimeLocalValue(new Date(Date.now() + DROP_BATTLE_SCHEDULE_MIN_LEAD_MS));
  const customScheduleMax = toDatetimeLocalValue(new Date(Date.now() + DROP_BATTLE_SCHEDULE_MAX_LEAD_MS));
  const dropBattleSchedulePicker = showDropBattleSchedule ? (
    <div className="rounded-2xl border border-orange-300/20 bg-orange-500/[0.08] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="block text-sm font-bold text-zinc-300">
            {lang === 'zh' ? '開戰時間' : 'Start time'} <span className="font-black text-orange-400">*</span>
          </label>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {lang === 'zh'
              ? '送出後會寫入 Battle Pool，開戰後 1 分鐘無人接戰即可取消。'
              : 'Saved to Battle Pool. It can be cancelled 1 minute after start if no challenger joins.'}
          </p>
        </div>
        <span className="rounded-full border border-orange-200/25 bg-black/40 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-orange-100/80">
          DROP BATTLE
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setBattleStartOption('custom');
            setScheduleError(null);
            setFormError(null);
          }}
          className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-black transition ${
            battleStartOption === 'custom'
              ? 'border-cyan-200/70 bg-cyan-300/14 text-cyan-50 shadow-[0_0_24px_rgba(0,203,255,0.12)]'
              : 'border-white/10 bg-black/35 text-zinc-300 hover:border-cyan-200/35'
          }`}
        >
          {lang === 'zh' ? '自訂時間' : 'Custom time'}
        </button>
        {DROP_BATTLE_SCHEDULE_PRESETS.map((minutes) => {
          const selected = battleStartOption === minutes;
          return (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                setBattleStartOption(minutes);
                setHookBattleAt(hookBattleAtValueForPreset(minutes));
                setScheduleError(null);
                setFormError(null);
              }}
              className={`min-h-12 rounded-2xl border px-3 py-3 text-sm font-black transition ${
                selected
                  ? 'border-orange-200/70 bg-orange-400/18 text-orange-50 shadow-[0_0_24px_rgba(255,106,0,0.14)]'
                  : 'border-white/10 bg-black/35 text-zinc-300 hover:border-orange-200/35'
              }`}
            >
              {lang === 'zh' ? `${minutes} 分鐘後` : `${minutes} min later`}
            </button>
          );
        })}
      </div>
      {battleStartOption === 'custom' ? (
        <input
          type="datetime-local"
          value={hookBattleAt}
          min={customScheduleMin}
          max={customScheduleMax}
          onChange={(event) => {
            setHookBattleAt(event.target.value);
            setScheduleError(null);
            setFormError(null);
          }}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-black/55 px-4 py-3 text-base font-black text-white outline-none transition focus:border-cyan-200/70"
        />
      ) : null}
      {scheduleError ? (
        <p className="mt-3 text-sm font-black text-red-300">{scheduleError}</p>
      ) : null}
    </div>
  ) : null;
  const battleModeSelector = (
    <section className="rounded-[1.75rem] border border-white/10 bg-black/58 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-200/75">BATTLE MODE</p>
          <h2 className="mt-2 text-2xl font-black text-white">{lang === 'zh' ? '選擇上場方式' : 'Choose Battle Mode'}</h2>
        </div>
        <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100">
          24H active {dailyBattleCount}/{DAILY_BATTLE_ACTIVE_LIMIT}
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setBattleMode('instant')}
          className={`rounded-[1.25rem] border px-5 py-4 text-left transition ${
            battleMode === 'instant'
              ? 'border-orange-300/65 bg-orange-500/16 shadow-[0_0_30px_rgba(255,106,0,0.14)]'
              : 'border-white/10 bg-white/[0.035] hover:border-orange-300/35'
          }`}
        >
          <p className="text-lg font-black text-white">{lang === 'zh' ? '90s 最熱血的最強抓波Drop Battle' : '90s Hottest Drop Battle'}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {lang === 'zh' ? '拿出你最熱的 Drop，PK 最即時熱血的戰鬥。' : 'Bring your hottest Drop into the fastest live battle.'}
          </p>
        </button>
        <button
          type="button"
          disabled={dailyModeDisabled}
          onClick={() => setBattleMode('daily')}
          className={`rounded-[1.25rem] border px-5 py-4 text-left transition ${
            battleMode === 'daily'
              ? 'border-cyan-200/65 bg-cyan-300/14 shadow-[0_0_30px_rgba(0,203,255,0.12)]'
              : 'border-white/10 bg-white/[0.035] hover:border-cyan-200/35'
          } ${dailyModeDisabled ? 'cursor-not-allowed opacity-45' : ''}`}
        >
          <p className="text-lg font-black text-white">24H Daily Battle</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {dailySchemaMissing
              ? lang === 'zh'
                ? '24H Daily Battle 尚未啟用，請先初始化資料庫。'
                : '24H Daily Battle is not enabled until database setup is complete.'
              : dailyBattleLocked
                ? lang === 'zh'
                  ? '已有一場 24H 尚未結束。完成、取消或過期後可再開新局。'
                  : 'One 24H battle is still active. Finish, cancel, or let it expire before starting another.'
                : lang === 'zh'
                  ? '是不是有料？你有自信接受任何人挑戰嗎？'
                  : 'Do you have the goods? Confident enough to face any challenger?'}
          </p>
        </button>
      </div>
      {battleMode === 'daily' ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            { value: 'auto' as const, title: lang === 'zh' ? '自動配對' : 'Auto match', desc: lang === 'zh' ? '系統找相近類型與等級的整首作品。' : 'System pairs similar full tracks by style and level.' },
            { value: 'invite' as const, title: lang === 'zh' ? '開放約戰' : 'Open challenge', desc: lang === 'zh' ? '先上架等待，讓對手或朋友帶整首歌進來挑戰。' : 'List it first so friends or rivals can challenge with a full track.' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDailyPairingMode(option.value)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                dailyPairingMode === option.value
                  ? 'border-yellow-200/55 bg-yellow-300/12 text-yellow-50'
                  : 'border-white/10 bg-black/30 text-zinc-300 hover:border-yellow-200/30'
              }`}
            >
              <p className="font-black">{option.title}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">{option.desc}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              {
                value: 'auto' as const,
                title: lang === 'zh' ? '自動配對' : 'Auto match',
                desc: lang === 'zh'
                  ? '搜尋 1 分鐘同類型 Drop；可能配到即時對手，也可能接到已開好的戰帖卡。'
                  : 'Search same-genre Drops for 1 minute. It may match live queues or open battle cards.',
              },
              {
                value: 'invite' as const,
                title: lang === 'zh' ? '開 Drop Battle 戰帖卡' : 'Open Drop Battle card',
                desc: lang === 'zh'
                  ? '設定開戰時間，分享單獨戰帖卡邀人來接 Drop Battle。'
                  : 'Set a battle time and share a standalone 90s Drop Battle card.',
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={Boolean(challengeEntryId)}
                onClick={() => setInstantPairingMode(option.value)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  instantPairingMode === option.value
                    ? 'border-orange-200/55 bg-orange-500/14 text-orange-50'
                    : 'border-white/10 bg-black/30 text-zinc-300 hover:border-orange-200/30'
                } ${challengeEntryId ? 'cursor-not-allowed opacity-55' : ''}`}
              >
                <p className="font-black">{option.title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{option.desc}</p>
              </button>
            ))}
          </div>
          {!draft?.audioPath && dropBattleSchedulePicker ? <div className="mt-4">{dropBattleSchedulePicker}</div> : null}
        </>
      )}
    </section>
  );

  if (!draftChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-white">
        <div className="text-center text-sm font-bold tracking-[0.24em] text-orange-200/80">AIPOGER LOADING</div>
      </div>
    );
  }

  if (!draft?.audioPath) {
    const startParams = new URLSearchParams({ flow: 'upload-first', lang });
    if (challengeEntryId) startParams.set('challengeEntryId', challengeEntryId);
    if (challengeDailyEntryId) startParams.set('challengeDailyEntryId', challengeDailyEntryId);
    if (fighterName.trim()) startParams.set('fighterName', fighterName.trim());
    if (genre.trim()) startParams.set('genre', genre.trim());
    startParams.set('battleMode', battleMode);
    startParams.set('instantPairing', instantPairingMode);
    startParams.set('dailyPairing', dailyPairingMode);
    if (battleMode === 'instant' && instantPairingMode === 'invite' && !challengeEntryId) {
      startParams.set('hookBattleAt', hookBattleAt);
    }

    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050505] p-6 text-white">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_18%,rgba(255,106,0,0.24),transparent_32%),radial-gradient(circle_at_84%_24%,rgba(0,203,255,0.16),transparent_30%),linear-gradient(180deg,#050505,#0b0908)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="relative z-10 w-full max-w-4xl space-y-7">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.45em] text-orange-300/80">AIPOGER BATTLE ENTRY</p>
            <h1 className="mt-3 text-5xl font-black tracking-tighter text-white md:text-7xl">
              {lang === 'zh' ? '我要鬥歌！' : 'Enter Battle'}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              {battleMode === 'daily'
                ? lang === 'zh'
                  ? '24H Daily Battle 不裁切 Drop，直接上傳整首作品。觀眾進房後可以自己控制 A Side / B Side 播放，慢慢聽完再投票。'
                  : '24H Daily Battle uses the full track. Listeners control either side, listen at their own pace, then vote.'
                : lang === 'zh'
                  ? '先丟音檔，系統會自動偵測歌名；裁出 45 秒 Drop 後，再補頭像、名稱、封面與 AI 工具。'
                  : 'Upload audio first. We detect the song title, then you cut a 45s Drop and finish your battle card.'}
            </p>
          </div>
          <SafetyNotice kind="upload" />
          {battleModeSelector}
          <div className="grid gap-3 rounded-[1.7rem] border border-white/10 bg-black/58 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)] md:grid-cols-4 md:p-5">
            {(battleMode === 'daily'
              ? [
                  lang === 'zh' ? '上傳整首歌' : 'Upload full track',
                  lang === 'zh' ? '填資料與封面' : 'Info / cover',
                  lang === 'zh' ? '24H 配對或約戰' : '24H match / challenge',
                  lang === 'zh' ? '觀眾慢聽投票' : 'Listeners vote after listening',
                ]
              : [
                  lang === 'zh' ? '上傳歌曲' : 'Upload song',
                  lang === 'zh' ? '裁切 Drop / 歌詞' : 'Cut Drop / lyrics',
                  lang === 'zh' ? '填資料與頭像' : 'Info / avatar',
                  lang === 'zh' ? '確認 Battle 配對' : 'Confirm matchmaking',
                ]
            ).map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4">
                <p className="text-[10px] font-black tracking-[0.22em] text-orange-300/70">STEP {index + 1}</p>
                <p className="mt-2 text-lg font-black text-white">{step}</p>
              </div>
            ))}
          </div>
          {battleMode === 'daily' ? (
            <section className="overflow-hidden rounded-[1.75rem] border border-cyan-200/18 bg-black/62 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38),0_0_38px_rgba(0,203,255,0.08)]">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                <button
                  type="button"
                  onClick={() => dailyAudioInputRef.current?.click()}
                  className="group min-h-[9rem] rounded-[1.35rem] border border-cyan-200/28 bg-[radial-gradient(circle_at_18%_18%,rgba(0,203,255,0.16),transparent_34%),rgba(255,255,255,0.035)] px-5 py-5 text-left transition hover:border-cyan-100/55"
                >
                  <span className="block text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/70">FULL TRACK</span>
                  <span className="mt-3 block text-2xl font-black text-white">
                    {dailyAudioFile?.name ?? (lang === 'zh' ? '選擇完整歌曲' : 'Choose complete song')}
                  </span>
                  <span className="mt-2 block text-sm leading-6 text-zinc-400">
                    {lang === 'zh'
                      ? `支援 MP3 / WAV / AIFF / M4A（上限 ${formatBytes(MAX_DAILY_AUDIO_BYTES)}）。這首歌會整首進入 24H Battle，不做 45 秒裁切。`
                      : `MP3 / WAV / AIFF / M4A supported (max ${formatBytes(MAX_DAILY_AUDIO_BYTES)}). This full track enters the 24H Battle without 45s cutting.`}
                  </span>
                  <input ref={dailyAudioInputRef} type="file" accept={DAILY_AUDIO_ACCEPT} className="hidden" onChange={handleDailyAudioChange} />
                </button>
                <button
                  type="button"
                  onClick={uploadDailyFullAudio}
                  disabled={dailyUploadBusy || !dailyAudioFile}
                  className="h-20 rounded-[1.35rem] bg-gradient-to-r from-orange-500 via-orange-400 to-cyan-300 px-8 text-base font-black text-black shadow-[0_0_44px_rgba(255,106,0,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 md:h-full"
                >
                  {dailyUploadBusy
                    ? uploadProgress || (lang === 'zh' ? '上傳中…' : 'Uploading…')
                    : lang === 'zh'
                      ? '上傳整首歌 →'
                      : 'Upload full track →'}
                </button>
              </div>
              {formError ? <p className="mt-3 text-sm font-black text-orange-300">{formError}</p> : null}
            </section>
          ) : (
            <button
              type="button"
              onClick={() => router.push(`/battle/hook-cut?${startParams.toString()}`)}
              className="w-full rounded-[1.6rem] bg-gradient-to-r from-orange-500 via-orange-400 to-cyan-300 py-6 text-xl font-black text-black shadow-[0_0_44px_rgba(255,106,0,0.22)] transition-all hover:brightness-110"
            >
              {lang === 'zh' ? '上傳歌曲，開始裁切 →' : 'Upload song and cut Drop →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050505] p-6 text-white">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_20%_18%,rgba(255,106,0,0.22),transparent_32%),radial-gradient(circle_at_84%_24%,rgba(0,203,255,0.14),transparent_30%),linear-gradient(180deg,#050505,#0b0908)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />

      {/* 頂部標題 */}
      <div className="relative z-10 mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.45em] text-orange-300/80">AIPOGER BACKSTAGE</p>
        <h1 className="mt-3 text-5xl font-black tracking-tighter text-white md:text-6xl">
          {lang === 'zh' ? '確認 Battle 資料' : 'Confirm Battle Info'}
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          {battleMode === 'daily'
            ? lang === 'zh'
              ? '整首作品已上傳，補上身份與封面後進入 24H Daily Battle。'
              : 'Full track uploaded. Add identity and cover art, then enter 24H Daily Battle.'
            : lang === 'zh'
              ? 'Drop 已裁切完成，補上身份與封面後就開始配對。'
              : 'Your Drop is ready. Add identity and cover art, then start matchmaking.'}
        </p>
        {challengeEntryId && (
          <p className="mx-auto mt-4 max-w-xl rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-100">
            你正在接受公開挑戰池的最強抓波Drop Battle，上傳後會優先與該作品配對
          </p>
        )}
        {challengeDailyEntryId && (
          <p className="mx-auto mt-4 max-w-xl rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-bold text-cyan-100">
            {lang === 'zh'
              ? '你正在接受 24H 整首挑戰，上傳後會直接進入對戰房間。'
              : 'You are accepting a 24H full-track challenge and will enter battle room directly.'}
          </p>
        )}
      </div>

      <div className="relative z-10 w-full max-w-3xl space-y-7">
        <SafetyNotice kind="upload" />
        {battleModeSelector}

        <div id="battle-info" className="rounded-[1.5rem] border border-orange-300/20 bg-orange-500/[0.08] px-5 py-4 shadow-[0_18px_64px_rgba(0,0,0,0.28)]">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-orange-200/75">
            {battleMode === 'daily' ? 'FULL TRACK READY' : 'DROP READY'}
          </p>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="text-xs text-zinc-500">{lang === 'zh' ? '歌曲' : 'Song'}</p>
              <p className="mt-1 truncate font-black text-white">{songName || (lang === 'zh' ? '未命名歌曲' : 'Untitled')}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="text-xs text-zinc-500">{battleMode === 'daily' ? (lang === 'zh' ? '播放方式' : 'Playback') : 'Drop'}</p>
              <p className="mt-1 font-black text-orange-100">
                {battleMode === 'daily' ? (lang === 'zh' ? '整首作品' : 'Full track') : hookDurationLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="text-xs text-zinc-500">{lang === 'zh' ? '歌詞' : 'Lyrics'}</p>
              <p className="mt-1 font-black text-cyan-100">
                {battleMode === 'daily'
                  ? lang === 'zh'
                    ? '觀眾可慢聽投票'
                    : 'Listen before voting'
                  : draft.lyrics.trim()
                    ? (lang === 'zh' ? '已加入' : 'Added')
                    : (lang === 'zh' ? '未填' : 'None')}
              </p>
            </div>
          </div>
        </div>

        {/* 頭像 + 封面 雙上傳 */}
        <div className="grid grid-cols-1 gap-4 rounded-[1.75rem] border border-white/10 bg-black/45 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:grid-cols-2 md:p-6">
          {/* 頭像 */}
          <div ref={avatarUploadSectionRef} id="avatar-upload" className="flex flex-col items-center gap-2 rounded-[1.35rem] border border-orange-300/10 bg-white/[0.025] px-4 py-5">
            <label className="cursor-pointer group">
              <div className="relative">
                {displayAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayAvatarUrl}
                    alt={t('upload_avatar')}
                    className="h-36 w-36 rounded-full border-4 border-orange-500/55 object-cover shadow-[0_0_40px_rgba(255,106,0,0.22)] transition-all group-hover:border-orange-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full border border-orange-300/30 bg-[radial-gradient(circle_at_50%_38%,rgba(255,106,0,0.2),rgba(0,0,0,0.38)_58%,rgba(0,0,0,0.68))] shadow-[inset_0_0_40px_rgba(255,106,0,0.08)] transition-all group-hover:border-orange-300">
                    <div className="text-center">
                      <div className="text-xl font-black tracking-[0.22em] text-orange-200">AIPO</div>
                      <div className="mt-1 text-xs font-semibold text-orange-400">{t('setup_avatar_label')}</div>
                    </div>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-lg font-black text-black shadow-lg">+</div>
              </div>
              <input ref={avatarInputRef} type="file" accept={AVATAR_ACCEPT} className="hidden" onChange={handleAvatarUpload} />
            </label>
            <p className="mt-2 text-xs text-zinc-500">{t('upload_avatar')}</p>
            <button
              type="button"
              onClick={openAvatarPicker}
              className="rounded-xl border border-orange-500/60 bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-300 transition hover:bg-orange-500/20"
            >
              {t('setup_avatar_upload_btn')}
            </button>
            {(avatarPreview || savedAvatarUrl) && (
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview(null);
                  setSavedAvatarUrl(null);
                }}
                className="mt-1 text-xs text-zinc-600 hover:text-red-400"
              >
                {t('setup_remove')}
              </button>
            )}
          </div>

          {/* 封面圖 */}
          <div className="flex flex-col items-center rounded-[1.35rem] border border-cyan-200/10 bg-white/[0.025] px-4 py-5">
            <label className="cursor-pointer group">
              <div className="relative">
                {displayCoverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayCoverUrl}
                    alt={t('upload_cover')}
                    className="h-36 w-36 rounded-3xl border-4 border-cyan-300/45 object-cover shadow-[0_0_40px_rgba(0,203,255,0.16)] transition-all group-hover:border-cyan-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-3xl border border-cyan-200/30 bg-[linear-gradient(145deg,rgba(34,211,238,0.12),rgba(0,0,0,0.55)_45%,rgba(255,106,0,0.08))] shadow-[inset_0_0_44px_rgba(34,211,238,0.08)] transition-all group-hover:border-cyan-200">
                    <div className="text-center">
                      <div className="text-2xl font-black tracking-[0.18em] text-cyan-100">{t('setup_cover_label')}</div>
                      <div className="mx-auto mt-2 h-px w-14 bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
                    </div>
                  </div>
                )}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
            <p className="mt-2 text-xs text-zinc-500">{t('upload_cover')}</p>
            {(coverPreview || savedCoverUrl) && (
              <button
                type="button"
                onClick={() => { setCoverFile(null); setCoverPreview(null); setSavedCoverUrl(null); }}
                className="mt-1 text-xs text-zinc-600 hover:text-red-400"
              >
                {t('setup_remove')}
              </button>
            )}
          </div>
        </div>

        {/* 表單欄位 */}
        <div className="space-y-6 rounded-[1.75rem] border border-white/10 bg-black/58 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:p-8">
          {/* 鬥士名稱 */}
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              {t('fighter_name')} <span className="font-black text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={fighterName}
              onChange={(e) => { setFighterName(e.target.value); setFormError(null); }}
              placeholder={t('fighter_name_placeholder')}
              maxLength={30}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-6 py-4 text-lg transition-colors focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* 歌曲名稱 */}
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              {t('song_name')} <span className="font-black text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={songName}
              onChange={(e) => { setSongName(e.target.value); setFormError(null); }}
              placeholder={t('song_name_placeholder')}
              maxLength={60}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-6 py-4 text-lg transition-colors focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* 歌曲種類 */}
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              {t('genre')} <span className="font-black text-orange-400">*</span>
            </label>
            {challengeEntryId ? (
              <div className="rounded-2xl border border-orange-300/30 bg-orange-500/10 px-6 py-4">
                <p className="text-lg font-black text-orange-50">
                  {GENRES.find((g) => g.value === genre)?.labelKey ? t(GENRES.find((g) => g.value === genre)!.labelKey) : genre || (lang === 'zh' ? '沿用挑戰卡曲風' : 'Challenge card genre')}
                </p>
                <p className="mt-2 text-xs font-bold leading-5 text-zinc-400">
                  {lang === 'zh'
                    ? '接受挑戰時會自動沿用原戰帖卡的曲風，不需要也不能改類型。'
                    : 'Challenge accepts automatically use the original card genre. No extra genre selection is needed.'}
                </p>
              </div>
            ) : (
              <select
                value={genre}
                onChange={(e) => { setGenre(e.target.value); setFormError(null); }}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-6 py-4 text-lg transition-colors focus:border-orange-500 focus:outline-none"
              >
                <option value="">{t('genre_placeholder')}</option>
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>{t(g.labelKey)}</option>
                ))}
              </select>
            )}
          </div>

          {/* AI 工具 */}
          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              {t('ai_tool')} <span className="text-xs text-zinc-600">({lang === 'zh' ? '選填' : 'optional'})</span>
            </label>
            <select
              value={aiTool}
              onChange={(e) => { setAiTool(e.target.value); setFormError(null); }}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.055] px-6 py-4 text-lg transition-colors focus:border-orange-500 focus:outline-none"
            >
              <option value="">{t('ai_tool_placeholder')}</option>
              {AI_TOOLS.map((tool) => (
                <option key={tool} value={tool}>{tool === '其他' ? t('ai_other') : tool}</option>
              ))}
            </select>
            {aiTool === '其他' && (
              <input
                type="text"
                value={otherTool}
                onChange={(e) => { setOtherTool(e.target.value); setFormError(null); }}
                placeholder={t('ai_other_placeholder')}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.055] px-6 py-4 text-lg transition-colors focus:border-orange-500 focus:outline-none"
              />
            )}
          </div>

          {draft?.audioPath ? dropBattleSchedulePicker : null}

          {battleMode === 'daily' && draft ? (
            <div>
              <div className="mb-2 block text-sm text-zinc-400">
                {lang === 'zh' ? '歌詞（選填）' : 'Lyrics (optional)'}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => dailyLyricsInputRef.current?.click()}
                  className="rounded-full border border-orange-400/60 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-300 transition hover:bg-orange-500/20"
                >
                  {lang === 'zh' ? '上傳歌詞檔 (.txt / .lrc)' : 'Upload lyrics file (.txt / .lrc)'}
                </button>
                {dailyLyricsFileName ? (
                  <span className="text-xs text-orange-300/90">
                    {lang === 'zh' ? `已載入：${dailyLyricsFileName}` : `Loaded: ${dailyLyricsFileName}`}
                  </span>
                ) : null}
              </div>
              <input
                ref={dailyLyricsInputRef}
                type="file"
                accept={DAILY_LYRICS_ACCEPT}
                className="hidden"
                onChange={handleDailyLyricsUpload}
              />
              <textarea
                value={draft.lyrics}
                onChange={(e) => {
                  const next = e.target.value.slice(0, MAX_LYRICS_CHARS);
                  setDraft((prev) => (prev ? { ...prev, lyrics: next } : prev));
                  if (dailyLyricsFileName) setDailyLyricsFileName(null);
                }}
                placeholder={lang === 'zh' ? '貼上歌詞，或上傳 .txt / .lrc...' : 'Paste lyrics, or upload .txt / .lrc...'}
                className="mt-3 min-h-36 w-full resize-y rounded-2xl border border-white/10 bg-white/[0.055] px-6 py-4 text-sm leading-7 transition-colors focus:border-orange-500 focus:outline-none"
              />
            </div>
          ) : null}
        </div>

        {/* 提示 */}
        <div className="text-center text-xs">
          {formError ? (
            <p className="font-black text-orange-400 drop-shadow-[0_0_14px_rgba(255,106,0,0.52)]">{formError}</p>
          ) : null}
          <p className="mt-1 font-semibold text-orange-400/95">
            {t('setup_required_notice')}
          </p>
        </div>

        {/* 送出按鈕 */}
        <button
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full rounded-[1.6rem] bg-gradient-to-r from-orange-500 via-orange-400 to-cyan-300 py-6 text-xl font-black text-black shadow-[0_0_44px_rgba(255,106,0,0.22)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading
            ? `⏳ ${uploadProgress}`
            : battleMode === 'daily'
              ? lang === 'zh'
                ? '確定 24H Battle，進入配對 →'
                : 'Confirm 24H Daily Battle →'
              : lang === 'zh'
                ? '確定 Battle，進入戰場 →'
                : 'Confirm Battle → Enter Arena'}
        </button>
      </div>
    </div>
  );
}
