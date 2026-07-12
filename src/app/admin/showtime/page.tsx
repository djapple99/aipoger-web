"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";

type AdminState = "checking" | "login" | "denied" | "ready";
type ViewFilter = "all" | "published" | "candidate" | "hidden";

type ShowtimePayload = {
  schemaReady?: boolean;
  items?: AipogerChoiceCatalogItem[];
  error?: string;
};

const SHOWTIME_PER_PAGE = 10;

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function sourceLabel(item: AipogerChoiceCatalogItem) {
  return item.sourceKind === "battle_archive" ? "正式 Battle" : "AI Music";
}

function displayDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
}

export default function AdminShowtimePage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [schemaReady, setSchemaReady] = useState(true);
  const [items, setItems] = useState<AipogerChoiceCatalogItem[]>([]);
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/showtime", { headers: await authHeader() });
    const payload = (await response.json().catch(() => null)) as ShowtimePayload | null;
    if (!response.ok) {
      setError(payload?.error || "Showtime 後台資料讀取失敗。");
      return;
    }
    setSchemaReady(payload?.schemaReady !== false);
    setItems(payload?.items ?? []);
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

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items.filter((item) => {
      const isCandidate = item.recognition === "傷心酒吧公播候選";
      const hidden = !item.isPublic && !isCandidate;
      if (filter === "published" && !item.isPublic) return false;
      if (filter === "candidate" && !isCandidate) return false;
      if (filter === "hidden" && !hidden) return false;
      if (!normalized) return true;
      return [item.title, item.artist, item.genre, item.recognition].join(" ").toLowerCase().includes(normalized);
    });
  }, [filter, items, query]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / SHOWTIME_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((currentPage - 1) * SHOWTIME_PER_PAGE, currentPage * SHOWTIME_PER_PAGE);

  useEffect(() => { setPage(1); }, [filter, query]);

  async function runAction(item: AipogerChoiceCatalogItem, action: "certify_track" | "hide_track" | "restore_track" | "hide_archive" | "restore_archive") {
    const verbs: Record<typeof action, string> = {
      certify_track: "認證為 Showtime",
      hide_track: "從 Showtime 收回",
      restore_track: "恢復 Showtime 公開展示",
      hide_archive: "從 Showtime 收回",
      restore_archive: "恢復 Showtime 公開展示",
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
    await loadData();
  }

  if (adminState === "checking") {
    return <main className="min-h-screen bg-[#050505] px-5 py-10 text-sm font-black text-zinc-400">檢查 Showtime 後台權限中...</main>;
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
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-100/70">AIPOGER ADMIN</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Showtime 管理</h1>
            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-zinc-400">管理認證與公開展示。認證後作品停止接戰；這裡不修改音檔、Battle 結果、票數或收藏。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/rank?lang=zh" className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-zinc-200">看 Showtime</Link>
            <Link href="/admin/choice" className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100">Choice 管理</Link>
            <Link href="/profile" className="rounded-full border border-white/15 px-3 py-2 text-xs font-black text-zinc-200">回個人資料</Link>
          </div>
        </header>

        {!schemaReady ? (
          <section className="mt-5 rounded-xl border border-red-200/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">Showtime 資料欄位尚未完成部署，請先套用目前的 Showtime schema migration。</section>
        ) : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-200/25 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-200/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}

        <section className="mt-5 rounded-2xl border border-white/10 bg-black/45 p-3 sm:p-4">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋歌名、創作者、類型" className="h-11 rounded-xl border border-white/10 bg-black/55 px-3 text-sm font-bold text-white outline-none focus:border-yellow-200/60" />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              {(["all", "published", "candidate", "hidden"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-xl border px-3 py-2 text-xs font-black ${filter === value ? "border-yellow-200/55 bg-yellow-300 text-black" : "border-white/10 bg-white/[0.03] text-zinc-300"}`}>
                  {{ all: "全部", published: "公開中", candidate: "公播候選", hidden: "已收回" }[value]}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs font-bold text-zinc-500">{filteredItems.length} 首作品，每頁 {SHOWTIME_PER_PAGE} 首。</p>
        </section>

        <section className="mt-4 grid gap-3">
          {pagedItems.map((item) => {
            const isCandidate = item.recognition === "傷心酒吧公播候選";
            const hidden = !item.isPublic && !isCandidate;
            const busy = busyId?.endsWith(`:${item.id}`);
            return (
              <article key={`${item.sourceKind}:${item.id}`} className="grid gap-3 rounded-2xl border border-white/10 bg-black/55 p-3 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center sm:p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.coverUrl} alt="" className="h-20 w-20 rounded-xl border border-white/10 object-cover" />
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-[11px] font-black">
                    <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-cyan-100">{sourceLabel(item)}</span>
                    <span className={`rounded-full border px-2 py-1 ${item.isPublic ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100" : isCandidate ? "border-yellow-200/25 bg-yellow-300/10 text-yellow-100" : "border-white/10 bg-white/[0.03] text-zinc-400"}`}>{item.isPublic ? "公開中" : isCandidate ? "可認證" : "已收回"}</span>
                  </div>
                  <h2 className="mt-2 truncate text-lg font-black text-white">{item.title}</h2>
                  <p className="mt-1 truncate text-sm font-bold text-zinc-300">{item.artist} · {item.genre}</p>
                  <p className="mt-1 text-xs font-bold text-yellow-100/85">{item.recognition} · {displayDate(item.certifiedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {isCandidate ? (
                    <button type="button" disabled={busy} onClick={() => void runAction(item, "certify_track")} className="rounded-full border border-yellow-200/45 bg-yellow-300 px-3 py-2 text-xs font-black text-black disabled:opacity-50">{busy ? "處理中" : "認證 Showtime"}</button>
                  ) : item.sourceKind === "listen_bar_track" ? (
                    <button type="button" disabled={busy} onClick={() => void runAction(item, hidden ? "restore_track" : "hide_track")} className={`rounded-full border px-3 py-2 text-xs font-black disabled:opacity-50 ${hidden ? "border-emerald-200/35 bg-emerald-300/10 text-emerald-100" : "border-red-200/35 bg-red-500/10 text-red-100"}`}>{busy ? "處理中" : hidden ? "恢復展示" : "收回展示"}</button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => void runAction(item, hidden ? "restore_archive" : "hide_archive")} className={`rounded-full border px-3 py-2 text-xs font-black disabled:opacity-50 ${hidden ? "border-emerald-200/35 bg-emerald-300/10 text-emerald-100" : "border-red-200/35 bg-red-500/10 text-red-100"}`}>{busy ? "處理中" : hidden ? "恢復展示" : "收回展示"}</button>
                  )}
                </div>
              </article>
            );
          })}
          {pagedItems.length === 0 ? <p className="rounded-2xl border border-white/10 bg-black/40 px-4 py-10 text-center text-sm font-bold text-zinc-500">目前沒有符合條件的 Showtime 作品。</p> : null}
        </section>

        <div className="mt-5 flex items-center justify-between gap-3 text-sm font-bold text-zinc-400">
          <span>{currentPage} / {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-full border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35">上一頁</button>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="rounded-full border border-white/10 px-3 py-2 text-xs font-black disabled:opacity-35">下一頁</button>
          </div>
        </div>
      </div>
    </main>
  );
}
