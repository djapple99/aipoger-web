"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import LangToggle from "@/components/lang-toggle";
import { supabase } from "@/lib/supabase";
import { loadIsAdmin } from "@/lib/user-profile-admin";

type AdminState = "checking" | "login" | "denied" | "ready";

type AdminBattle = {
  id: string;
  queue_a_id?: string | null;
  queue_b_id?: string | null;
  fighter_a_name?: string | null;
  fighter_b_name?: string | null;
  song_a_name?: string | null;
  song_b_name?: string | null;
  status?: string | null;
  genre?: string | null;
  created_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  started_at?: string | null;
  battle_started_at?: string | null;
};

type AdminQueue = {
  id: string;
  fighter_name?: string | null;
  original_file_name?: string | null;
  genre?: string | null;
  status?: string | null;
  match_group_id?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

type AdminPayload = {
  battles?: AdminBattle[];
  queues?: AdminQueue[];
  error?: string;
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

function shortId(value: string) {
  return value.slice(0, 8);
}

function battleStartTime(battle: AdminBattle) {
  return battle.scheduled_start_at ?? battle.battle_started_at ?? battle.started_at ?? battle.created_at ?? null;
}

function queueExpireTime(queue: AdminQueue) {
  return queue.cancellation_evaluation_at ?? queue.scheduled_start_at ?? queue.expires_at ?? queue.created_at ?? null;
}

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export default function AdminBattlesPage() {
  const [adminState, setAdminState] = useState<AdminState>("checking");
  const [battles, setBattles] = useState<AdminBattle[]>([]);
  const [queues, setQueues] = useState<AdminQueue[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    const openQueues = queues.filter((queue) => !queue.match_group_id).length;
    const matchedQueues = queues.filter((queue) => queue.match_group_id).length;
    return { activeBattles: battles.length, openQueues, matchedQueues };
  }, [battles, queues]);

  const loadData = useCallback(async () => {
    setError("");
    const response = await fetch("/api/admin/battles", {
      headers: await authHeader(),
    });
    const payload = (await response.json().catch(() => null)) as AdminPayload | null;
    if (!response.ok) {
      setError(payload?.error || "Battle 後台資料讀取失敗。");
      return;
    }
    setBattles(payload?.battles ?? []);
    setQueues(payload?.queues ?? []);
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
    return () => {
      mounted = false;
    };
  }, [loadData]);

  async function cancelTarget(params: { battleId?: string; queueId?: string; label: string }) {
    const ok = window.confirm(`確定取消 ${params.label}？這會同步關閉 battle / queue 並通知使用者。`);
    if (!ok) return;

    setBusyId(params.battleId ?? params.queueId ?? "cancel");
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/battles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({
        battleId: params.battleId ?? null,
        queueId: params.queueId ?? null,
        note: "這場 Drop Battle 已由 AIPOGER 後台取消。",
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; cancelledBattles?: number; cancelledQueues?: number } | null;
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error || "取消失敗。");
      return;
    }
    setMessage(`已取消：battle ${payload?.cancelledBattles ?? 0}，queue ${payload?.cancelledQueues ?? 0}。`);
    await loadData();
  }

  async function cleanupExpired() {
    setBusyId("cleanup");
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/battles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
      },
      body: JSON.stringify({ action: "cleanup_expired" }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; poolProcessed?: number; cancelledBattles?: number } | null;
    setBusyId(null);
    if (!response.ok) {
      setError(payload?.error || "清理失敗。");
      return;
    }
    setMessage(`已清理：pool ${payload?.poolProcessed ?? 0}，自動取消 ${payload?.cancelledBattles ?? 0}。`);
    await loadData();
  }

  if (adminState === "checking") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <p className="text-sm font-black text-zinc-400">檢查 Battle 後台權限中...</p>
      </main>
    );
  }

  if (adminState === "login" || adminState === "denied") {
    return (
      <main className="min-h-screen bg-[#050505] px-5 py-10 text-white">
        <section className="mx-auto max-w-2xl rounded-[1.2rem] border border-white/10 bg-black/60 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-200/75">AIPOGER ADMIN</p>
          <h1 className="mt-3 text-4xl font-black text-white">{adminState === "login" ? "請先登入" : "沒有管理權限"}</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">Battle 後台只允許 owner 帳號進入。</p>
          <Link href="/auth" className="mt-5 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-black">
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
            <h1 className="mt-2 text-4xl font-black text-white">Battle 管理</h1>
            <p className="mt-2 text-sm font-bold text-zinc-400">取消排錯場、清公開戰帖、檢查仍在佔用名額的 Drop Battle。</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/admin/moderation" className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-200">
              檢舉管理
            </Link>
            <Link href="/admin/listen-bar" className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
              酒吧後台
            </Link>
            <Link href="/admin/quiz" className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
              測驗後台
            </Link>
            <Link href="/battle?lang=zh" className="rounded-full border border-orange-200/25 bg-orange-500/10 px-4 py-2 text-xs font-black text-orange-100">
              鬥歌池
            </Link>
            <LangToggle variant="inline" />
          </nav>
        </header>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["進行中 Battle", stats.activeBattles],
            ["公開戰帖", stats.openQueues],
            ["已配對 Queue", stats.matchedQueues],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-4">
              <p className="text-xs font-black text-zinc-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busyId === "cleanup"}
            onClick={() => void cleanupExpired()}
            className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100"
          >
            {busyId === "cleanup" ? "清理中" : "清理過期"}
          </button>
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

        <section className="mt-5">
          <h2 className="text-lg font-black text-white">Battle</h2>
          <div className="mt-3 grid gap-3">
            {battles.length === 0 ? (
              <p className="rounded-[1.1rem] border border-white/10 bg-white/[0.035] px-5 py-8 text-center text-sm font-bold text-zinc-500">
                目前沒有進行中 battle。
              </p>
            ) : battles.map((battle) => (
              <article key={battle.id} className="rounded-[1.1rem] border border-white/10 bg-black/56 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-orange-200/25 bg-orange-500/10 px-2.5 py-1 text-[11px] font-black text-orange-100">
                        {battle.status || "-"}
                      </span>
                      <span className="text-[11px] font-bold tabular-nums text-zinc-500">#{shortId(battle.id)}</span>
                      <span className="text-[11px] font-bold text-zinc-500">{formatTime(battleStartTime(battle))}</span>
                    </div>
                    <h3 className="mt-3 break-words text-2xl font-black text-white">
                      {battle.fighter_a_name || "未命名鬥士"} <span className="text-orange-300">vs</span> {battle.fighter_b_name || "等待挑戰"}
                    </h3>
                    <p className="mt-2 break-words text-sm font-bold leading-6 text-zinc-300">
                      {battle.song_a_name || "未命名作品"} / {battle.song_b_name || "等待作品"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-zinc-500">
                      {battle.genre || "未標示風格"} · queue {shortId(battle.queue_a_id || "-")} / {shortId(battle.queue_b_id || "-")}
                    </p>
                  </div>
                  <div className="flex min-w-[12rem] flex-wrap items-start justify-end gap-2">
                    <Link href={`/battle/${battle.id}?lang=zh`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200">
                      進場
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === battle.id}
                      onClick={() => void cancelTarget({ battleId: battle.id, label: `${battle.fighter_a_name || "A"} vs ${battle.fighter_b_name || "B"}` })}
                      className="rounded-full border border-red-200/35 bg-red-500/12 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-45"
                    >
                      {busyId === battle.id ? "取消中" : "取消 Battle"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-black text-white">Queue</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {queues.length === 0 ? (
              <p className="rounded-[1.1rem] border border-white/10 bg-white/[0.035] px-5 py-8 text-center text-sm font-bold text-zinc-500 md:col-span-2">
                目前沒有佔用中的 queue。
              </p>
            ) : queues.map((queue) => (
              <article key={queue.id} className="rounded-[1.1rem] border border-white/10 bg-black/56 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                    {queue.status || "-"}
                  </span>
                  <span className="text-[11px] font-bold tabular-nums text-zinc-500">#{shortId(queue.id)}</span>
                  <span className="text-[11px] font-bold text-zinc-500">{formatTime(queueExpireTime(queue))}</span>
                </div>
                <h3 className="mt-3 break-words text-xl font-black text-white">{queue.fighter_name || "未命名鬥士"}</h3>
                <p className="mt-2 break-words text-sm font-bold leading-6 text-zinc-300">{queue.original_file_name || "未命名作品"}</p>
                <p className="mt-1 text-xs font-bold text-zinc-500">
                  {queue.genre || "未標示風格"} · {queue.match_group_id ? `battle #${shortId(queue.match_group_id)}` : "公開挑戰池"}
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {queue.match_group_id ? (
                    <Link href={`/battle/${queue.match_group_id}?lang=zh`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200">
                      進場
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === queue.id}
                    onClick={() => void cancelTarget({ queueId: queue.id, label: queue.original_file_name || queue.id })}
                    className="rounded-full border border-red-200/35 bg-red-500/12 px-3 py-2 text-xs font-black text-red-100 disabled:opacity-45"
                  >
                    {busyId === queue.id ? "取消中" : "取消 Queue"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
