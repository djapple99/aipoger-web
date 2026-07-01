"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import LangToggle from "@/components/lang-toggle";
import SafetyNotice from "@/components/safety-notice";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { fontGlowSans, fontRighteous } from "@/lib/fonts";
import {
  DEFAULT_LISTEN_BAR_COVER,
  LISTEN_BAR_AUDIO_BUCKET,
  LISTEN_BAR_COVER_BUCKET,
  type ListenBarTrackRow,
} from "@/lib/listen-bar";
import { parseMp3Metadata, type ParsedMp3Metadata } from "@/lib/mp3-id3";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import { IMAGE_UPLOAD_ACCEPT, imageContentType, isAllowedImageUploadFile } from "@/lib/image-upload-policy";
import type { SocialPlatform, SocialPostStatus, SocialPublishMode } from "@/lib/social-posting";
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
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";

type AdminState = "checking" | "login" | "denied" | "ready";
type TrackSortMode = "manual" | "updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "genre";
type TrackVisibilityFilter = "all" | "active" | "hidden" | "removed" | "uncategorized";
type AdminListenBarTrackRow = ListenBarTrackRow & {
  review_status?: "approved" | "pending" | "hidden" | "removed" | string | null;
  moderation_note?: string | null;
  hidden_at?: string | null;
  removed_at?: string | null;
};

type TrackForm = {
  title: string;
  artist: string;
  aiTool: string;
  genre: string;
  mood: string;
  bpm: string;
  durationSeconds: string;
  lyrics: string;
  sortOrder: string;
  isActive: boolean;
};

type TrackMetadataForm = {
  title: string;
  artist: string;
  aiTool: string;
  genre: string;
  mood: string;
  bpm: string;
  durationSeconds: string;
  lyrics: string;
  sortOrder: string;
};

type BulkMetadataForm = {
  genre: string;
  aiTool: string;
  mood: string;
};

type ContentReportSummary = {
  status?: string | null;
};

type ModerationSummaryPayload = {
  reports?: ContentReportSummary[];
  storageFallback?: boolean;
};

type ListenBarTracksAdminPayload = {
  tracks?: AdminListenBarTrackRow[];
  error?: string;
};
type TrackDownloadPayload = {
  url?: string;
  fileName?: string;
  error?: string;
};
type SocialTarget = {
  id: string;
  post_id: string;
  platform: SocialPlatform;
  publish_mode: SocialPublishMode;
  status: SocialPostStatus;
  title: string;
  content_text: string;
  target_url: string | null;
  manual_publish_url: string | null;
  media_url: string | null;
  background_audio_url: string | null;
  background_audio_label: string | null;
  notes: string | null;
  external_post_id: string | null;
  error_message: string | null;
  last_attempt_at: string | null;
  published_at: string | null;
};
type SocialPost = {
  id: string;
  source_type: "manual" | "battle_result" | "listen_bar_daily_spotlight";
  source_id: string | null;
  title: string;
  status: SocialPostStatus;
  scheduled_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  social_post_targets?: SocialTarget[];
};
type AdminSocialPayload = {
  posts?: SocialPost[];
  error?: string;
};
type SocialMediaUploadPayload = {
  bucket?: string;
  path?: string;
  token?: string;
  publicUrl?: string;
  contentType?: string;
  error?: string;
};

const initialForm: TrackForm = {
  title: "",
  artist: "AIPOGER",
  aiTool: "Suno",
  genre: "Original 自我風格",
  mood: "官方輪播",
  bpm: "",
  durationSeconds: "",
  lyrics: "",
  sortOrder: "100",
  isActive: true,
};

const initialBulkMetadataForm: BulkMetadataForm = {
  genre: "",
  aiTool: "",
  mood: "",
};

const LIVE_RADIO_EPOCH_MS = Date.UTC(2026, 0, 1);
const UPCOMING_ROTATION_PREVIEW_COUNT = 6;
const LISTEN_BAR_ADMIN_GENRE_OPTIONS = MUSIC_GENRE_OPTIONS;
const GENRE_VALUES = new Set(LISTEN_BAR_ADMIN_GENRE_OPTIONS.map((genre) => genre.value));
const NEEDS_GENRE_REVIEW = new Set(["", "AI Music", "ai music", "Genre", "genre", "自我風格", "未標示風格"]);
const SOCIAL_PLATFORM_ORDER: SocialPlatform[] = ["discord", "x", "instagram", "tiktok", "youtube", "facebook_group"];
const socialPlatformLabel: Record<SocialPlatform, string> = {
  discord: "Discord",
  x: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook_group: "Facebook 社團",
};
const socialStatusLabel: Record<SocialPostStatus, string> = {
  draft: "草稿",
  needs_review: "待審核",
  scheduled: "已批准",
  published: "已發布",
  failed: "失敗",
};
const SOCIAL_MEDIA_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
const SOCIAL_MEDIA_UPLOAD_MAX_BYTES = 300 * 1024 * 1024;
const SOCIAL_MEDIA_UPLOAD_MAX_LABEL = "300MB";

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned || `track-${Date.now()}`;
}

function formatDuration(seconds: number | null | undefined) {
  const value = Math.max(0, Math.round(seconds ?? 0));
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function todayTaipeiDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10);
}

function listenBarSpotlightUrl(spotlightDate: string) {
  const date = spotlightDate.trim() || todayTaipeiDate();
  return `/listen-bar?spotlight=${encodeURIComponent(date)}&lang=zh`;
}

const TODAY_SPOTLIGHT_URL = "https://aipoger.com/today";

function todaySpotlightQrUrl(size = 420) {
  const params = new URLSearchParams({
    size: `${size}x${size}`,
    data: TODAY_SPOTLIGHT_URL,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

function sortedSocialTargets(post: SocialPost) {
  return [...(post.social_post_targets ?? [])].sort((a, b) => SOCIAL_PLATFORM_ORDER.indexOf(a.platform) - SOCIAL_PLATFORM_ORDER.indexOf(b.platform));
}

function songCredit(artist: string, title: string) {
  return /^《.+》$/.test(title) ? `${artist}${title}` : `${artist}《${title}》`;
}

function defaultSpotlightIntro(track: AdminListenBarTrackRow | null) {
  if (!track) return "今天主推一首正在傷心酒吧公播的 AI 音樂。聽完整版走 aipoger.com/today，喜歡就按愛心，這顆心會直接算進歌曲成績。";
  const artist = track.artist?.trim() || "AIPOGER Creator";
  const title = track.title?.trim() || "未命名作品";
  const genre = track.genre?.trim() || "AI Music";
  return `今天主推 ${songCredit(artist, title)}。這首 ${genre} 正在傷心酒吧公播，聽完整版走 aipoger.com/today；喜歡就按愛心，這顆心會直接算進歌曲成績。`;
}

function defaultSpotlightCaption(track: AdminListenBarTrackRow | null) {
  if (!track) return "今天的傷心酒吧推薦。掃 QR 或輸入 aipoger.com/today，進來聽完整版，喜歡就按愛心。";
  const artist = track.artist?.trim() || "AIPOGER Creator";
  const title = track.title?.trim() || "未命名作品";
  return `今天的傷心酒吧推薦：${songCredit(artist, title)}。掃 QR 或輸入 aipoger.com/today，進來聽完整版，喜歡就按愛心。`;
}

function isAllowedSocialMediaFile(file: File) {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"]);
  if (allowed.has(file.type)) return true;
  return /\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i.test(file.name);
}

function socialMediaContentType(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  return "video/mp4";
}

function mediaKindFromUrl(url: string) {
  return /\.(mp4|mov|webm)(?:[?#].*)?$/i.test(url) ? "video" : "image";
}

function mediaKindForPreview(file: File | null, url: string) {
  if (file?.type.startsWith("video/")) return "video";
  if (file?.type.startsWith("image/")) return "image";
  if (file && /\.(mp4|mov|webm)$/i.test(file.name)) return "video";
  return mediaKindFromUrl(url);
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

function rowPublicUrl(bucket: string, path: string | null | undefined) {
  const value = path?.trim();
  if (!value) return "";
  if (/^https?:/i.test(value)) return value;
  return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
}

function isHiddenTrack(track: AdminListenBarTrackRow) {
  if (removedStatus(track)) return false;
  const status = track.review_status?.toLowerCase();
  return track.is_active === false || status === "hidden" || Boolean(track.hidden_at);
}

function removedStatus(track: AdminListenBarTrackRow) {
  return track.review_status?.toLowerCase() === "removed" || Boolean(track.removed_at);
}

function hiddenStatus(track: AdminListenBarTrackRow) {
  return track.review_status?.toLowerCase() === "hidden" || Boolean(track.hidden_at);
}

function sortOrderValue(track: AdminListenBarTrackRow) {
  return typeof track.sort_order === "number" && Number.isFinite(track.sort_order) ? track.sort_order : 1000;
}

function publicRotationSort(a: AdminListenBarTrackRow, b: AdminListenBarTrackRow) {
  const sortDiff = sortOrderValue(a) - sortOrderValue(b);
  if (sortDiff !== 0) return sortDiff;
  return dateSortValue(b.created_at) - dateSortValue(a.created_at);
}

function activePlayableTracks(tracks: AdminListenBarTrackRow[]) {
  return tracks
    .filter((track) => track.source === "community" && track.is_active !== false && !isHiddenTrack(track) && Boolean(track.audio_path?.trim()))
    .sort(publicRotationSort);
}

function liveRotationSnapshot(tracks: AdminListenBarTrackRow[], nowMs: number) {
  const playableTracks = activePlayableTracks(tracks);
  if (playableTracks.length === 0) {
    return {
      current: null as AdminListenBarTrackRow | null,
      upcoming: [] as AdminListenBarTrackRow[],
      elapsedSeconds: 0,
      currentDuration: 0,
      totalDuration: 0,
    };
  }
  const totalDuration = playableTracks.reduce((sum, track) => sum + Math.max(1, Math.round(track.duration_seconds ?? 1)), 0);
  if (totalDuration <= 0) {
    return {
      current: playableTracks[0] ?? null,
      upcoming: playableTracks.slice(1, UPCOMING_ROTATION_PREVIEW_COUNT + 1),
      elapsedSeconds: 0,
      currentDuration: Math.max(1, Math.round(playableTracks[0]?.duration_seconds ?? 1)),
      totalDuration: 0,
    };
  }

  let cursor = Math.floor(Math.max(0, nowMs - LIVE_RADIO_EPOCH_MS) / 1000) % totalDuration;
  for (let index = 0; index < playableTracks.length; index += 1) {
    const track = playableTracks[index];
    const duration = Math.max(1, Math.round(track.duration_seconds ?? 1));
    if (cursor < duration) {
      const upcoming = Array.from({ length: Math.min(UPCOMING_ROTATION_PREVIEW_COUNT, Math.max(0, playableTracks.length - 1)) }, (_, offset) => (
        playableTracks[(index + offset + 1) % playableTracks.length]
      ));
      return {
        current: track,
        upcoming,
        elapsedSeconds: cursor,
        currentDuration: duration,
        totalDuration,
      };
    }
    cursor -= duration;
  }
  return {
    current: playableTracks[0] ?? null,
    upcoming: playableTracks.slice(1, UPCOMING_ROTATION_PREVIEW_COUNT + 1),
    elapsedSeconds: 0,
    currentDuration: Math.max(1, Math.round(playableTracks[0]?.duration_seconds ?? 1)),
    totalDuration,
  };
}

function trackReactionTotal(track: AdminListenBarTrackRow) {
  return Math.max(
    0,
    Math.round(
      track.positive_reaction_count ??
        (track.heart_count ?? 0) + (track.star_count ?? 0) + (track.thumb_count ?? 0) + (track.happy_count ?? 0),
    ),
  );
}

function trackStatusBadge(track: AdminListenBarTrackRow, currentlyPlayingId: string) {
  if (removedStatus(track)) {
    return { label: "已移除", className: "border-red-300/35 bg-red-500/12 text-red-100" };
  }
  if (hiddenStatus(track)) {
    return { label: "已下架", className: "border-red-300/35 bg-red-500/12 text-red-100" };
  }
  if (track.is_active === false) {
    return { label: "已下架", className: "border-zinc-700 bg-zinc-900 text-zinc-500" };
  }
  if (track.id === currentlyPlayingId) {
    return { label: "正在播放中", className: "border-orange-200/55 bg-orange-400/18 text-orange-100 shadow-[0_0_18px_rgba(251,146,60,0.22)]" };
  }
  if (track.bar_phase === "public") {
    return { label: "公播中", className: "border-cyan-200/35 bg-cyan-300/10 text-cyan-100" };
  }
  if (track.bar_phase === "challenger") {
    return { label: "Challenger", className: "border-amber-200/35 bg-amber-300/10 text-amber-100" };
  }
  return { label: "上架中", className: "border-cyan-200/30 bg-cyan-300/10 text-cyan-100" };
}

function phaseLabel(track: AdminListenBarTrackRow) {
  if (removedStatus(track)) return "已移除";
  if (hiddenStatus(track) || track.is_active === false) return "已下架";
  if (track.bar_phase === "public") return "公播池";
  if (track.bar_phase === "challenger") return "Challenger";
  return "未分池";
}

function adminReviewLabel(track: AdminListenBarTrackRow) {
  if (removedStatus(track)) return "removed";
  if (hiddenStatus(track)) return "hidden";
  return track.review_status || "approved";
}

function dateSortValue(value: string | null | undefined) {
  const ms = new Date(value ?? 0).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function trackMonthKey(track: AdminListenBarTrackRow) {
  const date = new Date(track.created_at ?? track.updated_at ?? 0);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) return "unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function trackMonthLabel(monthKey: string) {
  if (monthKey === "unknown") return "未標示月份";
  const [year, month] = monthKey.split("-");
  return `${year} 年 ${Number(month)} 月`;
}

function trackSearchText(track: AdminListenBarTrackRow) {
  return [
    track.title,
    track.artist,
    track.ai_tool,
    track.genre,
    track.mood,
    phaseLabel(track),
    adminReviewLabel(track),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isUncategorizedTrack(track: AdminListenBarTrackRow) {
  const genre = track.genre?.trim() ?? "";
  return !GENRE_VALUES.has(genre) || NEEDS_GENRE_REVIEW.has(genre);
}

function normalizedGenreForSelect(value: string | null | undefined) {
  const genre = value?.trim() ?? "";
  return GENRE_VALUES.has(genre) ? genre : "Original 自我風格";
}

function metadataFormFromTrack(track: AdminListenBarTrackRow): TrackMetadataForm {
  return {
    title: track.title?.trim() || "",
    artist: track.artist?.trim() || "",
    aiTool: track.ai_tool?.trim() || "AI Music",
    genre: normalizedGenreForSelect(track.genre),
    mood: track.mood?.trim() || "",
    bpm: typeof track.bpm === "number" && Number.isFinite(track.bpm) ? String(track.bpm) : "",
    durationSeconds:
      typeof track.duration_seconds === "number" && Number.isFinite(track.duration_seconds)
        ? String(track.duration_seconds)
        : "",
    lyrics: track.lyrics ?? "",
    sortOrder: typeof track.sort_order === "number" && Number.isFinite(track.sort_order) ? String(track.sort_order) : "1000",
  };
}

function sortTracksForAdmin(tracks: AdminListenBarTrackRow[], mode: TrackSortMode) {
  const next = [...tracks];
  if (mode === "manual") return next;
  return next.sort((a, b) => {
    if (mode === "updated_desc") return dateSortValue(b.updated_at) - dateSortValue(a.updated_at);
    if (mode === "updated_asc") return dateSortValue(a.updated_at) - dateSortValue(b.updated_at);
    if (mode === "created_desc") return dateSortValue(b.created_at) - dateSortValue(a.created_at);
    if (mode === "created_asc") return dateSortValue(a.created_at) - dateSortValue(b.created_at);
    if (mode === "genre") {
      const genreCompare = (a.genre || "").localeCompare(b.genre || "", "zh-Hant");
      if (genreCompare !== 0) return genreCompare;
      return (a.title || "").localeCompare(b.title || "", "zh-Hant");
    }
    return publicRotationSort(a, b);
  });
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export default function ListenBarAdminPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<AdminListenBarTrackRow[]>([]);
  const [form, setForm] = useState<TrackForm>(initialForm);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [embeddedCover, setEmbeddedCover] = useState<ParsedMp3Metadata["cover"] | null>(null);
  const [coverPreview, setCoverPreview] = useState(DEFAULT_LISTEN_BAR_COVER);
  const [audioPreview, setAudioPreview] = useState("");
  const [tableReady, setTableReady] = useState(true);
  const [openReportCount, setOpenReportCount] = useState(0);
  const [reportStorageFallback, setReportStorageFallback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [operatingTrackId, setOperatingTrackId] = useState("");
  const [playlistBusy, setPlaylistBusy] = useState(false);
  const [trackVisibilityFilter, setTrackVisibilityFilter] = useState<TrackVisibilityFilter>("all");
  const [trackMonthFilter, setTrackMonthFilter] = useState("all");
  const [trackSearch, setTrackSearch] = useState("");
  const [trackSortMode, setTrackSortMode] = useState<TrackSortMode>("manual");
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [bulkMetadataForm, setBulkMetadataForm] = useState<BulkMetadataForm>(initialBulkMetadataForm);
  const [focusedTrackId, setFocusedTrackId] = useState("");
  const [editingTrackId, setEditingTrackId] = useState("");
  const [metadataForm, setMetadataForm] = useState<TrackMetadataForm | null>(null);
  const [metadataSavingId, setMetadataSavingId] = useState("");
  const [downloadingTrackId, setDownloadingTrackId] = useState("");
  const [optimisticTrackPatches, setOptimisticTrackPatches] = useState<Record<string, Partial<AdminListenBarTrackRow>>>({});
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [spotlightDate, setSpotlightDate] = useState(todayTaipeiDate());
  const [selectedSpotlightTrackId, setSelectedSpotlightTrackId] = useState("");
  const [spotlightIntro, setSpotlightIntro] = useState("");
  const [spotlightCaption, setSpotlightCaption] = useState("");
  const [spotlightMediaFile, setSpotlightMediaFile] = useState<File | null>(null);
  const [spotlightMediaPreview, setSpotlightMediaPreview] = useState("");
  const [spotlightMediaUrl, setSpotlightMediaUrl] = useState("");
  const [spotlightBusy, setSpotlightBusy] = useState(false);

  const displayTracks = useMemo(
    () => tracks.map((track) => ({ ...track, ...(optimisticTrackPatches[track.id] ?? {}) })),
    [optimisticTrackPatches, tracks],
  );
  const monthOptions = useMemo(() => {
    const months = Array.from(new Set(displayTracks.map(trackMonthKey)));
    return months.sort((a, b) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return b.localeCompare(a);
    });
  }, [displayTracks]);
  const visiblePlayableTracks = useMemo(() => activePlayableTracks(displayTracks), [displayTracks]);
  const renderedTracks = useMemo(() => {
    const query = trackSearch.trim().toLowerCase();
    const filteredTracks = displayTracks.filter((track) => {
      const removed = removedStatus(track);
      if (trackVisibilityFilter === "removed") {
        if (!removed) return false;
      } else if (removed) {
        return false;
      }
      const hidden = isHiddenTrack(track);
      if (trackVisibilityFilter === "active" && hidden) return false;
      if (trackVisibilityFilter === "hidden" && !hidden) return false;
      if (trackVisibilityFilter === "uncategorized" && !isUncategorizedTrack(track)) return false;
      if (trackMonthFilter !== "all" && trackMonthKey(track) !== trackMonthFilter) return false;
      if (!query) return true;
      return trackSearchText(track).includes(query);
    });
    return sortTracksForAdmin(filteredTracks, trackSortMode);
  }, [displayTracks, trackMonthFilter, trackSearch, trackSortMode, trackVisibilityFilter]);
  const selectedTrackIdSet = useMemo(() => new Set(selectedTrackIds), [selectedTrackIds]);
  const selectedTracks = useMemo(
    () => displayTracks.filter((track) => selectedTrackIdSet.has(track.id)),
    [displayTracks, selectedTrackIdSet],
  );
  const allRenderedSelected = renderedTracks.length > 0 && renderedTracks.every((track) => selectedTrackIdSet.has(track.id));
  const hiddenTrackCount = useMemo(() => displayTracks.filter(isHiddenTrack).length, [displayTracks]);
  const removedTrackCount = useMemo(() => displayTracks.filter(removedStatus).length, [displayTracks]);
  const manageableTrackCount = Math.max(0, displayTracks.length - removedTrackCount);
  const renderedTrackTotal = trackVisibilityFilter === "removed" ? removedTrackCount : manageableTrackCount;
  const uncategorizedTrackCount = useMemo(() => displayTracks.filter((track) => !removedStatus(track) && isUncategorizedTrack(track)).length, [displayTracks]);
  const liveRotation = useMemo(() => liveRotationSnapshot(displayTracks, nowMs), [displayTracks, nowMs]);
  const currentlyPlayingId = liveRotation.current?.id ?? "";
  const totalActive = visiblePlayableTracks.length;
  const spotlightTrackOptions = visiblePlayableTracks;
  const selectedSpotlightTrack = useMemo(
    () => spotlightTrackOptions.find((track) => track.id === selectedSpotlightTrackId) ?? spotlightTrackOptions[0] ?? null,
    [selectedSpotlightTrackId, spotlightTrackOptions],
  );
  const spotlightPosts = useMemo(
    () => socialPosts.filter((post) => post.source_type === "listen_bar_daily_spotlight"),
    [socialPosts],
  );
  const latestSpotlightPost = spotlightPosts[0] ?? null;
  const latestSpotlightTarget = latestSpotlightPost ? sortedSocialTargets(latestSpotlightPost)[0] ?? null : null;

  const loadTracks = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/listen-bar-tracks", {
      cache: "no-store",
      headers: await authHeader(),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setTracks([]);
      setTableReady(false);
      setError(payload?.error || "無法讀取傷心酒吧後台歌曲。請確認登入狀態與管理員權限。");
      return;
    }

    setTableReady(true);
    setTracks(payload?.tracks ?? []);
    setOptimisticTrackPatches({});
    setSelectedTrackIds([]);
  }, []);

  const loadReportSummary = useCallback(async () => {
    const response = await fetch("/api/admin/content-reports", {
      headers: await authHeader(),
    });
    if (!response.ok) return;
    const payload = (await response.json().catch(() => null)) as ModerationSummaryPayload | null;
    const reports = payload?.reports ?? [];
    setOpenReportCount(reports.filter((report) => report.status === "open" || report.status === "reviewing").length);
    setReportStorageFallback(Boolean(payload?.storageFallback));
  }, []);

  const loadSocialSpotlights = useCallback(async () => {
    const response = await fetch("/api/admin/social", {
      cache: "no-store",
      headers: await authHeader(),
    });
    const payload = (await response.json().catch(() => null)) as AdminSocialPayload | null;
    if (!response.ok) {
      setSocialPosts([]);
      return;
    }
    setSocialPosts(payload?.posts ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      if (!user) {
        setAdminState("login");
        return;
      }

      setUserId(user.id);
      const isAdmin = await loadIsAdmin(user.id);
      if (!isAdmin) {
        setAdminState("denied");
        return;
      }

      setAdminState("ready");
      await Promise.all([loadTracks(), loadReportSummary(), loadSocialSpotlights()]);
    })();
  }, [loadReportSummary, loadSocialSpotlights, loadTracks]);

  useEffect(() => {
    return () => {
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      if (embeddedCover?.previewUrl) URL.revokeObjectURL(embeddedCover.previewUrl);
      if (spotlightMediaPreview) URL.revokeObjectURL(spotlightMediaPreview);
    };
  }, [audioPreview, coverPreview, embeddedCover, spotlightMediaPreview]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedSpotlightTrackId || spotlightTrackOptions.length === 0) return;
    const preferredTrack = spotlightTrackOptions.find((track) => /橘貓|女巫/i.test(`${track.title ?? ""} ${track.artist ?? ""}`));
    const nextTrack = preferredTrack ?? spotlightTrackOptions[0] ?? null;
    setSelectedSpotlightTrackId(nextTrack?.id ?? "");
    setSpotlightIntro(defaultSpotlightIntro(nextTrack));
    setSpotlightCaption(defaultSpotlightCaption(nextTrack));
  }, [selectedSpotlightTrackId, spotlightTrackOptions]);

  const updateForm = (patch: Partial<TrackForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const updateMetadataForm = (patch: Partial<TrackMetadataForm>) => {
    setMetadataForm((current) => (current ? { ...current, ...patch } : current));
  };

  const focusTrackInList = useCallback((trackId: string) => {
    if (!trackId) return;
    setTrackVisibilityFilter("all");
    setTrackMonthFilter("all");
    setTrackSearch("");
    setTrackSortMode("manual");
    setFocusedTrackId(trackId);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(`listen-bar-admin-track-${trackId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    });
  }, []);

  const beginEditTrack = (track: AdminListenBarTrackRow) => {
    setEditingTrackId(track.id);
    setMetadataForm(metadataFormFromTrack(track));
    setFocusedTrackId(track.id);
  };

  const cancelEditTrack = () => {
    setEditingTrackId("");
    setMetadataForm(null);
  };

  const handleAudioChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    setMessage("");
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    if (file && !isAllowedListenBarAudioFile(file)) {
      setAudioFile(null);
      setAudioPreview("");
      setError("請使用 MP3、WAV、AIFF、M4A、AAC 或 OGG 音檔。");
      return;
    }
    if (file && file.size > LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES) {
      setAudioFile(null);
      setAudioPreview("");
      setError(`音檔太大：${listenBarAudioSizeLabel(file)}。傷心酒吧單檔上限是 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，WAV 若超過請先轉 MP3 或壓縮。`);
      return;
    }
    setAudioFile(file);
    setAudioPreview(file ? URL.createObjectURL(file) : "");
    if (!file) return;

    const duration = await readAudioDuration(file);
    const metadata = file.name.toLowerCase().endsWith(".mp3") ? await parseMp3Metadata(file) : {};
    const fallbackTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

    updateForm({
      title: form.title.trim() || metadata.title || fallbackTitle,
      artist: form.artist.trim() && form.artist !== initialForm.artist ? form.artist : metadata.artist || form.artist,
      genre:
        form.genre.trim() && form.genre !== initialForm.genre
          ? normalizedGenreForSelect(form.genre)
          : normalizedGenreForSelect(metadata.genre || form.genre),
      bpm: form.bpm.trim() || (metadata.bpm ? String(metadata.bpm) : ""),
      durationSeconds: duration > 0 ? String(duration) : form.durationSeconds,
    });

    if (metadata.cover) {
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      if (embeddedCover?.previewUrl) URL.revokeObjectURL(embeddedCover.previewUrl);
      setEmbeddedCover(metadata.cover);
      setCoverPreview(metadata.cover.previewUrl);
    }
  };

  const handleCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    if (file && !isAllowedImageUploadFile(file)) {
      setCoverFile(null);
      setError("請使用 JPG、PNG、WebP 或 GIF 圖片。");
      return;
    }
    setCoverFile(file);
    if (!file) return;
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSpotlightMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    setMessage("");
    if (spotlightMediaPreview) URL.revokeObjectURL(spotlightMediaPreview);
    setSpotlightMediaPreview("");
    setSpotlightMediaFile(null);
    setSpotlightMediaUrl("");
    if (!file) return;
    if (!isAllowedSocialMediaFile(file)) {
      setError("推薦素材格式不支援。請使用 JPG、PNG、WebP、GIF、MP4、MOV 或 WebM。");
      return;
    }
    if (file.size > SOCIAL_MEDIA_UPLOAD_MAX_BYTES) {
      setError(`推薦素材太大。單檔上限是 ${SOCIAL_MEDIA_UPLOAD_MAX_LABEL}。`);
      return;
    }
    setSpotlightMediaFile(file);
    setSpotlightMediaPreview(URL.createObjectURL(file));
  };

  const uploadAsset = async (bucket: string, file: File | Blob, fileName: string, contentType: string) => {
    if (!userId) throw new Error("尚未登入。");
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(fileName)}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      contentType,
      upsert: false,
    });
    if (uploadError) throw uploadError;
    return path;
  };

  const uploadAudioAsset = async (file: File) => {
    if (!userId) throw new Error("尚未登入。");
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    await uploadListenBarAudioFile(
      LISTEN_BAR_AUDIO_BUCKET,
      path,
      file,
      listenBarAudioContentType(file),
      (percent) => setMessage(`音檔上傳中 ${percent}%`),
    );
    return path;
  };

  const uploadSpotlightMediaAsset = async () => {
    if (!spotlightMediaFile) return spotlightMediaUrl.trim();
    const response = await fetch("/api/admin/social-media-upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({
        fileName: spotlightMediaFile.name,
        fileSize: spotlightMediaFile.size,
        contentType: socialMediaContentType(spotlightMediaFile),
      }),
    });
    const payload = (await response.json().catch(() => null)) as SocialMediaUploadPayload | null;
    if (!response.ok || !payload?.bucket || !payload.path || !payload.token || !payload.publicUrl) {
      throw new Error(payload?.error || "推薦素材上傳連結建立失敗。");
    }
    const { error: uploadError } = await supabase.storage
      .from(payload.bucket)
      .uploadToSignedUrl(payload.path, payload.token, spotlightMediaFile, {
        contentType: payload.contentType || socialMediaContentType(spotlightMediaFile),
      });
    if (uploadError) throw uploadError;
    setSpotlightMediaUrl(payload.publicUrl);
    setSpotlightMediaFile(null);
    return payload.publicUrl;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!audioFile) {
      setError("請先選擇 MP3 / WAV 音檔。");
      return;
    }
    if (!form.title.trim() || !form.artist.trim()) {
      setError("歌名與歌者必填。");
      return;
    }

    setSaving(true);
    try {
      const audioPath = await uploadAudioAsset(audioFile);

      const coverSource = coverFile ?? embeddedCover?.blob ?? null;
      const coverPath = coverSource
        ? await uploadAsset(
            LISTEN_BAR_COVER_BUCKET,
            coverSource,
            coverFile?.name ?? embeddedCover?.fileName ?? "cover.jpg",
            coverFile ? imageContentType(coverFile) : embeddedCover?.mimeType || "image/jpeg",
          )
        : null;

      const { error: insertError } = await supabase.from("listen_bar_tracks").insert({
        title: form.title.trim(),
        artist: form.artist.trim(),
        ai_tool: form.aiTool.trim() || "AI Music",
        genre: form.genre.trim() || null,
        mood: form.mood.trim() || null,
        bpm: form.bpm.trim() ? Number(form.bpm) : null,
        duration_seconds: form.durationSeconds.trim() ? Number(form.durationSeconds) : null,
        lyrics: form.lyrics.trim() || null,
        audio_path: audioPath,
        cover_path: coverPath,
        sort_order: form.sortOrder.trim() ? Number(form.sortOrder) : 100,
        is_active: form.isActive,
        created_by: userId,
      });
      if (insertError) throw insertError;

      setForm(initialForm);
      setAudioFile(null);
      setCoverFile(null);
      setEmbeddedCover(null);
      setAudioPreview("");
      setCoverPreview(DEFAULT_LISTEN_BAR_COVER);
      setMessage("已加入傷心酒吧官方輪播。");
      await loadTracks();
    } catch (saveError) {
      if (isListenBarStorageSizeLimitError(saveError)) {
        setError(`音檔被雲端儲存限制擋下。請確認檔案低於 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，若仍失敗請檢查 Supabase global / bucket 上限。`);
      } else {
        setError(`儲存失敗：${String((saveError as { message?: string })?.message ?? saveError)}。請確認已執行 SQL 且目前帳號是管理員。`);
      }
    } finally {
      setSaving(false);
    }
  };

  const moveTrack = async (track: AdminListenBarTrackRow, direction: "up" | "down") => {
    setError("");
    setMessage("");
    setOperatingTrackId(track.id);
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action: "move", trackId: track.id, direction }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`調整順序失敗：${payload?.error || "後台 API 無法調整播放順序。"}`);
      setOperatingTrackId("");
      return;
    }
    setTracks(payload?.tracks ?? []);
    setOptimisticTrackPatches({});
    setTrackSortMode("manual");
    setFocusedTrackId(track.id);
    setMessage(`「${track.title}」已${direction === "up" ? "往前" : "往後"}移動，前台清單會依新順序播放。`);
    setOperatingTrackId("");
  };

  const randomizeTrackOrder = async () => {
    if (!window.confirm("確定要隨機重排目前仍上架播放的歌曲順序？已下架歌曲不會被排入公播。")) return;
    setError("");
    setMessage("");
    setPlaylistBusy(true);
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action: "randomize" }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`隨機排列失敗：${payload?.error || "後台 API 無法重排歌曲。"}`);
      setPlaylistBusy(false);
      return;
    }
    setTracks(payload?.tracks ?? []);
    setOptimisticTrackPatches({});
    setTrackSortMode("manual");
    setMessage("已隨機重排目前上架歌曲。");
    setPlaylistBusy(false);
  };

  const normalizeTrackOrder = async () => {
    if (!window.confirm("確定要重編目前仍上架播放的歌曲排序？不會隨機洗牌，只會修正重複排序值。")) return;
    setError("");
    setMessage("");
    setPlaylistBusy(true);
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action: "normalize" }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`重編排序失敗：${payload?.error || "後台 API 無法修正播放排序。"}`);
      setPlaylistBusy(false);
      return;
    }
    setTracks(payload?.tracks ?? []);
    setOptimisticTrackPatches({});
    setTrackSortMode("manual");
    setMessage("已重編目前上架歌曲排序。前台會依新順序播放。");
    setPlaylistBusy(false);
  };

  const restoreTrack = async (track: AdminListenBarTrackRow) => {
    setError("");
    setMessage("");
    setOperatingTrackId(track.id);
    setOptimisticTrackPatches((current) => ({
      ...current,
      [track.id]: {
        is_active: true,
        review_status: "approved",
        hidden_at: null,
        removed_at: null,
      },
    }));
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action: "restore", trackId: track.id, note: "Owner restored from Bar Heartbreak console." }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`恢復失敗：${payload?.error || "後台 API 無法恢復上架。"}`);
      setOptimisticTrackPatches((current) => {
        const next = { ...current };
        delete next[track.id];
        return next;
      });
      setOperatingTrackId("");
      return;
    }
    setMessage(`「${track.title}」已恢復上架。`);
    setTracks(payload?.tracks ?? []);
    setOptimisticTrackPatches({});
    setOperatingTrackId("");
  };

  const hideTrack = async (track: AdminListenBarTrackRow) => {
    if (!window.confirm(`確定先下架「${track.title}」？作品資料會保留，但前台不會再播放。`)) return;
    setError("");
    setMessage("");
    setOperatingTrackId(track.id);
    const hiddenAt = new Date().toISOString();
    setOptimisticTrackPatches((current) => ({
      ...current,
      [track.id]: {
        is_active: false,
        review_status: "hidden",
        hidden_at: hiddenAt,
      },
    }));
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action: "hide", trackId: track.id, note: "Owner hidden from Bar Heartbreak console." }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`下架失敗：${payload?.error || "後台 API 無法下架歌曲。"}`);
      setOptimisticTrackPatches((current) => {
        const next = { ...current };
        delete next[track.id];
        return next;
      });
      setOperatingTrackId("");
      return;
    }
    setMessage(`「${track.title}」已下架。`);
    setTracks(payload?.tracks ?? []);
    setOptimisticTrackPatches({});
    setOperatingTrackId("");
  };

  const removeTrack = async (track: AdminListenBarTrackRow) => {
    if (!window.confirm(`確定刪除「${track.title}」？歌曲會從前台播放清單移除，後台仍可在下架資料中追查與恢復。`)) return;
    setError("");
    setMessage("");
    setOperatingTrackId(track.id);
    const removedAt = new Date().toISOString();
    setOptimisticTrackPatches((current) => ({
      ...current,
      [track.id]: {
        is_active: false,
        review_status: "removed",
        hidden_at: removedAt,
        removed_at: removedAt,
      },
    }));
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action: "remove", trackId: track.id, note: "Owner removed from Bar Heartbreak console." }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`刪除失敗：${payload?.error || "後台 API 無法刪除歌曲。"}`);
      setOptimisticTrackPatches((current) => {
        const next = { ...current };
        delete next[track.id];
        return next;
      });
      setOperatingTrackId("");
      return;
    }
    setMessage(`「${track.title}」已刪除，不會再進入前台播放。`);
    setTracks(payload?.tracks ?? []);
    setSelectedTrackIds((current) => current.filter((id) => id !== track.id));
    setOptimisticTrackPatches({});
    setOperatingTrackId("");
  };

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTrackIds((current) => (
      current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId]
    ));
  };

  const toggleRenderedSelection = () => {
    if (allRenderedSelected) {
      const renderedIds = new Set(renderedTracks.map((track) => track.id));
      setSelectedTrackIds((current) => current.filter((id) => !renderedIds.has(id)));
      return;
    }
    setSelectedTrackIds((current) => Array.from(new Set([...current, ...renderedTracks.map((track) => track.id)])));
  };

  const bulkTrackAction = async (action: "hide" | "restore" | "remove") => {
    if (selectedTrackIds.length === 0) return;
    const actionLabel = action === "hide" ? "下架" : action === "restore" ? "恢復上架" : "刪除";
    if (!window.confirm(`確定要${actionLabel}已選取的 ${selectedTrackIds.length} 首歌曲？`)) return;
    setError("");
    setMessage("");
    setPlaylistBusy(true);
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({
        action,
        trackIds: selectedTrackIds,
        note: `Owner bulk ${action} from Bar Heartbreak console.`,
      }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`${actionLabel}失敗：${payload?.error || "後台 API 無法批次處理歌曲。"}`);
      setPlaylistBusy(false);
      return;
    }
    setTracks(payload?.tracks ?? []);
    setOptimisticTrackPatches({});
    setSelectedTrackIds([]);
    setMessage(`已${actionLabel} ${selectedTrackIds.length} 首歌曲。`);
    setPlaylistBusy(false);
  };

  const bulkUpdateMetadata = async () => {
    if (selectedTrackIds.length === 0) return;
    const genre = bulkMetadataForm.genre.trim();
    const aiTool = bulkMetadataForm.aiTool.trim();
    const mood = bulkMetadataForm.mood.trim();
    if (!genre && !aiTool && !mood) {
      setError("請先填要批次更新的類型、AI 工具或情緒標籤。");
      return;
    }
    setError("");
    setMessage("");
    setPlaylistBusy(true);
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({
        action: "bulkMetadata",
        trackIds: selectedTrackIds,
        genre,
        aiTool,
        mood,
      }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`批次更新失敗：${payload?.error || "後台 API 無法批次更新歌曲資料。"}`);
      setPlaylistBusy(false);
      return;
    }
    setTracks(payload?.tracks ?? []);
    setBulkMetadataForm(initialBulkMetadataForm);
    setOptimisticTrackPatches({});
    setSelectedTrackIds([]);
    setTrackSortMode("updated_desc");
    setMessage(`已更新 ${selectedTrackIds.length} 首歌曲資料。`);
    setPlaylistBusy(false);
  };

  const saveTrackMetadata = async (track: AdminListenBarTrackRow) => {
    if (!metadataForm || editingTrackId !== track.id) return;
    const title = metadataForm.title.trim();
    const artist = metadataForm.artist.trim();
    if (!title || !artist) {
      setError("歌名與創作者必填。");
      return;
    }
    if (!GENRE_VALUES.has(metadataForm.genre)) {
      setError("請從固定類型選單選擇類型。");
      return;
    }

    setError("");
    setMessage("");
    setMetadataSavingId(track.id);
    const response = await fetch("/api/admin/listen-bar-tracks", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({
        action: "metadata",
        trackId: track.id,
        title,
        artist,
        aiTool: metadataForm.aiTool.trim(),
        genre: metadataForm.genre,
        mood: metadataForm.mood.trim(),
        bpm: metadataForm.bpm.trim(),
        durationSeconds: metadataForm.durationSeconds.trim(),
        lyrics: metadataForm.lyrics,
        sortOrder: metadataForm.sortOrder.trim(),
      }),
    });
    const payload = (await response.json().catch(() => null)) as ListenBarTracksAdminPayload | null;
    if (!response.ok) {
      setError(`更新資料失敗：${payload?.error || "後台 API 無法更新歌曲資料。"}`);
      setMetadataSavingId("");
      return;
    }
    setTracks(payload?.tracks ?? []);
    setOptimisticTrackPatches({});
    setTrackSortMode("updated_desc");
    setFocusedTrackId(track.id);
    setEditingTrackId("");
    setMetadataForm(null);
    setMessage(`「${title}」資料已更新。`);
    setMetadataSavingId("");
  };

  const downloadOriginalTrack = async (track: AdminListenBarTrackRow) => {
    if (!track.audio_path?.trim()) {
      setError("這首歌沒有可下載的原始音檔。");
      return;
    }
    setError("");
    setMessage("");
    setDownloadingTrackId(track.id);
    const params = new URLSearchParams({ trackId: track.id });
    const response = await fetch(`/api/admin/listen-bar-track-download?${params.toString()}`, {
      cache: "no-store",
      headers: await authHeader(),
    });
    const payload = (await response.json().catch(() => null)) as TrackDownloadPayload | null;
    setDownloadingTrackId("");
    if (!response.ok || !payload?.url) {
      setError(`原檔下載失敗：${payload?.error || "後台無法建立下載連結。"}`);
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = payload.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    if (payload.fileName) anchor.download = payload.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setMessage(`已建立「${track.title || "未命名作品"}」原檔下載連結。`);
  };

  const createSpotlightDraft = async () => {
    if (!selectedSpotlightTrack) {
      setError("請先選擇一首可播放的傷心酒吧歌曲。");
      return;
    }
    setError("");
    setMessage("");
    setSpotlightBusy(true);
    try {
      const mediaUrl = await uploadSpotlightMediaAsset();
      const response = await fetch("/api/admin/social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeader()),
        },
        body: JSON.stringify({
          action: "create_listen_bar_spotlight_draft",
          trackId: selectedSpotlightTrack.id,
          spotlightDate,
          intro: spotlightIntro.trim() || defaultSpotlightIntro(selectedSpotlightTrack),
          shortCaption: spotlightCaption.trim() || defaultSpotlightCaption(selectedSpotlightTrack),
          mediaUrl: mediaUrl || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error || "每日推薦歌草稿建立失敗。");
        return;
      }
      setMessage(`已建立每日推薦歌：${selectedSpotlightTrack.artist || "創作者"}《${selectedSpotlightTrack.title || "未命名作品"}》。`);
      await loadSocialSpotlights();
    } catch (uploadError) {
      setError(`每日推薦歌建立失敗：${String((uploadError as { message?: string })?.message ?? uploadError)}`);
    } finally {
      setSpotlightBusy(false);
    }
  };

  const cancelSpotlightDraft = async (post: SocialPost) => {
    if (!window.confirm(`確定取消「${post.title}」這筆每日推薦歌草稿？取消後各平台文案也會一起移除。`)) return;
    setError("");
    setMessage("");
    setSpotlightBusy(true);
    const response = await fetch("/api/admin/social", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action: "delete_post", postId: post.id }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSpotlightBusy(false);
    if (!response.ok) {
      setError(payload?.error || "每日推薦歌草稿取消失敗。");
      return;
    }
    setMessage("每日推薦歌草稿已取消。");
    await loadSocialSpotlights();
  };

  const copySpotlightLink = async () => {
    const url = new URL(listenBarSpotlightUrl(spotlightDate), window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setMessage("Spotlight 連結已複製。");
  };

  const copyTodaySpotlightLink = async () => {
    await navigator.clipboard.writeText(TODAY_SPOTLIGHT_URL);
    setMessage("每日推薦固定入口已複製。");
  };

  if (adminState === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-zinc-100">
        <p className="text-sm font-bold text-zinc-400">檢查管理員權限...</p>
      </main>
    );
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] px-5 py-8 text-zinc-100">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_16%,rgba(255,106,0,0.24),transparent_34%),linear-gradient(180deg,#050505,#090706)]" />
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col justify-center">
          <img src={AIPOGER_BRAND_LOGO} alt="" className="mb-8 h-20 w-20 rounded-2xl object-contain" />
          <h1 className="text-4xl font-black text-white">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <p className="mt-4 text-base leading-8 text-zinc-400">
            {adminState === "login"
              ? "傷心酒吧後台只開放管理員使用。"
              : "目前帳號不是 AIPOGER 管理員，無法管理輪播歌單。"}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth" className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">
              登入
            </Link>
            <Link href="/listen-bar?lang=zh" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-zinc-200">
              返回傷心酒吧
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 py-5 text-zinc-100 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_16%_10%,rgba(255,106,0,0.28),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(0,202,255,0.16),transparent_30%),linear-gradient(180deg,#050505_0%,#090706_45%,#050505_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1520px] flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <Link href="/listen-bar?lang=zh" className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-orange-400/60 hover:text-white">
            返回傷心酒吧
          </Link>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-300/70">AIPOGER ADMIN</p>
            <h1 className={`${fontRighteous.className} mt-1 text-3xl tracking-[0.08em] text-white md:text-5xl`}>
              Bar Heartbreak Console
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/admin/social" className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-100">
              發文後台
            </Link>
            <Link href="/admin/battles" className="rounded-full border border-orange-300/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-100">
              Battle 管理
            </Link>
            <Link href="/admin/moderation" className="rounded-full border border-orange-300/30 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-100">
              檢舉管理{openReportCount > 0 ? ` ${openReportCount}` : ""}{reportStorageFallback ? "（備援）" : ""}
            </Link>
            <Link href="/admin/quiz" className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
              測驗後台
            </Link>
            <Link href="/battle/setup?lang=zh" className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
              Drop 上傳
            </Link>
            <LangToggle variant="inline" />
          </div>
        </header>

        <section className="rounded-[1.4rem] border border-yellow-200/20 bg-yellow-300/[0.055] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.36)] backdrop-blur md:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-yellow-100/75">DAILY SPOTLIGHT</p>
              <h2 className="mt-1 text-2xl font-black text-white">每日推薦歌後台</h2>
              <p className="mt-1 max-w-3xl text-xs font-bold leading-6 text-zinc-500">
                從傷心酒吧選一首歌做今天推薦；/today 與 Spotlight 會帶聽眾先聽這首，愛心仍算回原本歌曲，不打斷公播輪播。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/social" className="rounded-full border border-yellow-200/30 bg-black/25 px-4 py-2 text-xs font-black text-yellow-100">
                查看全部草稿
              </Link>
              <a href={TODAY_SPOTLIGHT_URL} target="_blank" rel="noreferrer" className="rounded-full border border-yellow-200/30 bg-yellow-300/10 px-4 py-2 text-xs font-black text-yellow-100">
                開啟 /today
              </a>
              <a href={listenBarSpotlightUrl(spotlightDate)} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-black text-zinc-100">
                開啟 Spotlight
              </a>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/38 p-4">
              <div className="grid gap-3 sm:grid-cols-[8.5rem_1fr]">
                <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  日期
                  <input
                    type="date"
                    value={spotlightDate}
                    onChange={(event) => setSpotlightDate(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-black/60 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none transition focus:border-yellow-200/70"
                  />
                </label>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  推薦歌曲
                  <select
                    value={selectedSpotlightTrackId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const nextTrack = spotlightTrackOptions.find((track) => track.id === nextId) ?? null;
                      setSelectedSpotlightTrackId(nextId);
                      setSpotlightIntro(defaultSpotlightIntro(nextTrack));
                      setSpotlightCaption(defaultSpotlightCaption(nextTrack));
                    }}
                    className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-black/60 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none transition focus:border-yellow-200/70"
                  >
                    {spotlightTrackOptions.length === 0 ? (
                      <option value="">尚無可推薦歌曲</option>
                    ) : (
                      spotlightTrackOptions.map((track) => (
                        <option key={track.id} value={track.id}>
                          {track.artist || "創作者"}《{track.title || "未命名"}》｜{track.genre || "AI Music"}｜♥ {track.heart_count ?? trackReactionTotal(track)}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>

              {selectedSpotlightTrack ? (
                <div className="grid gap-3 rounded-2xl border border-yellow-200/18 bg-yellow-300/[0.045] p-3 sm:grid-cols-[5.25rem_1fr]">
                  <img
                    src={rowPublicUrl(LISTEN_BAR_COVER_BUCKET, selectedSpotlightTrack.cover_path) || DEFAULT_LISTEN_BAR_COVER}
                    alt=""
                    className="aspect-square w-full rounded-xl bg-black object-cover"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-yellow-200/35 bg-yellow-300/12 px-3 py-1 text-[11px] font-black text-yellow-100">
                        今日推薦候選
                      </span>
                      <span className="text-[11px] font-black text-zinc-500">
                        {formatDuration(selectedSpotlightTrack.duration_seconds)} / ♥ {selectedSpotlightTrack.heart_count ?? trackReactionTotal(selectedSpotlightTrack)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-lg font-black text-white">{selectedSpotlightTrack.title || "未命名作品"}</p>
                    <p className="mt-1 truncate text-sm font-bold text-zinc-400">
                      {selectedSpotlightTrack.artist || "創作者"} / {selectedSpotlightTrack.ai_tool || "AI Music"} / {selectedSpotlightTrack.genre || "AI Music"}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!selectedSpotlightTrack}
                  onClick={() => {
                    setSpotlightIntro(defaultSpotlightIntro(selectedSpotlightTrack));
                    setSpotlightCaption(defaultSpotlightCaption(selectedSpotlightTrack));
                  }}
                  className="rounded-lg border border-yellow-200/30 bg-yellow-300/10 px-3 py-2 text-xs font-black text-yellow-100 transition hover:border-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  重新套用這首歌文案
                </button>
              </div>

              <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                推薦文
                <textarea
                  value={spotlightIntro}
                  onChange={(event) => setSpotlightIntro(event.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/60 px-4 py-3 text-sm font-bold normal-case leading-6 tracking-normal text-white outline-none transition focus:border-yellow-200/70"
                />
              </label>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                Shorts / 社群 Caption
                <textarea
                  value={spotlightCaption}
                  onChange={(event) => setSpotlightCaption(event.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-y rounded-xl border border-white/12 bg-black/60 px-4 py-3 text-sm font-bold normal-case leading-6 tracking-normal text-white outline-none transition focus:border-yellow-200/70"
                />
              </label>
              <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">推薦影像素材</p>
                    <p className="mt-1 text-xs font-bold leading-6 text-zinc-500">
                      可貼公開影像連結，或上傳 JPG / PNG / WebP / GIF / MP4 / MOV / WebM。Discord 檔案太大時建議貼外部連結；只產草稿，不會自動發平台。
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer rounded-xl border border-yellow-200/30 bg-yellow-300/10 px-4 py-3 text-sm font-black text-yellow-100 transition hover:border-yellow-100">
                    選擇影像
                    <input type="file" accept={SOCIAL_MEDIA_UPLOAD_ACCEPT} onChange={handleSpotlightMediaChange} className="hidden" />
                  </label>
                </div>
                <label className="mt-3 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  影像素材連結
                  <input
                    value={spotlightMediaUrl}
                    onChange={(event) => {
                      if (spotlightMediaPreview) URL.revokeObjectURL(spotlightMediaPreview);
                      setSpotlightMediaFile(null);
                      setSpotlightMediaPreview("");
                      setSpotlightMediaUrl(event.target.value);
                    }}
                    placeholder="https://... 公開圖片或影片連結"
                    className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-black/60 px-4 text-sm font-bold normal-case tracking-normal text-white outline-none transition placeholder:text-zinc-600 focus:border-yellow-200/70"
                  />
                </label>
                {(spotlightMediaPreview || spotlightMediaUrl) ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-[9rem_1fr]">
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
                      {mediaKindForPreview(spotlightMediaFile, spotlightMediaPreview || spotlightMediaUrl) === "video" ? (
                        <video src={spotlightMediaPreview || spotlightMediaUrl} className="aspect-[9/16] w-full bg-black object-cover" controls muted playsInline />
                      ) : (
                        <img src={spotlightMediaPreview || spotlightMediaUrl} alt="" className="aspect-[9/16] w-full bg-black object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">
                        {spotlightMediaFile?.name || "已上傳素材"}
                      </p>
                      <p className="mt-2 break-all text-xs font-bold leading-6 text-zinc-500">
                        {spotlightMediaFile
                          ? `已選取，尚未上傳。按「儲存每日推薦歌並產草稿」後才會上傳，大小 ${(spotlightMediaFile.size / 1024 / 1024).toFixed(1)}MB`
                          : spotlightMediaUrl}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {spotlightMediaUrl ? (
                          <a href={spotlightMediaUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-yellow-200/30 px-3 py-2 text-xs font-black text-yellow-100 hover:border-yellow-100">
                            開啟素材
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            if (spotlightMediaPreview) URL.revokeObjectURL(spotlightMediaPreview);
                            setSpotlightMediaFile(null);
                            setSpotlightMediaPreview("");
                            setSpotlightMediaUrl("");
                          }}
                          className="rounded-lg border border-red-300/30 px-3 py-2 text-xs font-black text-red-100 hover:border-red-200"
                        >
                          移除素材
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={spotlightBusy || !selectedSpotlightTrack}
                  onClick={createSpotlightDraft}
                  className="rounded-xl bg-yellow-300 px-4 py-3 text-sm font-black text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {spotlightBusy ? "上傳/建立中..." : "儲存每日推薦歌並產草稿"}
                </button>
                <p className="basis-full text-xs font-bold leading-6 text-zinc-500">
                  儲存後會建立社群草稿；要發送平台，請到社群後台批准後再發布或手動貼文。
                </p>
                <p className="basis-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-bold leading-6 text-zinc-500">
                  /today 是固定入口，永遠導向台灣日期的今日推薦；Spotlight 連結是這一天的指定推薦頁，適合後台查核或單次分享。
                </p>
                <button
                  type="button"
                  onClick={copyTodaySpotlightLink}
                  className="rounded-xl border border-yellow-200/30 bg-yellow-300/10 px-4 py-3 text-sm font-black text-yellow-100 transition hover:border-yellow-100"
                >
                  複製 /today 連結
                </button>
                <button
                  type="button"
                  onClick={copySpotlightLink}
                  className="rounded-xl border border-yellow-200/30 bg-black/30 px-4 py-3 text-sm font-black text-yellow-100 transition hover:border-yellow-100"
                >
                  複製 Spotlight 連結
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-yellow-200/20 bg-yellow-300/[0.045] p-4">
                <div className="grid gap-4 sm:grid-cols-[8.5rem_1fr]">
                  <div className="rounded-xl border border-white/12 bg-white p-2">
                    <img src={todaySpotlightQrUrl()} alt="AIPOGER 今日推薦歌 QR Code" className="aspect-square w-full rounded-lg bg-white object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-100/70">SHORTS ENTRY</p>
                    <h3 className="mt-1 text-lg font-black text-white">每日推薦固定入口 QR</h3>
                    <p className="mt-2 break-all text-sm font-black text-yellow-100">{TODAY_SPOTLIGHT_URL}</p>
                    <p className="mt-2 text-xs font-bold leading-6 text-zinc-500">
                      給 YouTube Shorts / Reels 畫面使用。Shorts 描述與留言連結通常不能直接點，畫面放 QR code 或短網址最穩。
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={copyTodaySpotlightLink}
                        className="rounded-lg border border-yellow-200/30 px-3 py-2 text-xs font-black text-yellow-100 hover:border-yellow-100"
                      >
                        複製連結
                      </button>
                      <a href={TODAY_SPOTLIGHT_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-white hover:border-white/30">
                        開啟 /today
                      </a>
                      <a href={todaySpotlightQrUrl(900)} target="_blank" rel="noreferrer" download="aipoger-today-qr.png" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-white hover:border-white/30">
                        下載 QR
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/34 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-100/70">LATEST DRAFTS</p>
                  <h3 className="mt-1 text-lg font-black text-white">每日推薦草稿</h3>
                </div>
                <span className="rounded-full border border-yellow-200/30 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-100">
                  {spotlightPosts.length} 筆
                </span>
              </div>

              {latestSpotlightPost ? (
                <article className="mt-4 rounded-2xl border border-yellow-200/18 bg-yellow-300/[0.04] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-yellow-300/15 px-2 py-1 text-[0.65rem] font-black text-yellow-100">
                      {socialStatusLabel[latestSpotlightPost.status]}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">{formatTime(latestSpotlightPost.created_at)}</span>
                  </div>
                  <h4 className="mt-2 text-base font-black leading-snug text-white">{latestSpotlightPost.title}</h4>
                  <p className="mt-2 text-xs font-bold leading-6 text-zinc-500">
                    平台草稿：{latestSpotlightPost.social_post_targets?.length ?? 0} 個
                    {latestSpotlightTarget ? ` / 第一個：${socialPlatformLabel[latestSpotlightTarget.platform]}` : ""}
                  </p>
                  {latestSpotlightTarget?.media_url ? (
                    <p className="mt-2 break-all text-xs font-bold leading-6 text-yellow-100/80">
                      素材：{latestSpotlightTarget.media_url}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {latestSpotlightTarget?.target_url ? (
                      <a href={latestSpotlightTarget.target_url} target="_blank" rel="noreferrer" className="rounded-lg border border-yellow-200/30 px-3 py-2 text-xs font-black text-yellow-100 hover:border-yellow-100">
                        開啟最新 Spotlight
                      </a>
                    ) : null}
                    {latestSpotlightTarget?.media_url ? (
                      <a href={latestSpotlightTarget.media_url} target="_blank" rel="noreferrer" className="rounded-lg border border-yellow-200/30 px-3 py-2 text-xs font-black text-yellow-100 hover:border-yellow-100">
                        開啟素材
                      </a>
                    ) : null}
                    <Link href="/admin/social" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-white hover:border-white/30">
                      進社群後台審核
                    </Link>
                    <button
                      type="button"
                      disabled={spotlightBusy || latestSpotlightPost.status === "published"}
                      onClick={() => void cancelSpotlightDraft(latestSpotlightPost)}
                      className="rounded-lg border border-red-300/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-100 transition hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      取消草稿
                    </button>
                  </div>
                </article>
              ) : (
                <p className="mt-4 rounded-2xl border border-white/10 bg-black/35 px-4 py-6 text-sm font-bold leading-7 text-zinc-500">
                  目前沒有每日推薦歌草稿。選一首酒吧歌曲後，按左邊按鈕建立第一筆。
                </p>
              )}

              {spotlightPosts.length > 1 ? (
                <div className="mt-3 grid gap-2">
                  {spotlightPosts.slice(1, 4).map((post) => (
                    <Link key={post.id} href="/admin/social" className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-yellow-200/40 hover:text-white">
                      {formatTime(post.created_at)}｜{post.title}｜{socialStatusLabel[post.status]}
                    </Link>
                  ))}
                </div>
              ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.4rem] border border-cyan-200/14 bg-cyan-300/[0.045] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.36)] backdrop-blur md:p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">LIVE ROTATION</p>
              <h2 className="mt-1 text-2xl font-black text-white">傷心酒吧播放監控</h2>
              <p className="mt-1 text-xs font-bold text-zinc-500">
                只計算上架、未下架、未移除且有音檔的歌曲；點歌曲可跳到下方管理項目。
              </p>
            </div>
            <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              {visiblePlayableTracks.length} 首可播放
            </span>
          </div>

          {liveRotation.current ? (
            <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
              <button
                type="button"
                onClick={() => focusTrackInList(liveRotation.current?.id ?? "")}
                className="rounded-2xl border border-orange-300/25 bg-orange-500/[0.07] p-3 text-left transition hover:border-orange-200/60 hover:bg-orange-500/[0.11] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/55"
              >
                <div className="grid gap-3 sm:grid-cols-[4.75rem_1fr]">
                  <img
                    src={rowPublicUrl(LISTEN_BAR_COVER_BUCKET, liveRotation.current.cover_path) || DEFAULT_LISTEN_BAR_COVER}
                    alt=""
                    className="aspect-square w-full rounded-xl bg-black object-cover"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-orange-200/45 bg-orange-400/14 px-3 py-1 text-[11px] font-black text-orange-100">
                        正在播放
                      </span>
                      <span className="text-[11px] font-black text-zinc-500">
                        {formatDuration(liveRotation.elapsedSeconds)} / {formatDuration(liveRotation.currentDuration)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-lg font-black text-white">{liveRotation.current.title}</p>
                    <p className="mt-1 truncate text-sm font-bold text-zinc-400">
                      {liveRotation.current.artist} / {liveRotation.current.ai_tool || "AI Music"} / {liveRotation.current.genre || "AI Music"}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-orange-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, (liveRotation.elapsedSeconds / Math.max(1, liveRotation.currentDuration)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </button>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {liveRotation.upcoming.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-6 text-sm font-bold text-zinc-500 sm:col-span-2 xl:col-span-3">
                    目前沒有下一首。請先上架更多歌曲。
                  </div>
                ) : (
                  liveRotation.upcoming.map((track, index) => (
                    <button
                      key={`${track.id}-${index}`}
                      type="button"
                      onClick={() => focusTrackInList(track.id)}
                      className="grid grid-cols-[2rem_3.25rem_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-black/34 p-2 text-left transition hover:border-cyan-200/45 hover:bg-cyan-300/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55"
                    >
                      <span className="text-center text-xs font-black text-cyan-100/70">{index + 1}</span>
                      <img
                        src={rowPublicUrl(LISTEN_BAR_COVER_BUCKET, track.cover_path) || DEFAULT_LISTEN_BAR_COVER}
                        alt=""
                        className="aspect-square w-full rounded-lg bg-black object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{track.title}</p>
                        <p className="mt-1 truncate text-[11px] font-bold text-zinc-500">
                          {track.artist} / {track.genre || "AI Music"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/38 px-4 py-8 text-center text-sm font-bold text-zinc-500">
              目前沒有可播放歌曲。上架歌曲後會顯示正在播放與接下來六首。
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={handleSubmit} className="rounded-[1.4rem] border border-orange-400/18 bg-black/62 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.52)] backdrop-blur md:p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-orange-300/70">ADD TRACK</p>
                <h2 className="mt-1 text-2xl font-black text-white">新增輪播歌曲</h2>
                <p className={`mt-2 text-sm leading-6 text-zinc-500 ${fontGlowSans.className}`} style={fontGlowSans.style}>
                  上傳是新增一首歌；更新既有歌曲請到右側清單整理資料。
                </p>
              </div>
              <span className="rounded-full border border-orange-300/25 px-3 py-1 text-xs font-bold text-orange-100">
                {totalActive} LIVE
              </span>
            </div>

            {!tableReady && (
              <div className="mb-4 rounded-2xl border border-orange-300/30 bg-orange-500/10 px-4 py-3 text-sm leading-6 text-orange-100">
                尚未建立資料表。請先執行 <span className="font-black">supabase/listen_bar_tracks.sql</span>。
              </div>
            )}
            {message && <p className="mb-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100">{message}</p>}
            {error && <p className="mb-4 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p>}
            <SafetyNotice kind="upload" className="mb-4" />

            <div className="grid gap-3">
              <label className="flex min-h-24 cursor-pointer flex-col justify-center rounded-2xl border border-orange-300/35 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-100 transition hover:bg-orange-500/16">
                <span>上傳音檔 MP3 / WAV / AIFF</span>
                <span className="mt-1 text-xs font-medium text-orange-100/60">{audioFile?.name ?? `必填，單檔上限 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，建議 MP3 320kbps`}</span>
                <input type="file" accept={LISTEN_BAR_AUDIO_UPLOAD_ACCEPT} onChange={handleAudioChange} className="hidden" />
              </label>

              {audioPreview && (
                <audio className="w-full accent-orange-500" controls preload="metadata" src={audioPreview}>
                  <track kind="captions" />
                </audio>
              )}

              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <label className="group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-black/55">
                  <img src={coverPreview} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/70 px-2 py-1 text-center text-[11px] font-black text-white">
                    換封面
                  </span>
                  <input type="file" accept={IMAGE_UPLOAD_ACCEPT} onChange={handleCoverChange} className="hidden" />
                </label>
                <div className="grid gap-3">
                  <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="歌名" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" required />
                  <input value={form.artist} onChange={(event) => updateForm({ artist: event.target.value })} placeholder="歌者 / 創作者" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" required />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.aiTool} onChange={(event) => updateForm({ aiTool: event.target.value })} placeholder="AI 工具，例如 Suno / Udio" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                <select
                  value={form.genre}
                  onChange={(event) => updateForm({ genre: event.target.value })}
                  className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-400"
                >
                  {LISTEN_BAR_ADMIN_GENRE_OPTIONS.map((genre) => (
                    <option key={genre.value} value={genre.value} className="bg-zinc-950 text-white">
                      {genre.value}
                    </option>
                  ))}
                </select>
                <input value={form.mood} onChange={(event) => updateForm({ mood: event.target.value })} placeholder="情緒 / 分類" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.bpm} onChange={(event) => updateForm({ bpm: event.target.value.replace(/[^\d]/g, "") })} placeholder="BPM" inputMode="numeric" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                  <input value={form.durationSeconds} onChange={(event) => updateForm({ durationSeconds: event.target.value.replace(/[^\d]/g, "") })} placeholder="秒數" inputMode="numeric" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                </div>
              </div>

              <textarea value={form.lyrics} onChange={(event) => updateForm({ lyrics: event.target.value.slice(0, 12000) })} placeholder="歌詞（選填）" rows={5} className="resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />

              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <input value={form.sortOrder} onChange={(event) => updateForm({ sortOrder: event.target.value.replace(/[^\d-]/g, "") })} placeholder="排序，數字越小越前面" inputMode="numeric" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                <label className="flex h-12 items-center gap-2 rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-zinc-200">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm({ isActive: event.target.checked })} className="h-4 w-4 accent-orange-500" />
                  上架
                </label>
              </div>

              <button type="submit" disabled={saving || !tableReady} className="h-12 rounded-xl bg-orange-500 text-sm font-black tracking-[0.14em] text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "儲存中..." : "加入官方輪播"}
              </button>
            </div>
          </form>

          <section className="rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.4)] backdrop-blur md:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">MANAGE TRACKS</p>
                <h2 className="mt-1 text-2xl font-black text-white">歌曲上架整理</h2>
                <p className="mt-1 text-xs font-bold text-zinc-500">
                  顯示 {renderedTracks.length} / {renderedTrackTotal}{removedTrackCount > 0 ? `，已刪除 ${removedTrackCount}` : ""}{selectedTrackIds.length > 0 ? `，已選 ${selectedTrackIds.length}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTrackVisibilityFilter("all")}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 ${
                    trackVisibilityFilter === "all"
                      ? "border-cyan-200/55 bg-cyan-300/10 text-cyan-100"
                      : "border-white/12 text-zinc-200 hover:border-cyan-200/55"
                  }`}
                >
                  全部
                </button>
                <button
                  type="button"
                  onClick={() => setTrackVisibilityFilter("active")}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 ${
                    trackVisibilityFilter === "active"
                      ? "border-cyan-200/55 bg-cyan-300/10 text-cyan-100"
                      : "border-white/12 text-zinc-200 hover:border-cyan-200/55"
                  }`}
                >
                  隱藏下架
                </button>
                <button
                  type="button"
                  onClick={() => setTrackVisibilityFilter("hidden")}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 ${
                    trackVisibilityFilter === "hidden"
                      ? "border-red-300/45 bg-red-500/10 text-red-100"
                      : "border-white/12 text-zinc-200 hover:border-red-300/45"
                  }`}
                >
                  只看下架{hiddenTrackCount > 0 ? ` ${hiddenTrackCount}` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setTrackVisibilityFilter("removed")}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200/55 ${
                    trackVisibilityFilter === "removed"
                      ? "border-red-300/55 bg-red-500/14 text-red-100"
                      : "border-white/12 text-zinc-200 hover:border-red-300/45"
                  }`}
                >
                  已經刪除{removedTrackCount > 0 ? ` ${removedTrackCount}` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setTrackVisibilityFilter("uncategorized")}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/55 ${
                    trackVisibilityFilter === "uncategorized"
                      ? "border-orange-200/65 bg-orange-500/14 text-orange-100"
                      : "border-white/12 text-zinc-200 hover:border-orange-200/55"
                  }`}
                >
                  待補類型{uncategorizedTrackCount > 0 ? ` ${uncategorizedTrackCount}` : ""}
                </button>
                <button type="button" disabled={playlistBusy || visiblePlayableTracks.length < 2} onClick={() => void randomizeTrackOrder()} className="rounded-full border border-orange-300/30 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100 transition hover:border-orange-200/65 disabled:cursor-not-allowed disabled:opacity-45">
                  {playlistBusy ? "排列中" : "隨機排列"}
                </button>
                <button type="button" disabled={playlistBusy || visiblePlayableTracks.length < 2} onClick={() => void normalizeTrackOrder()} className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-45">
                  {playlistBusy ? "處理中" : "重編排序"}
                </button>
                <button type="button" disabled={playlistBusy} onClick={() => void loadTracks()} className="rounded-full border border-cyan-200/25 px-4 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-45">
                  重新整理
                </button>
              </div>
            </div>

            <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-black/32 p-3">
              <input
                value={trackSearch}
                onChange={(event) => setTrackSearch(event.target.value)}
                placeholder="搜尋歌名、創作者、AI 工具、類型、狀態"
                className="h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200/70"
              />
              <div className="grid gap-2 sm:grid-cols-[auto_auto_minmax(9rem,1fr)_minmax(10rem,1fr)]">
                <button
                  type="button"
                  onClick={toggleRenderedSelection}
                  disabled={renderedTracks.length === 0}
                  className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {allRenderedSelected ? "取消本頁選取" : "選取本頁"}
                </button>
                <button
                  type="button"
                  onClick={() => setTrackSortMode((current) => (current === "updated_desc" ? "updated_asc" : "updated_desc"))}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 ${
                    trackSortMode === "updated_desc" || trackSortMode === "updated_asc"
                      ? "border-cyan-200/55 bg-cyan-300/10 text-cyan-100"
                      : "border-white/12 text-zinc-200 hover:border-cyan-200/55"
                  }`}
                >
                  {trackSortMode === "updated_asc" ? "時間：舊到新" : "時間：新到舊"}
                </button>
                <button
                  type="button"
                  onClick={() => setTrackSortMode((current) => (current === "genre" ? "manual" : "genre"))}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 ${
                    trackSortMode === "genre"
                      ? "border-cyan-200/55 bg-cyan-300/10 text-cyan-100"
                      : "border-white/12 text-zinc-200 hover:border-cyan-200/55"
                  }`}
                >
                  種類排列
                </button>
                <select
                  value={trackMonthFilter}
                  onChange={(event) => setTrackMonthFilter(event.target.value)}
                  className="h-10 rounded-full border border-white/12 bg-black/55 px-4 text-xs font-black text-zinc-200 outline-none transition focus:border-cyan-200/70"
                >
                  <option value="all">全部月份</option>
                  {monthOptions.map((month) => (
                    <option key={month} value={month}>
                      {trackMonthLabel(month)}
                    </option>
                  ))}
                </select>
                <select
                  value={trackSortMode}
                  onChange={(event) => setTrackSortMode(event.target.value as TrackSortMode)}
                  className="h-10 rounded-full border border-white/12 bg-black/55 px-4 text-xs font-black text-zinc-200 outline-none transition focus:border-cyan-200/70"
                >
                  <option value="manual">管理順序</option>
                  <option value="updated_desc">更新時間：新到舊</option>
                  <option value="updated_asc">更新時間：舊到新</option>
                  <option value="created_desc">上傳時間：新到舊</option>
                  <option value="created_asc">上傳時間：舊到新</option>
                  <option value="genre">種類</option>
                </select>
              </div>
            </div>

            {selectedTracks.length > 0 && (
              <div className="mb-4 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.055] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                    已選 {selectedTracks.length} 首
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedTrackIds([])}
                    className="rounded-full border border-white/12 px-3 py-1 text-[11px] font-black text-zinc-300 transition hover:border-white/30"
                  >
                    清除選取
                  </button>
                </div>
                <div className="grid gap-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)_auto]">
                  <select
                    value={bulkMetadataForm.genre}
                    onChange={(event) => setBulkMetadataForm((current) => ({ ...current, genre: event.target.value }))}
                    className="h-10 rounded-xl border border-white/12 bg-black/50 px-3 text-xs font-black text-white outline-none transition focus:border-cyan-200/70"
                  >
                    <option value="">不改類型</option>
                    {LISTEN_BAR_ADMIN_GENRE_OPTIONS.map((genre) => (
                      <option key={genre.value} value={genre.value} className="bg-zinc-950 text-white">
                        {genre.value}
                      </option>
                    ))}
                  </select>
                  <input
                    value={bulkMetadataForm.aiTool}
                    onChange={(event) => setBulkMetadataForm((current) => ({ ...current, aiTool: event.target.value }))}
                    placeholder="批次 AI 工具"
                    className="h-10 rounded-xl border border-white/12 bg-black/50 px-3 text-xs font-black text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200/70"
                  />
                  <input
                    value={bulkMetadataForm.mood}
                    onChange={(event) => setBulkMetadataForm((current) => ({ ...current, mood: event.target.value }))}
                    placeholder="批次情緒標籤"
                    className="h-10 rounded-xl border border-white/12 bg-black/50 px-3 text-xs font-black text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-200/70"
                  />
                  <button
                    type="button"
                    disabled={playlistBusy}
                    onClick={() => void bulkUpdateMetadata()}
                    className="rounded-xl border border-cyan-200/35 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    批次更新
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" disabled={playlistBusy} onClick={() => void bulkTrackAction("hide")} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55 disabled:cursor-not-allowed disabled:opacity-45">
                    批次下架
                  </button>
                  <button type="button" disabled={playlistBusy} onClick={() => void bulkTrackAction("restore")} className="rounded-full border border-cyan-200/25 px-4 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-45">
                    批次恢復
                  </button>
                  <button type="button" disabled={playlistBusy} onClick={() => void bulkTrackAction("remove")} className="rounded-full border border-red-300/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-100 transition hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-45">
                    批次刪除
                  </button>
                </div>
              </div>
            )}

            <div className="grid max-h-[72rem] gap-3 overflow-y-auto pr-1">
              {renderedTracks.length === 0 ? (
	                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-10 text-center text-sm leading-7 text-zinc-500">
	                  {displayTracks.length === 0
	                    ? "尚無輪播資料。先上傳第一首官方歌曲。"
	                    : trackSearch.trim()
	                      ? "沒有符合搜尋條件的歌曲。"
	                      : trackVisibilityFilter === "hidden"
	                        ? "目前沒有下架歌曲。"
	                        : trackVisibilityFilter === "removed"
	                          ? "目前沒有已刪除歌曲。"
	                        : trackVisibilityFilter === "uncategorized"
	                          ? "目前沒有待補類型的歌曲。"
	                          : "目前已隱藏下架歌曲，沒有可顯示的上架歌曲。"}
	                </div>
              ) : (
                renderedTracks.map((track) => {
                  const coverUrl = rowPublicUrl(LISTEN_BAR_COVER_BUCKET, track.cover_path) || DEFAULT_LISTEN_BAR_COVER;
                  const audioUrl = rowPublicUrl(LISTEN_BAR_AUDIO_BUCKET, track.audio_path);
                    const removed = removedStatus(track);
	                  const hidden = isHiddenTrack(track);
                    const unavailable = hidden || removed;
	                  const status = trackStatusBadge(track, currentlyPlayingId);
	                  const updatedAt = track.updated_at ? new Date(track.updated_at).toLocaleString("zh-TW", { hour12: false }) : "-";
	                  const focused = focusedTrackId === track.id;
	                  const editing = editingTrackId === track.id && metadataForm;
	                  const needsGenreReview = isUncategorizedTrack(track);
                    const selected = selectedTrackIdSet.has(track.id);
	                  return (
                    <article
                      key={track.id}
                      id={`listen-bar-admin-track-${track.id}`}
                      className={`scroll-mt-8 rounded-2xl border p-3 transition ${
                        selected
                          ? "border-cyan-200/70 bg-cyan-300/[0.08] shadow-[0_0_0_2px_rgba(103,232,249,0.14)]"
                          : focused
                          ? "border-cyan-200/65 bg-cyan-300/[0.075] shadow-[0_0_0_2px_rgba(103,232,249,0.18),0_18px_60px_rgba(0,0,0,0.35)]"
                          : track.id === currentlyPlayingId
                            ? "border-orange-300/45 bg-orange-500/[0.055]"
                            : removed
                              ? "border-red-300/28 bg-red-950/[0.12]"
                              : hidden
                              ? "border-red-300/20 bg-red-950/[0.08]"
                          : "border-white/10 bg-black/42"
                      }`}
                    >
                      <div className="grid gap-3 sm:grid-cols-[2.4rem_5.5rem_1fr]">
                        <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/12 bg-black/45 transition hover:border-cyan-200/55">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleTrackSelection(track.id)}
                            className="h-4 w-4 accent-cyan-300"
                            aria-label={`選取 ${track.title}`}
                          />
                        </label>
                        <img src={coverUrl} alt="" className={`aspect-square w-full rounded-xl bg-black object-cover ${unavailable ? "opacity-45 grayscale" : ""}`} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-lg font-black text-white">{track.title}</p>
                              <p className="mt-1 truncate text-sm text-zinc-400">
                                {track.artist} / {track.ai_tool || "AI Music"} / {track.genre || "AI Music"}
                              </p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-xs font-black ${status.className}`}>
                              {status.label}
	                            </span>
	                            {needsGenreReview && (
	                              <span className="rounded-full border border-orange-200/40 bg-orange-500/12 px-3 py-1 text-xs font-black text-orange-100">
	                                待補類型
	                              </span>
	                            )}
	                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-bold text-zinc-300">
                              {phaseLabel(track)}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-bold text-zinc-300">
                              審核：{adminReviewLabel(track)}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-bold text-zinc-300">
                              反應：{trackReactionTotal(track)}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-bold text-zinc-300">
                              更新：{updatedAt}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-xs text-zinc-400">
                              秒數 <span className="font-black text-white">{formatDuration(track.duration_seconds)}</span>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-xs text-zinc-400">
                              BPM <span className="font-black text-white">{track.bpm || "-"}</span>
                            </div>
                            <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-xs text-zinc-400">
                              排序 <span className="font-black text-white">{track.sort_order ?? 100}</span>
                            </div>
                          </div>
                          {audioUrl && (
                            <audio className="mt-3 w-full accent-orange-500" controls controlsList="nodownload noplaybackrate" preload="metadata" src={audioUrl}>
                              <track kind="captions" />
                            </audio>
                          )}
	                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={!track.audio_path?.trim() || downloadingTrackId === track.id}
                              onClick={() => void downloadOriginalTrack(track)}
                              className="rounded-full border border-yellow-200/35 bg-yellow-300/10 px-4 py-2 text-xs font-black text-yellow-100 transition hover:border-yellow-200/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/55 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {downloadingTrackId === track.id ? "建立連結中" : "下載原檔"}
                            </button>
	                            <button type="button" disabled={metadataSavingId === track.id} onClick={() => (editing ? cancelEditTrack() : beginEditTrack(track))} className="rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100 transition hover:border-orange-200/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/55 disabled:cursor-not-allowed disabled:opacity-45">
	                              {editing ? "收起編輯" : "編輯資料"}
	                            </button>
	                            <button type="button" disabled={operatingTrackId === track.id} onClick={() => void (unavailable ? restoreTrack(track) : hideTrack(track))} className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45 ${unavailable ? "border-cyan-300/25 text-cyan-100 hover:border-cyan-200/65 focus-visible:ring-cyan-200/55" : "border-white/12 text-zinc-200 hover:border-cyan-200/55 focus-visible:ring-cyan-200/55"}`}>
	                              {operatingTrackId === track.id ? "處理中" : unavailable ? "恢復上架" : "下架"}
	                            </button>
                            <button type="button" disabled={operatingTrackId === track.id || removedStatus(track)} onClick={() => void removeTrack(track)} className="rounded-full border border-red-300/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-100 transition hover:border-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200/55 disabled:cursor-not-allowed disabled:opacity-45">
                              刪除
                            </button>
                            <button type="button" disabled={unavailable || operatingTrackId === track.id} onClick={() => void moveTrack(track, "up")} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 disabled:cursor-not-allowed disabled:opacity-45">
                              往前
                            </button>
                            <button type="button" disabled={unavailable || operatingTrackId === track.id} onClick={() => void moveTrack(track, "down")} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 disabled:cursor-not-allowed disabled:opacity-45">
                              往後
	                            </button>
	                          </div>
	                          {editing && metadataForm && (
	                            <div className="mt-4 rounded-2xl border border-orange-200/16 bg-orange-500/[0.045] p-4">
	                              <div className="grid gap-3 md:grid-cols-2">
	                                <label className="block">
	                                  <span className="text-xs font-bold text-zinc-500">歌名</span>
	                                  <input
	                                    value={metadataForm.title}
	                                    onChange={(event) => updateMetadataForm({ title: event.target.value })}
	                                    maxLength={120}
	                                    className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
	                                  />
	                                </label>
	                                <label className="block">
	                                  <span className="text-xs font-bold text-zinc-500">創作者 / 歌手</span>
	                                  <input
	                                    value={metadataForm.artist}
	                                    onChange={(event) => updateMetadataForm({ artist: event.target.value })}
	                                    maxLength={120}
	                                    className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
	                                  />
	                                </label>
	                                <label className="block">
	                                  <span className="text-xs font-bold text-zinc-500">AI 工具</span>
	                                  <input
	                                    value={metadataForm.aiTool}
	                                    onChange={(event) => updateMetadataForm({ aiTool: event.target.value })}
	                                    maxLength={80}
	                                    className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
	                                  />
	                                </label>
	                                <label className="block">
	                                  <span className="text-xs font-bold text-zinc-500">類型</span>
	                                  <select
	                                    value={metadataForm.genre}
	                                    onChange={(event) => updateMetadataForm({ genre: event.target.value })}
	                                    className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
	                                  >
	                                    {LISTEN_BAR_ADMIN_GENRE_OPTIONS.map((genre) => (
	                                      <option key={genre.value} value={genre.value} className="bg-zinc-950 text-white">
	                                        {genre.value}
	                                      </option>
	                                    ))}
	                                  </select>
	                                </label>
	                                <label className="block">
	                                  <span className="text-xs font-bold text-zinc-500">情緒 / 標籤</span>
	                                  <input
	                                    value={metadataForm.mood}
	                                    onChange={(event) => updateMetadataForm({ mood: event.target.value })}
	                                    maxLength={80}
	                                    className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
	                                  />
	                                </label>
	                                <div className="grid gap-3 sm:grid-cols-3">
	                                  <label className="block">
	                                    <span className="text-xs font-bold text-zinc-500">BPM</span>
	                                    <input
	                                      value={metadataForm.bpm}
	                                      onChange={(event) => updateMetadataForm({ bpm: event.target.value.replace(/[^\d]/g, "") })}
	                                      inputMode="numeric"
	                                      className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
	                                    />
	                                  </label>
	                                  <label className="block">
	                                    <span className="text-xs font-bold text-zinc-500">秒數</span>
	                                    <input
	                                      value={metadataForm.durationSeconds}
	                                      onChange={(event) => updateMetadataForm({ durationSeconds: event.target.value.replace(/[^\d]/g, "") })}
	                                      inputMode="numeric"
	                                      className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
	                                    />
	                                  </label>
	                                  <label className="block">
	                                    <span className="text-xs font-bold text-zinc-500">排序</span>
	                                    <input
	                                      value={metadataForm.sortOrder}
	                                      onChange={(event) => updateMetadataForm({ sortOrder: event.target.value.replace(/[^\d-]/g, "") })}
	                                      inputMode="numeric"
	                                      className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
	                                    />
	                                  </label>
	                                </div>
	                              </div>
	                              <label className="mt-3 block">
	                                <span className="text-xs font-bold text-zinc-500">歌詞</span>
	                                <textarea
	                                  value={metadataForm.lyrics}
	                                  onChange={(event) => updateMetadataForm({ lyrics: event.target.value.slice(0, 12000) })}
	                                  rows={4}
	                                  className="mt-1 w-full resize-y rounded-xl border border-white/12 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-orange-300/70"
	                                />
	                              </label>
	                              <div className="mt-4 flex flex-wrap justify-end gap-2">
	                                <button type="button" onClick={cancelEditTrack} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-white/30">
	                                  取消
	                                </button>
	                                <button type="button" disabled={metadataSavingId === track.id} onClick={() => void saveTrackMetadata(track)} className="rounded-full border border-orange-200/40 bg-orange-500 px-5 py-2 text-xs font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-55">
	                                  {metadataSavingId === track.id ? "儲存中" : "儲存資料"}
	                                </button>
	                              </div>
	                            </div>
	                          )}
	                        </div>
	                      </div>
	                    </article>
                  );
                })
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
