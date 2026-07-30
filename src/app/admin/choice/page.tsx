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
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import { ChoicePreviewPlayer } from "@/components/choice-preview-player";
import { ChoiceSelectedWorks } from "@/components/choice-selected-works";

type AdminState = "checking" | "login" | "denied" | "ready";
type ChoicePayload = {
  schemaReady?: boolean;
  catalog?: AipogerChoiceCatalogItem[];
  collections?: AipogerChoiceCollection[];
  error?: string;
};

const CHOICE_CATALOG_PER_PAGE = 24;

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default function AdminChoicePage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [schemaReady, setSchemaReady] = useState(true);
  const [catalog, setCatalog] = useState<AipogerChoiceCatalogItem[]>([]);
  const [collections, setCollections] = useState<AipogerChoiceCollection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(choiceWeekStart());
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [curatorIdentity, setCuratorIdentity] = useState<AipogerChoiceCuratorIdentity>("official");
  const [query, setQuery] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewTrack, setPreviewTrack] = useState<AipogerChoiceCatalogItem | null>(null);

  const loadData = useCallback(async (preferredId?: string | null) => {
    setError("");
    const response = await fetch("/api/admin/choice", { headers: await authHeader() });
    const payload = (await response.json().catch(() => null)) as ChoicePayload | null;
    if (!response.ok) {
      setError(payload?.error || "Choice 後台資料讀取失敗。");
      return;
    }
    const nextCollections = payload?.collections ?? [];
    setSchemaReady(payload?.schemaReady !== false);
    setCatalog(payload?.catalog ?? []);
    setCollections(nextCollections);
    setSelectedId((current) => {
      if (preferredId && nextCollections.some((item) => item.id === preferredId)) return preferredId;
      if (current && nextCollections.some((item) => item.id === current)) return current;
      return nextCollections[0]?.id ?? null;
    });
  }, []);

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
      setAdminState(allowed ? "ready" : "denied");
      if (allowed) await loadData();
    }
    void check();
    return () => { mounted = false; };
  }, [loadData]);

  const selected = useMemo(() => collections.find((collection) => collection.id === selectedId) ?? null, [collections, selectedId]);

  useEffect(() => {
    if (!selected) {
      setWeekStart(choiceWeekStart());
      setTitle("");
      setIntro("");
      setCuratorIdentity("official");
      return;
    }
    setWeekStart(selected.weekStart);
    setTitle(selected.title);
    setIntro(selected.intro);
    setCuratorIdentity(selected.curatorIdentity ?? "official");
  }, [selected]);

  const selectedKeys = useMemo(() => new Set((selected?.items ?? []).map((item) => `${item.sourceKind}:${item.id}`)), [selected]);
  const eligibleCatalog = useMemo(() => catalog.filter((item) => item.isPublic && item.selectable), [catalog]);
  const filteredCatalog = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return eligibleCatalog;
    return eligibleCatalog.filter((item) => [item.title, item.artist, item.genre, item.recognition].join(" ").toLowerCase().includes(normalized));
  }, [eligibleCatalog, query]);
  const catalogTotalPages = Math.max(1, Math.ceil(filteredCatalog.length / CHOICE_CATALOG_PER_PAGE));
  const currentCatalogPage = Math.min(catalogPage, catalogTotalPages);
  const pagedCatalog = filteredCatalog.slice((currentCatalogPage - 1) * CHOICE_CATALOG_PER_PAGE, currentCatalogPage * CHOICE_CATALOG_PER_PAGE);

  useEffect(() => { setCatalogPage(1); }, [query]);

  async function runAction(action: string, body: Record<string, unknown>, success: string, preferredId?: string | null) {
    setBusy(action);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/choice", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ action, ...body }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string; collectionId?: string } | null;
    setBusy("");
    if (!response.ok) {
      setError(payload?.error || "Choice 操作失敗。");
      return null;
    }
    const nextId = payload?.collectionId ?? preferredId ?? selectedId;
    setMessage(payload?.message || success);
    await loadData(nextId);
    return { ...payload, collectionId: nextId ?? undefined };
  }

  async function saveCollection() {
    await runAction("save_collection", {
      collectionId: selected?.id,
      weekStart,
      title,
      intro,
      curatorIdentity,
    }, "Choice 草稿已儲存。", selected?.id);
  }

  async function ensureChoiceCollection() {
    if (selected) return selected.id;
    const result = await runAction("save_collection", {
      weekStart,
      title,
      intro,
      curatorIdentity,
    }, "已建立本週 Choice 草稿。");
    return result?.collectionId ?? null;
  }

  async function addChoiceItem(item: AipogerChoiceCatalogItem) {
    if (busy !== "" || selectedKeys.has(`${item.sourceKind}:${item.id}`)) return;
    const collectionId = await ensureChoiceCollection();
    if (!collectionId) return;
    await runAction("add_item", {
      collectionId,
      sourceKind: item.sourceKind,
      sourceId: item.id,
    }, "已加入本週 Choice。", collectionId);
  }

  async function moveChoiceItem(itemId: string, position: number) {
    if (!selected) return false;
    const result = await runAction("move_item", {
      collectionId: selected.id,
      itemId,
      position,
    }, "Choice 順序已更新。", selected.id);
    return Boolean(result);
  }

  if (adminState === "checking") {
    return <main className="min-h-screen bg-[#050505] px-5 py-10 text-sm font-black text-zinc-400">檢查 Choice 後台權限中...</main>;
  }
  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/75">AIPOGER ADMIN</p>
          <h1 className="mt-3 text-4xl font-black">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <Link href="/auth" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">前往登入</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-24 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">AIPOGER ADMIN</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Choice 管理</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-zinc-400">從公開 Showtime 認證作品與上架 30 天內的新歌，人工挑選每週 5–10 首。這不是排行榜，也不會自動生成社群貼文。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/rank?lang=zh#choice-weekly" className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-zinc-200">看前台 Choice</Link>
            <Link href="/admin/showtime" className="rounded-full border border-yellow-200/30 bg-yellow-300/10 px-3 py-2 text-xs font-black text-yellow-100">Showtime 管理</Link>
            <Link href="/admin/social" className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-zinc-200">社群發布</Link>
          </div>
        </header>

        {!schemaReady ? <section className="mt-5 rounded-xl border border-red-200/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">Choice 資料表尚未套用。部署本次 migration 後，此管理頁會自動可用。</section> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-200/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-200/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}

        <section className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-black/55 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/70">Weekly Curation</p>
                <h2 className="mt-1 text-xl font-black">{selected ? `週次 ${displayDate(selected.weekStart)}` : "建立 Choice 週次"}</h2>
              </div>
              <select value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value || null)} className="h-10 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none sm:w-auto sm:min-w-44">
                <option value="">新增週次</option>
                {collections.map((collection) => <option key={collection.id} value={collection.id}>{displayDate(collection.weekStart)} {collection.isPublished ? "· 已發布" : "· 草稿"}</option>)}
              </select>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-black text-zinc-400">週次（星期一）
                <input type="date" value={weekStart} onChange={(event) => setWeekStart(event.target.value)} className="h-10 rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/55" />
              </label>
              <label className="grid gap-1 text-xs font-black text-zinc-400">標題（可選）
                <input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="本週 Choice" className="h-10 rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/55" />
              </label>
              <label className="grid gap-1 text-xs font-black text-zinc-400">策展身分
                <select value={curatorIdentity} onChange={(event) => setCuratorIdentity(event.target.value as AipogerChoiceCuratorIdentity)} className="h-10 rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-cyan-200/55">
                  <option value="official">官方 AIPOGER Choice</option>
                  <option value="personal">愛波哥 Choice（個人頭像）</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black text-zinc-400 sm:col-span-2">推薦文章（可選）
                <textarea value={intro} maxLength={AIPOGER_CHOICE_INTRO_MAX_LENGTH} rows={6} onChange={(event) => setIntro(event.target.value)} placeholder="寫下這期 Choice 的推薦文章。" className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-200/55" />
                <span className="font-bold text-zinc-600">儲存後會顯示在 Choice 卡片與公開頁標題旁。</span>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-xs font-bold text-zinc-500">{choiceItemCountMessage(selected?.items.length ?? 0)}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy !== ""} onClick={() => void saveCollection()} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black text-zinc-100 disabled:opacity-45">{busy === "save_collection" ? "儲存中" : selected ? "儲存草稿" : "建立草稿"}</button>
                {selected ? <button type="button" disabled={busy !== ""} onClick={() => void runAction("set_published", { collectionId: selected.id, isPublished: !selected.isPublished, weekStart, title, intro, curatorIdentity }, selected.isPublished ? "Choice 已撤回。" : "Choice 已發布。", selected.id)} className={`rounded-full border px-4 py-2 text-xs font-black disabled:opacity-45 ${selected.isPublished ? "border-red-200/35 bg-red-500/10 text-red-100" : "border-cyan-200/45 bg-cyan-300 text-black"}`}>{busy === "set_published" ? "處理中" : selected.isPublished ? "撤回發布" : "發布到 Showtime"}</button> : null}
              </div>
            </div>
          </div>

          <aside className="min-w-0 rounded-2xl border border-white/10 bg-black/45 p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-100/70">This Week</p>
            <h2 className="mt-1 text-xl font-black">已選作品 {selected?.items.length ?? 0} / 10</h2>
            <div className="mt-4">
              {selected ? (
                <ChoiceSelectedWorks
                  items={selected.items}
                  busy={busy !== ""}
                  layout="sidebar"
                  onPreview={setPreviewTrack}
                  onMove={moveChoiceItem}
                  onRemove={(itemId) => void runAction("remove_item", { collectionId: selected.id, itemId }, "已移除 Choice 作品。", selected.id)}
                />
              ) : null}
              {!selected ? <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm font-bold text-zinc-500">按目錄的＋即可建立本週草稿並加入 Choice 作品。</p> : null}
              {selected && selected.items.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-sm font-bold text-zinc-500">從選歌池挑選 5–10 首認證作品或新歌。</p> : null}
            </div>
          </aside>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-black/45 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Choice Selection Pool</p><h2 className="mt-1 text-xl font-black">加入本週 Choice</h2></div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋歌名、創作者、類型" className="h-10 w-full rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none sm:w-72" />
          </div>
          <p className="mt-2 text-xs font-bold text-zinc-500">可選目前公開的 Showtime 認證作品及上架 30 天內的新歌；新歌入選 Choice 不等於取得 Showtime 認證。左下播放鈕可直接試聽，按＋會自動建立本週草稿。</p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {pagedCatalog.map((item) => {
              const key = `${item.sourceKind}:${item.id}`;
              const added = selectedKeys.has(key);
              return (
                <article key={key} className="group min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/55">
                  <div className="relative aspect-square overflow-hidden bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.coverUrl} alt="" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.025]" />
                    <span className={`absolute left-1 top-1 bg-black/85 px-1.5 py-1 text-[9px] font-black ${item.choiceSource === "new_release" ? "text-lime-100" : "text-yellow-100"}`}>{item.choiceSource === "new_release" ? "CHOICE 新選" : "SHOWTIME"}</span>
                    <button type="button" disabled={!item.audioUrl} onClick={() => setPreviewTrack(item)} className="absolute bottom-1 left-1 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/50 bg-black/80 text-xs font-black text-cyan-100 shadow-lg transition hover:bg-cyan-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-35" aria-label={`播放 ${item.title}`} title={item.audioUrl ? "播放試聽" : "目前沒有可播放音檔"}>▶</button>
                    <button type="button" disabled={added || busy !== ""} onClick={() => void addChoiceItem(item)} className={`absolute bottom-1 right-1 flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-xs font-black shadow-lg disabled:opacity-40 ${added ? "border-emerald-200/35 bg-emerald-300/90 text-black" : "border-cyan-100/50 bg-black/80 text-cyan-100 hover:bg-cyan-300 hover:text-black"}`} aria-label={`${added ? "已加入" : "加入"}本週 Choice：${item.title}`}>{added ? "已選" : "+"}</button>
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 min-h-9 text-xs font-black leading-4 text-white">{item.title}</p>
                    <p className="mt-1 truncate text-[11px] font-bold text-zinc-500">{item.artist}</p>
                  </div>
                </article>
              );
            })}
            {pagedCatalog.length === 0 ? <p className="col-span-full rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm font-bold text-zinc-500">目前沒有可加入的 Showtime 認證作品或 30 天內新歌。</p> : null}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm font-bold text-zinc-500"><span>{currentCatalogPage} / {catalogTotalPages}</span><div className="flex gap-2"><button type="button" disabled={currentCatalogPage <= 1} onClick={() => setCatalogPage((page) => Math.max(1, page - 1))} className="rounded-full border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35">上一頁</button><button type="button" disabled={currentCatalogPage >= catalogTotalPages} onClick={() => setCatalogPage((page) => Math.min(catalogTotalPages, page + 1))} className="rounded-full border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35">下一頁</button></div></div>
        </section>
      </div>
      <ChoicePreviewPlayer track={previewTrack} onClose={() => setPreviewTrack(null)} />
    </main>
  );
}
