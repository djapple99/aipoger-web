"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cancelCurrentBattleIntent, resolveDropBattleScheduledStart } from "@/lib/battle-pool-client";
import { supabase } from "@/lib/supabase";

type ProfileBattleCountBadgeProps = {
  userId: string | null;
  currentUserId?: string | null;
  lang?: "zh" | "en";
};

const ACTIVE_STATUSES = ["live", "pending", "active", "matched"] as const;
const HISTORY_STATUSES = [
  "finished",
  "cancelled",
  "cancelled_no_challenger",
  "cancelled_founder",
  "completed",
  "expired",
  "ghost_battle",
  "public_voting",
] as const;
const COUNTED_STATUSES = [...ACTIVE_STATUSES, ...HISTORY_STATUSES] as const;
const ACTIVE_QUEUE_STATUSES = ["pending", "searching", "waiting", "waiting_challenge", "matched", "active"] as const;
const UNCANCELLABLE_BATTLE_STATUSES = new Set(["finished", "cancelled", "cancelled_no_challenger", "cancelled_founder", "completed", "expired"]);
const CLOSED_BATTLE_STATUSES = new Set(["finished", "cancelled", "cancelled_no_challenger", "cancelled_founder", "completed", "expired"]);

type BattleStatus = (typeof ACTIVE_STATUSES)[number] | (typeof HISTORY_STATUSES)[number];

type BattleRow = {
  id: string;
  status: BattleStatus | string | null;
  created_at: string | null;
  battle_ended_at: string | null;
  scheduled_start_at: string | null;
  fighter_a_user_id: string | null;
  fighter_b_user_id: string | null;
  fighter_a_name: string | null;
  fighter_b_name: string | null;
  song_a_name: string | null;
  song_b_name: string | null;
  genre: string | null;
};

type QueueRow = {
  id: string;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;
  scheduled_start_at: string | null;
  cancellation_evaluation_at: string | null;
  match_group_id: string | null;
  fighter_name: string | null;
  original_file_name: string | null;
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
    cancelQueue: "取消戰帖",
    cancelling: "取消中",
    cancelConfirm: "確定要取消這場挑戰？取消後無法恢復。",
    cancelQueueConfirm: "確定要取消目前這張 Drop Battle 戰帖卡？",
    cancelFailed: "取消挑戰失敗，請稍後再試。",
    needLogin: "請先登入再取消挑戰。",
    enter: "進入",
    view: "查看",
    queueTitle: "尚未成局的 Drop Battle 戰帖卡",
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
    cancelQueue: "Cancel card",
    cancelling: "Cancelling",
    cancelConfirm: "Cancel this challenge? This cannot be undone.",
    cancelQueueConfirm: "Cancel this Drop Battle challenge card?",
    cancelFailed: "Could not cancel this challenge. Please try again later.",
    needLogin: "Please sign in before cancelling a challenge.",
    enter: "Enter",
    view: "View",
    queueTitle: "Open Drop Battle challenge card",
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

function isBattleClosed(battle: Pick<BattleRow, "status" | "battle_ended_at">): boolean {
  return Boolean(battle.battle_ended_at) || CLOSED_BATTLE_STATUSES.has(battle.status ?? "");
}

function isActiveBattle(battle: BattleRow): boolean {
  return isActiveStatus(battle.status) && !isBattleClosed(battle);
}

function isHistoryBattle(battle: BattleRow): boolean {
  return isHistoryStatus(battle.status) || Boolean(battle.battle_ended_at);
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
  const [queueRows, setQueueRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadBattles = useCallback(async () => {
    if (!userId) {
      setBattles([]);
      setQueueRows([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const battleQuery = supabase
        .from("battles")
        .select(
          "id,status,created_at,battle_ended_at,scheduled_start_at,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,genre",
        )
        .or(`fighter_a_user_id.eq.${userId},fighter_b_user_id.eq.${userId}`)
        .in("status", [...COUNTED_STATUSES])
        .order("created_at", { ascending: false })
        .returns<BattleRow[]>();

      const queueQuery =
        currentUserId === userId
          ? supabase
              .from("battle_queue")
              .select("id,status,created_at,expires_at,scheduled_start_at,cancellation_evaluation_at,match_group_id,fighter_name,original_file_name,genre")
              .eq("user_id", userId)
              .in("status", [...ACTIVE_QUEUE_STATUSES])
              .order("created_at", { ascending: false })
              .returns<QueueRow[]>()
          : Promise.resolve({ data: [] as QueueRow[], error: null });

      const [{ data, error: queryError }, { data: queues, error: queueError }] = await Promise.all([battleQuery, queueQuery]);
      if (queryError) throw queryError;
      if (queueError) throw queueError;
      const battleRows = data ?? [];
      setBattles(battleRows);
      setQueueRows(
        (queues ?? []).filter((row) => {
          if (!ACTIVE_QUEUE_STATUSES.includes(row.status as (typeof ACTIVE_QUEUE_STATUSES)[number])) return false;
          if (!row.match_group_id) return true;
          const linkedBattle = battleRows.find((battle) => battle.id === row.match_group_id);
          if (!linkedBattle) return true;
          return !isBattleClosed(linkedBattle) && !isActiveBattle(linkedBattle);
        }),
      );
    } catch (loadError) {
      console.error(loadError);
      setError(copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.loadFailed, currentUserId, userId]);

  useEffect(() => {
    void loadBattles();
  }, [loadBattles]);

  const activeBattles = useMemo(() => battles.filter(isActiveBattle), [battles]);
  const activeQueues = useMemo(() => queueRows.filter((row) => ACTIVE_QUEUE_STATUSES.includes(row.status as (typeof ACTIVE_QUEUE_STATUSES)[number])), [queueRows]);
  const historyBattles = useMemo(() => battles.filter(isHistoryBattle), [battles]);
  const totalCount = battles.length + activeQueues.length;
  const activeCount = activeBattles.length + activeQueues.length;

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

  const cancelQueue = async () => {
    if (!window.confirm(copy.cancelQueueConfirm)) return;
    setCancellingId("queue");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert(copy.needLogin);
        return;
      }
      await cancelCurrentBattleIntent({ accessToken: token });
      setQueueRows([]);
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
    const canCancel =
      currentUserId === battle.fighter_a_user_id &&
      !battle.fighter_b_user_id &&
      !UNCANCELLABLE_BATTLE_STATUSES.has(battle.status ?? "");
    const isCancelling = cancellingId === battle.id;

    return (
      <li key={battle.id} className="rounded-2xl border border-zinc-800/80 bg-black/25 px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-zinc-100">{copy.withOpponent(opponentName)}</p>
            <p className="mt-1 truncate text-[11px] text-zinc-500">
              {trackName ? `${trackName} · ` : ""}
              {startsAt ? copy.startsAt(startsAt) : createdAt ? copy.createdAt(createdAt) : battle.status}
            </p>
          </div>
          <Link
            href={`/battle/${battle.id}`}
            className="shrink-0 rounded-full border border-zinc-600/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 transition hover:border-orange-300/70 hover:text-orange-100"
          >
            {copy.enter}
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

  const renderQueueRow = (row: QueueRow) => {
    const scheduledAt = formatDateTime(resolveDropBattleScheduledStart(row), lang);
    const createdAt = formatDateTime(row.created_at, lang);
    const isCancelling = cancellingId === "queue";

    return (
      <li key={row.id} className="rounded-2xl border border-orange-300/25 bg-orange-500/10 px-3 py-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-orange-50">{copy.queueTitle}</p>
            <p className="mt-1 truncate text-[11px] text-orange-100/65">
              {row.original_file_name?.trim() ? `${row.original_file_name.trim()} · ` : ""}
              {scheduledAt ? copy.startsAt(scheduledAt) : createdAt ? copy.createdAt(createdAt) : row.status}
            </p>
          </div>
          <Link
            href={`/battle/${encodeURIComponent(row.id)}?lang=${lang}`}
            className="shrink-0 rounded-full border border-zinc-600/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 transition hover:border-orange-300/70 hover:text-orange-100"
          >
            {copy.view}
          </Link>
          <button
            type="button"
            disabled={isCancelling}
            onClick={() => void cancelQueue()}
            className="shrink-0 rounded-full border border-red-400/60 px-2.5 py-1 text-[11px] font-semibold text-red-300 transition hover:border-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCancelling ? copy.cancelling : copy.cancelQueue}
          </button>
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
                {activeCount > 0 ? (
                  <ul className="space-y-2">
                    {activeQueues.map(renderQueueRow)}
                    {activeBattles.map(renderBattleRow)}
                  </ul>
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
