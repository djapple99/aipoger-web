"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import LangToggle from "@/components/lang-toggle";
import SafetyNotice from "@/components/safety-notice";
import { fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { parseAudioMetadata } from "@/lib/audio-metadata";
import { sha256File } from "@/lib/file-hash";
import { supabase } from "@/lib/supabase";
import { loadFighterNameFromProfile } from "@/lib/user-profile-fighter-name";
import ShareButton from "@/components/share-button";
import { shouldExpireOpenDropQueue } from "@/lib/battle-pool-client";
import {
  DEFAULT_LISTEN_BAR_COVER,
  LISTEN_BAR_AUDIO_BUCKET,
  LISTEN_BAR_CHALLENGER_HOURLY_LIMIT,
  LISTEN_BAR_CHALLENGER_SLOT_LIMIT,
  LISTEN_BAR_COVER_BUCKET,
  LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
  LISTEN_BAR_JUDGMENT_INTERVAL_HOURS,
  LISTEN_BAR_PUBLIC_EVICTION_LIMIT,
  LISTEN_BAR_PUBLIC_REACTION_THRESHOLD,
  LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
  LISTEN_BAR_TOTAL_ROTATION_LIMIT,
  EMPTY_LISTEN_BAR_TRACK,
  fallbackOfficialPlaylist,
  listenBarRowToTrack,
  type ListenBarTrack,
  type ListenBarTrackRow,
} from "@/lib/listen-bar";
import { usePresenceCount } from "@/lib/use-presence-count";
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

type MyBroadcastStat = {
  id: string;
  title: string;
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

const reactionOptions: Array<{ key: ReactionKey; label: string; icon: string }> = [
  { key: "heart", label: "愛心", icon: "♥" },
  { key: "star", label: "星星", icon: "★" },
  { key: "thumb", label: "大拇指", icon: "👍" },
  { key: "happy", label: "開心", icon: "☺" },
];

const emptyReactions: ReactionCounts = {
  heart: 0,
  star: 0,
  thumb: 0,
  happy: 0,
};

const LISTEN_BAR_MESSAGE_LIMIT = 80;
const AUDIO_UPLOAD_ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aiff,audio/x-aiff,audio/mp4,audio/aac,.mp3,.wav,.aif,.aiff,.m4a,.aac";
const LIVE_RADIO_EPOCH_MS = Date.UTC(2026, 0, 1);
const PRIORITY_AIRPLAY_BATCH_MS = 60 * 60 * 1000;
const STOP_HOME_BGM_EVENT = "aipoger:stop-home-bgm";
const heartbreakTitleFont =
  '"GenYoMin TW", "GenYoMin JP", "Hiragino Mincho ProN", "Songti TC", "Noto Serif TC", "PMingLiU", "SoukouMincho", serif';

type PublicUploadForm = {
  title: string;
  artist: string;
  aiTool: string;
  genre: string;
  album: string;
};

const initialPublicUploadForm: PublicUploadForm = {
  title: "",
  artist: "",
  aiTool: "",
  genre: "AI Music",
  album: "",
};

function isMissingListenBarSubmissionColumn(error: unknown): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /audio_sha256|bar_phase|promoted_at|removed_at|schema cache|column.*does not exist|PGRST204/i.test(text);
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
      ? `AI音樂鬥歌場快訊：${fighterName} 的《${songName}》正在等人接戰${timeText}，快來挑戰或觀戰。`
      : `AI Music Battle Hall: ${fighterName}'s "${songName}" is open for challenge${timeText}. Step in, watch, or back the Drop.`;
  }

  if (row.status === "public_voting") {
    return isZh
      ? `AI音樂鬥歌場快訊：《${songName}》正在公開投票${timeText}，進場支持你喜歡的 Drop。`
      : `AI Music Battle Hall: "${songName}" is in public voting${timeText}. Help decide if this Drop earns recognition.`;
  }

  return isZh
    ? `AI音樂鬥歌場快訊：《${songName}》已進入 Ghost Battle${timeText}，進場聽歌投票。`
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

function audioContentTypeFallback(file: File) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".aif") || name.endsWith(".aiff")) return "audio/aiff";
  if (name.endsWith(".wav")) return "audio/wav";
  if (name.endsWith(".m4a")) return "audio/mp4";
  if (name.endsWith(".aac")) return "audio/aac";
  return "audio/mpeg";
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

function albumDisplayLabel(value: string, isZh: boolean) {
  const cleanValue = value
    .replace(/^AI Music\s*\/\s*/i, "")
    .replace(/^官方公播\s*\/\s*/i, "")
    .replace(/^專輯名稱\s*\/\s*/i, "")
    .trim();
  if (!cleanValue || cleanValue === "官方輪播") return "";
  if (cleanValue === "創作者投稿" || cleanValue === "Creator submission" || cleanValue === "Creator Submission") return isZh ? "創作者投稿" : "Creator Submission";
  return isZh ? `專輯名稱 / ${cleanValue}` : `Album / ${cleanValue}`;
}

function survivalDayFromDate(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 0;
  return Math.max(1, Math.ceil((Date.now() - time) / (24 * 60 * 60 * 1000)));
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
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const lyricScrollRef = useRef<HTMLDivElement | null>(null);
  const activeLyricRef = useRef<HTMLDivElement | null>(null);
  const listenBarSyncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const servedCommunityIdsRef = useRef<Set<string>>(new Set());
  const liveSeekRef = useRef<{ trackId: string; offset: number } | null>(null);
  const startTrackAtZeroRef = useRef(false);
  const liveRadioSyncEnabledRef = useRef(true);
  const rotationTracksRef = useRef<ListenBarTrack[]>([]);
  const nowTrackRef = useRef<ListenBarTrack>(EMPTY_LISTEN_BAR_TRACK);
  const radioShouldResumeRef = useRef(true);
  const volumeRef = useRef(0.72);
  const [userName, setUserName] = useState("吧友");
  const [visitorAvatarUrl, setVisitorAvatarUrl] = useState<string | null>(null);
  const [creatorDefaultName, setCreatorDefaultName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [officialTracks, setOfficialTracks] = useState<ListenBarTrack[]>(fallbackOfficialPlaylist);
  const [playlistStatus, setPlaylistStatus] = useState<"loading" | "database" | "fallback">("loading");
  const [priorityAirplayIds, setPriorityAirplayIds] = useState<Set<string>>(() => new Set());
  const [challengerSlotCount, setChallengerSlotCount] = useState(0);
  const [publicUploadForm, setPublicUploadForm] = useState<PublicUploadForm>(initialPublicUploadForm);
  const [publicAudioFile, setPublicAudioFile] = useState<File | null>(null);
  const [publicCoverFile, setPublicCoverFile] = useState<File | null>(null);
  const [publicLyricsText, setPublicLyricsText] = useState("");
  const [publicUploadBusy, setPublicUploadBusy] = useState(false);
  const [removeTrackBusyId, setRemoveTrackBusyId] = useState<string | null>(null);
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
  const [reactionCounts, setReactionCounts] = useState<Record<string, ReactionCounts>>({});
  const [myReactions, setMyReactions] = useState<Record<string, ReactionKey | null>>({});
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
      ? isZh
        ? "現場升溫中"
        : "Warming Up"
      : isZh
        ? `${listenBarPresenceCount} 人正在傷心酒吧`
        : `${listenBarPresenceCount} Listeners`;
  const markPriorityAirplayTrack = useCallback((trackId: string) => {
    if (!trackId) return;
    setPriorityAirplayIds((ids) => {
      if (ids.has(trackId)) return ids;
      const nextIds = new Set(ids);
      nextIds.add(trackId);
      return nextIds;
    });
  }, []);
  const rotationTracks = useMemo(() => {
    const seen = new Set<string>();
    return officialTracks.filter((track) => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });
  }, [officialTracks]);
  const communityRequestTracks = useMemo(
    () => rotationTracks.filter((track) => track.source === "community"),
    [rotationTracks],
  );
  const publicPoolTracks = useMemo(
    () => communityRequestTracks.filter((track) => track.barPhase === "public"),
    [communityRequestTracks],
  );
  const challengerTracks = useMemo(
    () => communityRequestTracks.filter((track) => track.barPhase !== "public"),
    [communityRequestTracks],
  );
  const openingPhaseActive = publicPoolTracks.length < LISTEN_BAR_PUBLIC_ROTATION_LIMIT;
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
  const challengerSlotsFull = !openingPhaseActive && challengerSlotCount >= LISTEN_BAR_CHALLENGER_SLOT_LIMIT;

  useEffect(() => {
    window.dispatchEvent(new Event(STOP_HOME_BGM_EVENT));
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
        .sort((a, b) => {
          const phaseA = a.bar_phase === "public" ? 0 : 1;
          const phaseB = b.bar_phase === "public" ? 0 : 1;
          if (phaseA !== phaseB) return phaseA - phaseB;
          return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
        })
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
        const livePosition = liveRadioSyncEnabledRef.current ? getLiveRadioPosition(tracks) : null;
        if (livePosition) liveSeekRef.current = { trackId: livePosition.track.id, offset: livePosition.offset };
        setNowTrack((current) => {
          if (!liveRadioSyncEnabledRef.current && tracks.some((track) => track.id === current.id)) return current;
        return livePosition?.track ?? pickRandomTrack(tracks) ?? tracks[0];
        });
      setPlaylistStatus("database");
    };

    void loadMessages();
    void loadPlaylist();
    return () => {
      mounted = false;
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
      setPublicUploadForm((current) => ({ ...current, artist: current.artist || creatorDefaultName }));
    }
  }, [creatorDefaultName]);

  useEffect(() => {
    if (!userId || rotationTracks.length === 0) {
      setMyReactions({});
      return;
    }

    let mounted = true;
    const loadMyReactions = async () => {
      const trackIds = rotationTracks.map((track) => track.id).slice(0, LISTEN_BAR_TOTAL_ROTATION_LIMIT);
      const { data, error } = await supabase
        .from("listen_bar_track_reactions")
        .select("track_id, reaction")
        .eq("user_id", userId)
        .in("track_id", trackIds);

      if (!mounted) return;
      if (error) {
        console.warn("[listen-bar] my reactions", error);
        return;
      }

      const nextReactions = (data as Array<{ track_id?: string | null; reaction?: ReactionKey | null }> | null) ?? [];
      const reactions = nextReactions.reduce<Record<string, ReactionKey | null>>((acc, row) => {
        if (row.track_id && row.reaction) acc[row.track_id] = row.reaction;
        return acc;
      }, {});
      setMyReactions(reactions);
    };

    void loadMyReactions();
    return () => {
      mounted = false;
    };
  }, [rotationTracks, userId]);

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
    const queuedRequest = getPriorityAirplayBatch(priorityAirplaySourceTracks, servedCommunityIdsRef.current, nowTrack.id)[0] ?? null;
    if (queuedRequest) {
      servedCommunityIdsRef.current.add(queuedRequest.id);
      startTrackAtZeroRef.current = true;
      liveRadioSyncEnabledRef.current = false;
      liveSeekRef.current = { trackId: queuedRequest.id, offset: 0 };
      setElapsed(0);
      setNowTrack(queuedRequest);
      return;
    }

    const playableTracks = rotationTracks.filter((track) => track.audioUrl && track.id !== nowTrack.id);
    if (playableTracks.length === 0) {
      setElapsed(0);
      return;
    }

    const currentIndex = rotationTracks.findIndex((track) => track.id === nowTrack.id);
    const nextTrack =
      currentIndex >= 0
        ? Array.from({ length: rotationTracks.length }, (_, index) => rotationTracks[(currentIndex + index + 1) % rotationTracks.length])
            .find((track) => track?.audioUrl && track.id !== nowTrack.id)
        : playableTracks[0];

    if (!nextTrack) {
      setElapsed(0);
      return;
    }

    startTrackAtZeroRef.current = true;
    liveRadioSyncEnabledRef.current = false;
    liveSeekRef.current = { trackId: nextTrack.id, offset: 0 };
    setElapsed(0);
    setNowTrack(nextTrack);
  }, [nowTrack, priorityAirplaySourceTracks, rotationTracks]);

  useEffect(() => {
    const forceStart = startTrackAtZeroRef.current;
    const livePosition = forceStart || nowTrack.source === "community" || !liveRadioSyncEnabledRef.current ? null : getLiveRadioPosition(rotationTracksRef.current);
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
      const livePosition = nowTrack.source === "community" || !liveRadioSyncEnabledRef.current ? null : getLiveRadioPosition(rotationTracksRef.current);
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
    audio.volume = volumeRef.current;
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
  }, [nowTrack.audioUrl, nowTrack.duration, nowTrack.id, nowTrack.source]);

  useEffect(() => {
    volumeRef.current = volume;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const resumeRadioPlayback = useCallback((syncLivePosition = false, volumeOverride?: number) => {
    const audio = audioRef.current;
    if (!audio || !nowTrack.audioUrl) return;
    radioShouldResumeRef.current = true;
    audio.muted = false;
    audio.volume = volumeOverride ?? volume;
    if (syncLivePosition && audio.readyState >= 1) {
      const livePosition = nowTrack.source === "community" || !liveRadioSyncEnabledRef.current ? null : getLiveRadioPosition(rotationTracksRef.current);
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
  }, [nowTrack.audioUrl, nowTrack.duration, nowTrack.id, nowTrack.source, volume]);

  useEffect(() => {
    if (!playbackBlocked) return;
    const resumeOnGesture = () => resumeRadioPlayback(true);
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
    if (!nowTrack.audioUrl || rotationTracks.length === 0) return;
    if (!liveRadioSyncEnabledRef.current) return;
    if (nowTrack.source === "community") return;
    const timer = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      const livePosition = getLiveRadioPosition(rotationTracks);
      if (!livePosition) return;
      if (livePosition.track.id !== nowTrack.id) {
        liveSeekRef.current = { trackId: livePosition.track.id, offset: livePosition.offset };
        setNowTrack(livePosition.track);
        return;
      }
      if (Math.abs(audio.currentTime - livePosition.offset) > 3) {
        const safeDuration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : livePosition.track.duration;
        audio.currentTime = Math.min(livePosition.offset, Math.max(0, safeDuration - 0.25));
        setElapsed(audio.currentTime);
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [nowTrack, rotationTracks]);

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
    if (playlistStatus === "loading") return isZh ? "電台正在接上訊號..." : "Tuning the Station Signal...";
    if (nextCommunityTrack) {
      return isZh
        ? "插播已排入，下一首上場。"
        : "Creator Track Queued. Next up.";
    }
    return playlistStatus === "database"
      ? (isZh ? "24H 公播中。" : "24H On Air.")
      : (isZh ? "公播準備中。" : "Station Warming Up.");
  }, [isZh, nextCommunityTrack, playlistStatus]);

  const localizedMessages = useMemo(
    () => messages.map((message) => localizeListenBarMessage(message, isZh)),
    [isZh, messages],
  );

  const tryStartRadio = () => {
    resumeRadioPlayback(false);
  };

  const currentReactions = reactionCounts[nowTrack.id] ?? emptyReactions;
  const currentPositiveTotal = Object.values(currentReactions).reduce((sum, count) => sum + count, 0);
  const honorRollQualified = currentPositiveTotal >= LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD;
  const statusText = useMemo(() => {
    if (!nowTrack.audioUrl) return isZh ? "等待投稿" : "Waiting for Uploads";
    if (nowTrack.source === "official") return isZh ? "AIPOGER 官方公播" : "AIPOGER Official";
    if (nowTrack.barPhase === "public") {
      if (currentPositiveTotal >= LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD) {
        return isZh
          ? `榮譽榜資格 · ${currentPositiveTotal} 顆心`
          : `Honor Eligible · ${currentPositiveTotal} hearts`;
      }
      return isZh ? `公播池 · ${currentPositiveTotal} 顆心` : `Public Pool · ${currentPositiveTotal} hearts`;
    }
    return isZh
      ? `Challenger · ${currentPositiveTotal}/${LISTEN_BAR_PUBLIC_REACTION_THRESHOLD} 顆心`
      : `Challenger · ${currentPositiveTotal}/${LISTEN_BAR_PUBLIC_REACTION_THRESHOLD} hearts`;
  }, [currentPositiveTotal, isZh, nowTrack.audioUrl, nowTrack.barPhase, nowTrack.source]);
  const nowTrackTitle = !isZh && nowTrack.id === EMPTY_LISTEN_BAR_TRACK.id ? "Waiting for Creator Uploads" : nowTrack.title;
  const myCurrentReaction = myReactions[nowTrack.id] ?? null;

  const handleReaction = (key: ReactionKey) => {
    tryStartRadio();
    if (!nowTrack.audioUrl) {
      setTrackCommentError(isZh ? "目前沒有播放中的歌曲。" : "No track is playing right now.");
      return;
    }
    if (!userId) {
      setTrackCommentError(isZh ? "請先登入再投票；聽歌不需要登入。" : "Sign in to vote; listening does not require an account.");
      return;
    }
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
        error?: string;
      } | null;
      if (!response.ok || !payload?.counts) throw new Error(payload?.error || "Reaction failed.");
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
        }
        return;
      }

      setTrackCommentError(payload?.error || (isZh ? "歌曲評論送出失敗，請稍後再試。" : "Track comment was not saved."));
    })();
  };

  const handlePublicAudioChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPublicAudioFile(file);
    setPublicUploadError("");
    if (!file) return;

    const metadata = await parseAudioMetadata(file);
    setPublicUploadForm((current) => ({
      ...current,
      title: current.title.trim() || metadata.title || metadata.fallbackTitle,
      artist: current.artist.trim() && current.artist !== userName ? current.artist : metadata.artist || current.artist,
      genre: current.genre.trim() && current.genre !== initialPublicUploadForm.genre ? current.genre : metadata.genre || current.genre,
      album: current.album.trim() || metadata.album || current.album,
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

  const uploadPublicAsset = async (bucket: string, file: File, contentTypeFallback: string) => {
    if (!userId) throw new Error(isZh ? "請先登入再投稿。" : "Sign in before submitting.");
    const path = `${userId}/community/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: file.type || contentTypeFallback,
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const handlePublicUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPublicUploadError("");
    setPublicUploadMessage("");
    if (!userId) {
      setPublicUploadError(isZh ? "請先登入後再投稿傷心酒吧 Bar Heartbreak。" : "Please sign in before submitting to Bar Heartbreak.");
      return;
    }
    if (challengerSlotsFull) {
      setPublicUploadError(
        isZh
          ? `你的 Challenger 已達 ${LISTEN_BAR_CHALLENGER_SLOT_LIMIT} 首。要再上傳，請先撤下一首 Challenger，或等歌曲進入公播池後空出位置。`
          : `You already have ${LISTEN_BAR_CHALLENGER_SLOT_LIMIT} challengers. Remove one Challenger or wait for a promotion before uploading again.`,
      );
      return;
    }
    if (!publicAudioFile) {
      return;
    }
    if (!publicUploadForm.title.trim()) {
      setPublicUploadError(isZh ? "請輸入歌曲名稱。" : "Enter a track title.");
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
      audioPath = await uploadPublicAsset(LISTEN_BAR_AUDIO_BUCKET, publicAudioFile, audioContentTypeFallback(publicAudioFile));
      coverPath = publicCoverFile
        ? await uploadPublicAsset(LISTEN_BAR_COVER_BUCKET, publicCoverFile, "image/jpeg")
        : null;

      const insertPayload = {
        title: publicUploadForm.title.trim(),
        artist: publicUploadForm.artist.trim() || creatorDefaultName || (isZh ? "創作者" : "Creator"),
        ai_tool: publicUploadForm.aiTool.trim() || "AI Music",
        genre: publicUploadForm.genre.trim() || "AI Music",
        mood: publicUploadForm.album.trim() || (isZh ? "創作者投稿" : "Creator Submission"),
        duration_seconds: duration > 0 ? duration : null,
        audio_path: audioPath,
        cover_path: coverPath,
        audio_sha256: audioSha256,
        lyrics: publicLyricsText.trim() || null,
        sort_order: 1000,
        is_active: true,
        source: "community",
        is_featured_official: false,
        bar_phase: "challenger",
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
        insertResult = await supabase
          .from("listen_bar_tracks")
          .insert(fallbackPayload)
          .select("*")
          .maybeSingle<ListenBarTrackRow>();
      }
      const { data: insertedTrackRow, error } = insertResult;
      if (error) throw error;

      const insertedTrack = insertedTrackRow ? listenBarRowToTrack(insertedTrackRow) : null;
      if (insertedTrack) {
        const normalizedTrack = openingPhaseActive
          ? { ...insertedTrack, barPhase: "public" as const, promotedAt: insertedTrack.promotedAt ?? insertedTrack.createdAt ?? new Date().toISOString() }
          : insertedTrack;
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
            duration: normalizedTrack.duration,
            barPhase: normalizedTrack.barPhase ?? "challenger",
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
      if (!openingPhaseActive) setChallengerSlotCount((count) => count + 1);
      setPublicAudioFile(null);
      setPublicCoverFile(null);
      setPublicLyricsText("");
      setPublicUploadForm({ ...initialPublicUploadForm, artist: creatorDefaultName });
      setPublicUploadMessage(
        isZh
          ? `上傳完成！目前這首播完後會優先插播新投稿；每批從第一首投稿開始計 1 小時，最多 8 首，其餘排到下一小時。`
          : "Upload complete. New submissions get priority after the current song; each 1-hour batch starts with the first upload, airs up to 8 tracks, and pushes the rest to the next hour.",
      );
      setPlaylistStatus("database");
    } catch (submitError) {
      if (isDuplicateAudioHashError(submitError)) {
        if (audioPath) void supabase.storage.from(LISTEN_BAR_AUDIO_BUCKET).remove([audioPath]);
        if (coverPath) void supabase.storage.from(LISTEN_BAR_COVER_BUCKET).remove([coverPath]);
      }
      setPublicUploadError(
        isDuplicateAudioHashError(submitError)
          ? isZh
            ? "這個音檔已經上傳過了，請換另一首歌。"
            : "This exact audio file has already been uploaded. Please choose another track."
          : isZh
            ? `投稿失敗：${String((submitError as { message?: string })?.message ?? submitError)}。請確認已套用傷心酒吧投稿 SQL。`
            : `Submission failed: ${String((submitError as { message?: string })?.message ?? submitError)}. Make sure the Bar Heartbreak submission SQL has been applied.`,
      );
    } finally {
      setPublicUploadBusy(false);
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

      setOfficialTracks((tracks) => tracks.filter((item) => item.id !== track.id));
      if (nowTrack.id === track.id) {
        const replacement = rotationTracks.find((item) => item.id !== track.id && item.audioUrl) ?? EMPTY_LISTEN_BAR_TRACK;
        setNowTrack(replacement);
        setElapsed(0);
      }
      setMyBroadcastStats((tracks) => tracks.filter((item) => item.id !== track.id));
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
  const nowPresenterRank = !isZh && rawPresenterRank === "創作者投稿" ? "Creator Submission" : rawPresenterRank;
  const nowSurvivalDay = nowTrack.source === "community" && nowTrack.barPhase === "public"
    ? survivalDayFromDate(nowTrack.promotedAt ?? nowTrack.createdAt)
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
  const nowAlbumLabel = albumDisplayLabel(nowTrack.mood, isZh);
  const navLinks = [
    { href: "/battle", label: isZh ? "AI音樂鬥歌場" : "AI Music Battle Hall" },
    { href: "/rank", label: isZh ? "榮譽榜" : "Honor Board" },
    { href: "/ai-music-bible", label: isZh ? "練功聖經" : "AI Music Bible" },
    { href: "/about", label: isZh ? "關於愛播歌" : "About" },
  ];
  const battleTickerText = battleTickerMessages.length > 0
    ? battleTickerMessages.join("   /   ")
    : isZh
      ? "歡迎去 AI音樂鬥歌場鬥歌，開戰帖、接挑戰，讓你的 AI 音樂被聽見。"
      : "Welcome to the AI Music Battle Hall. Open a card, accept a challenge, and let your AI music be heard.";

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
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#050505] px-3 py-5 text-zinc-100 sm:px-5 lg:px-7">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_10%,rgba(255,106,0,0.3),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(0,202,255,0.18),transparent_28%),linear-gradient(180deg,#080706_0%,#050505_46%,#090604_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(255,138,43,0.16),transparent_44%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1880px] flex-col gap-4 overflow-x-hidden">
        <header className="relative overflow-hidden rounded-[1.7rem] border border-orange-200/14 bg-black/62 p-4 text-center text-white shadow-[0_24px_74px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur md:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,106,0,0.16),transparent_30%),radial-gradient(circle_at_84%_10%,rgba(0,202,255,0.09),transparent_28%)]" />
          <style>{`
            @keyframes listen-bar-battle-ticker {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .listen-bar-battle-ticker-motion {
                animation: none !important;
                transform: translateX(0) !important;
              }
            }
            @media (max-width: 639px) {
              .listen-bar-battle-ticker-motion {
                animation: none !important;
                transform: translateX(0) !important;
                white-space: normal !important;
                line-height: 1.45 !important;
              }
            }
          `}</style>

          <div className="relative mb-5 ml-auto grid max-w-full grid-cols-2 items-center justify-center gap-2 rounded-[1.15rem] border border-white/10 bg-black/55 px-3 py-2 pl-[4.85rem] shadow-[0_18px_54px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur min-[430px]:pl-3 sm:flex sm:flex-wrap md:w-fit md:justify-end">
            <a
              href="#play-request"
              className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-orange-300/40 bg-orange-500/14 px-3 py-2 text-xs font-black text-orange-100 transition hover:border-orange-100 hover:bg-orange-500/22 sm:px-4"
            >
              {isZh ? "我要播歌！" : "Play My Song"}
            </a>
            <ShareButton
              title={isZh ? "AIPOGER 傷心酒吧 Bar Heartbreak" : "AIPOGER Bar Heartbreak"}
              text={
                isZh
                  ? [
                      "快來來傷心酒吧 Bar Heartbreak",
                      "這麼好聽的歌以後聽不到了怎麼辦？",
                      "只有被聽見留下傷心的歌，才有資格繼續播放",
                    ].join("\n")
                  : [
                      "Come to AIPOGER Bar Heartbreak",
                      "What if this song disappears before you hear it?",
                      "Only the songs that get heard and remembered stay in rotation.",
                    ].join("\n")
              }
              label={isZh ? "分享吧台" : "Share"}
              copiedLabel={isZh ? "已複製" : "Copied"}
            />
            <Link
              href="/battle"
              className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-cyan-300/35 bg-cyan-300/12 px-3 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-100 hover:bg-cyan-300/18 sm:px-4"
            >
              {isZh ? "AI音樂鬥歌場" : "Battle Hall"}
            </Link>
            <LangToggle variant="inline" />
          </div>

          <div className="relative mx-auto flex max-w-5xl flex-col items-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.36em] text-orange-300/80">AIPOGER RADIO</span>
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
                Bar Heartbreak
              </span>
            </div>
            <h1
              className={`mt-3 max-w-full whitespace-nowrap bg-gradient-to-b from-[#fff9d8] via-[#d7a246] to-[#7a3f10] bg-clip-text text-center text-[clamp(2.15rem,13vw,5.35rem)] font-normal leading-none tracking-[0.04em] text-transparent drop-shadow-[0_0_22px_rgba(255,170,68,0.18)] ${isZh ? "" : fontRighteous.className}`}
              style={{
                fontFamily: isZh ? heartbreakTitleFont : undefined,
                WebkitTextStroke: isZh ? "0.45px rgba(255,244,196,0.48)" : undefined,
              }}
            >
              {isZh ? "傷心酒吧" : "Bar Heartbreak"}
            </h1>
            <p
              className={`mt-3 max-w-3xl bg-gradient-to-b from-[#f7e6a9] via-[#c98e34] to-[#80501d] bg-clip-text text-center text-sm font-bold leading-6 tracking-[0.08em] text-transparent drop-shadow-[0_0_14px_rgba(255,170,68,0.12)] md:text-base ${isZh ? "" : fontRighteous.className}`}
              style={{ fontFamily: isZh ? heartbreakTitleFont : undefined }}
            >
              {isZh ? "在 AI 與不 AI 之間，只有真正被聽見的歌才能留下來" : "Only the songs that hit hard stay on air"}
            </p>
          </div>

          <div className="relative mt-4 grid max-w-full gap-2 rounded-[1.15rem] border border-white/10 bg-black/52 p-2 shadow-[0_16px_54px_rgba(0,0,0,0.24)] backdrop-blur lg:grid-cols-[minmax(0,max-content)_minmax(18rem,1fr)] lg:items-center">
            <nav className="flex min-w-0 flex-wrap items-center justify-start gap-2">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={`${item.href}${item.href === "/" ? "" : lang === "en" ? "?lang=en" : "?lang=zh"}`}
                  className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-zinc-200 transition hover:border-orange-300/70 hover:bg-orange-500/10 hover:text-white sm:px-4"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href={`/battle${lang === "en" ? "?lang=en" : "?lang=zh"}`}
              className="group relative flex min-h-12 min-w-0 items-center overflow-hidden rounded-[1rem] border border-cyan-200/20 bg-[linear-gradient(90deg,rgba(4,10,12,0.86),rgba(0,28,34,0.42),rgba(4,10,12,0.86))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 sm:min-h-10 sm:rounded-full sm:py-0"
              aria-label={battleTickerText}
            >
              <span className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-10 bg-gradient-to-r from-black via-black/80 to-transparent sm:block" />
              <span className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-10 bg-gradient-to-l from-black via-black/80 to-transparent sm:block" />
              <span
                className={`listen-bar-battle-ticker-motion inline-flex w-full text-left text-xs font-black leading-5 tracking-normal transition-colors group-hover:text-white sm:w-max sm:whitespace-nowrap sm:leading-none sm:tracking-[0.08em] ${
                  battleTickerMessages.length > 0 ? "text-red-300" : "text-cyan-100/78"
                }`}
                style={{
                  animation: "listen-bar-battle-ticker 34s linear infinite",
                }}
              >
                <span className="pr-10">{battleTickerText}</span>
                <span className="hidden pr-10 sm:inline" aria-hidden="true">{battleTickerText}</span>
              </span>
            </Link>
          </div>
        </header>

        <section className="grid min-w-0 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative min-w-0 overflow-hidden rounded-[1.6rem] border border-orange-300/18 bg-black/68 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.52),0_0_44px_rgba(255,106,0,0.08)] backdrop-blur md:p-5">
            <div className="pointer-events-none absolute inset-0 [background:linear-gradient(115deg,rgba(255,106,0,0.14),transparent_35%,rgba(0,202,255,0.08))]" />
            <div className="relative grid min-w-0 gap-6 md:grid-cols-[minmax(18rem,0.98fr)_1.02fr] md:items-start">
              <div className="flex min-w-0 flex-col justify-start gap-4 pt-1 md:pt-3">
                <div className={`relative mx-auto flex aspect-square w-full max-w-[18.5rem] items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a] shadow-[inset_0_0_70px_rgba(255,255,255,0.055),0_0_52px_rgba(255,106,0,0.16)] sm:max-w-[23rem] sm:shadow-[inset_0_0_70px_rgba(255,255,255,0.055),0_0_90px_rgba(255,106,0,0.18)] ${isPlaying ? "animate-[spin_10s_linear_infinite]" : ""}`}>
                  <div className="absolute inset-[7%] rounded-full border border-zinc-800" />
                  <div className="absolute inset-[18%] rounded-full border border-zinc-800" />
                  <div className="absolute inset-[24%] overflow-hidden rounded-full border border-orange-400/34 bg-black/70 shadow-[0_0_42px_rgba(255,106,0,0.15)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={nowCoverUrl}
                      alt={nowTrackTitle}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        if (event.currentTarget.src.endsWith(DEFAULT_LISTEN_BAR_COVER)) return;
                        event.currentTarget.src = DEFAULT_LISTEN_BAR_COVER;
                      }}
                    />
                    <div className="absolute inset-[46%] rounded-full bg-neutral-950 ring-1 ring-white/20" />
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-orange-300/14 bg-black/38 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <p className="text-xs font-black tracking-[0.18em] text-orange-300/75">
                    {isZh ? "傷心字幕" : "HEARTBREAK LYRICS"}
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
                        {isZh ? "尚無歌詞，等創作者把心事補上。" : "No lyrics yet."}
                      </p>
                    )}
                  </div>
                </div>

              </div>

              <div className="min-w-0 self-start pt-1 md:pt-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-orange-300/80">
                  <span>
                    AIPOGER SELECT
                  </span>
                  <span className="h-px w-12 bg-orange-400/40" />
                  <span>{nowTrack.tool}</span>
                </div>
                <p
                  title={nowTrackTitle}
                  className="mt-4 line-clamp-2 max-w-[9.6em] break-words text-[clamp(2.2rem,4.1vw,4.4rem)] font-black leading-[0.92] text-white [overflow-wrap:anywhere]"
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
                  <span>{statusText}</span>
                </div>
                <div className="mt-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-orange-300/20 bg-black/36 px-3 py-2 text-xs text-zinc-300">
                  <span className="font-black text-orange-200">{isZh ? "播歌者" : "Host"}</span>
                  <span className="font-bold text-white">{nowPresenterName}</span>
                  {nowPresenterRank && (
                    <span className="rounded-full border border-cyan-200/25 bg-cyan-300/8 px-2 py-0.5 font-bold text-cyan-100">{nowPresenterRank}</span>
                  )}
                  {nowSurvivalDay > 0 && (
                    <span className="rounded-full border border-orange-300/25 bg-orange-500/8 px-2 py-0.5 font-bold text-orange-100">
                      {isZh ? `公播 Day ${nowSurvivalDay}` : `Public Day ${nowSurvivalDay}`}
                    </span>
                  )}
                  {honorRollQualified && (
                    <span className="rounded-full border border-yellow-200/35 bg-yellow-300/10 px-2 py-0.5 font-bold text-yellow-100">
                      {isZh ? "榮譽榜資格" : "Honor Eligible"}
                    </span>
                  )}
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
                    onPointerDown={() => resumeRadioPlayback(true)}
                    onClick={() => resumeRadioPlayback(true)}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-orange-300/35 bg-orange-500 px-4 py-2 text-xs font-black text-black shadow-[0_0_22px_rgba(255,106,0,0.18)] transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                  >
                    {isZh ? "點一下恢復播放" : "Tap to Resume Playback"}
                  </button>
                )}

                <div className="mt-5 grid gap-2 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="text-xs font-bold text-zinc-500">
                    {isZh ? "公播音量" : "BAR VOLUME"}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(event) => {
                      setVolume(Number(event.target.value));
                    }}
                    aria-label={isZh ? "公播音量" : "Bar Volume"}
                    className="h-2 w-full accent-orange-500"
                  />
                  <span className="text-xs font-black tabular-nums text-orange-200">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-black text-zinc-500">
                      {isZh ? "聽眾反應" : "REACTIONS"}
                    </span>
                    <span className="text-xs font-bold text-orange-100/70">
                      {isZh ? "登入後每帳號每首歌 1 票，可更換或取消。" : "One vote per account per song; change or cancel anytime."}
                    </span>
                  </div>
                  <p className="mb-3 rounded-xl border border-orange-300/18 bg-orange-500/8 px-3 py-2 text-xs font-bold leading-5 text-orange-50/85">
                    {isZh
                      ? `聽歌不需登入；留言與投票需登入。你的每一次支持都會影響歌曲命運，累積 ${LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD} 個正向反應即可取得榮譽榜資格。`
                      : `Listening is open; comments and votes require sign-in. Every vote affects a song's fate, and ${LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD} positive reactions make it honor-roll eligible.`}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {reactionOptions.map((reaction) => {
                      const selected = myCurrentReaction === reaction.key;
                      return (
                        <button
                          key={reaction.key}
                          type="button"
                          onClick={() => handleReaction(reaction.key)}
                          aria-pressed={selected}
                          aria-label={reaction.label}
                          title={reaction.label}
                          className={`flex h-11 items-center justify-center gap-1 rounded-xl border text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
                            selected
                              ? "border-orange-300 bg-orange-500 text-black shadow-[0_0_22px_rgba(255,106,0,0.25)]"
                              : "border-white/10 bg-white/[0.055] text-zinc-200 hover:border-orange-300/50 hover:text-white"
                          }`}
                        >
                          <span className="text-base leading-none">{reaction.icon}</span>
                          <span className="tabular-nums">{currentReactions[reaction.key] ?? 0}</span>
                        </button>
                      );
                    })}
                  </div>
                  <form onSubmit={handleTrackCommentSubmit} className="mt-3 rounded-xl border border-orange-200/18 bg-orange-300/[0.055] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-orange-100">
                        {isZh ? "這首歌的傷心評論" : "Track Comments"}
                      </p>
                      <span className="text-[11px] font-bold text-zinc-500">
                        {isZh ? "永久保留" : "Always Visible"}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input
                        value={trackCommentInput}
                        onChange={(event) => setTrackCommentInput(event.target.value)}
                        maxLength={280}
                        placeholder={isZh ? "留下你對這首歌的評論..." : "Comment on this song..."}
                        className="h-11 rounded-full border border-white/10 bg-black/62 px-4 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                      />
                      <button
                        type="submit"
                        disabled={trackCommentBusy || !trackCommentInput.trim()}
                        className="h-11 rounded-full bg-orange-500 px-5 text-xs font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-zinc-500"
                      >
                        {trackCommentBusy ? (isZh ? "送出中" : "Sending") : (isZh ? "留下評論" : "Comment")}
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
                      ) : (
                        <p className="rounded-lg border border-white/8 bg-black/30 px-3 py-3 text-xs font-bold text-zinc-500">
                          {isZh ? "還沒有人評論這首歌，第一句留給懂的人。" : "No Track Comments Yet."}
                        </p>
                      )}
                    </div>
                  </form>
                </div>
                <p className="mt-3 text-xs font-bold text-orange-200/70">{radioStatusLine}</p>
              </div>
            </div>

            <div className="relative mt-4 overflow-hidden rounded-[1.35rem] border border-white/10 bg-black/62 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_0_36px_rgba(0,202,255,0.05)]">
              <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_12%_0%,rgba(255,106,0,0.14),transparent_32%),linear-gradient(90deg,rgba(0,202,255,0.055),transparent_42%,rgba(255,106,0,0.08))]" />
              <div className="relative flex flex-wrap items-end justify-between gap-3 border-b border-white/8 px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/70">
                    SAD SONG QUEUE
                  </p>
                  <h2 className="text-[clamp(1.55rem,8vw,2.9rem)] font-black leading-none text-white sm:whitespace-nowrap">
                    {upcomingHeartbreakerTracks.length > 0
                      ? (isZh ? "接續的六首歌" : "Upcoming Sad Songs")
                      : (isZh ? "等待接續歌曲" : "Waiting for Songs")}
                  </h2>
                </div>
                <span className="rounded-full border border-orange-300/24 bg-orange-500/10 px-3 py-1 text-[11px] font-black text-orange-100">
                  {upcomingHeartbreakerTracks.length}/6
                </span>
              </div>
              <div className="relative grid gap-0 md:grid-cols-2">
                {upcomingHeartbreakerTracks.length === 0 ? (
                  <p className="px-4 py-6 text-sm font-bold text-zinc-500 md:col-span-2">
                    {isZh ? "等待創作者投稿後，下一首會顯示在這裡。" : "The next creator track will appear here."}
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
                                <p className="line-clamp-1 text-lg font-black leading-tight text-white" title={track.title}>
                                  {track.title}
                                </p>
                                <p className="mt-1 truncate text-sm font-bold text-zinc-500">
                                  <span className="text-orange-200">{track.artist}</span>
                                  <span className="mx-2 text-zinc-700">/</span>
                                  {track.tool}
                                  <span className="mx-2 text-zinc-700">/</span>
                                  {formatDuration(track.duration)}
                                </p>
                                {track.barPhase === "public" ? (
                                  <p className="mt-1 text-[11px] font-black text-orange-100/80">
                                    {isZh ? `公播 Day ${survivalDayFromDate(track.promotedAt ?? track.createdAt)}` : `Public Day ${survivalDayFromDate(track.promotedAt ?? track.createdAt)}`}
                                  </p>
                                ) : (
                                  <p className="mt-1 text-[11px] font-black text-cyan-100/80">
                                    Challenger #{challengerRankById.get(track.id) ?? startIndex + index + 1}
                                  </p>
                                )}
                              </div>
                              {startIndex + index === 0 && (
                                <span className="hidden rounded-full border border-cyan-200/25 bg-cyan-300/8 px-2.5 py-1 text-[10px] font-black text-cyan-100 sm:inline-flex">
                                  {isZh ? "即將插播" : "Next"}
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
              preload="auto"
              playsInline
              onPlay={() => {
                setPlaybackBlocked(false);
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => {
                if (Number.isFinite(event.currentTarget.duration)) {
                  setTrackDuration(Math.max(1, Math.round(event.currentTarget.duration)));
                }
              }}
              onEnded={playNext}
            />
          </div>

          <div className="grid min-w-0 gap-4">
            <div className="flex min-h-[34rem] min-w-0 flex-col rounded-[1.6rem] border border-cyan-200/14 bg-black/68 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.48),0_0_40px_rgba(0,202,255,0.06)] backdrop-blur md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-orange-300/70">
                    {isZh ? "AI 音樂交流區" : "AI MUSIC TALK"}
                  </p>
                  <h2 className="mt-1 text-3xl font-black text-white">{isZh ? "AI音樂交流區" : "AI Music Talk"}</h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">
                    {isZh ? `${localizedMessages.length} 則留言` : `${localizedMessages.length} Messages`}
                  </p>
                  <p className="mt-1 text-xs font-black text-orange-200/80">{listenBarPresenceLabel}</p>
                  <p className="mt-0.5 text-[11px] font-bold text-zinc-600">{isZh ? "留言保留 8H" : "Messages Keep 8H"}</p>
                </div>
              </div>
              <SafetyNotice kind="chat" compact className="mb-3" />

              <div ref={chatScrollRef} className="min-h-0 max-h-[27rem] flex-1 overflow-y-auto rounded-2xl border border-white/8 bg-black/50 p-3 pr-2">
                <div className="grid gap-2">
                  {localizedMessages.length === 0 ? (
                    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center text-sm font-bold text-zinc-500">
                      {isZh ? "還沒有人留言，快來聊聊 AI 音樂。" : "No Messages Yet. Start the AI Music Talk."}
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
                  placeholder={isZh ? "說點什麼..." : "Say something..."}
                  className="h-14 rounded-full border border-orange-200/35 bg-black/70 px-5 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/20"
                />
                <button
                  type="submit"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-orange-500 px-7 text-sm font-black text-black transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                >
                  <SendIcon />
                  {isZh ? "發送" : "Send"}
                </button>
              </form>
              {chatError && <p className="mt-2 text-xs font-bold text-red-200">{chatError}</p>}
            </div>

            <div id="play-request" className="min-w-0 rounded-[1.6rem] border border-orange-300/18 bg-black/70 p-4 shadow-[0_20px_56px_rgba(0,0,0,0.42),0_0_34px_rgba(255,106,0,0.07)] backdrop-blur md:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-orange-300/70">PLAY REQUEST</p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    {isZh ? "我要播歌！" : "Play My Song"}
                  </h2>
                  <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-500">
                    {isZh
                      ? "上傳後不打斷現在播放；這首播完優先插播新投稿。每 1 小時最多 8 首，其餘排到下一小時。"
                      : "Uploads do not interrupt the current song; new submissions get priority next. Up to 8 air per 1-hour batch, with overflow pushed to the next hour."}
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
                      ? "border-cyan-200/45 bg-cyan-300/[0.08] shadow-[0_0_28px_rgba(34,211,238,0.09)]"
                      : "border-orange-300/35 bg-[radial-gradient(circle_at_20%_12%,rgba(255,106,0,0.24),transparent_42%),rgba(255,106,0,0.07)] hover:border-orange-200/75"
                  }`}
                >
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),transparent_36%,rgba(255,255,255,0.025))]" />
                  <span className="relative z-10 flex w-full items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-orange-200/75">AUDIO FILE</span>
                      <span className="mt-1 block truncate text-lg font-black leading-tight text-white">
                        {publicAudioFile?.name ?? (isZh ? "音檔 MP3 / WAV / AIFF / M4A" : "MP3 / WAV / AIFF / M4A")}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-400">
                        {isZh ? "點一下選歌，自動偵測歌名" : "Tap to Choose; Title Auto-Detects"}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${publicAudioFile ? "border-cyan-200/35 bg-cyan-300/10 text-cyan-100" : "border-orange-200/35 bg-black/30 text-orange-100"}`}>
                      {publicAudioFile ? (isZh ? "已選取" : "Selected") : (isZh ? "必填" : "Required")}
                    </span>
                  </span>
                  <input type="file" accept={AUDIO_UPLOAD_ACCEPT} onChange={handlePublicAudioChange} className="hidden" />
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={publicUploadForm.title}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder={isZh ? "歌曲名稱" : "Track Title"}
                    maxLength={80}
                    required
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.artist}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, artist: event.target.value }))}
                    placeholder={isZh ? "創作者名稱" : "Creator Name"}
                    maxLength={60}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.aiTool}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, aiTool: event.target.value }))}
                    placeholder={isZh ? "AI 工具" : "AI Tool"}
                    maxLength={40}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                  <input
                    value={publicUploadForm.album}
                    onChange={(event) => setPublicUploadForm((current) => ({ ...current, album: event.target.value }))}
                    placeholder={isZh ? "專輯名稱（選填）" : "Album Name (Optional)"}
                    maxLength={80}
                    className="h-11 rounded-xl border border-white/12 bg-black/58 px-3 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-cyan-200/18 bg-cyan-300/[0.055] px-3 text-xs font-black text-cyan-100 transition hover:border-cyan-100/50">
                    {publicCoverFile?.name ?? (isZh ? "封面可選" : "Optional Cover")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setPublicCoverFile(event.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                  <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-orange-300/24 bg-orange-500/10 px-3 text-xs font-black text-orange-100 transition hover:border-orange-200/70">
                    {isZh ? "歌詞 .txt/.lrc" : "Lyrics"}
                    <input type="file" accept=".txt,.lrc,text/plain" onChange={handlePublicLyricsFileChange} className="hidden" />
                  </label>
                </div>

                <textarea
                  value={publicLyricsText}
                  onChange={(event) => setPublicLyricsText(event.target.value.slice(0, 12000))}
                  rows={3}
                  placeholder={isZh ? "貼上歌詞，LRC 時間碼可同步播放..." : "Paste lyrics; LRC timestamps can sync..."}
                  className="min-h-20 w-full resize-y rounded-xl border border-white/10 bg-black/62 px-3 py-2 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-300 focus:ring-2 focus:ring-orange-300/18"
                />

                <button
                  type="submit"
                  disabled={publicUploadBusy || challengerSlotsFull || !publicAudioFile}
                  className="h-12 rounded-xl bg-orange-500 px-5 text-sm font-black tracking-[0.12em] text-black shadow-[0_0_28px_rgba(255,106,0,0.24)] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/[0.045] disabled:text-zinc-500 disabled:shadow-none"
                >
                  {publicUploadBusy
                    ? (isZh ? "上傳中..." : "Uploading...")
                    : challengerSlotsFull
                      ? (isZh ? "挑戰席已滿" : "Seats Full")
                      : (isZh ? "我要播歌！" : "Play My Song")}
                </button>
              </form>
            </div>
          </div>
        </section>

        {!openingPhaseActive && (
        <section className="rounded-[1.55rem] border border-cyan-200/16 bg-black/62 px-4 py-4 shadow-[0_22px_64px_rgba(0,0,0,0.4),0_0_34px_rgba(0,202,255,0.055)] backdrop-blur">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/70">CHALLENGER POOL</p>
              <h2 className="mt-1 text-2xl font-black text-white">{isZh ? "挑戰池" : "Challenger Pool"}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1 text-[11px] font-black text-orange-100">
                {isZh ? `${challengerQueueTracks.length} 首正在挑戰` : `${challengerQueueTracks.length} Challengers`}
              </span>
              <span className="rounded-full border border-cyan-200/18 bg-cyan-300/8 px-3 py-1 text-[11px] font-black text-cyan-100">
                {isZh ? `每批 1 小時最多 ${LISTEN_BAR_CHALLENGER_HOURLY_LIMIT} 首上場` : `${LISTEN_BAR_CHALLENGER_HOURLY_LIMIT}/1-hour batch`}
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
                    <p className="truncate text-sm font-black text-white" title={track.title}>{track.title}</p>
                    <p className="mt-1 truncate text-xs font-bold text-zinc-500">
                      {track.artist} · {formatDuration(track.duration)} · {track.positiveReactionCount ?? 0} hearts
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
              {isZh ? "目前沒有 Challenger，新投稿會優先排入挑戰池。" : "No Challengers yet. New uploads enter this pool first."}
            </p>
          )}
        </section>
        )}

        <section className="grid min-w-0 gap-4 lg:grid-cols-[1.08fr_1.1fr_0.82fr]">
          <div className="min-w-0 rounded-[1.45rem] border border-orange-300/18 bg-black/58 px-4 py-4 shadow-[0_20px_58px_rgba(0,0,0,0.38)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-200/75">
              {isZh ? "公播規則" : "AIRPLAY RULES"}
            </p>
            <p className="mt-2 break-words text-sm font-bold leading-6 text-zinc-300 [overflow-wrap:anywhere]">
              {isZh
                ? `傷心酒吧不是排行榜，而是一場 AI 音樂生存電台。新投稿不打斷目前歌曲，會在這首播完後優先插播；每批從第一首投稿開始計 1 小時，最多 ${LISTEN_BAR_CHALLENGER_HOURLY_LIMIT} 首，其餘排到下一小時。公播池超過 ${LISTEN_BAR_PUBLIC_ROTATION_LIMIT} 首時，每 ${LISTEN_BAR_JUDGMENT_INTERVAL_HOURS} 小時最多淘汰 ${LISTEN_BAR_PUBLIC_EVICTION_LIMIT} 首低反應歌曲；累積 ${LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD} 個正向反應，就取得榮譽榜入選資格。`
                : `Bar Heartbreak is not a chart. It is AI music survival radio. New uploads do not interrupt the current song; they get priority after it ends. Each 1-hour batch airs up to ${LISTEN_BAR_CHALLENGER_HOURLY_LIMIT} tracks. When the public pool is above ${LISTEN_BAR_PUBLIC_ROTATION_LIMIT}, up to ${LISTEN_BAR_PUBLIC_EVICTION_LIMIT} low-reaction tracks are removed every ${LISTEN_BAR_JUDGMENT_INTERVAL_HOURS} hours. Tracks with ${LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD} positive reactions become Honor Board eligible.`}
            </p>
          </div>

          <div className="min-w-0 rounded-[1.45rem] border border-cyan-200/14 bg-black/58 px-4 py-4 shadow-[0_20px_58px_rgba(0,0,0,0.38)] backdrop-blur">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">{isZh ? "我的吧台歌曲" : "My Bar Tracks"}</p>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                <span className="max-w-full rounded-full border border-orange-300/18 bg-orange-500/8 px-2 py-0.5 text-[11px] font-black text-orange-100">
                  {isZh ? `Challenger ${challengerSlotCount}/${LISTEN_BAR_CHALLENGER_SLOT_LIMIT}` : `${challengerSlotCount}/${LISTEN_BAR_CHALLENGER_SLOT_LIMIT} Challengers`}
                </span>
                <span className="max-w-full rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
                  {isZh ? `${myPublicStats.length} 公播` : `${myPublicStats.length} public`}
                </span>
              </div>
            </div>
            {myBroadcastStats.length > 0 ? (
              <div className="grid max-h-56 min-w-0 gap-2 overflow-y-auto overflow-x-hidden pr-1">
                {[...myChallengerStats, ...myPublicStats].slice(0, 6).map((track) => {
                  const keepPercent = track.barPhase === "public"
                    ? 100
                    : Math.min(100, (track.positives / LISTEN_BAR_PUBLIC_REACTION_THRESHOLD) * 100);
                  const challengerRank = challengerRankById.get(track.id);
                  const statusLabel = track.barPhase === "public"
                    ? isZh
                      ? `公播 Day ${survivalDayFromDate(track.promotedAt ?? track.createdAt)}`
                      : `Public Day ${survivalDayFromDate(track.promotedAt ?? track.createdAt)}`
                    : challengerRank
                      ? `Challenger #${challengerRank}`
                      : "Challenger";
                  return (
                    <div key={track.id} className="min-w-0 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2">
                      <div className="min-w-0 overflow-hidden">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="min-w-0 max-w-[calc(100%-4.5rem)] truncate text-sm font-black text-white">{track.title}</p>
                          <button
                            type="button"
                            onClick={() => void handleRemoveMyTrack(track)}
                            disabled={removeTrackBusyId === track.id}
                            className="shrink-0 whitespace-nowrap rounded-full border border-red-300/30 bg-red-500/12 px-2.5 py-0.5 text-[11px] font-black text-red-100 transition hover:border-red-200/70 hover:bg-red-500/18 disabled:cursor-wait disabled:opacity-50"
                          >
                            {removeTrackBusyId === track.id ? (isZh ? "撤下中" : "Removing") : (isZh ? "撤下" : "Remove")}
                          </button>
                        </div>
                        <p className="mt-0.5 text-[11px] font-bold text-zinc-500">{statusLabel} · {formatDuration(track.duration)} · {track.positives} hearts</p>
                      </div>
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
                  ? (isZh ? "尚未有 Challenger 或公播池歌曲。" : "No Challenger or Public Pool tracks yet.")
                  : (isZh ? "登入後會顯示你的挑戰席與公播池歌曲。" : "Sign in to see your Challenger seats and Public Pool tracks.")}
              </p>
            )}
          </div>

          <div className="relative min-w-0 overflow-hidden rounded-[1.45rem] border border-orange-300/18 bg-[radial-gradient(circle_at_50%_0%,rgba(255,106,0,0.16),transparent_48%),rgba(0,0,0,0.58)] px-4 py-4 shadow-[0_20px_58px_rgba(0,0,0,0.38)] backdrop-blur">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-200/75">
              {isZh ? "公播歌池" : "AIRPLAY POOL"}
            </p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-black tabular-nums text-white">{publicPoolTracks.length}</span>
              <span className="pb-1 text-sm font-black text-zinc-500">/ {LISTEN_BAR_PUBLIC_ROTATION_LIMIT}</span>
            </div>
            <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">
              {isZh
                ? openingPhaseActive
                  ? `${communityRequestTracks.length} 首投稿歌正在公播；滿 ${LISTEN_BAR_PUBLIC_ROTATION_LIMIT} 首後新歌進入 Challenger，超過 ${LISTEN_BAR_PUBLIC_ROTATION_LIMIT} 首才啟動淘汰。`
                  : `${communityRequestTracks.length} 首投稿歌進入傷心酒吧；${publicPoolTracks.length} 首公播，${challengerTracks.length} 首 Challenger 正在拼人氣；超過 ${LISTEN_BAR_PUBLIC_ROTATION_LIMIT} 首時每 ${LISTEN_BAR_JUDGMENT_INTERVAL_HOURS} 小時最多淘汰 ${LISTEN_BAR_PUBLIC_EVICTION_LIMIT} 首。`
                : openingPhaseActive
                  ? `${communityRequestTracks.length} creator tracks are live on air. New uploads enter Challenger after ${LISTEN_BAR_PUBLIC_ROTATION_LIMIT}; elimination starts only above ${LISTEN_BAR_PUBLIC_ROTATION_LIMIT}.`
                  : `${communityRequestTracks.length} creator tracks are in Bar Heartbreak. ${publicPoolTracks.length} are live on air and ${challengerTracks.length} are fighting for reactions. Above ${LISTEN_BAR_PUBLIC_ROTATION_LIMIT}, up to ${LISTEN_BAR_PUBLIC_EVICTION_LIMIT} low-reaction tracks are removed every ${LISTEN_BAR_JUDGMENT_INTERVAL_HOURS} hours.`}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-300 to-cyan-300"
                style={{ width: `${Math.min(100, (publicPoolTracks.length / LISTEN_BAR_PUBLIC_ROTATION_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
