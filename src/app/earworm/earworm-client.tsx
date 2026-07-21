"use client";

import Image from "next/image";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { EARWORM_MIN_LISTEN_SECONDS, EARWORM_REWARD_POINTS, type EarwormSelection } from "@/lib/earworm";
import { fontGlowSans, fontRighteous, fontSourceSerifTC } from "@/lib/fonts";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { supabase } from "@/lib/supabase";
import AuthRequiredDialog from "@/components/auth-required-dialog";

type EarwormTrack = {
  id: string;
  title: string;
  artist: string;
  aiTool: string;
  genre: string;
  bpm: number | null;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  lyrics: string | null;
};

type EarwormTask = {
  id: string;
  genre: string;
  trackA: EarwormTrack;
  trackB: EarwormTrack;
  minListenSeconds: number;
  rewardPoints: number;
};

type Side = "a" | "b";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function EarwormTrackRow({
  side,
  track,
  playing,
  currentTime,
  duration,
  listenedSeconds,
  minListenSeconds,
  onToggle,
  onSeek,
}: {
  side: Side;
  track: EarwormTrack;
  playing: boolean;
  currentTime: number;
  duration: number;
  listenedSeconds: number;
  minListenSeconds: number;
  onToggle: () => void;
  onSeek: (value: number) => void;
}) {
  const isReady = listenedSeconds >= minListenSeconds;
  return (
    <article className={`earworm-track-row ${playing ? "is-playing" : ""} ${isReady ? "is-heard" : ""}`}>
      <div className="earworm-track-label" aria-hidden="true">{side.toUpperCase()}</div>
      <div className="earworm-cover-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={track.coverUrl || AIPOGER_BRAND_LOGO} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      </div>
      <div className="earworm-track-meta">
        <h2>{track.title}</h2>
        <p>{track.artist}</p>
        <span>{track.genre}</span>
      </div>
      <div className="earworm-player-control">
        <button type="button" className="earworm-play-button" onClick={onToggle} aria-label={`${playing ? "暫停" : "播放"} ${side.toUpperCase()} ${track.title}`}>
          {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
        </button>
        <div className="earworm-progress-line">
          <input
            type="range"
            min={0}
            max={Math.max(duration, track.duration, 1)}
            step={0.1}
            value={Math.min(currentTime, Math.max(duration, track.duration, 1))}
            onChange={(event) => onSeek(Number(event.currentTarget.value))}
            aria-label={`拖曳 ${side.toUpperCase()} 播放進度`}
          />
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold tabular-nums text-zinc-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || track.duration)}</span>
          </div>
        </div>
        <div className="earworm-heard-status" aria-label={isReady ? "已聽足夠" : `還需要聽 ${Math.max(0, minListenSeconds - listenedSeconds).toFixed(0)} 秒`}>
          {isReady ? "READY" : `${Math.max(0, Math.ceil(minListenSeconds - listenedSeconds))}s`}
        </div>
      </div>
    </article>
  );
}

export default function EarwormClient() {
  const [task, setTask] = useState<EarwormTask | null>(null);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [round, setRound] = useState(1);
  const [selection, setSelection] = useState<EarwormSelection | null>(null);
  const [explanation, setExplanation] = useState("");
  const [playingSide, setPlayingSide] = useState<Side | null>(null);
  const [currentTime, setCurrentTime] = useState<Record<Side, number>>({ a: 0, b: 0 });
  const [duration, setDuration] = useState<Record<Side, number>>({ a: 0, b: 0 });
  const [listenedSeconds, setListenedSeconds] = useState<Record<Side, number>>({ a: 0, b: 0 });
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);

  const minListenSeconds = task?.minListenSeconds ?? EARWORM_MIN_LISTEN_SECONDS;
  const canSubmit = Boolean(selection && listenedSeconds.a >= minListenSeconds && listenedSeconds.b >= minListenSeconds && !submitting);
  const genreOptions = useMemo(() => {
    const current = availableGenres.length > 0 ? availableGenres : MUSIC_GENRE_OPTIONS.map((option) => option.value);
    return MUSIC_GENRE_OPTIONS.filter((option) => current.includes(option.value));
  }, [availableGenres]);

  const loadTask = useCallback(async (genre = "", nextRound = 1) => {
    setLoadState("loading");
    setNotice("");
    setSelection(null);
    setExplanation("");
    setPlayingSide(null);
    audioARef.current?.pause();
    audioBRef.current?.pause();
    try {
      const query = new URLSearchParams();
      if (genre) query.set("genre", genre);
      query.set("nonce", `${Date.now()}-${nextRound}`);
      const response = await fetch(`/api/earworm/task?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { task?: EarwormTask; availableGenres?: string[]; error?: string } | null;
      if (!response.ok || !payload?.task) throw new Error(payload?.error || "目前沒有足夠的同類型作品。");
      setTask(payload.task);
      setAvailableGenres(payload.availableGenres ?? []);
      setSelectedGenre(payload.task.genre);
      setCurrentTime({ a: 0, b: 0 });
      setDuration({ a: 0, b: 0 });
      setListenedSeconds({ a: 0, b: 0 });
      setRound(nextRound);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setNotice(String((error as { message?: string })?.message ?? error));
    }
  }, []);

  useEffect(() => {
    const urlGenre = new URLSearchParams(window.location.search).get("genre") ?? "";
    void loadTask(urlGenre, 1);
  }, [loadTask]);

  useEffect(() => {
    const stopOther = (side: Side) => {
      const otherAudio = side === "a" ? audioBRef.current : audioARef.current;
      if (otherAudio) otherAudio.pause();
    };
    const audioA = audioARef.current;
    const audioB = audioBRef.current;
    if (!audioA || !audioB) return;
    const onPlayA = () => { stopOther("a"); setPlayingSide("a"); };
    const onPlayB = () => { stopOther("b"); setPlayingSide("b"); };
    const onPauseA = () => setPlayingSide((value) => value === "a" ? null : value);
    const onPauseB = () => setPlayingSide((value) => value === "b" ? null : value);
    const onTimeA = () => {
      const value = audioA.currentTime || 0;
      setCurrentTime((current) => ({ ...current, a: value }));
      setListenedSeconds((current) => ({ ...current, a: Math.max(current.a, Math.min(value, minListenSeconds)) }));
    };
    const onTimeB = () => {
      const value = audioB.currentTime || 0;
      setCurrentTime((current) => ({ ...current, b: value }));
      setListenedSeconds((current) => ({ ...current, b: Math.max(current.b, Math.min(value, minListenSeconds)) }));
    };
    const onMetaA = () => setDuration((current) => ({ ...current, a: Number.isFinite(audioA.duration) ? audioA.duration : 0 }));
    const onMetaB = () => setDuration((current) => ({ ...current, b: Number.isFinite(audioB.duration) ? audioB.duration : 0 }));
    audioA.addEventListener("play", onPlayA);
    audioB.addEventListener("play", onPlayB);
    audioA.addEventListener("pause", onPauseA);
    audioB.addEventListener("pause", onPauseB);
    audioA.addEventListener("timeupdate", onTimeA);
    audioB.addEventListener("timeupdate", onTimeB);
    audioA.addEventListener("loadedmetadata", onMetaA);
    audioB.addEventListener("loadedmetadata", onMetaB);
    return () => {
      audioA.removeEventListener("play", onPlayA);
      audioB.removeEventListener("play", onPlayB);
      audioA.removeEventListener("pause", onPauseA);
      audioB.removeEventListener("pause", onPauseB);
      audioA.removeEventListener("timeupdate", onTimeA);
      audioB.removeEventListener("timeupdate", onTimeB);
      audioA.removeEventListener("loadedmetadata", onMetaA);
      audioB.removeEventListener("loadedmetadata", onMetaB);
    };
  }, [task?.id, minListenSeconds]);

  const toggleAudio = async (side: Side) => {
    const audio = side === "a" ? audioARef.current : audioBRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    const other = side === "a" ? audioBRef.current : audioARef.current;
    other?.pause();
    try {
      await audio.play();
    } catch {
      setNotice("瀏覽器暫時阻擋播放，請再按一次播放鍵。");
    }
  };

  const seek = (side: Side, value: number) => {
    const audio = side === "a" ? audioARef.current : audioBRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime((current) => ({ ...current, [side]: value }));
  };

  const submit = async () => {
    if (!task || !selection) return;
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token;
    if (!accessToken) {
      setAuthOpen(true);
      return;
    }
    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch("/api/earworm/task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          taskKey: task.id,
          genre: task.genre,
          trackAId: task.trackA.id,
          trackBId: task.trackB.id,
          selection,
          listenedASeconds: listenedSeconds.a,
          listenedBSeconds: listenedSeconds.b,
          explanation,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; rewardPoints?: number; alreadySubmitted?: boolean } | null;
      if (response.status === 401) {
        setAuthOpen(true);
        return;
      }
      if (!response.ok) {
        if (response.status === 409 && payload?.alreadySubmitted) {
          setNotice("這組已經留下過判斷，換下一組。\n");
          await loadTask(selectedGenre, round + 1);
          return;
        }
        throw new Error(payload?.error || "送出失敗，請稍後再試。");
      }
      await loadTask(selectedGenre, round + 1);
      setNotice(`上一組已送出，+${payload?.rewardPoints ?? EARWORM_REWARD_POINTS} APC。`);
    } catch (error) {
      setNotice(String((error as { message?: string })?.message ?? error));
    } finally {
      setSubmitting(false);
    }
  };

  const selectionLabels: Array<{ value: EarwormSelection; label: string }> = [
    { value: "a", label: "選 A" },
    { value: "b", label: "選 B" },
    { value: "neither", label: "都還好" },
  ];

  return (
    <main className={`${fontGlowSans.className} earworm-page relative min-h-screen overflow-hidden px-4 pb-20 pt-20 text-white sm:px-6 lg:px-8`}>
      <div className="earworm-stage-lamp earworm-stage-lamp-left" aria-hidden="true" />
      <div className="earworm-stage-lamp earworm-stage-lamp-right" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <header className="earworm-header">
          <Image src={AIPOGER_BRAND_LOGO} alt="AIPOGER 愛播歌" width={146} height={48} className="earworm-logo" priority />
          <div className="earworm-title-wrap">
            <div className="earworm-title-signal" aria-hidden="true" />
            <p className={`${fontRighteous.className} earworm-kicker`}>LISTENING GAME</p>
            <h1 className={fontSourceSerifTC.className}>耳朵蟲</h1>
            <p>同類型裡，哪首更抓耳？</p>
          </div>
          <div className="earworm-header-tools">
            <label htmlFor="earworm-genre" className="sr-only">選擇音樂類型</label>
            <select
              id="earworm-genre"
              value={selectedGenre || task?.genre || ""}
              onChange={(event) => {
                setSelectedGenre(event.currentTarget.value);
                void loadTask(event.currentTarget.value, 1);
              }}
              className="earworm-genre-select"
              disabled={loadState === "loading" || genreOptions.length === 0}
            >
              {genreOptions.length === 0 ? <option value="">目前沒有可比較類型</option> : null}
              {genreOptions.map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}
            </select>
            <span className="earworm-round">第 {String(round).padStart(2, "0")} 組</span>
          </div>
        </header>

        <div className="earworm-rule-line" aria-hidden="true"><span>EARWORM / AIPOGER</span></div>

        {loadState === "loading" ? (
          <section className="earworm-state-panel" aria-live="polite">正在找同一類型的兩首作品…</section>
        ) : loadState === "error" || !task ? (
          <section className="earworm-state-panel" aria-live="polite">
            <p>{notice || "目前沒有足夠的同類型作品。"}</p>
            <button type="button" className="earworm-secondary-button mt-5" onClick={() => void loadTask(selectedGenre, round)}><RotateCcw className="h-4 w-4" />再試一次</button>
          </section>
        ) : (
          <>
            <section className="grid gap-4" aria-label="耳朵蟲 A/B 作品比較">
              <EarwormTrackRow side="a" track={task.trackA} playing={playingSide === "a"} currentTime={currentTime.a} duration={duration.a} listenedSeconds={listenedSeconds.a} minListenSeconds={minListenSeconds} onToggle={() => void toggleAudio("a")} onSeek={(value) => seek("a", value)} />
              <EarwormTrackRow side="b" track={task.trackB} playing={playingSide === "b"} currentTime={currentTime.b} duration={duration.b} listenedSeconds={listenedSeconds.b} minListenSeconds={minListenSeconds} onToggle={() => void toggleAudio("b")} onSeek={(value) => seek("b", value)} />
            </section>

            <section className="earworm-vote-panel" aria-label="選出比較抓耳的作品">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.24em] text-orange-200/70`}>Your ear decides</p>
                  <h2>哪一首會留在你耳朵裡？</h2>
                </div>
                <p className="earworm-listen-hint">兩首各聽滿 {minListenSeconds} 秒才能送出判斷</p>
              </div>
              <div className="earworm-vote-actions">
                {selectionLabels.map((item) => (
                  <button key={item.value} type="button" aria-pressed={selection === item.value} onClick={() => setSelection(item.value)} className={`earworm-vote-button earworm-vote-${item.value} ${selection === item.value ? "is-selected" : ""}`}>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="earworm-submit-row">
                <label className="earworm-explanation-wrap" htmlFor="earworm-explanation">
                  <span className="sr-only">選擇理由（可選）</span>
                  <input id="earworm-explanation" value={explanation} onChange={(event) => setExplanation(event.currentTarget.value)} maxLength={280} placeholder="為什麼？（可選填一句聽感）" />
                </label>
                <button type="button" className="earworm-submit-button" onClick={() => void submit()} disabled={!canSubmit}>{submitting ? "送出中…" : `送出判斷 · +${task.rewardPoints || EARWORM_REWARD_POINTS} APC`}</button>
                <button type="button" className="earworm-skip-button" onClick={() => void loadTask(selectedGenre, round + 1)}><SkipForward className="h-4 w-4" />跳過這組</button>
              </div>
              {notice ? <p className="earworm-notice" aria-live="polite">{notice}</p> : null}
            </section>
          </>
        )}
      </div>

      {task ? (
        <>
          <audio ref={audioARef} src={task.trackA.audioUrl} preload="metadata" />
          <audio ref={audioBRef} src={task.trackB.audioUrl} preload="metadata" />
        </>
      ) : null}

      <AuthRequiredDialog open={authOpen} kind="earworm" lang="zh" nextPath="/earworm" onClose={() => setAuthOpen(false)} />
    </main>
  );
}
