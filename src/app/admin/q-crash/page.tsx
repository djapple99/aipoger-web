"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, ImagePlus, LockKeyhole, RefreshCw, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";

type AdminState = "checking" | "login" | "denied" | "ready";
type WorkSide = "A" | "B";

type QCrashWork = {
  side: WorkSide;
  queueId: string | null;
  songName: string;
  creatorName: string;
  genre: string;
  aiTool: string;
  coverUrl: string | null;
  originalCoverUrl: string | null;
  editorialCoverPath: string | null;
  fullSongUrl: string | null;
};

type QCrashCard = {
  id: string;
  battleId: string | null;
  status: string;
  durationMinutes: number;
  createdAt: string;
  votingStartedAt: string | null;
  votingEndsAt: string | null;
  updatedAt: string | null;
  winner: "fighter_a" | "fighter_b" | null;
  battleEndedAt: string | null;
  editable: boolean;
  works: { A: QCrashWork; B: QCrashWork | null };
};

type QCrashPayload = {
  schemaReady?: boolean;
  cards?: QCrashCard[];
  error?: string;
};

type EditingWork = {
  card: QCrashCard;
  work: QCrashWork;
};

const statusLabel: Record<string, string> = {
  q_crash_pending_invite: "等待第二首作品",
  q_crash_joining: "加入中",
  q_crash_voting: "投票進行中",
  q_crash_finished: "正式結果",
  q_crash_insufficient: "觀眾不足",
  q_crash_cancelled: "已取消",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusText(status: string) {
  return statusLabel[status] ?? status;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export default function AdminQCrashPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [schemaReady, setSchemaReady] = useState(true);
  const [cards, setCards] = useState<QCrashCard[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<EditingWork | null>(null);
  const [fullSongUrl, setFullSongUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [removeCover, setRemoveCover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/q-crash", { headers: await authHeader(), cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as QCrashPayload | null;
    setLoading(false);
    if (!response.ok) {
      setError(payload?.error || "Q Crash 後台資料讀取失敗。");
      return;
    }
    setSchemaReady(payload?.schemaReady !== false);
    setCards(payload?.cards ?? []);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
    })();
    return () => { mounted = false; };
  }, [loadData]);

  useEffect(() => () => {
    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (statusFilter !== "all" && card.status !== statusFilter) return false;
      if (!normalized) return true;
      const text = [
        card.battleId,
        card.works.A.songName,
        card.works.A.creatorName,
        card.works.B?.songName,
        card.works.B?.creatorName,
        card.works.A.genre,
      ].filter(Boolean).join(" ").toLowerCase();
      return text.includes(normalized);
    });
  }, [cards, query, statusFilter]);

  function openEditor(card: QCrashCard, work: QCrashWork) {
    if (!card.editable || !work.queueId) return;
    setEditing({ card, work });
    setFullSongUrl(work.fullSongUrl ?? "");
    setCoverFile(null);
    setCoverPreview(work.coverUrl ?? "");
    setRemoveCover(false);
    setError("");
    setMessage("");
  }

  function closeEditor() {
    if (busy) return;
    setEditing(null);
    setCoverFile(null);
    setCoverPreview("");
    setRemoveCover(false);
  }

  function onCoverChange(file: File | null) {
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
      setError("封面只接受 JPG、PNG、WebP 或 GIF，且不能超過 10MB。");
      return;
    }
    setError("");
    setCoverFile(file);
    setRemoveCover(false);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function saveWork() {
    if (!editing?.work.queueId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const metadataResponse = await fetch("/api/admin/q-crash", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({
          action: "update_work",
          queueId: editing.work.queueId,
          fullSongUrl: fullSongUrl.trim(),
          ...(removeCover && !coverFile ? { coverPath: null } : {}),
        }),
      });
      const metadataPayload = (await metadataResponse.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!metadataResponse.ok) throw new Error(metadataPayload?.error || "展示資料儲存失敗。");

      let savedMessage = metadataPayload?.message || "Q Crash 展示資料已更新。";
      if (coverFile) {
        const form = new FormData();
        form.set("queueId", editing.work.queueId);
        form.set("file", coverFile);
        const coverResponse = await fetch("/api/admin/q-crash", {
          method: "POST",
          headers: await authHeader(),
          body: form,
        });
        const coverPayload = (await coverResponse.json().catch(() => null)) as { message?: string; error?: string } | null;
        if (!coverResponse.ok) throw new Error(coverPayload?.error || "封面更新失敗。");
        savedMessage = `${savedMessage} ${coverPayload?.message || "封面已更新。"}`;
      }
      setMessage(savedMessage);
      setEditing(null);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Q Crash 展示資料儲存失敗。");
    } finally {
      setBusy(false);
    }
  }

  if (adminState === "checking") {
    return <main className="min-h-screen bg-[#050505] px-5 py-10 text-sm font-black text-zinc-400">檢查 Q Crash 後台權限中...</main>;
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-[1.2rem] border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200/75">AIPOGER ADMIN · Q CRASH</p>
          <h1 className="mt-3 text-4xl font-black">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">Q Crash 編輯只開放 owner 帳號使用。</p>
          <Link href="/auth?next=%2Fadmin%2Fq-crash&owner=1" className="mt-5 inline-flex rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-black">前往登入</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 pb-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200/75">AIPOGER OWNER DESK · Q CRASH</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">Q Crash 編輯</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-zinc-400">只編輯結果展示資料：封面與結果公布後的完整版連結。Drop、投票、勝負與戰績永遠鎖定。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200 hover:border-white/30 hover:text-white"><ArrowLeft size={14} />後台總覽</Link>
            <Link href="/battle/results?lang=zh" className="inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100 hover:border-cyan-100/60">查看對戰記錄 <ExternalLink size={14} /></Link>
            <button type="button" onClick={() => void loadData()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200 hover:border-white/30 disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />重新整理</button>
          </div>
        </header>

        <section className="mt-5 rounded-[1.35rem] border border-cyan-300/25 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.14),transparent_32%),rgba(0,9,12,0.72)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">EDITORIAL ONLY</p>
              <p className="mt-1 text-sm font-bold text-cyan-50/75">投票中的場次會鎖住；正式結果可以補封面與完整版連結。完整版連結只會在正式結果頁出現。</p>
            </div>
            <div className="rounded-xl border border-cyan-200/20 bg-black/35 px-4 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Q CRASH CARDS</p>
              <p className="mt-1 text-2xl font-black text-cyan-100">{cards.length}</p>
            </div>
          </div>
        </section>

        {!schemaReady ? <div className="mt-4 rounded-xl border border-yellow-200/30 bg-yellow-300/[0.08] px-4 py-3 text-sm font-bold text-yellow-100">資料庫尚未啟用 Q Crash 編輯資料表，請先套用對應 migration。</div> : null}
        {error ? <div className="mt-4 rounded-xl border border-red-200/30 bg-red-500/[0.08] px-4 py-3 text-sm font-bold text-red-100">{error}</div> : null}
        {message ? <div className="mt-4 rounded-xl border border-emerald-200/25 bg-emerald-500/[0.08] px-4 py-3 text-sm font-bold text-emerald-100">{message}</div> : null}

        <section className="mt-5 flex flex-wrap items-center gap-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋歌名、創作者或類型" className="h-11 min-w-64 flex-1 rounded-xl border border-white/12 bg-black/55 px-4 text-sm font-bold text-white outline-none focus:border-cyan-200/65" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-white/12 bg-black/70 px-3 text-sm font-black text-zinc-200 outline-none focus:border-cyan-200/65">
            <option value="all">全部狀態</option>
            <option value="q_crash_finished">正式結果</option>
            <option value="q_crash_voting">投票進行中</option>
            <option value="q_crash_pending_invite">等待第二首</option>
            <option value="q_crash_insufficient">觀眾不足</option>
            <option value="q_crash_cancelled">已取消</option>
          </select>
          <span className="text-xs font-black text-zinc-500">顯示 {filteredCards.length} 場</span>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          {filteredCards.map((card) => (
            <article key={card.id} className={`overflow-hidden rounded-[1.4rem] border bg-black/50 ${card.status === "q_crash_finished" ? "border-cyan-300/28" : "border-white/10"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-cyan-100">Q CRASH</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${card.status === "q_crash_finished" ? "border-yellow-200/35 bg-yellow-300/10 text-yellow-100" : card.status === "q_crash_voting" ? "border-orange-200/35 bg-orange-400/10 text-orange-100" : "border-white/12 bg-white/[0.04] text-zinc-400"}`}>{statusText(card.status)}</span>
                    {card.winner ? <span className="text-[10px] font-black text-yellow-100">勝出：{card.winner === "fighter_a" ? "A" : "B"}</span> : null}
                  </div>
                  <p className="mt-2 text-xs font-bold text-zinc-500">建立 {formatDate(card.createdAt)} {card.battleId ? `· ${card.battleId.slice(0, 8)}` : "· 尚未配對"}</p>
                </div>
                {!card.editable ? <span className="inline-flex items-center gap-1.5 text-xs font-black text-zinc-500"><LockKeyhole size={14} />{card.status === "q_crash_voting" ? "投票中鎖定" : "不可公開編輯"}</span> : null}
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                {[card.works.A, card.works.B].filter((work): work is QCrashWork => Boolean(work)).map((work) => (
                  <div key={work.queueId ?? work.side} className={`overflow-hidden rounded-2xl border ${work.side === "A" ? "border-orange-200/20 bg-orange-300/[0.04]" : "border-cyan-200/20 bg-cyan-300/[0.04]"}`}>
                    <div className="relative aspect-square bg-zinc-950">
                      {work.coverUrl ? <img src={work.coverUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl font-black text-zinc-700">{work.side}</div>}
                      <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-black text-black ${work.side === "A" ? "bg-orange-400" : "bg-cyan-300"}`}>WORK {work.side}</span>
                    </div>
                    <div className="p-3">
                      <h2 className="line-clamp-2 min-h-10 text-sm font-black text-white">{work.songName}</h2>
                      <p className="mt-1 truncate text-xs font-bold text-zinc-300">{work.creatorName}</p>
                      <p className="mt-1 truncate text-[11px] font-bold text-zinc-500">{work.genre} · {work.aiTool}</p>
                      <p className="mt-2 truncate text-[11px] font-bold text-zinc-500">{work.fullSongUrl ? "已有完整版連結" : "尚未補完整版連結"}</p>
                      <button type="button" disabled={!card.editable || !work.queueId} onClick={() => openEditor(card, work)} className={`mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-35 ${work.side === "A" ? "bg-orange-400 text-black hover:bg-orange-300" : "bg-cyan-300 text-black hover:bg-cyan-200"}`}>
                        {card.editable ? <><ImagePlus size={15} />編輯作品展示</> : <><LockKeyhole size={14} />展示資料已鎖定</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
          {!loading && filteredCards.length === 0 ? <div className="lg:col-span-2 rounded-[1.4rem] border border-white/10 bg-black/45 px-5 py-16 text-center text-sm font-bold text-zinc-500">目前沒有符合條件的 Q Crash。</div> : null}
        </section>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="編輯 Q Crash 展示資料">
          <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-[1.6rem] border border-cyan-200/25 bg-[#071012] p-5 shadow-2xl sm:rounded-[1.6rem] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[10px] font-black tracking-[0.28em] ${editing.work.side === "A" ? "text-orange-300" : "text-cyan-300"}`}>WORK {editing.work.side} · EDITORIAL</p>
                <h2 className="mt-2 text-2xl font-black text-white">{editing.work.songName}</h2>
                <p className="mt-1 text-sm font-bold text-zinc-400">{editing.work.creatorName} · {statusText(editing.card.status)}</p>
              </div>
              <button type="button" onClick={closeEditor} disabled={busy} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-zinc-400 hover:text-white disabled:opacity-40" aria-label="關閉編輯"><X size={18} /></button>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-[190px_1fr]">
              <div>
                <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/12 bg-black">
                  {coverPreview ? <img src={coverPreview} alt="封面預覽" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-5xl font-black text-zinc-700">{editing.work.side}</div>}
                  <span className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/75 px-2 py-1 text-[10px] font-black text-white">預覽</span>
                </div>
                <label className="mt-3 flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-cyan-200/35 bg-cyan-300/10 px-3 text-xs font-black text-cyan-100 hover:bg-cyan-300/16">
                  <ImagePlus size={15} />
                  {coverFile ? "更換檔案" : "上傳新封面"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { onCoverChange(event.target.files?.[0] ?? null); event.target.value = ""; }} />
                </label>
                {editing.work.editorialCoverPath || coverFile ? <button type="button" disabled={busy} onClick={() => { setCoverFile(null); setCoverPreview(editing.work.originalCoverUrl ?? ""); setRemoveCover(true); }} className="mt-2 w-full text-xs font-black text-zinc-500 hover:text-red-200 disabled:opacity-40">移除自訂封面，恢復原始封面</button> : null}
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-black text-cyan-100">完整版本連結（選填）</label>
                <input value={fullSongUrl} onChange={(event) => setFullSongUrl(event.target.value)} placeholder="https://..." inputMode="url" className="mt-2 h-12 w-full rounded-xl border border-white/12 bg-black/55 px-4 text-sm font-bold text-white outline-none focus:border-cyan-200/65" />
                <p className="mt-2 text-xs font-bold leading-5 text-zinc-500">只接受 HTTPS 外部連結，例如 YouTube、SoundCloud、Spotify 或 Suno。投票期間不會顯示，結果公布後才會出現「聽完整版本」。</p>
                {fullSongUrl.trim() ? <a href={fullSongUrl.trim()} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-black text-yellow-100 hover:text-yellow-50"><ExternalLink size={14} />測試目前連結</a> : null}

                <div className="mt-5 rounded-xl border border-yellow-200/15 bg-yellow-300/[0.045] p-3 text-xs font-bold leading-5 text-yellow-50/70">
                  這裡只改展示層，不會改 Drop 音檔、投票、五項評分、勝負、觀眾人數或 Battle 戰績。每次儲存都會留下 owner 編輯紀錄。
                </div>
              </div>
            </div>

            {error ? <p className="mt-4 rounded-xl border border-red-200/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">{error}</p> : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeEditor} disabled={busy} className="min-h-11 rounded-xl border border-white/12 px-5 text-sm font-black text-zinc-300 hover:border-white/30 disabled:opacity-40">取消</button>
              <button type="button" onClick={() => void saveWork()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-black hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{busy ? "儲存中…" : "儲存展示資料"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
