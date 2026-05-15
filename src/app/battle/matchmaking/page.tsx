"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { isAuthBypassEnabled, mockSkipMatchBattleId } from "@/lib/auth-bypass";
import { supabase } from "@/lib/supabase";
import { resolveCoverUrlFromParam } from "@/lib/cover-url";
import { useI18n } from "@/lib/i18n";

type QueueStatus = "waiting" | "matched" | "cancelled";

type QueueRow = {
  id: string;
  status: QueueStatus;
  match_group_id: string | null;
  opponent_user_id: string | null;
};

type MatchPhase = "searching" | "found" | "entering";

type MatchmakingContentProps = {
  /** 若 URL 無 coverUrl，可由此傳入（例如程式導向時） */
  coverUrlOverride?: string | null;
};

function MatchmakingContent(props: MatchmakingContentProps) {
  const { coverUrlOverride } = props;
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fighterName = searchParams.get("fighterName") ?? "未命名鬥士";
  const genre = searchParams.get("genre") ?? "未指定";
  const songName = searchParams.get("songName") ?? "未提供";
  const coverForNav = coverUrlOverride ?? searchParams.get("coverUrl");
  const displayCoverUrl = useMemo(() => resolveCoverUrlFromParam(coverForNav), [coverForNav]);
  const audioPath = searchParams.get("audioPath") ?? "";
  const aiToolParam = searchParams.get("aiTool") ?? "";

  const queueId = searchParams.get("queueId");
  const [phase, setPhase] = useState<MatchPhase>("searching");
  /** 配對成功後的 public.battles.id（絕對不要用 battle_queue 列 id 進擂台） */
  const [resolvedBattleId, setResolvedBattleId] = useState<string | null>(null);
  const [pulseCount, setPulseCount] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [creatingTestBattle, setCreatingTestBattle] = useState(false);
  const [cardAvatarUrl, setCardAvatarUrl] = useState<string | null>(null);

  const buildArenaSearch = useCallback(() => {
    const mmParams = new URLSearchParams({
      fighterName: fighterName || "未命名鬥士",
      songName: songName || "未提供",
      genre,
      aiTool: aiToolParam,
      audioPath: audioPath,
    });
    if (coverForNav) mmParams.set("coverUrl", coverForNav);
    if (queueId) mmParams.set("queueId", queueId);
    return mmParams;
  }, [fighterName, songName, genre, aiToolParam, audioPath, coverForNav, queueId]);

  const goToArena = useCallback(
    (battleId: string) => {
      router.push(`/battle/${battleId}?test=1&${buildArenaSearch().toString()}`);
    },
    [router, buildArenaSearch],
  );

  /** 建立測試擂臺（RPC）或 fallback 至 mock 擂台（單人即可） */
  const enterTestArena = async () => {
    const path = audioPath.trim();
    if (!path) {
      alert("缺少 audioPath（請從 Hook 裁切上傳後再進配對）");
      return;
    }
    setCreatingTestBattle(true);
    try {
      if (isAuthBypassEnabled) {
        goToArena(mockSkipMatchBattleId);
        return;
      }
      const { data: battleId, error } = await supabase.rpc("create_test_arena_battle", {
        p_fighter_a_name: fighterName || "未命名鬥士",
        p_song_a_name: songName || "未提供",
        p_audio_a_path: path,
        p_genre: genre || "未指定",
        p_ai_tool_a: aiToolParam.trim() || null,
        p_cover_url: displayCoverUrl ?? coverForNav ?? null,
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
        alert(`建立測試擂臺失敗：${msg}\n\n若尚未執行 SQL，請在 Supabase 跑 supabase/create_test_arena_battle_rpc.sql`);
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
        .select("status, match_group_id")
        .eq("id", queueId)
        .maybeSingle<{ status: QueueStatus; match_group_id: string | null }>();
      if (cancelled || !row) return;
      if (row.status === "matched" && row.match_group_id) {
        setResolvedBattleId(row.match_group_id);
        setPhase("found");
        setCountdown(5);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queueId]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    const startMatchmaking = async () => {
      if (!queueId) return;

      if (isAuthBypassEnabled || queueId.startsWith("mock-")) {
        setTimeout(() => {
          if (!mounted) return;
          setPhase("found");
        }, 2500);
        return;
      }

      const runAttempt = async () => {
        const { error: rpcError } = await supabase.rpc("attempt_matchmaking", {
          p_queue_id: queueId,
        });

        if (rpcError) {
          console.error("[matchmaking] attempt_matchmaking", rpcError);
          return;
        }

        const { data: row } = await supabase
          .from("battle_queue")
          .select("id, status, match_group_id, opponent_user_id")
          .eq("id", queueId)
          .single<QueueRow>();

        if (!mounted || !row) return;

        if (row.status === "matched" && row.match_group_id) {
          if (intervalId) clearInterval(intervalId);
          setResolvedBattleId(row.match_group_id);
          setPhase("found");
          setCountdown(5);
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
                setResolvedBattleId(battleId);
                setPhase("found");
                setCountdown(5);
              }
            }
          },
        )
        .subscribe();

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [queueId, router]);

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
              <p className="text-4xl font-black tracking-tight text-zinc-100">尋找對手</p>
              <p className="mt-3 text-sm text-zinc-500">風格：{genre} · 搜尋中…</p>
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
                <p className="text-xs text-zinc-500">即將上場</p>
                <p className="font-bold text-zinc-200">{fighterName}</p>
                <p className="text-xs text-zinc-500">{songName}</p>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3">
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
                {creatingTestBattle ? "建立中…" : t("mq_skip_arena")}
              </button>
              <Link
                href="/"
                className="block w-full rounded-xl border border-zinc-700 px-6 py-2.5 text-center text-sm text-zinc-500 transition hover:border-red-500 hover:text-red-400"
              >
                {t("mq_cancel")}
              </Link>
            </div>
          </>
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
              <p className="text-4xl font-black text-green-400">🎉 配對成功！</p>
              <p className="mt-2 text-sm text-zinc-500">風格對決即將開始</p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-4">
              <div className="text-2xl">⏱</div>
              <div>
                <p className="text-xs text-zinc-500">即將進入鬥歌場</p>
                <p className="text-2xl font-black text-green-400">{countdown}s</p>
              </div>
            </div>
            <button
              type="button"
              onClick={enterArenaNow}
              className="rounded-xl border border-orange-500 bg-orange-500 px-8 py-3 text-sm font-bold text-black shadow-lg shadow-orange-500/30 transition hover:bg-orange-400"
            >
              {t("mq_enter_now")}
            </button>
          </>
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

export default function MatchmakingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-orange-400 text-sm tracking-widest">
          載入中…
        </div>
      }
    >
      <MatchmakingContent />
    </Suspense>
  );
}