"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AIPOGER_CHOICE_INTRO_MAX_LENGTH, choiceItemCountMessage, choiceWeekStart, type AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";
import {
  creatorChoiceEligibilityMessage,
  creatorChoicePublicPath,
  type AipogerCreatorChoiceCollection,
  type CreatorChoiceEligibility,
} from "@/lib/creator-choice";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { supabase } from "@/lib/supabase";
import { ChoicePreviewPlayer } from "@/components/choice-preview-player";

type OwnShowtimeWork = {
  id: string;
  title?: string | null;
  artist?: string | null;
  genre?: string | null;
  cover_path?: string | null;
  support_url?: string | null;
  support_url_label?: string | null;
  support_url_status?: string | null;
  ai_music_showtime_certified_at?: string | null;
  ai_music_showtime_public_removed_at?: string | null;
};

type ChoicePayload = {
  schemaReady?: boolean;
  eligibility?: CreatorChoiceEligibility;
  ownShowtimeWorks?: OwnShowtimeWork[];
  catalog?: AipogerChoiceCatalogItem[];
  collections?: AipogerCreatorChoiceCollection[];
  error?: string;
};

function coverUrl(path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return AIPOGER_BRAND_LOGO;
  if (/^https?:/i.test(clean)) return clean;
  return supabase.storage.from(LISTEN_BAR_COVER_BUCKET).getPublicUrl(clean).data.publicUrl || AIPOGER_BRAND_LOGO;
}

function displayDate(value: string | null | undefined) {
  if (!value) return "未設定";
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export default function CreatorChoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [eligibility, setEligibility] = useState<CreatorChoiceEligibility>({ eligible: false, showtimeWorkCount: 0 });
  const [ownWorks, setOwnWorks] = useState<OwnShowtimeWork[]>([]);
  const [catalog, setCatalog] = useState<AipogerChoiceCatalogItem[]>([]);
  const [collections, setCollections] = useState<AipogerCreatorChoiceCollection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(choiceWeekStart());
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingLinkTrackId, setEditingLinkTrackId] = useState<string | null>(null);
  const [supportUrl, setSupportUrl] = useState("");
  const [supportLabel, setSupportLabel] = useState("");
  const [previewTrack, setPreviewTrack] = useState<AipogerChoiceCatalogItem | null>(null);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const loadData = useCallback(async (preferredId?: string | null) => {
    setError("");
    const response = await fetch("/api/creator-choice", { headers: await authHeader(), cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as ChoicePayload | null;
    if (response.status === 401) {
      rememberAuthNextPath("/profile/choice");
      router.replace("/auth?next=%2Fprofile%2Fchoice");
      return;
    }
    if (!response.ok) {
      setError(payload?.error || "無法讀取自己的 Choice。");
      return;
    }
    const nextCollections = payload?.collections ?? [];
    setSchemaReady(payload?.schemaReady !== false);
    setEligibility(payload?.eligibility ?? { eligible: false, showtimeWorkCount: 0 });
    setOwnWorks(payload?.ownShowtimeWorks ?? []);
    setCatalog(payload?.catalog ?? []);
    setCollections(nextCollections);
    setSelectedId((current) => {
      if (preferredId && nextCollections.some((item) => item.id === preferredId)) return preferredId;
      if (current && nextCollections.some((item) => item.id === current)) return current;
      return nextCollections[0]?.id ?? null;
    });
  }, [authHeader, router]);

  useEffect(() => {
    void loadData().finally(() => setLoading(false));
  }, [loadData]);

  const selected = useMemo(
    () => collections.find((collection) => collection.id === selectedId) ?? null,
    [collections, selectedId],
  );
  const selectedItemKeys = useMemo(
    () => new Set((selected?.items ?? []).map((item) => `${item.sourceKind}:${item.id}`)),
    [selected],
  );

  useEffect(() => {
    if (!selected) {
      setWeekStart(choiceWeekStart());
      setTitle("");
      setIntro("");
      return;
    }
    setWeekStart(selected.weekStart);
    setTitle(selected.title);
    setIntro(selected.intro);
  }, [selected]);

  const runAction = useCallback(async (action: string, body: Record<string, unknown>, successMessage: string, preferredId?: string | null) => {
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/creator-choice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string; collectionId?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Choice 操作失敗。");
      setMessage(payload?.message || successMessage);
      await loadData(payload?.collectionId ?? preferredId ?? selectedId);
      return { ...payload, collectionId: payload?.collectionId ?? preferredId ?? selectedId };
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Choice 操作失敗。");
      return null;
    } finally {
      setBusy("");
    }
  }, [authHeader, loadData, selectedId]);

  const saveCollection = useCallback(async () => {
    await runAction("save_collection", { collectionId: selected?.id, weekStart, title, intro }, selected ? "Choice 草稿已儲存。" : "已建立自己的 Choice 草稿。", selected?.id);
  }, [intro, runAction, selected, title, weekStart]);

  const ensureChoiceCollection = useCallback(async () => {
    if (selected) return selected.id;
    const result = await runAction(
      "save_collection",
      { weekStart, title, intro },
      "已建立自己的 Choice 草稿。",
    );
    return result?.collectionId ?? null;
  }, [intro, runAction, selected, title, weekStart]);

  const addChoiceItem = useCallback(async (item: AipogerChoiceCatalogItem) => {
    if (busy !== "" || selectedItemKeys.has(`${item.sourceKind}:${item.id}`)) return;
    const collectionId = await ensureChoiceCollection();
    if (!collectionId) return;
    await runAction(
      "add_item",
      { collectionId, sourceKind: item.sourceKind, sourceId: item.id },
      "已加入你的 Choice。",
      collectionId,
    );
  }, [busy, ensureChoiceCollection, runAction, selectedItemKeys]);

  const openSupportEditor = useCallback((work: OwnShowtimeWork) => {
    setEditingLinkTrackId(work.id);
    setSupportUrl(work.support_url?.trim() ?? "");
    setSupportLabel(work.support_url_label?.trim() ?? "");
  }, []);

  const saveSupportLink = useCallback(async () => {
    if (!editingLinkTrackId) return;
    setBusy(`support:${editingLinkTrackId}`);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/showtime/my-tracks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ trackId: editingLinkTrackId, supportUrl, supportLabel }),
      });
      const payload = (await response.json().catch(() => null)) as { track?: OwnShowtimeWork; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "連結儲存失敗。");
      if (payload?.track) {
        setOwnWorks((current) => current.map((work) => (work.id === editingLinkTrackId ? { ...work, ...payload.track } : work)));
      }
      setEditingLinkTrackId(null);
      setMessage("外部連結已儲存，更新後會重新確認公開狀態。");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "連結儲存失敗。");
    } finally {
      setBusy("");
    }
  }, [authHeader, editingLinkTrackId, supportLabel, supportUrl]);

  const filteredCatalog = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return catalog;
    return catalog.filter((item) => `${item.title} ${item.artist} ${item.genre} ${item.recognition}`.toLocaleLowerCase().includes(needle));
  }, [catalog, query]);

  const copyPublicLink = useCallback(async () => {
    if (!selected) return;
    const href = new URL(creatorChoicePublicPath(selected.id), window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(href);
      setMessage("公開 Choice 連結已複製。");
    } catch {
      setError("無法複製連結，請從公開頁手動複製網址。");
    }
  }, [selected]);

  if (loading) {
    return <main className="min-h-screen bg-[#050505] px-5 pb-10 pt-24 text-sm font-black text-zinc-400 sm:pt-10">正在準備你的 Showtime / Choice...</main>;
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-24 text-zinc-100 sm:px-7 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-100/70">CREATOR DESK</p>
            <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">我的 Showtime / Choice</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-zinc-400">管理自己的 Showtime 展示資料與外部導流連結，並從公開認證作品及 7 天內新歌策展自己的 Choice。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/rank?lang=zh" className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-zinc-200 transition hover:border-yellow-200/55">看 Showtime</Link>
            <Link href="/profile" className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-zinc-200 transition hover:border-yellow-200/55">回個人資料</Link>
          </div>
        </header>

        {!schemaReady ? <p className="mt-5 rounded-xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">Creator Choice 資料尚未準備完成。系統套用後會自動開放。</p> : null}
        {message ? <p className="mt-5 rounded-xl border border-emerald-200/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-5 rounded-xl border border-red-200/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}

        <section className="mt-6 border-y border-yellow-200/15 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-100/70">SHOWTIME STATUS</p>
              <h2 className="mt-1 text-xl font-black text-white">{eligibility.showtimeWorkCount} 首 Showtime 作品</h2>
              <p className="mt-1 text-sm font-bold text-zinc-400">{creatorChoiceEligibilityMessage(eligibility)}</p>
            </div>
            <Link href="/profile" className="rounded-full border border-yellow-200/30 bg-yellow-300/10 px-4 py-2 text-xs font-black text-yellow-100 transition hover:border-yellow-100/70">編輯所有作品展示資料</Link>
          </div>
          {ownWorks.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {ownWorks.map((work) => (
                <article key={work.id} className="min-w-0 border border-white/10 bg-black/35 p-2.5">
                  <div className="relative aspect-square overflow-hidden bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl(work.cover_path)} alt="" className="h-full w-full object-cover" />
                    {work.ai_music_showtime_public_removed_at ? <span className="absolute bottom-1 left-1 rounded bg-zinc-950/90 px-1.5 py-1 text-[10px] font-black text-zinc-300">已收回展示</span> : <span className="absolute bottom-1 left-1 rounded bg-yellow-300 px-1.5 py-1 text-[10px] font-black text-black">SHOWTIME</span>}
                  </div>
                  <h3 className="mt-2 truncate text-sm font-black text-white">{work.title?.trim() || "未命名作品"}</h3>
                  <p className="mt-1 truncate text-xs font-bold text-zinc-500">{work.artist?.trim() || "AIPOGER 創作者"}</p>
                  <button type="button" onClick={() => openSupportEditor(work)} className="mt-3 w-full border border-white/12 px-2 py-1.5 text-[11px] font-black text-zinc-200 transition hover:border-yellow-200/55 hover:text-yellow-100">{work.support_url?.trim() ? "設定連結" : "加入導流連結"}</button>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {editingLinkTrackId ? (
          <section className="mt-5 border border-yellow-200/22 bg-yellow-300/[0.045] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-100/70">EXTERNAL LINK</p><h2 className="mt-1 text-lg font-black text-white">設定作品導流連結</h2></div>
              <button type="button" onClick={() => setEditingLinkTrackId(null)} className="text-xs font-black text-zinc-400 hover:text-white">關閉</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-black text-zinc-300">HTTPS 連結
                <input value={supportUrl} onChange={(event) => setSupportUrl(event.target.value)} placeholder="https://" maxLength={500} className="h-10 border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/60" />
              </label>
              <label className="grid gap-1 text-xs font-black text-zinc-300">連結用途
                <input value={supportLabel} onChange={(event) => setSupportLabel(event.target.value)} placeholder="例如：前往 YouTube 頻道" maxLength={80} className="h-10 border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-yellow-100/60" />
              </label>
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-zinc-500">可以連到 YouTube 頻道、MV 或外部支持／打賞頁。AIPOGER 不代收款、不處理付款或金額；新增或修改後會重新確認公開狀態。</p>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditingLinkTrackId(null)} className="border border-white/12 px-4 py-2 text-xs font-black text-zinc-300">取消</button><button type="button" disabled={busy.startsWith("support:")} onClick={() => void saveSupportLink()} className="border border-yellow-200/45 bg-yellow-300 px-4 py-2 text-xs font-black text-black disabled:opacity-50">{busy.startsWith("support:") ? "儲存中" : "儲存連結"}</button></div>
          </section>
        ) : null}

        {eligibility.eligible && schemaReady ? (
          <>
            <section className="mt-7 border border-cyan-200/20 bg-cyan-300/[0.035] p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/75">MY CHOICE</p><h2 className="mt-1 text-xl font-black text-white">{selected ? `我的 ${displayDate(selected.weekStart)} Choice` : "建立自己的 Choice"}</h2></div>
                <select value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value || null)} className="h-10 min-w-48 border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/60"><option value="">新增一期 Choice</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{displayDate(collection.weekStart)}{collection.isPublished ? " · 已發布" : " · 草稿"}</option>)}</select>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[170px_minmax(0,1fr)_minmax(0,1.4fr)]">
                <label className="grid gap-1 text-xs font-black text-zinc-300">週次（星期一）<input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="h-10 border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/60" /></label>
                <label className="grid gap-1 text-xs font-black text-zinc-300">標題（可選）<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="我的本期 Choice" className="h-10 border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/60" /></label>
                <label className="grid gap-1 text-xs font-black text-zinc-300">推薦文章（可選）<textarea value={intro} onChange={(event) => setIntro(event.target.value)} maxLength={AIPOGER_CHOICE_INTRO_MAX_LENGTH} rows={5} placeholder="寫下這期 Choice 的推薦文章。" className="border border-white/10 bg-black px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-100/60" /></label>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><p className="text-xs font-bold text-zinc-500">{choiceItemCountMessage(selected?.items.length ?? 0)}</p><div className="flex flex-wrap gap-2"><button type="button" disabled={busy !== ""} onClick={() => void saveCollection()} className="border border-white/15 px-4 py-2 text-xs font-black text-zinc-100 disabled:opacity-45">{busy === "save_collection" ? "儲存中" : selected ? "儲存草稿" : "建立草稿"}</button>{selected ? <><button type="button" disabled={busy !== ""} onClick={() => void copyPublicLink()} className="border border-white/15 px-4 py-2 text-xs font-black text-zinc-100 disabled:opacity-45">複製公開連結</button><Link href={creatorChoicePublicPath(selected.id)} className="border border-white/15 px-4 py-2 text-xs font-black text-zinc-100">看公開頁</Link><button type="button" disabled={busy !== ""} onClick={() => void runAction("set_published", { collectionId: selected.id, isPublished: !selected.isPublished, weekStart, title, intro }, selected.isPublished ? "Choice 已撤回。" : "Choice 已發布。", selected.id)} className={`border px-4 py-2 text-xs font-black disabled:opacity-45 ${selected.isPublished ? "border-red-200/35 bg-red-500/10 text-red-100" : "border-cyan-200/50 bg-cyan-300 text-black"}`}>{busy === "set_published" ? "處理中" : selected.isPublished ? "撤回發布" : "發布 Choice"}</button></> : null}</div></div>
            </section>

            {selected?.items.length ? <section className="mt-5 min-w-0"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-white">已選作品</h2><span className="text-xs font-bold text-zinc-500">可調整順序或移除</span></div><div className="mt-3 grid min-w-0 gap-2">{selected.items.map((item, index) => <article key={item.itemId} className="grid min-w-0 grid-cols-[1.5rem_2.75rem_minmax(0,1fr)] items-center gap-2 border border-white/10 bg-black/35 p-2 sm:grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_auto] sm:gap-3"><span className="w-6 text-center text-xs font-black text-zinc-500">{index + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.coverUrl} alt="" className="h-11 w-11 object-cover" /><div className="min-w-0"><p className="truncate text-sm font-black text-white">{item.title}</p><p className="truncate text-xs font-bold text-zinc-500">{item.artist} · {item.genre}</p></div><div className="col-span-3 flex justify-end gap-1 sm:col-span-1"><button type="button" disabled={!item.audioUrl} onClick={() => setPreviewTrack(item)} className="h-11 w-11 border border-cyan-100/25 text-sm font-black text-cyan-100 disabled:cursor-not-allowed disabled:opacity-30 sm:h-8 sm:w-8" aria-label={`播放 ${item.title}`} title={item.audioUrl ? "播放試聽" : "目前沒有可播放音檔"}>▶</button><button type="button" disabled={busy !== "" || index === 0} onClick={() => void runAction("move_item", { collectionId: selected.id, itemId: item.itemId, direction: "up" }, "Choice 順序已更新。", selected.id)} className="h-11 w-11 border border-white/10 text-sm font-black text-zinc-200 disabled:opacity-30 sm:h-8 sm:w-8" aria-label="上移">↑</button><button type="button" disabled={busy !== "" || index === selected.items.length - 1} onClick={() => void runAction("move_item", { collectionId: selected.id, itemId: item.itemId, direction: "down" }, "Choice 順序已更新。", selected.id)} className="h-11 w-11 border border-white/10 text-sm font-black text-zinc-200 disabled:opacity-30 sm:h-8 sm:w-8" aria-label="下移">↓</button><button type="button" disabled={busy !== ""} onClick={() => void runAction("remove_item", { collectionId: selected.id, itemId: item.itemId }, "已移除 Choice 作品。", selected.id)} className="h-11 w-11 border border-red-200/30 text-sm font-black text-red-100 disabled:opacity-30 sm:h-8 sm:w-8" aria-label="移除">×</button></div></article>)}</div></section> : null}

            <section className="mt-7 border-t border-white/10 pt-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">CHOICE SELECTION POOL</p><h2 className="mt-1 text-xl font-black text-white">挑選認證作品與本週新歌</h2><p className="mt-1 text-xs font-bold text-zinc-500">可選全站公開 Showtime 認證作品及上架 7 天內的新歌，不限自己的歌；新歌入選 Choice 不等於取得 Showtime 認證。左下播放鈕可直接試聽，按＋會自動建立本週草稿。</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋歌名、創作者、類型" className="h-10 w-full border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-cyan-100/60 sm:w-72" /></div><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">{filteredCatalog.map((item) => { const added = selectedItemKeys.has(`${item.sourceKind}:${item.id}`); return <article key={`${item.sourceKind}:${item.id}`} className="group min-w-0 overflow-hidden border border-white/10 bg-black/35"><div className="relative aspect-square overflow-hidden bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.coverUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.025]" /><span className={`absolute left-1 top-1 bg-black/85 px-1.5 py-1 text-[9px] font-black ${item.choiceSource === "new_release" ? "text-lime-100" : "text-yellow-100"}`}>{item.choiceSource === "new_release" ? "CHOICE 新選" : "SHOWTIME"}</span><button type="button" disabled={!item.audioUrl} onClick={() => setPreviewTrack(item)} className="absolute bottom-1 left-1 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/50 bg-black/80 text-xs font-black text-cyan-100 shadow-lg transition hover:bg-cyan-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-35" aria-label={`播放 ${item.title}`} title={item.audioUrl ? "播放試聽" : "目前沒有可播放音檔"}>▶</button><button type="button" disabled={added || busy !== ""} onClick={() => void addChoiceItem(item)} className={`absolute bottom-1 right-1 flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-xs font-black shadow-lg disabled:opacity-40 ${added ? "border-emerald-200/35 bg-emerald-300/90 text-black" : "border-cyan-100/50 bg-black/80 text-cyan-100 hover:bg-cyan-300 hover:text-black"}`} aria-label={`${added ? "已選" : "加入 Choice"}：${item.title}`}>{added ? "已選" : "+"}</button></div><div className="p-2"><h3 className="line-clamp-2 min-h-9 text-xs font-black leading-4 text-white">{item.title}</h3><p className="mt-1 truncate text-[11px] font-bold text-zinc-500">{item.artist}</p></div></article>; })}</div></section>
          </>
        ) : null}
      </div>
      <ChoicePreviewPlayer track={previewTrack} onClose={() => setPreviewTrack(null)} />
    </main>
  );
}
