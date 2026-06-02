"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { getFreshSession } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { cancelCurrentBattleIntent } from "@/lib/battle-pool-client";

type BattleCall = {
  id: string;
  battleId: string;
  queueId?: string | null;
  opponentName: string;
  title: string;
  body: string;
  stakeApc?: number | null;
  potApc?: number | null;
  createdAt: string;
};

type BattleNotificationRow = {
  id: string;
  queue_id?: string | null;
  battle_id?: string | null;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  metadata?: {
    opponentName?: string;
    stakeApc?: number;
    potApc?: number;
    originalFileName?: string | null;
    expiredAt?: string | null;
    dailyBattleId?: string | null;
    dailyEntryId?: string | null;
    winnerEntryId?: string | null;
  } | null;
  read_at?: string | null;
  created_at?: string | null;
};

type ActiveBattleNotice = {
  kind: "queue" | "battle";
  id: string;
  battleId?: string | null;
  status: string;
  createdAt?: string | null;
};

const ACTIVE_NOTICE_QUEUE_STATUSES = [
  "queued",
  "pending",
  "searching",
  "waiting",
  "waiting_challenge",
  "confirming",
  "matched",
  "active",
  "ghost_battle",
  "public_voting",
];
const ACTIVE_NOTICE_BATTLE_STATUSES = [
  "waiting",
  "confirming",
  "matched",
  "countdown",
  "live",
  "active",
  "ghost_battle",
  "public_voting",
  "settling",
];

const FIXED_BATTLE_ROUTES = new Set(["setup", "hook-cut", "matchmaking", "result"]);
const DEMO_CALL_EVENT = "aipoger:battle-call-demo";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M12 4.5a5 5 0 0 0-5 5v2.6c0 .8-.3 1.6-.8 2.2L5 15.8h14l-1.2-1.5a3.5 3.5 0 0 1-.8-2.2V9.5a5 5 0 0 0-5-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.8 18.4a2.4 2.4 0 0 0 4.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SwordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="m14.5 5 4.5-1-1 4.5-8.8 8.8-3.1.8.8-3.1L14.5 5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m12.5 7.2 4.3 4.3M5 19l-2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function toBattleCall(row: BattleNotificationRow, fallbackOpponent: string): BattleCall | null {
  if (row.type !== "battle_matched" || !row.battle_id) return null;

  return {
    id: row.id,
    battleId: row.battle_id,
    queueId: row.queue_id,
    opponentName: row.metadata?.opponentName || fallbackOpponent,
    title: row.title || "找到對手了",
    body: row.body || "請在期限內回來確認參戰。",
    stakeApc: row.metadata?.stakeApc ?? null,
    potApc: row.metadata?.potApc ?? null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export default function GlobalBattleCallOverlay() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [ready, setReady] = useState(false);
  const [call, setCall] = useState<BattleCall | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [pulseKey, setPulseKey] = useState(0);
  const [accessToken, setAccessToken] = useState("");
  const [activeNotice, setActiveNotice] = useState<ActiveBattleNotice | null>(null);
  const [activeNoticeOpen, setActiveNoticeOpen] = useState(false);
  const [activeNoticeBusy, setActiveNoticeBusy] = useState(false);
  const [activeNoticeError, setActiveNoticeError] = useState("");
  const [expiredNotice, setExpiredNotice] = useState<BattleNotificationRow | null>(null);
  const [expiredNoticeOpen, setExpiredNoticeOpen] = useState(true);

  const routeTone = useMemo(() => {
    const seg = pathname?.match(/^\/battle\/([^/]+)$/)?.[1];
    const isArena = Boolean(seg && !FIXED_BATTLE_ROUTES.has(seg));
    const isCreatorFlow = pathname === "/battle/setup" || pathname === "/battle/hook-cut" || pathname === "/battle/matchmaking";
    if (isArena) return "watching";
    if (isCreatorFlow) return "creator";
    return "default";
  }, [pathname]);

  const arenaHref = call ? `/battle/${encodeURIComponent(call.battleId)}?lang=${lang}` : "/battle";

  const markRead = useCallback(async (id: string) => {
    if (id.startsWith("demo-") || isAuthBypassEnabled) return;
    await supabase.from("battle_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const showCall = useCallback(
    (next: BattleCall) => {
      if (pathname?.startsWith(`/battle/${next.battleId}`)) return;
      setExpiredNotice(null);
      setCall(next);
      setAccepted(false);
      setCollapsed(false);
      setSecondsLeft(15);
      setPulseKey((value) => value + 1);
    },
    [pathname],
  );

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;

    const triggerDemo = () => {
      showCall({
        id: `demo-${Date.now()}`,
        battleId: "mock-call-waiting-room",
        queueId: "mock-call-queue",
        opponentName: isZh ? "測試對手" : "Test Rival",
        title: isZh ? "找到對手了" : "Opponent found",
        body: isZh ? "測試對手正在等待確認。" : "Test Rival is waiting for confirmation.",
        stakeApc: 200,
        potApc: 400,
        createdAt: new Date().toISOString(),
      });
    };

    window.addEventListener(DEMO_CALL_EVENT, triggerDemo);
    if (window.location.search.includes("battleCallDemo=1")) triggerDemo();
    return () => window.removeEventListener(DEMO_CALL_EVENT, triggerDemo);
  }, [isZh, ready, showCall]);

  useEffect(() => {
    if (!ready || isAuthBypassEnabled) return undefined;
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const session = await getFreshSession();
      const uid = session?.user?.id;
      if (!mounted || !uid) return;
      setAccessToken(session?.access_token ?? "");

      const { data: activeQueueRows } = await supabase
        .from("battle_queue")
        .select("id, status, match_group_id, expires_at, created_at")
        .eq("user_id", uid)
        .in("status", ACTIVE_NOTICE_QUEUE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1);
      const activeQueue = activeQueueRows?.[0] as { id: string; status: string; match_group_id?: string | null; expires_at?: string | null; created_at?: string | null } | undefined;
      const activeQueueExpired =
        Boolean(activeQueue?.expires_at) &&
        Number.isFinite(new Date(activeQueue?.expires_at ?? "").getTime()) &&
        new Date(activeQueue?.expires_at ?? "").getTime() <= Date.now();
      if (mounted && activeQueue?.id && !activeQueueExpired) {
        setActiveNotice({
          kind: "queue",
          id: activeQueue.id,
          battleId: activeQueue.match_group_id ?? null,
          status: activeQueue.status,
          createdAt: activeQueue.created_at ?? null,
        });
      } else {
        const { data: activeBattleRows } = await supabase
          .from("battles")
          .select("id, status, created_at")
          .or(`fighter_a_user_id.eq.${uid},fighter_b_user_id.eq.${uid}`)
          .in("status", ACTIVE_NOTICE_BATTLE_STATUSES)
          .order("created_at", { ascending: false })
          .limit(1);
        const activeBattle = activeBattleRows?.[0] as { id: string; status: string; created_at?: string | null } | undefined;
        if (mounted && activeBattle?.id) {
          setActiveNotice({
            kind: "battle",
            id: activeBattle.id,
            battleId: activeBattle.id,
            status: activeBattle.status,
            createdAt: activeBattle.created_at ?? null,
          });
        }
        if (mounted && !activeBattle?.id) setActiveNotice(null);
      }

      const { data: latest } = await supabase
        .from("battle_notifications")
        .select("id, queue_id, battle_id, type, title, body, metadata, read_at, created_at")
        .eq("user_id", uid)
        .in("type", ["battle_matched", "battle_queue_expired", "daily_battle_expired", "daily_battle_finished"])
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<BattleNotificationRow>();

      const latestCall = latest ? toBattleCall(latest, isZh ? "對手" : "Opponent") : null;
      if (mounted && latestCall) showCall(latestCall);
      if (mounted && (latest?.type === "battle_queue_expired" || latest?.type === "daily_battle_expired" || latest?.type === "daily_battle_finished")) {
        setCall(null);
        setActiveNotice(null);
        setExpiredNotice(latest);
        setExpiredNoticeOpen(true);
      }

      channel = supabase
        .channel(`global-battle-call-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "battle_notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = payload.new as BattleNotificationRow;
            const next = toBattleCall(row, isZh ? "對手" : "Opponent");
            if (next) showCall(next);
            if (row.type === "battle_queue_expired" || row.type === "daily_battle_expired" || row.type === "daily_battle_finished") {
              setCall(null);
              setActiveNotice(null);
              setExpiredNotice(row);
              setExpiredNoticeOpen(true);
            }
          },
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [isZh, ready, showCall]);

  useEffect(() => {
    if (!call || accepted || collapsed) return undefined;
    const id = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [accepted, call, collapsed]);

  useEffect(() => {
    if (!call || accepted || secondsLeft > 0) return;
    setCollapsed(true);
  }, [accepted, call, secondsLeft]);

  const acceptCall = () => {
    if (!call) return;
    setAccepted(true);
    setCollapsed(true);
    void markRead(call.id);
  };

  const dismissCall = () => {
    if (call) void markRead(call.id);
    setCall(null);
    setAccepted(false);
    setCollapsed(false);
  };

  const dismissExpiredNotice = () => {
    if (expiredNotice) void markRead(expiredNotice.id);
    setExpiredNotice(null);
    setExpiredNoticeOpen(false);
  };

  const cancelActiveNotice = async () => {
    if (!activeNotice || !accessToken) return;
    const ok = window.confirm(isZh ? "要取消目前未完成的 Battle 嗎？取消後才可以重新上傳下一首最強抓波Drop Battle。" : "Cancel your unfinished Battle so you can upload another Drop Battle clip?");
    if (!ok) return;
    setActiveNoticeError("");
    setActiveNoticeBusy(true);
    try {
      await cancelCurrentBattleIntent({ accessToken, battleId: activeNotice.kind === "battle" ? activeNotice.id : activeNotice.battleId ?? undefined });
      setActiveNotice(null);
      setActiveNoticeOpen(false);
    } catch (error) {
      setActiveNoticeError(String((error as { message?: string })?.message ?? error));
    } finally {
      setActiveNoticeBusy(false);
    }
  };

  if (!ready) return null;

  if (!call && expiredNotice) {
    const isDailyFinishedNotice = expiredNotice.type === "daily_battle_finished";
    const isDailyExpiredNotice = expiredNotice.type === "daily_battle_expired";
    const title =
      expiredNotice.title ||
      (isDailyFinishedNotice
        ? isZh
          ? "24H Battle 已結束"
          : "24H Battle finished"
        : isDailyExpiredNotice
          ? isZh
            ? "24H Full Song 已過期"
            : "24H Full Song expired"
          : isZh
            ? "Drop Battle 已取消"
            : "Drop Battle cancelled");
    const body =
      expiredNotice.body ||
      (isDailyFinishedNotice
        ? isZh
          ? "你的 24H Full Song 對決已結束，結果已可查看。"
          : "Your 24H Full Song battle has finished. Results are ready."
        : isDailyExpiredNotice
          ? isZh
            ? "你剛有一場 24H Full Song 因 24 小時內沒有對手接受，已從公開挑戰池移除。"
            : "One 24H Full Song card expired because no challenger joined within 24 hours."
          : isZh
            ? "你剛有一場 Drop Battle 因等待時間結束，已從公開挑戰池移除。可以重新上傳或開新戰帖。"
            : "One Drop Battle waiting card ended and was removed from the public pool. You can open a new card.");
    const primaryHref =
      isDailyFinishedNotice && expiredNotice.metadata?.dailyBattleId
        ? `/battle/daily/${encodeURIComponent(expiredNotice.metadata.dailyBattleId)}?lang=${lang}`
        : isDailyExpiredNotice
          ? `/battle/setup?battleMode=daily&from=expired-card&lang=${lang}`
          : `/battle/setup?battleMode=instant&from=expired-card&lang=${lang}`;
    const primaryLabel =
      isDailyFinishedNotice
        ? isZh
          ? "查看結果"
          : "View Result"
        : isDailyExpiredNotice
          ? isZh
            ? "重新開 24H"
            : "Open New 24H"
          : isZh
            ? "重新開 Drop"
            : "Open New Drop";
    return (
      <div className="fixed right-4 top-20 z-[92] w-[min(calc(100vw-2rem),340px)] sm:right-5">
        <div className="overflow-hidden rounded-2xl border border-cyan-200/25 bg-black/82 text-white shadow-[0_22px_76px_rgba(0,0,0,0.52),0_0_30px_rgba(0,203,255,0.12)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setExpiredNoticeOpen((value) => !value)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-black">
              <BellIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/80">
                {isZh ? "帳號消息" : "Account Notice"}
              </span>
              <span className="block truncate text-sm font-black">{title}</span>
            </span>
            <span className="rounded-full border border-zinc-200/20 bg-white/10 px-2 py-1 text-[10px] font-black text-zinc-200">
              {isDailyFinishedNotice ? (isZh ? "已結束" : "Finished") : isDailyExpiredNotice ? (isZh ? "已過期" : "Expired") : (isZh ? "已取消" : "Cancelled")}
            </span>
          </button>
          {expiredNoticeOpen ? (
            <div className="space-y-3 border-t border-white/10 px-4 py-4">
              <p className="text-sm font-bold leading-6 text-zinc-300">{body}</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-black">
                <Link href={primaryHref} className="rounded-xl bg-cyan-300 px-3 py-3 text-center text-black transition hover:bg-cyan-100">
                  {primaryLabel}
                </Link>
                <button
                  type="button"
                  onClick={dismissExpiredNotice}
                  className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-3 text-zinc-100 transition hover:bg-white/[0.1]"
                >
                  {isZh ? "知道了" : "Dismiss"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (!call && activeNotice) {
    const isQueueNotice = activeNotice.kind === "queue";
    const isPoolWaitingNotice =
      isQueueNotice &&
      ["searching", "waiting", "waiting_challenge", "public_voting"].includes(activeNotice.status) &&
      !activeNotice.battleId;
    const activeHref = isPoolWaitingNotice
      ? `/battle/waiting-room/${encodeURIComponent(activeNotice.id)}?lang=${lang}`
      : isQueueNotice && activeNotice.battleId
        ? `/battle/${encodeURIComponent(activeNotice.battleId)}?lang=${lang}`
        : activeNotice.battleId
          ? `/battle/${encodeURIComponent(activeNotice.battleId)}?lang=${lang}`
          : `/battle?lang=${lang}&focusQueue=${encodeURIComponent(activeNotice.id)}`;
    const activeTitle = isPoolWaitingNotice
      ? isZh
        ? "你的最強抓波Drop Battle 正在等待挑戰"
        : "Your Drop Battle is waiting"
      : isZh
        ? "有一場 Battle 尚未完成"
        : "Unfinished Battle";
    const activeBody = isPoolWaitingNotice
      ? isZh
        ? "目前還沒有配到對手。你可以進等待場看倒數、確認作品還在掛池，也可以取消後重新上傳。"
        : "No opponent yet. Enter the waiting room for countdown, confirm your card is still listed, or cancel and upload again."
      : isZh
        ? "目前帳號一次只能保留一場 Battle。你可以回到場內，或直接取消後重新上傳。"
        : "One account can only hold one active Battle. Enter it or cancel to upload again.";
    const activeCta = isPoolWaitingNotice
      ? isZh
        ? "進入等待場"
        : "Enter Waiting Room"
      : isZh
        ? "回到場內"
        : "Enter";
    return (
      <div className="fixed right-4 top-20 z-[92] w-[min(calc(100vw-2rem),340px)] sm:right-5">
        <div className="overflow-hidden rounded-2xl border border-cyan-200/25 bg-black/82 text-white shadow-[0_22px_76px_rgba(0,0,0,0.52),0_0_30px_rgba(0,203,255,0.12)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveNoticeOpen((value) => !value)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-black">
              <BellIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/80">
                {isZh ? "帳號消息" : "Account Notice"}
              </span>
              <span className="block truncate text-sm font-black">
                {activeTitle}
              </span>
            </span>
            <span className="rounded-full border border-yellow-200/25 bg-yellow-300/10 px-2 py-1 text-[10px] font-black text-yellow-100">
              {activeNotice.status}
            </span>
          </button>
          {activeNoticeOpen ? (
            <div className="space-y-3 border-t border-white/10 px-4 py-4">
              <p className="text-sm font-bold leading-6 text-zinc-300">
                {activeBody}
              </p>
              {activeNoticeError ? (
                <p className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-bold leading-5 text-red-100">
                  {activeNoticeError}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2 text-xs font-black">
                <Link href={activeHref} className="rounded-xl bg-cyan-300 px-3 py-3 text-center text-black transition hover:bg-cyan-100">
                  {activeCta}
                </Link>
                <button
                  type="button"
                  onClick={cancelActiveNotice}
                  disabled={activeNoticeBusy}
                  className="rounded-xl border border-red-300/25 bg-red-500/[0.08] px-3 py-3 text-red-100 transition hover:bg-red-500/15 disabled:opacity-55"
                >
                  {activeNoticeBusy ? (isZh ? "取消中" : "Cancelling") : (isZh ? "取消 Battle" : "Cancel")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (!call) return null;

  const contextLine =
    routeTone === "watching"
      ? isZh
        ? "不用離開現在這場，先在原畫面接受。"
        : "Stay in this battle and accept in place."
      : routeTone === "creator"
        ? isZh
          ? "資料可繼續填，配對不會被打斷。"
          : "Keep editing; matchmaking will stay active."
        : isZh
          ? "接受後會進入待命，不會強制跳頁。"
          : "Accept to standby without a forced redirect.";

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-[95] w-[min(calc(100vw-2rem),360px)] sm:bottom-5 sm:right-5">
        <div className="overflow-hidden rounded-2xl border border-orange-300/35 bg-black/82 text-white shadow-[0_22px_80px_rgba(0,0,0,0.5),0_0_34px_rgba(255,106,0,0.18)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${accepted ? "bg-green-400 text-black" : "bg-orange-500 text-black"}`}>
              <SwordIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-orange-200/80">
                {accepted ? (isZh ? "我的下一場 Battle" : "My Next Battle") : (isZh ? "Battle Call" : "Battle Call")}
              </span>
              <span className="block truncate text-sm font-black">
                {isZh ? `愛波哥 vs ${call.opponentName}` : `You vs ${call.opponentName}`}
              </span>
            </span>
            <span className="rounded-full border border-yellow-200/25 bg-yellow-300/10 px-2 py-1 text-[10px] font-black text-yellow-100">
              {accepted ? (isZh ? "待命" : "Ready") : `${secondsLeft}s`}
            </span>
          </button>
          {accepted && (
            <div className="grid grid-cols-2 border-t border-white/10 text-xs font-black">
              <Link href={arenaHref} className="px-4 py-3 text-center text-orange-100 transition hover:bg-orange-400/10">
                {isZh ? "進入鬥歌場" : "Enter Arena"}
              </Link>
              <button type="button" onClick={dismissCall} className="px-4 py-3 text-zinc-400 transition hover:bg-white/[0.04] hover:text-white">
                {isZh ? "先看完這場" : "Keep watching"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 top-4 z-[95] flex justify-center sm:top-5">
      <section
        key={pulseKey}
        className="pointer-events-auto w-full max-w-[680px] overflow-hidden rounded-[1.5rem] border border-orange-300/40 bg-black/86 text-white shadow-[0_28px_100px_rgba(0,0,0,0.58),0_0_42px_rgba(255,106,0,0.22)] backdrop-blur-xl"
      >
        <div className="h-1 bg-gradient-to-r from-orange-500 via-yellow-300 to-cyan-300" />
        <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-200/35 bg-orange-500 text-black shadow-[0_0_30px_rgba(255,106,0,0.38)]">
            <BellIcon />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-red-300/35 bg-red-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-100">
                {isZh ? "找到對手" : "Opponent Found"}
              </span>
              <span className="rounded-full border border-yellow-200/25 bg-yellow-300/10 px-2.5 py-1 text-[10px] font-black text-yellow-100">
                {accepted ? (isZh ? "已接受" : "Accepted") : `${secondsLeft}s`}
              </span>
              {call.potApc ? (
                <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100">
                  {call.potApc} APC POT
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 text-xl font-black leading-snug sm:text-2xl">
              {accepted
                ? isZh
                  ? "已接受，原場待命中"
                  : "Accepted, standing by"
                : isZh
                  ? `${call.opponentName} 正在等待確認`
                  : `${call.opponentName} is waiting`}
            </h2>
            <p className="mt-1 text-sm font-bold leading-6 text-zinc-300">
              {accepted
                ? isZh
                  ? "雙方確認後會直接進鬥場倒數。你可以先看完現在這場。"
                  : "The arena countdown opens after both sides confirm. You can keep watching."
                : contextLine}
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-[190px]">
            {accepted ? (
              <>
                <Link href={arenaHref} className="rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-black text-black shadow-[0_0_24px_rgba(255,106,0,0.24)] transition hover:bg-orange-300">
                  {isZh ? "進入鬥歌場" : "Enter Arena"}
                </Link>
                <button type="button" onClick={() => setCollapsed(true)} className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-black text-zinc-200 transition hover:bg-white/[0.08]">
                  {isZh ? "先看完這場" : "Keep watching"}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={acceptCall} className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-black shadow-[0_0_24px_rgba(255,106,0,0.24)] transition hover:bg-orange-300">
                  {isZh ? "接受挑戰" : "Accept"}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setCollapsed(true)} className="rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-black text-zinc-200 transition hover:bg-white/[0.08]">
                    {isZh ? "稍後提醒" : "Later"}
                  </button>
                  <button type="button" onClick={dismissCall} className="rounded-xl border border-red-300/20 bg-red-500/[0.08] px-3 py-2 text-xs font-black text-red-100 transition hover:bg-red-500/15">
                    {isZh ? "放棄" : "Decline"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
