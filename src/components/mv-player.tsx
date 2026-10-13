"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import WorkImage from "@/components/work-image";
import { loadYouTubeAPI, type YouTubePlayer } from "@/lib/youtube-player-api";
import { getMusicPlayerState, musicPlayer } from "@/lib/music-player-store";
import { useI18n } from "@/lib/i18n";
import { homeCopy } from "@/lib/home-copy";
import { mvCopy } from "@/lib/mv-copy";
import type { HomeWork } from "@/lib/home-discovery";
import styles from "./home-editorial.module.css";

export default function MvPlayer({ work, autoPlay, onEnded, onUnavailable }: {
  work: HomeWork; autoPlay: boolean; onEnded?: () => void; onUnavailable?: () => void;
}) {
  const { lang } = useI18n(); const copy = homeCopy(lang); const mv = mvCopy(lang);
  const container = useRef<HTMLDivElement>(null);
  const apiPlayer = useRef<YouTubePlayer | null>(null);
  const latest = useRef({ work, autoPlay, onEnded, onUnavailable });
  latest.current = { work, autoPlay, onEnded, onUnavailable };
  const [active, setActive] = useState(autoPlay);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pauseRadio = () => { if (getMusicPlayerState().playing) musicPlayer?.toggle(); };
  useEffect(() => {
    if (!active) return;
    const host = container.current;
    let alive = true; let instance: YouTubePlayer | null = null;
    void loadYouTubeAPI().then(api => {
      if (!alive || !container.current) return;
      const mount = document.createElement("div"); container.current.appendChild(mount);
      instance = new api.Player(mount, {
        host: "https://www.youtube-nocookie.com", width: "100%", height: "100%",
        videoId: latest.current.work.videoId,
        playerVars: { origin: window.location.origin, playsinline: 1, rel: 0, autoplay: 1 },
        events: {
          onReady: () => {
            if (!alive || !instance) return;
            apiPlayer.current = instance;
            const frame = container.current?.querySelector("iframe");
            if (frame) frame.title = latest.current.work.title;
            pauseRadio(); instance.loadVideoById(latest.current.work.videoId!);
          },
          onStateChange: (event: { data: number }) => {
            if (!alive || instance?.getVideoData().video_id !== latest.current.work.videoId) return;
            setPlaying(event.data === 1);
            if (event.data === 1) { pauseRadio(); setBlocked(false); setFailed(false); }
            if (event.data === 0) latest.current.onEnded?.();
          },
          onAutoplayBlocked: () => { if (alive) setBlocked(true); },
          onError: (event: { data: number }) => {
            if (!alive) return;
            setFailed(true); setPlaying(false);
            if ([2, 100, 101, 150].includes(event.data)) latest.current.onUnavailable?.();
          },
        },
      });
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; apiPlayer.current = null; instance?.destroy(); host?.replaceChildren(); };
  }, [active, attempt]);
  useEffect(() => {
    setBlocked(false); setFailed(false); setPlaying(false);
    if (!apiPlayer.current) return;
    const frame = container.current?.querySelector("iframe"); if (frame) frame.title = work.title;
    if (autoPlay) { pauseRadio(); apiPlayer.current.loadVideoById(work.videoId!); }
    else apiPlayer.current.cueVideoById(work.videoId!);
  }, [work.id, work.videoId, work.title, autoPlay]);
  const play = () => { pauseRadio(); if (!active) setActive(true); else if (apiPlayer.current) apiPlayer.current.playVideo(); else setAttempt(value => value + 1); };
  return <>
    <div className={styles.feedbackVideo}>
      {active ? <div ref={container} className={styles.mvPlayerMount} /> : <button className={styles.poster} type="button" onClick={play} aria-label={`${copy.watch} · ${work.title}`}>
        <WorkImage work={work} video /><span className={styles.posterPlay}><Play size={27} fill="currentColor" /></span><span className={styles.videoSource}>{copy.source}</span>
      </button>}
    </div>
    {active ? <div className={styles.mvPlaybackControls}>
      <button type="button" aria-label={mv.playPause} onClick={() => { if (playing) apiPlayer.current?.pauseVideo(); else play(); }}>
        {playing ? <Pause size={18} /> : <Play size={18} />} {blocked ? mv.continuePlaying : mv.playPause}
      </button>
      {failed ? <span role="status">{mv.videoError}<button type="button" onClick={() => { setAttempt(value => value + 1); setFailed(false); }}>{copy.retry}</button></span> : null}
    </div> : null}
  </>;
}
