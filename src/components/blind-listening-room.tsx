/* eslint-disable @next/next/no-img-element -- Generated studio plates. */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Equal, Heart, Pause, Play, RotateCcw } from "lucide-react";
import EditorialHeader from "./editorial-header";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { battleRetroCopy } from "@/lib/battle-retro-copy";
import { BLIND_END, BLIND_MIN_SECONDS, BLIND_START, type BlindChoice, type BlindSide } from "@/lib/blind-listening";
import { musicPlayer } from "@/lib/music-player-store";
import styles from "./battle-retro.module.css";
type Question = { id: string; audioA: string; audioB: string; heardA: number; heardB: number; expiresAt: string };
export default function BlindListeningRoom() {
  const { lang } = useI18n(); const c = battleRetroCopy(lang);
  const [userId, setUserId] = useState<string | null>(null), [authReady, setAuthReady] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null), [loading, setLoading] = useState(false);
  const [error, setError] = useState(""), [playbackError, setPlaybackError] = useState(false), [busy, setBusy] = useState(false);
  const [side, setSide] = useState<BlindSide | null>(null), [playing, setPlaying] = useState(false);
  const [positions, setPositions] = useState({ A: 0, B: 0 }), [heard, setHeard] = useState({ A: 0, B: 0 });
  const [arming, setArming] = useState<BlindSide | null>(null), [round, setRound] = useState(1);
  const measured = useRef({ A: 0, B: 0 }), sample = useRef({ A: { position: 15, at: 0 }, B: { position: 15, at: 0 } });
  const startGeneration = useRef(0), playbackAuthorized = useRef(false);
  const [mediaReady, setMediaReady] = useState({ A: false, B: false });
  const [notice, setNotice] = useState<"earned" | "recorded" | null>(null);
  const audioA = useRef<HTMLAudioElement | null>(null), audioB = useRef<HTMLAudioElement | null>(null);
  const account = useRef<string | null>(null), questionRef = useRef<Question | null>(null), sideRef = useRef<BlindSide | null>(null);
  const requestGeneration = useRef(0), tickQueue = useRef<Promise<unknown>>(Promise.resolve()), lastTick = useRef(0);
  const lastChoice = useRef<BlindChoice | null>(null), ended = useRef({ A: false, B: false }), thresholdSent = useRef({ A: false, B: false });
  const invalidateRequests = useCallback(() => ++requestGeneration.current, []);
  const api = useCallback(async (body?: Record<string, unknown>) => {
    const expected = account.current;
    const { data } = await supabase.auth.getSession();
    if (!expected || data.session?.user.id !== expected) throw new Error("AUTH_REQUIRED");
    const response = await fetch("/api/blind-listen", { method: body ? "POST" : "GET", cache: "no-store",
      headers: { Authorization: "Bearer " + data.session.access_token, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    const payload = await response.json();
    if (account.current !== expected) throw new Error("AUTH_CHANGED");
    if (!response.ok) throw new Error(payload.error || "LOAD_FAILED");
    return payload;
  }, []);
  useEffect(() => {
    if (!question?.id || !userId) return;
    // While the two clips are heard, prepare only. Completion still owns issuance.
    void api({ action: "prepare", questionId: question.id }).catch(() => {});
  }, [api, question?.id, userId]);
  const stopAudio = useCallback(() => {
    for (const el of [audioA.current, audioB.current]) { if (el) { el.pause(); el.removeAttribute("src"); el.load(); } }
    startGeneration.current++; playbackAuthorized.current = false; sideRef.current = null; setSide(null); setPlaying(false); setArming(null);
  }, []);
  const adoptQuestion = useCallback((next: Question | null) => {
    stopAudio(); questionRef.current = next; setQuestion(next); setError(""); setPlaybackError(false);
    setPositions({ A: 0, B: 0 }); setMediaReady({ A: false, B: false }); measured.current = { A: next?.heardA ?? 0, B: next?.heardB ?? 0 }; setHeard({ ...measured.current });
    sample.current = { A: { position: 15, at: 0 }, B: { position: 15, at: 0 } };
    lastChoice.current = null; ended.current = { A: false, B: false }; thresholdSent.current = { A: false, B: false };
  }, [stopAudio]);
  const load = useCallback(async (preserveNotice = false) => {
    const generation = invalidateRequests();
    adoptQuestion(null); setBusy(false); if (!preserveNotice) { setNotice(null); setRound(1); }
    if (!account.current) { setLoading(false); return; }
    setLoading(true);
    try {
      const payload = await api();
      if (generation === requestGeneration.current) adoptQuestion(payload.question);
    } catch (e) { if (generation === requestGeneration.current) setError(e instanceof Error ? e.message : "LOAD_FAILED"); }
    finally { if (generation === requestGeneration.current) setLoading(false); }
  }, [api, adoptQuestion, invalidateRequests]);
  useEffect(() => {
    let alive = true;
    const update = (id: string | null) => {
      if (!alive) return;
      account.current = id; setUserId(id); setAuthReady(true); void load();
    };
    void supabase.auth.getSession().then(({ data }) => update(data.session?.user.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.id ?? null; if (next !== account.current) update(next);
    });
    return () => { alive = false; account.current = null; invalidateRequests(); subscription.unsubscribe(); stopAudio(); };
  }, [load, stopAudio, invalidateRequests]);
  const sendTick = useCallback((event: "play" | "progress" | "pause" | "seek", target: BlindSide, position: number) => {
    const q = questionRef.current, expected = account.current;
    if (!q || !expected) return tickQueue.current;
    const id = q.id;
    tickQueue.current = tickQueue.current.catch(() => {}).then(async () => {
      if (questionRef.current?.id !== id || account.current !== expected) return;
      try {
        const payload = await api({ action: "tick", questionId: id, side: target, event, position: Math.max(BLIND_START, Math.min(BLIND_END, position)) });
        return payload;
      } catch { if (questionRef.current?.id === id && account.current === expected) setError("LISTENING_UNAVAILABLE"); return null; }
    });
    return tickQueue.current;
  }, [api]);
  const measure = useCallback((target: BlindSide, el: HTMLAudioElement) => {
    const now = performance.now(), previous = sample.current[target];
    const delta = Math.min(BLIND_END, el.currentTime) - previous.position;
    const elapsed = Math.max(0, (now - previous.at) / 1000);
    // Real media progression only. A jump/seek or buffering never supplies the minimum.
    if (playbackAuthorized.current && !el.paused && delta > 0 && delta <= elapsed + 0.35) {
      measured.current[target] = Math.min(30, measured.current[target] + Math.min(delta, elapsed));
      setHeard({ ...measured.current });
    }
    sample.current[target] = { position: Math.min(BLIND_END, el.currentTime), at: now };
  }, []);
  const start = useCallback(async (target: BlindSide, replay = false) => {
    const el = target === "A" ? audioA.current : audioB.current, q = questionRef.current;
    if (!el || !q || busy || (replay && measured.current[target] < BLIND_MIN_SECONDS)) return;
    musicPlayer?.close(); setError(""); setPlaybackError(false);
    const expected = account.current, current = sideRef.current;
    if (current === target && !el.paused && !replay) {
      measure(target, el); el.pause(); playbackAuthorized.current = false; void sendTick("pause", target, el.currentTime); setPlaying(false); setArming(null); return;
    }
    const generation = ++startGeneration.current;
    const previous = current === "A" ? audioA.current : current === "B" ? audioB.current : null;
    if (current && previous && !previous.paused) { measure(current, previous); previous.pause(); void sendTick("pause", current, previous.currentTime); }
    playbackAuthorized.current = false; sideRef.current = target; setSide(target); setPlaying(false); setArming(target); ended.current[target] = false;
    const valid = () => account.current === expected && questionRef.current?.id === q.id && startGeneration.current === generation;
    if (el.readyState > 0 && (replay || el.currentTime < BLIND_START || el.currentTime >= BLIND_END)) {
      el.currentTime = BLIND_START;
      if (measured.current[target] >= BLIND_MIN_SECONDS) await sendTick("seek", target, BLIND_START);
    }
    // Preserve the original tap's media permission on Safari while awaiting the
    // server clock. This priming call is immediately paused and never counted.
    void el.play().catch(() => {}); el.pause();
    // Acknowledge the clock anchor before audio runs; network latency then cannot
    // subtract the first seconds from the server's exact eight-second check.
    const acknowledged = await sendTick("play", target, el.readyState > 0 ? el.currentTime : BLIND_START);
    if (!valid()) return;
    if (!acknowledged) { setArming(null); return; }
    lastTick.current = performance.now();
    sample.current[target] = { position: el.currentTime, at: performance.now() };
    try {
      playbackAuthorized.current = true; await el.play();
      if (valid()) { setPlaying(true); setArming(null); }
      else if (sideRef.current !== target || questionRef.current?.id !== q.id) el.pause();
    } catch { if (valid()) { setPlaybackError(true); setPlaying(false); setArming(null); } }
  }, [busy, measure, sendTick]);
  const seek = (target: BlindSide, value: number) => {
    const el = target === "A" ? audioA.current : audioB.current;
    if (!el || !questionRef.current || busy || arming || measured.current[target] < BLIND_MIN_SECONDS || !Number.isFinite(value)) return;
    const position = BLIND_START + Math.max(0, Math.min(30, value));
    el.currentTime = position; ended.current[target] = false;
    sample.current[target] = { position, at: performance.now() };
    setPositions(p => ({ ...p, [target]: position - BLIND_START }));
    void sendTick("seek", target, position);
  };
  const canVote = Boolean(question && heard.A >= BLIND_MIN_SECONDS && heard.B >= BLIND_MIN_SECONDS && !playbackError && !loading && !busy);
  const vote = async (choice: BlindChoice) => {
    const q = questionRef.current;
    if (!q || !canVote) return;
    lastChoice.current = choice;
    const expected = account.current, generation = requestGeneration.current; setBusy(true); setError("");
    const current = sideRef.current, el = current === "A" ? audioA.current : audioB.current;
    if (current && el) measure(current, el); playbackAuthorized.current = false; el?.pause(); setPlaying(false);
    try {
      if (current && el) await sendTick("pause", current, el.currentTime);
      await tickQueue.current;
      const payload = await api({ action: "vote", questionId: q.id, choice });
      if (account.current !== expected || generation !== requestGeneration.current || questionRef.current?.id !== q.id) return;
      setNotice(payload.replayed ? "recorded" : "earned"); setRound(n => n + 1);
      adoptQuestion(payload.nextQuestion ?? null);
      if (payload.nextError) setError("LOAD_FAILED");
    } catch (e) { if (account.current === expected && generation === requestGeneration.current) setError(e instanceof Error ? e.message : "SAVE_FAILED"); }
    finally { if (account.current === expected && generation === requestGeneration.current) setBusy(false); }
  };
  const retry = () => {
    if (error === "SAVE_FAILED" && lastChoice.current && questionRef.current) void vote(lastChoice.current);
    else void load(Boolean(notice));
  };
  const message = error === "LISTEN_FIRST" ? c.listenFirst : error === "SAVE_FAILED" ? c.saveFailed
    : error === "LISTENING_UNAVAILABLE" || error === "WORK_UNAVAILABLE" ? c.playbackFailed : c.loadFailed;
  const hudState = error || playbackError ? "error" : busy ? "next" : !question ? "loading" : canVote ? "vote" : arming || (!playing && (!mediaReady.A || !mediaReady.B)) ? "buffering" : playing ? "listening" : "ready";
  const hudTitle = hudState === "error" ? c.hudError : hudState === "next" ? c.hudNext : hudState === "loading" ? c.loading : hudState === "vote" ? c.hudVote : hudState === "buffering" ? c.hudBuffering : hudState === "listening" ? c.hudListening + " " + side : c.hudReady;
  return <main className={styles.page}><EditorialHeader active="battle" returnPath="/battle/listen"/>
    <div className={styles.container}>
      <div className={styles.listenHeader}><Link className={styles.back} href={"/battle?lang=" + lang} onClick={stopAudio}><ArrowLeft size={19}/>{c.back}</Link>
        <div className={styles.listenTitle}><div><h1>{c.blind}</h1><p>{c.listenDescription}</p></div><span className={styles.reward}>{c.reward}</span></div>
      </div>
      <section className={styles.stage} aria-label={c.blind}>
        {userId && <div className={styles.hud} data-state={hudState} role="status" aria-live="polite" key={hudState + round}>
          <span className={styles.hudRound}>ROUND {String(round).padStart(2, "0")}</span><strong>{hudTitle}</strong>
          <span>{hudState === "vote" ? c.readyNote : hudState === "ready" ? c.hudStart : hudState === "listening" ? c.hudMinimum : hudState === "next" ? c.saving : hudState === "buffering" ? c.hudWait : ""}</span>
        </div>}
        {(["A", "B"] as BlindSide[]).map(target => <div className={styles.station} key={target}>
          <img src="/images/battle-retro/blind-stage.webp" alt="" className={styles.stationArt + (target === "B" ? " " + styles.stationArtRight : "")}/>
          <div className={styles.stationLabel}><strong>{target}</strong><span>30 {lang === "zh" ? "秒片段" : lang === "ja" ? "秒" : lang === "ko" ? "초" : "sec"}</span><span className={styles.listenMeter} data-complete={heard[target] >= BLIND_MIN_SECONDS}>{heard[target] >= BLIND_MIN_SECONDS ? c.seekUnlocked : Math.min(8, Math.floor(heard[target])) + "/8s"}</span></div>
          <div className={styles.controls}>
            <button className={styles.play} disabled={!question || busy || loading} onClick={() => void start(target)} aria-label={(side === target && playing ? c.pause : c.play) + " " + target}>
              {side === target && playing ? <Pause size={22}/> : <Play size={22} fill="currentColor"/>}<span>{side === target && playing ? c.pause : c.play} {target}</span>
            </button>
            <button className={styles.replay} disabled={!question || busy || loading || arming !== null || heard[target] < BLIND_MIN_SECONDS} onClick={() => void start(target, true)} aria-label={c.replay + " " + target}><RotateCcw size={21}/></button>
            <input className={styles.seek} type="range" min={0} max={30} step={0.1} value={positions[target]}
              disabled={!question || busy || loading || arming !== null || heard[target] < BLIND_MIN_SECONDS}
              aria-label={c.seek + " " + target} aria-valuetext={positions[target].toFixed(1) + "/30s"}
              title={heard[target] >= BLIND_MIN_SECONDS ? c.seekUnlocked : c.seekLocked}
              onChange={e => seek(target, Number(e.target.value))}/>
            <time>{Math.floor(positions[target] / 60)}:{String(Math.floor(positions[target] % 60)).padStart(2, "0")} / 0:30</time>
          </div>
        </div>)}
        <span className={styles.stageVs} aria-hidden="true">VS</span><span className={styles.clip}>{c.clip}</span>
      </section>
      {!authReady || loading ? <div className={styles.state} role="status"><p>{c.loading}</p></div>
        : !userId ? <div className={styles.state}><p>{c.loginNote}</p><Link className={styles.primary} href={"/auth?lang=" + lang + "&next=" + encodeURIComponent("/battle/listen?lang=" + lang)}>{c.login}</Link></div>
        : !question && !error ? <div className={styles.state}><p>{c.empty}</p><Link href={"/ai-music?lang=" + lang}>{c.explore}</Link></div> : null}
      {error || playbackError ? <div className={styles.state + " " + styles.error} role="alert"><p>{playbackError ? c.playbackFailed : message}</p>
        <button onClick={retry} disabled={busy}>{c.retry}</button>
      </div> : null}
      <div className={styles.decision}>
        <div className={styles.choices}>
          {(["A", "tie", "B"] as BlindChoice[]).map(choice => <button key={choice} disabled={!canVote} onClick={() => void vote(choice)}>
            {choice === "tie" ? <Equal/> : <Heart/>}{choice === "tie" ? c.tie : c.prefer + " " + choice}
          </button>)}
        </div>
        <div className={styles.flow}><div><p role="status">{busy ? c.saving : notice === "earned" ? c.awarded : notice === "recorded" ? c.alreadyRecorded : canVote ? c.readyNote : c.listenFirst}</p>
          <p>{c.rankingNote}</p></div><Link className={styles.next} href={"/battle?lang=" + lang} onClick={stopAudio}>{c.exit}<ArrowLeft size={20}/></Link>
        </div>
      </div>
      {(["A", "B"] as BlindSide[]).map(target => <audio key={target} data-side={target} ref={target === "A" ? audioA : audioB}
        src={question ? target === "A" ? question.audioA : question.audioB : undefined} preload="auto" onLoadedMetadata={() => {
          const el = target === "A" ? audioA.current : audioB.current; if (!el) return;
          if (!Number.isFinite(el.duration) || el.duration < BLIND_END) { audioA.current?.pause(); audioB.current?.pause(); setPlaybackError(true); setPlaying(false); return; }
          el.currentTime = BLIND_START; if (el.readyState >= 2) setMediaReady(p => ({ ...p, [target]: true }));
        }} onCanPlay={() => { setMediaReady(p => ({ ...p, [target]: true })); }} onTimeUpdate={() => {
          const el = target === "A" ? audioA.current : audioB.current;
          if (!el || !playbackAuthorized.current || sideRef.current !== target || !questionRef.current || el.readyState === 0) return;
          if (el.currentTime < BLIND_START) { el.currentTime = BLIND_START; return; }
          measure(target, el);
          const position = Math.min(BLIND_END, el.currentTime);
          setPositions(p => ({ ...p, [target]: Math.min(30, Math.max(0, position - BLIND_START)) }));
          if (position >= BLIND_END && !ended.current[target]) {
            ended.current[target] = true; el.pause(); if (el.currentTime > BLIND_END) el.currentTime = BLIND_END;
            setPlaying(false); void sendTick("pause", target, BLIND_END);
          } else if (!el.paused && (performance.now() - lastTick.current > 2000 || (!thresholdSent.current[target] && measured.current[target] >= BLIND_MIN_SECONDS))) {
            if (measured.current[target] >= BLIND_MIN_SECONDS) thresholdSent.current[target] = true;
            lastTick.current = performance.now(); void sendTick("progress", target, position);
          }
        }} onPlaying={() => {
          if (!playbackAuthorized.current || sideRef.current !== target) return;
          const el = target === "A" ? audioA.current : audioB.current;
          if (el) sample.current[target] = { position: el.currentTime, at: performance.now() };
          setPlaying(true); setArming(null);
        }} onWaiting={() => { if (playbackAuthorized.current && sideRef.current === target) { setPlaying(false); setArming(target); } }} onPause={() => { const el = target === "A" ? audioA.current : audioB.current; if (sideRef.current === target && el?.paused) setPlaying(false); }} onError={() => {
          const el = target === "A" ? audioA.current : audioB.current;
          if (questionRef.current && el?.getAttribute("src")) { setPlaybackError(true); setPlaying(false); }
        }} />)}
    </div>
  </main>;
}
