"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfileBattleCountBadgeProps = {
  userId: string | null;
  currentUserId?: string | null;
  lang?: "zh" | "en";
};

const ACTIVE_STATUSES = ["live", "pending"] as const;
const HISTORY_STATUSES = [
  "finished",
  "cancelled",
  "cancelled_no_challenger",
  "cancelled_founder",
  "active",
  "completed",
  "expired",
  "ghost_battle",
  "public_voting",
] as const;
const COUNTED_STATUSES = [...ACTIVE_STATUSES, ...HISTORY_STATUSES] as const;

type BattleStatus = (typeof ACTIVE_STATUSES)[number] | (typeof HISTORY_STATUSES)[number];

type BattleRow = {
  id: string;
  status: BattleStatus | string | null;
  created_at: string | null;
  scheduled_start_at: string | null;
  fighter_a_user_id: string | null;
  fighter_b_user_id: string | null;
  fighter_a_name: string | null;
  fighter_b_name: string | null;
  song_a_name: string | null;
  song_b_name: string | null;
  genre: string | null;
};

const text = {
  zh: {
    active: "進行中",
    history: "歷史",
    loading: "讀取決鬥中",
    loadFailed: "決鬥紀錄讀取失敗",
    noActive: "目前沒有進行中的決鬥",
    noHistory: "還沒有歷史決鬥",
    cancel: "取消挑戰",
    cancelling: "取消中",
    cancelConfirm: "確定要取消這場挑戰？取消後無法恢復。",
    cancelFailed: "取消挑戰失敗，請稍後再試。",
    needLogin: "請先登入再取消挑戰。",
    waiting: "等待挑戰者",
    unknown: "未知對手",
    withOpponent: (name: string) => `與 @${name} 的 90s Drop`,
    startsAt: (value: string) => `${value} 開戰`,
    createdAt: (value: string) => value,
    tooltip: (total: number, active: number) => `總決鬥 ${total} 場，進行中 ${active} 場`,
  },
  en: {
    active: "Active",
    history: "History",
    loading: "Loading battles",
    loadFailed: "Could not load battles",
    noActive: "No active battles",
    noHistory: "No battle history yet",
    cancel: "Cancel challenge",
    cancelling: "Cancelling",
    cancelConfirm: "Cancel this challenge? This cannot be undone.",
    cancelFailed: "Could not cancel this challenge. Please try again later.",
    needLogin: "Please sign in before cancelling a challenge.",
    waiting: "Waiting challenger",
    unknown: "Unknown opponent",
    withOpponent: (name: string) => `90s Drop with @${name}`,
    startsAt: (value: string) => `Starts ${value}`,
    createdAt: (value: string) => value,
    tooltip: (total: number, active: number) => `Total battles ${total}, active ${active}`,
  },
};

function isActiveStatus(status: string | null): boolean {
  return ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number]);
}

function isHistoryStatus(status: string | null): boolean {
  return HISTORY_STATUSES.includes(status as (typeof HISTORY_STATUSES)[number]);
}

function formatDateTime(value: string | null, lang: "zh" | "en"): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en-US", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getOpponentName(battle: BattleRow, userId: string, lang: "zh" | "en"): string {
  const isFounder = battle.fighter_a_user_id === userId;
  const opponentName = isFounder ? battle.fighter_b_name : battle.fighter_a_name;
  if (opponentName?.trim()) return opponentName.trim();
  return isFounder && !battle.fighter_b_user_id ? text[lang].waiting : text[lang].unknown;
}

function getTrackName(battle: BattleRow, userId: string): string | null {
  const isFounder = battle.fighter_a_user_id === userId;
  return (isFounder ? battle.song_a_name : battle.song_b_name)?.trim() || null;
}

export function ProfileBattleCountBadge({ userId, currentUserId = null, lang = "zh" }: ProfileBattleCountBadgeProps) {
  const copy = text[lang];
  const [open, setOpen] = useState(false);
  const [battles, setBattles] = useState<BattleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBattles = useCallback(async () => {
    if (!userId) {
      setBattles([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("battles")
        .select(
          "id,status,created_at,scheduled_start_at,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,genre",
        )
        .or(`fighter_a_user_id.eq.${userId},fighter_b_user_id.eq.${userId}`)
        .in("status", [...COUNTED_STATUSES])
        .order("created_at", { ascending: false })
        .returns<BattleRow[]>();

      if (queryError) throw queryError;
      setBattles(data ?? []);
    } catch (loadError) {
      console.error(loadError);
      setError(copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, userId]);

  useEffect(() => {
    void loadBattles();
  }, [loadBattles]);

  const activeBattles = useMemo(() => battles.filter((battle) => isActiveStatus(battle.status)), [battles]);
  const historyBattles = useMemo(() => battles.filter((battle) => isHistoryStatus(battle.status)), [battles]);
  const totalCount = battles.length;
  const activeCount = activeBattles.length;

  const cancelChallenge = async (battleId: string) => {
    if (!window.confirm(copy.cancelConfirm)) return;
    setCancellingId(battleId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert(copy.needLogin);
        return;
      }

      const response = await fetch("/api/battle-pool/cancel-founder-challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ battleId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? copy.cancelFailed);
      }

      setBattles((current) =>
        current.map((battle) => (battle.id === battleId ? { ...battle, status: "cancelled_founder" } : battle)),
      );
      void loadBattles();
    } catch (cancelError) {
      console.error(cancelError);
      alert(cancelError instanceof Error ? cancelError.message : copy.cancelFailed);
    } finally {
      setCancellingId(null);
    }
  };

  const renderBattleRow = (battle: BattleRow) => {
    const opponentName = userId ? getOpponentName(battle, userId, lang) : copy.unknown;
    const trackName = userId ? getTrackName(battle, userId) : null;
    const startsAt = formatDateTime(battle.scheduled_start_at, lang);
    const createdAt = formatDateTime(battle.created_at, lang);
    const canCancel = currentUserId === battle.fighter_a_user_id && !battle.fighter_b_user_id && battle.status === "pending";
    const isCancelling = cancellingId === battle.id;

    return (
      <li key={battle.id} className="rounded-2xl border border-zinc-800/80 bg-black/25 px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/battle/${battle.id}`} className="min-w-0 flex-1 text-left transition hover:text-orange-200">
            <p className="truncate text-xs font-semibold text-zinc-100">{copy.withOpponent(opponentName)}</p>
            <p className="mt-1 truncate text-[11px] text-zinc-500">
              {trackName ? `${trackName} · ` : ""}
              {startsAt ? copy.startsAt(startsAt) : createdAt ? copy.createdAt(createdAt) : battle.status}
            </p>
          </Link>
          {canCancel ? (
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => void cancelChallenge(battle.id)}
              className="shrink-0 rounded-full border border-red-400/60 px-2.5 py-1 text-[11px] font-semibold text-red-300 transition hover:border-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCancelling ? copy.cancelling : copy.cancel}
            </button>
          ) : null}
        </div>
      </li>
    );
  };

  if (!userId) return null;

  return (
    <div className="w-full max-w-xs text-left sm:w-64">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        title={copy.tooltip(totalCount, activeCount)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-orange-400/40 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-100 shadow-[0_0_24px_rgba(249,115,22,0.12)] transition hover:border-orange-300/70 hover:bg-orange-500/15"
      >
        <span className="flex items-center gap-3">
          <span>⚔️ {totalCount}</span>
          <span className="text-cyan-200">⚡ {activeCount}</span>
        </span>
        <span className="text-[10px] text-orange-200">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="mt-3 max-h-80 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-2xl">
          {loading ? <p className="py-3 text-center text-xs text-zinc-500">{copy.loading}</p> : null}
          {error ? <p className="py-3 text-center text-xs text-red-300">{error}</p> : null}
          {!loading && !error ? (
            <div className="space-y-4">
              <section>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-200">
                  <span className="h-px flex-1 bg-cyan-400/20" />
                  <span>
                    {copy.active} ({activeCount})
                  </span>
                  <span className="h-px flex-1 bg-cyan-400/20" />
                </div>
                {activeBattles.length > 0 ? (
                  <ul className="space-y-2">{activeBattles.map(renderBattleRow)}</ul>
                ) : (
                  <p className="rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-3 text-center text-xs text-zinc-500">
                    {copy.noActive}
                  </p>
                )}
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <span className="h-px flex-1 bg-zinc-700/60" />
                  <span>
                    {copy.history} ({historyBattles.length})
                  </span>
                  <span className="h-px flex-1 bg-zinc-700/60" />
                </div>
                {historyBattles.length > 0 ? (
                  <ul className="space-y-2">{historyBattles.map(renderBattleRow)}</ul>
                ) : (
                  <p className="rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-3 text-center text-xs text-zinc-500">
                    {copy.noHistory}
                  </p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
