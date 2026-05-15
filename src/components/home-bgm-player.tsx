"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const BGM_SRC = "/music/home-bgm.mp3";

function BgmIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
      <path
        d="M12 6v6l4 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={playing ? "animate-pulse" : ""}
      />
    </svg>
  );
}

/** 僅首頁：左上角 logo 右側，播放／暫停全曲循環 */
export default function HomeBgmPlayer() {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.pause();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
      } catch {
        /* autoplay policies: user must tap again */
      }
    } else {
      el.pause();
    }
  }, []);

  return (
    <>
      <audio ref={audioRef} src={BGM_SRC} loop preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        title={t("home_bgm_tooltip")}
        aria-label={playing ? t("home_bgm_pause_aria") : t("home_bgm_play_aria")}
        className={`pointer-events-auto fixed left-[4.75rem] top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-600/80 bg-black/50 text-zinc-100 shadow-lg backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 md:left-[5rem] ${
          playing
            ? "ring-2 ring-sky-400/90 shadow-[0_0_22px_rgba(56,189,248,0.55)]"
            : "ring-1 ring-white/15 hover:border-zinc-500 hover:bg-black/65"
        }`}
      >
        <BgmIcon playing={playing} />
      </button>
    </>
  );
}
