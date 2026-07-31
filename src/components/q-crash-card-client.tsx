"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock3,
  Heart,
  LogIn,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Swords,
  X,
} from "lucide-react";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { battleShortPath } from "@/lib/share-short-links";
import { supabase } from "@/lib/supabase";

type Side = "A" | "B";
type VoteSide = "fighter_a" | "fighter_b";
type Work = {
  queueId: string;
  label: string;
  songName: string;
  creatorName: string;
  genre: string;
  aiTool: string | null;
  lyrics: string | null;
  durationSeconds: number | null;
  audioUrl: string | null;
  coverUrl: string | null;
  avatarUrl: string | null;
};
type QCrashPayload = {
  card: {
    id: string;
    battleId: string | null;
    status: string;
    durationMinutes: number;
    inviteExpiresAt: string;
    votingStartedAt: string | null;
    votingEndsAt: string | null;
    officialAudienceMin: number;
  };
  works: { A: Work; B: Work | null };
  viewer: {
    userId: string | null;
    isFounder: boolean;
    isInvited: boolean;
    isParticipant: boolean;
    canJoin: boolean;
    canVote: boolean;
    hasVoted: boolean;
    votedFor: VoteSide | null;
  };
  result: {
    official: boolean;
    winner: VoteSide | null;
    winnerQueueId: string | null;
    counts: Record<VoteSide, number> | null;
    audienceCount: number | null;
  } | null;
};

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function timeLeft(target: string | null | undefined) {
  const targetMs = new Date(target ?? "").getTime();
  if (!Number.isFinite(targetMs)) return 0;
  return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
}

function QCrashWorkCard(props: {
  side: Side;
  work: Work;
  active: boolean;
  playing: boolean;
  final: boolean;
  winner: boolean;
  selectedVote: boolean;
  canVote: boolean;
  votingBusy: boolean;
  isZh: boolean;
  onPlay: () => void;
  onVote: () => void;
}) {
  const {
    side,
    work,
    active,
    playing,
    final,
    winner,
    selectedVote,
    canVote,
    votingBusy,
    isZh,
    onPlay,
    onVote,
  } = props;
  const accent = side === "A" ? "orange" : "cyan";
  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-[1.75rem] border p-4 transition md:p-5 ${
        winner
          ? "border-yellow-300/70 bg-yellow-300/[0.08] shadow-[0_0_46px_rgba(253,224,71,0.17)]"
          : active
            ? side === "A"
              ? "border-orange-300/60 bg-orange-500/[0.09] shadow-[0_0_40px_rgba(249,115,22,0.14)]"
              : "border-cyan-300/60 bg-cyan-400/[0.08] shadow-[0_0_40px_rgba(34,211,238,0.12)]"
            : "border-white/12 bg-black/55"
      }`}
    >
      <div className="flex min-w-0 items-start gap-4">
        <button
          type="button"
          onClick={onPlay}
          aria-label={`${playing ? (isZh ? "暫停" : "Pause") : (isZh ? "播放" : "Play")} ${work.songName}`}
          className={`group relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border bg-zinc-950 sm:h-36 sm:w-36 ${
            side === "A" ? "border-orange-300/30" : "border-cyan-300/30"
          }`}
        >
          {work.coverUrl ? (
            <span
              className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-105"
              style={{ backgroundImage: `url("${work.coverUrl.replace(/"/g, "%22")}")` }}
            />
          ) : (
            <span className={`absolute inset-0 bg-[radial-gradient(circle_at_40%_35%,rgba(255,255,255,0.14),transparent_26%),linear-gradient(145deg,#171717,#050505)]`} />
          )}
          <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/10" />
          <span className={`absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-xl ${
            side === "A" ? "bg-orange-500" : "bg-cyan-500"
          }`}>
            {playing ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" className="ml-0.5" />}
          </span>
          <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-black">
            {work.durationSeconds ? `${Math.round(work.durationSeconds)}s` : "≤60s"}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black tracking-[0.18em] ${
              side === "A"
                ? "border-orange-300/40 bg-orange-400/10 text-orange-100"
                : "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
            }`}>
              {work.label.toUpperCase()}
            </span>
            {winner ? (
              <span className="rounded-full border border-yellow-200/50 bg-yellow-300/15 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] text-yellow-100">
                WINNER
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 break-words text-xl font-black leading-tight text-white sm:text-2xl">{work.songName}</h2>
          <p className="mt-2 truncate text-sm font-bold text-zinc-300">{work.creatorName}</p>
          <p className="mt-1 break-words text-xs font-bold leading-5 text-zinc-500">
            {work.genre}{work.aiTool ? ` · ${work.aiTool}` : ""}
          </p>
          <button
            type="button"
            onClick={onPlay}
            className={`mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${
              side === "A"
                ? "border-orange-300/35 text-orange-100 hover:bg-orange-400/10"
                : "border-cyan-300/35 text-cyan-100 hover:bg-cyan-300/10"
            }`}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
            {playing ? (isZh ? "暫停 Drop" : "Pause Drop") : (isZh ? "播放 Drop" : "Play Drop")}
          </button>
        </div>
      </div>

      {!final ? (
        <button
          type="button"
          disabled={!canVote || votingBusy || selectedVote}
          onClick={onVote}
          className={`mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-black transition ${
            selectedVote
              ? "border-green-300/40 bg-green-400/12 text-green-100"
              : canVote
                ? side === "A"
                  ? "border-orange-300/55 bg-orange-500/16 text-orange-50 hover:bg-orange-500/28"
                  : "border-cyan-300/55 bg-cyan-400/14 text-cyan-50 hover:bg-cyan-400/24"
                : "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600"
          }`}
        >
          {selectedVote ? <Check size={18} /> : <Heart size={18} fill={selectedVote ? "currentColor" : "none"} />}
          {selectedVote
            ? isZh ? "你已投這首" : "Your vote"
            : isZh ? `投給作品 ${side}` : `Vote Work ${side}`}
        </button>
      ) : null}
      <span className={`pointer-events-none absolute -right-12 top-7 h-px w-32 rotate-45 ${
        accent === "orange" ? "bg-orange-300/35" : "bg-cyan-300/35"
      }`} />
    </article>
  );
}

export default function QCrashCardClient({ identifier }: { identifier: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") === "en" ? "en" : "zh";
  const isZh = lang === "zh";
  const [payload, setPayload] = useState<QCrashPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentSide, setCurrentSide] = useState<Side | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [votingBusy, setVotingBusy] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPath = `${pathname}?lang=${lang}`;
  const load = useCallback(async () => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const response = await fetch(`/api/q-crash/${encodeURIComponent(identifier)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as (QCrashPayload & { error?: string }) | null;
    if (!response.ok || !data?.card) {
      setError(data?.error || (isZh ? "讀不到這張 Q Crash。" : "Could not load this Q Crash."));
      setLoading(false);
      return;
    }
    setPayload(data);
    setError(null);
    setSecondsLeft(timeLeft(data.card.status === "q_crash_pending_invite" ? data.card.inviteExpiresAt : data.card.votingEndsAt));
    setLoading(false);
  }, [identifier, isZh]);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!payload) return;
      const target = payload.card.status === "q_crash_pending_invite"
        ? payload.card.inviteExpiresAt
        : payload.card.votingEndsAt;
      const next = timeLeft(target);
      setSecondsLeft(next);
      if (next === 0 && payload.card.status === "q_crash_voting") void load();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [load, payload]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentSide]);

  const works = payload?.works;
  const currentWork = currentSide ? works?.[currentSide] ?? null : null;
  const final = payload?.card.status === "q_crash_finished" || payload?.card.status === "q_crash_insufficient";
  const pending = payload?.card.status === "q_crash_pending_invite";
  const voting = payload?.card.status === "q_crash_voting";
  const winnerQueueId = payload?.result?.winnerQueueId ?? null;
  const sharePath = payload?.card.battleId
    ? battleShortPath(payload.card.battleId, lang)
    : `/battle/q-crash/${payload?.card.id ?? identifier}?lang=${lang}`;

  const playSide = (side: Side) => {
    const work = works?.[side];
    if (!work?.audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (currentSide === side) {
      if (audio.paused) void audio.play();
      else audio.pause();
      return;
    }
    audio.pause();
    audio.src = work.audioUrl;
    audio.currentTime = 0;
    setCurrentSide(side);
    setCurrentTime(0);
    setDuration(work.durationSeconds ?? 0);
    void audio.play();
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentWork) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const switchSide = (direction: -1 | 1) => {
    if (!works?.B) return;
    const next: Side = currentSide === "A" ? "B" : currentSide === "B" ? "A" : direction > 0 ? "A" : "B";
    playSide(next);
  };

  const vote = async (votedFor: VoteSide) => {
    if (!payload) return;
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      rememberAuthNextPath(currentPath);
      router.push(`/auth?next=${encodeURIComponent(currentPath)}`);
      return;
    }
    setVotingBusy(true);
    setError(null);
    const response = await fetch(`/api/q-crash/${encodeURIComponent(payload.card.battleId || payload.card.id)}/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ votedFor }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error || (isZh ? "投票失敗，請稍後再試。" : "Vote failed. Try again."));
    } else {
      setPayload((current) => current ? {
        ...current,
        viewer: {
          ...current.viewer,
          canVote: false,
          hasVoted: true,
          votedFor,
        },
      } : current);
    }
    setVotingBusy(false);
  };

  const share = async () => {
    const url = new URL(sharePath, window.location.origin).toString();
    const title = works?.B
      ? `Q Crash｜${works.A.songName} VS ${works.B.songName}`
      : `Q Crash｜${works?.A.songName || "60s Drop"}`;
    const text = isZh
      ? "兩首 60 秒 Drop，不用等人到齊。進來聽重點，決定哪首歌勝出。"
      : "Two 60-second Drops. Listen in your own time and decide which work wins.";
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareNotice(isZh ? "分享連結已複製" : "Share link copied");
      }
    } catch {
      // The native share sheet may be dismissed.
    }
  };

  const cancelPending = async () => {
    if (!payload || !window.confirm(isZh ? "確定取消這張 Q Crash？取消後無法恢復。" : "Cancel this Q Crash?")) return;
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      rememberAuthNextPath(currentPath);
      router.push(`/auth?next=${encodeURIComponent(currentPath)}`);
      return;
    }
    const response = await fetch(`/api/q-crash/${encodeURIComponent(payload.card.id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error || (isZh ? "取消失敗。" : "Cancel failed."));
      return;
    }
    void load();
  };

  if (loading) {
    return <main className="min-h-screen bg-black p-8 pt-28 text-center text-sm font-black text-zinc-400">Q CRASH · LOADING</main>;
  }

  if (!payload || error && !payload) {
    return (
      <main className="min-h-screen bg-black px-5 pt-28 text-center text-white">
        <p className="text-lg font-black">{error || (isZh ? "找不到這張 Q Crash。" : "Q Crash not found.")}</p>
        <Link href={`/battle?lang=${lang}`} className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-3 font-black">
          {isZh ? "回鬥歌場" : "Back to Battle Pool"}
        </Link>
      </main>
    );
  }

  const result = payload.result;
  const voteActionEnabled = voting && !payload.viewer.isParticipant && !payload.viewer.hasVoted;
  const winnerWork = result?.winnerQueueId === payload.works.A.queueId
    ? payload.works.A
    : result?.winnerQueueId === payload.works.B?.queueId
      ? payload.works.B
      : null;
  const joinHref = `/battle/q-crash/new?lang=${lang}&join=${encodeURIComponent(payload.card.id)}`;
  const voteStatusCopy = payload.viewer.isParticipant
    ? isZh ? "作品持有人不能投票；分享同一張卡，邀請聽眾決定。" : "Work owners cannot vote. Share the same card with listeners."
    : payload.viewer.hasVoted
      ? isZh ? "你已投票，結果將在截止後公開。" : "You voted. Results appear after the deadline."
      : !payload.viewer.userId
        ? isZh ? "登入後才能投票；聽歌與分享保持開放。" : "Sign in to vote. Listening and sharing stay open."
        : isZh ? "先聽兩段 Drop，再把唯一一票投給作品。" : "Hear both Drops, then cast your one vote.";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_16%_12%,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(34,211,238,0.12),transparent_30%),#030303] px-4 pb-44 pt-24 text-white md:px-8">
      <audio ref={audioRef} preload="metadata" />
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/battle?lang=${lang}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 text-sm font-black text-zinc-200 transition hover:border-orange-300/50 hover:text-white"
          >
            <ArrowLeft size={17} />
            {isZh ? "回鬥歌場" : "Battle Pool"}
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/8 px-4 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/15"
            >
              <Share2 size={17} />
              {isZh ? "分享 Q Crash" : "Share Q Crash"}
            </button>
          </div>
        </div>

        <header className="mt-7 text-center">
          <p className="text-xs font-black tracking-[0.34em] text-orange-300">AIPOGER · ASYNC DROP BATTLE</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-0.05em] sm:text-7xl">Q CRASH</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-bold leading-6 text-zinc-400 sm:text-base">
            {isZh ? "兩首 60 秒 Drop，不用等人到齊，在自己的時間決定哪首歌勝出。" : "Two 60-second Drops. No waiting for everyone—decide in your own time."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-black ${
              voting ? "border-orange-300/40 bg-orange-400/10 text-orange-100" : final ? "border-yellow-300/40 bg-yellow-300/10 text-yellow-100" : "border-white/15 bg-white/[0.04] text-zinc-300"
            }`}>
              <Swords size={15} />
              {pending
                ? isZh ? "等待作品 B" : "Waiting for Work B"
                : voting
                  ? isZh ? "Q Crash 投票中" : "Q Crash Voting"
                  : payload.card.status === "q_crash_finished"
                    ? isZh ? "正式結果" : "Official Result"
                    : payload.card.status === "q_crash_insufficient"
                      ? isZh ? "觀眾不足" : "Insufficient Audience"
                      : isZh ? "Q Crash 已取消" : "Q Crash Cancelled"}
            </span>
            {(pending || voting) ? (
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-black/45 px-4 font-mono text-sm font-black text-white">
                <Clock3 size={15} className="text-cyan-300" />
                {formatClock(secondsLeft)}
              </span>
            ) : null}
          </div>
        </header>

        {final ? (
          <section className={`mx-auto mt-7 max-w-3xl rounded-[1.75rem] border p-5 text-center ${
            result?.official
              ? "border-yellow-300/40 bg-yellow-300/[0.08]"
              : "border-white/15 bg-white/[0.04]"
          }`}>
            {result?.official && winnerWork ? (
              <>
                <p className="text-xs font-black tracking-[0.24em] text-yellow-200">WORK WINS</p>
                <h2 className="mt-3 text-3xl font-black">{winnerWork.songName}</h2>
                <p className="mt-2 font-bold text-zinc-300">
                  {isZh ? `作品勝出｜創作者：${winnerWork.creatorName}` : `Winning work · Creator: ${winnerWork.creatorName}`}
                </p>
                <p className="mt-3 text-sm font-black text-zinc-400">
                  {result.counts?.fighter_a ?? 0} : {result.counts?.fighter_b ?? 0}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-black tracking-[0.24em] text-zinc-400">NO OFFICIAL RESULT</p>
                <h2 className="mt-3 text-2xl font-black">{isZh ? "觀眾不足，這場 Q Crash 未成立" : "Not enough listeners to establish this Q Crash"}</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">
                  {isZh
                    ? `需要至少 ${payload.card.officialAudienceMin} 位非參賽登入觀眾；本場不算勝敗、不進 Showtime。`
                    : `At least ${payload.card.officialAudienceMin} signed-in non-participants are required. No stats or Showtime progress.`}
                </p>
              </>
            )}
          </section>
        ) : null}

        <section className="relative mt-8 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
          <QCrashWorkCard
            side="A"
            work={works!.A}
            active={currentSide === "A"}
            playing={currentSide === "A" && playing}
            final={Boolean(final)}
            winner={winnerQueueId === works!.A.queueId}
            selectedVote={payload.viewer.votedFor === "fighter_a"}
            canVote={voteActionEnabled}
            votingBusy={votingBusy}
            isZh={isZh}
            onPlay={() => playSide("A")}
            onVote={() => void vote("fighter_a")}
          />

          <div className="flex items-center justify-center py-1 md:px-1">
            <span className="rounded-full border border-white/15 bg-black/80 px-4 py-2 text-lg font-black italic text-white shadow-[0_0_30px_rgba(249,115,22,0.16)] md:px-3 md:py-5 md:text-xl">
              VS
            </span>
          </div>

          {works!.B ? (
            <QCrashWorkCard
              side="B"
              work={works!.B}
              active={currentSide === "B"}
              playing={currentSide === "B" && playing}
              final={Boolean(final)}
              winner={winnerQueueId === works!.B.queueId}
              selectedVote={payload.viewer.votedFor === "fighter_b"}
              canVote={voteActionEnabled}
              votingBusy={votingBusy}
              isZh={isZh}
              onPlay={() => playSide("B")}
              onVote={() => void vote("fighter_b")}
            />
          ) : (
            <article className="flex min-h-64 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-cyan-300/30 bg-cyan-300/[0.04] p-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-300/10 text-2xl font-black text-cyan-100">B</span>
              <h2 className="mt-4 text-xl font-black">{isZh ? "等待第二首 Drop" : "Waiting for the second Drop"}</h2>
              <p className="mt-2 max-w-sm text-sm font-bold leading-6 text-zinc-400">
                {isZh ? "可以放自己的另一個版本，也可以把這張邀請傳給朋友。" : "Add another version of your own, or send this invite to a friend."}
              </p>
              {payload.card.status === "q_crash_pending_invite" ? (
                payload.viewer.userId && !payload.viewer.canJoin ? (
                  <button
                    type="button"
                    disabled
                    className="mt-5 inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-2xl bg-zinc-800 px-5 text-sm font-black text-zinc-500"
                  >
                    <Swords size={18} />
                    {isZh ? "目前無法加入" : "Unavailable"}
                  </button>
                ) : (
                  <Link
                    href={joinHref}
                    className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-cyan-500 px-5 text-sm font-black text-black shadow-[0_0_28px_rgba(34,211,238,0.22)]"
                  >
                    {payload.viewer.userId ? <Swords size={18} /> : <LogIn size={18} />}
                    {payload.viewer.userId ? (isZh ? "放入作品 B" : "Add Work B") : (isZh ? "登入並加入" : "Sign in to join")}
                  </Link>
                )
              ) : null}
            </article>
          )}
        </section>

        {!final && works?.B ? (
          <section className="mt-5 rounded-2xl border border-white/10 bg-black/50 px-4 py-4 text-center">
            <p className="text-sm font-black text-zinc-200">{voteStatusCopy}</p>
            <p className="mt-1 text-xs font-bold text-zinc-500">
              {isZh ? "投票期間不顯示票數、百分比或領先作品，所有人看到的規則相同。" : "No tallies, percentages, or leader signals appear before the deadline—for anyone."}
            </p>
          </section>
        ) : null}

        {pending ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void share()}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-orange-500 px-5 text-sm font-black text-white"
            >
              <Share2 size={18} />
              {isZh ? "分享邀請連結" : "Share Invite Link"}
            </button>
            {payload.viewer.isFounder ? (
              <button
                type="button"
                onClick={() => void cancelPending()}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-red-300/30 bg-red-500/8 px-5 text-sm font-black text-red-100"
              >
                <X size={18} />
                {isZh ? "取消 Q Crash" : "Cancel Q Crash"}
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-center text-sm font-black text-red-100">{error}</p>
        ) : null}
        {shareNotice ? (
          <p className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full border border-cyan-200/30 bg-zinc-950 px-4 py-2 text-xs font-black text-cyan-100 shadow-2xl">
            {shareNotice}
          </p>
        ) : null}
      </div>

      {currentWork ? (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-4xl rounded-[1.4rem] border border-white/15 bg-zinc-950/95 p-3 shadow-[0_0_50px_rgba(0,0,0,0.75)] backdrop-blur md:inset-x-6 md:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => switchSide(-1)} disabled={!works?.B} aria-label={isZh ? "上一首" : "Previous"}>
              <SkipBack size={19} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${currentSide === "A" ? "bg-orange-500" : "bg-cyan-500 text-black"}`}
              aria-label={playing ? (isZh ? "暫停" : "Pause") : (isZh ? "播放" : "Play")}
            >
              {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" className="ml-0.5" />}
            </button>
            <button type="button" onClick={() => switchSide(1)} disabled={!works?.B} aria-label={isZh ? "下一首" : "Next"}>
              <SkipForward size={19} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="truncate text-xs font-black text-white">{currentWork.songName} · {currentWork.creatorName}</p>
                <span className="shrink-0 font-mono text-[10px] font-black text-zinc-500">{formatClock(currentTime)} / {formatClock(duration)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.05}
                value={Math.min(currentTime, Math.max(duration, 0.01))}
                onChange={(event) => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  audio.currentTime = Number(event.target.value);
                }}
                className="mt-2 h-1.5 w-full accent-orange-500"
                aria-label={isZh ? "播放進度" : "Playback progress"}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                audioRef.current?.pause();
                setCurrentSide(null);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400"
              aria-label={isZh ? "關閉播放器" : "Close player"}
            >
              <X size={17} />
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
