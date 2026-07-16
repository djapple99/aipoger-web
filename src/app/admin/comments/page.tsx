"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Filter,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";

type AdminState = "checking" | "login" | "denied" | "ready";
type CommentSource = "listen_bar" | "choice" | "bible";
type CommentFilter = "all" | "reported" | "visible" | "hidden";
type SourceFilter = "all" | CommentSource;
type CommentAction = "hide" | "restore" | "delete" | "resolve_reports";

type AdminComment = {
  id: string;
  source: CommentSource;
  sourceLabel: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  updatedAt: string | null;
  moderationStatus: "visible" | "hidden";
  moderationNote: string | null;
  moderatedAt: string | null;
  targetTitle: string;
  targetHref: string;
  reportCount: number;
  openReportCount: number;
  reportReasons: string[];
};

type SourceState = Record<CommentSource, { exists: boolean; moderationReady: boolean }>;
type ApiPayload = {
  comments?: AdminComment[];
  sourceState?: SourceState;
  error?: string;
};

const PAGE_SIZE = 18;

const sourceFilters: Array<{ key: SourceFilter; label: string }> = [
  { key: "all", label: "全部來源" },
  { key: "listen_bar", label: "歌曲評論" },
  { key: "choice", label: "Choice 評論" },
  { key: "bible", label: "聖經評論" },
];

const statusFilters: Array<{ key: CommentFilter; label: string }> = [
  { key: "all", label: "全部狀態" },
  { key: "reported", label: "待看檢舉" },
  { key: "visible", label: "公開中" },
  { key: "hidden", label: "已隱藏" },
];

const reasonLabels: Record<string, string> = {
  copyright: "版權／採樣",
  unauthorized_voice_or_sample: "未授權聲音",
  impersonation: "冒名",
  scam_or_suspicious_payment: "收款異常",
  illegal_or_harmful: "違法／有害",
  privacy_or_harassment: "個資／騷擾",
  spam: "垃圾內容",
  other: "其他",
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initialFor(value: string) {
  return Array.from(value.trim())[0]?.toUpperCase() || "A";
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export default function AdminCommentsPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [sourceState, setSourceState] = useState<SourceState>({
    listen_bar: { exists: true, moderationReady: false },
    choice: { exists: true, moderationReady: false },
    bible: { exists: false, moderationReady: false },
  });
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<CommentFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [noteId, setNoteId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/comments", {
      cache: "no-store",
      headers: await authHeader(),
    });
    const payload = (await response.json().catch(() => null)) as ApiPayload | null;
    setLoading(false);
    if (!response.ok) {
      setError(payload?.error || "評論資料讀取失敗。");
      return;
    }
    setComments(Array.isArray(payload?.comments) ? payload.comments : []);
    if (payload?.sourceState) setSourceState(payload.sourceState);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (!session?.user) {
        setAdminState("login");
        return;
      }
      const allowed = await loadIsAdmin(session.user.id);
      if (!active) return;
      setAdminState(allowed ? "ready" : "denied");
      if (allowed) await loadComments();
    })();
    return () => { active = false; };
  }, [loadComments]);

  useEffect(() => {
    setPage(1);
  }, [query, sourceFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: comments.length,
    reported: comments.filter((comment) => comment.openReportCount > 0).length,
    visible: comments.filter((comment) => comment.moderationStatus === "visible").length,
    hidden: comments.filter((comment) => comment.moderationStatus === "hidden").length,
  }), [comments]);

  const filteredComments = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return comments.filter((comment) => {
      if (sourceFilter !== "all" && comment.source !== sourceFilter) return false;
      if (statusFilter === "reported" && comment.openReportCount === 0) return false;
      if (statusFilter === "visible" && comment.moderationStatus !== "visible") return false;
      if (statusFilter === "hidden" && comment.moderationStatus !== "hidden") return false;
      if (!normalized) return true;
      return [comment.displayName, comment.body, comment.targetTitle, comment.sourceLabel, ...comment.reportReasons]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized);
    });
  }, [comments, query, sourceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredComments.length / PAGE_SIZE));
  const visibleComments = filteredComments.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE);

  async function runAction(comment: AdminComment, action: CommentAction, adminNote = "") {
    if (busyId) return;
    setBusyId(comment.id);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...await authHeader(),
      },
      body: JSON.stringify({
        source: comment.source,
        commentId: comment.id,
        action,
        adminNote,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusyId("");
    if (!response.ok) {
      setError(payload?.error || "評論管理動作失敗。");
      return;
    }
    setNoteId("");
    setNoteDraft("");
    setDeleteConfirmId("");
    setMessage(action === "hide" ? "評論已隱藏並保留紀錄。" : action === "restore" ? "評論已恢復公開。" : action === "delete" ? "評論已永久刪除。" : "相關檢舉已結案。");
    await loadComments();
  }

  if (adminState !== "ready") {
    const isChecking = adminState === "checking";
    return (
      <main className="min-h-screen bg-[#060606] px-4 pb-16 pt-28 text-white">
        <section className="mx-auto max-w-2xl rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-8 text-center shadow-2xl">
          <ShieldCheck className="mx-auto h-10 w-10 text-orange-300" />
          <p className={`${fontRighteous.className} mt-5 text-xs uppercase tracking-[0.34em] text-orange-300/75`}>AIPOGER COMMENT DESK</p>
          <h1 className="mt-3 text-4xl font-black">{isChecking ? "正在確認後台權限…" : adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          {!isChecking ? (
            <Link href="/auth?next=%2Fadmin%2Fcomments" className="aipo-primary-button mt-7 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-black">
              {adminState === "login" ? "登入 owner 帳號" : "切換帳號"}
            </Link>
          ) : null}
        </section>
      </main>
    );
  }

  const missingModeration = (Object.keys(sourceState) as CommentSource[]).filter((source) => sourceState[source].exists && !sourceState[source].moderationReady);
  const missingSources = (Object.keys(sourceState) as CommentSource[]).filter((source) => !sourceState[source].exists);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pb-20 pt-24 text-zinc-100 sm:px-6 lg:px-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(255,106,0,0.18),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.1),transparent_28%),linear-gradient(180deg,#050505,#090706_55%,#030505)]" />
      <div className="relative mx-auto max-w-[1520px]">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-white/10 pb-6">
          <div>
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.34em] text-cyan-200/75`}>AIPOGER COMMENT DESK</p>
            <h1 className="mt-3 text-[clamp(2.4rem,5vw,4.9rem)] font-black leading-none tracking-[-0.04em] text-white">評論管理中控台</h1>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-zinc-400">集中查看歌曲、Choice 與練功聖經評論。優先處理被檢舉內容；隱藏可恢復，永久刪除不可復原。</p>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/admin/moderation" className="rounded-full border border-rose-200/20 bg-rose-300/[0.07] px-4 py-2 text-xs font-black text-rose-100">檢舉管理</Link>
            <Link href="/admin/listen-bar" className="rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-4 py-2 text-xs font-black text-cyan-100">歌曲後台</Link>
            <Link href="/admin/analytics" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200">數據後台</Link>
          </nav>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "待看檢舉", value: stats.reported, icon: AlertTriangle, accent: "text-rose-200" },
            { label: "公開評論", value: stats.visible, icon: Eye, accent: "text-cyan-200" },
            { label: "已隱藏", value: stats.hidden, icon: EyeOff, accent: "text-orange-200" },
            { label: "目前載入", value: stats.total, icon: MessageSquareText, accent: "text-white" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-[1.1rem] border border-white/10 bg-black/48 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black tracking-[0.14em] text-zinc-500">{item.label}</p>
                  <Icon className={`h-5 w-5 ${item.accent}`} />
                </div>
                <p className="mt-4 text-4xl font-black tabular-nums text-white">{item.value}</p>
              </article>
            );
          })}
        </section>

        {missingModeration.length > 0 || missingSources.length > 0 ? (
          <section className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] px-4 py-3 text-sm font-bold leading-6 text-amber-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <p>正式資料庫尚未套用評論治理 migration。現有評論仍可查看與永久刪除；隱藏／恢復會在 migration 核准後開放。{missingSources.includes("bible") ? "聖經評論表目前也尚未建立。" : ""}</p>
          </section>
        ) : null}

        <section className="sticky top-16 z-20 mt-6 rounded-[1.1rem] border border-white/10 bg-[#080808]/94 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(18rem,1fr)_auto_auto] xl:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋留言、作者、歌曲或歌單…" className="h-12 w-full rounded-xl border border-white/12 bg-black pl-12 pr-11 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-200/55" />
              {query ? <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-zinc-500 hover:text-white" aria-label="清除搜尋"><X className="h-4 w-4" /></button> : null}
            </label>
            <div className="flex flex-wrap gap-2" aria-label="評論來源篩選">
              {sourceFilters.map((item) => <button key={item.key} type="button" aria-pressed={sourceFilter === item.key} onClick={() => setSourceFilter(item.key)} className={`min-h-11 rounded-full border px-4 text-xs font-black transition ${sourceFilter === item.key ? "border-cyan-100/65 bg-cyan-300/14 text-cyan-50" : "border-white/10 text-zinc-500 hover:text-white"}`}>{item.label}</button>)}
            </div>
            <button type="button" onClick={() => void loadComments()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 px-4 text-xs font-black text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> 更新</button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
            <Filter className="mr-1 h-4 w-4 text-zinc-600" />
            {statusFilters.map((item) => <button key={item.key} type="button" aria-pressed={statusFilter === item.key} onClick={() => setStatusFilter(item.key)} className={`min-h-10 rounded-full border px-4 text-xs font-black transition ${statusFilter === item.key ? "border-orange-200/60 bg-orange-400/15 text-orange-100" : "border-white/10 text-zinc-500 hover:text-white"}`}>{item.label}</button>)}
            <p className="ml-auto text-xs font-black tabular-nums text-zinc-600">符合 {filteredComments.length} 則</p>
          </div>
        </section>

        {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-300/25 bg-rose-400/[0.07] px-4 py-3 text-sm font-bold text-rose-100">{error}</p> : null}
        {message ? <p role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] px-4 py-3 text-sm font-bold text-emerald-100">{message}</p> : null}

        <section className="mt-5 grid gap-3">
          {!loading && visibleComments.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-white/12 px-6 py-16 text-center">
              <MessageSquareText className="mx-auto h-9 w-9 text-zinc-700" />
              <p className="mt-4 font-black text-zinc-300">目前沒有符合條件的評論</p>
              <p className="mt-2 text-sm font-bold text-zinc-600">清除搜尋或切換來源／狀態再看看。</p>
            </div>
          ) : null}

          {visibleComments.map((comment) => {
            const sourceReady = sourceState[comment.source]?.moderationReady;
            const isBusy = busyId === comment.id;
            return (
              <article key={`${comment.source}:${comment.id}`} className={`overflow-hidden rounded-[1.15rem] border bg-black/52 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${comment.openReportCount > 0 ? "border-rose-300/35" : comment.moderationStatus === "hidden" ? "border-orange-300/24 opacity-80" : "border-white/10"}`}>
                <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(13rem,0.28fr)_minmax(0,1fr)_auto] lg:items-start">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/12 bg-white/[0.05] text-sm font-black text-cyan-100">
                      {comment.avatarUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={comment.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        </>
                      ) : initialFor(comment.displayName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{comment.displayName}</p>
                      <time dateTime={comment.createdAt} className="mt-1 block text-[11px] font-bold tabular-nums text-zinc-600">{formatTime(comment.createdAt)}</time>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${comment.source === "listen_bar" ? "border-cyan-200/22 bg-cyan-300/[0.07] text-cyan-100" : comment.source === "choice" ? "border-yellow-200/22 bg-yellow-300/[0.07] text-yellow-100" : "border-orange-200/22 bg-orange-400/[0.08] text-orange-100"}`}>{comment.sourceLabel}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${comment.moderationStatus === "hidden" ? "bg-orange-300/12 text-orange-100" : "bg-emerald-300/10 text-emerald-100"}`}>{comment.moderationStatus === "hidden" ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{comment.moderationStatus === "hidden" ? "已隱藏" : "公開中"}</span>
                      {comment.openReportCount > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-400/14 px-2.5 py-1 text-[10px] font-black text-rose-100"><AlertTriangle className="h-3 w-3" />待處理 {comment.openReportCount}</span> : null}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-[15px] font-bold leading-7 text-zinc-200">{comment.body}</p>
                    <Link href={comment.targetHref} target="_blank" className="mt-3 inline-flex max-w-full items-center gap-1.5 text-xs font-black text-cyan-200/80 transition hover:text-cyan-50">
                      <span className="truncate">出現在：{comment.targetTitle}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                    {comment.openReportCount > 0 ? <div className="mt-3 flex flex-wrap gap-2">{comment.reportReasons.map((reason) => <span key={reason} className="rounded-md border border-rose-200/16 bg-rose-300/[0.04] px-2 py-1 text-[10px] font-black text-rose-100/80">{reasonLabels[reason] || reason}</span>)}</div> : null}
                    {comment.moderationNote ? <p className="mt-3 border-l-2 border-orange-300/45 pl-3 text-xs font-bold leading-5 text-zinc-500">管理備註：{comment.moderationNote}</p> : null}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-[15rem] lg:justify-end">
                    {comment.moderationStatus === "visible" ? (
                      <button type="button" disabled={isBusy || !sourceReady} onClick={() => { setNoteId(comment.id); setNoteDraft(comment.moderationNote || ""); setDeleteConfirmId(""); }} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-orange-200/25 px-3 text-xs font-black text-orange-100 transition hover:border-orange-200/60 disabled:cursor-not-allowed disabled:opacity-35" title={!sourceReady ? "migration 套用後開放" : "保留資料但停止公開"}><EyeOff className="h-3.5 w-3.5" /> 隱藏</button>
                    ) : (
                      <button type="button" disabled={isBusy || !sourceReady} onClick={() => void runAction(comment, "restore", comment.moderationNote || "")} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-200/25 px-3 text-xs font-black text-emerald-100 transition hover:border-emerald-200/60 disabled:opacity-35"><Eye className="h-3.5 w-3.5" /> 恢復</button>
                    )}
                    {comment.openReportCount > 0 ? <button type="button" disabled={isBusy} onClick={() => void runAction(comment, "resolve_reports", "已由評論中控台審查") } className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-200/20 px-3 text-xs font-black text-cyan-100 transition hover:border-cyan-200/55 disabled:opacity-35"><CheckCircle2 className="h-3.5 w-3.5" /> 只結案</button> : null}
                    {deleteConfirmId !== comment.id ? (
                      <button type="button" disabled={isBusy} onClick={() => { setDeleteConfirmId(comment.id); setNoteId(""); }} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-rose-300/20 px-3 text-xs font-black text-rose-200 transition hover:border-rose-300/60 disabled:opacity-35"><Trash2 className="h-3.5 w-3.5" /> 永久刪除</button>
                    ) : (
                      <div className="flex flex-wrap gap-2 rounded-xl border border-rose-300/25 bg-rose-400/[0.06] p-2">
                        <button type="button" disabled={isBusy} onClick={() => void runAction(comment, "delete", "由 owner 永久刪除") } className="min-h-9 rounded-full bg-rose-300 px-3 text-[11px] font-black text-black disabled:opacity-40">確認永久刪除</button>
                        <button type="button" onClick={() => setDeleteConfirmId("")} className="min-h-9 rounded-full border border-white/12 px-3 text-[11px] font-black text-zinc-300">取消</button>
                      </div>
                    )}
                  </div>
                </div>

                {noteId === comment.id ? (
                  <div className="border-t border-orange-200/16 bg-orange-300/[0.035] p-4 sm:px-5">
                    <label className="block text-xs font-black text-orange-100">隱藏原因（內部備註，可不填）
                      <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} maxLength={500} rows={2} placeholder="例如：人身攻擊、垃圾廣告、離題洗版…" className="mt-2 w-full resize-none rounded-xl border border-white/12 bg-black/70 px-3 py-2 text-sm font-bold text-white outline-none placeholder:text-zinc-700 focus:border-orange-200/55" />
                    </label>
                    <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => { setNoteId(""); setNoteDraft(""); }} className="min-h-10 rounded-full border border-white/12 px-4 text-xs font-black text-zinc-400">取消</button><button type="button" disabled={isBusy} onClick={() => void runAction(comment, "hide", noteDraft)} className="min-h-10 rounded-full bg-orange-300 px-5 text-xs font-black text-black disabled:opacity-40">確認隱藏</button></div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {totalPages > 1 ? (
          <nav className="mt-6 flex items-center justify-center gap-3" aria-label="評論分頁">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 text-zinc-300 disabled:opacity-30" aria-label="上一頁"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs font-black tabular-nums text-zinc-500">{Math.min(page, totalPages)} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 text-zinc-300 disabled:opacity-30" aria-label="下一頁"><ChevronRight className="h-4 w-4" /></button>
          </nav>
        ) : null}
      </div>
    </main>
  );
}
