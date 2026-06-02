// src/app/battle/hook-cut/page.tsx
'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WaveSurfer from 'wavesurfer.js';
import Regions from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { supabase } from '@/lib/supabase';
import { isAuthBypassEnabled, mockUserId } from '@/lib/auth-bypass';
import { readFighterNameFromStorage, writeFighterNameToStorage } from '@/lib/fighter-name-storage';
import { buildHookStoragePath, isValidStorageObjectKey } from '@/lib/storage-path';
import { saveFighterNameToProfile } from '@/lib/user-profile-fighter-name';
import { attemptMatchmakingWithoutApcGate, cancelCurrentBattleIntent } from '@/lib/battle-pool-client';
import SafetyNotice from '@/components/safety-notice';
import { blobToDataUrl, parseAudioMetadata } from '@/lib/audio-metadata';
import { sha256File } from '@/lib/file-hash';

const MAX_HOOK_SECONDS = 45;
const MIN_REGION_SECONDS = 0.25;
const MAX_LYRICS_CHARS = 8000;
const PENDING_AUDIO_COVER_KEY = 'aipoger:pending-audio-cover';
const ACTIVE_QUEUE_STATUSES = ["searching", "waiting", "waiting_challenge", "matched", "active", "ghost_battle", "public_voting"];
const ACTIVE_BATTLE_STATUSES = ["live", "active", "ghost_battle", "public_voting"];
const REPLACEABLE_QUEUE_STATUSES = new Set(["searching", "waiting", "waiting_challenge", "public_voting", "ghost_battle"]);

type RegionTimes = { start: number; end: number };
type WaveRegion = RegionTimes & {
  setOptions: (options: Partial<RegionTimes>) => void;
  on: (event: 'update', handler: () => void) => void;
};

// ─── i18n ───────────────────────────────────────────────
type Lang = 'zh' | 'en';

const T = {
  zh: {
    title: '最強抓波Drop Battle 裁切',
    subtitle: '最多 45 秒 · 系統會自動 Mastering 美化聲音',
    uploadPrompt: '上傳完整歌曲',
    uploadHint: '拖曳波形選擇 Drop',
    uploadDropHint: '點擊或拖曳音檔到這裡',
    uploadDecodeError: '音檔解析失敗，請改用 WAV / MP3 / M4A / AIFF，或重新匯出後再上傳。',
    uploadReady: '音檔已載入，可以開始裁切 Drop',
    selection: '選取',
    duration: '（{s}秒）',
    dragHint: '拖左/右邊緣調整長度（最多 45 秒） · 拖中間移動 · 空白鍵預覽/暫停（從選取起點）',
    mastering: '啟用自動 Mastering',
    masteringDesc: '3-band EQ + Compressor + Limiter + Gain 提升清晰度與響度',
    preview: '▶️ 即時預覽選取區間',
    masteringOn: '自動 Mastering',
    masteringOff: '原始音檔',
    lyricsTitle: '上傳歌詞（選填）',
    lyricsUpload: '選擇上傳歌詞',
    lyricsUploadHint: '支援 .txt / .lrc，也可以直接貼上',
    lyricsPlaceholder: '貼上歌詞，或選擇文字檔上傳…',
    lyricsFileLoaded: '已載入：{name}',
    confirmUpload: '確認上傳',
    continueSetup: '下一步：填寫 Battle 資料',
    uploadingPrepare: '準備上傳…',
    uploadingAudio: '正在處理音檔…',
    uploading: '上傳中…',
    uploadingSaving: '寫入資料庫…',
    success: '你的最強抓波Drop Battle 已進入 Battle Pool，正在等待對手。你現在可以離開，配對成功會通知你。',
    cutSaved: 'Drop 已裁切完成，前往確認 Battle 資料。',
    uploadError: '上傳失敗，請稍後再試',
    noFile: '請先上傳音檔並選擇 Drop 區間',
    activeBattleExists: '同一個帳號一次只能保留一場 Battle。請先完成或取消目前這場，再上傳下一首 Drop。',
    decording: '解析音檔中…',
    playing: '播放中',
    fighter: '鬥士',
    song: '歌曲',
    detectedMeta: '已自動偵測：{value}',
    proTip: '專業模式：拖曳中即時硬限制 45 秒（超過會自動彈回）',
  },
  en: {
    title: 'Drop Battle Cut',
    subtitle: 'Max 45 seconds · Auto Mastering to enhance sound',
    uploadPrompt: 'Upload Full Song',
    uploadHint: 'Drag waveform to select Drop',
    uploadDropHint: 'Click or drag audio here',
    uploadDecodeError: 'Could not decode this audio. Try WAV / MP3 / M4A / AIFF, or export it again before uploading.',
    uploadReady: 'Audio loaded. Cut your Drop now.',
    selection: 'Selection',
    duration: '({s}s)',
    dragHint: 'Drag edges to adjust length (max 45s) · Drag middle to move · Spacebar to preview/pause',
    mastering: 'Enable Auto Mastering',
    masteringDesc: '3-band EQ + Compressor + Limiter + Gain for clarity and loudness',
    preview: '▶️ Preview Selection',
    masteringOn: 'Auto Mastering',
    masteringOff: 'Original',
    lyricsTitle: 'Upload Lyrics (optional)',
    lyricsUpload: 'Choose lyrics file',
    lyricsUploadHint: 'Supports .txt / .lrc, or paste directly',
    lyricsPlaceholder: 'Paste lyrics, or upload a text file…',
    lyricsFileLoaded: 'Loaded: {name}',
    confirmUpload: 'Confirm Upload',
    continueSetup: 'Next: Battle Info',
    uploadingPrepare: 'Preparing…',
    uploadingAudio: 'Processing audio…',
    uploading: 'Uploading…',
    uploadingSaving: 'Saving to database…',
    success: 'Your Drop Battle is in the Battle Pool. You can leave now; we will notify you when matched.',
    cutSaved: 'Drop cut saved. Continue to Battle info.',
    uploadError: 'Upload failed, please try again',
    noFile: 'Please upload audio and select a Drop region first',
    activeBattleExists: 'One account can only hold one active Battle at a time. Finish or cancel the current Battle before uploading another Drop.',
    decording: 'Decoding audio…',
    playing: 'Playing',
    fighter: 'Fighter',
    song: 'Song',
    detectedMeta: 'Detected: {value}',
    proTip: 'Professional: Real-time hard limit 45s (auto-corrects on drag)',
  },
} as const;

function getT(lang: Lang) {
  return T[lang];
}

function normalizeLang(value: string | null): Lang {
  return value === 'en' ? 'en' : 'zh';
}

function canReplaceActiveBattleLock(lock: ActiveBattleLock): boolean {
  return lock.kind === "queue" && !lock.battleId && REPLACEABLE_QUEUE_STATUSES.has(lock.status);
}

function existingBattleMessage(lang: Lang): string {
  return lang === "zh"
    ? "你目前已有一首最強抓波Drop Battle 正在等待挑戰。AIPOGER 一次只能保留一場 Battle。要挑戰這首歌，系統會先取消你原本等待中的 Drop。"
    : "You already have one Drop Battle waiting for challenge. AIPOGER only allows one active Battle at a time. To challenge this track, your previous waiting Drop will be cancelled first.";
}

function setCompactParam(params: URLSearchParams, key: string, value: string | null | undefined, maxLength = 1800) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > maxLength) return;
  params.set(key, trimmed);
}

function setShortParam(params: URLSearchParams, key: string, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (trimmed) params.set(key, trimmed);
}

function hookBattleAtToIso(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function currentReturnPath(): string {
  if (typeof window === 'undefined') return '/battle/hook-cut';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function authHrefForCurrentPage(): string {
  return `/auth?next=${encodeURIComponent(currentReturnPath())}`;
}

// ─── WAV 渲染工廠（OfflineAudioContext）─────────────────────
async function renderAudioWithMastering(
  buffer: AudioBuffer,
  start: number,
  end: number,
  enableMastering: boolean,
): Promise<Blob> {
  const sampleRate = buffer.sampleRate;
  const clampedEnd = Math.min(end, buffer.duration);
  const startSample = Math.floor(start * sampleRate);
  const endSample = Math.floor(clampedEnd * sampleRate);
  const length = Math.max(1, endSample - startSample);
  const maxLength = MAX_HOOK_SECONDS * sampleRate;
  const renderLength = Math.min(length, maxLength);

  const offlineCtx = new OfflineAudioContext(2, renderLength, sampleRate);

  const src = offlineCtx.createBufferSource();
  src.buffer = buffer;
  let out: AudioNode = src;

  if (enableMastering) {
    const low = offlineCtx.createBiquadFilter();
    low.type = 'lowshelf'; low.frequency.value = 200; low.gain.value = 3;
    const mid = offlineCtx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.8; mid.gain.value = -2;
    const high = offlineCtx.createBiquadFilter();
    high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = 2;
    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 8; comp.ratio.value = 5;
    comp.attack.value = 0.002; comp.release.value = 0.15;
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.05;
    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = Math.pow(10, 2 / 20);

    src.connect(low); low.connect(mid); mid.connect(high);
    high.connect(comp); comp.connect(limiter); limiter.connect(gainNode);
    out = gainNode;
  }

  out.connect(offlineCtx.destination);
  src.start(0, start, renderLength / sampleRate);

  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);

  const body = new ArrayBuffer(dataSize);
  const bodyView = new DataView(body);
  let offset = 0;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      bodyView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([header, body], { type: 'audio/wav' });
}

/** Supabase Storage 依 bucket allowed_mime_types 驗證 Content-Type；失敗時可改試常見 WAV 別名 */
function isLikelyStorageMimeRejection(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  return (
    msg.includes('mime') ||
    (msg.includes('invalid') && msg.includes('type')) ||
    msg.includes('not allowed') ||
    msg.includes('unsupported') ||
    msg.includes('415')
  );
}

async function uploadHookWav(
  storagePath: string,
  wavBlob: Blob,
  fileName: string,
  userId: string,
  accessToken: string | null,
): Promise<void> {
  if (!isValidStorageObjectKey(storagePath)) {
    throw new Error(`Invalid storage path (ASCII only): ${storagePath}`);
  }
  const mimeAttempts = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] as const;
  let lastError: unknown;

  for (const contentType of mimeAttempts) {
    const body = new File([wavBlob], fileName, { type: contentType });
    const { error } = await supabase.storage.from('battle-audio').upload(storagePath, body, {
      contentType,
      upsert: true,
    });
    if (!error) return;
    lastError = error;

    const signedUploadOk = await uploadHookWavWithSignedUrl(storagePath, body, userId, accessToken, contentType);
    if (signedUploadOk.ok) return;
    lastError = signedUploadOk.error;

    if (!isLikelyStorageMimeRejection(error) && !isLikelyStorageMimeRejection(signedUploadOk.error)) break;
  }

  const detail =
    lastError && typeof lastError === 'object' && 'message' in lastError
      ? String((lastError as { message: unknown }).message)
      : String(lastError ?? 'Storage upload failed');

  const hint = isAuthBypassEnabled
    ? '請在 Supabase SQL Editor 執行 supabase/battle_arena_rls_and_storage.sql（anon 可寫入 */hooks/*），或於 .env.local 關閉 NEXT_PUBLIC_AUTH_BYPASS 後登入再上傳。勿經 Vercel API 轉傳大檔。'
    : '請確認已登入，並已在 Supabase 套用 supabase/storage_battle_audio.sql 與 storage_rls_fix.sql。';

  throw new Error(`${detail}\n\n${hint}`);
}

async function uploadHookWavWithSignedUrl(
  storagePath: string,
  body: File,
  userId: string,
  accessToken: string | null,
  contentType: string,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    const res = await fetch('/api/upload-hook/signed-url', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ storagePath, userId }),
    });
    const json = (await res.json().catch(() => null)) as { token?: string; error?: string } | null;

    if (!res.ok || !json?.token) {
      return { ok: false, error: new Error(json?.error ?? `Signed upload URL failed (${res.status})`) };
    }

    const { error } = await supabase.storage.from('battle-audio').uploadToSignedUrl(storagePath, json.token, body, {
      contentType,
      upsert: true,
    });
    if (error) return { ok: false, error };
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

type RpcQueueRow = {
  id?: string;
  status?: string;
  match_group_id?: string | null;
};

type ActiveBattleLock =
  | { kind: "queue"; id: string; status: string; battleId?: string | null }
  | { kind: "battle"; id: string; status: string };

function describeSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "Unknown error");
  const record = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
  return [record.message, record.details, record.hint, record.code]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ");
}

function isMissingAudioHashColumn(error: unknown): boolean {
  return /audio_sha256|schema cache|column.*does not exist|PGRST204/i.test(describeSupabaseError(error));
}

function isDuplicateAudioHash(error: unknown): boolean {
  return /audio_sha256|duplicate key value|23505/i.test(describeSupabaseError(error));
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
        .select("id, status")
        .eq("id", activeQueue.match_group_id)
        .maybeSingle();
      const status = typeof linkedBattle?.status === "string" ? linkedBattle.status : "";
      if (["finished", "cancelled", "completed", "expired"].includes(status)) {
        void supabase.from("battle_queue").update({ status: "completed" }).eq("id", activeQueue.id);
        return null;
      }
    }
    return { kind: "queue", id: activeQueue.id, status: activeQueue.status, battleId: activeQueue.match_group_id ?? null };
  }

  const { data: battleRows, error: battleError } = await supabase
    .from("battles")
    .select("id, status, created_at")
    .or(`fighter_a_user_id.eq.${userId},fighter_b_user_id.eq.${userId}`)
    .in("status", ACTIVE_BATTLE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1);

  if (battleError) throw battleError;
  const activeBattle = battleRows?.[0] as { id: string; status: string } | undefined;
  return activeBattle?.id ? { kind: "battle", id: activeBattle.id, status: activeBattle.status } : null;
}

// ─── 主要內容（Suspense 內才能用 useSearchParams）───────────

function HookCutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlFighter = searchParams.get('fighterName')?.trim() ?? '';
  const [fighterName, setFighterName] = useState(() => urlFighter || '未命名鬥士');

  const uploadFirstFlow = searchParams.get('flow') === 'upload-first';
  const [songName, setSongName] = useState(() => searchParams.get('songName')?.trim() || '');
  const [genre, setGenre] = useState(() => searchParams.get('genre')?.trim() || '');
  const aiTool = searchParams.get('aiTool') ?? '';
  const coverUrl = searchParams.get('coverUrl');
  const avatarUrl = searchParams.get('avatarUrl');
  const assetKey = searchParams.get('assetKey');
  const challengeTargetQueueId = searchParams.get('challengeEntryId');
  const battleMode = searchParams.get('battleMode') === 'daily' ? 'daily' : 'instant';
  const instantPairing = searchParams.get('instantPairing') === 'invite' ? 'invite' : 'auto';
  const dailyPairing = searchParams.get('dailyPairing') === 'invite' ? 'invite' : 'auto';
  const hookBattleAt = searchParams.get('hookBattleAt') || searchParams.get('scheduledBattleAt');
  const hookBattleStartIso = instantPairing === "invite" && !challengeTargetQueueId ? hookBattleAtToIso(hookBattleAt) : null;
  const lang = normalizeLang(searchParams.get('lang'));

  const t = getT(lang);

  const [, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [enableMastering, setEnableMastering] = useState(true);
  const [regionTimes, setRegionTimes] = useState<RegionTimes>({ start: 0, end: 0 });
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);
  const [lyricsText, setLyricsText] = useState("");
  const [lyricsFileName, setLyricsFileName] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [detectedMetaLine, setDetectedMetaLine] = useState<string | null>(null);

  useEffect(() => {
    if (urlFighter) {
      setFighterName(urlFighter);
      return;
    }
    const ls = readFighterNameFromStorage();
    setFighterName(ls ?? '未命名鬥士');
  }, [urlFighter]);

  useEffect(() => {
    const nextSong = searchParams.get('songName')?.trim();
    if (nextSong) setSongName(nextSong);
    const nextGenre = searchParams.get('genre')?.trim();
    if (nextGenre) setGenre(nextGenre);
  }, [searchParams]);

  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionRef = useRef<WaveRegion | null>(null);
  const durationRef = useRef<number>(0);
  const lastRegionRef = useRef<RegionTimes | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const localHookAudioUrlRef = useRef<string | null>(null);
  const playWindowRef = useRef<RegionTimes | null>(null);
  const playStartedAtRef = useRef<number>(0);
  const playOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (isAuthBypassEnabled || !challengeTargetQueueId) return;
    let mounted = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted || data.session?.user) return;
      const refreshed = await supabase.auth.refreshSession().catch(() => null);
      if (!mounted || refreshed?.data.session?.user) return;
      router.replace(authHrefForCurrentPage());
    })();
    return () => {
      mounted = false;
    };
  }, [challengeTargetQueueId, router]);

  const formatTime = useMemo(() => {
    const two = (n: number) => String(Math.floor(n)).padStart(2, '0');
    return (seconds: number) => {
      const s = Math.max(0, seconds);
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      return `${two(mm)}:${two(ss)}`;
    };
  }, []);

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    return audioCtxRef.current;
  };

  const clearStopTimer = () => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const cancelRaf = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stopPlayback = () => {
    clearStopTimer();
    cancelRaf();
    playWindowRef.current = null;
    setIsPlaying(false);
    const src = sourceRef.current;
    sourceRef.current = null;
    if (src) {
      try { src.onended = null; src.stop(); } catch { /* ignore */ }
      try { src.disconnect(); } catch { /* ignore */ }
    }
  };

  const syncCursorWhilePlaying = () => {
    const ws = wavesurferRef.current;
    const ctx = audioCtxRef.current;
    const windowTimes = playWindowRef.current;
    if (!ws || !ctx || !windowTimes) return;
    const now = ctx.currentTime;
    const played = Math.max(0, now - playStartedAtRef.current);
    const current = playOffsetRef.current + played;
    const clamped = Math.min(windowTimes.end, Math.max(windowTimes.start, current));
    ws.setTime(clamped);
    rafRef.current = requestAnimationFrame(syncCursorWhilePlaying);
  };

  const playFromRegion = async () => {
    const buffer = audioBufferRef.current;
    const region = regionRef.current;
    if (!buffer || !region) return;

    const start = Math.max(0, region.start);
    const end = Math.min(region.end, durationRef.current || buffer.duration);
    const length = Math.max(0, end - start);
    if (length <= 0.01) return;

    stopPlayback();
    const ctx = ensureAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    let out: AudioNode = src;

    if (enableMastering) {
      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf'; low.frequency.value = 200; low.gain.value = 3;
      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.8; mid.gain.value = -2;
      const high = ctx.createBiquadFilter();
      high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = 2;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20; comp.knee.value = 8; comp.ratio.value = 5;
      comp.attack.value = 0.002; comp.release.value = 0.15;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.001; limiter.release.value = 0.05;
      const gainNode = ctx.createGain();
      gainNode.gain.value = Math.pow(10, 2 / 20);

      src.connect(low); low.connect(mid); mid.connect(high);
      high.connect(comp); comp.connect(limiter); limiter.connect(gainNode);
      out = gainNode;
    }

    out.connect(ctx.destination);
    sourceRef.current = src;
    playWindowRef.current = { start, end };
    playStartedAtRef.current = ctx.currentTime;
    playOffsetRef.current = start;
    setIsPlaying(true);

    src.onended = () => {
      stopPlayback();
      const ws = wavesurferRef.current;
      if (ws) ws.setTime(end);
    };

    src.start(0, start, Math.min(length, MAX_HOOK_SECONDS));
    stopTimerRef.current = window.setTimeout(() => {
      const ws = wavesurferRef.current;
      if (ws) ws.setTime(end);
      stopPlayback();
    }, Math.ceil(length * 1000));

    cancelRaf();
    rafRef.current = requestAnimationFrame(syncCursorWhilePlaying);
  };

  const processAudioFile = async (file: File) => {
    if (!file) return;
    stopPlayback();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioFile(file);
    setIsReady(false);
    setAudioError(null);
    setRegionTimes({ start: 0, end: 0 });
    setIsDecoding(true);
    setDetectedMetaLine(null);
    const url = URL.createObjectURL(file);
    try {
      const metadata = await parseAudioMetadata(file);
      const nextTitle = metadata.title?.trim() || metadata.fallbackTitle;
      if (nextTitle && (!songName.trim() || songName.trim() === '未提供')) setSongName(nextTitle);
      if (metadata.genre?.trim() && !genre.trim()) setGenre(metadata.genre.trim());
      if (metadata.lyrics?.trim() && !lyricsText.trim()) {
        setLyricsText(metadata.lyrics.slice(0, MAX_LYRICS_CHARS));
        setLyricsFileName('embedded-lyrics');
      }
      if (metadata.cover && typeof window !== 'undefined') {
        const dataUrl = await blobToDataUrl(metadata.cover.blob);
        window.sessionStorage.setItem(
          PENDING_AUDIO_COVER_KEY,
          JSON.stringify({ dataUrl, fileName: metadata.cover.fileName }),
        );
      }
      const metaParts = [
        metadata.title?.trim(),
        metadata.artist?.trim(),
        metadata.album?.trim(),
      ].filter(Boolean);
      if (metaParts.length > 0) setDetectedMetaLine(metaParts.join(' / '));

      const ctx = ensureAudioContext();
      const ab = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(ab.slice(0));
      audioBufferRef.current = decoded;
      setAudioUrl(url);
    } catch (error) {
      console.error("[hook-cut] audio decode failed", error);
      audioBufferRef.current = null;
      URL.revokeObjectURL(url);
      setAudioError(t.uploadDecodeError);
    } finally {
      setIsDecoding(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processAudioFile(file);
  };

  const handleAudioDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = Array.from(e.dataTransfer.files).find((item) => item.type.startsWith('audio/')) ?? e.dataTransfer.files[0];
    if (!file) {
      setAudioError(t.noFile);
      return;
    }
    await processAudioFile(file);
  };

  const handleLyricsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setLyricsText(text.slice(0, MAX_LYRICS_CHARS));
    setLyricsFileName(file.name);
  };

  // WaveSurfer init
  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    if (wavesurferRef.current) {
      try { wavesurferRef.current.destroy(); } catch { /* ignore */ }
      wavesurferRef.current = null;
    }
    regionRef.current = null;
    durationRef.current = 0;
    lastRegionRef.current = null;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 220,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      normalize: true,
      interact: true,
      autoScroll: true,
      hideScrollbar: true,
      cursorWidth: 2,
      cursorColor: '#f97316',
      waveColor: '#fb923c',
      progressColor: '#f97316',
    });

    const regions = ws.registerPlugin(Regions.create());

    const clampRegion = (nextStart: number, nextEnd: number) => {
      const duration = durationRef.current || 0;
      let start = Number.isFinite(nextStart) ? nextStart : 0;
      let end = Number.isFinite(nextEnd) ? nextEnd : 0;
      start = Math.max(0, start);
      end = Math.min(Math.max(0, end), duration);
      if (end - start < MIN_REGION_SECONDS) end = Math.min(duration, start + MIN_REGION_SECONDS);
      if (end - start > MAX_HOOK_SECONDS) end = Math.min(duration, start + MAX_HOOK_SECONDS);
      if (end - start < MIN_REGION_SECONDS) start = Math.max(0, end - MIN_REGION_SECONDS);
      return { start, end };
    };

    const applyRegion = (start: number, end: number) => {
      const region = regionRef.current;
      if (!region) return;
      const next = clampRegion(start, end);
      const eps = 0.002;
      if (Math.abs(region.start - next.start) > eps) region.setOptions({ start: next.start });
      if (Math.abs(region.end - next.end) > eps) region.setOptions({ end: next.end });
      setRegionTimes({ start: next.start, end: next.end });
      lastRegionRef.current = { start: next.start, end: next.end };
    };

    ws.load(audioUrl);

    ws.on('ready', () => {
      durationRef.current = ws.getDuration() || 0;
      const initialEnd = Math.min(MAX_HOOK_SECONDS, durationRef.current);
      const region = regions.addRegion({
        id: 'hook',
        start: 0,
        end: Math.max(MIN_REGION_SECONDS, initialEnd),
        color: 'rgba(228, 228, 231, 0.22)',
        drag: true,
        resize: true,
      });

      regionRef.current = region;
      lastRegionRef.current = { start: region.start, end: region.end };
      setRegionTimes({ start: region.start, end: region.end });
      setIsReady(true);

      region.on('update', () => {
        const prev = lastRegionRef.current;
        if (!prev) { lastRegionRef.current = { start: region.start, end: region.end }; return; }

        const rawStart = region.start;
        const rawEnd = region.end;
        let start = rawStart;
        let end = rawEnd;
        const duration = durationRef.current || 0;

        start = Math.max(0, start);
        end = Math.min(duration, end);

        if (end - start > MAX_HOOK_SECONDS) {
          if (Math.abs(rawStart - prev.start) > 0.001 && Math.abs(rawEnd - prev.end) <= 0.001) {
            start = end - MAX_HOOK_SECONDS;
          } else {
            end = start + MAX_HOOK_SECONDS;
          }
        }

        if (end - start < MIN_REGION_SECONDS) {
          if (Math.abs(rawStart - prev.start) > 0.001) start = end - MIN_REGION_SECONDS;
          else end = start + MIN_REGION_SECONDS;
        }

        if (start < 0) { const shift = -start; start = 0; end = Math.min(duration, end + shift); }
        if (end > duration) { const shift = end - duration; end = duration; start = Math.max(0, start - shift); }

        applyRegion(start, end);
      });

      region.on('update-end', () => {
        const { start, end } = clampRegion(region.start, region.end);
        region.setOptions({ start, end });
        setRegionTimes({ start, end });
        lastRegionRef.current = { start, end };
      });
    });

    wavesurferRef.current = ws;

    return () => {
      try { ws.destroy(); } catch { /* ignore */ }
      if (wavesurferRef.current === ws) wavesurferRef.current = null;
    };
  }, [audioUrl]);

  // Spacebar preview
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      if (!isReady || !audioBufferRef.current) return;
      e.preventDefault();
      if (isPlaying) stopPlayback();
      else void playFromRegion();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isReady, isPlaying, enableMastering]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (localHookAudioUrlRef.current) URL.revokeObjectURL(localHookAudioUrlRef.current);
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx) void ctx.close();
    };
  }, []);

  // ── 確認上傳（核心流程）──────────────────────────────
  const handleConfirmUpload = async () => {
    if (!isReady || !audioBufferRef.current || !regionRef.current) {
      alert(t.noFile);
      return;
    }

    const region = regionRef.current;
    const { start, end } = region;
    const lyricsForSave = lyricsText.trim().slice(0, MAX_LYRICS_CHARS);

    setUploadPhase(t.uploadingPrepare);

    try {
      const buffer = audioBufferRef.current;

      const session = isAuthBypassEnabled
        ? null
        : ((await supabase.auth.getSession()).data.session ?? (await supabase.auth.refreshSession().catch(() => null))?.data.session ?? null);
      if (!isAuthBypassEnabled && !session?.user) {
        router.push(authHrefForCurrentPage());
        throw new Error("登入狀態已過期，請重新登入後會回到這張接戰上傳頁。");
      }
      const userId = isAuthBypassEnabled ? mockUserId : session!.user.id;

      if (!isAuthBypassEnabled) {
        const activeLock = await findActiveBattleLock(userId);
        if (activeLock) {
          if (challengeTargetQueueId && canReplaceActiveBattleLock(activeLock)) {
            const ok = window.confirm(existingBattleMessage(lang));
            if (!ok) {
              setUploadPhase(null);
              return;
            }
            setUploadPhase(lang === "zh" ? "取消原本等待中的 Drop…" : "Cancelling previous waiting Drop…");
            await cancelCurrentBattleIntent({ accessToken: session!.access_token });
          } else {
          alert(t.activeBattleExists);
          setUploadPhase(null);
          const resumeParams = new URLSearchParams({
            fighterName,
            songName,
            genre,
            aiTool,
            lang,
          });
          setCompactParam(resumeParams, "avatarUrl", avatarUrl, 8000);
          setCompactParam(resumeParams, "coverUrl", coverUrl, 8000);
          setShortParam(resumeParams, "assetKey", assetKey);
          if (activeLock.kind === "battle" || activeLock.battleId) {
            router.push(`/battle/${activeLock.kind === "battle" ? activeLock.id : activeLock.battleId}?${resumeParams.toString()}`);
          } else {
            resumeParams.set("queueId", activeLock.id);
            router.push(`/battle/matchmaking?${resumeParams.toString()}`);
          }
          return;
          }
        }
      }

      setUploadPhase(t.uploadingAudio);

      // Offline render → WAV blob（含 mastering）
      const wavBlob = await renderAudioWithMastering(buffer, start, end, enableMastering);
      const { storagePath, fileName } = buildHookStoragePath(userId, fighterName, songName);
      const hookFile = new File([wavBlob], fileName, { type: "audio/wav" });
      const audioSha256 = await sha256File(hookFile);

      if (!isAuthBypassEnabled) {
        const duplicateCheck = await supabase
          .from("battle_queue")
          .select("id, original_file_name, status")
          .eq("audio_sha256", audioSha256)
          .in("status", ACTIVE_QUEUE_STATUSES)
          .limit(1)
          .maybeSingle<{ id: string; original_file_name: string | null; status: string | null }>();

        if (duplicateCheck.error && !isMissingAudioHashColumn(duplicateCheck.error)) throw duplicateCheck.error;
        if (duplicateCheck.data?.id) {
          throw new Error(
            `這個 Drop 音檔已經在 Battle Pool 裡了：${duplicateCheck.data.original_file_name || "未命名 Drop"}。請換另一段 Drop。`,
          );
        }
      }

      setUploadPhase(t.uploading);

      let audioPathForNav = storagePath;

      // 上傳到 Supabase Storage（路徑僅 ASCII；WAV MIME 與 bucket 白名單一致）
      if (isAuthBypassEnabled) {
        try {
          await uploadHookWav(storagePath, wavBlob, fileName, userId, session?.access_token ?? null);
        } catch (uploadError) {
          console.warn("[hook-cut] auth bypass storage upload failed; continuing with local blob audio", uploadError);
          if (localHookAudioUrlRef.current) URL.revokeObjectURL(localHookAudioUrlRef.current);
          localHookAudioUrlRef.current = URL.createObjectURL(wavBlob);
          audioPathForNav = localHookAudioUrlRef.current;
        }
      } else {
        await uploadHookWav(storagePath, wavBlob, fileName, userId, session?.access_token ?? null);
      }

      if (uploadFirstFlow) {
        const setupParams = new URLSearchParams({
          lang,
          flow: "finalize-battle",
          audioPath: audioPathForNav,
          fighterName: fighterName.trim() || "未命名鬥士",
          songName: songName.trim() || fileName.replace(/\.wav$/i, ""),
          genre: genre.trim() || "AI Music",
          aiTool: aiTool.trim(),
          hookStart: start.toFixed(2),
          hookEnd: end.toFixed(2),
          hookDuration: (end - start).toFixed(2),
          battleMode,
          instantPairing,
          dailyPairing,
          audioSha256,
        });
        if (challengeTargetQueueId) setupParams.set("challengeEntryId", challengeTargetQueueId);
        if (hookBattleAt) setupParams.set("hookBattleAt", hookBattleAt);
        setCompactParam(setupParams, "lyrics", lyricsForSave);

        writeFighterNameToStorage(fighterName.trim() || "未命名鬥士");
        setUploadPhase(t.cutSaved);
        window.setTimeout(() => {
          router.push(`/battle/setup?${setupParams.toString()}#battle-info`);
        }, 650);
        return;
      }

      setUploadPhase(t.uploadingSaving);

      let queueIdForNav: string;
      let nextPath: string;

      // 公測期 Battle 不以 APC 作為入場限制；APC 只保留作為獎勵、榮譽與互動點數。
      if (!isAuthBypassEnabled) {
        // 先確保 user_profiles 存在（第一次報名時建立）
        const { error: profileErr } = await supabase
          .from("user_profiles")
          .upsert({ id: userId }, { onConflict: "id" });
        if (profileErr) {
          console.error("[hook-cut] user_profiles upsert", profileErr);
          throw profileErr;
        }
        await saveFighterNameToProfile(userId, fighterName.trim() || "未命名鬥士");

        const initialQueueStatus: "searching" | "waiting_challenge" =
          challengeTargetQueueId || instantPairing === "auto" ? "searching" : "waiting_challenge";
        const baseRow = {
          user_id: userId,
          fighter_name: fighterName.trim() || "未命名鬥士",
          genre: genre.trim() || "未指定",
          audio_path: storagePath,
          audio_sha256: audioSha256,
          original_file_name: (songName.trim() || fileName).slice(0, 500),
          status: initialQueueStatus,
        };

        let queueRows: { id: string }[] | null = null;
        let queueError: { message: string; code?: string; details?: string; hint?: string } | null = null;
        const optionalChallenge =
          challengeTargetQueueId && /^[0-9a-f-]{36}$/i.test(challengeTargetQueueId)
            ? { challenge_target_queue_id: challengeTargetQueueId }
            : {};
        const optionalSchedule = hookBattleStartIso ? { expires_at: hookBattleStartIso } : {};
        const baseRowWithoutAudioHash = { ...baseRow };
        delete (baseRowWithoutAudioHash as Record<string, unknown>).audio_sha256;

        const insertAttempts: Array<Record<string, unknown>> = [
          { ...baseRow, ...optionalChallenge, ...optionalSchedule, ai_tool: aiTool.trim() || null, lyrics: lyricsForSave || null },
          { ...baseRow, ...optionalChallenge, ...optionalSchedule, ai_tool: aiTool.trim() || null },
          { ...baseRow, ...optionalChallenge, ...optionalSchedule, lyrics: lyricsForSave || null },
          { ...baseRow, ...optionalChallenge, ...optionalSchedule },
          baseRow,
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...optionalSchedule, ai_tool: aiTool.trim() || null, lyrics: lyricsForSave || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...optionalSchedule, ai_tool: aiTool.trim() || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...optionalSchedule, lyrics: lyricsForSave || null },
          { ...baseRowWithoutAudioHash, ...optionalChallenge, ...optionalSchedule },
          baseRowWithoutAudioHash,
        ];

        for (const row of insertAttempts) {
          const res = await supabase.from("battle_queue").insert(row).select("id");
          queueError = res.error;
          queueRows = res.data;
          if (!queueError) break;

          const msg = `${queueError.message ?? ""} ${queueError.details ?? ""} ${queueError.hint ?? ""}`;
          const missingOptionalCol =
            /ai_tool|lyrics|audio_sha256|column.*does not exist|schema cache/i.test(msg) || queueError.code === "PGRST204";
          if (!missingOptionalCol) break;
        }

        if (queueError) {
          if (isDuplicateAudioHash(queueError)) {
            void supabase.storage.from("battle-audio").remove([storagePath]);
            throw new Error("這個 Drop 音檔已經上傳過了，請換另一段 Drop。");
          }
          console.error("[hook-cut] battle_queue insert", queueError);
          throw queueError;
        }

        const first = queueRows?.[0];
        if (!first?.id) {
          console.error("[hook-cut] battle_queue insert returned no rows (check RLS / grants)", queueRows);
          throw new Error("queue insert returned no id — 請在 Supabase 執行 supabase/battle_queue_grants.sql 並確認 battle_queue RLS");
        }
        queueIdForNav = first.id;

        if (!challengeTargetQueueId && instantPairing === "invite") {
          nextPath = `/battle?lang=${lang}&focusQueue=${queueIdForNav}`;
          setUploadPhase(t.success);
          window.setTimeout(() => {
            router.push(nextPath);
          }, 450);
          return;
        }

        const rpcArgs = {
          p_queue_id: queueIdForNav,
          p_target_queue_id:
            challengeTargetQueueId && /^[0-9a-f-]{36}$/i.test(challengeTargetQueueId)
              ? challengeTargetQueueId
              : null,
        };
        let rpcRaw: unknown = null;
        let rpcErr: { message?: string; details?: string | null; hint?: string | null } | null = null;
        try {
          rpcRaw = await attemptMatchmakingWithoutApcGate({
            queueId: queueIdForNav,
            targetQueueId: rpcArgs.p_target_queue_id,
            accessToken: session?.access_token ?? "",
          });
        } catch (apiError) {
          rpcErr = { message: apiError instanceof Error ? apiError.message : "matchmaking api failed" };
          console.warn("[hook-cut] public beta matchmaking api unavailable; trying RPC fallback", apiError);
        }
        if (rpcErr) {
          let { data: rpcData, error: rpcFallbackErr } = await supabase.rpc("attempt_matchmaking", rpcArgs);
          const msg = `${rpcFallbackErr?.message ?? ""} ${rpcFallbackErr?.details ?? ""} ${rpcFallbackErr?.hint ?? ""}`;
          if (/p_target_queue_id|function.*does not exist|schema cache/i.test(msg)) {
            const retry = await supabase.rpc("attempt_matchmaking", { p_queue_id: queueIdForNav });
            rpcData = retry.data;
            rpcFallbackErr = retry.error;
          }
          rpcRaw = rpcData;
          rpcErr = rpcFallbackErr;
        }
        if (rpcErr) {
          console.warn("[hook-cut] immediate matchmaking unavailable; continuing with async queue", rpcErr);
        }
        const rpcRow = (Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw) as RpcQueueRow | null;
        console.log("[hook-cut] attempt_matchmaking result", rpcRow);

        const mmParams = new URLSearchParams({
          fighterName,
          songName,
          genre,
          aiTool,
          hookStart: start.toFixed(2),
          hookEnd: end.toFixed(2),
          hookDuration: (end - start).toFixed(2),
          lang,
          audioPath: audioPathForNav,
          queueId: queueIdForNav,
        });
        mmParams.set("instantPairing", instantPairing);
        if (rpcErr) {
          setCompactParam(mmParams, "matchmakingIssue", describeSupabaseError(rpcErr), 500);
        }
        if (challengeTargetQueueId) mmParams.set("challengeEntryId", challengeTargetQueueId);
        setCompactParam(mmParams, "avatarUrl", avatarUrl, 8000);
        setCompactParam(mmParams, "coverUrl", coverUrl, 8000);
        setShortParam(mmParams, "assetKey", assetKey);
        setCompactParam(mmParams, "lyrics", lyricsForSave);

        nextPath =
          rpcRow?.status === "matched" && rpcRow.match_group_id
            ? `/battle/${rpcRow.match_group_id}?${mmParams.toString()}`
            : `/battle/matchmaking?${mmParams.toString()}`;
      } else {
        queueIdForNav = `mock-${Date.now()}`;
        const mmParams = new URLSearchParams({
          fighterName,
          songName,
          genre,
          aiTool,
          hookStart: start.toFixed(2),
          hookEnd: end.toFixed(2),
          hookDuration: (end - start).toFixed(2),
          lang,
          audioPath: audioPathForNav,
          queueId: queueIdForNav,
        });
        setCompactParam(mmParams, "avatarUrl", avatarUrl, 8000);
        setCompactParam(mmParams, "coverUrl", coverUrl, 8000);
        setShortParam(mmParams, "assetKey", assetKey);
        setCompactParam(mmParams, "lyrics", lyricsForSave);
        nextPath = `/battle/matchmaking?${mmParams.toString()}`;
      }

      writeFighterNameToStorage(fighterName.trim() || "未命名鬥士");

      setUploadPhase(t.success);

      setTimeout(() => {
        router.push(nextPath);
      }, 1200);
    } catch (err) {
      console.error("Upload failed:", err);
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      setUploadPhase(null);
      alert(`${t.uploadError}\n\n${msg.slice(0, 400)}`);
    }
  };

  const previewSelection = async () => {
    if (!isReady || isDecoding || !audioBufferRef.current) return;
    await playFromRegion();
  };

  const selectedDuration = Math.max(0, regionTimes.end - regionTimes.start);
  const isUploading = uploadPhase !== null;

  return (
    <div className="min-h-screen bg-black px-8 pb-8 pt-24 text-white selection:bg-orange-500/30 selection:text-white md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 頂部列 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-orange-400">{t.title}</h1>
            <p className="text-zinc-400 mt-1 text-sm">
              {uploadFirstFlow
                ? lang === "zh"
                  ? "先上傳歌曲，系統會自動偵測歌名，再裁切 45 秒 Drop"
                  : "Upload first, auto-detect song info, then cut a 45s Drop"
                : t.subtitle}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-right">
            <p className="text-xs text-zinc-500">{t.fighter}</p>
            <p className="font-bold text-orange-400">{fighterName}</p>
            <p className="text-xs text-zinc-500 mt-1">{t.song}: {songName || (lang === "zh" ? "上傳後自動偵測" : "Auto-detect after upload")}</p>
          </div>
        </div>

        <SafetyNotice kind="upload" />

        {!audioUrl && (
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDragActive(false);
            }}
            onDrop={(event) => void handleAudioDrop(event)}
            className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-16 text-center transition-colors ${
              dragActive ? 'border-orange-400 bg-orange-500/10' : 'border-zinc-700 hover:border-orange-500'
            }`}
          >
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.aac,.flac,.ogg,.aif,.aiff"
              onChange={(event) => void handleFileUpload(event)}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              id="hook-upload"
              aria-label={t.uploadPrompt}
            />
            <div className="pointer-events-none block">
              <div className="mb-6 text-7xl">🎵</div>
              <p className="text-2xl font-medium">{isDecoding ? t.decording : t.uploadPrompt}</p>
              <p className="mt-2 text-sm text-zinc-500">{t.uploadDropHint}</p>
              <p className="mt-1 text-xs text-zinc-600">{t.uploadHint}</p>
            </div>
            {audioError && (
              <p className="pointer-events-none relative z-20 mx-auto mt-5 max-w-xl rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                {audioError}
              </p>
            )}
          </div>
        )}

        {audioUrl && (
          <div className="space-y-10">
            <div className="rounded-2xl border border-green-400/25 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-200">
              {t.uploadReady}
              {detectedMetaLine && (
                <span className="mt-1 block text-xs font-semibold text-green-100/75">
                  {t.detectedMeta.replace("{value}", detectedMetaLine)}
                </span>
              )}
            </div>
            {/* 波形 */}
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6">
              <div className="rounded-2xl overflow-hidden bg-zinc-800/60 ring-1 ring-zinc-700/70">
                <div ref={containerRef} />
              </div>

              {/* 選取資訊 */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-zinc-200">
                  <span className="font-semibold text-orange-300">{t.selection}</span>
                  {' '}
                  <span className="tabular-nums">
                    {formatTime(regionTimes.start)} - {formatTime(regionTimes.end)}
                  </span>
                  <span className="text-zinc-500">
                    {t.duration.replace('{s}', selectedDuration.toFixed(2))}
                  </span>
                </div>
                <div className="text-xs text-zinc-500">
                  {t.dragHint}
                  {isPlaying && <span className="ml-2 text-orange-400">{t.playing}</span>}
                  {isDecoding && <span className="ml-2 text-zinc-400">{t.decording}</span>}
                </div>
              </div>

              {/* Mastering 開關 */}
              <div className="mt-6 flex items-center justify-between gap-4 rounded-3xl bg-black/30 ring-1 ring-zinc-800 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{t.mastering}</div>
                  <div className="text-xs text-zinc-500">{t.masteringDesc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableMastering((v) => !v)}
                  className={[
                    'relative inline-flex h-9 w-16 items-center rounded-full transition',
                    enableMastering ? 'bg-orange-500' : 'bg-zinc-700',
                    'ring-1 ring-white/10',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60',
                  ].join(' ')}
                  aria-pressed={enableMastering}
                  aria-label={t.mastering}
                >
                  <span
                    className={[
                      'inline-block h-7 w-7 transform rounded-full bg-black shadow transition',
                      enableMastering ? 'translate-x-8' : 'translate-x-1',
                      'ring-1 ring-white/10',
                    ].join(' ')}
                  />
                </button>
              </div>

              <p className="text-center text-xs text-zinc-500 mt-5">{t.proTip}</p>
            </div>

            {/* 歌詞上傳 */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-[0_16px_54px_rgba(0,0,0,0.28)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{t.lyricsTitle}</div>
                  <div className="mt-1 text-xs text-zinc-500">{t.lyricsUploadHint}</div>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".txt,.lrc,text/plain"
                    onChange={handleLyricsUpload}
                    className="hidden"
                    id="lyrics-upload"
                  />
                  <label
                    htmlFor="lyrics-upload"
                    className="inline-flex cursor-pointer items-center justify-center rounded-full border border-orange-400/60 bg-orange-500/10 px-5 py-2.5 text-sm font-bold text-orange-300 transition hover:bg-orange-500/20"
                  >
                    {t.lyricsUpload}
                  </label>
                </div>
              </div>
              {lyricsFileName && (
                <p className="mt-3 text-xs text-orange-300/90">
                  {t.lyricsFileLoaded.replace('{name}', lyricsFileName)}
                </p>
              )}
              <textarea
                value={lyricsText}
                onChange={(e) => {
                  setLyricsText(e.target.value.slice(0, MAX_LYRICS_CHARS));
                  if (lyricsFileName) setLyricsFileName(null);
                }}
                placeholder={t.lyricsPlaceholder}
                className="mt-4 min-h-40 w-full resize-y rounded-2xl border border-zinc-800 bg-black/55 px-4 py-3 text-sm leading-7 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-400/70"
              />
            </div>

            {/* 按鈕 */}
            <div className="flex gap-4">
              <button
                onClick={previewSelection}
                disabled={!isReady || isDecoding || !audioBufferRef.current || isUploading}
                className="flex-1 bg-white text-black font-bold py-6 rounded-3xl text-xl hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {t.preview}
              </button>

              <button
                onClick={handleConfirmUpload}
                disabled={!isReady || isDecoding || isUploading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 rounded-3xl text-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
              >
                {isUploading
                  ? `⏳ ${uploadPhase}`
                  : `✨ ${enableMastering ? t.masteringOn : t.masteringOff} + ${uploadFirstFlow ? t.continueSetup : t.confirmUpload}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HookCutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-orange-400 text-sm tracking-widest">
        載入中…
      </div>
    }>
      <HookCutContent />
    </Suspense>
  );
}
