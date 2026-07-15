"use client";

import { ListMusic, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ShowtimePlayerTrack = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
};

type ShowtimeQueuePlayerProps = {
  queue: ShowtimePlayerTrack[];
  index: number;
  sourceLabel: string;
  isZh: boolean;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

function formatTime(value: number) {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ShowtimeQueuePlayer({
  queue,
  index,
  sourceLabel,
  isZh,
  onIndexChange,
  onClose,
}: ShowtimeQueuePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const track = queue[index] ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [track]);

  if (!track) return null;

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    else audio.pause();
  };

  const move = (direction: -1 | 1) => {
    const next = index + direction;
    if (next >= 0 && next < queue.length) onIndexChange(next);
  };

  return (
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
              {sourceLabel} · {track.artist}
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
          <button type="button" onClick={() => move(-1)} disabled={index <= 0} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25" aria-label={isZh ? "上一首" : "Previous track"}><SkipBack className="h-4 w-4" /></button>
          <button type="button" onClick={() => move(1)} disabled={index >= queue.length - 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-25" aria-label={isZh ? "下一首" : "Next track"}><SkipForward className="h-4 w-4" /></button>
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
                if (audioRef.current) audioRef.current.volume = next;
              }}
              className="w-20 accent-orange-500"
              aria-label={isZh ? "調整音量" : "Adjust volume"}
            />
          </label>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white" aria-label={isZh ? "關閉播放器" : "Close player"}><X className="h-4 w-4" /></button>
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
              if (audioRef.current) audioRef.current.volume = next;
            }}
            className="w-full accent-orange-500"
            aria-label={isZh ? "調整音量" : "Adjust volume"}
          />
        </label>
      </div>
      <audio
        ref={audioRef}
        src={track.audioUrl}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          event.currentTarget.volume = volume;
          setDuration(event.currentTarget.duration || 0);
        }}
        onEnded={() => {
          if (index < queue.length - 1) onIndexChange(index + 1);
          else setPlaying(false);
        }}
      />
    </div>
  );
}
