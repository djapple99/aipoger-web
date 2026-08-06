"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ComponentType } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Blocks,
  Check,
  Clock3,
  ExternalLink,
  FileText,
  Flame,
  Heart,
  HeartPulse,
  LogIn,
  MessageCircle,
  MicVocal,
  Music2,
  Pause,
  Play,
  Share2,
  SkipBack,
  SkipForward,
  Swords,
  Volume2,
  X,
} from "lucide-react";
import {
  Q_CRASH_COMMENT_MAX_LENGTH,
  Q_CRASH_FEEDBACK_KEYS,
  emptyQCrashFeedbackCounts,
  qCrashDisplayLang,
  type QCrashFeedbackCounts,
  type QCrashFeedbackKey,
} from "@/lib/q-crash-rules";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { logQCrashAnalyticsStage, type QCrashAnalyticsStage } from "@/lib/analytics-client";
import {
  clearQCrashVoteDraft,
  readQCrashVoteDraft,
  rememberQCrashVoteDraft,
} from "@/lib/q-crash-vote-draft";
import { battleShortPath } from "@/lib/share-short-links";
import { supabase } from "@/lib/supabase";

type Side = "A" | "B";
type VoteSide = "fighter_a" | "fighter_b";
type FeedbackSelection = Record<Side, QCrashFeedbackKey[]>;
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
  fullSongUrl: string | null;
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
  feedback: {
    available: boolean;
    canSubmit: boolean;
    selected: FeedbackSelection;
    counts: Record<Side, QCrashFeedbackCounts> | null;
  };
  result: {
    official: boolean;
    winner: VoteSide | null;
    winnerQueueId: string | null;
    counts: Record<VoteSide, number> | null;
    audienceCount: number | null;
  } | null;
};
type QCrashComment = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
};
type QCrashCommentsPayload = {
  available: boolean;
  revealed: boolean;
  canComment: boolean;
  viewerComment: QCrashComment | null;
  comments: QCrashComment[];
};
type QCrashPostResultPreferencePayload = {
  available: boolean;
  counts: Record<VoteSide, number>;
  viewerChoice: VoteSide | null;
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

const feedbackItems: Array<{
  key: QCrashFeedbackKey;
  zh: string;
  en: string;
  Icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}> = [
  { key: "rhyme", zh: "押韻", en: "Rhyme", Icon: MicVocal },
  { key: "impact", zh: "爆點", en: "Impact", Icon: Flame },
  { key: "melody", zh: "旋律", en: "Melody", Icon: Music2 },
  { key: "emotion", zh: "情緒", en: "Emotion", Icon: HeartPulse },
  { key: "structure", zh: "結構", en: "Structure", Icon: Blocks },
];

function radarPoint(index: number, total: number, radius: number, cx = 100, cy = 100) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / total;
  return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
}

function radarPolygon(counts: QCrashFeedbackCounts, radius = 66) {
  const max = Math.max(...Q_CRASH_FEEDBACK_KEYS.map((key) => counts[key]), 1);
  return Q_CRASH_FEEDBACK_KEYS.map((key, index) => {
    const valueRadius = counts[key] === 0 ? 0 : Math.max(12, (counts[key] / max) * radius);
    return radarPoint(index, Q_CRASH_FEEDBACK_KEYS.length, valueRadius);
  }).join(" ");
}

function FeedbackRadar({ counts, isZh }: { counts: QCrashFeedbackCounts; isZh: boolean }) {
  const id = useId().replace(/:/g, "");
  const total = Q_CRASH_FEEDBACK_KEYS.reduce((sum, key) => sum + counts[key], 0);
  const labels = Object.fromEntries(feedbackItems.map((item) => [item.key, isZh ? item.zh : item.en])) as Record<QCrashFeedbackKey, string>;
  return (
    <div className="mt-4">
      <svg viewBox="0 0 200 200" className="mx-auto h-48 w-48 overflow-visible" role="img" aria-label={isZh ? "勝出作品五角評分分布" : "Winning work five-axis feedback distribution"}>
        <defs>
          <linearGradient id={`qCrashRadar-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.52" />
          </linearGradient>
        </defs>
        {[0.34, 0.67, 1].map((ring) => (
          <polygon
            key={ring}
            points={Q_CRASH_FEEDBACK_KEYS.map((_, index) => radarPoint(index, Q_CRASH_FEEDBACK_KEYS.length, 66 * ring)).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
          />
        ))}
        {Q_CRASH_FEEDBACK_KEYS.map((_, index) => {
          const point = radarPoint(index, Q_CRASH_FEEDBACK_KEYS.length, 66);
          return <line key={index} x1="100" y1="100" x2={point.split(",")[0]} y2={point.split(",")[1]} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
        })}
        <polygon
          points={radarPolygon(counts)}
          fill={`url(#qCrashRadar-${id})`}
          fillOpacity={total > 0 ? 0.42 : 0}
          stroke="#fb923c"
          strokeWidth="2"
        />
        {Q_CRASH_FEEDBACK_KEYS.map((key, index) => {
          const [x, y] = radarPoint(index, Q_CRASH_FEEDBACK_KEYS.length, 88).split(",").map(Number);
          return (
            <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#d4d4d8" fontSize="10" fontWeight="800">
              {labels[key]} {counts[key]}
            </text>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[11px] font-bold text-zinc-500">
        {total > 0
          ? isZh ? `五項感受共 ${total} 次` : `${total} total feedback taps`
          : isZh ? "本場尚無五項感受資料" : "No feedback data for this battle"}
      </p>
    </div>
  );
}

function QCrashCommentsPanel(props: {
  data: QCrashCommentsPayload | null;
  error: string | null;
  isZh: boolean;
}) {
  const { data, error, isZh } = props;
  return (
    <section className="mt-4 overflow-hidden rounded-[1.35rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.08),transparent_28%),rgba(0,0,0,0.62)] px-4 py-4 md:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-white">
            <MessageCircle size={17} className="text-cyan-300" />
            {isZh ? "投票評論" : "Voter Comments"}
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-zinc-500">
            {isZh ? "評論在投票確認時選填；送出後不能修改，截止後才會與結果一起公開。" : "Comments are optional at vote confirmation, locked after submission, and revealed with the result."}
          </p>
        </div>
        {data?.revealed ? (
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/8 px-3 py-1 text-[10px] font-black tracking-[0.16em] text-cyan-100">
            {isZh ? "已隨結果公開" : "REVEALED"}
          </span>
        ) : null}
      </div>

      {!data ? (
        <p className="mt-4 text-xs font-bold text-zinc-600">{isZh ? "正在讀取評論…" : "Loading comments…"}</p>
      ) : !data.available ? (
        <p className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs font-bold text-zinc-500">
          {isZh ? "評論功能準備中。" : "Comments are being prepared."}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-red-300/25 bg-red-500/8 px-3 py-2 text-xs font-black text-red-100">{error}</p>
      ) : null}

      {data?.available && !data.revealed ? (
        <div className="mt-4 rounded-xl border border-cyan-300/18 bg-cyan-300/[0.04] px-3 py-3 text-xs font-bold leading-5 text-zinc-300">
          <span className="font-black text-cyan-200">{isZh ? "評論已鎖定：" : "Comment locked: "}</span>
          {isZh ? "投票送出後不能再新增、修改或刪除；請等截止後查看公開內容。" : "No new, edited, or deleted comments are allowed after voting. Check back after settlement."}
        </div>
      ) : null}

      {data?.available && data.revealed ? (
        <div className="mt-5 border-t border-white/8 pt-4">
          {data.comments.length > 0 ? (
            <ul className="space-y-3">
              {data.comments.map((comment) => (
                <li key={comment.id} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-3 py-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/8 bg-cover bg-center text-xs font-black text-cyan-100"
                    style={comment.avatarUrl ? { backgroundImage: `url("${comment.avatarUrl.replace(/"/g, "%22")}")` } : undefined}
                  >
                    {comment.avatarUrl ? null : comment.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-zinc-300">{comment.displayName}{comment.isMine ? (isZh ? " · 你" : " · You") : ""}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-zinc-100">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-xs font-bold text-zinc-600">{isZh ? "這場還沒有觀眾短評。" : "No voter comments yet."}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function QCrashWorkCard(props: {
  side: Side;
  work: Work;
  active: boolean;
  playing: boolean;
  final: boolean;
  winner: boolean;
  selectedVote: boolean;
  submittedVote: boolean;
  canVote: boolean;
  votingBusy: boolean;
  isZh: boolean;
  onPlay: () => void;
  onLyrics: () => void;
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
    submittedVote,
    canVote,
    votingBusy,
    isZh,
    onPlay,
    onLyrics,
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
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onPlay}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${
                side === "A"
                  ? "border-orange-300/35 text-orange-100 hover:bg-orange-400/10"
                  : "border-cyan-300/35 text-cyan-100 hover:bg-cyan-300/10"
              }`}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? (isZh ? "暫停" : "Pause") : (isZh ? "播放" : "Play")}
            </button>
            <button
              type="button"
              onClick={onLyrics}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-xs font-black text-zinc-200 transition hover:border-white/35 hover:text-white"
            >
              <FileText size={15} />
              {isZh ? "查看歌詞" : "Lyrics"}
            </button>
            {final && work.fullSongUrl ? (
              <a
                href={work.fullSongUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-yellow-200/35 bg-yellow-300/[0.08] px-4 text-xs font-black text-yellow-100 transition hover:border-yellow-100/70 hover:bg-yellow-300/15"
              >
                <ExternalLink size={15} />
                {isZh ? "聽完整版本" : "Listen Full Version"}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {!final ? (
        <button
          type="button"
          disabled={!canVote || votingBusy || submittedVote}
          onClick={onVote}
          aria-pressed={selectedVote}
          className={`mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-black transition ${
            submittedVote
              ? "border-green-300/40 bg-green-400/12 text-green-100"
              : selectedVote
                ? side === "A"
                  ? "border-orange-200 bg-orange-500/28 text-orange-50 shadow-[0_0_24px_rgba(249,115,22,0.14)]"
                  : "border-cyan-200 bg-cyan-400/24 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
              : canVote
                ? side === "A"
                  ? "border-orange-300/55 bg-orange-500/16 text-orange-50 hover:bg-orange-500/28"
                  : "border-cyan-300/55 bg-cyan-400/14 text-cyan-50 hover:bg-cyan-400/24"
                : "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-600"
          }`}
        >
          {selectedVote ? <Check size={18} /> : <Heart size={18} />}
          {submittedVote
            ? isZh ? "你已投這首" : "Your submitted vote"
            : selectedVote
              ? isZh ? `已選作品 ${side}` : `Work ${side} selected`
              : isZh ? `選擇作品 ${side}` : `Select Work ${side}`}
        </button>
      ) : null}
      <span className={`pointer-events-none absolute -right-12 top-7 h-px w-32 rotate-45 ${
        accent === "orange" ? "bg-orange-300/35" : "bg-cyan-300/35"
      }`} />
    </article>
  );
}

export default function QCrashCardClient({ identifier }: { identifier: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = qCrashDisplayLang(searchParams.get("lang"));
  const isZh = lang === "zh";
  const [payload, setPayload] = useState<QCrashPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentSide, setCurrentSide] = useState<Side | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [pendingVote, setPendingVote] = useState<VoteSide | null>(null);
  const [listenedSides, setListenedSides] = useState<Record<Side, boolean>>({ A: false, B: false });
  const [votingBusy, setVotingBusy] = useState(false);
  const [feedbackSide, setFeedbackSide] = useState<Side>("A");
  const [feedbackBusy, setFeedbackBusy] = useState<QCrashFeedbackKey | null>(null);
  const [lyricsSide, setLyricsSide] = useState<Side | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [commentsPayload, setCommentsPayload] = useState<QCrashCommentsPayload | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [postResultPreference, setPostResultPreference] = useState<QCrashPostResultPreferencePayload | null>(null);
  const [postResultPreferenceBusy, setPostResultPreferenceBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyticsSentRef = useRef(new Set<string>());
  const restoredDraftKeyRef = useRef<string | null>(null);
  const listenedSidesRef = useRef<Record<Side, boolean>>({ A: false, B: false });
  const listenSecondsRef = useRef<Record<Side, number>>({ A: 0, B: 0 });

  const currentPath = `${pathname}?lang=${lang}`;
  const draftKey = payload?.card.battleId || payload?.card.id || null;
  const trackStage = useCallback((stage: QCrashAnalyticsStage, side?: Side) => {
    if (!payload?.card.battleId || payload.card.status !== "q_crash_voting") return;
    const key = `${payload.card.battleId}:${stage}:${side ?? "both"}`;
    if (analyticsSentRef.current.has(key)) return;
    analyticsSentRef.current.add(key);
    void logQCrashAnalyticsStage({
      stage,
      side,
      battleId: payload.card.battleId,
      cardId: payload.card.id,
      workA: payload.works.A.songName,
      workB: payload.works.B?.songName,
    });
  }, [payload]);

  const redirectToAuth = useCallback(() => {
    rememberAuthNextPath(currentPath);
    window.location.assign(`/auth?next=${encodeURIComponent(currentPath)}`);
  }, [currentPath]);
  const loadComments = useCallback(async (targetId: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const response = await fetch(`/api/q-crash/${encodeURIComponent(targetId)}/comments`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as (QCrashCommentsPayload & { error?: string }) | null;
    if (!response.ok || !data) {
      setCommentError(data?.error || (isZh ? "評論讀取失敗。" : "Could not load comments."));
      return;
    }
    setCommentsPayload(data);
    setCommentError(null);
  }, [isZh]);
  const loadPostResultPreference = useCallback(async (targetId: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const response = await fetch(`/api/q-crash/${encodeURIComponent(targetId)}/post-result-preference`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as (QCrashPostResultPreferencePayload & { error?: string }) | null;
    if (!response.ok || !data) return;
    setPostResultPreference(data);
  }, []);

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
    if (data.card.battleId) void loadComments(data.card.battleId);
    else setCommentsPayload(null);
    if (data.result?.official && data.card.battleId) void loadPostResultPreference(data.card.battleId);
    else setPostResultPreference(null);
    setLoading(false);
  }, [identifier, isZh, loadComments, loadPostResultPreference]);

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

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!payload || !draftKey) return;
    const draftAllowed = payload.card.status === "q_crash_voting" && !payload.viewer.hasVoted && !payload.viewer.isParticipant;
    if (!draftAllowed) {
      clearQCrashVoteDraft(draftKey);
      setPendingVote(null);
      setCommentText("");
      setListenedSides({ A: false, B: false });
      listenedSidesRef.current = { A: false, B: false };
      listenSecondsRef.current = { A: 0, B: 0 };
      restoredDraftKeyRef.current = draftKey;
      return;
    }
    if (restoredDraftKeyRef.current === draftKey) return;
    const draft = readQCrashVoteDraft(draftKey);
    const restoredListened = draft?.listened ?? { A: false, B: false };
    setPendingVote(draft?.vote ?? null);
    setCommentText(draft?.comment ?? "");
    setListenedSides(restoredListened);
    listenedSidesRef.current = restoredListened;
    listenSecondsRef.current = {
      A: restoredListened.A ? 5 : 0,
      B: restoredListened.B ? 5 : 0,
    };
    restoredDraftKeyRef.current = draftKey;
    if (restoredListened.A) trackStage("listen_qualified", "A");
    if (restoredListened.B) trackStage("listen_qualified", "B");
    if (restoredListened.A && restoredListened.B) trackStage("both_listened");
  }, [draftKey, payload, trackStage]);

  useEffect(() => {
    trackStage("open");
  }, [trackStage]);

  useEffect(() => {
    if (!playing || !currentSide || !draftKey || payload?.card.status !== "q_crash_voting") return;
    const side = currentSide;
    const timer = window.setInterval(() => {
      listenSecondsRef.current[side] += 0.5;
      if (listenSecondsRef.current[side] < 5 || listenedSidesRef.current[side]) return;

      const next = { ...listenedSidesRef.current, [side]: true };
      listenedSidesRef.current = next;
      setListenedSides(next);
      rememberQCrashVoteDraft(draftKey, { listened: next }, payload.card.votingEndsAt);
      trackStage("listen_qualified", side);
      if (next.A && next.B) trackStage("both_listened");
    }, 500);
    return () => window.clearInterval(timer);
  }, [currentSide, draftKey, payload?.card.status, payload?.card.votingEndsAt, playing, trackStage]);

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
    trackStage("play", side);
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

  const selectPendingVote = (votedFor: VoteSide) => {
    setPendingVote(votedFor);
    if (draftKey) {
      rememberQCrashVoteDraft(draftKey, { vote: votedFor }, payload?.card.votingEndsAt);
    }
    trackStage("selected", votedFor === "fighter_a" ? "A" : "B");
  };

  const submitVote = async () => {
    if (!payload || !pendingVote || votingBusy) return;
    const votedFor = pendingVote;
    const normalizedComment = commentText.trim();
    if (Array.from(normalizedComment).length > Q_CRASH_COMMENT_MAX_LENGTH) {
      setError(isZh ? `評論請保持在 ${Q_CRASH_COMMENT_MAX_LENGTH} 字內。` : `Keep the comment within ${Q_CRASH_COMMENT_MAX_LENGTH} characters.`);
      return;
    }
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      if (draftKey) rememberQCrashVoteDraft(draftKey, { vote: votedFor, comment: normalizedComment }, payload.card.votingEndsAt);
      trackStage("auth_required", votedFor === "fighter_a" ? "A" : "B");
      redirectToAuth();
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
      body: JSON.stringify({ votedFor, confirmed: true, comment: normalizedComment || null }),
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
      setPendingVote(null);
      setCommentText("");
      if (draftKey) clearQCrashVoteDraft(draftKey);
      trackStage("submitted", votedFor === "fighter_a" ? "A" : "B");
    }
    setVotingBusy(false);
  };

  const submitFeedback = async (key: QCrashFeedbackKey) => {
    if (!payload || !works?.[feedbackSide]) return;
    if (payload.feedback.selected[feedbackSide].includes(key)) return;
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      redirectToAuth();
      return;
    }
    setFeedbackBusy(key);
    setError(null);
    const response = await fetch(`/api/q-crash/${encodeURIComponent(payload.card.battleId || payload.card.id)}/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        queueId: works[feedbackSide]!.queueId,
        feedbackKey: key,
      }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(data?.error || (isZh ? "評分失敗，請稍後再試。" : "Feedback failed. Try again."));
    } else {
      setPayload((current) => current ? {
        ...current,
        feedback: {
          ...current.feedback,
          selected: {
            ...current.feedback.selected,
            [feedbackSide]: [...current.feedback.selected[feedbackSide], key],
          },
        },
      } : current);
    }
    setFeedbackBusy(null);
  };

  const submitPostResultPreference = async (preferredSide: VoteSide) => {
    if (!payload?.card.battleId || !payload.result?.official || postResultPreferenceBusy) return;
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.access_token) {
      redirectToAuth();
      return;
    }
    setPostResultPreferenceBusy(true);
    setError(null);
    const response = await fetch(`/api/q-crash/${encodeURIComponent(payload.card.battleId)}/post-result-preference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ preferredSide }),
    });
    const data = (await response.json().catch(() => null)) as (QCrashPostResultPreferencePayload & { error?: string }) | null;
    if (!response.ok || !data) {
      setError(data?.error || (isZh ? "喜好送出失敗，請稍後再試。" : "Could not save your preference."));
    } else {
      setPostResultPreference(data);
    }
    setPostResultPreferenceBusy(false);
  };

  const share = async () => {
    const url = new URL(sharePath, window.location.origin).toString();
    const title = works?.B
      ? `幫我選一下：${works.A.songName} VS ${works.B.songName}`
      : `來幫我找另一首：${works?.A.songName || "60 秒 Drop"}`;
    const text = isZh
      ? works?.B
        ? "這兩首歌到底哪首比較好聽啊？我有點選不出來！兩首 60 秒 Drop，進來聽重點，幫我決定哪首勝出！"
        : "我先放了一首 60 秒 Drop，來幫我找另一首一起比一下！"
      : works?.B
        ? "Which song sounds better? I can't decide! Two 60-second Drops—listen to the key moments and help me pick a winner."
        : "I have one 60-second Drop ready. Help me find another track to compare it with.";
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
      redirectToAuth();
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
  const winnerSide: Side | null = result?.winner === "fighter_a" ? "A" : result?.winner === "fighter_b" ? "B" : null;
  const winnerFeedback = winnerSide && payload.feedback.counts
    ? payload.feedback.counts[winnerSide]
    : emptyQCrashFeedbackCounts();
  const joinHref = `/battle/q-crash/new?lang=${lang}&join=${encodeURIComponent(payload.card.id)}`;
  const voteStatusCopy = payload.viewer.isParticipant
    ? isZh ? "作品持有人不能投票；分享同一張卡，邀請聽眾決定。" : "Work owners cannot vote. Share the same card with listeners."
    : payload.viewer.hasVoted
      ? isZh ? "你已投票；若有填寫評論，會在截止後與結果一起公開。" : "Your vote is locked. Any comment you added will be revealed with the result."
      : pendingVote
        ? isZh ? `目前選擇作品 ${pendingVote === "fighter_a" ? "A" : "B"}，尚未送出。` : `Work ${pendingVote === "fighter_a" ? "A" : "B"} is selected but not submitted.`
      : !payload.viewer.userId
        ? isZh ? "可先選 A／B；按確定送出時會請你登入。" : "Select A or B first. You will sign in when you confirm."
        : isZh ? "可重播、快轉並切換選擇；按確定後才會送出票。" : "Replay, seek, and switch your choice. Your vote is sent only after confirmation.";

  return (
    <main className={`min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_14%_8%,rgba(249,115,22,0.1),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(34,211,238,0.07),transparent_26%),#020202] px-4 pt-20 text-white md:px-8 ${voteActionEnabled ? "pb-[30rem] md:pb-96" : "pb-52"}`}>
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

        <header className="mt-5 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black tracking-[0.3em] text-orange-300">AIPOGER · ASYNC DROP BATTLE</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">Q CRASH</h1>
              <p className="text-xs font-bold text-zinc-500 sm:text-sm">
                {isZh ? "兩首 60 秒 Drop，聽完再決定哪首勝出。" : "Two 60-second Drops. Listen, then choose the winner."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
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

        <div className={`mt-6 grid min-w-0 gap-4 ${works?.B ? "xl:grid-cols-[minmax(0,1fr)_17rem]" : ""}`}>
          <div className="min-w-0">
            <section className="relative grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
              <QCrashWorkCard
                side="A"
                work={works!.A}
                active={currentSide === "A"}
                playing={currentSide === "A" && playing}
                final={Boolean(final)}
                winner={winnerQueueId === works!.A.queueId}
                selectedVote={pendingVote === "fighter_a" || payload.viewer.votedFor === "fighter_a"}
                submittedVote={payload.viewer.votedFor === "fighter_a"}
                canVote={voteActionEnabled}
                votingBusy={votingBusy}
                isZh={isZh}
                onPlay={() => playSide("A")}
                onLyrics={() => setLyricsSide((current) => current === "A" ? null : "A")}
                onVote={() => selectPendingVote("fighter_a")}
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
                  selectedVote={pendingVote === "fighter_b" || payload.viewer.votedFor === "fighter_b"}
                  submittedVote={payload.viewer.votedFor === "fighter_b"}
                  canVote={voteActionEnabled}
                  votingBusy={votingBusy}
                  isZh={isZh}
                  onPlay={() => playSide("B")}
                  onLyrics={() => setLyricsSide((current) => current === "B" ? null : "B")}
                  onVote={() => selectPendingVote("fighter_b")}
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

            {lyricsSide && works?.[lyricsSide] ? (
              <section className={`relative mt-4 overflow-hidden rounded-[1.35rem] border bg-black/80 px-5 py-4 ${
                lyricsSide === "A" ? "border-orange-300/30" : "border-cyan-300/30"
              }`} aria-label={isZh ? `作品 ${lyricsSide} 歌詞` : `Work ${lyricsSide} lyrics`}>
                <button
                  type="button"
                  onClick={() => setLyricsSide(null)}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:text-white"
                  aria-label={isZh ? "關閉歌詞" : "Close lyrics"}
                >
                  <X size={17} />
                </button>
                <p className={`text-[10px] font-black tracking-[0.24em] ${lyricsSide === "A" ? "text-orange-300" : "text-cyan-300"}`}>
                  {isZh ? `作品 ${lyricsSide} 歌詞` : `WORK ${lyricsSide} LYRICS`}
                </p>
                <h2 className="mt-2 pr-12 text-lg font-black text-white">{works[lyricsSide]!.songName}</h2>
                <div className="mt-4 max-h-60 overflow-y-auto whitespace-pre-wrap pr-3 text-sm font-bold leading-7 text-zinc-300 [scrollbar-color:rgba(249,115,22,0.7)_rgba(255,255,255,0.06)]">
                  {works[lyricsSide]!.lyrics?.trim() || (isZh ? "歌詞未提供" : "No lyrics provided")}
                </div>
              </section>
            ) : null}

            {!final && works?.B ? (
              <section className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/55 px-4 py-4 text-center">
                <p className="text-sm font-black text-zinc-200">{voteStatusCopy}</p>
                <p className="mt-1 text-xs font-bold text-zinc-500">
                  {isZh ? "勝負票與五項感受分開；截止前不顯示票數、評分總和或領先作品。" : "Winner votes and feedback are separate. No totals or leader signals appear before the deadline."}
                </p>
                {voteActionEnabled ? (
                  <div className="mx-auto mt-4 grid max-w-xl grid-cols-3 gap-2 text-[11px] font-black sm:text-xs">
                    <span className={`rounded-xl border px-2 py-2 ${listenedSides.A ? "border-orange-300/40 bg-orange-400/10 text-orange-100" : "border-white/8 text-zinc-600"}`}>
                      {listenedSides.A ? "✓" : "1"} · {isZh ? "聽作品 A" : "Listen A"}
                    </span>
                    <span className={`rounded-xl border px-2 py-2 ${listenedSides.B ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/8 text-zinc-600"}`}>
                      {listenedSides.B ? "✓" : "2"} · {isZh ? "聽作品 B" : "Listen B"}
                    </span>
                    <span className={`rounded-xl border px-2 py-2 ${pendingVote ? "border-white/25 bg-white/[0.06] text-white" : "border-white/8 text-zinc-600"}`}>
                      {pendingVote ? "✓" : "3"} · {isZh ? "選擇並確定" : "Choose & confirm"}
                    </span>
                  </div>
                ) : null}
                {voteActionEnabled ? (
                  <p className="mt-2 text-[11px] font-bold text-zinc-600">
                    {isZh ? "送出前可繼續重播、快轉或改選；送出後無法更改。" : "Replay, seek, or switch before submitting. A submitted vote cannot be changed."}
                  </p>
                ) : null}
              </section>
            ) : null}

            {works?.B && final ? (
              <QCrashCommentsPanel
                data={commentsPayload}
                error={commentError}
                isZh={isZh}
              />
            ) : null}

            {final && result?.official && works?.B ? (
              <section className="mt-4 rounded-[1.35rem] border border-cyan-300/25 bg-cyan-300/[0.045] px-4 py-4 md:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-cyan-50">{isZh ? "結果公布後，你比較喜歡哪首？" : "Now that the result is out, which one do you prefer?"}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-zinc-500">
                      {isZh ? "這是結算後的獨立喜好，不會改變正式勝負、票數或五角評分。登入後可選，也可以回來改選。" : "This is a separate post-result signal. It never changes the official winner, votes, or five-axis feedback. Sign in to choose, and you can change it later."}
                    </p>
                  </div>
                  {postResultPreference?.available === false ? (
                    <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-black text-zinc-500">{isZh ? "準備中" : "Preparing"}</span>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(["fighter_a", "fighter_b"] as VoteSide[]).map((side) => {
                    const selected = postResultPreference?.viewerChoice === side;
                    const count = postResultPreference?.counts[side] ?? 0;
                    const work = side === "fighter_a" ? works.A : works.B;
                    if (!work) return null;
                    return (
                      <button
                        key={side}
                        type="button"
                        disabled={postResultPreferenceBusy || postResultPreference?.available === false}
                        onClick={() => void submitPostResultPreference(side)}
                        className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? side === "fighter_a" ? "border-orange-200/70 bg-orange-400/16" : "border-cyan-200/70 bg-cyan-300/16"
                            : "border-white/12 bg-black/35 hover:border-cyan-200/50 hover:bg-white/[0.06]"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className={`block text-[10px] font-black tracking-[0.18em] ${side === "fighter_a" ? "text-orange-300" : "text-cyan-300"}`}>{side === "fighter_a" ? "WORK A" : "WORK B"}</span>
                          <span className="mt-1 block truncate text-sm font-black text-white">{work.songName}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-lg font-black text-white">{count}</span>
                          <span className="text-[10px] font-bold text-zinc-500">{isZh ? "喜好" : "likes"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] font-bold text-zinc-600">
                  {postResultPreference?.viewerChoice
                    ? isZh ? "你的結算後喜好已記錄；想改選時直接再點另一首。" : "Your post-result preference is saved. Tap the other work if you change your mind."
                    : isZh ? "登入後留下你的結算後喜好。" : "Sign in to leave your post-result preference."}
                </p>
              </section>
            ) : null}

            {voting && works?.B ? (
              <section className={`mt-4 rounded-[1.35rem] border border-white/12 bg-zinc-950/95 p-4 shadow-[0_18px_54px_rgba(0,0,0,0.42)] md:sticky ${currentWork ? "md:bottom-28" : "md:bottom-4"} md:z-30 xl:w-[calc(100%+18rem)]`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="shrink-0">
                    <p className="text-[10px] font-black tracking-[0.22em] text-zinc-500">{isZh ? "正在評" : "RATING"}</p>
                    <div className="mt-2 inline-flex rounded-full border border-white/10 bg-black p-1">
                      {(["A", "B"] as Side[]).map((side) => (
                        <button
                          key={side}
                          type="button"
                          onClick={() => setFeedbackSide(side)}
                          className={`min-h-9 min-w-12 rounded-full px-3 text-xs font-black transition ${
                            feedbackSide === side
                              ? side === "A" ? "bg-orange-500 text-black" : "bg-cyan-300 text-black"
                              : "text-zinc-500 hover:text-white"
                          }`}
                          aria-pressed={feedbackSide === side}
                        >
                          {side}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-5">
                    {feedbackItems.map(({ key, zh, en, Icon }) => {
                      const selected = payload.feedback.selected[feedbackSide].includes(key);
                      const disabled = selected || Boolean(feedbackBusy) || payload.viewer.isParticipant || !payload.feedback.available;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={disabled}
                          onClick={() => void submitFeedback(key)}
                          className={`relative flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-black transition ${
                            selected
                              ? feedbackSide === "A"
                                ? "border-orange-300/65 bg-orange-400/16 text-orange-50"
                                : "border-cyan-300/65 bg-cyan-300/14 text-cyan-50"
                              : disabled
                                ? "cursor-not-allowed border-white/8 bg-white/[0.025] text-zinc-600"
                                : "border-white/13 bg-white/[0.035] text-zinc-200 hover:border-orange-300/45 hover:bg-white/[0.07]"
                          }`}
                        >
                          <Icon size={18} strokeWidth={2.1} />
                          <span>{isZh ? zh : en}</span>
                          {selected ? <Check size={15} className="absolute right-2 top-2" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-3 text-xs font-bold text-zinc-500">
                  {!payload.feedback.available
                    ? isZh ? "五項評分功能準備中。" : "Five-axis feedback is being prepared."
                    : payload.viewer.isParticipant
                      ? isZh ? "作品持有人不能替自己的作品送出評分。" : "Work owners cannot rate their own Q Crash."
                      : !payload.viewer.userId
                        ? isZh ? "登入後可逐項評分；每項每首限點一次，送出即鎖定。" : "Sign in to rate. Each item can be selected once per work and locks immediately."
                        : isZh ? "切換作品後逐項評分；每項每首限點一次，送出即鎖定。" : "Switch works to rate each one. Every item locks after one tap per work."}
                </p>
              </section>
            ) : null}
          </div>

          {works?.B ? (
            <aside className={`rounded-[1.35rem] border p-4 text-center xl:self-start ${
              result?.official ? "border-yellow-300/35 bg-yellow-300/[0.06]" : "border-white/10 bg-black/50"
            }`}>
              {result?.official && winnerWork ? (
                <>
                  <p className="text-[10px] font-black tracking-[0.24em] text-yellow-200">{isZh ? "正式結果" : "OFFICIAL RESULT"}</p>
                  <div
                    className="mx-auto mt-4 h-24 w-24 rounded-2xl border border-yellow-300/35 bg-black bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url("${(winnerWork.coverUrl || "/aipoger-brand-logo-transparent-20260522.png").replace(/"/g, "%22")}")` }}
                  />
                  <h2 className="mt-3 break-words text-lg font-black text-white">{winnerWork.songName}</h2>
                  <p className="mt-1 text-xs font-bold text-zinc-400">{winnerWork.creatorName}</p>
                  <p className="mt-2 text-sm font-black text-yellow-100">
                    {result.counts?.fighter_a ?? 0} : {result.counts?.fighter_b ?? 0}
                  </p>
                  <FeedbackRadar counts={winnerFeedback} isZh={isZh} />
                </>
              ) : final ? (
                <>
                  <p className="text-[10px] font-black tracking-[0.24em] text-zinc-500">NO OFFICIAL RESULT</p>
                  <h2 className="mt-4 text-lg font-black text-white">{isZh ? "觀眾不足，戰績未成立" : "Insufficient audience"}</h2>
                  <p className="mt-3 text-xs font-bold leading-6 text-zinc-500">
                    {isZh
                      ? `至少需要 ${payload.card.officialAudienceMin} 位非參賽登入觀眾；不顯示勝出雷達圖。`
                      : `At least ${payload.card.officialAudienceMin} signed-in non-participants are required. No winner radar is published.`}
                  </p>
                </>
              ) : (
                <>
                  <Clock3 className="mx-auto text-cyan-300" size={24} />
                  <h2 className="mt-3 text-lg font-black text-white">{isZh ? "截止後公開" : "Revealed after deadline"}</h2>
                  <p className="mt-2 text-xs font-bold leading-6 text-zinc-500">
                    {isZh ? "正式勝出作品與五角評分分布會在結算後出現；現在不顯示任何總和。" : "The winning work and five-axis distribution appear only after settlement. No totals are shown now."}
                  </p>
                </>
              )}
            </aside>
          ) : null}
        </div>

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

      {voteActionEnabled ? (
        <div
          className={`fixed inset-x-3 z-50 mx-auto max-w-4xl rounded-[1.35rem] border border-cyan-300/30 bg-zinc-950/96 p-3 shadow-[0_0_50px_rgba(34,211,238,0.18)] backdrop-blur md:inset-x-6 md:p-4 ${
            currentWork ? "bottom-[9.5rem] md:bottom-[6.75rem]" : "bottom-3 md:bottom-4"
          }`}
          aria-live="polite"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black tracking-[0.2em] text-cyan-300">Q CRASH · FINAL VOTE</p>
              <p className="mt-1 truncate text-sm font-black text-white">
                {pendingVote
                  ? isZh ? `已選作品 ${pendingVote === "fighter_a" ? "A" : "B"}，還差最後確認` : `Work ${pendingVote === "fighter_a" ? "A" : "B"} selected — confirm to submit`
                  : isZh ? "請在上方選擇作品 A 或 B" : "Choose Work A or B above"}
              </p>
              <p className="mt-1 text-[11px] font-bold text-zinc-500">
                {isZh ? "可重播、快轉與改選；只有按下右側按鈕才算投票。" : "Replay, seek, or switch. Your vote only counts after confirmation."}
              </p>
              <div className="mt-3">
                <label htmlFor="q-crash-vote-comment" className="text-[11px] font-black text-zinc-300">
                  {isZh ? "評論（選填）" : "Comment (optional)"}
                </label>
                <textarea
                  id="q-crash-vote-comment"
                  value={commentText}
                  maxLength={Q_CRASH_COMMENT_MAX_LENGTH}
                  onChange={(event) => {
                    const value = event.target.value;
                    setCommentText(value);
                    if (draftKey) rememberQCrashVoteDraft(draftKey, { comment: value }, payload.card.votingEndsAt);
                  }}
                  placeholder={isZh ? "可以寫下你為什麼選這首…" : "Why did you choose this work?"}
                  className="mt-1 min-h-16 w-full resize-y rounded-xl border border-white/12 bg-black/65 px-3 py-2 text-xs font-bold leading-5 text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-300/55"
                />
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-bold text-zinc-600">
                  <span>{isZh ? "評論會和投票一起送出，送出後不能修改。" : "Sent together with your vote and locked afterward."}</span>
                  <span className="shrink-0">{Array.from(commentText).length}/{Q_CRASH_COMMENT_MAX_LENGTH}</span>
                </div>
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 md:w-[15rem] md:grid-cols-[auto_auto_minmax(0,1fr)]">
              {(["A", "B"] as Side[]).map((side) => {
                const vote = side === "A" ? "fighter_a" : "fighter_b";
                const selected = pendingVote === vote;
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={votingBusy}
                    onClick={() => selectPendingVote(vote)}
                    aria-pressed={selected}
                    className={`min-h-13 rounded-2xl border px-4 text-sm font-black transition ${
                      selected
                        ? side === "A"
                          ? "border-orange-200 bg-orange-500/24 text-orange-50"
                          : "border-cyan-200 bg-cyan-400/22 text-cyan-50"
                        : "border-white/10 bg-white/[0.035] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isZh ? `選 ${side}` : side}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={!pendingVote || votingBusy}
                onClick={() => void submitVote()}
                className={`col-span-2 inline-flex min-h-13 min-w-0 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition md:col-span-1 md:px-3 ${
                  pendingVote === "fighter_a"
                    ? "border-orange-200 bg-orange-500 text-black shadow-[0_0_28px_rgba(249,115,22,0.28)] hover:bg-orange-400"
                    : pendingVote === "fighter_b"
                      ? "border-cyan-200 bg-cyan-400 text-black shadow-[0_0_28px_rgba(34,211,238,0.25)] hover:bg-cyan-300"
                      : "cursor-not-allowed border-white/8 bg-white/[0.035] text-zinc-600"
                }`}
              >
                {payload.viewer.userId ? <Check size={18} className="shrink-0" /> : <LogIn size={18} className="shrink-0" />}
                <span className="truncate">
                  {votingBusy
                    ? isZh ? "送出中…" : "Submitting…"
                    : pendingVote
                      ? payload.viewer.userId
                        ? commentText.trim()
                          ? isZh ? `送出投票＋評論（作品 ${pendingVote === "fighter_a" ? "A" : "B"}）` : `Submit vote + comment (${pendingVote === "fighter_a" ? "A" : "B"})`
                          : isZh ? `確定送出作品 ${pendingVote === "fighter_a" ? "A" : "B"}` : `Confirm Work ${pendingVote === "fighter_a" ? "A" : "B"}`
                        : isZh ? `登入並投作品 ${pendingVote === "fighter_a" ? "A" : "B"}` : `Sign in & vote Work ${pendingVote === "fighter_a" ? "A" : "B"}`
                      : isZh ? "確定送出" : "Confirm"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {currentWork ? (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-6xl rounded-[1.4rem] border border-white/15 bg-zinc-950/95 p-3 shadow-[0_0_50px_rgba(0,0,0,0.75)] backdrop-blur md:inset-x-6 md:p-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3 md:flex-nowrap">
            <div className="order-1 inline-flex shrink-0 rounded-full border border-white/10 bg-black p-1">
              {(["A", "B"] as Side[]).map((side) => {
                const disabled = side === "B" && !works?.B;
                return (
                  <button
                    key={side}
                    type="button"
                    disabled={disabled}
                    onClick={() => playSide(side)}
                    aria-pressed={currentSide === side}
                    className={`min-h-9 min-w-10 rounded-full px-3 text-xs font-black transition ${
                      currentSide === side
                        ? side === "A" ? "bg-orange-500 text-black" : "bg-cyan-300 text-black"
                        : disabled ? "cursor-not-allowed text-zinc-800" : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {side}
                  </button>
                );
              })}
            </div>
            <div className="order-2 flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => switchSide(-1)}
                disabled={!works?.B}
                className="text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:text-zinc-800"
                aria-label={isZh ? "上一首" : "Previous"}
              >
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
              <button
                type="button"
                onClick={() => switchSide(1)}
                disabled={!works?.B}
                className="text-zinc-400 transition hover:text-white disabled:cursor-not-allowed disabled:text-zinc-800"
                aria-label={isZh ? "下一首" : "Next"}
              >
                <SkipForward size={19} />
              </button>
            </div>
            <div className="order-4 min-w-0 basis-full md:order-3 md:flex-1 md:basis-auto">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="truncate text-xs font-black text-white">
                  <span className={currentSide === "A" ? "text-orange-300" : "text-cyan-300"}>作品 {currentSide}</span>
                  {` · ${currentWork.songName} · ${currentWork.creatorName}`}
                </p>
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
            <label className="order-3 hidden shrink-0 items-center gap-2 text-zinc-500 lg:flex" aria-label={isZh ? "音量" : "Volume"}>
              <Volume2 size={17} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="h-1.5 w-20 accent-cyan-400"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                audioRef.current?.pause();
                setCurrentSide(null);
              }}
              className="order-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/25 hover:text-white md:order-5"
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
