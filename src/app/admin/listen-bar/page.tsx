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

type AdminState = "checking" | "login" | "denied" | "ready";

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

type ContentReportSummary = {
  status?: string | null;
};

type ModerationSummaryPayload = {
  reports?: ContentReportSummary[];
  storageFallback?: boolean;
};

const initialForm: TrackForm = {
  title: "",
  artist: "AIPOGER",
  aiTool: "Suno",
  genre: "AI Music",
  mood: "官方輪播",
  bpm: "",
  durationSeconds: "",
  lyrics: "",
  sortOrder: "100",
  isActive: true,
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

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export default function ListenBarAdminPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [userId, setUserId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<ListenBarTrackRow[]>([]);
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

  const totalActive = useMemo(() => tracks.filter((track) => track.is_active).length, [tracks]);

  const loadTracks = useCallback(async () => {
    setError("");
    const { data, error: queryError } = await supabase
      .from("listen_bar_tracks")
      .select("id, title, artist, ai_tool, genre, mood, bpm, duration_seconds, audio_path, cover_path, lyrics, sort_order, is_active, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (queryError) {
      setTracks([]);
      setTableReady(false);
      setError("尚未建立 listen_bar_tracks。請先在 Supabase SQL Editor 執行 supabase/listen_bar_tracks.sql。");
      return;
    }

    setTableReady(true);
    setTracks((data as ListenBarTrackRow[] | null) ?? []);
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

  const updateForm = (patch: Partial<TrackForm>) => {
    setForm((current) => ({ ...current, ...patch }));
  };

  const handleAudioChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    setMessage("");
    setAudioFile(file);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(file ? URL.createObjectURL(file) : "");
    if (!file) return;

    const duration = await readAudioDuration(file);
    const metadata = file.name.toLowerCase().endsWith(".mp3") ? await parseMp3Metadata(file) : {};
    const fallbackTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

    updateForm({
      title: form.title.trim() || metadata.title || fallbackTitle,
      artist: form.artist.trim() && form.artist !== initialForm.artist ? form.artist : metadata.artist || form.artist,
      genre: form.genre.trim() && form.genre !== initialForm.genre ? form.genre : metadata.genre || form.genre,
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
      const audioPath = await uploadAsset(
        LISTEN_BAR_AUDIO_BUCKET,
        audioFile,
        audioFile.name,
        audioFile.type || "audio/mpeg",
      );

      const coverSource = coverFile ?? embeddedCover?.blob ?? null;
      const coverPath = coverSource
        ? await uploadAsset(
            LISTEN_BAR_COVER_BUCKET,
            coverSource,
            coverFile?.name ?? embeddedCover?.fileName ?? "cover.jpg",
            coverFile?.type || embeddedCover?.mimeType || "image/jpeg",
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
      setError(`儲存失敗：${String((saveError as { message?: string })?.message ?? saveError)}。請確認已執行 SQL 且目前帳號是管理員。`);
    } finally {
      setSaving(false);
    }
  };

  const updateTrack = async (track: ListenBarTrackRow, patch: Partial<ListenBarTrackRow>) => {
    setError("");
    setMessage("");
    const { error: updateError } = await supabase.from("listen_bar_tracks").update(patch).eq("id", track.id);
    if (updateError) {
      setError(`更新失敗：${updateError.message}`);
      return;
    }
    setMessage("輪播設定已更新。");
    await loadTracks();
  };

  const hideTrack = async (track: ListenBarTrackRow) => {
    if (!window.confirm(`確定先下架隱藏「${track.title}」？作品資料會保留，之後可以恢復或再做永久刪除。`)) return;
    setError("");
    setMessage("");
    const modernPayload = {
      is_active: false,
      review_status: "hidden",
      hidden_at: new Date().toISOString(),
      moderation_note: "Owner hidden from Bar Heartbreak console.",
    };
    const modernUpdate = await supabase.from("listen_bar_tracks").update(modernPayload).eq("id", track.id);
    if (!modernUpdate.error) {
      setMessage("已下架隱藏，作品資料仍保留。");
      await loadTracks();
      return;
    }

    const msg = modernUpdate.error.message.toLowerCase();
    if (!msg.includes("review_status") && !msg.includes("schema cache") && !msg.includes("column")) {
      setError(`下架失敗：${modernUpdate.error.message}`);
      return;
    }

    const legacyUpdate = await supabase.from("listen_bar_tracks").update({ is_active: false }).eq("id", track.id);
    if (legacyUpdate.error) {
      setError(`下架失敗：${legacyUpdate.error.message}`);
      return;
    }
    setMessage("已下架隱藏，作品資料仍保留。");
    await loadTracks();
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
          <div className="flex items-center gap-2">
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
                <span className="mt-1 text-xs font-medium text-orange-100/60">{audioFile?.name ?? "必填，建議 MP3 320kbps"}</span>
                <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aiff,audio/x-aiff,audio/mp4,audio/aac,.mp3,.wav,.aif,.aiff,.m4a,.aac" onChange={handleAudioChange} className="hidden" />
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
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} className="hidden" />
                </label>
                <div className="grid gap-3">
                  <input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="歌名" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" required />
                  <input value={form.artist} onChange={(event) => updateForm({ artist: event.target.value })} placeholder="歌者 / 創作者" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" required />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.aiTool} onChange={(event) => updateForm({ aiTool: event.target.value })} placeholder="AI 工具，例如 Suno / Udio" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
                <input value={form.genre} onChange={(event) => updateForm({ genre: event.target.value })} placeholder="曲風" className="h-12 rounded-xl border border-white/12 bg-black/50 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-orange-400" />
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
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">PLAYLIST</p>
                <h2 className="mt-1 text-2xl font-black text-white">輪播資料庫</h2>
              </div>
              <button type="button" onClick={() => void loadTracks()} className="rounded-full border border-cyan-200/25 px-4 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-200">
                重新整理
              </button>
            </div>

            <div className="grid max-h-[72rem] gap-3 overflow-y-auto pr-1">
              {tracks.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-10 text-center text-sm leading-7 text-zinc-500">
                  尚無輪播資料。先上傳第一首官方歌曲。
                </div>
              ) : (
                tracks.map((track) => {
                  const coverUrl = rowPublicUrl(LISTEN_BAR_COVER_BUCKET, track.cover_path) || DEFAULT_LISTEN_BAR_COVER;
                  const audioUrl = rowPublicUrl(LISTEN_BAR_AUDIO_BUCKET, track.audio_path);
                  return (
                    <article key={track.id} className="rounded-2xl border border-white/10 bg-black/42 p-3">
                      <div className="grid gap-3 sm:grid-cols-[5.5rem_1fr]">
                        <img src={coverUrl} alt="" className="aspect-square w-full rounded-xl bg-black object-cover" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-lg font-black text-white">{track.title}</p>
                              <p className="mt-1 truncate text-sm text-zinc-400">
                                {track.artist} / {track.ai_tool || "AI Music"} / {track.genre || "AI Music"}
                              </p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-xs font-black ${track.is_active ? "border-cyan-200/30 bg-cyan-300/10 text-cyan-100" : "border-zinc-700 bg-zinc-900 text-zinc-500"}`}>
                              {track.is_active ? "上架中" : "已下架"}
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
                            <audio className="mt-3 w-full accent-orange-500" controls preload="metadata" src={audioUrl}>
                              <track kind="captions" />
                            </audio>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={() => void updateTrack(track, { is_active: !track.is_active })} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-orange-300/55">
                              {track.is_active ? "下架" : "上架"}
                            </button>
                            <button type="button" onClick={() => void updateTrack(track, { sort_order: Math.max(0, (track.sort_order ?? 100) - 10) })} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55">
                              往前
                            </button>
                            <button type="button" onClick={() => void updateTrack(track, { sort_order: (track.sort_order ?? 100) + 10 })} className="rounded-full border border-white/12 px-4 py-2 text-xs font-black text-zinc-200 transition hover:border-cyan-200/55">
                              往後
                            </button>
                            <button type="button" onClick={() => void hideTrack(track)} className="rounded-full border border-red-300/20 px-4 py-2 text-xs font-black text-red-100 transition hover:border-red-300/60">
                              隱藏
                            </button>
                          </div>
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
