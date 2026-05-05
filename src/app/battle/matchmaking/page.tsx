"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAuthBypassEnabled } from "@/lib/auth-bypass";
import { supabase } from "@/lib/supabase";

type QueueStatus = "waiting" | "matched" | "cancelled";

type QueueRow = {
  id: string;
  status: QueueStatus;
  match_group_id: string | null;
  opponent_user_id: string | null;
};

export default function MatchmakingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fighterName = searchParams.get("fighterName") ?? "未命名鬥士";
  const genre = searchParams.get("genre") ?? "未指定";
  const fileName = searchParams.get("fileName") ?? "未提供";
  const hookStart = searchParams.get("hookStart");
  const hookEnd = searchParams.get("hookEnd");
  const hookDuration = searchParams.get("hookDuration");
  const queueId = searchParams.get("queueId");
  const [status, setStatus] = useState<QueueStatus>("waiting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusText = useMemo(() => {
    if (status === "matched") return "已配對成功，準備進入鬥歌場...";
    if (status === "cancelled") return "配對已取消，請重新建立配對。";
    return "系統正在尋找風格相近的對手，請稍候片刻。";
  }, [status]);

  useEffect(() => {
    let intervalId: number | null = null;
    let mounted = true;

    const startMatchmaking = async () => {
      if (!queueId) {
        setErrorMessage("缺少 queueId，請重新建立配對。");
        return;
      }

      if (isAuthBypassEnabled || queueId.startsWith("mock-")) {
        window.setTimeout(() => {
          if (!mounted) return;
          setStatus("matched");
          router.replace(`/battle?matchId=${queueId}`);
        }, 2500);
        return;
      }

      const runAttempt = async () => {
        const { error: rpcError } = await supabase.rpc("attempt_matchmaking", {
          p_queue_id: queueId,
        });

        if (rpcError) {
          setErrorMessage("配對服務暫時忙碌，正在重試。");
          return;
        }

        const { data: row, error: rowError } = await supabase
          .from("battle_queue")
          .select("id, status, match_group_id, opponent_user_id")
          .eq("id", queueId)
          .single<QueueRow>();

        if (rowError || !row) {
          setErrorMessage("找不到配對資料，請重新填寫。");
          return;
        }

        if (!mounted) return;
        setStatus(row.status);

        if (row.status === "matched") {
          if (intervalId) window.clearInterval(intervalId);
          setTimeout(() => {
            router.replace(`/battle?matchId=${row.match_group_id ?? row.id}`);
          }, 900);
        }
      };

      await runAttempt();
      intervalId = window.setInterval(runAttempt, 4000);
    };

    startMatchmaking().catch(() => setErrorMessage("配對初始化失敗，請稍後再試。"));

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
            setStatus(nextStatus);
            if (nextStatus === "matched") {
              const matchId = (payload.new as QueueRow).match_group_id ?? queueId;
              router.replace(`/battle?matchId=${matchId}`);
            }
          },
        )
        .subscribe();

    return () => {
      mounted = false;
      if (intervalId) window.clearInterval(intervalId);
      if (channel) supabase.removeChannel(channel);
    };
  }, [queueId, router]);

  return (
    <main className="min-h-screen bg-[#15181b] text-[#ede8e4]">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-8 sm:px-6">
        <section className="w-full rounded-3xl border border-[#4a5057] bg-[#1f2226]/90 p-6 md:p-8">
          <p className="text-xs tracking-[0.36em] text-[#8f847e]">AIPOGER</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[0.16em] text-[#f3efec]">等待配對中</h1>
          <p className="mt-3 text-sm text-[#ccc4be]">{statusText}</p>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-[#3f444a] bg-[#1a1d21] p-4 text-sm text-[#ddd5d0]">
            <p>鬥士名稱：{fighterName}</p>
            <p>歌曲種類：{genre}</p>
            <p>上傳檔案：{fileName}</p>
            {hookDuration && <p>Hook 長度：{hookDuration}s</p>}
            {hookStart && hookEnd && <p>Hook 區間：{hookStart}s - {hookEnd}s</p>}
            <p>配對狀態：{status === "matched" ? "已配對" : status === "cancelled" ? "已取消" : "等待中"}</p>
            {queueId && <p>隊列編號：{queueId}</p>}
          </div>

          <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-[#2a2f34]">
            <div
              className={`h-full rounded-full bg-[#d7a17a] transition-all ${
                status === "matched" ? "w-full" : "w-2/3 animate-pulse"
              }`}
            />
          </div>

          {errorMessage && <p className="mt-4 text-sm text-[#ffb88f]">{errorMessage}</p>}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/battle"
              className="rounded-xl border border-[#6f757c] bg-gradient-to-b from-[#626870] to-[#4a5057] px-4 py-2 text-sm tracking-[0.1em] text-[#f7f1ed] transition hover:border-[#ff8d40] hover:shadow-[0_0_14px_rgba(255,121,40,0.42)]"
            >
              先進入鬥歌場觀戰
            </Link>
            <Link
              href="/battle/setup"
              className="rounded-xl border border-[#5d636a] px-4 py-2 text-sm tracking-[0.1em] text-[#ddd6d1] transition hover:border-[#ff8d40] hover:text-[#ffd6bd]"
            >
              重新填寫資料
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
