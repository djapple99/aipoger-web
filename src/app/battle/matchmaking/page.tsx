"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAuthBypassEnabled, mockSkipMatchBattleId } from "@/lib/auth-bypass";
import { supabase } from "@/lib/supabase";
import { resolveCoverUrlFromParam } from "@/lib/cover-url";
import { useI18n } from "@/lib/i18n";
import { INSTANT_MATCH_TIMEOUT_SECONDS } from "@/lib/battle-pool-rules";
import { attemptMatchmakingWithoutApcGate, buildDropBattleSchedulePayload, resolveDropBattleScheduledStart } from "@/lib/battle-pool-client";

const DROP_BATTLE_MIN_LEAD_MS = 30_000;

type QueueStatus =
  | "searching"
  | "waiting"
  | "waiting_challenge"
  | "matched"
  | "active"
  | "completed"
  | "expired"
  | "ghost_battle"
  | "public_voting"
  | "cancelled";

type QueueRow = {
  id: string;
  status: QueueStatus;
  match_group_id: string | null;
  opponent_user_id: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  fallback_kind?: string | null;
};

type MatchPhase = "searching" | "found" | "waiting" | "ghost_battle" | "public_voting" | "cancelled";

type MatchmakingContentProps = {
  /** 若 URL 無 coverUrl，可由此傳入（例如程式導向時） */
  coverUrlOverride?: string | null;
};

function readBattleAssetSession(assetKey: string | null): { avatarUrl: string | null; coverUrl: string | null } {
  if (!assetKey || typeof window === "undefined") return { avatarUrl: null, coverUrl: null };
  try {
    const raw = window.sessionStorage.getItem(`aipoger:battle-assets:${assetKey}`);
    if (!raw) return { avatarUrl: null, coverUrl: null };
    const parsed = JSON.parse(raw) as { avatarUrl?: unknown; coverUrl?: unknown };
    return {
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
      coverUrl: typeof parsed.coverUrl === "string" ? parsed.coverUrl : null,
    };
  } catch {
    return { avatarUrl: null, coverUrl: null };
  }
}

function defaultHookCardTimeText() {
  const date = new Date(Date.now() + 30 * 60 * 1000);
  date.setSeconds(0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function promptHookCardStartIso(lang: string) {
  const input = window.prompt(
    lang === "zh" ? "設定 Drop Battle 戰帖開戰時間（YYYY-MM-DD HH:mm）" : "Set Drop Battle Time (YYYY-MM-DD HH:mm)",
    defaultHookCardTimeText(),
  );
  if (input === null) return null;
  const date = new Date(input.trim().replace(" ", "T"));
  if (!Number.isFinite(date.getTime()) || date.getTime() < Date.now() + DROP_BATTLE_MIN_LEAD_MS) {
    alert(lang === "zh" ? "時間格式不正確，或開戰時間少於 30 秒。" : "Invalid time, or start time is less than 30 seconds away.");
    return null;
  }
  return date.toISOString();
}

function MatchmakingContent(props: MatchmakingContentProps) {
  const { coverUrlOverride } = props;
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fighterName = searchParams.get("fighterName") ?? t("mq_unnamed_fighter");
  const genre = searchParams.get("genre") ?? t("mq_unknown_genre");
  const songName = searchParams.get("songName") ?? t("mq_missing_song");
  const coverForNav = coverUrlOverride ?? searchParams.get("coverUrl");
  const avatarForNav = searchParams.get("avatarUrl");
  const assetKey = searchParams.get("assetKey");
  const [sessionAssets, setSessionAssets] = useState<{ avatarUrl: string | null; coverUrl: string | null }>({
    avatarUrl: null,
    coverUrl: null,
  });
  const displayCoverUrl = useMemo(
    () => resolveCoverUrlFromParam(coverForNav ?? sessionAssets.coverUrl),
    [coverForNav, sessionAssets.coverUrl],
  );
  const audioPath = searchParams.get("audioPath") ?? "";
  const aiToolParam = searchParams.get("aiTool") ?? "";
  const lyricsParam = searchParams.get("lyrics") ?? "";
  const challengeTargetQueueId = searchParams.get("challengeEntryId");
  const matchmakingIssue = searchParams.get("matchmakingIssue");
  const debugMode = searchParams.get("debug") === "1";

  const queueId = searchParams.get("queueId");
  const [phase, setPhase] = useState<MatchPhase>("searching");
  /** 配對成功後的 public.battles.id（絕對不要用 battle_queue 列 id 進擂台） */
  const [resolvedBattleId, setResolvedBattleId] = useState<string | null>(null);
  const [pulseCount, setPulseCount] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [creatingTestBattle, setCreatingTestBattle] = useState(false);
  const [cardAvatarUrl, setCardAvatarUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(INSTANT_MATCH_TIMEOUT_SECONDS);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queueClosedRef = useRef(false);
  const [decisionBusy, setDecisionBusy] = useState<"invite" | "listen" | "cancel" | null>(null);

  useEffect(() => {
    if (!matchmakingIssue) return;
    setNotice(t("mq_matchmaking_degraded_notice"));
  }, [matchmakingIssue, t]);

  const buildArenaSearch = useCallback(() => {
    const mmParams = new URLSearchParams({
      fighterName: fighterName || t("mq_unnamed_fighter"),
      songName: songName || t("mq_missing_song"),
      genre,
      aiTool: aiToolParam,
      audioPath: audioPath,
    });
    if (coverForNav) mmParams.set("coverUrl", coverForNav);
    if (avatarForNav) mmParams.set("avatarUrl", avatarForNav);
    if (assetKey) mmParams.set("assetKey", assetKey);
    if (queueId) mmParams.set("queueId", queueId);
    if (lyricsParam.trim()) mmParams.set("lyrics", lyricsParam.trim());
    if (challengeTargetQueueId) mmParams.set("challengeEntryId", challengeTargetQueueId);
    return mmParams;
  }, [fighterName, songName, genre, aiToolParam, audioPath, coverForNav, avatarForNav, assetKey, queueId, lyricsParam, challengeTargetQueueId, t]);

  const goToArena = useCallback(
    (battleId: string) => {
      const arenaSearch = buildArenaSearch();
      if (debugMode) arenaSearch.set("test", "1");
      router.push(`/battle/${battleId}?${arenaSearch.toString()}`);
    },
    [router, buildArenaSearch, debugMode],
  );

  /** 建立測試擂台（RPC）或 fallback 至 mock 擂台（單人即可） */
  const enterTestArena = async () => {
    const path = audioPath.trim();
    if (!path) {
      alert(t("mq_missing_audio_alert"));
      return;
    }
    setCreatingTestBattle(true);
    try {
      if (isAuthBypassEnabled) {
        goToArena(mockSkipMatchBattleId);
        return;
      }
      const { data: battleId, error } = await supabase.rpc("create_test_arena_battle", {
        p_fighter_a_name: fighterName || t("mq_unnamed_fighter"),
        p_song_a_name: songName || t("mq_missing_song"),
        p_audio_a_path: path,
        p_genre: genre || t("mq_unknown_genre"),
        p_ai_tool_a: aiToolParam.trim() || null,
        p_cover_url: displayCoverUrl ?? coverForNav ?? null,
        p_lyrics_a: lyricsParam.trim() || null,
      });
      if (!error && battleId) {
        goToArena(String(battleId));
        return;
      }
      if (error) {
        console.warn("[matchmaking] create_test_arena_battle", error);
        const msg = error.message ?? "";
        if (msg.includes("two registered users")) {
          goToArena(mockSkipMatchBattleId);
          return;
        }
        alert(t("mq_create_test_failed", { message: msg }));
        return;
      }
      goToArena(mockSkipMatchBattleId);
    } finally {
      setCreatingTestBattle(false);
    }
  };

  const simulateMatch = () => {
    setResolvedBattleId(mockSkipMatchBattleId);
    setPhase("found");
    setCountdown(3);
  };

  const enterArenaNow = () => {
    goToArena(resolvedBattleId ?? mockSkipMatchBattleId);
  };

  const closeCurrentQueue = useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!queueId || queueId.startsWith("mock-") || isAuthBypassEnabled || queueClosedRef.current) {
        queueClosedRef.current = true;
        return true;
      }
      const { error } = await supabase.rpc("cancel_battle_entry", { p_queue_id: queueId });
      if (error) {
        const msg = error.message ?? "";
        const harmless = /not found|already|cancel|expired|inactive|no active|無法|不存在|取消/i.test(msg);
        if (!harmless && !options?.quiet) {
          console.error("[matchmaking] cancel_battle_entry", error);
          alert(msg);
          return false;
        }
        if (!harmless) console.warn("[matchmaking] cancel_battle_entry fallback", error);
      }
      queueClosedRef.current = true;
      return true;
    },
    [queueId],
  );

  const openHookBattleCard = useCallback(async () => {
    setDecisionBusy("invite");
    try {
      if (!queueId || queueId.startsWith("mock-") || isAuthBypassEnabled) {
        router.push(`/battle?lang=${lang}`);
        return;
      }
      const scheduledStartIso = promptHookCardStartIso(lang);
      if (!scheduledStartIso) return;
      const { data, error } = await supabase.rpc("move_entry_to_waiting_challenge", { p_queue_id: queueId });
      if (error) throw error;
      const schedulePayload = buildDropBattleSchedulePayload(scheduledStartIso);
      const scheduleUpdate = schedulePayload
        ? { expires_at: schedulePayload.scheduled_start_at, ...schedulePayload }
        : { expires_at: scheduledStartIso };
      let { error: scheduleError } = await supabase
        .from("battle_queue")
        .update(scheduleUpdate)
        .eq("id", queueId);
      if (scheduleError && /expires_at|scheduled_start_at|cancellation_evaluation_at|schema cache|column.*does not exist|PGRST204/i.test(`${scheduleError.message} ${scheduleError.details ?? ""}`)) {
        const fallback = await supabase
          .from("battle_queue")
          .update({ expires_at: scheduledStartIso })
          .eq("id", queueId);
        scheduleError = fallback.error;
      }
      if (scheduleError) throw scheduleError;
      const row = data as QueueRow | null;
      setExpiresAt(scheduledStartIso ?? resolveDropBattleScheduledStart(row ?? {}));
      setPhase("waiting");
      setNotice(t("mq_hook_card_opened_notice"));
      router.push(`/battle/${encodeURIComponent(queueId)}?lang=${lang}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("mq_matchmaking_degraded_notice");
      console.warn("[matchmaking] open Drop Battle card failed", error);
      setNotice(message);
    } finally {
      setDecisionBusy(null);
    }
  }, [lang, queueId, router, t]);

  const closeAndFindAtBar = useCallback(async () => {
    setDecisionBusy("listen");
    try {
      const ok = await closeCurrentQueue();
      if (!ok) return;
      router.push(`/listen-bar?lang=${lang}`);
    } finally {
      setDecisionBusy(null);
    }
  }, [closeCurrentQueue, lang, router]);

  // Pulse 動畫
  useEffect(() => {
    if (phase !== "searching") return;
    const interval = setInterval(() => setPulseCount((p) => p + 1), 800);
    return () => clearInterval(interval);
  }, [phase]);

  // 配對成功後倒數進場
  useEffect(() => {
    if (phase !== "found") return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== "found" || countdown > 0) return;
    const target =
      resolvedBattleId ?? (queueId?.startsWith("mock-") ? queueId : null) ?? mockSkipMatchBattleId;
    goToArena(target);
  }, [phase, countdown, resolvedBattleId, queueId, goToArena]);

  // 重新整理配對頁時：若佇列已是 matched，直接帶入 battles.id
  useEffect(() => {
    if (!queueId || isAuthBypassEnabled || queueId.startsWith("mock-")) return;
    let cancelled = false;
    void (async () => {
      const { data: row } = await supabase
        .from("battle_queue")
        .select("status, match_group_id, expires_at")
        .eq("id", queueId)
        .maybeSingle<{ status: QueueStatus; match_group_id: string | null; expires_at: string | null }>();
      if (cancelled || !row) return;
      if (row.status === "matched" && row.match_group_id) {
        goToArena(row.match_group_id);
      } else if (row.status === "waiting_challenge") {
        setExpiresAt(resolveDropBattleScheduledStart(row));
        setPhase("waiting");
        setNotice(t("mq_hook_card_opened_notice"));
      } else if (row.status === "ghost_battle" && row.match_group_id) {
        setResolvedBattleId(row.match_group_id);
        setPhase("ghost_battle");
      } else if (row.status === "public_voting") {
        setPhase("public_voting");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [goToArena, queueId, t]);

  useEffect(() => {
    setSessionAssets(readBattleAssetSession(assetKey));
  }, [assetKey]);

  useEffect(() => {
    if (avatarForNav || sessionAssets.avatarUrl) {
      setCardAvatarUrl(avatarForNav ?? sessionAssets.avatarUrl);
      return;
    }
    if (isAuthBypassEnabled) {
      setCardAvatarUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data } = await supabase.from("user_profiles").select("avatar_url").eq("id", uid).maybeSingle();
      if (cancelled) return;
      const u = data?.avatar_url;
      setCardAvatarUrl(typeof u === "string" && u.length > 0 ? u : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [avatarForNav, sessionAssets.avatarUrl]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;
    const startedAt = Date.now();

    const startMatchmaking = async () => {
      if (!queueId) return;

      if (isAuthBypassEnabled || queueId.startsWith("mock-")) {
        setTimeout(() => {
          if (!mounted) return;
          setPhase("found");
        }, 2500);
        return;
      }

      const moveToWaiting = async () => {
        if (!mounted) return;
        setExpiresAt(null);
        setPhase("waiting");
        setNotice(t("mq_entered_pool_notice"));
      };

      const runAttempt = async () => {
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        setSecondsLeft(Math.max(0, INSTANT_MATCH_TIMEOUT_SECONDS - elapsedSeconds));
        if (elapsedSeconds >= INSTANT_MATCH_TIMEOUT_SECONDS) {
          if (intervalId) clearInterval(intervalId);
          await moveToWaiting();
          return;
        }

        const rpcArgs = {
          p_queue_id: queueId,
          p_target_queue_id:
            challengeTargetQueueId && /^[0-9a-f-]{36}$/i.test(challengeTargetQueueId)
              ? challengeTargetQueueId
              : null,
        };
        let rpcError: { message?: string; details?: string | null; hint?: string | null } | null = null;
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (!token) throw new Error("Missing session token");
          await attemptMatchmakingWithoutApcGate({
            queueId,
            targetQueueId: rpcArgs.p_target_queue_id,
            accessToken: token,
          });
        } catch (apiError) {
          const message = apiError instanceof Error ? apiError.message : "matchmaking api failed";
          const isRoleLockError = /戰帖卡|接了一張|challenge card|challenging another/i.test(message);
          if (challengeTargetQueueId || isRoleLockError) {
            if (intervalId) clearInterval(intervalId);
            setNotice(message);
            setPhase("cancelled");
            return;
          }
          rpcError = { message };
          console.warn("[matchmaking] public beta matchmaking api unavailable; trying RPC fallback", apiError);
        }
        if (rpcError) {
          let { error: rpcFallbackError } = await supabase.rpc("attempt_matchmaking", rpcArgs);
          const msg = `${rpcFallbackError?.message ?? ""} ${rpcFallbackError?.details ?? ""} ${rpcFallbackError?.hint ?? ""}`;
          if (/p_target_queue_id|function.*does not exist|schema cache/i.test(msg)) {
            const retry = await supabase.rpc("attempt_matchmaking", { p_queue_id: queueId });
            rpcFallbackError = retry.error;
          }
          rpcError = rpcFallbackError;
        }

        if (rpcError) {
          console.warn("[matchmaking] attempt_matchmaking unavailable; keeping queue alive", rpcError);
          setNotice(t("mq_matchmaking_degraded_notice"));
        }

        const { data: row, error: rowError } = await supabase
          .from("battle_queue")
          .select("id, status, match_group_id, opponent_user_id, expires_at")
          .eq("id", queueId)
          .maybeSingle<QueueRow>();

        if (rowError) {
          console.error("[matchmaking] battle_queue status read", rowError);
          setNotice(t("mq_matchmaking_degraded_notice"));
          return;
        }

        if (!mounted || !row) return;

        if (row.status === "matched" && row.match_group_id) {
          if (intervalId) clearInterval(intervalId);
          goToArena(row.match_group_id);
        } else if (row.status === "waiting_challenge") {
          if (intervalId) clearInterval(intervalId);
          setExpiresAt(resolveDropBattleScheduledStart(row));
          setPhase("waiting");
          setNotice(t("mq_hook_card_opened_notice"));
        } else if (row.status === "ghost_battle" && row.match_group_id) {
          if (intervalId) clearInterval(intervalId);
          setResolvedBattleId(row.match_group_id);
          setPhase("ghost_battle");
        } else if (row.status === "public_voting") {
          if (intervalId) clearInterval(intervalId);
          setPhase("public_voting");
        }
      };

      await runAttempt();
      intervalId = setInterval(runAttempt, 4000);
    };

    startMatchmaking().catch(() => {});

    const channel =
      !isAuthBypassEnabled &&
      queueId &&
      !queueId.startsWith("mock-") &&
      supabase
        .channel(`battle-queue-${queueId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "battle_queue", filter: `id=eq.${queueId}` },
          (payload) => {
            const nextStatus = (payload.new as QueueRow).status;
            if (nextStatus === "matched") {
              if (intervalId) clearInterval(intervalId);
              const battleId = (payload.new as QueueRow).match_group_id;
              if (battleId) {
                setNotice(t("mq_match_notice"));
                goToArena(battleId);
              }
            } else if (nextStatus === "waiting_challenge") {
              if (intervalId) clearInterval(intervalId);
              setExpiresAt(resolveDropBattleScheduledStart(payload.new as QueueRow));
              setPhase("waiting");
              setNotice(t("mq_hook_card_opened_notice"));
            } else if (nextStatus === "ghost_battle") {
              if (intervalId) clearInterval(intervalId);
              const battleId = (payload.new as QueueRow).match_group_id;
              if (battleId) setResolvedBattleId(battleId);
              setPhase("ghost_battle");
              setNotice(t("mq_ghost_notice"));
            } else if (nextStatus === "public_voting") {
              if (intervalId) clearInterval(intervalId);
              setPhase("public_voting");
              setNotice(t("mq_public_notice"));
            }
          },
        )
        .subscribe();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [queueId, router, challengeTargetQueueId, t, goToArena]);

  useEffect(() => {
    if (isAuthBypassEnabled) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!mounted || !uid) return;

      channel = supabase
        .channel(`battle-notifications-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "battle_notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            const next = payload.new as {
              type?: string;
              body?: string;
              battle_id?: string | null;
              queue_id?: string | null;
            };
            if (queueId && next.queue_id && next.queue_id !== queueId) return;
            if (next.body) setNotice(next.body);
            if (next.type === "battle_matched" && next.battle_id) {
              goToArena(next.battle_id);
            }
          },
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [goToArena, queueId]);

  const cancelEntry = async () => {
    if (!queueId || queueId.startsWith("mock-") || isAuthBypassEnabled) {
      router.push("/");
      return;
    }
    setDecisionBusy("cancel");
    const ok = await closeCurrentQueue();
    setDecisionBusy(null);
    if (!ok) return;
    setPhase("cancelled");
    setNotice(t("mq_cancelled_notice"));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050505] text-zinc-100">
      {/* 背景光暈 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(255,106,0,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            transform: `translate(-50%, -50%) scale(${1 + (pulseCount % 4) * 0.1})`,
            transition: "transform 0.8s ease",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {phase === "searching" && (
          <>
            {/* 搜尋雷達波 */}
            <div className="relative flex h-48 w-48 items-center justify-center">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-orange-500/20"
                  style={{
                    width: 80 + i * 60,
                    height: 80 + i * 60,
                    animation: `radar-pulse 2s ease-out ${i * 0.4}s infinite`,
                    opacity: 1 - i * 0.25,
                  }}
                />
              ))}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20 text-2xl">
                🎵
              </div>
            </div>

            <div className="text-center">
              <p className="text-4xl font-black tracking-tight text-zinc-100">{t("mq_searching")}</p>
              <p className="mt-3 text-sm text-zinc-500">{t("mq_style_with_timer", { genre, seconds: secondsLeft })}</p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-zinc-300">
                {t("mq_searching_body")}
              </p>
              {notice && <p className="mx-auto mt-4 max-w-lg rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{notice}</p>}
            </div>

            {/* 鬥士卡片：封面 + 左上角頭像 */}
            <div className="relative flex min-w-[min(92vw,380px)] gap-4 overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 py-5 pl-5 pr-6 backdrop-blur">
              <div className="absolute left-5 top-5 z-20 h-11 w-11 overflow-hidden rounded-full border-2 border-orange-500 bg-zinc-800 shadow-lg ring-2 ring-black/70">
                {cardAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cardAvatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-orange-400">
                    {fighterName.slice(0, 1)}
                  </div>
                )}
              </div>
              {displayCoverUrl ? (
                <div className="relative z-0 mt-2 h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-zinc-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayCoverUrl}
                    alt={fighterName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="relative z-0 mt-2 flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-3xl">
                  🎵
                </div>
              )}
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-xs text-zinc-500">{t("mq_next_on_stage")}</p>
                <p className="font-bold text-zinc-200">{fighterName}</p>
                <p className="text-xs text-zinc-500">{songName}</p>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3">
              {debugMode && (
                <>
                  <button
                    type="button"
                    onClick={simulateMatch}
                    className="w-full rounded-xl border border-green-500/60 bg-green-500/15 px-6 py-3 text-sm font-semibold text-green-300 transition hover:bg-green-500/25"
                  >
                    {t("mq_simulate_match")}
                  </button>
                  <button
                    type="button"
                    disabled={creatingTestBattle}
                    onClick={() => void enterTestArena()}
                    className="w-full rounded-xl border border-orange-500 bg-orange-500/20 px-6 py-3 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingTestBattle ? t("mq_creating") : t("mq_skip_arena")}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => void cancelEntry()}
                disabled={decisionBusy === "cancel"}
                className="block w-full rounded-xl border border-zinc-700 px-6 py-2.5 text-center text-sm text-zinc-500 transition hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("mq_cancel")}
              </button>
            </div>
          </>
        )}

        {phase === "waiting" && (
          <div className="w-full max-w-2xl rounded-[2rem] border border-orange-400/25 bg-black/70 p-7 text-center shadow-[0_0_60px_rgba(255,106,0,0.14)] backdrop-blur">
            <p className="text-xs uppercase tracking-[0.45em] text-orange-300/80">Battle Pool</p>
            <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">{t("mq_waiting_title")}</h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-zinc-300">
              {t("mq_waiting_body")}
            </p>
            {notice && <p className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{notice}</p>}
            <div className="mt-6 grid gap-3 text-left text-sm text-zinc-400 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{t("mq_work")}</p>
                <p className="mt-2 font-black text-white">{songName}</p>
                <p className="mt-1 text-orange-200">{genre}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">{lang === "zh" ? "兩條路" : "Two Paths"}</p>
                <p className="mt-2 font-black text-white">{lang === "zh" ? "90s Drop Battle 戰帖卡" : "90s Drop Battle Card"}</p>
                <p className="mt-1 text-zinc-400">
                  {expiresAt
                    ? lang === "zh"
                      ? "已公開，可分享邀人接戰"
                      : "Published and Ready to Share"
                    : lang === "zh"
                      ? "開卡邀人接戰，或去傷心酒吧找對手"
                      : "Publish a challenge card, or find an opponent at Bar Heartbreak"}
                </p>
              </div>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => void openHookBattleCard()}
                disabled={Boolean(decisionBusy)}
                className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {decisionBusy === "invite" ? t("mq_creating") : t("mq_open_hook_card")}
              </button>
              <button
                type="button"
                onClick={() => void closeAndFindAtBar()}
                disabled={Boolean(decisionBusy)}
                className="rounded-full border border-cyan-200/35 px-6 py-3 text-sm font-bold text-cyan-50 transition hover:bg-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {decisionBusy === "listen" ? t("mq_creating") : t("mq_go_bar")}
              </button>
            </div>
          </div>
        )}

        {phase === "found" && (
          <>
            {/* 配對成功動畫 */}
            <div className="relative flex h-60 w-60 items-center justify-center">
              {/* 炸裂光芒 */}
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/20" style={{ animationDuration: "1.5s" }} />
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/10" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />

              {/* 碰撞效果 */}
              <div
                className="absolute flex items-center"
                style={{
                  animation: "slide-in-left 0.8s ease forwards",
                }}
              >
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-2xl font-black text-white shadow-[0_0_30px_rgba(255,106,0,0.5)]">
                  A
                </div>
              </div>
              <div
                className="absolute flex items-center"
                style={{
                  animation: "slide-in-right 0.8s ease forwards",
                }}
              >
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-black text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                  B
                </div>
              </div>

              {/* VS */}
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-black border-4 border-orange-500 text-xl font-black text-orange-400 shadow-[0_0_20px_rgba(255,106,0,0.6)]">
                VS
              </div>
            </div>

            <div className="text-center">
              <p className="text-4xl font-black text-green-400">{t("mq_found_title")}</p>
              <p className="mt-2 text-sm text-zinc-500">{t("mq_match_notice")}</p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-4">
              <div className="text-2xl">⏱</div>
              <div>
                <p className="text-xs text-zinc-500">{lang === "zh" ? "進入鬥歌場倒數" : "Entering Arena Countdown"}</p>
                <p className="text-2xl font-black text-green-400">{countdown}s</p>
              </div>
            </div>
            <button
              type="button"
              onClick={enterArenaNow}
              className="rounded-xl border border-orange-500 bg-orange-500 px-8 py-3 text-sm font-bold text-black shadow-lg shadow-orange-500/30 transition hover:bg-orange-400"
            >
              {lang === "zh" ? "立即進入鬥歌場" : "Enter Arena"}
            </button>
          </>
        )}

        {(phase === "ghost_battle" || phase === "public_voting" || phase === "cancelled") && (
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-black/70 p-7 text-center backdrop-blur">
            <p className="text-xs uppercase tracking-[0.45em] text-orange-300/80">
              {phase === "ghost_battle" ? "Ghost Battle" : phase === "public_voting" ? "Public Voting" : "Cancelled"}
            </p>
            <h1 className="mt-4 text-3xl font-black text-white md:text-5xl">
              {phase === "ghost_battle"
                ? t("mq_ghost_title")
                : phase === "public_voting"
                  ? t("mq_public_title")
                  : t("mq_cancelled_title")}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-zinc-300">
              {notice ??
                (phase === "ghost_battle"
                  ? t("mq_ghost_notice")
                  : phase === "public_voting"
                    ? t("mq_public_notice")
                    : t("mq_cancelled_body"))}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {phase === "ghost_battle" && resolvedBattleId && (
                <button
                  type="button"
                  onClick={enterArenaNow}
                  className="rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-300"
                >
                  {t("pool_enter_ghost")}
                </button>
              )}
              <Link href="/battle" className="rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-zinc-200 transition hover:border-cyan-200/60 hover:text-white">
                {t("mq_back_battle")}
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes radar-pulse {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes slide-in-left {
          0% { transform: translateX(-120px); opacity: 0; }
          60% { transform: translateX(5px); }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-in-right {
          0% { transform: translateX(120px); opacity: 0; }
          60% { transform: translateX(-5px); }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function MatchmakingFallback() {
  const { t } = useI18n();
  return <>{t("common_loading")}</>;
}

export default function MatchmakingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-orange-400 text-sm tracking-widest">
          <MatchmakingFallback />
        </div>
      }
    >
      <MatchmakingContent />
    </Suspense>
  );
}
