"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AudioLines, Compass, Headphones, Pause, Play, RadioTower, RotateCcw, Share2, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import {
  EARWORM_GENRE_PERSONALITY,
  EARWORM_TRACK_COUNT,
  calculateEarwormResult,
  type EarwormAnswer,
  type EarwormPersonalityResult,
  type EarwormReaction,
} from "@/lib/earworm";
import { fontGlowSans, fontRighteous, fontSourceSerifTC } from "@/lib/fonts";
import { supabase } from "@/lib/supabase";
import { buildEarwormLocalProfile, writeEarwormLocalProfile } from "@/lib/earworm-profile";

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

type EarwormQuiz = {
  id: string;
  tracks: EarwormTrack[];
  minListenSeconds: number;
};

type PendingResult = {
  quiz: EarwormQuiz;
  answers: EarwormAnswer[];
  result: EarwormPersonalityResult;
  savedAt: number;
};

const PENDING_RESULT_KEY = "aipoger-earworm-pending-result-v2";
const PENDING_RESULT_MAX_AGE = 6 * 60 * 60 * 1000;

const REACTIONS: Array<{ value: EarwormReaction; label: string; note: string }> = [
  { value: "love", label: "超對味", note: "一聽就中" },
  { value: "replay", label: "會再聽", note: "願意收藏" },
  { value: "okay", label: "還可以", note: "有些地方喜歡" },
  { value: "pass", label: "無感", note: "不是我的耳朵" },
];

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function signalCopy(signal: EarwormPersonalityResult["signal"]) {
  if (signal === "strong") return "訊號很強：你的直覺非常一致";
  if (signal === "clear") return "訊號清楚：這類聲音最容易留下來";
  return "探索中：你的耳朵喜歡跨類型旅行";
}

function readPendingResult(): PendingResult | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_RESULT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as PendingResult;
    if (
      !value?.quiz ||
      value.quiz.tracks?.length !== EARWORM_TRACK_COUNT ||
      value.answers?.length !== EARWORM_TRACK_COUNT ||
      !value.result?.primaryGenre ||
      Date.now() - Number(value.savedAt || 0) > PENDING_RESULT_MAX_AGE
    ) {
      window.sessionStorage.removeItem(PENDING_RESULT_KEY);
      return null;
    }
    return value;
  } catch {
    window.sessionStorage.removeItem(PENDING_RESULT_KEY);
    return null;
  }
}

export default function EarwormClient() {
  const [quiz, setQuiz] = useState<EarwormQuiz | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [answers, setAnswers] = useState<EarwormAnswer[]>([]);
  const [result, setResult] = useState<EarwormPersonalityResult | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [listenedSeconds, setListenedSeconds] = useState(0);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [notice, setNotice] = useState("");
  const [recommendationHref, setRecommendationHref] = useState("/ai-music?view=for-you&lang=zh");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlaybackTickRef = useRef<number | null>(null);

  const currentTrack = quiz?.tracks[trackIndex] ?? null;
  const completion = result ? 100 : Math.round((answers.length / EARWORM_TRACK_COUNT) * 100);
  const personality = result ? EARWORM_GENRE_PERSONALITY[result.primaryGenre] : null;

  useEffect(() => {
    const requestedReturn = new URLSearchParams(window.location.search).get("return")?.trim() ?? "";
    if (requestedReturn.startsWith("/") && !requestedReturn.startsWith("//")) {
      setRecommendationHref(requestedReturn);
    }
  }, []);

  const persistResult = useCallback(async (activeQuiz: EarwormQuiz, completedAnswers: EarwormAnswer[]) => {
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token;
    if (!accessToken) {
      return false;
    }

    setNotice("");
    try {
      const response = await fetch("/api/earworm/task", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ quizKey: activeQuiz.id, answers: completedAnswers }),
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
        result?: EarwormPersonalityResult;
        alreadySaved?: boolean;
      } | null;
      if (response.status === 401) {
        return false;
      }
      if (!response.ok) throw new Error(payload?.error || "結果暫時無法保存。");
      if (payload?.result) setResult(payload.result);
      window.sessionStorage.removeItem(PENDING_RESULT_KEY);
      setNotice("");
      return true;
    } catch (error) {
      setNotice(String((error as { message?: string })?.message ?? error));
      return false;
    }
  }, []);

  const loadQuiz = useCallback(async ({ restore = true }: { restore?: boolean } = {}) => {
    setLoadState("loading");
    setNotice("");
    setPlaying(false);
    setAutoPlayBlocked(false);
    setAdvancing(false);
    audioRef.current?.pause();

    if (restore) {
      const pending = readPendingResult();
      if (pending) {
        setQuiz(pending.quiz);
        setAnswers(pending.answers);
        setResult(pending.result);
        setTrackIndex(EARWORM_TRACK_COUNT - 1);
        writeEarwormLocalProfile(buildEarwormLocalProfile(pending.result, pending.savedAt));
        setLoadState("ready");
        return;
      }
    }

    try {
      const response = await fetch(`/api/earworm/task?nonce=${encodeURIComponent(`${Date.now()}-${Math.random()}`)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as { quiz?: EarwormQuiz; error?: string } | null;
      if (!response.ok || !payload?.quiz) throw new Error(payload?.error || "目前沒有足夠作品可以開始測驗。");
      setQuiz(payload.quiz);
      setTrackIndex(0);
      setAnswers([]);
      setResult(null);
      setCurrentTime(0);
      setDuration(0);
      setListenedSeconds(0);
      setAutoPlayBlocked(false);
      setAdvancing(false);
      setLoadState("ready");
    } catch (error) {
      setLoadState("error");
      setNotice(String((error as { message?: string })?.message ?? error));
    }
  }, []);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || result) return;
    const onPlay = () => {
      lastPlaybackTickRef.current = performance.now();
      setPlaying(true);
      setAutoPlayBlocked(false);
      setNotice("");
    };
    const onPause = () => {
      lastPlaybackTickRef.current = null;
      setPlaying(false);
    };
    const onTime = () => {
      setCurrentTime(audio.currentTime || 0);
      const now = performance.now();
      const previous = lastPlaybackTickRef.current;
      if (!audio.paused && previous !== null) {
        const delta = Math.min(1.5, Math.max(0, (now - previous) / 1000));
        setListenedSeconds((value) => value + delta);
      }
      lastPlaybackTickRef.current = now;
    };
    const onMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : currentTrack.duration);
    const onEnded = () => {
      setPlaying(false);
      lastPlaybackTickRef.current = null;
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [currentTrack, result]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || result || loadState !== "ready") return;

    let cancelled = false;
    setAdvancing(false);
    setAutoPlayBlocked(false);
    const start = async () => {
      try {
        await audio.play();
        if (!cancelled) setAutoPlayBlocked(false);
      } catch {
        if (!cancelled) setAutoPlayBlocked(true);
      }
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      void start();
    } else {
      audio.addEventListener("canplay", start, { once: true });
    }
    return () => {
      cancelled = true;
      audio.removeEventListener("canplay", start);
    };
  }, [currentTrack, loadState, result]);

  const toggleAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
      setAutoPlayBlocked(false);
    } catch {
      setAutoPlayBlocked(true);
      setNotice("瀏覽器暫時阻擋播放，請再按一次播放鍵。");
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrentTime(value);
    lastPlaybackTickRef.current = performance.now();
  };

  const react = async (reaction: EarwormReaction) => {
    if (!quiz || !currentTrack || advancing || result) return;
    setAdvancing(true);
    audioRef.current?.pause();
    setPlaying(false);
    lastPlaybackTickRef.current = null;
    const nextAnswers: EarwormAnswer[] = [
      ...answers,
      { trackId: currentTrack.id, genre: currentTrack.genre, reaction, listenedSeconds },
    ];
    setAnswers(nextAnswers);

    if (nextAnswers.length === EARWORM_TRACK_COUNT) {
      const nextResult = calculateEarwormResult(nextAnswers);
      setResult(nextResult);
      writeEarwormLocalProfile(buildEarwormLocalProfile(nextResult));
      setCurrentTime(0);
      setListenedSeconds(0);
      const pending: PendingResult = { quiz, answers: nextAnswers, result: nextResult, savedAt: Date.now() };
      window.sessionStorage.setItem(PENDING_RESULT_KEY, JSON.stringify(pending));
      await persistResult(quiz, nextAnswers);
      return;
    }

    setTrackIndex((index) => index + 1);
    setCurrentTime(0);
    setDuration(0);
    setListenedSeconds(0);
    setAutoPlayBlocked(false);
    setNotice("");
  };

  const restart = async () => {
    window.sessionStorage.removeItem(PENDING_RESULT_KEY);
    await loadQuiz({ restore: false });
  };

  const shareResult = async () => {
    if (!result) return;
    const text = `我的 AIPOGER 耳朵主場是「${result.primaryGenre}」！你是哪一型？`;
    const url = `${window.location.origin}/earworm`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "AIPOGER 耳朵蟲", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNotice("結果分享文字已複製。");
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setNotice("分享失敗，請稍後再試。");
    }
  };

  const progressItems = useMemo(() => Array.from({ length: EARWORM_TRACK_COUNT }, (_, index) => index), []);

  return (
    <main className={`${fontGlowSans.className} earworm-page relative min-h-screen overflow-hidden px-4 pb-20 pt-20 text-white sm:px-6 lg:px-8`}>
      <div className="earworm-stage-lamp earworm-stage-lamp-left" aria-hidden="true" />
      <div className="earworm-stage-lamp earworm-stage-lamp-right" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <header className="earworm-header">
          <Image src={AIPOGER_BRAND_LOGO} alt="AIPOGER 愛播歌" width={146} height={146} className="earworm-logo" priority />
          <div className="earworm-title-wrap">
            <div className="earworm-title-signal" aria-hidden="true" />
            <p className={`${fontRighteous.className} earworm-kicker`}>MUSIC PERSONALITY TEST</p>
            <h1 className={fontSourceSerifTC.className}>耳朵蟲</h1>
            <p>聽完 10 首，找到你的音樂主場</p>
          </div>
          <div className="earworm-header-tools">
            <span className="earworm-round">{result ? "RESULT" : `第 ${String(trackIndex + 1).padStart(2, "0")} / ${EARWORM_TRACK_COUNT} 首`}</span>
            <span className="earworm-test-note">類型於完成後揭曉</span>
          </div>
        </header>

        <div className="earworm-progress" aria-label={`測驗完成 ${completion}%`}>
          {progressItems.map((index) => (
            <span key={index} className={`${index < answers.length || result ? "is-complete" : ""} ${index === trackIndex && !result ? "is-current" : ""}`} />
          ))}
        </div>

        <div className="earworm-rule-line" aria-hidden="true"><span>EARWORM / AIPOGER</span></div>

        {loadState === "loading" ? (
          <section className="earworm-state-panel" aria-live="polite">正在從 AIPOGER 作品庫抽出 10 首測驗歌曲…</section>
        ) : loadState === "error" || !quiz ? (
          <section className="earworm-state-panel" aria-live="polite">
            <div>
              <p>{notice || "目前沒有足夠作品可以開始測驗。"}</p>
              <button type="button" className="earworm-secondary-button mt-5" onClick={() => void loadQuiz({ restore: false })}><RotateCcw className="h-4 w-4" />再試一次</button>
            </div>
          </section>
        ) : result ? (
          <section className="earworm-result" aria-live="polite">
            <div className="earworm-result-eyebrow"><Headphones className="h-4 w-4" />你的耳朵主場</div>
            <p className="earworm-result-preface">這是你完成本次 10 首測驗後，最接近的聽感類型</p>
            <h2 className={fontSourceSerifTC.className}>{result.primaryGenre}</h2>
            <p className="earworm-result-description">{personality?.description}</p>
            <div className="earworm-keywords" aria-label="你的聽感關鍵字">
              {result.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}
            </div>
            <p className="earworm-result-signal">{signalCopy(result.signal)}</p>

            <div className="earworm-result-secondary">
              <p>你的另外兩個靠近方向</p>
              <div>{result.secondaryGenres.map((genre, index) => <span key={genre}><b>0{index + 2}</b>{genre}</span>)}</div>
            </div>

            <div className="earworm-result-actions">
              <Link href="/ai-music?lang=zh" className="earworm-explore-result-link">
                <span className="earworm-explore-result-icon"><Compass className="h-5 w-5" /></span>
                <span><strong>去探索音樂</strong><small>帶著你的耳朵主場，逛逛所有 AI 音樂作品</small></span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href={`/listen-bar?genre=${encodeURIComponent(result.primaryGenre)}`} className="earworm-explore-result-link is-bar">
                <span className="earworm-explore-result-icon"><RadioTower className="h-5 w-5" /></span>
                <span><strong>去傷心酒吧</strong><small>進入 AI 音樂公播場，接著聽這一類</small></span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href={recommendationHref} className="earworm-listen-result-link is-primary">看看為我挑的歌<ArrowRight className="h-4 w-4" /></Link>
              <button type="button" className="earworm-share-button" onClick={() => void shareResult()}><Share2 className="h-4 w-4" />分享我的耳朵類型</button>
              <button type="button" className="earworm-restart-button" onClick={() => void restart()}><RotateCcw className="h-4 w-4" />重新測一次</button>
            </div>
            {notice ? <p className="earworm-notice" aria-live="polite">{notice}</p> : null}
          </section>
        ) : currentTrack ? (
          <>
            <section className="earworm-solo-card" aria-label={`第 ${trackIndex + 1} 首測驗歌曲`}>
              <div className="earworm-solo-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentTrack.coverUrl || AIPOGER_BRAND_LOGO} alt="" referrerPolicy="no-referrer" />
                <span className={`${fontRighteous.className} earworm-track-number`}>{String(trackIndex + 1).padStart(2, "0")}</span>
              </div>
              <div className="earworm-solo-content">
                <p className={`${fontRighteous.className} earworm-blind-label`}>BLIND GENRE LISTEN</p>
                <h2>{currentTrack.title}</h2>
                <p className="earworm-solo-artist">{currentTrack.artist}</p>
                <span className="earworm-tool-label">{currentTrack.aiTool}</span>

                <div className="earworm-solo-player">
                  <button type="button" className="earworm-play-button" onClick={() => void toggleAudio()} aria-label={`${playing ? "暫停" : "播放"} ${currentTrack.title}`}>
                    {playing ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="h-6 w-6" fill="currentColor" />}
                  </button>
                  <div className="earworm-progress-line">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(duration, currentTrack.duration, 1)}
                      step={0.1}
                      value={Math.min(currentTime, Math.max(duration, currentTrack.duration, 1))}
                      onChange={(event) => seek(Number(event.currentTarget.value))}
                      aria-label="拖曳播放進度"
                    />
                    <div className="earworm-time-row"><span>{formatTime(currentTime)}</span><span>{formatTime(duration || currentTrack.duration)}</span></div>
                  </div>
                  <div className="earworm-player-side">
                    {autoPlayBlocked ? (
                      <button type="button" className="earworm-autoplay-resume" onClick={() => void toggleAudio()}><Play className="h-3.5 w-3.5" fill="currentColor" />啟動自動播放</button>
                    ) : (
                      <div className="earworm-heard-status is-ready"><AudioLines className="h-3.5 w-3.5" />AUTO PLAY</div>
                    )}
                    <button type="button" className="earworm-next-button" onClick={() => void react("pass")} disabled={advancing}>
                      <span><small>不喜歡就</small>下一首</span><SkipForward className="h-4 w-4" fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="earworm-vote-panel" aria-label="選擇這首歌帶給你的感覺">
              <div className="earworm-reaction-heading">
                <div>
                  <p className={`${fontRighteous.className}`}>TRUST YOUR FIRST FEELING</p>
                  <h2>這首歌，留在你耳朵裡多少？</h2>
                </div>
                <span>第一耳就能選，選完自動播下一首</span>
              </div>
              <div className="earworm-reaction-grid">
                {REACTIONS.map((item) => (
                  <button key={item.value} type="button" className={`earworm-reaction-button is-${item.value}`} onClick={() => void react(item.value)} disabled={advancing}>
                    <strong>{item.label}</strong><span>{item.note}</span>
                  </button>
                ))}
              </div>
              <p className="earworm-next-note">一出來就不喜歡？按「下一首」會直接記為無感。</p>
              <p className="earworm-blind-note">測驗中先不顯示類型，避免名稱影響你的耳朵；完成後一次揭曉。</p>
              {notice ? <p className="earworm-notice" aria-live="polite">{notice}</p> : null}
            </section>

            <audio key={currentTrack.id} ref={audioRef} src={currentTrack.audioUrl} preload="auto" autoPlay />
          </>
        ) : null}
      </div>

    </main>
  );
}
