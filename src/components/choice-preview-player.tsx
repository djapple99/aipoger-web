"use client";

import { useEffect, useRef, useState } from "react";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";

type ChoicePreviewPlayerProps = {
  track: AipogerChoiceCatalogItem | null;
  onClose: () => void;
};

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function ChoicePreviewPlayer({ track, onClose }: ChoicePreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.82);

  useEffect(() => {
    const audio = audioRef.current;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    if (!audio || !track?.audioUrl) return;

    audio.currentTime = 0;
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [track?.audioUrl, track?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => () => audioRef.current?.pause(), []);

  if (!track?.audioUrl) return null;

  const progress = duration > 0 ? Math.min(currentTime, duration) : 0;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    const next = Math.min(duration || 0, Math.max(0, value));
    setCurrentTime(next);
    if (audio) audio.currentTime = next;
  };

  const changeVolume = (value: number) => {
    const next = Math.min(1, Math.max(0, value));
    setVolume(next);
    if (audioRef.current) audioRef.current.volume = next;
  };

  return (
    <section data-choice-preview-player className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl border border-cyan-100/30 bg-[#090b0c]/95 px-3 py-3 text-white shadow-[0_18px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:px-4">
      <audio
        ref={audioRef}
        src={track.audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
          setCurrentTime(event.currentTarget.currentTime || 0);
        }}
        onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={track.coverUrl} alt="" className="h-11 w-11 shrink-0 border border-white/12 object-cover sm:h-12 sm:w-12" />
        <button type="button" onClick={toggle} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-base font-black text-black transition hover:bg-orange-300" aria-label={playing ? `暫停 ${track.title}` : `播放 ${track.title}`}>
          {playing ? "Ⅱ" : "▶"}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{track.title}</p>
          <p className="truncate text-[11px] font-bold text-zinc-500">{track.artist} · {track.genre}</p>
          <div className="mt-2 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
            <span className="text-[10px] font-black tabular-nums text-zinc-500">{formatTime(progress)}</span>
            <input type="range" min="0" max={Math.max(0, duration)} step="0.1" value={progress} onChange={(event) => seek(Number(event.currentTarget.value))} disabled={duration <= 0} className="h-1.5 w-full cursor-pointer accent-orange-400 disabled:cursor-not-allowed disabled:opacity-40" style={{ background: `linear-gradient(to right, rgb(251 146 60) 0%, rgb(251 146 60) ${progressPercent}%, rgba(255,255,255,0.16) ${progressPercent}%, rgba(255,255,255,0.16) 100%)` }} aria-label="拖曳播放進度" />
            <span className="text-right text-[10px] font-black tabular-nums text-zinc-500">{formatTime(duration)}</span>
          </div>
        </div>
        <label className="hidden w-24 shrink-0 items-center gap-2 text-zinc-400 sm:flex" title="音量">
          <span className="text-xs" aria-hidden="true">◖</span>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => changeVolume(Number(event.currentTarget.value))} className="w-full cursor-pointer accent-cyan-200" aria-label="調整音量" />
        </label>
        <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-white/12 text-lg leading-none text-zinc-400 transition hover:border-white/45 hover:text-white" aria-label="關閉播放器" title="關閉播放器">×</button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-zinc-400 sm:hidden" title="音量">
        <span className="text-xs" aria-hidden="true">◖</span>
        <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => changeVolume(Number(event.currentTarget.value))} className="w-full cursor-pointer accent-cyan-200" aria-label="調整音量" />
      </label>
    </section>
  );
}
