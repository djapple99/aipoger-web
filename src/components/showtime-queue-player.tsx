"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ListMusic, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { clampMediaVolume, setNativeMediaVolume } from "@/lib/media-volume-control";

export type ShowtimePlayerTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
};

type ShowtimePlayerSession = {
  queue: ShowtimePlayerTrack[];
  index: number;
  sourceLabel: string;
};

export type ShowtimeQueuePlayerHandle = {
  start: (queue: ShowtimePlayerTrack[], index?: number, sourceLabel?: string) => Promise<boolean>;
  close: () => void;
};

type ShowtimeQueuePlayerProps = {
  isZh: boolean;
};

function formatTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const ShowtimeQueuePlayer = forwardRef<ShowtimeQueuePlayerHandle, ShowtimeQueuePlayerProps>(function ShowtimeQueuePlayer(
  { isZh },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const volumeRef = useRef(0.85);
  const sessionRef = useRef<ShowtimePlayerSession | null>(null);
  const [session, setSession] = useState<ShowtimePlayerSession | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [playbackError, setPlaybackError] = useState("");
  const track = session?.queue[session.index] ?? null;

  const applyVolume = useCallback((audio: HTMLAudioElement, value: number) => {
    const normalized = clampMediaVolume(value);
    volumeRef.current = normalized;
    const nativeApplied = setNativeMediaVolume(audio, normalized);
    const context = audioContextRef.current;
    const gain = audioGainRef.current;
    if (context && gain) gain.gain.setValueAtTime(normalized, context.currentTime);
    return nativeApplied || Boolean(gain);
  }, []);

  const ensureVolumeControl = useCallback(async (audio: HTMLAudioElement) => {
    const normalized = volumeRef.current;
    if (setNativeMediaVolume(audio, normalized)) return;
    try {
      const AudioContextConstructor = window.AudioContext
        ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      let context = audioContextRef.current;
      let gain = audioGainRef.current;
      if (!context || !gain) {
        context = new AudioContextConstructor();
        const source = context.createMediaElementSource(audio);
        gain = context.createGain();
        source.connect(gain);
        gain.connect(context.destination);
        audioContextRef.current = context;
        audioSourceRef.current = source;
        audioGainRef.current = gain;
      }
      gain.gain.setValueAtTime(normalized, context.currentTime);
      if (context.state === "suspended") await context.resume();
    } catch (error) {
      console.warn("[showtime-player] mobile volume gain unavailable", error);
    }
  }, []);

  useEffect(() => () => {
    audioSourceRef.current?.disconnect();
    audioGainRef.current?.disconnect();
    const context = audioContextRef.current;
    if (context && context.state !== "closed") void context.close();
  }, []);

  const playTrack = useCallback(async (nextSession: ShowtimePlayerSession) => {
    const audio = audioRef.current;
    const nextTrack = nextSession.queue[nextSession.index];
    if (!audio || !nextTrack) return false;

    sessionRef.current = nextSession;
    setSession(nextSession);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError("");
    audio.pause();
    audio.src = nextTrack.audioUrl;
    applyVolume(audio, volumeRef.current);
    audio.load();

    try {
      await ensureVolumeControl(audio);
      await audio.play();
      setPlaying(true);
      return true;
    } catch {
      setPlaying(false);
      setPlaybackError(isZh ? "瀏覽器暫停了自動播放，請再按一次播放。" : "Playback was paused by the browser. Press play again.");
      return false;
    }
  }, [applyVolume, ensureVolumeControl, isZh]);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    sessionRef.current = null;
    setSession(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setPlaybackError("");
  }, []);

  useImperativeHandle(ref, () => ({
    start: async (queue, requestedIndex = 0, sourceLabel = "AIPOGER Showtime") => {
      if (queue.length === 0) return false;
      const index = Math.min(Math.max(0, requestedIndex), queue.length - 1);
      return playTrack({ queue, index, sourceLabel });
    },
    close,
  }), [close, playTrack]);

  const move = useCallback((direction: -1 | 1) => {
    const current = sessionRef.current;
    if (!current) return;
    const index = current.index + direction;
    if (index < 0 || index >= current.queue.length) return;
    void playTrack({ ...current, index });
  }, [playTrack]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError("");
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false);
        setPlaybackError(isZh ? "目前無法播放，請稍後再試。" : "Playback is unavailable. Try again shortly.");
      });
    } else {
      audio.pause();
    }
  }, [isZh]);

  return (
    <>
      {track && session ? (
        <div
          data-showtime-queue-player
          className="fixed inset-x-0 bottom-0 z-[210] border-t border-yellow-100/25 bg-[#070707]/96 px-3 py-2.5 shadow-[0_-18px_55px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:px-5"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 sm:grid-cols-[auto_minmax(9rem,0.75fr)_minmax(16rem,1.5fr)_auto] sm:gap-4">
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-100"
              aria-label={playing ? (isZh ? "暫停" : "Pause") : isZh ? "播放" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
            </button>

            <div className="flex min-w-0 items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={track.coverUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-white sm:text-sm">{track.title}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] font-bold text-zinc-500 sm:text-[11px]">
                  <ListMusic className="h-3 w-3 shrink-0" />
                  {session.sourceLabel} · {track.artist}
                </p>
              </div>
            </div>

            <div className="col-span-3 row-start-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">
              <span className="text-[10px] font-bold tabular-nums text-zinc-500">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0)}
                step={0.1}
                value={Math.min(currentTime, Math.max(duration, 0))}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (audioRef.current) audioRef.current.currentTime = next;
                  setCurrentTime(next);
                }}
                className="h-1.5 w-full cursor-pointer accent-orange-500"
                aria-label={isZh ? "拖曳播放進度" : "Seek playback"}
              />
              <span className="text-[10px] font-bold tabular-nums text-zinc-500">{formatTime(duration)}</span>
            </div>

            <div className="col-start-3 row-start-1 flex items-center justify-end gap-1 sm:col-start-4">
              <button type="button" onClick={() => move(-1)} disabled={session.index <= 0} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25" aria-label={isZh ? "上一首" : "Previous track"}><SkipBack className="h-4 w-4" /></button>
              <button type="button" onClick={() => move(1)} disabled={session.index >= session.queue.length - 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25" aria-label={isZh ? "下一首" : "Next track"}><SkipForward className="h-4 w-4" /></button>
              <label className="hidden items-center gap-1.5 lg:flex">
                <Volume2 className="h-4 w-4 text-zinc-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setVolume(next);
                    if (audioRef.current) applyVolume(audioRef.current, next);
                  }}
                  className="w-20 accent-orange-500"
                  aria-label={isZh ? "調整音量" : "Adjust volume"}
                />
              </label>
              <button type="button" onClick={close} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white" aria-label={isZh ? "關閉播放器" : "Close player"}><X className="h-4 w-4" /></button>
            </div>

            <label className="col-span-3 row-start-3 flex items-center gap-2 lg:hidden">
              <Volume2 className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setVolume(next);
                  if (audioRef.current) applyVolume(audioRef.current, next);
                }}
                className="w-full accent-orange-500"
                aria-label={isZh ? "調整音量" : "Adjust volume"}
              />
            </label>
            {playbackError ? <p className="col-span-3 text-[11px] font-bold text-orange-100 sm:col-span-4">{playbackError}</p> : null}
          </div>
        </div>
      ) : null}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          applyVolume(event.currentTarget, volumeRef.current);
          setDuration(event.currentTarget.duration || 0);
        }}
        onEnded={() => {
          const current = sessionRef.current;
          if (current && current.index < current.queue.length - 1) {
            void playTrack({ ...current, index: current.index + 1 });
          } else {
            setPlaying(false);
          }
        }}
      />
    </>
  );
});

ShowtimeQueuePlayer.displayName = "ShowtimeQueuePlayer";

export default ShowtimeQueuePlayer;
