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
  LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
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
type TrackSortMode = "manual" | "updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "genre" | "status";
type TrackVisibilityFilter = "all" | "active" | "hidden" | "uncategorized";
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

const initialForm: TrackForm = {
  title: "",
  artist: "AIPOGER",
  aiTool: "Suno",
  genre: "自我風格",
  mood: "官方輪播",
  bpm: "",
  durationSeconds: "",
  lyrics: "",
  sortOrder: "100",
  isActive: true,
};

const LIVE_RADIO_EPOCH_MS = Date.UTC(2026, 0, 1);
const UPCOMING_ROTATION_PREVIEW_COUNT = 6;
const LISTEN_BAR_ADMIN_GENRE_OPTIONS = MUSIC_GENRE_OPTIONS;
const GENRE_VALUES = new Set(LISTEN_BAR_ADMIN_GENRE_OPTIONS.map((genre) => genre.value));
const NEEDS_GENRE_REVIEW = new Set(["", "AI Music", "ai music", "Genre", "genre", "自我風格", "未標示風格"]);

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
    .filter((track) => track.is_active !== false && !isHiddenTrack(track) && Boolean(track.audio_path?.trim()))
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

function trackStatusBadge(track: AdminListenBarTrackRow, currentlyPlayingId: string, openingPhaseActive: boolean) {
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
  if (track.bar_phase === "public" || openingPhaseActive) {
    return { label: "公播中", className: "border-cyan-200/35 bg-cyan-300/10 text-cyan-100" };
  }
  if (track.bar_phase === "challenger") {
    return { label: "Challenger", className: "border-amber-200/35 bg-amber-300/10 text-amber-100" };
  }
  return { label: "上架中", className: "border-cyan-200/30 bg-cyan-300/10 text-cyan-100" };
}

function phaseLabel(track: AdminListenBarTrackRow, openingPhaseActive: boolean) {
  if (removedStatus(track)) return "已移除";
  if (hiddenStatus(track) || track.is_active === false) return "已下架";
  if (track.bar_phase === "public" || openingPhaseActive) return "公播池";
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

function trackSearchText(track: AdminListenBarTrackRow, openingPhaseActive: boolean) {
  return [
    track.title,
    track.artist,
    track.ai_tool,
    track.genre,
    track.mood,
    phaseLabel(track, openingPhaseActive),
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
  return GENRE_VALUES.has(genre) ? genre : "自我風格";
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

function sortTracksForAdmin(tracks: AdminListenBarTrackRow[], mode: TrackSortMode, openingPhaseActive: boolean) {
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
    const statusCompare = phaseLabel(a, openingPhaseActive).localeCompare(phaseLabel(b, openingPhaseActive), "zh-Hant");
    if (statusCompare !== 0) return statusCompare;
    return dateSortValue(b.updated_at) - dateSortValue(a.updated_at);
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
  const [trackSearch, setTrackSearch] = useState("");
  const [trackSortMode, setTrackSortMode] = useState<TrackSortMode>("manual");
  const [focusedTrackId, setFocusedTrackId] = useState("");
  const [editingTrackId, setEditingTrackId] = useState("");
  const [metadataForm, setMetadataForm] = useState<TrackMetadataForm | null>(null);
  const [metadataSavingId, setMetadataSavingId] = useState("");
  const [optimisticTrackPatches, setOptimisticTrackPatches] = useState<Record<string, Partial<AdminListenBarTrackRow>>>({});

  const displayTracks = useMemo(
    () => tracks.map((track) => ({ ...track, ...(optimisticTrackPatches[track.id] ?? {}) })),
    [optimisticTrackPatches, tracks],
  );
  const visiblePlayableTracks = useMemo(() => activePlayableTracks(displayTracks), [displayTracks]);
  const openingPhaseActive = visiblePlayableTracks.length <= LISTEN_BAR_PUBLIC_ROTATION_LIMIT;
  const renderedTracks = useMemo(() => {
    const query = trackSearch.trim().toLowerCase();
    const filteredTracks = displayTracks.filter((track) => {
      const hidden = isHiddenTrack(track);
      if (trackVisibilityFilter === "active" && hidden) return false;
      if (trackVisibilityFilter === "hidden" && !hidden) return false;
      if (trackVisibilityFilter === "uncategorized" && !isUncategorizedTrack(track)) return false;
      if (!query) return true;
      return trackSearchText(track, openingPhaseActive).includes(query);
    });
    return sortTracksForAdmin(filteredTracks, trackSortMode, openingPhaseActive);
  }, [displayTracks, openingPhaseActive, trackSearch, trackSortMode, trackVisibilityFilter]);
  const hiddenTrackCount = useMemo(() => displayTracks.filter(isHiddenTrack).length, [displayTracks]);
  const uncategorizedTrackCount = useMemo(() => displayTracks.filter(isUncategorizedTrack).length, [displayTracks]);
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

  const updateForm = (patch: Partial<TrackForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const updateMetadataForm = (patch: Partial<TrackMetadataForm>) => {
    setMetadataForm((current) => (current ? { ...current, ...patch } : current));
  };

  const focusTrackInList = useCallback((trackId: string) => {
    if (!trackId) return;
    setTrackVisibilityFilter("all");
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
                <p className="text-xs uppercase tracking-[0.28em] text-orange-300/70">UPLOAD</p>
                <h2 className="mt-1 text-2xl font-black text-white">新增輪播歌曲</h2>
                <p className={`mt-2 text-sm leading-6 text-zinc-500 ${fontGlowSans.className}`} style={fontGlowSans.style}>
                  MP3 會自動嘗試讀取 ID3 歌名、歌者、曲風、BPM 與內嵌封面。
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
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">PLAYLIST</p>
                <h2 className="mt-1 text-2xl font-black text-white">輪播資料庫</h2>
                <p className="mt-1 text-xs font-bold text-zinc-500">
                  顯示 {renderedTracks.length} / {displayTracks.length}
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
              <div className="grid gap-2 sm:grid-cols-[auto_auto_minmax(10rem,1fr)]">
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
                  <option value="status">狀態</option>
                </select>
              </div>
            </div>

            <div className="grid max-h-[72rem] gap-3 overflow-y-auto pr-1">
              {renderedTracks.length === 0 ? (
	                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-10 text-center text-sm leading-7 text-zinc-500">
	                  {displayTracks.length === 0
	                    ? "尚無輪播資料。先上傳第一首官方歌曲。"
	                    : trackSearch.trim()
	                      ? "沒有符合搜尋條件的歌曲。"
	                      : trackVisibilityFilter === "hidden"
	                        ? "目前沒有下架歌曲。"
	                        : trackVisibilityFilter === "uncategorized"
	                          ? "目前沒有待補類型的歌曲。"
	                          : "目前已隱藏下架歌曲，沒有可顯示的上架歌曲。"}
	                </div>
              ) : (
                renderedTracks.map((track) => {
                  const coverUrl = rowPublicUrl(LISTEN_BAR_COVER_BUCKET, track.cover_path) || DEFAULT_LISTEN_BAR_COVER;
                  const audioUrl = rowPublicUrl(LISTEN_BAR_AUDIO_BUCKET, track.audio_path);
	                  const hidden = isHiddenTrack(track);
	                  const status = trackStatusBadge(track, currentlyPlayingId, openingPhaseActive);
	                  const updatedAt = track.updated_at ? new Date(track.updated_at).toLocaleString("zh-TW", { hour12: false }) : "-";
	                  const focused = focusedTrackId === track.id;
	                  const editing = editingTrackId === track.id && metadataForm;
	                  const needsGenreReview = isUncategorizedTrack(track);
	                  return (
                    <article
                      key={track.id}
                      id={`listen-bar-admin-track-${track.id}`}
                      className={`scroll-mt-8 rounded-2xl border p-3 transition ${
                        focused
                          ? "border-cyan-200/65 bg-cyan-300/[0.075] shadow-[0_0_0_2px_rgba(103,232,249,0.18),0_18px_60px_rgba(0,0,0,0.35)]"
                          : track.id === currentlyPlayingId
                            ? "border-orange-300/45 bg-orange-500/[0.055]"
                            : hidden
                              ? "border-red-300/20 bg-red-950/[0.08]"
                              : "border-white/10 bg-black/42"
                      }`}
                    >
                      <div className="grid gap-3 sm:grid-cols-[5.5rem_1fr]">
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
	                            {needsGenreReview && (
	                              <span className="rounded-full border border-orange-200/40 bg-orange-500/12 px-3 py-1 text-xs font-black text-orange-100">
	                                待補類型
	                              </span>
	                            )}
	                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 text-[11px] font-bold text-zinc-300">
                              {phaseLabel(track, openingPhaseActive)}
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
	                            <button type="button" disabled={metadataSavingId === track.id} onClick={() => (editing ? cancelEditTrack() : beginEditTrack(track))} className="rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100 transition hover:border-orange-200/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/55 disabled:cursor-not-allowed disabled:opacity-45">
	                              {editing ? "收起編輯" : "編輯資料"}
	                            </button>
	                            <button type="button" disabled={operatingTrackId === track.id} onClick={() => void (hidden ? restoreTrack(track) : hideTrack(track))} className={`rounded-full border px-4 py-2 text-xs font-black transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45 ${hidden ? "border-cyan-300/25 text-cyan-100 hover:border-cyan-200/65 focus-visible:ring-cyan-200/55" : "border-white/12 text-zinc-200 hover:border-cyan-200/55 focus-visible:ring-cyan-200/55"}`}>
	                              {operatingTrackId === track.id ? "處理中" : hidden ? "恢復上架" : "下架"}
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
