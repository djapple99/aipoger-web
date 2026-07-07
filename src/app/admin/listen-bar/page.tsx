"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type TrackVisibilityFilter = "all" | "active" | "hidden" | "capacity_eliminated";
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
  youtubeUrl: string;
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
  youtubeUrl: string;
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

type DailySpotlightRow = {
  id: string;
  spotlight_date: string;
  track_id: string;
  headline: string | null;
  intro: string | null;
  caption: string | null;
  media_path: string | null;
  media_type: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type DailySpotlightPayload = {
  ok?: boolean;
  date?: string;
  missingTable?: boolean;
  spotlight?: DailySpotlightRow | null;
  track?: AdminListenBarTrackRow | null;
  error?: string;
};

type DailySpotlightForm = {
  date: string;
  trackId: string;
  headline: string;
  intro: string;
  caption: string;
};

const initialForm: TrackForm = {
  title: "",
  artist: "AIPOGER",
  aiTool: "Suno",
  genre: "Original 自我風格",
  mood: "官方輪播",
  youtubeUrl: "",
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

function taipeiDateInputValue(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return now.toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

const initialDailySpotlightForm: DailySpotlightForm = {
  date: taipeiDateInputValue(),
  trackId: "",
  headline: "",
  intro: "",
  caption: "",
};

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
  const status = track.review_status?.toLowerCase();
  return track.is_active === false || status === "hidden" || status === "removed" || Boolean(track.hidden_at) || Boolean(track.removed_at);
}

function removedStatus(track: AdminListenBarTrackRow) {
  return track.review_status?.toLowerCase() === "removed" || Boolean(track.removed_at);
}

function hiddenStatus(track: AdminListenBarTrackRow) {
  return track.review_status?.toLowerCase() === "hidden" || Boolean(track.hidden_at);
}

function capacityEliminatedStatus(track: AdminListenBarTrackRow) {
  const note = track.moderation_note?.toLowerCase() ?? "";
  const hasCapacityNote = note.includes("capacity") || note.includes("genre") || note.includes("public pool") || note.includes("rotation");
  const legacyCapacityCandidate = !note && track.source === "community" && track.bar_phase === "public" && !track.hidden_at;
  return (
    removedStatus(track) &&
    track.bar_phase === "public" &&
    (hasCapacityNote || legacyCapacityCandidate)
  );
}

function trackRemovedAtLabel(track: AdminListenBarTrackRow) {
  if (!track.removed_at) return "";
  return new Date(track.removed_at).toLocaleString("zh-TW", { hour12: false });
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
  if (capacityEliminatedStatus(track)) {
    return { label: "類型池淘汰", className: "border-fuchsia-200/40 bg-fuchsia-500/12 text-fuchsia-100" };
  }
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
  if (capacityEliminatedStatus(track)) return "類型池淘汰";
  if (removedStatus(track)) return "已移除";
  if (hiddenStatus(track) || track.is_active === false) return "已下架";
  if (track.bar_phase === "public") return "公播池";
  if (track.bar_phase === "challenger") return "Challenger";
  return "未分池";
}

function adminReviewLabel(track: AdminListenBarTrackRow) {
  if (capacityEliminatedStatus(track)) return "genre-capacity-eliminated";
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
    track.moderation_note,
    phaseLabel(track),
    adminReviewLabel(track),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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
    youtubeUrl: track.youtube_url?.trim() || "",
    bpm: typeof track.bpm === "number" && Number.isFinite(track.bpm) ? String(track.bpm) : "",
    durationSeconds:
      typeof track.duration_seconds === "number" && Number.isFinite(track.duration_seconds)
        ? String(track.duration_seconds)
        : "",
    lyrics: track.lyrics ?? "",
    sortOrder: typeof track.sort_order === "number" && Number.isFinite(track.sort_order) ? String(track.sort_order) : "1000",
  };
}

function dailySpotlightCopy(track: AdminListenBarTrackRow, date: string) {
  const title = track.title?.trim() || "今日推薦歌";
  const artist = track.artist?.trim() || "AIPOGER 創作者";
  const genre = track.genre?.trim() || "AI Music";
  const dayLabel = date.replaceAll("-", ".");
  return {
    headline: `${title} / ${artist}`,
    intro: `${dayLabel} 今日推薦：${title}。${genre} 風格，適合現在進傷心酒吧聽完整首。`,
    caption: [
      `今日推薦歌：${title}`,
      `創作者：${artist}`,
      `類型：${genre}`,
      "",
      "進 AIPOGER /today 聽今日推薦，愛心與留言會累積在原歌曲上。",
    ].join("\n"),
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
  const activeAdminAudioRef = useRef<HTMLAudioElement | null>(null);
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
  const [trackGenreFilter, setTrackGenreFilter] = useState("all");
  const [trackMonthFilter, setTrackMonthFilter] = useState("all");
  const [trackSearch, setTrackSearch] = useState("");
  const [trackSortMode, setTrackSortMode] = useState<TrackSortMode>("manual");
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [bulkMetadataForm, setBulkMetadataForm] = useState<BulkMetadataForm>(initialBulkMetadataForm);
  const [focusedTrackId, setFocusedTrackId] = useState("");
  const [editingTrackId, setEditingTrackId] = useState("");
  const [metadataForm, setMetadataForm] = useState<TrackMetadataForm | null>(null);
  const [metadataSavingId, setMetadataSavingId] = useState("");
  const [optimisticTrackPatches, setOptimisticTrackPatches] = useState<Record<string, Partial<AdminListenBarTrackRow>>>({});
  const [spotlightForm, setSpotlightForm] = useState<DailySpotlightForm>(initialDailySpotlightForm);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightSaving, setSpotlightSaving] = useState(false);
  const [spotlightMessage, setSpotlightMessage] = useState("");
  const [spotlightError, setSpotlightError] = useState("");
  const [dailySpotlight, setDailySpotlight] = useState<DailySpotlightRow | null>(null);
  const [dailySpotlightTrack, setDailySpotlightTrack] = useState<AdminListenBarTrackRow | null>(null);

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
  const genreFilterOptions = useMemo(
    () =>
      LISTEN_BAR_ADMIN_GENRE_OPTIONS.map((genre) => ({
        ...genre,
        count: displayTracks.filter((track) => track.genre?.trim() === genre.value).length,
      })),
    [displayTracks],
  );
  const visiblePlayableTracks = useMemo(() => activePlayableTracks(displayTracks), [displayTracks]);
  const spotlightTrackOptions = useMemo(
    () => activePlayableTracks(displayTracks).filter((track) => track.source === "community" && !track.is_featured_official),
    [displayTracks],
  );
  const selectedSpotlightTrack = useMemo(
    () => spotlightTrackOptions.find((track) => track.id === spotlightForm.trackId) ?? dailySpotlightTrack,
    [dailySpotlightTrack, spotlightForm.trackId, spotlightTrackOptions],
  );
  const renderedTracks = useMemo(() => {
    const query = trackSearch.trim().toLowerCase();
    const filteredTracks = displayTracks.filter((track) => {
      const hidden = isHiddenTrack(track);
      if (trackVisibilityFilter === "active" && hidden) return false;
      if (trackVisibilityFilter === "hidden" && !hidden) return false;
      if (trackVisibilityFilter === "capacity_eliminated" && !capacityEliminatedStatus(track)) return false;
      if (trackGenreFilter !== "all" && track.genre?.trim() !== trackGenreFilter) return false;
      if (trackMonthFilter !== "all" && trackMonthKey(track) !== trackMonthFilter) return false;
      if (!query) return true;
      return trackSearchText(track).includes(query);
    });
    return sortTracksForAdmin(filteredTracks, trackSortMode);
  }, [displayTracks, trackGenreFilter, trackMonthFilter, trackSearch, trackSortMode, trackVisibilityFilter]);
  const selectedTrackIdSet = useMemo(() => new Set(selectedTrackIds), [selectedTrackIds]);
  const selectedTracks = useMemo(
    () => displayTracks.filter((track) => selectedTrackIdSet.has(track.id)),
    [displayTracks, selectedTrackIdSet],
  );
  const allRenderedSelected = renderedTracks.length > 0 && renderedTracks.every((track) => selectedTrackIdSet.has(track.id));
  const hiddenTrackCount = useMemo(() => displayTracks.filter(isHiddenTrack).length, [displayTracks]);
  const capacityEliminatedTrackCount = useMemo(() => displayTracks.filter(capacityEliminatedStatus).length, [displayTracks]);
  const liveRotation = useMemo(() => liveRotationSnapshot(displayTracks, nowMs), [displayTracks, nowMs]);
  const currentlyPlayingId = liveRotation.current?.id ?? "";
  const totalActive = visiblePlayableTracks.length;

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

  const loadDailySpotlight = useCallback(async (date: string) => {
    setSpotlightLoading(true);
    setSpotlightError("");
    setSpotlightMessage("");
    const response = await fetch(`/api/listen-bar/daily-spotlight?date=${encodeURIComponent(date)}`, {
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as DailySpotlightPayload | null;
    if (!response.ok) {
      setDailySpotlight(null);
      setDailySpotlightTrack(null);
      setSpotlightError(payload?.error || "無法讀取每日推薦歌設定。");
      setSpotlightLoading(false);
      return;
    }

    if (payload?.missingTable) {
      setDailySpotlight(null);
      setDailySpotlightTrack(null);
      setSpotlightForm((current) => ({ ...current, date, trackId: "", headline: "", intro: "", caption: "" }));
      setSpotlightError("尚未建立每日推薦歌資料表。請先套用 supabase/20260702_listen_bar_daily_spotlight.sql。");
      setSpotlightLoading(false);
      return;
    }

    const spotlight = payload?.spotlight ?? null;
    const track = payload?.track ?? null;
    setDailySpotlight(spotlight);
    setDailySpotlightTrack(track);
    setSpotlightForm({
      date,
      trackId: spotlight?.track_id ?? "",
      headline: spotlight?.headline ?? "",
      intro: spotlight?.intro ?? "",
      caption: spotlight?.caption ?? "",
    });
    setSpotlightLoading(false);
  }, []);

  useEffect(() => {
    if (adminState !== "ready") return;
    void loadDailySpotlight(spotlightForm.date);
  }, [adminState, loadDailySpotlight, spotlightForm.date]);

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
      await Promise.all([loadTracks(), loadReportSummary()]);
    })();
  }, [loadReportSummary, loadTracks]);

  useEffect(() => {
    return () => {
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
      if (embeddedCover?.previewUrl) URL.revokeObjectURL(embeddedCover.previewUrl);
    };
  }, [audioPreview, coverPreview, embeddedCover]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      activeAdminAudioRef.current?.pause();
      activeAdminAudioRef.current = null;
    };
  }, []);

  const updateForm = (patch: Partial<TrackForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const updateMetadataForm = (patch: Partial<TrackMetadataForm>) => {
    setMetadataForm((current) => (current ? { ...current, ...patch } : current));
  };

  const updateSpotlightForm = (patch: Partial<DailySpotlightForm>) => {
    setSpotlightForm((current) => ({ ...current, ...patch }));
  };

  const handleAdminAudioPlay = (event: SyntheticEvent<HTMLAudioElement>) => {
    const currentAudio = event.currentTarget;
    document.querySelectorAll<HTMLAudioElement>("[data-admin-listen-bar-audio]").forEach((audio) => {
      if (audio !== currentAudio) audio.pause();
    });
    activeAdminAudioRef.current = currentAudio;
  };

  const generateSpotlightDraft = () => {
    if (!selectedSpotlightTrack) {
      setSpotlightError("請先選擇每日推薦歌曲。");
      return;
    }
    const draft = dailySpotlightCopy(selectedSpotlightTrack, spotlightForm.date);
    setSpotlightForm((current) => ({ ...current, ...draft }));
    setSpotlightError("");
    setSpotlightMessage("已產生推薦文草稿，儲存後才會成為 /today 推薦。");
  };

  const saveDailySpotlight = async () => {
    setSpotlightError("");
    setSpotlightMessage("");
    if (!spotlightForm.trackId) {
      setSpotlightError("請先選擇每日推薦歌曲。");
      return;
    }
    setSpotlightSaving(true);
    const response = await fetch("/api/listen-bar/daily-spotlight", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({
        date: spotlightForm.date,
        trackId: spotlightForm.trackId,
        headline: spotlightForm.headline,
        intro: spotlightForm.intro,
        caption: spotlightForm.caption,
        isActive: true,
      }),
    });
    const payload = (await response.json().catch(() => null)) as DailySpotlightPayload | null;
    if (!response.ok) {
      setSpotlightError(payload?.error || "每日推薦歌儲存失敗。");
      setSpotlightSaving(false);
      return;
    }
    setDailySpotlight(payload?.spotlight ?? null);
    setDailySpotlightTrack(payload?.track ?? null);
    setSpotlightMessage("已儲存每日推薦。/today 會依台灣日期導向今天設定，不是 24H 倒數刪除。");
    setSpotlightSaving(false);
  };

  const focusTrackInList = useCallback((trackId: string) => {
    if (!trackId) return;
    setTrackVisibilityFilter("all");
    setTrackGenreFilter("all");
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
      setError("請使用 MP3、M4A、AAC 或 OGG 音檔。");
      return;
    }
    if (file && file.size > LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES) {
      setAudioFile(null);
      setAudioPreview("");
      setError(`音檔太大：${listenBarAudioSizeLabel(file)}。傷心酒吧新投稿上限是 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，請改用 MP3 / M4A / AAC / OGG 壓縮格式。`);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!audioFile) {
      setError("請先選擇 MP3 / M4A / AAC / OGG 音檔。");
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

      const insertPayload = {
        title: form.title.trim(),
        artist: form.artist.trim(),
        ai_tool: form.aiTool.trim() || "AI Music",
        genre: form.genre.trim() || null,
        mood: form.mood.trim() || null,
        youtube_url: form.youtubeUrl.trim() || null,
        bpm: form.bpm.trim() ? Number(form.bpm) : null,
        duration_seconds: form.durationSeconds.trim() ? Number(form.durationSeconds) : null,
        lyrics: form.lyrics.trim() || null,
        audio_path: audioPath,
        cover_path: coverPath,
        sort_order: form.sortOrder.trim() ? Number(form.sortOrder) : 100,
        is_active: form.isActive,
        created_by: userId,
      };
      let { error: insertError } = await supabase.from("listen_bar_tracks").insert(insertPayload);
      if (insertError && /schema cache|column.*does not exist|PGRST204|youtube_url/i.test(String(insertError.message ?? insertError))) {
        const fallbackPayload = { ...insertPayload };
        delete (fallbackPayload as Partial<typeof insertPayload>).youtube_url;
        const fallbackInsert = await supabase.from("listen_bar_tracks").insert(fallbackPayload);
        insertError = fallbackInsert.error;
      }
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
        youtubeUrl: metadataForm.youtubeUrl.trim(),
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
            <Link href="/admin/analytics" className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-sm font-bold text-yellow-100">
              數據後台
            </Link>
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

        <section className="rounded-[1.4rem] border border-orange-300/18 bg-orange-500/[0.055] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.36)] backdrop-blur md:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-orange-300/70">TODAY SPOTLIGHT</p>
              <h2 className="mt-1 text-2xl font-black text-white">每日推薦歌</h2>
              <p className="mt-1 text-xs font-bold leading-5 text-zinc-500">
                依台灣日期切換；不是 24H 倒數。/today 永遠導向今天，舊日期設定不會刪除。
              </p>
            </div>
            <Link
              href="/today"
              className="rounded-full border border-orange-200/35 bg-orange-500/12 px-4 py-2 text-xs font-black text-orange-100 transition hover:border-orange-100"
            >
              開啟 /today
            </Link>
          </div>

          {spotlightMessage && <p className="mb-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-bold text-cyan-100">{spotlightMessage}</p>}
          {spotlightError && <p className="mb-4 rounded-2xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{spotlightError}</p>}

          <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
                <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
                  日期
                  <input
                    type="date"
                    value={spotlightForm.date}
                    onChange={(event) => updateSpotlightForm({ date: event.target.value || taipeiDateInputValue() })}
                    className="h-12 rounded-xl border border-white/12 bg-black/55 px-4 text-sm font-bold tracking-normal text-white outline-none transition focus:border-orange-400"
                  />
                </label>
                <label className="grid gap-1 text-xs font-black uppercase tracking-[0.12em] text-zinc-500">
                  推薦歌曲
                  <select
                    value={spotlightForm.trackId}
                    onChange={(event) => updateSpotlightForm({ trackId: event.target.value })}
                    className="h-12 min-w-0 rounded-xl border border-white/12 bg-black/55 px-4 text-sm font-bold tracking-normal text-white outline-none transition focus:border-orange-400"
                  >
                    <option value="" className="bg-zinc-950 text-white">選擇可公開播放歌曲</option>
                    {spotlightTrackOptions.map((track) => (
                      <option key={track.id} value={track.id} className="bg-zinc-950 text-white">
                        {track.title} / {track.artist} / {track.genre || "AI Music"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <input
                value={spotlightForm.headline}
                onChange={(event) => updateSpotlightForm({ headline: event.target.value.slice(0, 120) })}
                placeholder="推薦標題，例如 歌名 / 創作者"
                className="h-12 rounded-xl border border-white/12 bg-black/55 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
              <textarea
                value={spotlightForm.intro}
                onChange={(event) => updateSpotlightForm({ intro: event.target.value.slice(0, 500) })}
                placeholder="站內推薦介紹"
                rows={3}
                className="resize-y rounded-xl border border-white/12 bg-black/55 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
              <textarea
                value={spotlightForm.caption}
                onChange={(event) => updateSpotlightForm({ caption: event.target.value.slice(0, 1200) })}
                placeholder="社群發文草稿（目前只儲存，不自動發布）"
                rows={5}
                className="resize-y rounded-xl border border-white/12 bg-black/55 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void loadDailySpotlight(spotlightForm.date)}
                  disabled={spotlightLoading}
                  className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-orange-200/55 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {spotlightLoading ? "讀取中" : "讀取日期"}
                </button>
                <button
                  type="button"
                  onClick={generateSpotlightDraft}
                  disabled={!selectedSpotlightTrack}
                  className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  產生推薦文
                </button>
                <button
                  type="button"
                  onClick={() => void saveDailySpotlight()}
                  disabled={spotlightSaving || !spotlightForm.trackId}
                  className="rounded-full border border-orange-200/40 bg-orange-500 px-5 py-2 text-xs font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {spotlightSaving ? "儲存中" : "儲存每日推薦"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/42 p-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300/70">Preview</p>
              {selectedSpotlightTrack ? (
                <div className="mt-3 grid gap-4 sm:grid-cols-[7rem_1fr]">
                  <img
                    src={rowPublicUrl(LISTEN_BAR_COVER_BUCKET, selectedSpotlightTrack.cover_path) || DEFAULT_LISTEN_BAR_COVER}
                    alt=""
                    className="aspect-square w-full rounded-2xl bg-black object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xl font-black text-white">{spotlightForm.headline || selectedSpotlightTrack.title}</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">
                      {spotlightForm.intro || `${selectedSpotlightTrack.artist} / ${selectedSpotlightTrack.genre || "AI Music"}`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-orange-200/25 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-100">
                        {spotlightForm.date}
                      </span>
                      <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                        {phaseLabel(selectedSpotlightTrack)}
                      </span>
                      <span className="rounded-full border border-white/12 px-3 py-1 text-xs font-black text-zinc-300">
                        {trackReactionTotal(selectedSpotlightTrack)} reactions
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => focusTrackInList(selectedSpotlightTrack.id)}
                        className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55"
                      >
                        跳到歌曲管理
                      </button>
                      {dailySpotlight?.track_id === selectedSpotlightTrack.id && (
                        <span className="rounded-full border border-orange-200/35 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100">
                          此日期已設定
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-8 text-sm font-bold text-zinc-500">
                  選一首已上架、有音檔、未下架的社群歌曲作為每日推薦。
                </div>
              )}
            </div>
          </div>
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
                <span>上傳音檔 MP3 / M4A / AAC / OGG</span>
                <span className="mt-1 text-xs font-medium text-orange-100/60">{audioFile?.name ?? `必填，單檔上限 ${LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL}，建議 MP3 320kbps`}</span>
                <input type="file" accept={LISTEN_BAR_AUDIO_UPLOAD_ACCEPT} onChange={handleAudioChange} className="hidden" />
              </label>

              {audioPreview && (
                <audio
                  className="w-full accent-orange-500"
                  controls
                  data-admin-listen-bar-audio="true"
                  onPlay={handleAdminAudioPlay}
                  preload="metadata"
                  src={audioPreview}
                >
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
                <input value={form.youtubeUrl} onChange={(event) => updateForm({ youtubeUrl: event.target.value.slice(0, 300) })} placeholder="YouTube MV 連結（選填）" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
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
                  顯示 {renderedTracks.length} / {displayTracks.length}{selectedTrackIds.length > 0 ? `，已選 ${selectedTrackIds.length}` : ""}
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
                  onClick={() => setTrackVisibilityFilter("capacity_eliminated")}
                  className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200/55 ${
                    trackVisibilityFilter === "capacity_eliminated"
                      ? "border-fuchsia-200/60 bg-fuchsia-500/14 text-fuchsia-100"
                      : "border-white/12 text-zinc-200 hover:border-fuchsia-200/55"
                  }`}
                >
                  類型池淘汰{capacityEliminatedTrackCount > 0 ? ` ${capacityEliminatedTrackCount}` : ""}
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
              <div className="grid gap-2 sm:grid-cols-[auto_auto_minmax(11rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1fr)]">
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
                  value={trackGenreFilter}
                  onChange={(event) => setTrackGenreFilter(event.target.value)}
                  className="h-10 rounded-full border border-white/12 bg-black/55 px-4 text-xs font-black text-zinc-200 outline-none transition focus:border-cyan-200/70"
                  aria-label="依歌曲種類篩選"
                >
                  <option value="all">全部種類</option>
                  {genreFilterOptions.map((genre) => (
                    <option key={genre.value} value={genre.value}>
                      {genre.value}{genre.count > 0 ? ` ${genre.count}` : ""}
                    </option>
                  ))}
                </select>
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
                      : trackGenreFilter !== "all"
                        ? "這個種類目前沒有符合條件的歌曲。"
                      : trackVisibilityFilter === "hidden"
                        ? "目前沒有下架歌曲。"
                        : trackVisibilityFilter === "capacity_eliminated"
                          ? "目前沒有因類型池容量規則被淘汰的歌曲。"
                          : "目前已隱藏下架歌曲，沒有可顯示的上架歌曲。"}
                </div>
              ) : (
                renderedTracks.map((track) => {
                  const coverUrl = rowPublicUrl(LISTEN_BAR_COVER_BUCKET, track.cover_path) || DEFAULT_LISTEN_BAR_COVER;
                  const audioUrl = rowPublicUrl(LISTEN_BAR_AUDIO_BUCKET, track.audio_path);
                  const hidden = isHiddenTrack(track);
                  const status = trackStatusBadge(track, currentlyPlayingId);
                  const updatedAt = track.updated_at ? new Date(track.updated_at).toLocaleString("zh-TW", { hour12: false }) : "-";
                  const focused = focusedTrackId === track.id;
                  const editing = editingTrackId === track.id && metadataForm;
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
                        <img src={coverUrl} alt="" className={`aspect-square w-full rounded-xl bg-black object-cover ${hidden ? "opacity-45 grayscale" : ""}`} />
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
                              {track.removed_at && (
                                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-bold text-zinc-300">
                                  淘汰/移除：{trackRemovedAtLabel(track)}
                                </span>
                              )}
                              {track.moderation_note && (
                                <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-bold text-zinc-300">
                                  原因：{track.moderation_note}
                                </span>
                              )}
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
                            <audio
                              className="mt-3 w-full accent-orange-500"
                              controls
                              controlsList="nodownload noplaybackrate"
                              data-admin-listen-bar-audio="true"
                              onPlay={handleAdminAudioPlay}
                              preload="metadata"
                              src={audioUrl}
                            >
                              <track kind="captions" />
                            </audio>
                          )}
	                          <div className="mt-3 flex flex-wrap gap-2">
	                            <button type="button" disabled={metadataSavingId === track.id} onClick={() => (editing ? cancelEditTrack() : beginEditTrack(track))} className="rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100 transition hover:border-orange-200/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/55 disabled:cursor-not-allowed disabled:opacity-45">
	                              {editing ? "收起編輯" : "編輯資料"}
	                            </button>
	                            <button type="button" disabled={operatingTrackId === track.id} onClick={() => void (hidden ? restoreTrack(track) : hideTrack(track))} className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45 ${hidden ? "border-cyan-300/25 text-cyan-100 hover:border-cyan-200/65 focus-visible:ring-cyan-200/55" : "border-white/12 text-zinc-200 hover:border-cyan-200/55 focus-visible:ring-cyan-200/55"}`}>
	                              {operatingTrackId === track.id ? "處理中" : hidden ? "恢復上架" : "下架"}
	                            </button>
                            <button type="button" disabled={operatingTrackId === track.id || removedStatus(track)} onClick={() => void removeTrack(track)} className="rounded-full border border-red-300/30 bg-red-500/10 px-4 py-2 text-xs font-black text-red-100 transition hover:border-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200/55 disabled:cursor-not-allowed disabled:opacity-45">
                              刪除
                            </button>
                            <button type="button" disabled={hidden || operatingTrackId === track.id} onClick={() => void moveTrack(track, "up")} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 disabled:cursor-not-allowed disabled:opacity-45">
                              往前
                            </button>
                            <button type="button" disabled={hidden || operatingTrackId === track.id} onClick={() => void moveTrack(track, "down")} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/55 disabled:cursor-not-allowed disabled:opacity-45">
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
                                <label className="block">
                                  <span className="text-xs font-bold text-zinc-500">YouTube MV</span>
                                  <input
                                    value={metadataForm.youtubeUrl}
                                    onChange={(event) => updateMetadataForm({ youtubeUrl: event.target.value.slice(0, 300) })}
                                    maxLength={300}
                                    className="mt-1 h-11 w-full rounded-xl border border-white/12 bg-black/50 px-4 text-sm font-bold text-white outline-none transition focus:border-orange-300/70"
                                    placeholder="https://youtu.be/..."
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
