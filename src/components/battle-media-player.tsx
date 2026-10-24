"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { loadYouTubeAPI, type YouTubePlayer } from "@/lib/youtube-player-api";
import { playbackYouTubeId, playbackAudioUrl, type BattleLinkPlayback } from "@/lib/battle-link-rules";

export type BattlePlayerHandle = {
  readonly src: string; readonly currentSrc: string; readonly duration: number; readonly readyState: number;
  currentTime: number; volume: number; muted: boolean; loop: boolean; readonly paused: boolean;
  play(): Promise<void>; pause(): void; load(): void;
};
/** Relative segment clock; the visible official YouTube player is never extracted or hidden. */
const BattleMediaPlayer = forwardRef<BattlePlayerHandle, {
  playback: BattleLinkPlayback; title: string; audioUrl?: string | null;
  onTime?: () => void; onEnded?: () => void; onPlaying?: (value: boolean) => void; onError?: () => void;
}>((props, ref) => {
  const native = useRef<HTMLAudioElement>(null); const mount = useRef<HTMLDivElement>(null);
  const yt = useRef<YouTubePlayer | null>(null); const latest = useRef(props); latest.current = props;
  const pending = useRef<{ resolve: () => void; reject: (reason: Error) => void } | null>(null);
  const volume = useRef(1); const muted = useRef(false); const ended = useRef(false); const started = useRef(false);
  const desiredTime = useRef(0); const playing = useRef(false); const ready = useRef<Promise<void>>(Promise.resolve());
  const videoId = playbackYouTubeId(props.playback);
  useImperativeHandle(ref, () => ({
    get src() { return latest.current.audioUrl || playbackAudioUrl(latest.current.playback) || latest.current.playback.url; },
    get currentSrc() { return native.current?.currentSrc || latest.current.playback.url; },
    get readyState() { return yt.current ? 4 : native.current?.readyState ?? 0; },
    get duration() { return latest.current.playback.seconds; },
    get currentTime() { return Math.max(0, (yt.current?.getCurrentTime() ?? native.current?.currentTime ?? latest.current.playback.start) - latest.current.playback.start); },
    set currentTime(value) {
      desiredTime.current = Math.max(0, Math.min(value, latest.current.playback.seconds));
      const absolute = latest.current.playback.start + desiredTime.current;
      yt.current?.seekTo(absolute, true);
      if (native.current) native.current.currentTime = absolute;
      ended.current = false;
    },
    get paused() { return yt.current ? !playing.current : native.current?.paused ?? true; },
    get volume() { return volume.current; },
    set volume(value) { volume.current = value; yt.current?.setVolume(muted.current ? 0 : value * 100); if (native.current) native.current.volume = value; },
    get muted() { return muted.current; },
    set muted(value) { muted.current = value; yt.current?.setVolume(value ? 0 : volume.current * 100); if (native.current) native.current.muted = value; },
    loop: false,
    async play() {
      await ready.current; ended.current = false;
      if (yt.current) {
        yt.current.seekTo(latest.current.playback.start + desiredTime.current, true);
        return new Promise<void>((resolve, reject) => {
          pending.current?.reject(new Error("Playback replaced")); pending.current = { resolve, reject };
          yt.current?.playVideo();
          window.setTimeout(() => { if (pending.current?.resolve === resolve) { pending.current = null; reject(new Error("Tap to play")); } }, 8000);
        });
      }
      const audio = native.current; if (!audio) throw new Error("Player unavailable");
      audio.currentTime = latest.current.playback.start + desiredTime.current;
      await audio.play();
    },
    pause() { yt.current?.pauseVideo(); native.current?.pause(); },
    load() { native.current?.load(); },
  }), []);
  useEffect(() => {
    started.current = false; ended.current = false; desiredTime.current = 0;
    if (!videoId) { ready.current = Promise.resolve(); return; }
    let active = true; let resolveReady: () => void = () => {}; let rejectReady: (e: Error) => void = () => {};
    ready.current = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    // A failed load is surfaced through onError even before someone presses play.
    void ready.current.catch(() => {});
    const timer = window.setTimeout(() => { rejectReady(new Error("Player unavailable")); latest.current.onError?.(); }, 15000);
    void loadYouTubeAPI().then(api => {
      if (!active || !mount.current) return;
      const child = document.createElement("div"); mount.current.appendChild(child);
      const p = new api.Player(child, { width: "100%", height: "100%", host: "https://www.youtube-nocookie.com", videoId,
        playerVars: { origin: location.origin, playsinline: 1, rel: 0, start: Math.floor(latest.current.playback.start) },
        events: {
          onReady: () => { if (!active) return; window.clearTimeout(timer); yt.current = p; p.setVolume(volume.current * 100); resolveReady(); },
          onStateChange: (e: { data: number }) => {
            if (!active) return;
            playing.current = e.data === 1;
            if (e.data === 1) { started.current = true; pending.current?.resolve(); pending.current = null; }
            latest.current.onPlaying?.(e.data === 1);
            if (e.data === 0 && started.current && !ended.current) { ended.current = true; latest.current.onEnded?.(); }
          },
          onError: () => { pending.current?.reject(new Error("Source unavailable")); pending.current = null; latest.current.onError?.(); },
          onAutoplayBlocked: () => { pending.current?.reject(new Error("Tap to play")); pending.current = null; latest.current.onPlaying?.(false); },
        },
      });
    }).catch(() => { rejectReady(new Error("Player unavailable")); latest.current.onError?.(); });
    return () => { active = false; window.clearTimeout(timer); pending.current?.reject(new Error("Player closed")); pending.current = null; yt.current?.destroy(); yt.current = null; };
  }, [videoId, props.playback.url]);
  const tick = () => {
    const p = latest.current.playback;
    const time = yt.current?.getCurrentTime() ?? native.current?.currentTime ?? p.start;
    desiredTime.current = Math.max(0, time - p.start);
    latest.current.onTime?.();
    if (started.current && time >= p.start + p.seconds - 0.08 && !ended.current) {
      ended.current = true; yt.current?.pauseVideo(); native.current?.pause(); latest.current.onEnded?.();
    } else if (started.current && time < p.start - 0.25) {
      yt.current?.seekTo(p.start, true); if (native.current) native.current.currentTime = p.start;
    }
  };
  const tickRef = useRef(tick); tickRef.current = tick;
  useEffect(() => { if (!videoId) return; const timer = window.setInterval(() => tickRef.current(), 150); return () => window.clearInterval(timer); }, [videoId]);
  return videoId ? <div ref={mount} aria-label={props.title} className="relative my-3 h-[210px] min-w-[200px] w-full overflow-hidden rounded-xl bg-black" />
    : <audio ref={native} src={props.audioUrl || playbackAudioUrl(props.playback) || undefined} preload="metadata"
      onTimeUpdate={tick} onPlaying={() => { started.current = true; props.onPlaying?.(true); }} onPause={() => props.onPlaying?.(false)}
      onEnded={() => { if (!ended.current) { ended.current = true; props.onEnded?.(); } }} onError={() => props.onError?.()} />;
});
BattleMediaPlayer.displayName = "BattleMediaPlayer";
export default BattleMediaPlayer;
