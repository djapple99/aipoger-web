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
  const [notice, setNotice] = useState<"earned" | "recorded" | null>(null);
  const audioA = useRef<HTMLAudioElement | null>(null), audioB = useRef<HTMLAudioElement | null>(null);
  const account = useRef<string | null>(null), questionRef = useRef<Question | null>(null), sideRef = useRef<BlindSide | null>(null);
  const requestGeneration = useRef(0), tickQueue = useRef<Promise<void>>(Promise.resolve()), lastTick = useRef(0);
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
  const stopAudio = useCallback(() => {
    for (const el of [audioA.current, audioB.current]) { if (el) { el.pause(); el.removeAttribute("src"); el.load(); } }
    sideRef.current = null; setSide(null); setPlaying(false);
  }, []);
  const adoptQuestion = useCallback((next: Question | null) => {
    stopAudio(); questionRef.current = next; setQuestion(next); setError(""); setPlaybackError(false);
    setPositions({ A: 0, B: 0 }); setHeard({ A: next?.heardA ?? 0, B: next?.heardB ?? 0 });
    lastChoice.current = null; ended.current = { A: false, B: false }; thresholdSent.current = { A: false, B: false };
  }, [stopAudio]);
  const load = useCallback(async (preserveNotice = false) => {
    const generation = invalidateRequests();
    adoptQuestion(null); setBusy(false); if (!preserveNotice) setNotice(null);
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
  const sendTick = useCallback((event: "play" | "progress" | "pause", target: BlindSide, position: number) => {
    const q = questionRef.current, expected = account.current;
    if (!q || !expected) return tickQueue.current;
    const id = q.id;
    tickQueue.current = tickQueue.current.catch(() => {}).then(async () => {
      if (questionRef.current?.id !== id || account.current !== expected) return;
      try {
        const payload = await api({ action: "tick", questionId: id, side: target, event, position: Math.max(BLIND_START, Math.min(BLIND_END, position)) });
        if (questionRef.current?.id === id && account.current === expected) setHeard({ A: Number(payload.heardA), B: Number(payload.heardB) });
      } catch { if (questionRef.current?.id === id && account.current === expected) setError("LISTENING_UNAVAILABLE"); }
    });
    return tickQueue.current;
  }, [api]);
  const start = useCallback((target: BlindSide, replay = false) => {
    const el = target === "A" ? audioA.current : audioB.current, q = questionRef.current;
    if (!el || !q || busy) return;
    musicPlayer?.close(); setError(""); setPlaybackError(false);
    const expected = account.current, current = sideRef.current;
    if (current === target && !el.paused && !replay) {
      el.pause(); void sendTick("pause", target, el.currentTime); setPlaying(false); return;
    }
    const previous = current === "A" ? audioA.current : current === "B" ? audioB.current : null;
    if (current && previous && !previous.paused) { previous.pause(); void sendTick("pause", current, previous.currentTime); }
    sideRef.current = target; setSide(target); ended.current[target] = false;
    if (el.readyState > 0 && (replay || el.currentTime < BLIND_START || el.currentTime >= BLIND_END)) el.currentTime = BLIND_START;
    lastTick.current = performance.now();
    void sendTick("play", target, el.readyState > 0 ? el.currentTime : BLIND_START);
    void el.play().then(() => {
      if (account.current === expected && questionRef.current?.id === q.id && sideRef.current === target) setPlaying(true);
      else el.pause();
    }).catch(() => {
      if (questionRef.current?.id === q.id && account.current === expected) { setPlaybackError(true); setPlaying(false); }
    });
  }, [busy, sendTick]);
  const canVote = Boolean(question && heard.A >= BLIND_MIN_SECONDS && heard.B >= BLIND_MIN_SECONDS && !playbackError && !loading && !busy);
  const vote = async (choice: BlindChoice) => {
    const q = questionRef.current;
    if (!q || !canVote) return;
    lastChoice.current = choice;
    const expected = account.current, generation = requestGeneration.current; setBusy(true); setError("");
    const current = sideRef.current, el = current === "A" ? audioA.current : audioB.current;
    el?.pause(); setPlaying(false);
    try {
      if (current && el) await sendTick("pause", current, el.currentTime);
      await tickQueue.current;
      const payload = await api({ action: "vote", questionId: q.id, choice });
      if (account.current !== expected || generation !== requestGeneration.current || questionRef.current?.id !== q.id) return;
      setNotice(payload.replayed ? "recorded" : "earned");
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
  return <main className={styles.page}><EditorialHeader active="battle" returnPath="/battle/listen"/>
    <div className={styles.container}>
      <div className={styles.listenHeader}><Link className={styles.back} href={"/battle?lang=" + lang} onClick={stopAudio}><ArrowLeft size={19}/>{c.back}</Link>
        <div className={styles.listenTitle}><div><h1>{c.blind}</h1><p>{c.listenDescription}</p></div><span className={styles.reward}>{c.reward}</span></div>
      </div>
      <section className={styles.stage} aria-label={c.blind}>
        {(["A", "B"] as BlindSide[]).map(target => <div className={styles.station} key={target}>
          <img src="/images/battle-retro/blind-stage.webp" alt="" className={styles.stationArt + (target === "B" ? " " + styles.stationArtRight : "")}/>
          <div className={styles.stationLabel}><strong>{target}</strong><span>30 {lang === "zh" ? "秒片段" : lang === "ja" ? "秒" : lang === "ko" ? "초" : "sec"}</span></div>
          <div className={styles.controls}>
            <button className={styles.play} disabled={!question || busy || loading} onClick={() => start(target)} aria-label={(side === target && playing ? c.pause : c.play) + " " + target}>
              {side === target && playing ? <Pause size={22}/> : <Play size={22} fill="currentColor"/>}<span>{side === target && playing ? c.pause : c.play} {target}</span>
            </button>
            <button className={styles.replay} disabled={!question || busy || loading} onClick={() => start(target, true)} aria-label={c.replay + " " + target}><RotateCcw size={21}/></button>
            <progress max={30} value={positions[target]} aria-label={c.play + " " + target}/>
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
        src={question ? target === "A" ? question.audioA : question.audioB : undefined} preload="metadata" onLoadedMetadata={() => {
          const el = target === "A" ? audioA.current : audioB.current; if (!el) return;
          if (!Number.isFinite(el.duration) || el.duration < BLIND_END) { audioA.current?.pause(); audioB.current?.pause(); setPlaybackError(true); setPlaying(false); return; }
          el.currentTime = BLIND_START;
        }} onTimeUpdate={() => {
          const el = target === "A" ? audioA.current : audioB.current;
          if (!el || sideRef.current !== target || !questionRef.current || el.readyState === 0) return;
          if (el.currentTime < BLIND_START) { el.currentTime = BLIND_START; return; }
          const position = Math.min(BLIND_END, el.currentTime);
          setPositions(p => ({ ...p, [target]: Math.min(30, Math.max(0, position - BLIND_START)) }));
          if (position >= BLIND_END && !ended.current[target]) {
            ended.current[target] = true; el.pause(); if (el.currentTime > BLIND_END) el.currentTime = BLIND_END;
            setPlaying(false); void sendTick("pause", target, BLIND_END);
          } else if (!el.paused && (performance.now() - lastTick.current > 2000 || (!thresholdSent.current[target] && position >= BLIND_START + BLIND_MIN_SECONDS))) {
            if (position >= BLIND_START + BLIND_MIN_SECONDS) thresholdSent.current[target] = true;
            lastTick.current = performance.now(); void sendTick("progress", target, position);
          }
        }} onPause={() => { if (sideRef.current === target) setPlaying(false); }} onError={() => {
          const el = target === "A" ? audioA.current : audioB.current;
          if (questionRef.current && el?.getAttribute("src")) { setPlaybackError(true); setPlaying(false); }
        }} />)}
    </div>
  </main>;
}
