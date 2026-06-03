"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import LangToggle from "@/components/lang-toggle";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type QueueRoomRow = {
  id: string;
  user_id: string | null;
  fighter_name: string | null;
  original_file_name: string | null;
  genre: string | null;
  ai_tool: string | null;
  audio_path: string | null;
  status: string | null;
  match_group_id: string | null;
  expires_at: string | null;
  created_at: string | null;
};

function formatClock(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusLabel(status: string | null | undefined, isZh: boolean) {
  if (status === "expired") return isZh ? "已過期" : "Expired";
  if (status === "cancelled") return isZh ? "已取消" : "Cancelled";
  if (status === "matched") return isZh ? "已配對" : "Matched";
  if (status === "public_voting") return isZh ? "公開投票中" : "Public Voting";
  return isZh ? "等待挑戰中" : "Waiting";
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function WaitingRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const queueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [row, setRow] = useState<QueueRoomRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [expireRequested, setExpireRequested] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      if (!isUuidLike(queueId)) {
        setError(isZh ? "這個等待場連結格式不正確。" : "This waiting room link is invalid.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("battle_queue")
        .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,audio_path,status,match_group_id,expires_at,created_at")
        .eq("id", queueId)
        .maybeSingle<QueueRoomRow>();

      if (!mounted) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError(isZh ? "這張戰帖已不存在或已被清除。" : "This battle card no longer exists.");
        setLoading(false);
        return;
      }

      if (data.match_group_id) {
        router.replace(`/battle/${encodeURIComponent(data.match_group_id)}?lang=${lang}`);
        return;
      }

      setRow(data);
      setLoading(false);

      if (data.audio_path) {
        const { data: signed } = await supabase.storage.from("battle-audio").createSignedUrl(data.audio_path, 60 * 60);
        if (mounted) setAudioUrl(signed?.signedUrl ?? null);
      }
    };

    void load();

    const channel = supabase
      .channel(`battle-waiting-room-${queueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "battle_queue", filter: `id=eq.${queueId}` }, (payload) => {
        const next = payload.new as QueueRoomRow;
        if (next?.match_group_id) {
          router.replace(`/battle/${encodeURIComponent(next.match_group_id)}?lang=${lang}`);
          return;
        }
        if (next?.id) setRow(next);
      })
      .subscribe();

    return () => {
      mounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [isZh, lang, queueId, router]);

  const expiresMs = useMemo(() => {
    if (!row?.expires_at) return NaN;
    return new Date(row.expires_at).getTime();
  }, [row?.expires_at]);
  const msLeft = Number.isFinite(expiresMs) ? expiresMs - now : 0;
  const isExpired = Boolean(row && (row.status === "expired" || row.status === "cancelled" || msLeft <= 0));
  const effectiveStatus = isExpired && row?.status !== "cancelled" ? "expired" : row?.status;

  useEffect(() => {
    if (!row || expireRequested || row.status === "expired" || row.status === "cancelled" || msLeft > 0) return;
    setExpireRequested(true);
    void fetch("/api/battle-pool/expire-open-cards", { method: "POST" });
  }, [expireRequested, msLeft, row]);

  const playTeaser = () => {
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.currentTime = 0;
    setPlaying(true);
    void audio.play().catch(() => setPlaying(false));
    window.setTimeout(() => {
      audio.pause();
      setPlaying(false);
    }, 5000);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-5 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_16%_12%,rgba(34,211,238,0.2),transparent_32%),radial-gradient(circle_at_78%_18%,rgba(255,106,0,0.2),transparent_30%),linear-gradient(180deg,#050505,#090807_58%,#050505)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href={`/battle?lang=${lang}`} className="rounded-full border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-300 transition hover:border-cyan-200/60 hover:text-white">
          AIPOGER Battle
        </Link>
        <LangToggle variant="inline" />
      </div>

      <div className="relative z-10 mx-auto mt-6 w-full max-w-5xl rounded-2xl border border-orange-300/35 bg-orange-500/12 px-5 py-4 text-center text-sm font-black text-orange-50 shadow-[0_0_34px_rgba(255,106,0,0.16)]">
        本頁已棄用，請直接進戰場
      </div>

      <section className="relative z-10 mx-auto mt-10 w-full max-w-5xl rounded-[2rem] border border-cyan-200/22 bg-black/72 p-6 shadow-[0_0_80px_rgba(0,203,255,0.12)] backdrop-blur md:p-8">
        {loading ? (
          <div className="py-24 text-center">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-cyan-100/70">DROP BATTLE WAITING ROOM</p>
            <h1 className="mt-4 text-3xl font-black">{isZh ? "正在讀取等待場…" : "Loading waiting room..."}</h1>
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <p className="text-sm font-bold text-red-100">{error}</p>
            <Link href={`/battle?lang=${lang}`} className="mt-5 inline-flex rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-black">
              {isZh ? "回鬥歌場" : "Back to Battle"}
            </Link>
          </div>
        ) : row ? (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.34em] text-cyan-100/70">DROP BATTLE WAITING ROOM</p>
              <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                {isZh ? "等待挑戰者進場" : "Waiting for challenger"}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-bold leading-8 text-zinc-300">
                {isExpired
                  ? isZh
                    ? "這張 Drop Battle 等待卡已結束，系統會把帳號消息改成已取消。你可以重新開一張新的戰帖。"
                    : "This waiting card has ended. You can open a new Drop Battle card."
                  : isZh
                    ? "你可以留在這裡等對手。有人接戰後會自動進入正式鬥歌場，開戰前可先聽 teaser。"
                    : "Stay here while waiting. Once a challenger joins, you will enter the battle room automatically."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/battle?lang=${lang}&focusQueue=${encodeURIComponent(row.id)}`} className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100">
                  {isZh ? "查看公開戰帖" : "View card"}
                </Link>
                <Link href={`/battle/setup?battleMode=instant&lang=${lang}`} className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-sm font-black text-zinc-200 transition hover:border-orange-200/50">
                  {isZh ? "重新開 Drop" : "Open new Drop"}
                </Link>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.045] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-200/80">{statusLabel(effectiveStatus, isZh)}</p>
                  <h2 className="mt-3 truncate text-2xl font-black text-white">{row.original_file_name || "Drop Battle"}</h2>
                  <p className="mt-2 text-sm font-bold text-zinc-400">
                    {row.fighter_name || "AIPOGER"} · {row.genre || "AI Music"} · {row.ai_tool || "AI Tool"}
                  </p>
                </div>
                <div className="rounded-full border border-orange-200/35 bg-orange-400/10 px-4 py-2 text-sm font-black text-orange-50">
                  {isExpired ? (isZh ? "已結束" : "Ended") : formatClock(msLeft)}
                </div>
              </div>

              <div className="mt-7 rounded-[1.25rem] border border-cyan-200/20 bg-cyan-300/[0.07] p-5 text-center">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-100/70">5S TEASER</p>
                <button
                  type="button"
                  onClick={playTeaser}
                  disabled={!audioUrl || isExpired || playing}
                  className="mt-4 w-full rounded-full bg-cyan-300 px-5 py-4 text-sm font-black text-black transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {playing ? (isZh ? "播放中…" : "Playing...") : isZh ? "播放 5 秒 Teaser" : "Play 5s Teaser"}
                </button>
                <p className="mt-3 text-xs font-bold leading-5 text-zinc-500">
                  {isZh ? "這裡只播放你自己的 Drop teaser；配到對手後，正式場會出現雙方 teaser。" : "This plays your teaser only. The battle room shows both teasers after matching."}
                </p>
              </div>

              {!isExpired ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link
                    href={`/battle/setup?battleMode=instant&challengeEntryId=${encodeURIComponent(row.id)}&genre=${encodeURIComponent(row.genre || "")}&lang=${lang}`}
                    className="rounded-full bg-orange-500 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-orange-300"
                  >
                    {isZh ? "我要挑戰" : "Challenge"}
                  </Link>
                  <Link
                    href={`/battle/invite/${encodeURIComponent(row.id)}?type=hook-card&lang=${lang}`}
                    className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 text-center text-sm font-black text-zinc-200 transition hover:border-cyan-200/60"
                  >
                    {isZh ? "分享戰帖" : "Share Card"}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
