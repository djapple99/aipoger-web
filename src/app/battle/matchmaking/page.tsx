"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { isAuthBypassEnabled, mockSkipMatchBattleId } from "@/lib/auth-bypass";
import { supabase } from "@/lib/supabase";

type QueueStatus = "waiting" | "matched" | "cancelled";

type QueueRow = {
  id: string;
  status: QueueStatus;
  match_group_id: string | null;
  opponent_user_id: string | null;
};

type MatchPhase = "searching" | "found" | "entering";

function MatchmakingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fighterName = searchParams.get("fighterName") ?? "未命名鬥士";
  const genre = searchParams.get("genre") ?? "未指定";
  const songName = searchParams.get("songName") ?? "未提供";
  const coverUrl = searchParams.get("coverUrl");
  const audioPath = searchParams.get("audioPath") ?? "";
  const aiToolParam = searchParams.get("aiTool") ?? "";

  const queueId = searchParams.get("queueId");
  const [phase, setPhase] = useState<MatchPhase>("searching");
  /** 配對成功後的 public.battles.id（絕對不要用 battle_queue 列 id 進擂台） */
  const [resolvedBattleId, setResolvedBattleId] = useState<string | null>(null);
  const [pulseCount, setPulseCount] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [creatingTestBattle, setCreatingTestBattle] = useState(false);

  const fighterAvatarRef = useRef<string | null>(null);

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
      resolvedBattleId ?? (queueId?.startsWith("mock-") ? queueId : null);
    if (!target) return;

    // 重建帶上所有 URL params（test mode、audioPath 等）
    const mmParams = new URLSearchParams({
      fighterName: fighterName || "未命名鬥士",
      songName: songName || "未提供",
      genre: genre,
      aiTool: aiToolParam,
      audioPath: audioPath,
    });
    if (coverUrl) mmParams.set("coverUrl", coverUrl);
    if (queueId) mmParams.set("queueId", queueId);

    router.replace(`/battle/${target}?test=1&${mmParams.toString()}`);
  }, [phase, countdown, resolvedBattleId, queueId, router]);

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

            {/* 鬥士卡片 */}
            <div className="flex items-center gap-6 rounded-3xl border border-zinc-800 bg-zinc-900/80 px-8 py-5 backdrop-blur">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt={fighterName}
                  className="h-14 w-14 rounded-full border-2 border-orange-500 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-orange-500 bg-zinc-800 text-xl font-bold text-orange-400">
                  {fighterName.slice(0, 1)}
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-500">即將上場</p>
                <p className="font-bold text-zinc-200">{fighterName}</p>
                <p className="text-xs text-zinc-500">{songName}</p>
              </div>
            </div>

            {/* 取消按鈕 */}
            <Link
              href="/"
              className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm text-zinc-500 transition hover:border-red-500 hover:text-red-400"
            >
              取消配對
            </Link>

            {/* 跳過配對（測試擂臺）：AUTH_BYPASS 用假 id 直跳；否則 insert battles 後導向（測試環境可關 RLS，見 disable_rls_testing.sql） */}
            <button
              type="button"
              disabled={creatingTestBattle}
              onClick={async () => {
                if (creatingTestBattle) return;

                if (isAuthBypassEnabled) {
                  const qs = new URLSearchParams({
                    test: "1",
                    fighterName: fighterName || "未命名鬥士",
                    songName: songName || "未提供",
                    genre,
                    audioPath: audioPath.trim(),
                    aiTool: aiToolParam,
                  });
                  if (coverUrl?.trim()) qs.set("coverUrl", coverUrl.trim());
                  router.push(`/battle/${mockSkipMatchBattleId}?${qs.toString()}`);
                  return;
                }

                const path = audioPath.trim();
                if (!path) {
                  alert("缺少 URL 參數 audioPath（Hook 上傳後的 Storage 路徑）");
                  return;
                }
                setCreatingTestBattle(true);
                try {
                  const { data: battleData, error } = await supabase
                    .from("battles")
                    .insert({
                      status: "live",
                      fighter_a_name: fighterName || "未命名鬥士",
                      song_a_name: songName || "未提供",
                      audio_a_path: path,
                      song_a_cover: coverUrl?.trim() || null,
                      ai_tool_a: aiToolParam.trim() || null,
                      fighter_b_name: "測試對手",
                      song_b_name: "測試歌曲",
                      started_at: new Date().toISOString(),
                    })
                    .select("id")
                    .single();

                  if (error || !battleData) {
                    console.error("[matchmaking] direct insert battle", error);
                    alert("建立測試擂臺失敗：" + (error?.message ?? "未知錯誤"));
                    return;
                  }
                  const nextQs = new URLSearchParams({
                    test: "1",
                    fighterName: fighterName || "未命名鬥士",
                    songName: songName || "未提供",
                    genre,
                    audioPath: path,
                    aiTool: aiToolParam,
                  });
                  if (coverUrl?.trim()) nextQs.set("coverUrl", coverUrl.trim());
                  router.push(`/battle/${battleData.id}?${nextQs.toString()}`);
                } finally {
                  setCreatingTestBattle(false);
                }
              }}
              className="rounded-xl border border-orange-500/50 px-6 py-2.5 text-sm text-orange-400 transition hover:border-orange-400 hover:bg-orange-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingTestBattle ? "建立中…" : "跳過配對（測試擂臺）"}
            </button>
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