"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { loadYouTubeAPI, type YouTubePlayer } from "@/lib/youtube-player-api";

/** One visible official player; no extraction, hidden audio, or background playback. */
export default function YouTubeRadioPlayer(props: {
  videoId: string; requestId: number; autoplay: boolean; volume: number; title: string;
  active?: boolean;
  playbackDialogRef?: MutableRefObject<HTMLDialogElement | null>;
  playerRef: MutableRefObject<YouTubePlayer | null>;
  onPlaying: (playing: boolean) => void;
  onProgress: (time: number, duration: number) => void;
  onEnded: () => void; onError: (blocked: boolean) => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const ready = useRef(false);
  const endedRequest = useRef<number | null>(null);
  const suspended = useRef(false);
  const startedRequest = useRef<number | null>(null);
  const load = useRef(() => {});
  useEffect(() => {
    let active = true;
    let player: YouTubePlayer | null = null;
    const timeout = window.setTimeout(() => { if (active && !ready.current) latest.current.onError(false); }, 15_000);
    const obscured = () => latest.current.active === false || document.hidden || Array.from(document.querySelectorAll('dialog[open], [role="dialog"][aria-modal="true"]')).some(dialog => dialog !== latest.current.playbackDialogRef?.current);
    const pauseIfObscured = () => {
      if (obscured()) { suspended.current = true; if (ready.current) player?.pauseVideo(); }
    };
    load.current = () => {
      if (!ready.current || !player) return;
      const p = latest.current;
      suspended.current = obscured();
      endedRequest.current = null; startedRequest.current = null;
      player.setVolume(p.volume * 100);
      if (p.autoplay && !suspended.current) player.loadVideoById(p.videoId);
      else player.cueVideoById(p.videoId);
    };
    void loadYouTubeAPI().then(api => {
      if (!active || !mount.current) return;
      const child = document.createElement("div");
      mount.current.appendChild(child);
      player = new api.Player(child, {
        width: "100%", height: "100%", host: "https://www.youtube-nocookie.com",
        videoId: latest.current.videoId,
        playerVars: { origin: window.location.origin, playsinline: 1, rel: 0, autoplay: 0, loop: 0 },
        events: {
          onReady: () => {
            if (!active) return;
            window.clearTimeout(timeout);
            ready.current = true;
            latest.current.playerRef.current = player;
            const frame = mount.current?.querySelector("iframe");
            if (frame) frame.title = "YouTube radio player";
            load.current();
          },
          onStateChange: (event: { data: number }) => {
            if (!active || !ready.current || latest.current.active === false || player?.getVideoData()?.video_id !== latest.current.videoId) return;
            if (event.data === 1) {
              if (obscured()) { pauseIfObscured(); return; }
              suspended.current = false;
              startedRequest.current = latest.current.requestId;
              document.querySelectorAll("audio,video").forEach(media => {
                if (media instanceof HTMLMediaElement) media.pause();
              });
            }
            latest.current.onPlaying(event.data === 1);
            if (event.data === 0 && startedRequest.current === latest.current.requestId && !suspended.current && !obscured() && endedRequest.current !== latest.current.requestId) {
              endedRequest.current = latest.current.requestId;
              latest.current.onEnded();
            }
          },
          onAutoplayBlocked: () => { if (active) latest.current.onError(true); },
          onError: () => { if (active) latest.current.onError(false); },
        },
      });
    }).catch(() => { if (active) latest.current.onError(false); });
    const timer = window.setInterval(() => {
      if (ready.current && latest.current.active !== false && player?.getVideoData()?.video_id === latest.current.videoId) {
        latest.current.onProgress(player.getCurrentTime() || 0, player.getDuration() || 0);
      }
    }, 400);
    document.addEventListener("visibilitychange", pauseIfObscured);
    const observer = new MutationObserver(pauseIfObscured);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    return () => {
      active = false; ready.current = false; observer.disconnect(); window.clearInterval(timer); window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", pauseIfObscured);
      latest.current.playerRef.current = null;
      player?.destroy();
    };
  }, []);
  useEffect(() => { load.current(); }, [props.requestId, props.videoId, props.active]);
  useEffect(() => { props.playerRef.current?.setVolume(props.volume * 100); }, [props.volume, props.playerRef]);
  return <div ref={mount} aria-label={props.title} style={{ width: "100%", height: props.playbackDialogRef ? undefined : 200, aspectRatio: props.playbackDialogRef ? "16/9" : undefined, minHeight: 200, background: "#080808" }} />;
}
