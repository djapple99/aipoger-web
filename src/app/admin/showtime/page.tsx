"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AIPOGER_CHOICE_INTRO_MAX_LENGTH,
  choiceItemCountMessage,
  choiceWeekStart,
  type AipogerChoiceCatalogItem,
  type AipogerChoiceCollection,
  type AipogerChoiceCuratorIdentity,
} from "@/lib/aipoger-choice";
import type { ShowtimeAdminTrackRow } from "@/lib/server-showtime-catalog";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import { ChoicePreviewPlayer } from "@/components/choice-preview-player";

type AdminState = "checking" | "login" | "denied" | "ready";

type ShowtimePayload = {
  schemaReady?: boolean;
  items?: AipogerChoiceCatalogItem[];
  tracks?: ShowtimeAdminTrackRow[];
  error?: string;
};

type ChoicePayload = {
  schemaReady?: boolean;
  catalog?: AipogerChoiceCatalogItem[];
  collections?: AipogerChoiceCollection[];
  error?: string;
};

type ChoiceActionPayload = {
  collectionId?: string;
  error?: string;
  message?: string;
};

type ShowtimeEditForm = {
  title: string;
  artist: string;
  aiTool: string;
  genre: string;
  album: string;
  description: string;
  youtubeUrl: string;
  lyrics: string;
  supportUrl: string;
  supportLabel: string;
};

type EditingTrack = {
  item: AipogerChoiceCatalogItem;
  track: ShowtimeAdminTrackRow;
};

const SHOWTIME_PER_PAGE = 12;
const MAX_COVER_BYTES = 10 * 1024 * 1024;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function displayDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
}

function choiceDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function formFromTrack(track: ShowtimeAdminTrackRow): ShowtimeEditForm {
  return {
    title: track.title?.trim() || "",
    artist: track.artist?.trim() || "",
    aiTool: track.ai_tool?.trim() || "AI Music",
    genre: track.genre?.trim() || "Original 自我風格",
    album: track.mood?.trim() || "",
    description: track.description?.trim() || "",
    youtubeUrl: track.youtube_url?.trim() || "",
    lyrics: track.lyrics?.trim() || "",
    supportUrl: track.support_url?.trim() || "",
    supportLabel: track.support_url_label?.trim() || "",
  };
}

function isAcceptedCover(file: File) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) && file.size > 0 && file.size <= MAX_COVER_BYTES;
}

export default function AdminShowtimePage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [schemaReady, setSchemaReady] = useState(true);
  const [choiceSchemaReady, setChoiceSchemaReady] = useState(true);
  const [items, setItems] = useState<AipogerChoiceCatalogItem[]>([]);
  const [tracks, setTracks] = useState<ShowtimeAdminTrackRow[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EditingTrack | null>(null);
  const [editForm, setEditForm] = useState<ShowtimeEditForm | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState("");
  const [editorBusy, setEditorBusy] = useState(false);

  const [choiceCollections, setChoiceCollections] = useState<AipogerChoiceCollection[]>([]);
  const [choiceCatalog, setChoiceCatalog] = useState<AipogerChoiceCatalogItem[]>([]);
  const [choiceCollectionId, setChoiceCollectionId] = useState<string | null>(null);
  const [choiceMode, setChoiceMode] = useState(false);
  const [choiceWeek, setChoiceWeek] = useState(choiceWeekStart());
  const [choiceTitle, setChoiceTitle] = useState("");
  const [choiceIntro, setChoiceIntro] = useState("");
  const [choiceCuratorIdentity, setChoiceCuratorIdentity] = useState<AipogerChoiceCuratorIdentity>("official");
  const [choiceBusy, setChoiceBusy] = useState("");
  const [choiceError, setChoiceError] = useState("");
  const [previewTrack, setPreviewTrack] = useState<AipogerChoiceCatalogItem | null>(null);

  const loadShowtimeData = useCallback(async () => {
    const response = await fetch("/api/admin/showtime", { headers: await authHeader(), cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as ShowtimePayload | null;
    if (!response.ok) {
      setError(payload?.error || "Showtime 後台資料讀取失敗。");
      return false;
    }
    setSchemaReady(payload?.schemaReady !== false);
    setItems(payload?.items ?? []);
    setTracks(payload?.tracks ?? []);
    return true;
  }, []);

  const loadChoiceData = useCallback(async (preferredId?: string | null) => {
    const response = await fetch("/api/admin/choice", { headers: await authHeader(), cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as ChoicePayload | null;
    if (!response.ok) {
      setChoiceError(payload?.error || "Choice 資料讀取失敗。");
      return false;
    }
    const collections = payload?.collections ?? [];
    setChoiceSchemaReady(payload?.schemaReady !== false);
    setChoiceCatalog(payload?.catalog ?? []);
    setChoiceCollections(collections);
    setChoiceCollectionId((current) => {
      if (preferredId && collections.some((collection) => collection.id === preferredId)) return preferredId;
      if (current && collections.some((collection) => collection.id === current)) return current;
      return null;
    });
    return true;
  }, []);

  const loadData = useCallback(async () => {
    setError("");
    await Promise.all([loadShowtimeData(), loadChoiceData()]);
  }, [loadChoiceData, loadShowtimeData]);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setAdminState("login");
        return;
      }
      const allowed = await loadIsAdmin(user.id);
      if (!mounted) return;
      if (!allowed) {
        setAdminState("denied");
        return;
      }
      await loadData();
      if (mounted) setAdminState("ready");
    }
    void check();
    return () => { mounted = false; };
  }, [loadData]);

  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editorBusy) closeEditor();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, editorBusy]);

  useEffect(() => () => {
    if (editCoverPreview.startsWith("blob:")) URL.revokeObjectURL(editCoverPreview);
  }, [editCoverPreview]);

  const trackById = useMemo(() => new Map(tracks.map((track) => [track.id, track])), [tracks]);
  const selectedChoice = useMemo(
    () => choiceCollections.find((collection) => collection.id === choiceCollectionId) ?? null,
    [choiceCollectionId, choiceCollections],
  );
  const selectedChoiceKeys = useMemo(
    () => new Set((selectedChoice?.items ?? []).map((item) => `${item.sourceKind}:${item.id}`)),
    [selectedChoice],
  );
  const selectedChoiceItemsByKey = useMemo(
    () => new Map((selectedChoice?.items ?? []).map((item) => [`${item.sourceKind}:${item.id}`, item])),
    [selectedChoice],
  );

  useEffect(() => {
    if (!selectedChoice) return;
    setChoiceWeek(selectedChoice.weekStart);
    setChoiceTitle(selectedChoice.title);
    setChoiceIntro(selectedChoice.intro);
    setChoiceCuratorIdentity(selectedChoice.curatorIdentity ?? "official");
  }, [selectedChoice]);

  const filteredItems = useMemo(() => {
    const availableItems = choiceMode
      ? choiceCatalog.filter((item) => item.isPublic && item.selectable)
      : items;
    const normalized = query.trim().toLowerCase();
    if (!normalized) return availableItems;
    return availableItems.filter((item) => [item.title, item.artist, item.genre, item.recognition].join(" ").toLowerCase().includes(normalized));
  }, [choiceCatalog, choiceMode, items, query]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / SHOWTIME_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((currentPage - 1) * SHOWTIME_PER_PAGE, currentPage * SHOWTIME_PER_PAGE);

  useEffect(() => { setPage(1); }, [query]);

  function closeEditor() {
    setEditing(null);
    setEditForm(null);
    setEditCoverFile(null);
    setEditCoverPreview("");
  }

  function openEditor(item: AipogerChoiceCatalogItem, track: ShowtimeAdminTrackRow) {
    setError("");
    setMessage("");
    setEditing({ item, track });
    setEditForm(formFromTrack(track));
    setEditCoverFile(null);
    setEditCoverPreview(item.coverUrl);
  }

  function onCoverChange(file: File | null) {
    if (!file) return;
    if (!isAcceptedCover(file)) {
      setError("封面只接受 JPG、PNG、WebP、GIF，且檔案需小於 10MB。");
      return;
    }
    setEditCoverFile(file);
    setEditCoverPreview(URL.createObjectURL(file));
  }

  async function runShowtimeAction(item: AipogerChoiceCatalogItem, action: "hide_track" | "hide_archive") {
    const verbs: Record<typeof action, string> = {
      hide_track: "從 Showtime 收回",
      hide_archive: "從 Showtime 收回",
    };
    if (!window.confirm(`確定要${verbs[action]}《${item.title}》？`)) return;
    setBusyId(`${action}:${item.id}`);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/showtime", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ action, id: item.id }),
    });
    const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error || "Showtime 操作失敗。");
      return;
    }
    setMessage(payload?.message || "Showtime 已更新。");
    await Promise.all([loadShowtimeData(), loadChoiceData()]);
  }

  async function saveTrackEditor() {
    if (!editing || !editForm) return;
    if (!editForm.title.trim() || !editForm.artist.trim()) {
      setError("歌名與創作者顯示名必填。");
      return;
    }
    setEditorBusy(true);
    setError("");
    setMessage("");
    try {
      const metadataResponse = await fetch("/api/admin/showtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({
          action: "update_track_metadata",
          id: editing.track.id,
          ...editForm,
        }),
      });
      const metadataPayload = (await metadataResponse.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!metadataResponse.ok) throw new Error(metadataPayload?.error || "作品資料儲存失敗。");

      let coverMessage = "";
      if (editCoverFile) {
        const form = new FormData();
        form.set("id", editing.track.id);
        form.set("file", editCoverFile);
        const coverResponse = await fetch("/api/admin/showtime", {
          method: "POST",
          headers: await authHeader(),
          body: form,
        });
        const coverPayload = (await coverResponse.json().catch(() => null)) as { message?: string; error?: string } | null;
        if (!coverResponse.ok) throw new Error(coverPayload?.error || "作品封面更新失敗。");
        coverMessage = " 封面已更新。";
      }
      setMessage(`${metadataPayload?.message || "作品展示資料已更新。"}${coverMessage}`);
      closeEditor();
      await Promise.all([loadShowtimeData(), loadChoiceData()]);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "作品資料儲存失敗。");
    } finally {
      setEditorBusy(false);
    }
  }

  async function runChoiceAction(action: string, body: Record<string, unknown>, preferredId?: string | null) {
    setChoiceBusy(action);
    setChoiceError("");
    const response = await fetch("/api/admin/choice", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ action, ...body }),
    });
    const payload = (await response.json().catch(() => null)) as ChoiceActionPayload | null;
    setChoiceBusy("");
    if (!response.ok) {
      setChoiceError(payload?.error || "Choice 操作失敗。");
      return null;
    }
    const nextId = payload?.collectionId ?? preferredId ?? choiceCollectionId;
    if (nextId) setChoiceCollectionId(nextId);
    setMessage(payload?.message || "Choice 已更新。");
    await loadChoiceData(nextId);
    return { ...payload, collectionId: nextId ?? undefined };
  }

  async function ensureChoiceCollection() {
    if (selectedChoice) return selectedChoice.id;
    const result = await runChoiceAction("save_collection", {
      weekStart: choiceWeek,
      title: choiceTitle,
      intro: choiceIntro,
      curatorIdentity: choiceCuratorIdentity,
    });
    return result?.collectionId ?? null;
  }

  async function toggleChoiceItem(item: AipogerChoiceCatalogItem) {
    if (!item.selectable || choiceBusy) return;
    const key = `${item.sourceKind}:${item.id}`;
    const selectedItem = selectedChoiceItemsByKey.get(key);
    if (selectedChoice && selectedItem) {
      await runChoiceAction("remove_item", { collectionId: selectedChoice.id, itemId: selectedItem.itemId }, selectedChoice.id);
      return;
    }
    const collectionId = await ensureChoiceCollection();
    if (!collectionId) return;
    await runChoiceAction("add_item", { collectionId, sourceKind: item.sourceKind, sourceId: item.id }, collectionId);
  }

  async function saveChoiceCollection() {
    await runChoiceAction("save_collection", {
      collectionId: selectedChoice?.id,
      weekStart: choiceWeek,
      title: choiceTitle,
      intro: choiceIntro,
      curatorIdentity: choiceCuratorIdentity,
    }, selectedChoice?.id);
  }

  if (adminState === "checking") {
    return <main className="min-h-screen bg-[#050505] px-5 py-10 text-sm font-black text-zinc-400">檢查 Showtime 後台權限中...</main>;
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/75">AIPOGER ADMIN</p>
          <h1 className="mt-3 text-4xl font-black">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <Link href="/auth" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">前往登入</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 pb-28 text-white sm:px-6 lg:px-8 xl:pl-28">
      <div className="mx-auto max-w-[1680px]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-100/70">AIPOGER ADMIN</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Showtime 管理</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-zinc-400">只顯示目前在 Showtime 公開展示的認證作品。可補充評語與編輯封面、公開資料；不會修改音檔、認可來源、愛心或 Battle 戰績。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/rank?lang=zh" className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-zinc-200">看 Showtime</Link>
            <button type="button" onClick={() => setChoiceMode((value) => !value)} className={`rounded-full border px-3 py-2 text-xs font-black ${choiceMode ? "border-cyan-200/55 bg-cyan-300 text-black" : "border-cyan-200/30 bg-cyan-300/10 text-cyan-100"}`}>{choiceMode ? "收起本期 Choice" : "編輯本期 Choice"}</button>
            <Link href="/profile" className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-zinc-200">回個人資料</Link>
          </div>
        </header>

        {!schemaReady ? <section className="mt-5 rounded-xl border border-red-200/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">Showtime 資料欄位尚未完成部署，請先套用目前的 Showtime schema migration。</section> : null}
        {!choiceSchemaReady ? <section className="mt-5 rounded-xl border border-red-200/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">Choice 資料表尚未完成部署，暫時不能建立本期選曲。</section> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-200/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-200/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}
        {choiceError ? <p className="mt-4 rounded-xl border border-red-200/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{choiceError}</p> : null}

        {choiceMode ? (
          <section className="mt-5 rounded-xl border border-cyan-200/25 bg-cyan-300/[0.055] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">This Week Choice</p>
                <h2 className="mt-1 text-xl font-black">從認證作品與本週新歌組成 Choice</h2>
                <p className="mt-1 text-xs font-bold text-cyan-50/70">可選公開 Showtime 認證作品及上架 30 天內的新歌；封面右下播放鈕可先試聽。</p>
              </div>
              <select value={choiceCollectionId ?? ""} onChange={(event) => setChoiceCollectionId(event.target.value || null)} className="h-10 min-w-52 rounded-xl border border-white/10 bg-black/55 px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/60">
                <option value="">新增本期 Choice</option>
                {choiceCollections.map((collection) => <option key={collection.id} value={collection.id}>{choiceDateLabel(collection.weekStart)} {collection.isPublished ? "· 已發布" : "· 草稿"}</option>)}
              </select>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[10rem_minmax(12rem,0.7fr)_minmax(12rem,0.7fr)_minmax(14rem,1fr)]">
              <label className="grid gap-1 text-xs font-black text-zinc-400">週次（星期一）
                <input type="date" value={choiceWeek} onChange={(event) => setChoiceWeek(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-black/55 px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/60" />
              </label>
              <label className="grid gap-1 text-xs font-black text-zinc-400">標題（可選）
                <input value={choiceTitle} maxLength={120} onChange={(event) => setChoiceTitle(event.target.value)} placeholder="本週 Choice" className="h-10 rounded-xl border border-white/10 bg-black/55 px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/60" />
              </label>
              <label className="grid gap-1 text-xs font-black text-zinc-400">策展身分
                <select value={choiceCuratorIdentity} onChange={(event) => setChoiceCuratorIdentity(event.target.value as AipogerChoiceCuratorIdentity)} className="h-10 rounded-xl border border-white/10 bg-black/55 px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/60">
                  <option value="official">官方 AIPOGER Choice</option>
                  <option value="personal">愛波哥 Choice（個人頭像）</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black text-zinc-400">推薦文章（可選）
                <textarea value={choiceIntro} maxLength={AIPOGER_CHOICE_INTRO_MAX_LENGTH} rows={5} onChange={(event) => setChoiceIntro(event.target.value)} placeholder="寫下這期 Choice 的推薦文章。" className="rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-200/60" />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cyan-100/10 pt-4">
              <p className="text-xs font-bold text-cyan-50/75">{choiceItemCountMessage(selectedChoice?.items.length ?? 0)}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={Boolean(choiceBusy)} onClick={() => void saveChoiceCollection()} className="rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs font-black text-zinc-100 disabled:opacity-45">{choiceBusy === "save_collection" ? "儲存中" : selectedChoice ? "儲存本期 Choice" : "先建立本期 Choice"}</button>
                {selectedChoice ? <button type="button" disabled={Boolean(choiceBusy)} onClick={() => void runChoiceAction("set_published", { collectionId: selectedChoice.id, isPublished: !selectedChoice.isPublished, weekStart: choiceWeek, title: choiceTitle, intro: choiceIntro, curatorIdentity: choiceCuratorIdentity }, selectedChoice.id)} className={`rounded-full border px-4 py-2 text-xs font-black disabled:opacity-45 ${selectedChoice.isPublished ? "border-red-200/35 bg-red-500/10 text-red-100" : "border-cyan-100/50 bg-cyan-300 text-black"}`}>{choiceBusy === "set_published" ? "處理中" : selectedChoice.isPublished ? "撤回發布" : "發布 Choice"}</button> : null}
              </div>
            </div>
            {selectedChoice?.items.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedChoice.items.map((choiceItem, index) => (
                  <span key={choiceItem.itemId} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-black/35 px-2 py-1.5 text-xs font-bold text-zinc-200">
                    <b className="text-cyan-100">{index + 1}</b>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={choiceItem.coverUrl} alt="" className="h-6 w-6 rounded object-cover" />
                    <span className="max-w-40 truncate">{choiceItem.title}</span>
                    <button type="button" disabled={!choiceItem.audioUrl} onClick={() => setPreviewTrack(choiceItem)} className="text-cyan-100 disabled:opacity-30" title={choiceItem.audioUrl ? "播放試聽" : "目前沒有可播放音檔"} aria-label={`播放 ${choiceItem.title}`}>▶</button>
                    <button type="button" disabled={Boolean(choiceBusy) || index === 0} onClick={() => void runChoiceAction("move_item", { collectionId: selectedChoice.id, itemId: choiceItem.itemId, direction: "up" }, selectedChoice.id)} className="text-zinc-400 disabled:opacity-30" title="上移">↑</button>
                    <button type="button" disabled={Boolean(choiceBusy) || index === selectedChoice.items.length - 1} onClick={() => void runChoiceAction("move_item", { collectionId: selectedChoice.id, itemId: choiceItem.itemId, direction: "down" }, selectedChoice.id)} className="text-zinc-400 disabled:opacity-30" title="下移">↓</button>
                    <button type="button" disabled={Boolean(choiceBusy)} onClick={() => void runChoiceAction("remove_item", { collectionId: selectedChoice.id, itemId: choiceItem.itemId }, selectedChoice.id)} className="text-red-200/80 transition hover:text-red-100 disabled:opacity-30" title="移出本期 Choice" aria-label={`移出本期 Choice：${choiceItem.title}`}>×</button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-5 rounded-xl border border-white/10 bg-black/45 p-3 sm:p-4">
          <div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋歌名、創作者、類型" className="h-11 rounded-xl border border-white/10 bg-black/55 px-3 text-sm font-bold text-white outline-none focus:border-yellow-200/60" />
          </div>
          <p className="mt-3 text-xs font-bold text-zinc-500">{choiceMode ? `目前有 ${filteredItems.length} 首 Choice 可選作品，包含 Showtime 認證歌與 30 天內新歌。` : `目前公開展示 ${filteredItems.length} 首 Showtime 作品，桌機每列 6 首，每頁 ${SHOWTIME_PER_PAGE} 首。`}</p>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {pagedItems.map((item) => {
            const track = item.sourceKind === "listen_bar_track" ? trackById.get(item.id) ?? null : null;
            const canEdit = !choiceMode && Boolean(track?.source === "community");
            const busy = busyId?.endsWith(`:${item.id}`);
            const choiceKey = `${item.sourceKind}:${item.id}`;
            const isChoiceSelected = selectedChoiceKeys.has(choiceKey);
            const canSelectChoice = choiceMode && item.selectable;
            return (
              <article key={choiceKey} className={`group relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-black/55 ${isChoiceSelected ? "border-cyan-200/70 ring-1 ring-cyan-200/40" : "border-white/10"}`}>
                <div className="relative aspect-square overflow-hidden bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.coverUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2">
                    <span className={`rounded-md border bg-black/75 px-1.5 py-1 text-[10px] font-black ${item.choiceSource === "new_release" ? "border-lime-200/35 text-lime-100" : "border-cyan-200/25 text-cyan-100"}`}>{item.choiceSource === "new_release" ? "CHOICE 新選" : "SHOWTIME"}</span>
                    {canSelectChoice ? (
                      <label className="flex cursor-pointer items-center gap-1 rounded-md border border-cyan-100/30 bg-black/80 px-1.5 py-1 text-[10px] font-black text-cyan-50">
                        <input type="checkbox" checked={isChoiceSelected} disabled={Boolean(choiceBusy)} onChange={() => void toggleChoiceItem(item)} className="h-3.5 w-3.5 accent-cyan-300" />
                        Choice
                      </label>
                    ) : null}
                  </div>
                  <span className="absolute bottom-2 left-2 rounded-md border border-emerald-200/25 bg-emerald-950/90 px-1.5 py-1 text-[10px] font-black text-emerald-100">{item.choiceSource === "new_release" ? "30 天內新歌" : "公開中"}</span>
                  <button type="button" disabled={!item.audioUrl} onClick={() => setPreviewTrack(item)} className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-100/50 bg-black/85 text-xs font-black text-cyan-100 shadow-lg transition hover:bg-cyan-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-35" aria-label={`播放 ${item.title}`} title={item.audioUrl ? "播放試聽" : "目前沒有可播放音檔"}>▶</button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-3">
                  <h2 className="min-h-10 line-clamp-2 text-sm font-black leading-5 text-white">{item.title}</h2>
                  <p className="mt-1 truncate text-xs font-bold text-zinc-300">{item.artist}</p>
                  <p className="mt-1 truncate text-[11px] font-bold text-zinc-500">{item.genre} · {item.recognition}</p>
                  <p className="mt-1 text-[10px] font-bold text-yellow-100/75">{item.choiceSource === "new_release" ? "上架 " : "認證 "}{displayDate(item.certifiedAt)}</p>
                  {!choiceMode ? <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {canEdit ? <button type="button" onClick={() => track && openEditor(item, track)} className="min-h-8 rounded-lg border border-cyan-200/25 bg-cyan-300/10 px-2 py-1.5 text-[11px] font-black text-cyan-50 transition hover:border-cyan-100/60">編輯資料</button> : <span />}
                    <button type="button" disabled={busy} onClick={() => void runShowtimeAction(item, item.sourceKind === "listen_bar_track" ? "hide_track" : "hide_archive")} className="min-h-8 rounded-lg border border-red-200/35 bg-red-500/10 px-2 py-1.5 text-[11px] font-black text-red-100 disabled:opacity-50">{busy ? "處理中" : "收回"}</button>
                  </div> : null}
                </div>
              </article>
            );
          })}
          {pagedItems.length === 0 ? <p className="col-span-full rounded-xl border border-white/10 bg-black/40 px-4 py-10 text-center text-sm font-bold text-zinc-500">{choiceMode ? "目前沒有可加入 Choice 的認證作品或 30 天內新歌。" : "目前沒有符合條件的 Showtime 作品。"}</p> : null}
        </section>

        <div className="mt-5 flex items-center justify-between gap-3 text-sm font-bold text-zinc-400">
          <span>{currentPage} / {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35">上一頁</button>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-full border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35">下一頁</button>
          </div>
        </div>
      </div>
      <ChoicePreviewPlayer track={previewTrack} onClose={() => setPreviewTrack(null)} />

      {editing && editForm ? (
        <div className="fixed inset-0 z-[120] flex items-end bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" onMouseDown={(event) => { if (event.currentTarget === event.target && !editorBusy) closeEditor(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="showtime-editor-title" className="max-h-[92svh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-cyan-100/25 bg-[#0b0d10] p-4 shadow-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">Showtime Display</p>
                <h2 id="showtime-editor-title" className="mt-1 text-2xl font-black">編輯作品展示資料</h2>
                <p className="mt-1 text-xs font-bold leading-5 text-zinc-500">可改封面與公開資訊；音檔、認可來源、愛心、票數與 Battle 戰績保持不變。</p>
              </div>
              <button type="button" disabled={editorBusy} onClick={closeEditor} className="h-9 w-9 rounded-full border border-white/10 text-lg font-black text-zinc-300 disabled:opacity-45" aria-label="關閉編輯" title="關閉">×</button>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-[12rem_minmax(0,1fr)]">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={editCoverPreview || editing.item.coverUrl} alt="作品封面預覽" className="aspect-square w-full rounded-xl border border-white/10 object-cover" />
                <label className="mt-3 block cursor-pointer rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-center text-xs font-black text-cyan-50 transition hover:border-cyan-100/60">
                  更換封面
                  <input type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={(event) => onCoverChange(event.target.files?.[0] ?? null)} />
                </label>
                <p className="mt-2 text-[11px] font-bold leading-5 text-zinc-500">JPG、PNG、WebP、GIF，最大 10MB。</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-black text-zinc-300">歌名
                  <input value={editForm.title} maxLength={500} onChange={(event) => setEditForm((current) => current ? { ...current, title: event.target.value } : current)} className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/55" />
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300">創作者顯示名
                  <input value={editForm.artist} maxLength={80} onChange={(event) => setEditForm((current) => current ? { ...current, artist: event.target.value } : current)} className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/55" />
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300">AI 工具
                  <input value={editForm.aiTool} maxLength={80} onChange={(event) => setEditForm((current) => current ? { ...current, aiTool: event.target.value } : current)} className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/55" />
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300">類型
                  <select value={editForm.genre} onChange={(event) => setEditForm((current) => current ? { ...current, genre: event.target.value } : current)} className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/55">
                    {MUSIC_GENRE_OPTIONS.map((genre) => <option key={genre.value} value={genre.value}>{genre.value}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300">作品資訊
                  <input value={editForm.album} maxLength={80} onChange={(event) => setEditForm((current) => current ? { ...current, album: event.target.value } : current)} className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/55" />
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300">外部支持連結
                  <input value={editForm.supportUrl} maxLength={500} placeholder="https://" onChange={(event) => setEditForm((current) => current ? { ...current, supportUrl: event.target.value } : current)} className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/55" />
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300">連結用途
                  <input value={editForm.supportLabel} maxLength={80} placeholder="例如：前往 YouTube 頻道" onChange={(event) => setEditForm((current) => current ? { ...current, supportLabel: event.target.value } : current)} className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/55" />
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300 sm:col-span-2">Showtime 評語／作品介紹
                  <textarea value={editForm.description} maxLength={120} rows={3} onChange={(event) => setEditForm((current) => current ? { ...current, description: event.target.value } : current)} className="resize-y rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-100/55" />
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300 sm:col-span-2">YouTube / MV
                  <input value={editForm.youtubeUrl} maxLength={300} placeholder="https://youtu.be/..." onChange={(event) => setEditForm((current) => current ? { ...current, youtubeUrl: event.target.value } : current)} className="h-10 rounded-xl border border-white/10 bg-black/45 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/55" />
                </label>
                <label className="grid gap-1 text-xs font-black text-zinc-300 sm:col-span-2">歌詞
                  <textarea value={editForm.lyrics} rows={6} onChange={(event) => setEditForm((current) => current ? { ...current, lyrics: event.target.value } : current)} className="resize-y rounded-xl border border-white/10 bg-black/45 px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-100/55" />
                </label>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
              <button type="button" disabled={editorBusy} onClick={closeEditor} className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-xs font-black text-zinc-300 disabled:opacity-45">取消</button>
              <button type="button" disabled={editorBusy} onClick={() => void saveTrackEditor()} className="rounded-full border border-cyan-100/45 bg-cyan-300 px-5 py-2 text-xs font-black text-black disabled:opacity-45">{editorBusy ? "儲存中" : "儲存展示資料"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
