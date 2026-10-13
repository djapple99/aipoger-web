/* eslint-disable @next/next/no-img-element -- Generated studio plates and dynamic original covers. */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Equal, Heart, Pause, Play, RotateCcw } from "lucide-react";
import EditorialHeader from "./editorial-header";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { battleRetroCopy } from "@/lib/battle-retro-copy";
import { BLIND_END, BLIND_START, type BlindChoice, type BlindSide } from "@/lib/blind-listening";
import { musicPlayer } from "@/lib/music-player-store";
import styles from "./battle-retro.module.css";
type Question = { id: string; audioA: string; audioB: string; heardA: number; heardB: number; expiresAt: string };
type Revealed = { side: string; id?: string; title?: string; artist?: string; coverUrl?: string; href?: string; unavailable?: boolean };
type Result = { choice: BlindChoice; awarded: number; balance: number; works?: Revealed[]; replayed?: boolean };
export default function BlindListeningRoom() {
  const { lang } = useI18n(); const c = battleRetroCopy(lang);
  const [userId, setUserId] = useState<string | null>(null), [authReady, setAuthReady] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null), [loading, setLoading] = useState(false);
  const [error, setError] = useState(""), [playbackError, setPlaybackError] = useState(false), [busy, setBusy] = useState(false);
  const [side, setSide] = useState<BlindSide | null>(null), [playing, setPlaying] = useState(false);
  const [positions, setPositions] = useState({ A: 0, B: 0 }), [heard, setHeard] = useState({ A: 0, B: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const account = useRef<string | null>(null), questionRef = useRef<Question | null>(null), sideRef = useRef<BlindSide | null>(null);
  const requestGeneration = useRef(0), tickQueue = useRef<Promise<void>>(Promise.resolve()), lastTick = useRef(0);
  const lastChoice = useRef<BlindChoice | null>(null), ended = useRef({ A: false, B: false });
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
  const stopAudio = useCallback(() => {
    const el = audio.current; if (el) { el.pause(); el.removeAttribute("src"); el.load(); }
    sideRef.current = null; setSide(null); setPlaying(false);
  }, []);
  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    stopAudio(); questionRef.current = null; setQuestion(null); setResult(null); setError(""); setPlaybackError(false);
    setPositions({ A: 0, B: 0 }); setHeard({ A: 0, B: 0 });
    setBusy(false);
    lastChoice.current = null; ended.current = { A: false, B: false };
    if (!account.current) return;
    setLoading(true);
    try {
      const payload = await api();
      if (generation !== requestGeneration.current) return;
      questionRef.current = payload.question; setQuestion(payload.question);
      if (payload.question) setHeard({ A: payload.question.heardA, B: payload.question.heardB });
    } catch (e) { if (generation === requestGeneration.current) setError(e instanceof Error ? e.message : "LOAD_FAILED"); }
    finally { if (generation === requestGeneration.current) setLoading(false); }
  }, [api, stopAudio]);
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
    return () => { alive = false; account.current = null; subscription.unsubscribe(); stopAudio(); };
  }, [load, stopAudio]);
  const sendTick = useCallback((event: "play" | "progress" | "pause", target: BlindSide, position: number) => {
    const q = questionRef.current, expected = account.current;
    if (!q || !expected) return tickQueue.current;
    const id = q.id;
    tickQueue.current = tickQueue.current.catch(() => {}).then(async () => {
      if (questionRef.current?.id !== id || account.current !== expected) return;
      try {
        const payload = await api({ action: "tick", questionId: id, side: target, event, position: Math.max(15, Math.min(45, position)) });
        if (questionRef.current?.id === id && account.current === expected) setHeard({ A: Number(payload.heardA), B: Number(payload.heardB) });
      } catch { if (questionRef.current?.id === id && account.current === expected) setError("LISTENING_UNAVAILABLE"); }
    });
    return tickQueue.current;
  }, [api]);
  const start = useCallback((target: BlindSide, replay = false) => {
    const el = audio.current, q = questionRef.current;
    if (!el || !q || busy || result) return;
    musicPlayer?.close(); setError(""); setPlaybackError(false);
    const expected = account.current;
    ended.current[target] = false;
    const current = sideRef.current;
    if (current === target && !el.paused && !replay) {
      el.pause(); void sendTick("pause", target, el.currentTime); setPlaying(false); return;
    }
    if (current && !el.paused) { el.pause(); void sendTick("pause", current, el.currentTime); }
    if (current !== target) {
      sideRef.current = target; setSide(target);
      el.src = target === "A" ? q.audioA : q.audioB; el.load();
      void sendTick("play", target, 15);
    } else {
      if (replay || el.currentTime >= BLIND_END - .05) el.currentTime = BLIND_START;
      void sendTick("play", target, el.currentTime);
    }
    lastTick.current = performance.now();
    void el.play().then(() => {
      if (account.current === expected && questionRef.current?.id === q.id) setPlaying(true);
    }).catch(() => {
      if (account.current === expected && questionRef.current?.id === q.id) { setPlaying(false); setPlaybackError(true); }
    });
  }, [busy, result, sendTick]);
  const vote = async (choice: BlindChoice) => {
    const q = questionRef.current; if (!q || busy || result) return;
    lastChoice.current = choice;
    const expected = account.current; setBusy(true); setError("");
    audio.current?.pause(); setPlaying(false);
    try {
      if (sideRef.current && audio.current) await sendTick("pause", sideRef.current, audio.current.currentTime);
      await tickQueue.current;
      const payload = await api({ action: "vote", questionId: q.id, choice });
      if (account.current === expected && questionRef.current?.id === q.id) setResult(payload);
    } catch (e) {
      if (account.current === expected) setError(e instanceof Error ? e.message : "SAVE_FAILED");
    } finally { if (account.current === expected) setBusy(false); }
  };
  const skip = async () => {
    if (!questionRef.current || busy) return;
    setBusy(true); stopAudio();
    try { await api({ action: "skip", questionId: questionRef.current.id }); await load(); }
    catch { setError("LOAD_FAILED"); } finally { setBusy(false); }
  };
  const canVote = Boolean(question && heard.A >= 28.5 && heard.B >= 28.5 && !playbackError && !loading);
  const message = error === "LISTEN_FIRST" ? c.listenFirst : error === "SAVE_FAILED" ? c.saveFailed
    : error === "LISTENING_UNAVAILABLE" || error === "WORK_UNAVAILABLE" ? c.playbackFailed : c.loadFailed;
  const revealRetry = async () => {
    if (!question) return;
    try { const p = await api({ action: "reveal", questionId: question.id }); setResult(r => r ? { ...r, ...p } : r); setError(""); }
    catch { setError("REVEAL_UNAVAILABLE"); }
  };
  return <main className={styles.page}><EditorialHeader active="battle" returnPath="/battle/listen"/>
    <div className={styles.container}>
      <div className={styles.listenHeader}><Link className={styles.back} href={"/battle?lang=" + lang}><ArrowLeft size={19}/>{c.back}</Link>
        <div className={styles.listenTitle}><div><h1>{c.blind}</h1><p>{c.listenDescription}</p></div><span className={styles.reward}>{c.reward}</span></div>
      </div>
      <section className={styles.stage} aria-label={c.blind}>
        {(["A", "B"] as BlindSide[]).map(target => <div className={styles.station} key={target}>
          <img src="/images/battle-retro/blind-stage.webp" alt="" className={styles.stationArt + (target === "B" ? " " + styles.stationArtRight : "")}/>
          <div className={styles.stationLabel}><strong>{target}</strong><span>30 {lang === "zh" ? "秒片段" : lang === "ja" ? "秒" : lang === "ko" ? "초" : "sec"}</span></div>
          <div className={styles.controls}>
            <button className={styles.play} disabled={!question || busy || Boolean(result)} onClick={() => start(target)} aria-label={(side === target && playing ? c.pause : c.play) + " " + target}>
              {side === target && playing ? <Pause size={22}/> : <Play size={22} fill="currentColor"/>}<span>{side === target && playing ? c.pause : c.play} {target}</span>
            </button>
            <button className={styles.replay} disabled={!question || busy || Boolean(result)} onClick={() => start(target, true)} aria-label={c.replay + " " + target}><RotateCcw size={21}/></button>
            <progress max={30} value={positions[target]} aria-label={c.play + " " + target}/>
            <time>{Math.floor(positions[target] / 60)}:{String(Math.floor(positions[target] % 60)).padStart(2, "0")} / 0:30</time>
          </div>
        </div>)}
        <span className={styles.stageVs} aria-hidden="true">VS</span><span className={styles.clip}>{c.clip}</span>
      </section>
      {!authReady || loading ? <div className={styles.state} role="status"><p>{c.loading}</p></div>
        : !userId ? <div className={styles.state}><p>{c.loginNote}</p><Link className={styles.primary} href={"/auth?lang=" + lang + "&next=" + encodeURIComponent("/battle/listen?lang=" + lang)}>{c.login}</Link></div>
        : !question && !error ? <div className={styles.state}><p>{c.empty}</p><Link href={"/ai-music?lang=" + lang}>{c.back}</Link></div> : null}
      {error ? <div className={styles.state + " " + styles.error} role="alert"><p>{message}</p>
        <button onClick={() => result ? void revealRetry() : error === "WORK_UNAVAILABLE" ? void skip() : lastChoice.current ? void vote(lastChoice.current) : question ? setError("") : void load()} disabled={busy}>{error === "WORK_UNAVAILABLE" ? c.next : c.retry}</button>
      </div> : null}
      {playbackError ? <div className={styles.state + " " + styles.error} role="alert"><p>{c.playbackFailed}</p><button className={styles.next} onClick={() => void skip()} disabled={busy}>{c.next}<ArrowRight size={18}/></button></div> : null}
      <div className={styles.decision}>
        <div className={styles.choices}>
          {(["A", "tie", "B"] as BlindChoice[]).map(choice => <button key={choice} disabled={!canVote || busy || Boolean(result)}
            aria-pressed={result?.choice === choice} onClick={() => void vote(choice)}>
            {choice === "tie" ? <Equal/> : <Heart/>}{choice === "tie" ? c.tie : c.prefer + " " + choice}
          </button>)}
        </div>
        <div className={styles.flow}><div><p role="status">{result ? result.replayed ? c.alreadyRecorded : c.awarded : canVote ? c.revealNote : c.listenFirst}</p>
          <p>{c.rankingNote}</p></div><button className={styles.next} disabled={!result || busy} onClick={() => void load()}>{c.next}<ArrowRight size={20}/></button>
        </div>
      </div>
      {result ? <section className={styles.reveal} aria-label={c.selected}><h2>{c.selected}</h2>
        {result.works ? <div className={styles.revealRows}>{result.works.map(work => <article className={styles.revealedWork} key={work.side}>
          {work.coverUrl ? <img src={work.coverUrl} alt=""/> : null}<div><strong>{work.side} · {work.title || c.unavailable}</strong><p>{work.artist}</p>
            {work.id ? <Link href={"/ai-music?lang=" + lang + "&track=" + work.id + "#works"}>{c.support}</Link> : null}</div>
        </article>)}</div> : <button onClick={() => void revealRetry()}>{c.revealFailed} {c.retry}</button>}
        <Link className={styles.back} href={"/profile?lang=" + lang}>{c.credits}<ArrowRight size={16}/></Link>
      </section> : null}
      <audio ref={audio} preload="metadata" onLoadedMetadata={() => {
        const el = audio.current; if (!el) return;
        if (!Number.isFinite(el.duration) || el.duration < 45) { el.pause(); setPlaybackError(true); setPlaying(false); return; }
        el.currentTime = 15;
      }} onTimeUpdate={() => {
        const el = audio.current, target = sideRef.current;
        if (!el || !target || !questionRef.current) return;
        if (el.readyState === 0) return;
        if (el.currentTime < 15) { el.currentTime = 15; return; }
        const position = Math.min(45, el.currentTime);
        setPositions(p => ({ ...p, [target]: Math.min(30, Math.max(0, position - 15)) }));
        if (position >= 45 && !ended.current[target]) {
          ended.current[target] = true; el.pause(); if (el.currentTime > 45) el.currentTime = 45;
          setPlaying(false); void sendTick("pause", target, 45);
        }
        else if (!el.paused && performance.now() - lastTick.current > 2000) { lastTick.current = performance.now(); void sendTick("progress", target, position); }
      }} onPause={() => setPlaying(false)} onError={() => { if (questionRef.current && audio.current?.getAttribute("src")) { setPlaybackError(true); setPlaying(false); } }} />
    </div>
  </main>;
}
