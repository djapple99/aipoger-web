"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const BGM_SRC = "/music/home-bgm.mp3";

function SpeakerIcon({ playing }: { playing: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {playing ? (
        <>
          <path d="M15.54 8.46a5 5 0 017.072 7.068" />
          <path d="M17.66 6.34a9 9 0 019.758 13.932" className="opacity-90 [animation-duration:2.2s] animate-pulse" />
        </>
      ) : (
        <>
          <path d="M15 10v4" className="opacity-35" strokeWidth="1.75" />
          <path d="M17.8 10.3v7.4" className="opacity-25" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

/** 僅首頁：左上角 logo 右側；進入自動嘗試播放，喇叭可暫停 */
export default function HomeBgmPlayer() {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const autoplayBlockedRef = useRef(false);
  const userPausedRef = useRef(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    autoplayBlockedRef.current = false;
    userPausedRef.current = false;

    void el.play().then(
      () => {
        autoplayBlockedRef.current = false;
      },
      () => {
        autoplayBlockedRef.current = true;
      },
    );

    const onFirstPointer = (ev: PointerEvent) => {
      const target = ev.target;
      const onSpeaker =
        target instanceof Element && Boolean(target.closest("[data-home-bgm]"));

      if (
        !onSpeaker &&
        autoplayBlockedRef.current &&
        !userPausedRef.current &&
        el.paused
      ) {
        void el.play().catch(() => {});
      }

      autoplayBlockedRef.current = false;
      window.removeEventListener("pointerdown", onFirstPointer, true);
    };

    window.addEventListener("pointerdown", onFirstPointer, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onFirstPointer, true);
      el.pause();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      userPausedRef.current = false;
      try {
        await el.play();
      } catch {
        /* still blocked until gesture on some browsers */
      }
    } else {
      userPausedRef.current = true;
      el.pause();
    }
  }, []);

  return (
    <>
      <audio ref={audioRef} src={BGM_SRC} loop preload="auto" />
      <button
        type="button"
        data-home-bgm
        onClick={toggle}
        title={t("home_bgm_tooltip")}
        aria-label={playing ? t("home_bgm_pause_aria") : t("home_bgm_play_aria")}
        className={`pointer-events-auto fixed left-[4.75rem] top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-600/80 bg-black/50 text-zinc-100 shadow-lg backdrop-blur transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 md:left-[5rem] ${
          playing
            ? "ring-2 ring-sky-400/90 shadow-[0_0_22px_rgba(56,189,248,0.55)]"
            : "ring-1 ring-white/15 hover:border-zinc-500 hover:bg-black/65"
        }`}
      >
        <SpeakerIcon playing={playing} />
      </button>
    </>
  );
}
