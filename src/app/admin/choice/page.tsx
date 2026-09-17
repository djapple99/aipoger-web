"use client";

import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import { PublishedChoiceList, displayTitle, type ChoiceLibraryEntry } from "@/components/admin-published-choice-list";

type AdminState = "checking" | "login" | "denied" | "ready";
type ChoicePayload = { schemaReady?: boolean; library?: ChoiceLibraryEntry[]; featuredKey?: string | null; error?: string };
const PER_PAGE = 24;

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}
export default function AdminChoicePage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [schemaReady, setSchemaReady] = useState(true);
  const [library, setLibrary] = useState<ChoiceLibraryEntry[]>([]);
  const [featuredKey, setFeaturedKey] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const response = await fetch("/api/admin/choice", { headers: await authHeader(), cache: "no-store" });
    const payload = await response.json().catch(() => null) as ChoicePayload | null;
    if (!response.ok) throw new Error(payload?.error || "Choice 後台資料讀取失敗。");
    setSchemaReady(payload?.schemaReady !== false);
    setLibrary((payload?.library ?? []).filter((entry) => entry.isPublished));
    setFeaturedKey(payload?.featuredKey ?? "");
  }, []);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) { setAdminState("login"); return; }
      const allowed = await loadIsAdmin(user.id);
      if (!mounted) return;
      setAdminState(allowed ? "ready" : "denied");
      if (allowed) await loadData();
    }
    void check().catch(() => { if (mounted) { setAdminState("denied"); setError("無法確認管理權限或讀取資料，請重新載入。"); } });
    return () => { mounted = false; };
  }, [loadData]);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return library.filter((entry) => !text || [entry.title, entry.curatorName, entry.weekStart].join(" ").toLowerCase().includes(text));
  }, [library, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  async function runAction(action: string, body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/choice", { method: "PATCH",
        headers: { "Content-Type": "application/json", ...await authHeader() },
        body: JSON.stringify({ action, ...body }) });
      const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Choice 操作失敗。");
      setMessage(payload?.message || "已更新。");
      await loadData();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Choice 操作失敗。"); }
    finally { setBusy(false); }
  }
  function deleteChoice(entry: ChoiceLibraryEntry) {
    if (!window.confirm(`確定刪除「${displayTitle(entry)}」？只會移除這份 Choice 與歌單互動，歌曲本身不受影響。`)) return;
    void runAction(entry.kind === "creator" ? "delete_creator_collection" : "delete_collection", { collectionId: entry.id, confirmed: true });
  }

  if (adminState !== "ready") return <main className="min-h-screen bg-[#070809] px-5 py-24 text-white">
    <h1 className="text-xl font-bold">{adminState === "checking" ? "檢查管理權限中..." : adminState === "login" ? "請先登入" : "無法進入 Choice 管理"}</h1>
    {error ? <p role="alert" className="mt-3 text-red-300">{error}</p> : null}
    {adminState !== "checking" ? <Link href="/auth" className="mt-5 inline-block text-orange-300">前往登入</Link> : null}
  </main>;

  return <main className="min-h-screen bg-[#070809] px-4 pb-28 pt-24 text-white sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-5">
        <h1 className="text-2xl font-bold">Choice 管理</h1>
        <nav aria-label="後台導覽" className="flex flex-wrap gap-4 text-sm text-zinc-300">
          <Link href="/admin">後台總覽</Link>
          <Link href="/admin/charts">排行榜管理</Link>
          <Link href="/rank?lang=zh#choice-weekly">公開 Choice</Link>
          <Link href="/profile/choice" className="text-orange-300">我的 Choice</Link>
        </nav>
      </header>
      {!schemaReady ? <p role="alert" className="mt-4 text-red-300">Choice 資料尚未準備完成。</p> : null}
      {message ? <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm text-red-300">{error}</p> : null}
      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-bold">已發布 Choice <span className="ml-2 text-sm font-normal text-zinc-400">{library.length}</span></h2>
          <label className="flex w-full items-center gap-2 border-b border-white/25 sm:w-72">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            <input aria-label="搜尋已發布 Choice" placeholder="歌單、策展人、週次" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
        {featuredKey && !library.some((entry) => `${entry.kind}:${entry.id}` === featuredKey) ? <button type="button" disabled={busy} onClick={() => void runAction("set_featured", { featuredKey: null })} className="mt-4 text-sm text-orange-300">清除已撤下的主推設定</button> : null}
        <PublishedChoiceList entries={filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)} featuredKey={featuredKey} busy={busy}
          onFeature={(key) => void runAction("set_featured", { featuredKey: key })} onDelete={deleteChoice} />
        {filtered.length === 0 ? <p className="py-12 text-center text-sm text-zinc-500">{query ? "沒有符合條件的 Choice。" : "尚無已發布的 Choice。"}</p> : null}
        {totalPages > 1 ? <nav aria-label="Choice 分頁" className="mt-4 flex items-center justify-end gap-3 text-sm text-zinc-400">
          <button type="button" title="上一頁" aria-label="上一頁" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="flex h-11 w-11 items-center justify-center rounded border border-white/15 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span>{currentPage} / {totalPages}</span>
          <button type="button" title="下一頁" aria-label="下一頁" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="flex h-11 w-11 items-center justify-center rounded border border-white/15 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </nav> : null}
      </section>
    </div>
  </main>;
}
