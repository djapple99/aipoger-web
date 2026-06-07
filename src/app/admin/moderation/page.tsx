"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadIsAdmin } from "@/lib/user-profile-admin";
import { supabase } from "@/lib/supabase";

type AdminState = "checking" | "login" | "denied" | "ready";
type ReportStatus = "open" | "reviewing" | "resolved" | "rejected";
type ReportPriority = "low" | "normal" | "high" | "urgent";

type ContentReport = {
  id: string;
  target_type: string;
  target_id: string;
  target_title: string | null;
  target_url: string | null;
  reason: string;
  description: string | null;
  evidence_url: string | null;
  contact_email: string | null;
  context: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  action_taken: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

type ModerationTrack = {
  id: string;
  title: string | null;
  artist: string | null;
  source: string | null;
  bar_phase?: string | null;
  is_active: boolean | null;
  review_status?: string | null;
  moderation_note?: string | null;
  created_by: string | null;
  created_at?: string | null;
  promoted_at?: string | null;
  hidden_at?: string | null;
  removed_at?: string | null;
  positive_reaction_count?: number | null;
  audio_url?: string | null;
};

type AdminPayload = {
  reports?: ContentReport[];
  tracks?: ModerationTrack[];
  error?: string;
};

const statusLabel: Record<ReportStatus, string> = {
  open: "待處理",
  reviewing: "審查中",
  resolved: "已處理",
  rejected: "駁回",
};

const reasonLabel: Record<string, string> = {
  copyright: "版權 / 採樣",
  unauthorized_voice_or_sample: "未授權聲音",
  impersonation: "冒名",
  scam_or_suspicious_payment: "收款異常",
  illegal_or_harmful: "違法 / 有害",
  privacy_or_harassment: "個資 / 騷擾",
  spam: "垃圾內容",
  other: "其他",
};

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export default function AdminModerationPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [tracks, setTracks] = useState<ModerationTrack[]>([]);
  const [activeTab, setActiveTab] = useState<"reports" | "tracks">("reports");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const openReports = reports.filter((report) => report.status === "open" || report.status === "reviewing").length;
    const hiddenTracks = tracks.filter((track) => track.is_active === false || track.review_status === "hidden" || track.review_status === "removed").length;
    const visibleTracks = tracks.filter((track) => track.is_active !== false && track.review_status !== "hidden" && track.review_status !== "removed").length;
    return { openReports, hiddenTracks, visibleTracks };
  }, [reports, tracks]);

  async function loadData() {
    setError("");
    const response = await fetch("/api/admin/content-reports", {
      headers: await authHeader(),
    });
    const payload = (await response.json().catch(() => null)) as AdminPayload | null;
    if (!response.ok) {
      setError(payload?.error || "後台資料讀取失敗。");
      return;
    }
    setReports(payload?.reports ?? []);
    setTracks(payload?.tracks ?? []);
  }

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
    return () => {
      mounted = false;
    };
  }, []);

  async function runAction(params: {
    action: "set_status" | "hide_listen_bar_track" | "restore_listen_bar_track";
    reportId?: string;
    targetId?: string;
    status?: ReportStatus;
    adminNote?: string;
  }) {
    setBusyId(params.reportId || params.targetId || params.action);
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/content-reports", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify(params),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error || "後台動作失敗。");
      return;
    }
    setMessage("已更新。");
    await loadData();
  }

  if (adminState === "checking") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <p className="text-sm font-black text-zinc-400">檢查後台權限中...</p>
      </main>
    );
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-[1.4rem] border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/75">AIPOGER ADMIN</p>
          <h1 className="mt-3 text-4xl font-black text-white">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">
            目前後台只允許 owner 帳號進入。
          </p>
          <Link href="/login" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">
            前往登入
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300/80">AIPOGER OWNER ADMIN</p>
            <h1 className="mt-2 text-4xl font-black text-white">檢舉與投稿管理</h1>
            <p className="mt-2 text-sm font-bold text-zinc-400">檢舉、外部收款連結風險、傷心酒吧投稿，都先集中在這裡審。</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link href="/admin/listen-bar" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200">
              酒吧後台
            </Link>
            <Link href="/listen-bar" className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
              傷心酒吧
            </Link>
            <Link href="/" className="rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100">
              回首頁
            </Link>
          </nav>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["待處理檢舉", stats.openReports],
            ["可見投稿", stats.visibleTracks],
            ["已隱藏投稿", stats.hiddenTracks],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-4">
              <p className="text-xs font-black text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 rounded-full border border-white/10 bg-black/50 p-1">
            {[
              ["reports", "檢舉案件"],
              ["tracks", "投稿作品"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as "reports" | "tracks")}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  activeTab === key ? "bg-orange-500 text-black" : "text-zinc-300 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200"
          >
            重新整理
          </button>
        </div>

        {error ? <p className="mt-4 rounded-xl border border-red-300/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{error}</p> : null}
        {message ? <p className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">{message}</p> : null}

        {activeTab === "reports" ? (
          <section className="mt-5 grid gap-3">
            {reports.length === 0 ? (
              <p className="rounded-[1.1rem] border border-white/10 bg-white/[0.035] px-5 py-8 text-center text-sm font-bold text-zinc-500">
                目前沒有檢舉案件。
              </p>
            ) : reports.map((report) => (
              <article key={report.id} className="rounded-[1.1rem] border border-white/10 bg-black/56 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-red-200/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-100">
                        {reasonLabel[report.reason] || report.reason}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-zinc-300">
                        {statusLabel[report.status]}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums text-zinc-500">{formatTime(report.created_at)}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-white">
                      {report.target_title || `${report.target_type} / ${report.target_id}`}
                    </h2>
                    <p className="mt-2 break-words text-sm font-bold leading-6 text-zinc-300">
                      {report.description || "沒有補充說明。"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                      {report.target_url ? <a href={report.target_url} target="_blank" rel="noreferrer" className="text-cyan-100 hover:text-white">開啟目標</a> : null}
                      {report.evidence_url ? <a href={report.evidence_url} target="_blank" rel="noreferrer" className="text-orange-100 hover:text-white">查看證據</a> : null}
                      {report.contact_email ? <a href={`mailto:${report.contact_email}`} className="text-zinc-300 hover:text-white">{report.contact_email}</a> : null}
                    </div>
                  </div>
                  <div className="flex min-w-[13rem] flex-wrap items-start justify-end gap-2">
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void runAction({ action: "set_status", reportId: report.id, status: "reviewing" })}
                      className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100 disabled:opacity-45"
                    >
                      審查中
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void runAction({ action: "set_status", reportId: report.id, status: "resolved" })}
                      className="rounded-full border border-emerald-200/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 disabled:opacity-45"
                    >
                      已處理
                    </button>
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void runAction({ action: "set_status", reportId: report.id, status: "rejected" })}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200 disabled:opacity-45"
                    >
                      駁回
                    </button>
                    {report.target_type === "listen_bar_track" ? (
                      <button
                        type="button"
                        disabled={busyId === report.id}
                        onClick={() => void runAction({
                          action: "hide_listen_bar_track",
                          reportId: report.id,
                          targetId: report.target_id,
                          adminNote: `Report ${report.id}`,
                        })}
                        className="rounded-full border border-red-200/35 bg-red-500/12 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-45"
                      >
                        隱藏作品
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-5 grid gap-3">
            {tracks.length === 0 ? (
              <p className="rounded-[1.1rem] border border-white/10 bg-white/[0.035] px-5 py-8 text-center text-sm font-bold text-zinc-500">
                目前沒有投稿作品。
              </p>
            ) : tracks.map((track) => {
              const hidden = track.is_active === false || track.review_status === "hidden" || track.review_status === "removed";
              return (
                <article key={track.id} className="rounded-[1.1rem] border border-white/10 bg-black/56 p-4">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                          hidden ? "border-red-200/25 bg-red-500/10 text-red-100" : "border-emerald-200/25 bg-emerald-400/10 text-emerald-100"
                        }`}>
                          {hidden ? "已隱藏" : "可見"}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-black text-zinc-300">
                          {track.review_status || "approved"}
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-zinc-500">{formatTime(track.created_at)}</span>
                      </div>
                      <h2 className="mt-3 text-xl font-black text-white">{track.title || "未命名作品"}</h2>
                      <p className="mt-1 text-sm font-bold text-zinc-400">
                        {track.artist || "Unknown"} / {track.bar_phase || "challenger"} / 正向反應 {track.positive_reaction_count ?? 0}
                      </p>
                      {track.moderation_note ? <p className="mt-2 text-xs font-bold text-zinc-500">{track.moderation_note}</p> : null}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {track.audio_url ? (
                        <audio className="h-9 max-w-[13rem] accent-orange-500" controls preload="metadata" src={track.audio_url} />
                      ) : null}
                      {hidden ? (
                        <button
                          type="button"
                          disabled={busyId === track.id}
                          onClick={() => void runAction({ action: "restore_listen_bar_track", targetId: track.id, adminNote: "Owner restored from moderation dashboard." })}
                          className="rounded-full border border-emerald-200/30 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 disabled:opacity-45"
                        >
                          恢復
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === track.id}
                          onClick={() => {
                            if (window.confirm("確定要先隱藏這首投稿？")) {
                              void runAction({ action: "hide_listen_bar_track", targetId: track.id, adminNote: "Owner hidden from moderation dashboard." });
                            }
                          }}
                          className="rounded-full border border-red-200/35 bg-red-500/12 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-45"
                        >
                          隱藏
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
