"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import LangToggle from "@/components/lang-toggle";
import SafetyNotice from "@/components/safety-notice";
import { useI18n } from "@/lib/i18n";
import { parseAudioMetadata } from "@/lib/audio-metadata";
import { sha256File } from "@/lib/file-hash";
import { supabase } from "@/lib/supabase";
import { loadFighterNameFromProfile } from "@/lib/user-profile-fighter-name";
import { IMAGE_UPLOAD_ACCEPT, imageContentType, isAllowedImageUploadFile } from "@/lib/image-upload-policy";
import {
  LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS,
  LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
  limitListenBarDisplayText,
} from "@/lib/listen-bar-field-limits";
import {
  LISTEN_BAR_AUDIO_UPLOAD_ACCEPT,
  LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES,
  LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL,
  isAllowedListenBarAudioFile,
  isListenBarStorageSizeLimitError,
  listenBarAudioContentType,
  listenBarAudioSizeLabel,
  uploadListenBarAudioFile,
} from "@/lib/listen-bar-upload-policy";
import ShareButton from "@/components/share-button";
import ReportButton from "@/components/report-button";
import AuthRequiredDialog from "@/components/auth-required-dialog";
import NewMusicBadge from "@/components/new-music-badge";
import { shouldExpireOpenDropQueue } from "@/lib/battle-pool-client";
import {
  DEFAULT_LISTEN_BAR_COVER,
  LISTEN_BAR_AUDIO_BUCKET,
  LISTEN_BAR_CHALLENGER_HOURLY_LIMIT,
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  LISTEN_BAR_COVER_BUCKET,
  LISTEN_BAR_CREATOR_DAILY_UPLOAD_LIMIT_AFTER_TOTAL_PUBLIC,
  LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT,
  LISTEN_BAR_CREATOR_PUBLIC_UPLOAD_LIMIT_STARTED_AT,
  LISTEN_BAR_CREATOR_TOTAL_PUBLIC_DAILY_LIMIT_THRESHOLD,
  LISTEN_BAR_GENRE_POOL_LIMIT,
  LISTEN_BAR_TOTAL_ROTATION_LIMIT,
  EMPTY_LISTEN_BAR_TRACK,
  fallbackOfficialPlaylist,
  listenBarChallengerSlotLimitForPublicCount,
  listenBarCreatorDailyUploadLimitReached,
  listenBarCreatorGenrePublicLimitReached,
  listenBarPublicDisplayDay,
  listenBarRowToTrack,
  listenBarSubmissionPhaseForGenrePublicCount,
  listenBarSurvivalStartedAt,
  type ListenBarTrack,
  type ListenBarTrackRow,
} from "@/lib/listen-bar";
import { usePresenceCount } from "@/lib/use-presence-count";
import { logAnalyticsEvent } from "@/lib/analytics-client";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { listenBarShortPath } from "@/lib/share-short-links";
import { normalizeYouTubeUrl } from "@/lib/youtube-url";
import { clampMediaVolume, setNativeMediaVolume } from "@/lib/media-volume-control";
import { isNewlyPublishedMusic } from "@/lib/music-newness";
import type { User } from "@supabase/supabase-js";

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  time: string;
  createdAt?: string | null;
};

type StoredBarMessageRow = {
  id: string;
  name: string;
  text: string;
  createdAt: string;
};

type TrackComment = {
  id: string;
  trackId: string;
  name: string;
  text: string;
  time: string;
  createdAt?: string | null;
};

type StoredTrackCommentRow = {
  id: string;
  trackId: string;
  name: string;
  text: string;
  createdAt: string;
};

type ReactionKey = "heart" | "star" | "thumb" | "happy";

type ReactionCounts = Record<ReactionKey, number>;

function barText(lang: string, zh: string, en: string, ja: string, ko: string) {
  if (lang === "ja") return ja;
  if (lang === "ko") return ko;
  if (lang === "en") return en;
  return zh;
}

type MyBroadcastStat = {
  id: string;
  title: string;
  aiTool: string;
  genre: string;
  album: string;
  description: string;
  youtubeUrl: string;
  duration: number;
  barPhase: "challenger" | "public";
  positives: number;
  heart: number;
  star: number;
  thumb: number;
  happy: number;
  createdAt: string | null;
  promotedAt: string | null;
};

type MyTracksPayload = {
  challengerCount?: number;
  challengerLimit?: number;
  publicCount?: number;
  tracks?: ListenBarTrackRow[];
  error?: string;
};

type BattleTickerRow = {
  id: string;
  fighter_name?: string | null;
  original_file_name?: string | null;
  genre?: string | null;
  ai_tool?: string | null;
  status?: string | null;
  match_group_id?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  public_vote_score?: number | null;
  created_at?: string | null;
};

type LyricLine = {
  time: number | null;
  text: string;
};

const LISTEN_BAR_STORAGE_KEYS = [
  "aipoger:listens:queue",
  "aipoger:listens:messages",
  "aipoger:listens:reaction-counts",
  "aipoger:listens:my-reactions",
];
const LISTEN_BAR_VISITOR_ID_KEY = "aipoger:listens:visitor-id";

const emptyReactions: ReactionCounts = {
  heart: 0,
  star: 0,
  thumb: 0,
  happy: 0,
};

const LISTEN_BAR_MESSAGE_LIMIT = 80;
const LIVE_RADIO_EPOCH_MS = Date.UTC(2026, 0, 1);
const PRIORITY_AIRPLAY_BATCH_MS = 60 * 60 * 1000;
const STOP_HOME_BGM_EVENT = "aipoger:stop-home-bgm";

const LISTEN_BAR_GENRES = MUSIC_GENRE_OPTIONS;
const LISTEN_BAR_GENRE_SLUGS = new Map<string, string>(LISTEN_BAR_GENRES.map((genre, index) => [genre.value, String(index + 1)]));
const listenBarUploadLimitStartedAtMs = new Date(LISTEN_BAR_CREATOR_PUBLIC_UPLOAD_LIMIT_STARTED_AT).getTime();
const taipeiDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function taipeiDayKey(value: string | number | Date | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? "");
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return "";
  return taipeiDayFormatter.formatToParts(date)
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join("-");
}

function taipeiVoteDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : now.toISOString().slice(0, 10);
}

type PublicUploadForm = {
  title: string;
  artist: string;
  aiTool: string;
  genre: string;
  album: string;
  description: string;
  youtubeUrl: string;
};

type GenrePlaybackSelection = "all" | string;

const initialPublicUploadForm: PublicUploadForm = {
  title: "",
  artist: "",
  aiTool: "",
  genre: "",
  album: "",
  description: "",
  youtubeUrl: "",
};

type ListenBarRecordArtProps = {
  coverUrl: string;
  title: string;
  isPlaying: boolean;
  isNew: boolean;
  lang: string;
};

const ListenBarRecordArt = memo(function ListenBarRecordArt({ coverUrl, title, isPlaying, isNew, lang }: ListenBarRecordArtProps) {
  return (
    <div className="relative isolate mx-auto flex aspect-square w-full max-w-[17rem] items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a] shadow-[inset_0_0_70px_rgba(255,255,255,0.055),0_0_52px_rgba(255,106,0,0.16)] [contain:paint] min-[430px]:max-w-[18.5rem] sm:max-w-[23rem] sm:shadow-[inset_0_0_70px_rgba(255,255,255,0.055),0_0_74px_rgba(255,106,0,0.14)]">
      {isNew ? <NewMusicBadge lang={lang} className="absolute left-[20%] top-[11%] z-20 sm:top-[12%]" /> : null}
      <div
        className={`pointer-events-none absolute inset-[4%] rounded-full border transition-[border-color,box-shadow,opacity] duration-500 ${
          isPlaying
            ? "border-orange-300/26 opacity-90 shadow-[0_0_28px_rgba(255,106,0,0.18)]"
            : "border-white/8 opacity-55"
        }`}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-[8%] rounded-full border border-zinc-800/90" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-[16%] rounded-full border border-zinc-800/76" aria-hidden="true" />
      <div className="absolute inset-[15%] overflow-hidden rounded-full border-2 border-orange-300/36 bg-black/72 shadow-[0_0_34px_rgba(255,106,0,0.14)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={title}
          className="h-full w-full object-cover"
          decoding="async"
          loading="eager"
          onError={(event) => {
            if (event.currentTarget.src.endsWith(DEFAULT_LISTEN_BAR_COVER)) return;
            event.currentTarget.src = DEFAULT_LISTEN_BAR_COVER;
          }}
        />
      </div>
    </div>
  );
});

function isMissingListenBarSubmissionColumn(error: unknown): boolean {
  const code = error && typeof error === "object" ? (error as { code?: string }).code : "";
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return code === "PGRST204" || /schema cache|column .* does not exist|could not find .* column/i.test(text);
}

function missingListenBarDescriptionColumnMessage(isZh: boolean) {
  return isZh
    ? "傷心酒吧資料庫還沒套用一句歌曲介紹欄位，請先執行 supabase/20260611_listen_bar_track_metadata.sql 後再補資料。"
    : "Bar Heartbreak is missing the one-line description database field. Apply supabase/20260611_listen_bar_track_metadata.sql before saving this detail.";
}

function isDuplicateAudioHashError(error: unknown): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /audio_sha256|duplicate key value|23505/i.test(text);
}

function isUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function timeLabelFromDate(value: string | null | undefined) {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(Number.isFinite(date.getTime()) ? date : new Date());
}

function battleTickerTimeLabel(value: string | null | undefined, isZh: boolean) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat(isZh ? "zh-TW" : "en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  }).format(date);
}

function battleTickerMessage(row: BattleTickerRow, isZh: boolean) {
  const fighterName = row.fighter_name?.trim() || (isZh ? "創作者" : "Creator");
  const songName = row.original_file_name?.trim() || (isZh ? "這首 Drop" : "this Drop");
  const scheduleLabel = battleTickerTimeLabel(row.scheduled_start_at ?? row.expires_at, isZh);
  const timeText = scheduleLabel ? (isZh ? ` · 台灣時間 ${scheduleLabel}` : ` · Taiwan time ${scheduleLabel}`) : "";

  if (row.status === "waiting_challenge") {
    return isZh
      ? `AI 音樂鬥歌場快訊：${fighterName} 的《${songName}》正在等人接戰${timeText}，快來挑戰或觀戰。`
      : `AI Music Battle Hall: ${fighterName}'s "${songName}" is open for challenge${timeText}. Step in, watch, or back the Drop.`;
  }

  if (row.status === "public_voting") {
    return isZh
      ? `AI 音樂鬥歌場快訊：《${songName}》正在公開投票${timeText}，進場支持你喜歡的 Drop。`
      : `AI Music Battle Hall: "${songName}" is in public voting${timeText}. Help decide if this Drop earns recognition.`;
  }

  return isZh
    ? `AI 音樂鬥歌場快訊：《${songName}》已進入 Ghost Battle${timeText}，進場聽歌投票。`
    : `AI Music Battle Hall: "${songName}" is in Ghost Battle${timeText}. Listen, vote, and keep the record alive.`;
}

function storedBarMessageRowToChat(row: StoredBarMessageRow): ChatMessage | null {
  const text = row.text?.trim();
  const displayName = row.name?.trim();
  if (!row.id || !text) return null;
  return {
    id: row.id,
    name: !displayName || displayName === "訪客" ? "吧友" : displayName,
    text,
    time: timeLabelFromDate(row.createdAt),
    createdAt: row.createdAt,
  };
}

function storedTrackCommentRowToComment(row: StoredTrackCommentRow): TrackComment | null {
  const text = row.text?.trim();
  const displayName = row.name?.trim();
  const trackId = row.trackId?.trim();
  if (!row.id || !trackId || !text) return null;
  return {
    id: row.id,
    trackId,
    name: !displayName || displayName === "訪客" ? "吧友" : displayName,
    text,
    time: timeLabelFromDate(row.createdAt),
    createdAt: row.createdAt,
  };
}

function listenBarRowToMyBroadcastStat(row: ListenBarTrackRow): MyBroadcastStat {
  return {
    id: row.id,
    title: row.title?.trim() || "Untitled",
    aiTool: row.ai_tool?.trim() || "AI Music",
    genre: row.genre?.trim() || "Original 自我風格",
    album: row.mood?.trim() || "",
    description: row.description?.trim() || "",
    youtubeUrl: row.youtube_url?.trim() || "",
    duration: Math.max(1, Math.round(row.duration_seconds ?? 0)),
    barPhase: row.bar_phase === "public" ? "public" : "challenger",
    positives: Math.max(0, row.positive_reaction_count ?? 0),
    heart: Math.max(0, row.heart_count ?? 0),
    star: Math.max(0, row.star_count ?? 0),
    thumb: Math.max(0, row.thumb_count ?? 0),
    happy: Math.max(0, row.happy_count ?? 0),
    createdAt: row.created_at ?? null,
    promotedAt: row.promoted_at ?? null,
  };
}

function localizeListenBarMessage(message: ChatMessage, isZh: boolean): ChatMessage {
  void isZh;
  return message;
}

function userDisplayName(user: User | null): string {
  if (!user) return "吧友";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = meta?.full_name;
  const name = meta?.name;
  const email = user.email;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (typeof name === "string" && name.trim()) return name.trim();
  if (email) return email.split("@")[0] ?? "我";
  return "我";
}

function userAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const avatar = meta?.avatar_url;
  const picture = meta?.picture;
  if (typeof avatar === "string" && avatar.trim()) return avatar.trim();
  if (typeof picture === "string" && picture.trim()) return picture.trim();
  return null;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, Math.floor(seconds % 60));
  return `${m}:${String(s).padStart(2, "0")}`;
}

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || `listen-${Date.now()}`;
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="m4 12 15-7-4.5 14-3-5.5L4 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m11.5 13.5 3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function pickRandomTrack(tracks: ListenBarTrack[], avoidId?: string): ListenBarTrack | null {
  if (tracks.length === 0) return null;
  if (tracks.length === 1) return tracks[0];
  const candidates = tracks.filter((track) => track.id !== avoidId);
  const pool = candidates.length > 0 ? candidates : tracks;
  return pool[Math.floor(Math.random() * pool.length)];
}

function trackCreatedAtMs(track: ListenBarTrack): number {
  const value = new Date(track.createdAt ?? 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function getPriorityAirplayBatch(
  tracks: ListenBarTrack[],
  servedIds: Set<string>,
  avoidId?: string,
  nowMs = Date.now(),
): ListenBarTrack[] {
  const orderedTracks = tracks
    .filter((track) => track.audioUrl && trackCreatedAtMs(track) > 0)
    .sort((a, b) => trackCreatedAtMs(a) - trackCreatedAtMs(b));
  if (orderedTracks.length === 0) return [];

  const queueStartMs = trackCreatedAtMs(orderedTracks[0]);
  const currentBatchIndex = Math.max(0, Math.floor((nowMs - queueStartMs) / PRIORITY_AIRPLAY_BATCH_MS));
  const batchEnd = Math.min(
    orderedTracks.length,
    (currentBatchIndex + 1) * LISTEN_BAR_CHALLENGER_HOURLY_LIMIT,
  );

  return orderedTracks
    .slice(0, batchEnd)
    .filter((track) => track.id !== avoidId && !servedIds.has(track.id));
}

function getLiveRadioPosition(tracks: ListenBarTrack[], nowMs = Date.now()) {
  const playableTracks = tracks.filter((track) => track.audioUrl);
  if (playableTracks.length === 0) return null;
  const totalDuration = playableTracks.reduce((sum, track) => sum + Math.max(1, Math.round(track.duration || 1)), 0);
  if (totalDuration <= 0) return { track: playableTracks[0], offset: 0 };

  let cursor = Math.floor(Math.max(0, nowMs - LIVE_RADIO_EPOCH_MS) / 1000) % totalDuration;
  for (const track of playableTracks) {
    const duration = Math.max(1, Math.round(track.duration || 1));
    if (cursor < duration) return { track, offset: cursor };
    cursor -= duration;
  }

  return { track: playableTracks[0], offset: 0 };
}

function getListenBarVisitorId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(LISTEN_BAR_VISITOR_ID_KEY);
  if (existing) return existing;
  const next = `visitor:${crypto.randomUUID()}`;
  window.localStorage.setItem(LISTEN_BAR_VISITOR_ID_KEY, next);
  return next;
}

function albumDisplayLabel(value: string, lang: string) {
  const cleanValue = value
    .replace(/^AI Music\s*\/\s*/i, "")
    .replace(/^官方公播\s*\/\s*/i, "")
    .replace(/^專輯名稱\s*\/\s*/i, "")
    .replace(/^Album\s*\/\s*/i, "")
    .trim();
  if (!cleanValue || cleanValue === "官方輪播") return "";
  if (cleanValue === "創作者投稿" || cleanValue === "Creator submission" || cleanValue === "Creator Submission") return barText(lang, "創作者投稿", "Creator Submission", "クリエイター投稿", "크리에이터 업로드");
  return barText(lang, `專輯名稱 / ${cleanValue}`, `Album / ${cleanValue}`, `アルバム / ${cleanValue}`, `앨범 / ${cleanValue}`);
}

function genreDisplayLabel(value: string | null | undefined, lang: string) {
  const cleanValue = value?.trim();
  if (!cleanValue || cleanValue === "自我風格" || cleanValue === "Original 自我風格" || cleanValue === "Custom Style" || cleanValue === "Original Style") {
    return barText(lang, "Original 自我風格", "Original Style", "Original 独自スタイル", "Original 자유 스타일");
  }
  return cleanValue;
}

function descriptionDisplayLabel(value: string | null | undefined, lang: string) {
  const cleanValue = value?.trim();
  if (cleanValue) return cleanValue;
  return barText(lang, "這首歌還在等創作者補上一句故事", "This track is waiting for a one-line story", "この曲はクリエイターの一言を待っています", "이 곡은 크리에이터의 한 줄 이야기를 기다리고 있습니다");
}

function titleDisplayUnits(value: string) {
  return Array.from(value.trim()).reduce((sum, char) => {
    if (/\s/.test(char)) return sum + 0.45;
    if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(char)) return sum + 2;
    if (/[A-Z]/.test(char)) return sum + 1.15;
    return sum + 1;
  }, 0);
}

function nowPlayingTitleClass(title: string) {
  const units = titleDisplayUnits(title);
  const base = "mt-4 line-clamp-2 break-words font-black text-white [overflow-wrap:anywhere]";
  if (units >= 24) {
    return `${base} max-w-[min(100%,15.5em)] text-[clamp(1.55rem,2.8vw,2.85rem)] leading-[1.03]`;
  }
  if (units >= 16) {
    return `${base} max-w-[min(100%,13.2em)] text-[clamp(1.95rem,3.45vw,3.65rem)] leading-[0.98]`;
  }
  return `${base} max-w-[9.8em] text-[clamp(2.25rem,4.1vw,4.4rem)] leading-[0.92]`;
}

function listenBarShortFieldHint(isZh: boolean) {
  return isZh ? "中文 12 字內；英文約 24 字元" : "12 CJK chars; about 24 English characters";
}

function listenBarDescriptionHint(isZh: boolean) {
  return isZh ? "中文 16 字內；英文約 32 字元" : "16 CJK chars; about 32 English characters";
}

function aiToolDisplayLabel(value: string | null | undefined, lang: string) {
  const cleanValue = value?.trim() || "AI Music";
  return barText(lang, `AI 工具 ${cleanValue}`, `AI Tool ${cleanValue}`, `AIツール ${cleanValue}`, `AI 도구 ${cleanValue}`);
}

function challengerProtectionPercent(value: string | null | undefined) {
  const time = new Date(value ?? "").getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.min(100, ((Date.now() - time) / (24 * 60 * 60 * 1000)) * 100));
}

function parseLyricLines(value: string): LyricLine[] {
  const rawLines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: LyricLine[] = rawLines.flatMap<LyricLine>((line) => {
    const timeMatches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    const text = line.replace(/\[[^\]]+\]/g, "").trim();
    if (timeMatches.length === 0) return [{ time: null, text: line }];
    return timeMatches.map((match) => {
      const minutes = Number(match[1] ?? 0);
      const seconds = Number(match[2] ?? 0);
      const fraction = match[3] ? Number(`0.${match[3].padEnd(3, "0").slice(0, 3)}`) : 0;
      return {
        time: minutes * 60 + seconds + fraction,
        text: text || "♪",
      };
    });
  });

  return parsed.sort((a, b) => {
    if (a.time === null && b.time === null) return 0;
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time - b.time;
  });
}

export default function ListenBarPage() {
  const { lang, t } = useI18n();
  const isZh = lang === "zh";
  const langQuery = `?lang=${lang}`;
  const signTitleClass = isZh
    ? "text-[clamp(3.45rem,12.5vw,8.4rem)] md:text-[clamp(3.05rem,7.8vw,5.6rem)]"
    : "text-[clamp(2.45rem,7.2vw,5.9rem)] md:text-[clamp(2rem,4.8vw,3.9rem)]";
  const listenCopy = isZh
    ? {
        playMySong: "我要播歌！",
        shareTitle: "AIPOGER 傷心酒吧 Bar Heartbreak",
        shareText: ["快來來傷心酒吧 Bar Heartbreak", "這麼好聽的歌以後聽不到了怎麼辦？", "只有被聽見留下傷心的歌，才有資格繼續播放"].join("\n"),
        shareLabel: "分享吧台",
        copied: "已複製",
        battleHall: "探索 AI 音樂",
        title: "傷心酒吧",
        subtitle: "在 AI 與不 AI 之間只有真正被聽見的歌才能留下來",
        surfaceHint: "AI 音樂公播池與投稿入口：上傳後進入分類輪播，也會出現在探索 AI 音樂。",
        navBattle: "探索 AI 音樂",
        navRank: "Showtime",
        ticker: "先探索 AI 音樂，再從喜歡的作品發起挑戰。",
        queueTitle: "接續的六首歌",
        queueWaiting: "等待接續歌曲",
        queueEmpty: "等待創作者投稿後，下一首會顯示在這裡。",
        warming: "現場升溫中",
        listeners: (count: number) => `${count} 人正在傷心酒吧`,
      }
    : lang === "ja"
      ? {
          playMySong: "曲を流す",
          shareTitle: "AIPOGER Bar Heartbreak",
          shareText: ["AIPOGER Bar Heartbreakへ", "この曲を聴く前に消えたらどうする？", "聴かれ、記憶された曲だけがオンエアに残る。"].join("\n"),
          shareLabel: "Share",
          copied: "Copied",
          battleHall: "Explore AI Music",
          title: "Bar Heartbreak",
          subtitle: "深く刺さる曲だけがオンエアに残る",
          surfaceHint: "AI音楽の公開放送と投稿の入口です。投稿曲はジャンル別にローテーションされ、Explore AI Musicにも表示されます。",
          navBattle: "AI音楽を探す",
          navRank: "Showtime",
          ticker: "AI音楽を探して、好きな曲から挑戦へ。",
          queueTitle: "次に流れる6曲",
          queueWaiting: "次の曲を待っています",
          queueEmpty: "次のクリエイタートラックはここに表示されます。",
          warming: "放送準備中",
          listeners: (count: number) => `${count}人が聴いています`,
        }
      : lang === "ko"
        ? {
            playMySong: "내 곡 틀기",
            shareTitle: "AIPOGER Bar Heartbreak",
            shareText: ["AIPOGER Bar Heartbreak로 오세요", "이 노래를 듣기 전에 사라지면 어떡하죠?", "들리고 기억된 곡만 온에어에 남습니다."].join("\n"),
            shareLabel: "Share",
            copied: "Copied",
            battleHall: "Explore AI Music",
            title: "Bar Heartbreak",
            subtitle: "강하게 꽂히는 곡만 온에어에 남는다",
            surfaceHint: "AI 음악 공개 방송과 업로드 입구입니다. 업로드한 곡은 장르별로 재생되며 Explore AI Music에도 표시됩니다.",
            navBattle: "AI 음악 탐색",
            navRank: "Showtime",
            ticker: "AI 음악을 먼저 탐색하고, 마음에 드는 곡에서 도전하세요.",
            queueTitle: "다음 재생 6곡",
            queueWaiting: "다음 곡을 기다리는 중",
            queueEmpty: "다음 크리에이터 트랙이 여기에 표시됩니다.",
            warming: "방송 준비 중",
            listeners: (count: number) => `${count}명 청취 중`,
          }
        : {
            playMySong: "Play My Song",
            shareTitle: "AIPOGER Bar Heartbreak",
            shareText: ["Come to AIPOGER Bar Heartbreak", "What if this song disappears before you hear it?", "Only the songs that get heard and remembered stay in rotation."].join("\n"),
            shareLabel: "Share",
            copied: "Copied",
            battleHall: "Explore AI Music",
            title: "Bar Heartbreak",
            subtitle: "Only the songs that hit hard stay on air",
            surfaceHint: "AI music airplay pool and submission entry. Uploaded tracks rotate here and appear in Explore AI Music.",
            navBattle: "Explore AI Music",
            navRank: "Showtime",
            ticker: "Explore AI music first, then challenge from tracks you like.",
            queueTitle: "Upcoming Sad Songs",
            queueWaiting: "Waiting for Songs",
            queueEmpty: "The next creator track will appear here.",
            warming: "Warming Up",
            listeners: (count: number) => `${count} Listeners`,
          };
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lyricScrollRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLDivElement | null>(null);
  const listenBarSyncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const servedCommunityIdsRef = useRef<Set<string>>(new Set());
  const liveSeekRef = useRef<{ trackId: string; offset: number } | null>(null);
  const playbackSegmentRef = useRef<{ trackId: string; startedAtMs: number; startedAtSecond: number } | null>(null);
  const startTrackAtZeroRef = useRef(false);
  const liveRadioSyncEnabledRef = useRef(true);
  const localOverrideTrackIdRef = useRef<string | null>(null);
  const rotationTracksRef = useRef<ListenBarTrack[]>([]);
  const nowTrackRef = useRef<ListenBarTrack>(EMPTY_LISTEN_BAR_TRACK);
  const radioShouldResumeRef = useRef(true);
  const volumeRef = useRef(0.72);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioGainNodeRef = useRef<GainNode | null>(null);
  const lastElapsedPaintRef = useRef(-1);
  const [userName, setUserName] = useState("吧友");
  const [visitorAvatarUrl, setVisitorAvatarUrl] = useState<string | null>(null);
  const [creatorDefaultName, setCreatorDefaultName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [officialTracks, setOfficialTracks] = useState<ListenBarTrack[]>(fallbackOfficialPlaylist);
  const [selectedPlaybackGenre, setSelectedPlaybackGenre] = useState<GenrePlaybackSelection>("all");
  const [playlistStatus, setPlaylistStatus] = useState<"loading" | "database" | "fallback">("loading");
  const [priorityAirplayIds, setPriorityAirplayIds] = useState<Set<string>>(() => new Set());
  const [challengerSlotCount, setChallengerSlotCount] = useState(0);
  const [publicUploadForm, setPublicUploadForm] = useState<PublicUploadForm>(initialPublicUploadForm);
  const [publicAudioFile, setPublicAudioFile] = useState<File | null>(null);
  const [publicCoverFile, setPublicCoverFile] = useState<File | null>(null);
  const [publicLyricsText, setPublicLyricsText] = useState("");
  const [publicUploadBusy, setPublicUploadBusy] = useState(false);
  const [removeTrackBusyId, setRemoveTrackBusyId] = useState<string | null>(null);
  const [editTrackId, setEditTrackId] = useState<string | null>(null);
  const [editTrackForm, setEditTrackForm] = useState<Pick<MyBroadcastStat, "aiTool" | "genre" | "album" | "description" | "youtubeUrl">>({
    aiTool: "",
    genre: "Original 自我風格",
    album: "",
    description: "",
    youtubeUrl: "",
  });
  const [editTrackBusy, setEditTrackBusy] = useState(false);
  const [publicUploadMessage, setPublicUploadMessage] = useState("");
  const [publicUploadError, setPublicUploadError] = useState("");
  const [myBroadcastStats, setMyBroadcastStats] = useState<MyBroadcastStat[]>([]);
  const [nowTrack, setNowTrack] = useState<ListenBarTrack>(EMPTY_LISTEN_BAR_TRACK);
  const [, setHistory] = useState<ListenBarTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [trackDuration, setTrackDuration] = useState(EMPTY_LISTEN_BAR_TRACK.duration);
  const [volume, setVolume] = useState(0.72);
  const [volumeControlFallback, setVolumeControlFallback] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<Record<string, ReactionCounts>>({});
  const [myReactions, setMyReactions] = useState<Record<string, ReactionKey | null>>({});
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatError, setChatError] = useState("");
  const [trackComments, setTrackComments] = useState<TrackComment[]>([]);
  const [trackCommentInput, setTrackCommentInput] = useState("");
  const [trackCommentError, setTrackCommentError] = useState("");
  const [trackCommentBusy, setTrackCommentBusy] = useState(false);
  const [battleTickerMessages, setBattleTickerMessages] = useState<string[]>([]);
  const listenBarPresenceCount = usePresenceCount("presence-listen-bar", true, "listen-bar");
  const listenBarPresenceLabel =
    listenBarPresenceCount <= 1
      ? listenCopy.warming
      : listenCopy.listeners(listenBarPresenceCount);
  const pageTitle = lang === "ja"
    ? "Bar Heartbreak｜AI音楽の公開放送と投稿｜AIPOGER"
    : lang === "ko"
      ? "Bar Heartbreak｜AI 음악 공개 방송과 업로드｜AIPOGER"
      : lang === "en"
        ? "Bar Heartbreak | AI Music Airplay & Uploads | AIPOGER"
        : "傷心酒吧｜AI 音樂公播與投稿｜AIPOGER";

  useEffect(() => {
    const syncTitle = () => {
      if (document.title !== pageTitle) document.title = pageTitle;
    };
    syncTitle();
    const frame = window.requestAnimationFrame(syncTitle);
    const timer = window.setTimeout(syncTitle, 1200);
    const observer = new MutationObserver(syncTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [pageTitle]);
  const applyRadioVolume = useCallback((audio: HTMLAudioElement, nextVolume: number) => {
    const normalizedVolume = clampMediaVolume(nextVolume);
    const nativeApplied = setNativeMediaVolume(audio, normalizedVolume);
    const audioContext = audioContextRef.current;
    const gainNode = audioGainNodeRef.current;
    if (audioContext && gainNode) {
      gainNode.gain.setValueAtTime(normalizedVolume, audioContext.currentTime);
    }
    return nativeApplied || Boolean(gainNode);
  }, []);

  const ensureRadioVolumeControl = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const normalizedVolume = clampMediaVolume(volumeRef.current);
    if (setNativeMediaVolume(audio, normalizedVolume)) {
      setVolumeControlFallback(false);
      return;
    }

    try {
      const AudioContextConstructor = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) {
        setVolumeControlFallback(true);
        return;
      }

      let audioContext = audioContextRef.current;
      let gainNode = audioGainNodeRef.current;
      if (!audioContext || !gainNode) {
        audioContext = new AudioContextConstructor();
        const sourceNode = audioContext.createMediaElementSource(audio);
        gainNode = audioContext.createGain();
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        audioContextRef.current = audioContext;
        audioSourceNodeRef.current = sourceNode;
        audioGainNodeRef.current = gainNode;
      }

      gainNode.gain.setValueAtTime(normalizedVolume, audioContext.currentTime);
      if (audioContext.state === "suspended") await audioContext.resume();
      setVolumeControlFallback(false);
    } catch (error) {
      console.warn("[listen-bar] mobile volume gain unavailable", error);
      setVolumeControlFallback(true);
    }
  }, []);

  useEffect(() => () => {
    audioSourceNodeRef.current?.disconnect();
    audioGainNodeRef.current?.disconnect();
    const audioContext = audioContextRef.current;
    if (audioContext && audioContext.state !== "closed") void audioContext.close();
  }, []);

  const logSongPlaybackEvent = useCallback((
    eventType: "song_play" | "song_finish" | "song_skip" | "song_pause" | "song_resume",
    track: ListenBarTrack,
    metadata: Record<string, unknown> = {},
  ) => {
    if (!track.audioUrl || !isUuid(track.id)) return;
    void logAnalyticsEvent({
      eventType,
      songId: track.id,
      pagePath: "/listen-bar",
      source: "bar_heartbreak",
      metadata: {
        title: track.title,
        artist: track.artist,
        genre: track.genre,
        trackSource: track.source,
        barPhase: track.barPhase,
        durationSeconds: track.duration,
        ...metadata,
      },
    });
  }, []);
  const closePlaybackSegment = useCallback((eventType: "song_pause" | "song_finish" | "song_skip", audio?: HTMLAudioElement | null) => {
    const segment = playbackSegmentRef.current;
    const track = nowTrackRef.current;
    if (!segment || segment.trackId !== track.id) return;
    const wallClockSeconds = Math.max(0, Math.round((Date.now() - segment.startedAtMs) / 1000));
    const mediaSeconds = audio ? Math.max(0, Math.round(audio.currentTime - segment.startedAtSecond)) : wallClockSeconds;
    const playedSeconds = Math.max(0, Math.min(Math.max(wallClockSeconds, mediaSeconds), Math.max(1, track.duration || wallClockSeconds || 1)));
    playbackSegmentRef.current = null;
    logSongPlaybackEvent(eventType, track, {
      playedSeconds,
      currentTime: audio ? Math.round(audio.currentTime) : null,
      progressPercent: Math.round((playedSeconds / Math.max(1, track.duration || playedSeconds || 1)) * 100),
    });
  }, [logSongPlaybackEvent]);
  const syncElapsedFromAudio = useCallback((audio: HTMLAudioElement, force = false) => {
    const nextSecond = Math.floor(audio.currentTime);
    if (!force && nextSecond === lastElapsedPaintRef.current) return;
    lastElapsedPaintRef.current = nextSecond;
    setElapsed(audio.currentTime);
  }, []);
  const markPriorityAirplayTrack = useCallback((trackId: string) => {
    if (!trackId) return;
    setPriorityAirplayIds((ids) => {
      if (ids.has(trackId)) return ids;
      const nextIds = new Set(ids);
      nextIds.add(trackId);
      return nextIds;
    });
  }, []);
  const allRotationTracks = useMemo(() => {
    const seen = new Set<string>();
    return officialTracks.filter((track) => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });
  }, [officialTracks]);
  const allCommunityTracks = useMemo(
    () => allRotationTracks.filter((track) => track.source === "community"),
    [allRotationTracks],
  );
  const genrePoolStats = useMemo(() => {
    const stats = new Map<string, { total: number; public: number }>();
    for (const genre of LISTEN_BAR_GENRES) stats.set(genre.value, { total: 0, public: 0 });
    for (const track of allCommunityTracks) {
      const key = track.genre?.trim() || "Original 自我風格";
      const item = stats.get(key) ?? { total: 0, public: 0 };
      item.total += 1;
      if (track.barPhase === "public") item.public += 1;
      stats.set(key, item);
    }
    return stats;
  }, [allCommunityTracks]);
  const selectedGenreLabel = selectedPlaybackGenre === "all"
    ? barText(lang, "公播", "All", "すべて", "전체")
    : genreDisplayLabel(selectedPlaybackGenre, lang);
  const selectedGenreSlug = selectedPlaybackGenre === "all" ? "all" : (LISTEN_BAR_GENRE_SLUGS.get(selectedPlaybackGenre) ?? "all");
  const selectedGenreShareUrl = listenBarShortPath(selectedGenreSlug, lang);
  const barShareUrl = listenBarShortPath("all", lang);
  const selectedGenreShareTitle = selectedPlaybackGenre === "all"
    ? listenCopy.shareTitle
    : `${listenCopy.shareTitle} / ${selectedGenreLabel}`;
  const selectedGenreShareText = selectedPlaybackGenre === "all"
    ? listenCopy.shareText
    : barText(
        lang,
        `我正在 AIPOGER 傷心酒吧聽 ${selectedGenreLabel} 類型。進來聽這一類 AI 音樂公播。`,
        `I am listening to ${selectedGenreLabel} on AIPOGER Bar Heartbreak. Open this genre radio.`,
        `AIPOGER Bar Heartbreakで${selectedGenreLabel}を聴いています。このジャンルのAI音楽放送を開いてください。`,
        `AIPOGER Bar Heartbreak에서 ${selectedGenreLabel} 장르를 듣고 있어요. 이 AI 음악 방송을 열어 보세요.`,
      );
  const rotationTracks = useMemo(
    () => selectedPlaybackGenre === "all"
      ? allRotationTracks
      : allRotationTracks.filter((track) => track.genre?.trim() === selectedPlaybackGenre),
    [allRotationTracks, selectedPlaybackGenre],
  );
  const communityRequestTracks = useMemo(
    () => rotationTracks.filter((track) => track.source === "community"),
    [rotationTracks],
  );
  const totalCommunityTrackCount = allCommunityTracks.length;
  const publicPoolTracks = useMemo(
    () => allCommunityTracks.filter((track) => track.barPhase === "public"),
    [allCommunityTracks],
  );
  const survivalStartedAtByGenre = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const genre of LISTEN_BAR_GENRES) {
      map.set(genre.value, listenBarSurvivalStartedAt(allCommunityTracks, LISTEN_BAR_GENRE_POOL_LIMIT, genre.value));
    }
    return map;
  }, [allCommunityTracks]);
  const survivalStartedAt = useMemo(
    () => nowTrack.genre ? (survivalStartedAtByGenre.get(nowTrack.genre) ?? null) : null,
    [nowTrack.genre, survivalStartedAtByGenre],
  );
  const challengerTracks = useMemo(
    () => communityRequestTracks.filter((track) => track.barPhase !== "public"),
    [communityRequestTracks],
  );
  const challengerQueueTracks = useMemo(
    () => [...challengerTracks].sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()),
    [challengerTracks],
  );
  const challengerRankById = useMemo(
    () => new Map(challengerQueueTracks.map((track, index) => [track.id, index + 1])),
    [challengerQueueTracks],
  );
  const priorityAirplaySourceTracks = useMemo(
    () => communityRequestTracks.filter((track) => priorityAirplayIds.has(track.id)),
    [communityRequestTracks, priorityAirplayIds],
  );
  const priorityAirplayTracks = useMemo(
    () => getPriorityAirplayBatch(priorityAirplaySourceTracks, servedCommunityIdsRef.current, nowTrack.id),
    [nowTrack.id, priorityAirplaySourceTracks],
  );
  const nextCommunityTrack = priorityAirplayTracks[0] ?? null;
  const nextRotationTrack = useMemo(() => {
    const playableTracks = rotationTracks.filter((track) => track.audioUrl && track.id !== nowTrack.id);
    if (playableTracks.length === 0) return null;
    const currentIndex = rotationTracks.findIndex((track) => track.id === nowTrack.id);
    if (currentIndex >= 0) {
      for (let step = 1; step <= rotationTracks.length; step += 1) {
        const candidate = rotationTracks[(currentIndex + step) % rotationTracks.length];
        if (candidate?.audioUrl && candidate.id !== nowTrack.id) return candidate;
      }
    }
    return playableTracks[0];
  }, [nowTrack.id, rotationTracks]);
  const upcomingHeartbreakerTracks = useMemo(() => {
    const seen = new Set<string>([nowTrack.id]);
    const upcoming: ListenBarTrack[] = [];
    const pushTrack = (track: ListenBarTrack | null) => {
      if (!track?.audioUrl || seen.has(track.id) || upcoming.length >= 6) return;
      seen.add(track.id);
      upcoming.push(track);
    };

    pushTrack(nextCommunityTrack);
    pushTrack(nextRotationTrack);

    const currentIndex = rotationTracks.findIndex((track) => track.id === nowTrack.id);
    if (currentIndex >= 0) {
      for (let step = 1; step <= rotationTracks.length && upcoming.length < 6; step += 1) {
        pushTrack(rotationTracks[(currentIndex + step) % rotationTracks.length] ?? null);
      }
    }

    rotationTracks.forEach(pushTrack);
    return upcoming;
  }, [nextCommunityTrack, nextRotationTrack, nowTrack.id, rotationTracks]);
  const myChallengerStats = useMemo(
    () => myBroadcastStats.filter((track) => track.barPhase === "challenger"),
    [myBroadcastStats],
  );
  const myPublicStats = useMemo(
    () => myBroadcastStats.filter((track) => track.barPhase === "public"),
    [myBroadcastStats],
  );
  const uploadGenre = publicUploadForm.genre.trim();
  const uploadGenreStats = uploadGenre ? (genrePoolStats.get(uploadGenre) ?? { total: 0, public: 0 }) : { total: 0, public: 0 };
  const uploadSubmissionPhase = listenBarSubmissionPhaseForGenrePublicCount(uploadGenreStats.public);
  const uploadWillEnterChallenger = Boolean(uploadGenre) && uploadSubmissionPhase === "challenger";
  const myPublicStatsForUploadGenre = useMemo(
    () => uploadGenre ? myBroadcastStats.filter((track) => track.barPhase === "public" && track.genre === uploadGenre) : [],
    [myBroadcastStats, uploadGenre],
  );
  const myChallengerStatsForUploadGenre = useMemo(
    () => uploadGenre ? myBroadcastStats.filter((track) => track.barPhase === "challenger" && track.genre === uploadGenre) : [],
    [myBroadcastStats, uploadGenre],
  );
  const challengerSlotLimit = useMemo(
    () => listenBarChallengerSlotLimitForPublicCount(myPublicStatsForUploadGenre.length),
    [myPublicStatsForUploadGenre.length],
  );
  const challengerSlotsFull = uploadWillEnterChallenger && myChallengerStatsForUploadGenre.length >= challengerSlotLimit;
  const creatorGenrePublicLimitFull = Boolean(uploadGenre)
    && listenBarCreatorGenrePublicLimitReached(myPublicStatsForUploadGenre.length);
  const todayTaipeiKey = taipeiDayKey(Date.now());
  const myUploadsTodayAfterLimitStart = useMemo(
    () => myBroadcastStats.filter((track) => {
      const createdAtMs = new Date(track.createdAt ?? "").getTime();
      if (!Number.isFinite(createdAtMs) || createdAtMs < listenBarUploadLimitStartedAtMs) return false;
      return taipeiDayKey(createdAtMs) === todayTaipeiKey;
    }).length,
    [myBroadcastStats, todayTaipeiKey],
  );
  const creatorDailyUploadLimitFull = listenBarCreatorDailyUploadLimitReached(myPublicStats.length, myUploadsTodayAfterLimitStart);
  const publicUploadBlocked = creatorGenrePublicLimitFull || creatorDailyUploadLimitFull || challengerSlotsFull;
  const displayedChallengerSlotCount = uploadGenre ? myChallengerStatsForUploadGenre.length : challengerSlotCount;
  const uploadGenreRemainingPublicSlots = Math.max(0, LISTEN_BAR_GENRE_POOL_LIMIT - uploadGenreStats.public);
  const uploadGenreDisplayName = uploadGenre ? genreDisplayLabel(uploadGenre, lang) : "";
  const uploadPhaseNoticeTitle = creatorGenrePublicLimitFull
      ? (isZh ? "此類公播已嚴重超標" : "Genre Public Limit Exceeded")
      : creatorDailyUploadLimitFull
        ? (isZh ? "今日上傳額度已滿" : "Daily Upload Limit Reached")
    : uploadWillEnterChallenger
      ? challengerSlotsFull
        ? (isZh ? "此類 Challenger 席位已滿" : "Challenger Seats Full")
        : (isZh ? "送出後進 Challenger" : "Uploads to Challenger")
      : (isZh ? "送出後直接進公播" : "Uploads Straight to Public");
  const uploadPhaseNoticeBody = creatorGenrePublicLimitFull
      ? (isZh
        ? `你在 ${uploadGenreDisplayName} 公播池已有 ${myPublicStatsForUploadGenre.length}/${LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT} 首，已超過同類公播上限。這個種類必須先降到 4 首公播以下，才可以再傳第 5 首。`
        : `You already have ${myPublicStatsForUploadGenre.length}/${LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT} public tracks in ${uploadGenreDisplayName}. This genre must be reduced to 4 public tracks before you can upload the 5th again.`)
      : creatorDailyUploadLimitFull
        ? (isZh
          ? `你的公播歌曲已達 ${myPublicStats.length}/${LISTEN_BAR_CREATOR_TOTAL_PUBLIC_DAILY_LIMIT_THRESHOLD} 首；新規生效後每天最多成功上傳 ${LISTEN_BAR_CREATOR_DAILY_UPLOAD_LIMIT_AFTER_TOTAL_PUBLIC} 首。今天已用完，明天再傳，或先撤下一首公播歌曲讓總數低於 ${LISTEN_BAR_CREATOR_TOTAL_PUBLIC_DAILY_LIMIT_THRESHOLD}。`
          : `You have ${myPublicStats.length}/${LISTEN_BAR_CREATOR_TOTAL_PUBLIC_DAILY_LIMIT_THRESHOLD} public tracks. After the new rule, creators at this level can upload ${LISTEN_BAR_CREATOR_DAILY_UPLOAD_LIMIT_AFTER_TOTAL_PUBLIC} track per day. Try tomorrow, or remove one public track to go below ${LISTEN_BAR_CREATOR_TOTAL_PUBLIC_DAILY_LIMIT_THRESHOLD}.`)
    : uploadWillEnterChallenger
      ? (isZh
        ? `${uploadGenreDisplayName} 已滿 ${uploadGenreStats.public}/${LISTEN_BAR_GENRE_POOL_LIMIT}。這首會先進同類 Challenger；你的同類 Challenger ${myChallengerStatsForUploadGenre.length}/${challengerSlotLimit}。`
        : `${uploadGenreDisplayName} is full at ${uploadGenreStats.public}/${LISTEN_BAR_GENRE_POOL_LIMIT}. This song enters same-genre Challenger first; your same-genre Challenger seats are ${myChallengerStatsForUploadGenre.length}/${challengerSlotLimit}.`)
      : (isZh
        ? `${uploadGenreDisplayName} 目前 ${uploadGenreStats.public}/${LISTEN_BAR_GENRE_POOL_LIMIT}，還有 ${uploadGenreRemainingPublicSlots} 個公播位。這首會加入該類輪播。`
        : `${uploadGenreDisplayName} is at ${uploadGenreStats.public}/${LISTEN_BAR_GENRE_POOL_LIMIT}, with ${uploadGenreRemainingPublicSlots} public slots left. This song joins that genre rotation.`);
  const challengerSlotsFullMessage = isZh
    ? `你的 ${uploadGenre || "此類型"} 公播池已有 ${myPublicStatsForUploadGenre.length} 首，現在 Challenger 上限是 ${challengerSlotLimit} 首。要再上傳，請先撤下一首同類 Challenger，或等同類公播池釋出空間。`
    : `You have ${myPublicStatsForUploadGenre.length} public tracks in ${uploadGenre || "this genre"}, so your Challenger limit is ${challengerSlotLimit}. Remove one same-genre Challenger, or wait for room in that genre.`;
  const creatorGenrePublicLimitMessage = isZh
    ? `你在 ${uploadGenre || "此類型"} 公播池已有 ${myPublicStatsForUploadGenre.length}/${LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT} 首，已超過同類公播上限。這個種類必須先降到 4 首公播以下，才可以再傳第 5 首。`
    : `You already have ${myPublicStatsForUploadGenre.length}/${LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT} public tracks in ${uploadGenre || "this genre"}. This genre must be reduced to 4 public tracks before you can upload the 5th again.`;
  const creatorDailyUploadLimitMessage = isZh
    ? `你的公播歌曲已達 ${myPublicStats.length}/${LISTEN_BAR_CREATOR_TOTAL_PUBLIC_DAILY_LIMIT_THRESHOLD} 首，新規生效後每天最多成功上傳 ${LISTEN_BAR_CREATOR_DAILY_UPLOAD_LIMIT_AFTER_TOTAL_PUBLIC} 首。今天已用完，明天再傳，或先撤下一首公播歌曲。`
    : `You have ${myPublicStats.length}/${LISTEN_BAR_CREATOR_TOTAL_PUBLIC_DAILY_LIMIT_THRESHOLD} public tracks. After the new rule, creators at this level can upload ${LISTEN_BAR_CREATOR_DAILY_UPLOAD_LIMIT_AFTER_TOTAL_PUBLIC} track per day. Try tomorrow, or remove one public track.`;
  const publicUploadBlockedMessage = creatorGenrePublicLimitFull
    ? creatorGenrePublicLimitMessage
    : creatorDailyUploadLimitFull
      ? creatorDailyUploadLimitMessage
      : challengerSlotsFull
        ? challengerSlotsFullMessage
        : "";

  useEffect(() => {
    window.dispatchEvent(new Event(STOP_HOME_BGM_EVENT));
    void logAnalyticsEvent({
      eventType: "open_heartbreak_bar",
      pagePath: "/listen-bar",
      source: "bar_heartbreak",
    });
  }, []);

  useEffect(() => {
    const syncListenBarUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      const requestedGenre = params.get("genre")?.trim() ?? "";
      if (requestedGenre === "all") {
        setSelectedPlaybackGenre("all");
      } else if (LISTEN_BAR_GENRES.some((genre) => genre.value === requestedGenre)) {
        setSelectedPlaybackGenre(requestedGenre);
      }
    };
    syncListenBarUrlState();
    window.addEventListener("popstate", syncListenBarUrlState);
    return () => window.removeEventListener("popstate", syncListenBarUrlState);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadBattleTicker = async () => {
      const { data, error } = await supabase
        .from("battle_queue")
        .select("id, fighter_name, original_file_name, genre, ai_tool, status, match_group_id, expires_at, public_vote_score, created_at")
        .in("status", ["waiting_challenge", "public_voting", "ghost_battle"])
        .order("created_at", { ascending: false })
        .limit(8);

      if (!mounted) return;
      if (error) {
        console.error("[listen bar battle ticker]", error);
        setBattleTickerMessages([]);
        return;
      }

      setBattleTickerMessages(
        ((data as BattleTickerRow[]) ?? [])
          .filter((row) => row.id && row.status)
          .filter((row) => !shouldExpireOpenDropQueue({
            status: row.status,
            expires_at: row.expires_at ?? null,
            scheduled_start_at: row.scheduled_start_at ?? null,
            cancellation_evaluation_at: row.cancellation_evaluation_at ?? null,
          }))
          .map((row) => battleTickerMessage(row, isZh)),
      );
    };

    void loadBattleTicker();
    const interval = window.setInterval(loadBattleTicker, 60 * 1000);
    const channel = supabase
      .channel("listen-bar-battle-ticker")
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_queue" }, () => {
        void loadBattleTicker();
      })
      .subscribe();

    return () => {
      mounted = false;
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [isZh]);

  useEffect(() => {
    rotationTracksRef.current = rotationTracks;
  }, [rotationTracks]);

  useEffect(() => {
    if (rotationTracks.length === 0) {
      setNowTrack(EMPTY_LISTEN_BAR_TRACK);
      return;
    }
    if (rotationTracks.some((track) => track.id === nowTrack.id)) return;
    const nextTrack = rotationTracks.find((track) => track.audioUrl) ?? rotationTracks[0];
    startTrackAtZeroRef.current = true;
    liveRadioSyncEnabledRef.current = false;
    localOverrideTrackIdRef.current = nextTrack.id;
    liveSeekRef.current = { trackId: nextTrack.id, offset: 0 };
    setElapsed(0);
    setNowTrack(nextTrack);
  }, [nowTrack.id, rotationTracks]);

  useEffect(() => {
    nowTrackRef.current = nowTrack;
  }, [nowTrack]);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      const fighterName = user?.id ? await loadFighterNameFromProfile(user.id) : null;
      const uploadName = fighterName?.trim() ?? "";
      setUserName(uploadName || userDisplayName(user));
      setCreatorDefaultName(uploadName);
      setUserId(user?.id ?? null);
      setVisitorAvatarUrl(userAvatarUrl(user));
      if (user?.id) {
        const token = data.session?.access_token ?? "";
        const [myTracksResult, fighterAvatarResult, userAvatarResult] = await Promise.all([
          fetch("/api/listen-bar/my-tracks", {
            cache: "no-store",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then(async (response) => ({
            ok: response.ok,
            payload: await response.json().catch(() => null) as MyTracksPayload | null,
          })).catch((error): { ok: false; payload: MyTracksPayload } => ({ ok: false, payload: { error: String(error) } })),
          supabase
            .from("fighter_profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("user_profiles")
            .select("avatar_url")
            .eq("id", user.id)
            .maybeSingle(),
        ]);
        const fighterAvatar = typeof fighterAvatarResult.data?.avatar_url === "string" ? fighterAvatarResult.data.avatar_url.trim() : "";
        const profileAvatar = typeof userAvatarResult.data?.avatar_url === "string" ? userAvatarResult.data.avatar_url.trim() : "";
        setVisitorAvatarUrl(fighterAvatar || profileAvatar || userAvatarUrl(user));
        if (myTracksResult.ok) {
          const rows = myTracksResult.payload?.tracks ?? [];
          setChallengerSlotCount(myTracksResult.payload?.challengerCount ?? rows.filter((row) => row.bar_phase !== "public").length);
          setMyBroadcastStats(rows.map(listenBarRowToMyBroadcastStat));
        } else {
          console.warn("[listen-bar] my tracks", myTracksResult.payload?.error || "load failed");
          setMyBroadcastStats([]);
          setChallengerSlotCount(0);
        }
      } else {
        setMyBroadcastStats([]);
        setChallengerSlotCount(0);
      }
    };
    void loadUser();

    LISTEN_BAR_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadMessages = async () => {
      const response = await fetch("/api/listen-bar/messages", {
        cache: "no-store",
      }).catch((error) => ({ ok: false, json: async () => ({ error: String(error) }) }) as Response);

      if (!mounted) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        console.warn("[listen-bar] messages", payload?.error || "load failed");
        return;
      }
      const payload = await response.json().catch(() => null) as { messages?: StoredBarMessageRow[] } | null;

      const rows = (payload?.messages ?? [])
        .map(storedBarMessageRowToChat)
        .filter((message): message is ChatMessage => message !== null)
        .map((message) => localizeListenBarMessage(message, isZh));
      setMessages(rows);
    };

    const loadPlaylist = async () => {
      const response = await fetch("/api/listen-bar/tracks", {
        cache: "no-store",
      }).catch((error) => ({ ok: false, json: async () => ({ error: String(error) }) }) as Response);

      if (!mounted) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        console.warn("[listen-bar] playlist", payload?.error || "load failed");
        setOfficialTracks(fallbackOfficialPlaylist);
        setNowTrack((current) => (current.audioUrl ? current : EMPTY_LISTEN_BAR_TRACK));
        setPlaylistStatus("fallback");
        return;
      }

      const payload = await response.json().catch(() => null) as { tracks?: ListenBarTrackRow[] } | null;
      const rows = payload?.tracks ?? [];
      const community = rows
        .filter((row) => !row.is_featured_official && row.source !== "official")
        .slice(0, LISTEN_BAR_TOTAL_ROTATION_LIMIT)
        .map(listenBarRowToTrack)
        .filter((track): track is ListenBarTrack => track !== null);
      const tracks = community;
      const persistedCounts = rows.reduce<Record<string, ReactionCounts>>((acc, row) => {
        acc[row.id] = {
          heart: Math.max(0, row.heart_count ?? 0),
          star: Math.max(0, row.star_count ?? 0),
          thumb: Math.max(0, row.thumb_count ?? 0),
          happy: Math.max(0, row.happy_count ?? 0),
        };
        return acc;
      }, {});
      setReactionCounts((current) => ({ ...persistedCounts, ...current }));

      if (tracks.length === 0) {
        setOfficialTracks(fallbackOfficialPlaylist);
        setNowTrack(EMPTY_LISTEN_BAR_TRACK);
        setPlaylistStatus("fallback");
        return;
      }

      setOfficialTracks(tracks);
      setNowTrack((current) => {
        if (current.audioUrl && tracks.some((track) => track.id === current.id)) return current;
        const livePosition = liveRadioSyncEnabledRef.current ? getLiveRadioPosition(tracks) : null;
        if (livePosition) liveSeekRef.current = { trackId: livePosition.track.id, offset: livePosition.offset };
        return livePosition?.track ?? pickRandomTrack(tracks) ?? tracks[0];
      });
      setPlaylistStatus("database");
    };

    void loadMessages();
    void loadPlaylist();
    const playlistRefreshTimer = window.setInterval(() => {
      void loadPlaylist();
    }, 15_000);
    return () => {
      mounted = false;
      window.clearInterval(playlistRefreshTimer);
    };
  }, [isZh]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    const frame = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    setTrackCommentError("");
    setTrackComments([]);

    const loadTrackComments = async () => {
      if (!isUuid(nowTrack.id)) {
        setTrackComments([]);
        return;
      }

      const response = await fetch(`/api/listen-bar/track-comments?trackId=${encodeURIComponent(nowTrack.id)}`, {
        cache: "no-store",
      }).catch((error) => ({ ok: false, json: async () => ({ error: String(error) }) }) as Response);

      if (!mounted) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        setTrackCommentError(payload?.error || (isZh ? "歌曲評論讀取失敗。" : "Could not load track comments."));
        return;
      }
      const payload = await response.json().catch(() => null) as { comments?: StoredTrackCommentRow[] } | null;

      const rows = (payload?.comments ?? [])
        .map(storedTrackCommentRowToComment)
        .filter((comment): comment is TrackComment => comment !== null)
        .slice(-24);
      setTrackComments(rows);
    };

    void loadTrackComments();

    return () => {
      mounted = false;
    };
  }, [isZh, nowTrack.id]);

  useEffect(() => {
    if (creatorDefaultName) {
      setPublicUploadForm((current) => ({
        ...current,
        artist: current.artist || limitListenBarDisplayText(creatorDefaultName, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
      }));
    }
  }, [creatorDefaultName]);

  useEffect(() => {
    if (!userId || allRotationTracks.length === 0) {
      setMyReactions({});
      return;
    }

    let mounted = true;
    const loadMyReactions = async () => {
      const trackIds = allRotationTracks.map((track) => track.id).slice(0, LISTEN_BAR_TOTAL_ROTATION_LIMIT);
      const today = taipeiVoteDate();
      const { data, error } = await supabase
        .from("listen_bar_track_reactions")
        .select("track_id, reaction")
        .eq("user_id", userId)
        .eq("reaction", "heart")
        .eq("vote_date", today)
        .in("track_id", trackIds);

      if (!mounted) return;
      if (error) {
        console.warn("[listen-bar] my reactions", error);
        return;
      }

      const nextReactions = (data as Array<{ track_id?: string | null; reaction?: ReactionKey | null }> | null) ?? [];
      const reactions = nextReactions.reduce<Record<string, ReactionKey | null>>((acc, row) => {
        if (row.track_id && row.reaction === "heart") acc[row.track_id] = row.reaction;
        return acc;
      }, {});
      setMyReactions(reactions);
    };

    void loadMyReactions();
    return () => {
      mounted = false;
    };
  }, [allRotationTracks, userId]);

  useEffect(() => {
    const channel = supabase
      .channel("aipoger-listen-bar-sync", {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "chat" }, (payload) => {
        const rawMessage = (payload.payload as { message?: ChatMessage }).message;
        const message = rawMessage ? localizeListenBarMessage(rawMessage, isZh) : null;
        if (!message?.id || !message.text) return;
        setMessages((items) => (items.some((item) => item.id === message.id) ? items : [...items, message].slice(-LISTEN_BAR_MESSAGE_LIMIT)));
      })
      .on("broadcast", { event: "reaction" }, (payload) => {
        const data = payload.payload as { trackId?: string; previous?: ReactionKey | null; next?: ReactionKey | null };
        if (!data.trackId) return;
        setReactionCounts((allCounts) => {
          const counts = { ...emptyReactions, ...(allCounts[data.trackId!] ?? {}) };
          if (data.previous) counts[data.previous] = Math.max(0, counts[data.previous] - 1);
          if (data.next) counts[data.next] += 1;
          return { ...allCounts, [data.trackId!]: counts };
        });
      })
      .on("broadcast", { event: "track-uploaded" }, (payload) => {
        const track = (payload.payload as { track?: ListenBarTrack }).track;
        if (!track?.id || track.source !== "community" || !track.audioUrl) return;
        servedCommunityIdsRef.current.delete(track.id);
        if (nowTrackRef.current.audioUrl) {
          markPriorityAirplayTrack(track.id);
        } else {
          startTrackAtZeroRef.current = true;
          liveRadioSyncEnabledRef.current = false;
          localOverrideTrackIdRef.current = track.id;
          liveSeekRef.current = { trackId: track.id, offset: 0 };
          setElapsed(0);
          setNowTrack(track);
        }
        setOfficialTracks((tracks) => {
          if (tracks.some((item) => item.id === track.id)) return tracks;
          return [...tracks, track];
        });
        setReactionCounts((counts) => counts[track.id] ? counts : { ...counts, [track.id]: { ...emptyReactions } });
      })
      .subscribe();
    listenBarSyncChannelRef.current = channel;
    return () => {
      listenBarSyncChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [isZh, markPriorityAirplayTrack]);

  const playNext = useCallback(() => {
    setHistory((items) => [nowTrack, ...items].slice(0, 8));
    if (localOverrideTrackIdRef.current === nowTrack.id) {
      localOverrideTrackIdRef.current = null;
      liveRadioSyncEnabledRef.current = true;
    }

    const queuedRequest = getPriorityAirplayBatch(priorityAirplaySourceTracks, servedCommunityIdsRef.current, nowTrack.id)[0] ?? null;
    if (queuedRequest) {
      servedCommunityIdsRef.current.add(queuedRequest.id);
      startTrackAtZeroRef.current = true;
      liveRadioSyncEnabledRef.current = false;
      localOverrideTrackIdRef.current = queuedRequest.id;
      liveSeekRef.current = { trackId: queuedRequest.id, offset: 0 };
      setElapsed(0);
      setNowTrack(queuedRequest);
      return;
    }

    const playableTracks = rotationTracks.filter((track) => track.audioUrl);
    if (playableTracks.length === 0) {
      setElapsed(0);
      return;
    }

    const currentIndex = rotationTracks.findIndex((track) => track.id === nowTrack.id);
    const nextTrack =
      currentIndex >= 0
        ? Array.from({ length: rotationTracks.length }, (_, index) => rotationTracks[(currentIndex + index + 1) % rotationTracks.length])
            .find((track) => track?.audioUrl)
        : playableTracks[0];

    if (!nextTrack) {
      setElapsed(0);
      return;
    }

    startTrackAtZeroRef.current = true;
    liveRadioSyncEnabledRef.current = false;
    localOverrideTrackIdRef.current = nextTrack.id;
    liveSeekRef.current = { trackId: nextTrack.id, offset: 0 };
    setElapsed(0);
    if (nextTrack.id === nowTrack.id) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      audio.muted = false;
      applyRadioVolume(audio, volumeRef.current);
      void audio.play()
        .then(() => {
          setPlaybackBlocked(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setPlaybackBlocked(true);
          setIsPlaying(false);
        });
      return;
    }
    setNowTrack(nextTrack);
  }, [applyRadioVolume, nowTrack, priorityAirplaySourceTracks, rotationTracks]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => closePlaybackSegment("song_skip", audio);
  }, [closePlaybackSegment]);

  useEffect(() => {
    const forceStart = startTrackAtZeroRef.current;
    const livePosition = forceStart || !liveRadioSyncEnabledRef.current ? null : getLiveRadioPosition(rotationTracksRef.current);
    const liveOffset = forceStart
      ? 0
      : livePosition?.track.id === nowTrack.id
        ? livePosition.offset
        : liveSeekRef.current?.trackId === nowTrack.id
          ? liveSeekRef.current.offset
          : 0;
    if (forceStart) startTrackAtZeroRef.current = false;
    liveSeekRef.current = { trackId: nowTrack.id, offset: liveOffset };
    setElapsed(liveOffset);
    setTrackDuration(nowTrack.duration);
  }, [nowTrack]);

  useEffect(() => {
    if (nowTrack.audioUrl) return;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setPlaybackBlocked(false);
    setIsPlaying(false);
  }, [nowTrack.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !nowTrack.audioUrl) return;
    const applyLiveSeek = () => {
      const livePosition = !liveRadioSyncEnabledRef.current ? null : getLiveRadioPosition(rotationTracksRef.current);
      const offset = livePosition?.track.id === nowTrack.id
        ? livePosition.offset
        : liveSeekRef.current?.trackId === nowTrack.id
          ? liveSeekRef.current.offset
          : 0;
      const safeDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : nowTrack.duration;
      audio.currentTime = Math.min(Math.max(0, offset), Math.max(0, safeDuration - 0.25));
      setElapsed(audio.currentTime);
    };
    audio.addEventListener("loadedmetadata", applyLiveSeek, { once: true });
    audio.load();
    audio.muted = false;
    applyRadioVolume(audio, volumeRef.current);
    radioShouldResumeRef.current = true;
    void audio.play()
      .then(() => {
        setPlaybackBlocked(false);
        setIsPlaying(true);
      })
      .catch(() => {
        setPlaybackBlocked(true);
        setIsPlaying(false);
      });
    return () => {
      audio.removeEventListener("loadedmetadata", applyLiveSeek);
    };
  }, [applyRadioVolume, nowTrack.audioUrl, nowTrack.duration, nowTrack.id]);

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) applyRadioVolume(audioRef.current, volume);
  }, [applyRadioVolume, volume]);

  const resumeRadioPlayback = useCallback((syncLivePosition = false, volumeOverride?: number) => {
    const audio = audioRef.current;
    if (!audio || !nowTrack.audioUrl) return;
    radioShouldResumeRef.current = true;
    audio.muted = false;
    applyRadioVolume(audio, volumeOverride ?? volume);
    const audioContext = audioContextRef.current;
    if (audioContext?.state === "suspended") void audioContext.resume();
    if (syncLivePosition && audio.readyState >= 1) {
      const livePosition = !liveRadioSyncEnabledRef.current ? null : getLiveRadioPosition(rotationTracksRef.current);
      const offset = livePosition?.track.id === nowTrack.id
        ? livePosition.offset
        : liveSeekRef.current?.trackId === nowTrack.id
          ? liveSeekRef.current.offset
          : audio.currentTime;
      const safeDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : nowTrack.duration;
      audio.currentTime = Math.min(Math.max(0, offset), Math.max(0, safeDuration - 0.25));
      setElapsed(audio.currentTime);
    }
    void audio.play()
      .then(() => {
        setPlaybackBlocked(false);
        setIsPlaying(true);
      })
      .catch(() => {
        setPlaybackBlocked(true);
        setIsPlaying(false);
      });
  }, [applyRadioVolume, nowTrack.audioUrl, nowTrack.duration, nowTrack.id, volume]);

  useEffect(() => {
    if (!playbackBlocked) return;
    const resumeOnGesture = () => resumeRadioPlayback(false);
    window.addEventListener("pointerdown", resumeOnGesture, { once: true });
    window.addEventListener("keydown", resumeOnGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resumeOnGesture);
      window.removeEventListener("keydown", resumeOnGesture);
    };
  }, [playbackBlocked, resumeRadioPlayback]);

  useEffect(() => {
    const rememberResumeState = () => {
      const audio = audioRef.current;
      radioShouldResumeRef.current = !audio || !audio.paused || isPlaying;
    };
    const resumeIfVisible = () => {
      if (document.visibilityState === "hidden") {
        rememberResumeState();
        return;
      }
      if (radioShouldResumeRef.current) {
        window.setTimeout(() => resumeRadioPlayback(false), 140);
      }
    };
    const onPageHide = () => rememberResumeState();
    document.addEventListener("visibilitychange", resumeIfVisible);
    window.addEventListener("focus", resumeIfVisible);
    window.addEventListener("pageshow", resumeIfVisible);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", resumeIfVisible);
      window.removeEventListener("focus", resumeIfVisible);
      window.removeEventListener("pageshow", resumeIfVisible);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [isPlaying, resumeRadioPlayback]);

  useEffect(() => {
    if (!isPlaying || nowTrack.audioUrl) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => {
        if (value + 1 >= trackDuration) {
          window.clearInterval(timer);
          playNext();
          return 0;
        }
        return value + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, nowTrack, playNext, trackDuration]);

  const progress = Math.min(100, (elapsed / Math.max(1, trackDuration)) * 100);
  const radioStatusLine = useMemo(() => {
    if (playlistStatus === "loading") return barText(lang, "電台正在接上訊號...", "Tuning the Station Signal...", "放送信号に接続しています…", "방송 신호에 연결하는 중…");
    if (nextCommunityTrack) {
      return barText(lang, "插播已排入，下一首上場。", "Creator Track Queued. Next up.", "投稿曲をキューに追加しました。次に再生します。", "업로드 곡이 대기열에 추가되었습니다. 다음 곡으로 재생합니다.");
    }
    return playlistStatus === "database"
      ? ""
      : barText(lang, "公播準備中。", "Station Warming Up.", "放送準備中です。", "방송 준비 중입니다.");
  }, [lang, nextCommunityTrack, playlistStatus]);

  const localizedMessages = useMemo(
    () => messages.map((message) => localizeListenBarMessage(message, isZh)),
    [isZh, messages],
  );

  const tryStartRadio = () => {
    resumeRadioPlayback(false);
  };

  const currentReactions = reactionCounts[nowTrack.id] ?? emptyReactions;
  const nowTrackTitle = nowTrack.id === EMPTY_LISTEN_BAR_TRACK.id
    ? barText(lang, nowTrack.title, "Waiting for Creator Uploads", "クリエイターの投稿を待っています", "크리에이터 업로드를 기다리는 중")
    : nowTrack.title;
  const nowTrackTitleClass = nowPlayingTitleClass(nowTrackTitle);
  const currentHeartTotal = Math.max(0, currentReactions.heart ?? 0);
  const currentHeartSent = myReactions[nowTrack.id] === "heart";

  const handleReaction = (key: ReactionKey) => {
    tryStartRadio();
    if (!nowTrack.audioUrl) {
      setTrackCommentError(isZh ? "目前沒有播放中的歌曲。" : "No track is playing right now.");
      return;
    }
    if (!userId) {
      setTrackCommentError("");
      setAuthPromptOpen(true);
      return;
    }
    setTrackCommentError("");
    const previous = myReactions[nowTrack.id] ?? null;
    const next = previous === key ? null : key;

    setReactionCounts((allCounts) => {
      const counts = { ...emptyReactions, ...(allCounts[nowTrack.id] ?? {}) };
      if (previous) counts[previous] = Math.max(0, counts[previous] - 1);
      if (next) counts[next] += 1;
      return { ...allCounts, [nowTrack.id]: counts };
    });
    setMyReactions((items) => ({ ...items, [nowTrack.id]: next }));
    void listenBarSyncChannelRef.current?.send({
      type: "broadcast",
      event: "reaction",
      payload: { trackId: nowTrack.id, previous, next },
    });

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const visitorId = getListenBarVisitorId();
      const response = await fetch("/api/listen-bar/reaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AIPOGER-Visitor-Id": visitorId,
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({ trackId: nowTrack.id, reaction: next }),
      });
      const payload = await response.json().catch(() => null) as {
        counts?: ReactionCounts;
        positiveReactionCount?: number;
        reaction?: ReactionKey | null;
        error?: string;
      } | null;
      if (!response.ok || !payload?.counts) throw new Error(payload?.error || "Reaction failed.");
      void logAnalyticsEvent({
        eventType: next === "heart" ? "like" : "reaction",
        songId: isUuid(nowTrack.id) ? nowTrack.id : null,
        pagePath: "/listen-bar",
        source: "bar_heartbreak",
        metadata: {
          reaction: next,
          previousReaction: previous,
          title: nowTrack.title,
          artist: nowTrack.artist,
        },
      });
      setMyReactions((items) => ({ ...items, [nowTrack.id]: payload.reaction === "heart" ? "heart" : null }));
      setReactionCounts((allCounts) => ({ ...allCounts, [nowTrack.id]: payload.counts! }));
      setOfficialTracks((tracks) => tracks.map((track) => (
        track.id === nowTrack.id
          ? { ...track, positiveReactionCount: Math.max(0, payload.positiveReactionCount ?? 0) }
          : track
      )));
    })().catch((error) => {
      setReactionCounts((allCounts) => {
        const counts = { ...emptyReactions, ...(allCounts[nowTrack.id] ?? {}) };
        if (next) counts[next] = Math.max(0, counts[next] - 1);
        if (previous) counts[previous] += 1;
        return { ...allCounts, [nowTrack.id]: counts };
      });
      setMyReactions((items) => ({ ...items, [nowTrack.id]: previous }));
      console.warn("[listen-bar] reaction persist failed", error);
    });
  };

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatError("");
    if (!userId) {
      setChatError(isZh ? "請先登入再留言。" : "Sign in to leave a message.");
      return;
    }
    setChatInput("");
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/listen-bar/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          displayName: userName,
          text: text.slice(0, 240),
        }),
      }).catch((error) => ({ ok: false, json: async () => ({ error: String(error) }) }) as Response);
      const payload = await response.json().catch(() => null) as { message?: StoredBarMessageRow; error?: string } | null;
      const savedMessage = payload?.message ? storedBarMessageRowToChat(payload.message) : null;
      if (!response.ok || !savedMessage) {
        setChatInput(text);
        setChatError(payload?.error || (isZh ? "留言送出失敗，請稍後再試。" : "Message failed. Try again later."));
        console.warn("[listen-bar] chat insert failed", payload?.error || response.statusText);
        return;
      }
      const localizedMessage = localizeListenBarMessage(savedMessage, isZh);
      setMessages((items) => (items.some((item) => item.id === localizedMessage.id) ? items : [...items, localizedMessage].slice(-LISTEN_BAR_MESSAGE_LIMIT)));
      void listenBarSyncChannelRef.current?.send({
        type: "broadcast",
        event: "chat",
        payload: { message: localizedMessage },
      });
    })();
  };

  const handleTrackCommentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = trackCommentInput.trim();
    if (!text) return;
    setTrackCommentError("");
    if (!nowTrack.audioUrl) {
      setTrackCommentError(isZh ? "目前沒有播放中的歌曲。" : "No track is playing right now.");
      return;
    }
    if (!userId) {
      setTrackCommentError(isZh ? "請先登入再留下歌曲評論。" : "Sign in to comment on this song.");
      return;
    }
    setTrackCommentBusy(true);
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/listen-bar/track-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          trackId: nowTrack.id,
          displayName: userName,
          text: text.slice(0, 280),
        }),
      });
      const payload = await response.json().catch(() => null) as { comment?: StoredTrackCommentRow; error?: string } | null;

      setTrackCommentBusy(false);
      if (response.ok) {
        setTrackCommentInput("");
        const savedComment = payload?.comment ? storedTrackCommentRowToComment(payload.comment) : null;
        if (savedComment) {
          setTrackComments((items) => (items.some((item) => item.id === savedComment.id) ? items : [...items, savedComment].slice(-24)));
          void logAnalyticsEvent({
            eventType: "comment",
            songId: isUuid(nowTrack.id) ? nowTrack.id : null,
            pagePath: "/listen-bar",
            source: "bar_heartbreak",
            metadata: {
              commentType: "track",
              title: nowTrack.title,
              artist: nowTrack.artist,
            },
          });
        }
        return;
      }

      setTrackCommentError(payload?.error || (isZh ? "歌曲評論送出失敗，請稍後再試。" : "Track comment was not saved."));
    })();
  };

  const handlePublicAudioChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPublicUploadError("");
    if (!file) return;
    if (!isAllowedListenBarAudioFile(file)) {
      setPublicAudioFile(null);
      setPublicUploadError(isZh ? "請使用 MP3、M4A、AAC 或 OGG 音檔。" : "Use MP3, M4A, AAC, or OGG audio.");
      return;
    }
    if (file.size > LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES) {
      setPublicAudioFile(null);
      setPublicUploadError(
        isZh
          ? `音檔太大：${listenBarAudioSizeLabel(file)}。傷心酒吧新投稿上限是 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，請改用 MP3 / M4A / AAC / OGG 壓縮格式。`
          : `Audio file too large: ${listenBarAudioSizeLabel(file)}. New Bar Heartbreak submissions are capped at ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}; use MP3, M4A, AAC, or OGG.`,
      );
      return;
    }
    setPublicAudioFile(file);

    const metadata = await parseAudioMetadata(file);
    setPublicUploadForm((current) => ({
      ...current,
      title: current.title.trim() || metadata.title || metadata.fallbackTitle,
      artist: limitListenBarDisplayText(
        current.artist.trim() && current.artist !== userName ? current.artist : metadata.artist || current.artist,
        LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
      ),
      genre: current.genre.trim() ? current.genre : metadata.genre || current.genre,
      album: limitListenBarDisplayText(current.album.trim() || metadata.album || current.album, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
    }));

    if (metadata.cover && !publicCoverFile) {
      setPublicCoverFile(new File([metadata.cover.blob], metadata.cover.fileName, { type: metadata.cover.mimeType }));
    }
    if (metadata.lyrics && !publicLyricsText.trim()) {
      setPublicLyricsText(metadata.lyrics.slice(0, 12000));
    }
  };

  const handlePublicLyricsFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    try {
      setPublicLyricsText((await file.text()).slice(0, 12000));
    } catch (error) {
      console.warn("[listen-bar] lyric file read failed", error);
      setPublicUploadError(isZh ? "歌詞檔讀取失敗，請改用貼上文字。" : "Could not read lyric file. Paste the lyrics instead.");
    }
  };

  const handlePublicCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setPublicUploadError("");
    if (file && !isAllowedImageUploadFile(file)) {
      setPublicCoverFile(null);
      setPublicUploadError(t("avatar_invalid_type"));
      return;
    }
    setPublicCoverFile(file);
  };

  const uploadPublicAsset = async (bucket: string, file: File, contentTypeFallback: string) => {
    if (!userId) throw new Error(isZh ? "請先登入再投稿。" : "Sign in before submitting.");
    const path = `${userId}/community/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: contentTypeFallback,
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const uploadPublicAudioAsset = async (file: File) => {
    if (!userId) throw new Error(isZh ? "請先登入再投稿。" : "Sign in before submitting.");
    const path = `${userId}/community/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    await uploadListenBarAudioFile(
      LISTEN_BAR_AUDIO_BUCKET,
      path,
      file,
      listenBarAudioContentType(file),
      (percent) => {
        setPublicUploadMessage(isZh ? `音檔上傳中 ${percent}%` : `Uploading audio ${percent}%`);
      },
    );
    return path;
  };

  const cleanupPublicUploadAssets = async (paths: { audioPath: string | null; coverPath: string | null }) => {
    if (!paths.audioPath && !paths.coverPath) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch("/api/listen-bar/cleanup-upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(paths),
        });
        if (response.ok) return;
        console.warn("[listen-bar] server upload cleanup failed", await response.text().catch(() => response.statusText));
      }
    } catch (error) {
      console.warn("[listen-bar] server upload cleanup failed", error);
    }

    const cleanupTasks: Promise<unknown>[] = [];
    if (paths.audioPath) cleanupTasks.push(supabase.storage.from(LISTEN_BAR_AUDIO_BUCKET).remove([paths.audioPath]));
    if (paths.coverPath) cleanupTasks.push(supabase.storage.from(LISTEN_BAR_COVER_BUCKET).remove([paths.coverPath]));
    const results = await Promise.allSettled(cleanupTasks);
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.warn("[listen-bar] upload cleanup failed", result.reason);
      } else {
        const error = (result.value as { error?: unknown } | null)?.error;
        if (error) console.warn("[listen-bar] upload cleanup failed", error);
      }
    });
  };

  const handlePublicUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPublicUploadError("");
    setPublicUploadMessage("");
    if (!userId) {
      setPublicUploadError(isZh ? "請先登入後再投稿傷心酒吧 Bar Heartbreak。" : "Please sign in before submitting to Bar Heartbreak.");
      return;
    }
    if (!publicAudioFile) {
      return;
    }
    if (!publicUploadForm.title.trim()) {
      setPublicUploadError(isZh ? "請輸入歌曲名稱。" : "Enter a track title.");
      return;
    }
    if (!publicUploadForm.genre.trim()) {
      setPublicUploadError(t("listen_bar_genre_required"));
      return;
    }
    if (publicUploadBlocked) {
      setPublicUploadError(publicUploadBlockedMessage);
      return;
    }

    let normalizedYouTubeUrl: string | null = null;
    try {
      normalizedYouTubeUrl = normalizeYouTubeUrl(publicUploadForm.youtubeUrl);
    } catch (urlError) {
      setPublicUploadError(String((urlError as { message?: string })?.message ?? urlError));
      return;
    }

    setPublicUploadBusy(true);
    let audioPath: string | null = null;
    let coverPath: string | null = null;
    try {
      const audioSha256 = await sha256File(publicAudioFile);
      const duplicateCheck = await supabase
        .from("listen_bar_tracks")
        .select("id,title,artist")
        .eq("audio_sha256", audioSha256)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle<{ id: string; title: string | null; artist: string | null }>();
      if (duplicateCheck.error && !isMissingListenBarSubmissionColumn(duplicateCheck.error)) {
        throw duplicateCheck.error;
      }
      if (duplicateCheck.data?.id) {
        setPublicUploadError(
          isZh
            ? `這個音檔已經在傷心酒吧裡了：${duplicateCheck.data.title || "未命名歌曲"}。請換另一首歌上傳。`
            : `This exact audio file is already in Bar Heartbreak: ${duplicateCheck.data.title || "Untitled"}. Upload another track.`,
        );
        return;
      }

      const duration = await readAudioDuration(publicAudioFile);
      audioPath = await uploadPublicAudioAsset(publicAudioFile);
      coverPath = publicCoverFile
        ? await uploadPublicAsset(LISTEN_BAR_COVER_BUCKET, publicCoverFile, imageContentType(publicCoverFile))
        : null;

      const insertPayload = {
        title: publicUploadForm.title.trim(),
        artist: limitListenBarDisplayText(
          publicUploadForm.artist.trim() || creatorDefaultName || (isZh ? "創作者" : "Creator"),
          LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
        ),
        ai_tool: limitListenBarDisplayText(publicUploadForm.aiTool.trim() || "AI Music", LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
        genre: publicUploadForm.genre.trim(),
        mood: limitListenBarDisplayText(
          publicUploadForm.album.trim() || (isZh ? "創作者投稿" : "Creator Submission"),
          LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
        ),
        description: limitListenBarDisplayText(publicUploadForm.description.trim(), LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS) || null,
        youtube_url: normalizedYouTubeUrl,
        duration_seconds: duration > 0 ? duration : null,
        audio_path: audioPath,
        cover_path: coverPath,
        audio_sha256: audioSha256,
        lyrics: publicLyricsText.trim() || null,
        sort_order: 1000,
        is_active: true,
        source: "community",
        is_featured_official: false,
        bar_phase: uploadSubmissionPhase,
        created_by: userId,
      };

      let insertResult = await supabase
        .from("listen_bar_tracks")
        .insert(insertPayload)
        .select("*")
        .maybeSingle<ListenBarTrackRow>();
      if (insertResult.error && isMissingListenBarSubmissionColumn(insertResult.error)) {
        const fallbackPayload = { ...insertPayload };
        delete (fallbackPayload as Partial<typeof insertPayload>).audio_sha256;
        delete (fallbackPayload as Partial<typeof insertPayload>).bar_phase;
        delete (fallbackPayload as Partial<typeof insertPayload>).youtube_url;
        insertResult = await supabase
          .from("listen_bar_tracks")
          .insert(fallbackPayload)
          .select("*")
          .maybeSingle<ListenBarTrackRow>();

        if (insertResult.error && isMissingListenBarSubmissionColumn(insertResult.error)) {
          if (insertPayload.description) {
            throw new Error(missingListenBarDescriptionColumnMessage(isZh));
          }
          delete (fallbackPayload as Partial<typeof insertPayload>).description;
          insertResult = await supabase
            .from("listen_bar_tracks")
            .insert(fallbackPayload)
            .select("*")
            .maybeSingle<ListenBarTrackRow>();
        }
      }
      const { data: insertedTrackRow, error } = insertResult;
      if (error) throw error;

      const insertedTrack = insertedTrackRow ? listenBarRowToTrack(insertedTrackRow) : null;
      if (insertedTrack) {
        const normalizedTrack = {
          ...insertedTrack,
          barPhase: insertedTrack.barPhase ?? uploadSubmissionPhase,
        };
        void logAnalyticsEvent({
          eventType: "upload_song",
          songId: isUuid(normalizedTrack.id) ? normalizedTrack.id : null,
          pagePath: "/listen-bar",
          source: "bar_heartbreak",
          metadata: {
            title: normalizedTrack.title,
            artist: normalizedTrack.artist,
            genre: normalizedTrack.genre,
            durationSeconds: normalizedTrack.duration,
          },
        });
        servedCommunityIdsRef.current.delete(insertedTrack.id);
        markPriorityAirplayTrack(normalizedTrack.id);
        setOfficialTracks((tracks) => {
          const withoutDuplicate = tracks.filter((track) => track.id !== normalizedTrack.id);
          return [...withoutDuplicate, normalizedTrack];
        });
        setReactionCounts((counts) => ({ ...counts, [insertedTrack.id]: { ...emptyReactions } }));
        void listenBarSyncChannelRef.current?.send({
          type: "broadcast",
          event: "track-uploaded",
          payload: { track: normalizedTrack },
        });
        setMyBroadcastStats((tracks) => [
          {
            id: normalizedTrack.id,
            title: normalizedTrack.title,
            aiTool: normalizedTrack.tool,
            genre: normalizedTrack.genre,
            album: normalizedTrack.album ?? "",
            description: normalizedTrack.description ?? "",
            youtubeUrl: normalizedTrack.youtubeUrl ?? "",
            duration: normalizedTrack.duration,
            barPhase: normalizedTrack.barPhase ?? uploadSubmissionPhase,
            positives: 0,
            heart: 0,
            star: 0,
            thumb: 0,
            happy: 0,
            createdAt: normalizedTrack.createdAt ?? new Date().toISOString(),
            promotedAt: normalizedTrack.promotedAt ?? null,
          },
          ...tracks.filter((track) => track.id !== normalizedTrack.id),
        ]);
      }
      if (insertedTrack?.barPhase === "challenger") {
        setChallengerSlotCount((count) => count + 1);
      }
      setPublicAudioFile(null);
      setPublicCoverFile(null);
      setPublicLyricsText("");
      setPublicUploadForm({
        ...initialPublicUploadForm,
        artist: limitListenBarDisplayText(creatorDefaultName, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
      });
      setPublicUploadMessage(
        (insertedTrack?.barPhase ?? uploadSubmissionPhase) === "public"
          ? isZh
            ? `上傳完成！已加入 ${publicUploadForm.genre} 公播池，會在這個類型裡輪播。`
            : `Upload complete. Your track joined the ${publicUploadForm.genre} public pool and will keep rotating in that genre.`
          : isZh
            ? `上傳完成！已進入 ${publicUploadForm.genre} Challenger；目前這首播完後會優先插播新投稿。`
            : `Upload complete. Your track entered the ${publicUploadForm.genre} Challenger lane and gets priority after the current song.`,
      );
      setPlaylistStatus("database");
    } catch (submitError) {
      void cleanupPublicUploadAssets({ audioPath, coverPath });
      setPublicUploadError(
        isDuplicateAudioHashError(submitError)
          ? isZh
            ? "這個音檔已經上傳過了，請換另一首歌。"
            : "This exact audio file has already been uploaded. Please choose another track."
          : isListenBarStorageSizeLimitError(submitError)
            ? isZh
              ? `音檔被雲端儲存限制擋下。請確認檔案低於 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，若仍失敗請稍後再試。`
              : `The audio was blocked by cloud storage limits. Keep it under ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL} and try again.`
          : isZh
            ? `投稿失敗：${String((submitError as { message?: string })?.message ?? submitError)}。請確認已套用傷心酒吧投稿 SQL。`
            : `Submission failed: ${String((submitError as { message?: string })?.message ?? submitError)}. Make sure the Bar Heartbreak submission SQL has been applied.`,
      );
    } finally {
      setPublicUploadBusy(false);
    }
  };

  const openEditTrackDetails = (track: MyBroadcastStat) => {
    setEditTrackId((current) => current === track.id ? null : track.id);
    setEditTrackForm({
      aiTool: limitListenBarDisplayText(track.aiTool || "AI Music", LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
      genre: track.genre || "Original 自我風格",
      album: limitListenBarDisplayText(track.album || "", LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
      description: limitListenBarDisplayText(track.description || "", LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS),
      youtubeUrl: track.youtubeUrl || "",
    });
    setPublicUploadError("");
    setPublicUploadMessage("");
  };

  const handleSaveTrackDetails = async (track: MyBroadcastStat) => {
    if (!userId || editTrackBusy) return;
    setEditTrackBusy(true);
    setPublicUploadError("");
    setPublicUploadMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";
      const normalizedYouTubeUrl = normalizeYouTubeUrl(editTrackForm.youtubeUrl);
      const response = await fetch("/api/listen-bar/my-tracks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trackId: track.id,
          aiTool: limitListenBarDisplayText(editTrackForm.aiTool, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
          genre: editTrackForm.genre,
          album: limitListenBarDisplayText(editTrackForm.album, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
          description: limitListenBarDisplayText(editTrackForm.description, LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS),
          youtubeUrl: normalizedYouTubeUrl,
        }),
      });
      const payload = await response.json().catch(() => null) as { track?: ListenBarTrackRow; error?: string } | null;
      if (!response.ok || !payload?.track) {
        throw new Error(payload?.error || (isZh ? "歌曲資料更新失敗。" : "Track details update failed."));
      }

      const updatedTrack = listenBarRowToMyBroadcastStat(payload.track);
      setMyBroadcastStats((tracks) => tracks.map((item) => item.id === updatedTrack.id ? updatedTrack : item));
      setOfficialTracks((tracks) => tracks.map((item) => item.id === updatedTrack.id
        ? {
            ...item,
            tool: updatedTrack.aiTool,
            genre: updatedTrack.genre,
            album: updatedTrack.album || undefined,
            description: updatedTrack.description || undefined,
            youtubeUrl: updatedTrack.youtubeUrl || undefined,
            mood: [updatedTrack.genre, updatedTrack.album].filter(Boolean).join(" / ") || item.mood,
          }
        : item));
      if (nowTrack.id === updatedTrack.id) {
        setNowTrack((item) => ({
          ...item,
          tool: updatedTrack.aiTool,
          genre: updatedTrack.genre,
          album: updatedTrack.album || undefined,
          description: updatedTrack.description || undefined,
          youtubeUrl: updatedTrack.youtubeUrl || undefined,
          mood: [updatedTrack.genre, updatedTrack.album].filter(Boolean).join(" / ") || item.mood,
        }));
      }
      setEditTrackId(null);
      setPublicUploadMessage(isZh ? "歌曲資料已更新。" : "Track details updated.");
    } catch (error) {
      setPublicUploadError(
        isZh
          ? `歌曲資料更新失敗：${String((error as { message?: string })?.message ?? error)}`
          : `Track details update failed: ${String((error as { message?: string })?.message ?? error)}`,
      );
    } finally {
      setEditTrackBusy(false);
    }
  };

  const handleRemoveMyTrack = async (track: MyBroadcastStat) => {
    if (!userId || removeTrackBusyId) return;
    const confirmMessage = track.barPhase === "public"
      ? isZh
        ? `「${track.title}」已經在公播池。撤下後會離開傷心酒吧，確定撤下嗎？`
        : `"${track.title}" is in the public pool. Remove it from Bar Heartbreak?`
      : isZh
        ? `撤下 Challenger「${track.title}」？撤下後會空出 1 個挑戰席。`
        : `Remove Challenger "${track.title}" and free one seat?`;
    if (!window.confirm(confirmMessage)) return;

    setRemoveTrackBusyId(track.id);
    setPublicUploadError("");
    setPublicUploadMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/listen-bar/remove-track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
        },
        body: JSON.stringify({ trackId: track.id }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Remove failed.");
      void logAnalyticsEvent({
        eventType: "delete_song",
        songId: isUuid(track.id) ? track.id : null,
        pagePath: "/listen-bar",
        source: "bar_heartbreak",
        metadata: {
          title: track.title,
          barPhase: track.barPhase,
        },
      });

      setOfficialTracks((tracks) => tracks.filter((item) => item.id !== track.id));
      if (nowTrack.id === track.id) {
        const replacement = rotationTracks.find((item) => item.id !== track.id && item.audioUrl) ?? EMPTY_LISTEN_BAR_TRACK;
        setNowTrack(replacement);
        setElapsed(0);
      }
      setMyBroadcastStats((tracks) => tracks.filter((item) => item.id !== track.id));
      if (editTrackId === track.id) setEditTrackId(null);
      setReactionCounts((counts) => {
        const next = { ...counts };
        delete next[track.id];
        return next;
      });
      setMyReactions((reactions) => {
        const next = { ...reactions };
        delete next[track.id];
        return next;
      });
      if (track.barPhase === "challenger") {
        setChallengerSlotCount((count) => Math.max(0, count - 1));
      }
      setPublicUploadMessage(
        track.barPhase === "public"
          ? isZh
            ? "已撤下公播池歌曲，紀錄會保留給後續成績卡使用。"
            : "Public-pool track removed. Its record is preserved for future score cards."
          : isZh
            ? "已撤下 Challenger，現在可以派新歌上場。"
            : "Challenger removed. You can send a new track now.",
      );
    } catch (error) {
      setPublicUploadError(
        isZh
          ? `撤下失敗：${String((error as { message?: string })?.message ?? error)}`
          : `Remove failed: ${String((error as { message?: string })?.message ?? error)}`,
      );
    } finally {
      setRemoveTrackBusyId(null);
    }
  };

  const nowCoverUrl = nowTrack.coverUrl?.trim() || DEFAULT_LISTEN_BAR_COVER;
  const nowPresenterName = nowTrack.queuedBy?.trim() || nowTrack.artist;
  const rawPresenterRank = nowTrack.queuedByRank?.trim() || "";
  const nowPresenterRank = rawPresenterRank === "創作者投稿"
    ? barText(lang, "創作者投稿", "Creator Submission", "クリエイター投稿", "크리에이터 업로드")
    : rawPresenterRank;
  const nowSurvivalDay = nowTrack.source === "community" && nowTrack.barPhase === "public"
    ? listenBarPublicDisplayDay(nowTrack.promotedAt, nowTrack.createdAt, Date.now(), survivalStartedAt)
    : 0;
  const nowLyrics = nowTrack.lyrics?.trim() ?? "";
  const lyricLines = useMemo(() => parseLyricLines(nowLyrics), [nowLyrics]);
  const activeLyricIndex = useMemo(() => {
    if (lyricLines.length === 0) return -1;
    const hasTimedLyrics = lyricLines.some((line) => line.time !== null);
    if (!hasTimedLyrics) return -1;
    let index = 0;
    lyricLines.forEach((line, lineIndex) => {
      if (line.time !== null && line.time <= elapsed + 0.12) index = lineIndex;
    });
    return index;
  }, [elapsed, lyricLines]);
  const nowAlbumLabel = albumDisplayLabel(nowTrack.album ?? "", lang);
  const nowGenreLabel = genreDisplayLabel(nowTrack.genre, lang);
  const nowDescriptionLabel = descriptionDisplayLabel(nowTrack.description, lang);
  const nowAiToolLabel = aiToolDisplayLabel(nowTrack.tool, lang);
  const nowYouTubeUrl = nowTrack.youtubeUrl?.trim() || "";
  const battleTickerText = battleTickerMessages.length > 0
    ? battleTickerMessages.join("   /   ")
    : listenCopy.ticker;
  const battleTickerHref = battleTickerMessages.length > 0 ? `/battle${langQuery}` : `/ai-music${langQuery}`;

  useEffect(() => {
    const container = lyricScrollRef.current;
    const activeLine = activeLyricRef.current;
    if (!container || !activeLine || activeLyricIndex < 0) return;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeLine.getBoundingClientRect();
    const top = container.scrollTop
      + activeRect.top
      - containerRect.top
      - (container.clientHeight / 2)
      + (activeLine.clientHeight / 2);
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [activeLyricIndex]);

  return (
    <main className="aipo-stage-bg relative min-h-screen w-full overflow-x-hidden px-3 py-5 text-zinc-100 sm:px-5 lg:px-7">
      <title>{pageTitle}</title>
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_10%,rgba(255,106,0,0.3),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(0,202,255,0.18),transparent_28%),linear-gradient(180deg,#080706_0%,#050505_46%,#090604_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(255,138,43,0.16),transparent_44%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1880px] flex-col gap-4 overflow-x-hidden">
        <header className="aipo-control-panel aipo-panel-line relative overflow-hidden rounded-[1.35rem] p-4 text-center text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,106,0,0.16),transparent_30%),radial-gradient(circle_at_84%_10%,rgba(0,202,255,0.09),transparent_28%)]" />
          <div className="relative z-20 mb-1 flex justify-end">
            <LangToggle variant="inline" />
          </div>

          <div className="relative -mt-1 mx-auto flex w-full max-w-[1080px] flex-col items-center md:max-w-[840px]">
            <div className="heartbreak-sign relative w-full max-w-[min(92vw,1080px)] overflow-hidden px-5 py-5 text-center md:max-w-[840px] md:px-7 md:py-5">
              <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 md:gap-8">
                <span className="heartbreak-sign-kicker">AIPOGER RADIO</span>
                <span className="heartbreak-sign-chip">BAR HEARTBREAK</span>
              </div>
              <h1 className={`heartbreak-sign-title relative z-10 mt-3 ${signTitleClass}`}>
                {listenCopy.title}
              </h1>
              <p className="heartbreak-sign-subtitle relative z-10 mt-2 whitespace-nowrap text-[clamp(0.54rem,1.75vw,0.68rem)] sm:whitespace-normal sm:text-[clamp(0.66rem,1.35vw,0.92rem)]">
                {listenCopy.subtitle}
              </p>
              <p className="relative z-10 mx-auto mt-2 max-w-3xl text-xs font-black leading-5 text-yellow-100/88 sm:text-sm">
                {listenCopy.surfaceHint}
              </p>
            </div>
          </div>

          <div className="relative mt-3 grid max-w-full gap-2 rounded-[1.15rem] border border-white/10 bg-black/52 p-2 shadow-[0_16px_54px_rgba(0,0,0,0.24)] backdrop-blur lg:grid-cols-[minmax(0,max-content)_minmax(18rem,1fr)] lg:items-center">
            <nav className="flex min-w-0 flex-wrap items-center justify-center gap-2 sm:justify-start">
              <a
                href="#play-request"
                className="order-1 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-orange-300/45 bg-orange-500/16 px-3 py-2 text-sm font-black text-orange-100 transition hover:border-orange-100 hover:bg-orange-500/24 sm:px-4"
              >
                {listenCopy.playMySong}
              </a>
              <ShareButton
                title={listenCopy.shareTitle}
                text={listenCopy.shareText}
                url={barShareUrl}
                label={listenCopy.shareLabel}
                copiedLabel={listenCopy.copied}
                wrapperClassName="order-2"
                className="min-h-11 !border-rose-200/70 !bg-[linear-gradient(180deg,rgba(164,24,42,0.78)_0%,rgba(116,21,34,0.72)_100%)] px-3 text-sm !text-white !shadow-[0_0_34px_rgba(255,49,80,0.34),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-rose-100/20 hover:!border-rose-100/90 hover:!bg-[linear-gradient(180deg,rgba(194,30,54,0.88)_0%,rgba(130,22,38,0.8)_100%)] hover:!shadow-[0_0_46px_rgba(255,49,80,0.46),inset_0_1px_0_rgba(255,255,255,0.16)] sm:px-4"
              />
              <Link
                href={`/rank${langQuery}`}
                className="order-3 inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-sm font-black text-zinc-200 transition hover:border-orange-300/70 hover:bg-orange-500/10 hover:text-white sm:px-4 md:order-4"
              >
                {listenCopy.navRank}
              </Link>
              <span className="order-4 flex basis-full justify-center md:order-3 md:basis-auto">
                <Link
                  href={`/ai-music${langQuery}`}
                  className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-black text-zinc-200 transition hover:border-orange-300/70 hover:bg-orange-500/10 hover:text-white"
                >
                  {listenCopy.navBattle}
                </Link>
              </span>
            </nav>
            <Link
              href={battleTickerHref}
              className="group aipo-marquee relative flex min-h-12 min-w-0 items-center overflow-hidden rounded-[1rem] border border-cyan-200/20 bg-[linear-gradient(90deg,rgba(4,10,12,0.86),rgba(0,28,34,0.42),rgba(4,10,12,0.86))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:rounded-full"
              aria-label={battleTickerText}
            >
              <span className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-black via-black/80 to-transparent sm:block" />
              <span className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-10 bg-gradient-to-l from-black via-black/80 to-transparent sm:block" />
              <span
                className={`${battleTickerMessages.length > 0 ? "aipo-marquee-track text-left" : "w-full text-center"} text-sm font-black leading-6 tracking-[0.08em] transition-colors group-hover:text-white ${
                  battleTickerMessages.length > 0 ? "text-red-300" : "text-cyan-100/78"
                }`}
              >
                {battleTickerMessages.length > 0 ? (
                  <>
                    <span className="pr-12">{battleTickerText}</span>
                    <span className="pr-12" aria-hidden="true">{battleTickerText}</span>
                  </>
                ) : (
                  <span>{battleTickerText}</span>
                )}
              </span>
            </Link>
          </div>
        </header>

        <section className="grid min-w-0 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="aipo-control-panel aipo-panel-line relative min-w-0 overflow-hidden rounded-[1.35rem] p-4 md:p-5">
            <div className="pointer-events-none absolute inset-0 [background:linear-gradient(115deg,rgba(255,106,0,0.14),transparent_35%,rgba(0,202,255,0.08))]" />
            <div className="relative grid min-w-0 gap-6 md:grid-cols-[minmax(18rem,0.98fr)_1.02fr] md:items-start">
              <div className="flex min-w-0 flex-col justify-start gap-4 pt-1 md:pt-3">
                <ListenBarRecordArt
                  coverUrl={nowCoverUrl}
                  title={nowTrackTitle}
                  isPlaying={isPlaying}
                  isNew={isNewlyPublishedMusic(nowTrack.createdAt)}
                  lang={lang}
                />

                <div className="rounded-[1.35rem] border border-orange-300/14 bg-black/38 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="text-xs font-black tracking-[0.18em] text-orange-300/75">
                    {barText(lang, "傷心字幕", "HEARTBREAK LYRICS", "HEARTBREAK 歌詞", "HEARTBREAK 가사")}
                  </p>
                  <div ref={lyricScrollRef} className="mt-3 h-48 overflow-y-auto rounded-2xl border border-white/8 bg-black/46 px-4 py-4 text-center md:h-64">
                    {lyricLines.length > 0 ? (
                      <div className="grid gap-3">
                        {lyricLines.map((line, lineIndex) => {
                          const isActive = lineIndex === activeLyricIndex;
                          return (
                            <div
                              key={`${lineIndex}-${line.text}`}
                              ref={isActive ? activeLyricRef : undefined}
                              className={`text-sm font-black leading-7 transition ${
                                isActive ? "scale-[1.02] text-orange-100" : "text-zinc-500"
                              }`}
                            >
                              {line.text}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm font-black text-zinc-500">
                        {barText(lang, "尚無歌詞，等創作者把心事補上。", "No lyrics yet.", "歌詞はまだありません。", "아직 가사가 없습니다.")}
                      </p>
                    )}
                  </div>
                </div>

              </div>

              <div className="min-w-0 self-start pt-1 md:pt-3">
                <div className="max-w-2xl text-xs font-black leading-5 text-orange-200/82 sm:text-sm">
                  {nowDescriptionLabel}
                </div>
                <p
                  title={nowTrackTitle}
                  className={nowTrackTitleClass}
                >
                  {nowTrackTitle}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-400 md:text-base">
                  <span className="font-semibold text-zinc-100">{nowTrack.artist}</span>
                  <span className="h-1 w-1 rounded-full bg-orange-400" />
                  {nowAlbumLabel && (
                    <>
                      <span>{nowAlbumLabel}</span>
                      <span className="h-1 w-1 rounded-full bg-cyan-300" />
                    </>
                  )}
                  <span>{nowAiToolLabel}</span>
                </div>
                <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-orange-300/20 bg-black/36 px-3 py-2 text-xs text-zinc-300">
                  <span className="font-black text-orange-200">{barText(lang, "播歌者", "Host", "ホスト", "호스트")}</span>
                  <span className="font-bold text-white">{nowPresenterName}</span>
                  {nowPresenterRank && (
                    <span className="rounded-full border border-cyan-200/25 bg-cyan-300/8 px-2 py-0.5 font-bold text-cyan-100">{nowPresenterRank}</span>
                  )}
                  {nowYouTubeUrl && (
                    <a
                      href={nowYouTubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-red-300/35 bg-red-500/12 px-2 py-0.5 font-bold text-red-100 transition hover:border-red-200 hover:bg-red-500/20"
                    >
                      {barText(lang, "看 MV", "Watch MV", "MVを見る", "MV 보기")}
                    </a>
                  )}
                  {nowSurvivalDay > 0 && (
                    <span className="rounded-full border border-orange-300/25 bg-orange-500/8 px-2 py-0.5 font-bold text-orange-100">
                      {barText(lang, `公播 Day ${nowSurvivalDay}`, `Public Day ${nowSurvivalDay}`, `公開放送 ${nowSurvivalDay}日目`, `공개 방송 ${nowSurvivalDay}일차`)}
                    </span>
                  )}
                </div>
                <div className="mt-3 -ml-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                    {nowGenreLabel}
                  </span>
                  {nowTrack.source === "community" && nowTrack.id !== EMPTY_LISTEN_BAR_TRACK.id ? (
                    <ReportButton
                      targetType="listen_bar_track"
                      targetId={nowTrack.id}
                      targetTitle={`${nowTrackTitle} / ${nowTrack.artist}`}
                      targetUrl={`/listen-bar?track=${encodeURIComponent(nowTrack.id)}${langQuery ? `&${langQuery.slice(1)}` : ""}`}
                      context={`Bar Heartbreak now playing. phase=${nowTrack.barPhase}; host=${nowPresenterName}`}
                      lang={lang}
                    />
                  ) : null}
                </div>
                <div className="mt-7">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-300 to-cyan-300 transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs tabular-nums text-zinc-500">
                    <span>{formatDuration(elapsed)}</span>
                    <span>{formatDuration(trackDuration)}</span>
                  </div>
                </div>

                {playbackBlocked && (
                  <button
                    type="button"
                    onPointerDown={() => resumeRadioPlayback(false)}
                    onClick={() => resumeRadioPlayback(false)}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-orange-300/35 bg-orange-500 px-4 py-2 text-xs font-black text-black shadow-[0_0_22px_rgba(255,106,0,0.18)] transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                  >
                    {barText(lang, "點一下恢復播放", "Tap to Resume Playback", "タップして再生を再開", "눌러서 재생 다시 시작")}
                  </button>
                )}

                <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="text-xs font-bold text-zinc-500">
                    {barText(lang, "公播音量", "BAR VOLUME", "放送音量", "방송 볼륨")}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onPointerDown={() => {
                      void ensureRadioVolumeControl();
                    }}
                    onKeyDown={() => {
                      void ensureRadioVolumeControl();
                    }}
                    onChange={(event) => {
                      setVolume(Number(event.target.value));
                    }}
                    aria-label={barText(lang, "公播音量", "Bar Volume", "放送音量", "방송 볼륨")}
                    className="h-2 w-full accent-orange-500"
                  />
                  <span className="text-xs font-black tabular-nums text-orange-200">
                    {Math.round(volume * 100)}%
                  </span>
                  {volumeControlFallback && (
                    <span className="text-[11px] font-bold text-zinc-400 sm:col-span-3">
                      {barText(lang, "此手機請搭配側邊音量鍵調整。", "Use your phone's volume buttons on this browser.", "このブラウザでは端末の音量ボタンも使って調整してください。", "이 브라우저에서는 휴대폰 볼륨 버튼도 함께 사용해 주세요.")}
                    </span>
                  )}
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-zinc-500">
                      {barText(lang, "聽眾反應", "REACTIONS", "リスナーの反応", "청취자 반응")}
                    </span>
                    <span className="text-xs font-bold text-orange-100/70">
                      {barText(lang, "每帳號每天每首歌保留 1 顆有效愛心；再按一次即可取消。", "One active Heart per account and track each day. Tap again to cancel.", "1アカウントにつき、各曲へ1日1件の有効なHeartを送れます。もう一度押すと解除できます。", "계정당 곡별로 하루 1개의 유효 Heart를 보낼 수 있습니다. 다시 누르면 취소됩니다.")}
                    </span>
                  </div>
                  <div className="grid gap-3 rounded-2xl border border-orange-300/18 bg-orange-500/8 p-3 sm:grid-cols-[auto_1fr] sm:items-center">
                    <button
                      type="button"
                      onClick={() => handleReaction("heart")}
                      aria-label={currentHeartSent ? barText(lang, "取消愛心與收藏", "Remove Heart and saved track", "Heartと保存を解除", "Heart와 저장 취소") : barText(lang, "送出愛心支持", "Send a heart", "Heartを送る", "Heart 보내기")}
                      title={currentHeartSent ? barText(lang, "再按一次取消愛心與收藏", "Tap again to remove Heart and saved track", "もう一度押すとHeartと保存を解除します", "다시 누르면 Heart와 저장이 취소됩니다") : barText(lang, "送出愛心支持", "Send a heart", "Heartを送る", "Heart 보내기")}
                      className={`flex h-24 min-w-32 items-center justify-center gap-3 rounded-2xl border px-5 text-3xl font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
                        currentHeartSent
                          ? "border-rose-200/60 bg-rose-500/18 text-rose-50 shadow-[0_0_30px_rgba(244,63,94,0.22)] hover:border-rose-100/75"
                          : "border-white/10 bg-black/35 text-zinc-100 hover:border-orange-300/55 hover:text-white"
                      }`}
                    >
                      <span className="text-5xl leading-none">♥</span>
                      <span className="tabular-nums">{currentHeartTotal}</span>
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-6 text-orange-50">
                        {barText(lang, "給他一個大大的愛心表達你的支持", "Give this track a big heart to show support", "大きなHeartでこの曲を応援しよう", "큰 Heart로 이 곡을 응원해 주세요")}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-orange-100/70">
                        {barText(lang, "愛心會同步加入收藏；再按一次會取消愛心與收藏。", "A Heart also saves the track. Tap it again to remove both.", "Heartを送ると曲も保存されます。もう一度押すと両方解除できます。", "Heart를 보내면 곡도 저장됩니다. 다시 누르면 둘 다 취소됩니다.")}
                      </p>
                    </div>
                  </div>
                  <form onSubmit={handleTrackCommentSubmit} className="mt-3 rounded-xl border border-orange-200/18 bg-orange-300/[0.055] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-orange-100">
                        {barText(lang, "這首歌的傷心評論", "Track Comments", "この曲へのコメント", "이 곡의 댓글")}
                      </p>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={trackCommentInput}
                        onChange={(event) => setTrackCommentInput(event.target.value)}
                        maxLength={280}
                        placeholder={barText(lang, "留下你對這首歌的評論...", "Comment on this song...", "この曲へのコメント…", "이 곡에 댓글 남기기…")}
                        className="h-11 rounded-full border border-white/10 bg-black/62 px-4 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                      />
                      <button
                        type="submit"
                        disabled={trackCommentBusy || !trackCommentInput.trim()}
                        className="h-11 rounded-full bg-orange-500 px-5 text-xs font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-zinc-500"
                      >
                        {trackCommentBusy ? barText(lang, "送出中", "Sending", "送信中", "전송 중") : barText(lang, "送出", "Send", "送信", "보내기")}
                      </button>
                    </div>
                    {trackCommentError && <p className="mt-2 text-xs font-bold text-red-200">{trackCommentError}</p>}
                    <div className="mt-3 grid max-h-28 gap-2 overflow-y-auto pr-1">
                      {trackComments.length > 0 ? (
                        trackComments.slice(-6).map((comment) => (
                          <div key={comment.id} className="rounded-lg border border-white/8 bg-black/40 px-3 py-2">
                            <p className="text-xs leading-5 text-zinc-200">
                              <span className="mr-2 font-black text-orange-300">{comment.name}</span>
                              {comment.text}
                            </p>
                            <p className="mt-1 text-[10px] tabular-nums text-zinc-600">{comment.time}</p>
                          </div>
                        ))
                      ) : null}
                    </div>
                  </form>
                </div>
                {radioStatusLine ? (
                  <p className="mt-3 text-xs font-bold text-orange-200/70">{radioStatusLine}</p>
                ) : null}
              </div>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_36px_rgba(0,202,255,0.05)]">
              <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_12%_0%,rgba(255,106,0,0.14),transparent_32%),linear-gradient(90deg,rgba(0,202,255,0.055),transparent_42%,rgba(255,106,0,0.08))]" />
              <div className="relative flex flex-wrap items-end justify-between gap-3 border-b border-white/8 px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">
                    {barText(lang, "傷心歌單", "SAD SONG QUEUE", "次の曲", "다음 곡")}
                  </p>
                  <h2 className="text-[clamp(1.55rem,8vw,2.9rem)] font-black leading-none text-white sm:whitespace-nowrap">
                    {upcomingHeartbreakerTracks.length > 0
                      ? listenCopy.queueTitle
                      : listenCopy.queueWaiting}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <ShareButton
                    title={selectedGenreShareTitle}
                    text={selectedGenreShareText}
                    url={selectedGenreShareUrl}
                    label={selectedPlaybackGenre === "all"
                      ? barText(lang, "分享公播", "Share All", "放送全体をシェア", "전체 방송 공유")
                      : barText(lang, "分享此類", "Share Genre", "このジャンルをシェア", "이 장르 공유")}
                    copiedLabel={listenCopy.copied}
                    className="min-h-10 !border-rose-200/72 !bg-[linear-gradient(180deg,rgba(164,24,42,0.8)_0%,rgba(96,18,30,0.76)_100%)] px-3 py-1 text-[11px] !text-white !shadow-[0_0_30px_rgba(255,49,80,0.36),inset_0_1px_0_rgba(255,255,255,0.11)] ring-1 ring-rose-100/20 hover:!border-rose-100/90 hover:!bg-[linear-gradient(180deg,rgba(202,32,58,0.9)_0%,rgba(122,20,36,0.84)_100%)] hover:!shadow-[0_0_42px_rgba(255,49,80,0.48),inset_0_1px_0_rgba(255,255,255,0.15)]"
                  />
                  <span className="rounded-full border border-cyan-200/20 bg-cyan-300/8 px-3 py-1 text-[11px] font-black text-cyan-100">
                    {selectedGenreLabel}
                  </span>
                  <span className="rounded-full border border-orange-300/24 bg-orange-500/10 px-3 py-1 text-[11px] font-black text-orange-100">
                    {upcomingHeartbreakerTracks.length}/6
                  </span>
                </div>
              </div>
              <div className="relative border-b border-white/8 px-4 py-3">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-6">
                  <button
                    type="button"
                    onClick={() => setSelectedPlaybackGenre("all")}
                    className={`min-w-0 rounded-xl border px-2.5 py-2 text-left transition ${
                      selectedPlaybackGenre === "all"
                        ? "border-orange-200/70 bg-orange-400/16 text-orange-50 shadow-[0_0_20px_rgba(255,106,0,0.12)]"
                        : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-cyan-200/30 hover:bg-cyan-300/8 hover:text-cyan-50"
                    }`}
                  >
                    <span className="block truncate text-[10px] font-black uppercase tracking-[0.16em]">
                      {barText(lang, "公播", "All", "すべて", "전체")}
                    </span>
                    <span className="mt-0.5 block text-xs font-black tabular-nums">
                      {publicPoolTracks.length}/{LISTEN_BAR_TOTAL_ROTATION_LIMIT}
                    </span>
                  </button>
                  {LISTEN_BAR_GENRES.map((genre) => {
                    const stats = genrePoolStats.get(genre.value) ?? { total: 0, public: 0 };
                    const active = selectedPlaybackGenre === genre.value;
                    return (
                      <button
                        key={genre.value}
                        type="button"
                        onClick={() => setSelectedPlaybackGenre(genre.value)}
                        className={`min-w-0 rounded-xl border px-2.5 py-2 text-left transition ${
                          active
                            ? "border-orange-200/70 bg-orange-400/16 text-orange-50 shadow-[0_0_20px_rgba(255,106,0,0.12)]"
                            : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-cyan-200/30 hover:bg-cyan-300/8 hover:text-cyan-50"
                        }`}
                      >
                        <span className="block truncate text-[10px] font-black uppercase tracking-[0.08em]">
                          {t(genre.labelKey)}
                        </span>
                        <span className="mt-0.5 block text-xs font-black tabular-nums">
                          {stats.public}/{LISTEN_BAR_GENRE_POOL_LIMIT}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="relative grid gap-0 md:grid-cols-2">
                {upcomingHeartbreakerTracks.length === 0 ? (
                  <p className="px-4 py-6 text-sm font-bold text-zinc-500 md:col-span-2">
                    {listenCopy.queueEmpty}
                  </p>
                ) : [0, 3].map((startIndex, groupIndex) => {
                  const tracks = upcomingHeartbreakerTracks.slice(startIndex, startIndex + 3);
                  return (
                    <div
                      key={startIndex}
                      className={`min-w-0 ${groupIndex === 1 ? "border-t border-white/8 md:border-l md:border-t-0" : ""}`}
                    >
                      <div className="divide-y divide-white/8">
                        {tracks.length > 0 ? (
                          tracks.map((track, index) => (
                            <div
                              key={track.id}
                              className="grid min-h-[5rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-white/[0.035]"
                            >
                              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-orange-300/35 bg-orange-500/10 text-base font-black tabular-nums text-orange-100 shadow-[0_0_18px_rgba(255,106,0,0.08)]">
                                {startIndex + index + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  {isNewlyPublishedMusic(track.createdAt) ? <NewMusicBadge lang={lang} className="shrink-0" /> : null}
                                  <p className="min-w-0 line-clamp-1 text-lg font-black leading-tight text-white" title={track.title}>
                                    {track.title}
                                  </p>
                                </div>
                                <p className="mt-1 truncate text-sm font-bold text-zinc-500">
                                  <span className="text-orange-200">{track.artist}</span>
                                  <span className="mx-2 text-zinc-700">/</span>
                                  {track.tool}
                                  <span className="mx-2 text-zinc-700">/</span>
                                  {formatDuration(track.duration)}
                                </p>
                                {track.barPhase === "public" ? (
                                  <p className="mt-1 text-[11px] font-black text-orange-100/80">
                                    {barText(
                                      lang,
                                      `公播 Day ${listenBarPublicDisplayDay(track.promotedAt, track.createdAt, Date.now(), survivalStartedAtByGenre.get(track.genre) ?? null)}`,
                                      `Public Day ${listenBarPublicDisplayDay(track.promotedAt, track.createdAt, Date.now(), survivalStartedAtByGenre.get(track.genre) ?? null)}`,
                                      `公開放送 ${listenBarPublicDisplayDay(track.promotedAt, track.createdAt, Date.now(), survivalStartedAtByGenre.get(track.genre) ?? null)}日目`,
                                      `공개 방송 ${listenBarPublicDisplayDay(track.promotedAt, track.createdAt, Date.now(), survivalStartedAtByGenre.get(track.genre) ?? null)}일차`,
                                    )}
                                  </p>
                                ) : (
                                  <p className="mt-1 text-[11px] font-black text-cyan-100/80">
                                    Challenger #{challengerRankById.get(track.id) ?? startIndex + index + 1}
                                  </p>
                                )}
                              </div>
                              {startIndex + index === 0 && (
                                <span className="hidden rounded-full border border-cyan-200/25 bg-cyan-300/8 px-2.5 py-1 text-[10px] font-black text-cyan-100 sm:inline-flex">
                                  {barText(lang, "即將插播", "Next", "次に再生", "다음 재생")}
                                </span>
                              )}
                            </div>
                          ))
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <audio
              ref={audioRef}
              src={nowTrack.audioUrl}
              crossOrigin="anonymous"
              preload="auto"
              playsInline
              onPlay={() => {
                setPlaybackBlocked(false);
                setIsPlaying(true);
                const currentSecond = Math.max(0, Math.floor(audioRef.current?.currentTime ?? 0));
                if (!playbackSegmentRef.current || playbackSegmentRef.current.trackId !== nowTrack.id) {
                  playbackSegmentRef.current = {
                    trackId: nowTrack.id,
                    startedAtMs: Date.now(),
                    startedAtSecond: currentSecond,
                  };
                  logSongPlaybackEvent("song_play", nowTrack, { startSecond: currentSecond });
                } else {
                  logSongPlaybackEvent("song_resume", nowTrack, { startSecond: currentSecond });
                }
              }}
              onPause={(event) => {
                setIsPlaying(false);
                if (!event.currentTarget.ended) closePlaybackSegment("song_pause", event.currentTarget);
              }}
              onTimeUpdate={(event) => syncElapsedFromAudio(event.currentTarget)}
              onLoadedMetadata={(event) => {
                if (Number.isFinite(event.currentTarget.duration)) {
                  setTrackDuration(Math.max(1, Math.round(event.currentTarget.duration)));
                }
                syncElapsedFromAudio(event.currentTarget, true);
              }}
              onEnded={(event) => {
                closePlaybackSegment("song_finish", event.currentTarget);
                playNext();
              }}
            />
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="flex min-h-[34rem] min-w-0 flex-col rounded-[1.6rem] border border-cyan-200/14 bg-black/68 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.48),0_0_40px_rgba(0,202,255,0.06)] backdrop-blur md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-black text-white">{barText(lang, "傷心的故事傾訴留言", "Bar Heartbreak Stories", "Bar Heartbreakの物語", "Bar Heartbreak 이야기")}</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">
                    {barText(lang, `${localizedMessages.length} 則留言`, `${localizedMessages.length} Messages`, `${localizedMessages.length}件のメッセージ`, `메시지 ${localizedMessages.length}개`)}
                  </p>
                  <p className="mt-1 text-xs font-black text-orange-200/80">{listenBarPresenceLabel}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-zinc-600">{barText(lang, "留言保留 12H", "Messages Keep 12H", "メッセージは12時間保存", "메시지는 12시간 보관")}</p>
                </div>
              </div>
              <SafetyNotice kind="chat" compact className="mb-3" />

              <div ref={chatScrollRef} className="min-h-0 max-h-[27rem] flex-1 overflow-y-auto rounded-2xl border border-white/8 bg-black/50 p-3 pr-2">
                <div className="grid gap-2">
                  {localizedMessages.length === 0 ? (
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm font-bold text-zinc-500">
                      {barText(lang, "還沒有人留言，說說你的傷心故事。", "No Messages Yet. Share your Bar Heartbreak story.", "まだメッセージはありません。あなたのBar Heartbreakの物語を聞かせてください。", "아직 메시지가 없습니다. 당신의 Bar Heartbreak 이야기를 들려주세요.")}
                    </div>
                  ) : (
                    localizedMessages.map((msg) => (
                      <div key={msg.id} className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-left">
                        <div className="mb-1 flex min-w-0 items-center gap-2 text-[11px] font-black">
                          <span className="shrink-0 tabular-nums text-zinc-600">{msg.time}</span>
                          <span className="min-w-0 truncate text-orange-300">{msg.name}</span>
                        </div>
                        <p className="break-words text-sm leading-6 text-zinc-200 [overflow-wrap:anywhere]">
                          {msg.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={handleChatSubmit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder={barText(lang, "說說你的傷心故事...", "Share your Bar Heartbreak story...", "Bar Heartbreakの物語を聞かせて…", "Bar Heartbreak 이야기 남기기…")}
                  className="h-14 rounded-full border border-orange-200/35 bg-black/70 px-5 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/20"
                />
                <button
                  type="submit"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-orange-500 px-7 text-sm font-black text-black transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                >
                  <SendIcon />
                  {barText(lang, "發送", "Send", "送信", "보내기")}
                </button>
              </form>
              {chatError && <p className="mt-2 text-xs font-bold text-red-200">{chatError}</p>}
            </div>

            <div id="play-request" className="min-w-0 rounded-[1.6rem] border border-orange-300/18 bg-black/70 p-4 shadow-[0_20px_56px_rgba(0,0,0,0.42),0_0_34px_rgba(255,106,0,0.07)] backdrop-blur md:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-orange-300/70">PLAY REQUEST</p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    {listenCopy.playMySong}
                  </h2>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-500">
                    {barText(lang, "上傳後不打斷現在播放；這首播完優先插播新投稿。每 1 小時最多 8 首，其餘排到下一小時。", "Uploads do not interrupt the current song; new submissions get priority next. Up to 8 air per 1-hour batch, with overflow pushed to the next hour.", "投稿しても現在の再生は中断されません。次の枠で新しい投稿が優先され、1時間に最大8曲、それ以降は次の時間帯へ送られます。", "업로드해도 현재 재생은 중단되지 않습니다. 새 업로드는 다음 순서에서 우선 재생되며, 시간당 최대 8곡 이후에는 다음 시간대로 넘어갑니다.")}
                  </p>
                </div>
                {visitorAvatarUrl && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-orange-300/55 bg-black shadow-[0_0_26px_rgba(255,106,0,0.18)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={visitorAvatarUrl} alt={userName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>

              <SafetyNotice kind="upload" compact className="mb-3" />
              {publicUploadMessage && (
                <div className="mb-3 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-50">
                  {publicUploadMessage}
                </div>
              )}
              {publicUploadError && (
                <p className="mb-3 rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">{publicUploadError}</p>
              )}

              <form onSubmit={handlePublicUploadSubmit} className="grid gap-3">
                <label
                  className={`group relative flex min-h-[5.9rem] cursor-pointer overflow-hidden rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    publicAudioFile
                      ? "border-rose-200/68 bg-rose-500/[0.1] shadow-[0_0_42px_rgba(255,49,80,0.3),inset_0_0_26px_rgba(255,49,80,0.06)] ring-1 ring-rose-100/14 hover:border-rose-100/85 hover:shadow-[0_0_54px_rgba(255,49,80,0.42),inset_0_0_28px_rgba(255,49,80,0.08)]"
                      : "border-rose-200/68 bg-[radial-gradient(circle_at_20%_12%,rgba(255,49,80,0.38),transparent_42%),rgba(255,60,84,0.1)] shadow-[0_0_42px_rgba(255,49,80,0.3),inset_0_0_26px_rgba(255,196,92,0.055)] ring-1 ring-rose-100/14 hover:border-rose-100/90 hover:shadow-[0_0_56px_rgba(255,49,80,0.44),inset_0_0_30px_rgba(255,196,92,0.075)]"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),transparent_36%,rgba(255,255,255,0.025))]" />
                  <span className="relative z-10 flex w-full items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-orange-200/75">
                        {barText(lang, "音訊檔案", "AUDIO FILE", "音声ファイル", "오디오 파일")}
                      </span>
                      <span className="mt-1 block truncate text-lg font-black leading-tight text-white">
                        {publicAudioFile?.name ?? barText(
                          lang,
                          `音檔 MP3 / M4A / AAC / OGG，上限 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}`,
                          `MP3 / M4A / AAC / OGG, max ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}`,
                          `MP3 / M4A / AAC / OGG、最大 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}`,
                          `MP3 / M4A / AAC / OGG, 최대 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}`,
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-400">
                        {barText(lang, "點一下選歌，自動偵測歌名", "Tap to choose; title auto-detects", "タップして選曲すると曲名を自動検出します", "눌러서 곡을 선택하면 제목을 자동 감지합니다")}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${publicAudioFile ? "border-cyan-200/35 bg-cyan-300/10 text-cyan-100" : "border-orange-200/35 bg-black/30 text-orange-100"}`}>
                      {publicAudioFile
                        ? barText(lang, "已選取", "Selected", "選択済み", "선택됨")
                        : barText(lang, "必填", "Required", "必須", "필수")}
                    </span>
                  </span>
                  <input type="file" accept={LISTEN_BAR_AUDIO_UPLOAD_ACCEPT} onChange={handlePublicAudioChange} className="hidden" />
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={publicUploadForm.title}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder={barText(lang, "歌曲名稱", "Track Title", "曲名", "곡 제목")}
                    maxLength={80}
                    required
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.artist}
                    onChange={(event) => setPublicUploadForm((current) => ({
                      ...current,
                      artist: limitListenBarDisplayText(event.target.value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
                    }))}
                    placeholder={barText(lang, "創作者名稱（12字內）", "Creator Name (24 chars max)", "クリエイター名（24文字以内）", "크리에이터 이름(24자 이내)")}
                    maxLength={LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS}
                    title={listenBarShortFieldHint(isZh)}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.aiTool}
                    onChange={(event) => setPublicUploadForm((current) => ({
                      ...current,
                      aiTool: limitListenBarDisplayText(event.target.value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
                    }))}
                    placeholder={barText(lang, "AI 工具（12字內）", "AI Tool (24 chars max)", "AIツール（24文字以内）", "AI 도구(24자 이내)")}
                    maxLength={LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS}
                    title={listenBarShortFieldHint(isZh)}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <select
                    value={publicUploadForm.genre}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, genre: event.target.value }))}
                    required
                    aria-label={t("genre")}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  >
                    <option value="">{t("genre_placeholder")}</option>
                    {LISTEN_BAR_GENRES.map((genre) => (
                      <option key={genre.value} value={genre.value}>
                        {t(genre.labelKey)}
                      </option>
                    ))}
                  </select>
                  <input
                    value={publicUploadForm.album}
                    onChange={(event) => setPublicUploadForm((current) => ({
                      ...current,
                      album: limitListenBarDisplayText(event.target.value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
                    }))}
                    placeholder={barText(lang, "專輯名稱（12字內，選填）", "Album Name (24 chars max)", "アルバム名（任意・24文字以内）", "앨범명(선택, 24자 이내)")}
                    maxLength={LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS}
                    title={listenBarShortFieldHint(isZh)}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.description}
                    onChange={(event) => setPublicUploadForm((current) => ({
                      ...current,
                      description: limitListenBarDisplayText(event.target.value, LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS),
                    }))}
                    placeholder={barText(lang, "一句歌曲介紹（16字內，選填）", "One-Line Description (32 chars max)", "曲の紹介（任意・32文字以内）", "한 줄 곡 소개(선택, 32자 이내)")}
                    maxLength={LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS}
                    title={listenBarDescriptionHint(isZh)}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    type="url"
                    value={publicUploadForm.youtubeUrl}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, youtubeUrl: event.target.value.slice(0, 300) }))}
                    placeholder={barText(lang, "YouTube MV 連結（選填）", "YouTube MV Link (optional)", "YouTube MVリンク（任意）", "YouTube MV 링크(선택)")}
                    maxLength={300}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18 sm:col-span-2"
                  />
                </div>

                {uploadGenre && (
                  <div
                    className={`rounded-xl border px-3 py-3 ${
                      publicUploadBlocked
                        ? "border-red-300/30 bg-red-500/10"
                        : uploadWillEnterChallenger
                          ? "border-orange-300/28 bg-orange-500/10"
                          : "border-cyan-200/24 bg-cyan-300/[0.075]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p
                        className={`text-xs font-black ${
                          publicUploadBlocked
                            ? "text-red-100"
                            : uploadWillEnterChallenger
                              ? "text-orange-100"
                              : "text-cyan-50"
                        }`}
                      >
                        {uploadPhaseNoticeTitle}
                      </p>
                      <span className="rounded-full border border-white/10 bg-black/28 px-2.5 py-1 text-[11px] font-black text-white/82">
                        {uploadGenreStats.public}/{LISTEN_BAR_GENRE_POOL_LIMIT}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold leading-5 text-zinc-400">
                      {uploadPhaseNoticeBody}
                    </p>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-300/[0.055] px-3 text-xs font-black text-cyan-100 transition hover:border-cyan-100/50">
                    {publicCoverFile?.name ?? barText(lang, "封面可選", "Optional Cover", "カバー画像（任意）", "커버 이미지(선택)")}
                    <input
                      type="file"
                      accept={IMAGE_UPLOAD_ACCEPT}
                      onChange={handlePublicCoverChange}
                      className="hidden"
                    />
                  </label>
                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-orange-300/24 bg-orange-500/10 px-3 text-xs font-black text-orange-100 transition hover:border-orange-200/70">
                    {barText(lang, "歌詞 .txt/.lrc", "Lyrics .txt/.lrc", "歌詞 .txt/.lrc", "가사 .txt/.lrc")}
                    <input type="file" accept=".txt,.lrc,text/plain" onChange={handlePublicLyricsFileChange} className="hidden" />
                  </label>
                </div>

                <textarea
                  value={publicLyricsText}
                  onChange={(event) => setPublicLyricsText(event.target.value.slice(0, 12000))}
                  rows={3}
                  placeholder={barText(lang, "貼上歌詞，LRC 時間碼可同步播放...", "Paste lyrics; LRC timestamps can sync...", "歌詞を貼り付け。LRCタイムコードで同期できます…", "가사를 붙여 넣으세요. LRC 타임코드로 동기화할 수 있습니다…")}
                  className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-black/62 px-3 py-2 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                />

                <button
                  type="submit"
                  disabled={publicUploadBusy || publicUploadBlocked || !publicAudioFile}
                  className="h-12 rounded-xl bg-orange-500 px-5 text-sm font-black tracking-[0.12em] text-black shadow-[0_0_28px_rgba(255,106,0,0.24)] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/[0.045] disabled:text-zinc-500 disabled:shadow-none"
                >
                  {publicUploadBusy
                    ? barText(lang, "上傳中...", "Uploading...", "投稿中…", "업로드 중…")
                    : creatorGenrePublicLimitFull
                      ? barText(lang, "此類須降到4首", "Reduce Genre to 4", "同ジャンルを4曲に減らす", "이 장르를 4곡으로 줄이기")
                      : creatorDailyUploadLimitFull
                        ? barText(lang, "今日額度已滿", "Daily Limit Used", "本日の上限に到達", "오늘 한도 소진")
                        : challengerSlotsFull
                          ? barText(lang, "挑戰席已滿", "Seats Full", "挑戦枠が満席", "도전 좌석 만석")
                          : listenCopy.playMySong}
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="rounded-[1.55rem] border border-cyan-200/16 bg-black/62 px-4 py-4 shadow-[0_22px_64px_rgba(0,0,0,0.4),0_0_34px_rgba(0,202,255,0.055)] backdrop-blur">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/70">CHALLENGER POOL</p>
              <h2 className="mt-1 text-2xl font-black text-white">{barText(lang, "挑戰池", "Challenger Pool", "チャレンジャープール", "챌린저 풀")}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1 text-[11px] font-black text-orange-100">
                {barText(lang, `${challengerQueueTracks.length} 首正在挑戰`, `${challengerQueueTracks.length} Challengers`, `${challengerQueueTracks.length}曲が挑戦中`, `${challengerQueueTracks.length}곡 도전 중`)}
              </span>
              <span className="rounded-full border border-cyan-200/18 bg-cyan-300/8 px-3 py-1 text-[11px] font-black text-cyan-100">
                {barText(lang, `每批 1 小時最多 ${LISTEN_BAR_CHALLENGER_HOURLY_LIMIT} 首新歌上公播`, `${LISTEN_BAR_CHALLENGER_HOURLY_LIMIT} new songs per 1-hour airplay batch`, `1時間の放送枠につき新曲は最大${LISTEN_BAR_CHALLENGER_HOURLY_LIMIT}曲`, `1시간 방송 배치당 신곡 최대 ${LISTEN_BAR_CHALLENGER_HOURLY_LIMIT}곡`)}
              </span>
            </div>
          </div>
          {challengerQueueTracks.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {challengerQueueTracks.slice(0, 12).map((track, index) => (
                <div key={track.id} className="grid min-h-[5.5rem] grid-cols-[auto_1fr] items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/35 bg-orange-500/12 text-sm font-black tabular-nums text-orange-100">
                    #{index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      {isNewlyPublishedMusic(track.createdAt) ? <NewMusicBadge lang={lang} className="shrink-0" /> : null}
                      <p className="min-w-0 truncate text-sm font-black text-white" title={track.title}>{track.title}</p>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-zinc-500">
                      {track.artist} · {formatDuration(track.duration)} · {track.positiveReactionCount ?? 0} {barText(lang, "愛心", "hearts", "Heart", "Heart")}
                    </p>
                    <p className="mt-1 text-[11px] font-black text-cyan-100/80">
                      {isZh ? `Challenger #${index + 1}` : `Challenger #${index + 1}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-white/8 bg-black/35 px-4 py-5 text-sm font-bold text-zinc-500">
              {barText(lang, `目前沒有 Challenger，新投稿會優先排入挑戰池保護 ${LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS}H。`, `No Challengers yet. New uploads enter Challenger protection for ${LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS}H first.`, `現在チャレンジャーはいません。新規投稿は最初に${LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS}時間の保護枠へ入ります。`, `현재 챌린저가 없습니다. 새 업로드는 먼저 ${LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS}시간 보호 구간에 들어갑니다.`)}
            </p>
          )}
        </section>

        <section className="grid min-w-0 gap-4 lg:grid-cols-[1.08fr_1.1fr_0.82fr]">
          <div className="min-w-0 rounded-[1.45rem] border border-orange-300/18 bg-black/58 px-4 py-4 shadow-[0_20px_58px_rgba(0,0,0,0.38)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-200/75">
              {barText(lang, "公播規則", "AIRPLAY RULES", "放送ルール", "방송 규칙")}
            </p>
            <p className="mt-2 break-words text-sm font-bold leading-6 text-zinc-300 [overflow-wrap:anywhere]">
              {barText(
                lang,
                `傷心酒吧不是排行榜，而是 AIPOGER 的 AI 音樂公播池與投稿入口。上傳後歌曲會進入分類輪播，也會出現在探索 AI 音樂。來訪者可選公播或指定類型播放；目前 ${LISTEN_BAR_GENRES.length} 種類型每類滿池 ${LISTEN_BAR_GENRE_POOL_LIMIT} 首，總公播池上限 ${LISTEN_BAR_TOTAL_ROTATION_LIMIT} 首。未滿池的新投稿直接進同類公播池；滿池後才進 Challenger。Showtime 是 AIPOGER 認可作品庫，入選後作品離開公播與探索接戰。`,
                `Bar Heartbreak is not a chart. It is AIPOGER's AI music airplay pool and submission entry. Uploaded tracks rotate by genre and also appear in Explore AI Music. Each of the ${LISTEN_BAR_GENRES.length} genres has a ${LISTEN_BAR_GENRE_POOL_LIMIT}-track public pool, for ${LISTEN_BAR_TOTAL_ROTATION_LIMIT} public slots total. New submissions enter the same-genre public pool until that genre is full; after that they enter Challenger. Showtime is AIPOGER's certified catalog; certified works leave public airplay and Explore challenges.`,
                `Bar Heartbreakはランキングではなく、AIPOGERのAI音楽放送プール兼投稿入口です。投稿曲はジャンル別にローテーションされ、Explore AI Musicにも表示されます。${LISTEN_BAR_GENRES.length}ジャンルは各${LISTEN_BAR_GENRE_POOL_LIMIT}曲、合計${LISTEN_BAR_TOTAL_ROTATION_LIMIT}枠。空きがある間は同ジャンルの放送枠へ、満杯になるとChallengerへ進みます。Showtime認定作品は放送とExploreの挑戦枠を卒業します。`,
                `Bar Heartbreak는 순위표가 아니라 AIPOGER의 AI 음악 방송 풀 겸 업로드 입구입니다. 업로드한 곡은 장르별로 순환 재생되며 Explore AI Music에도 표시됩니다. ${LISTEN_BAR_GENRES.length}개 장르는 각각 ${LISTEN_BAR_GENRE_POOL_LIMIT}곡, 총 ${LISTEN_BAR_TOTAL_ROTATION_LIMIT}개 공개 방송 슬롯을 가집니다. 빈자리가 있으면 같은 장르 방송 풀에, 가득 차면 Challenger에 들어갑니다. Showtime 인증 작품은 방송과 Explore 도전에서 졸업합니다.`,
              )}
            </p>
          </div>

          <div className="min-w-0 rounded-[1.45rem] border border-cyan-200/14 bg-black/58 px-3 py-3 shadow-[0_20px_58px_rgba(0,0,0,0.38)] backdrop-blur sm:px-4 sm:py-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:mb-3 sm:gap-3">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">{barText(lang, "我的吧台歌曲", "My Bar Tracks", "マイ・バートラック", "내 바 트랙")}</p>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <span className="max-w-full rounded-full border border-orange-300/18 bg-orange-500/8 px-2 py-0.5 text-[11px] font-black text-orange-100">
                  {isZh ? `Challenger ${displayedChallengerSlotCount}/${challengerSlotLimit}` : `${displayedChallengerSlotCount}/${challengerSlotLimit} Challengers`}
                </span>
                <span className="max-w-full rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
                  {barText(lang, `${myPublicStats.length} 公播`, `${myPublicStats.length} public`, `${myPublicStats.length}曲 放送中`, `${myPublicStats.length}곡 공개 방송`)}
                </span>
              </div>
            </div>
            {myBroadcastStats.length > 0 ? (
              <div className="grid max-h-72 min-w-0 gap-1.5 overflow-y-auto overflow-x-hidden pr-1 sm:max-h-56 sm:gap-2">
                {[...myChallengerStats, ...myPublicStats].slice(0, 6).map((track) => {
                  const keepPercent = track.barPhase === "public"
                    ? 100
                    : challengerProtectionPercent(track.createdAt);
                  const challengerRank = challengerRankById.get(track.id);
                  const statusLabel = track.barPhase === "public"
                    ? isZh
                      ? `公播 Day ${listenBarPublicDisplayDay(track.promotedAt, track.createdAt, Date.now(), survivalStartedAtByGenre.get(track.genre) ?? null)}`
                      : `Public Day ${listenBarPublicDisplayDay(track.promotedAt, track.createdAt, Date.now(), survivalStartedAtByGenre.get(track.genre) ?? null)}`
                    : challengerRank
                      ? `Challenger #${challengerRank}`
                      : "Challenger";
                  return (
                    <div key={track.id} className="min-w-0 rounded-xl border border-white/8 bg-white/[0.035] px-2.5 py-2 sm:px-3">
                      <div className="min-w-0 overflow-hidden">
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              {isNewlyPublishedMusic(track.createdAt) ? <NewMusicBadge lang={lang} className="shrink-0" /> : null}
                              <p className="min-w-0 truncate text-sm font-black text-white">{track.title}</p>
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-bold text-zinc-500">
                              {statusLabel} · {formatDuration(track.duration)} · {track.positives} hearts
                            </p>
                          </div>
                          <div className="grid shrink-0 grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => openEditTrackDetails(track)}
                            className="h-7 whitespace-nowrap rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 text-[10px] font-black text-cyan-100 transition hover:border-cyan-100/70 hover:bg-cyan-300/16 sm:px-2.5 sm:text-[11px]"
                          >
                            {editTrackId === track.id ? (isZh ? "收起" : "Close") : (isZh ? "補資料" : "Edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveMyTrack(track)}
                            disabled={removeTrackBusyId === track.id}
                            className="h-7 whitespace-nowrap rounded-full border border-red-300/30 bg-red-500/12 px-2 text-[10px] font-black text-red-100 transition hover:border-red-200/70 hover:bg-red-500/18 disabled:cursor-wait disabled:opacity-50 sm:px-2.5 sm:text-[11px]"
                          >
                            {removeTrackBusyId === track.id ? (isZh ? "撤下中" : "Removing") : (isZh ? "撤下" : "Remove")}
                          </button>
                          </div>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-bold text-zinc-500 sm:gap-x-2 sm:text-[11px]">
                          {track.youtubeUrl && (
                            <a
                              href={track.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-red-300/25 bg-red-500/10 px-1.5 py-0.5 font-black text-red-100 transition hover:border-red-200 sm:px-2"
                            >
                              {isZh ? "看 MV" : "Watch MV"}
                            </a>
                          )}
                          <span>{genreDisplayLabel(track.genre, lang)}</span>
                          <span>{track.aiTool || "AI Music"}</span>
                        </p>
                      </div>
                      {editTrackId === track.id && (
                        <div className="mt-2 grid gap-2 rounded-xl border border-cyan-200/12 bg-black/35 p-2.5 sm:mt-3 sm:p-3">
                          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                            <input
                              value={editTrackForm.aiTool}
                              onChange={(event) => setEditTrackForm((current) => ({
                                ...current,
                                aiTool: limitListenBarDisplayText(event.target.value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
                              }))}
                              placeholder={isZh ? "AI 工具（12字內）" : "AI Tool (24 chars max)"}
                              maxLength={LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS}
                              title={listenBarShortFieldHint(isZh)}
                              className="h-9 rounded-xl border border-white/10 bg-black/58 px-3 text-xs font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/15 sm:h-10"
                            />
                            <select
                              value={editTrackForm.genre}
                              onChange={(event) => setEditTrackForm((current) => ({ ...current, genre: event.target.value }))}
                              className="h-9 rounded-xl border border-white/10 bg-black/58 px-3 text-xs font-bold text-white outline-none transition focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/15 sm:h-10"
                            >
                              {LISTEN_BAR_GENRES.map((genre) => (
                                <option key={genre.value} value={genre.value}>
                                  {t(genre.labelKey)}
                                </option>
                              ))}
                            </select>
                            <input
                              value={editTrackForm.album}
                              onChange={(event) => setEditTrackForm((current) => ({
                                ...current,
                                album: limitListenBarDisplayText(event.target.value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS),
                              }))}
                              placeholder={isZh ? "專輯名稱（12字內，選填）" : "Album Name (24 chars max)"}
                              maxLength={LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS}
                              title={listenBarShortFieldHint(isZh)}
                              className="h-9 rounded-xl border border-white/10 bg-black/58 px-3 text-xs font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/15 sm:h-10"
                            />
                            <input
                              value={editTrackForm.description}
                              onChange={(event) => setEditTrackForm((current) => ({
                                ...current,
                                description: limitListenBarDisplayText(event.target.value, LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS),
                              }))}
                              placeholder={isZh ? "一句歌曲介紹（16字內，選填）" : "One-Line Description (32 chars max)"}
                              maxLength={LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS}
                              title={listenBarDescriptionHint(isZh)}
                              className="h-9 rounded-xl border border-white/10 bg-black/58 px-3 text-xs font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/15 sm:h-10"
                            />
                            <input
                              type="url"
                              value={editTrackForm.youtubeUrl}
                              onChange={(event) => setEditTrackForm((current) => ({ ...current, youtubeUrl: event.target.value.slice(0, 300) }))}
                              placeholder={isZh ? "YouTube MV 連結（選填）" : "YouTube MV Link (optional)"}
                              maxLength={300}
                              className="h-9 rounded-xl border border-white/10 bg-black/58 px-3 text-xs font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/15 sm:col-span-2 sm:h-10"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleSaveTrackDetails(track)}
                            disabled={editTrackBusy}
                            className="h-9 rounded-xl border border-cyan-200/25 bg-cyan-300/12 px-3 text-xs font-black text-cyan-50 transition hover:border-cyan-100 hover:bg-cyan-300/18 disabled:cursor-wait disabled:opacity-55 sm:h-10"
                          >
                            {editTrackBusy ? (isZh ? "儲存中" : "Saving") : (isZh ? "儲存歌曲資料" : "Save Details")}
                          </button>
                        </div>
                      )}
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-cyan-300" style={{ width: `${keepPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-white/8 bg-black/32 px-3 py-4 text-sm text-zinc-500">
                {userId
                  ? barText(lang, "尚未有 Challenger 或公播池歌曲。", "No Challenger or Public Pool tracks yet.", "Challengerまたは放送中の曲はまだありません。", "Challenger 또는 공개 방송 곡이 아직 없습니다.")
                  : barText(lang, "你的投稿與挑戰紀錄會顯示在這裡。", "Your submissions and challenge record will appear here.", "投稿と挑戦の記録はここに表示されます。", "업로드와 도전 기록이 여기에 표시됩니다.")}
              </p>
            )}
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-[1.45rem] border border-orange-300/18 bg-[radial-gradient(circle_at_50%_0%,rgba(255,106,0,0.16),transparent_48%),rgba(0,0,0,0.58)] px-4 py-4 shadow-[0_20px_58px_rgba(0,0,0,0.38)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-200/75">
              {barText(lang, "公播歌池", "AIRPLAY POOL", "放送プール", "방송 풀")}
            </p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-black tabular-nums text-white">{publicPoolTracks.length}</span>
              <span className="pb-1 text-sm font-black text-zinc-500">
                / {LISTEN_BAR_TOTAL_ROTATION_LIMIT}
              </span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">
              {barText(
                lang,
                `${totalCommunityTrackCount} 首投稿歌進入傷心酒吧；${publicPoolTracks.length} 首正在公播。${LISTEN_BAR_GENRES.length} 種類型各自滿池 ${LISTEN_BAR_GENRE_POOL_LIMIT} 首，先同類比較，再進 Showtime。`,
                `${totalCommunityTrackCount} creator tracks are in Bar Heartbreak; ${publicPoolTracks.length} are on public airplay. Each genre fills its own ${LISTEN_BAR_GENRE_POOL_LIMIT}-track pool before survival starts.`,
                `${totalCommunityTrackCount}曲がBar Heartbreakに参加し、${publicPoolTracks.length}曲を放送中。${LISTEN_BAR_GENRES.length}ジャンルは各${LISTEN_BAR_GENRE_POOL_LIMIT}曲まで、同ジャンル内で競いShowtimeを目指します。`,
                `${totalCommunityTrackCount}곡이 Bar Heartbreak에 참여했고 ${publicPoolTracks.length}곡이 공개 방송 중입니다. ${LISTEN_BAR_GENRES.length}개 장르는 각각 ${LISTEN_BAR_GENRE_POOL_LIMIT}곡까지 채운 뒤 같은 장르 안에서 Showtime을 향해 경쟁합니다.`,
              )}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-300 to-cyan-300"
                style={{ width: `${Math.min(100, (publicPoolTracks.length / LISTEN_BAR_TOTAL_ROTATION_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
        </section>
      </div>
      <AuthRequiredDialog
        open={authPromptOpen}
        kind="heart"
        lang={lang}
        nextPath={`/listen-bar?lang=${lang}${nowTrack.id ? `&track=${encodeURIComponent(nowTrack.id)}` : ""}`}
        onClose={() => setAuthPromptOpen(false)}
      />
    </main>
  );
}
