"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const SPLASH_STEPS = {
  fadeIn: 700,
  hold: 1000,
  fadeOut: 700,
};

const TOTAL_SPLASH_MS =
  SPLASH_STEPS.fadeIn + SPLASH_STEPS.hold + SPLASH_STEPS.fadeOut;

type SplashPhase = "fadeIn" | "hold" | "fadeOut";

function BattleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-9 w-9 text-zinc-100 transition group-hover:text-[#ff6a00]"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 10.5a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 16v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 21h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WatchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-9 w-9 text-zinc-100 transition group-hover:text-[#ff6a00]"
      aria-hidden="true"
    >
      <path
        d="M3.8 12.5a8.2 8.2 0 0 1 16.4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="2.4" y="12.2" width="3.8" height="6.2" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="17.8" y="12.2" width="3.8" height="6.2" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.8 18.4c1.7 1.8 4.7 1.8 6.4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function HomePage() {
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [phase, setPhase] = useState<SplashPhase>("fadeIn");

  useEffect(() => {
    const fadeInTimer = window.setTimeout(() => setPhase("hold"), SPLASH_STEPS.fadeIn);
    const holdTimer = window.setTimeout(
      () => setPhase("fadeOut"),
      SPLASH_STEPS.fadeIn + SPLASH_STEPS.hold,
    );
    const endTimer = window.setTimeout(() => setIsSplashFinished(true), TOTAL_SPLASH_MS);

    return () => {
      window.clearTimeout(fadeInTimer);
      window.clearTimeout(holdTimer);
      window.clearTimeout(endTimer);
    };
  }, []);

  const splashOpacity = useMemo(() => {
    if (phase === "fadeIn") return "opacity-100";
    if (phase === "hold") return "opacity-100";
    return "opacity-0";
  }, [phase]);

  if (!isSplashFinished) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className={`transition-opacity duration-700 ${splashOpacity}`}>
          <Image
            src="/logo.png"
            alt="AIPOGER Logo"
            width={220}
            height={220}
            priority
            className="h-auto w-[42vw] max-w-[220px] min-w-[140px] object-contain"
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] px-6 py-10 text-[#f5f5f5] md:px-10">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_22%_38%,_rgba(255,106,0,0.25),_transparent_50%)]" />

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 border-b border-zinc-700/70 pb-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <p className="text-[clamp(3rem,10vw,9rem)] font-black uppercase leading-[0.85] tracking-tight text-zinc-100">
            AIPOGER
          </p>
          <p className="mt-3 text-sm text-zinc-400 md:text-xl">Where AI Beats Bleed.</p>

          <h1 className="mt-8 text-[clamp(3.3rem,13vw,10rem)] font-black leading-[0.88] tracking-tight text-zinc-100">
            愛播歌
          </h1>
          <p className="mt-4 text-sm text-zinc-300 md:text-2xl">
            在 AI 節奏交鋒之處，流淌著真實的音樂血液
          </p>
        </div>

        <div className="md:col-span-4 md:pb-4">
          <div className="flex flex-col gap-4">
            <Link
              href="/battle/setup"
              className="group flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-950/80 px-5 py-4 transition duration-300 hover:border-[#ff6a00] hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            >
              <BattleIcon />
              <span className="text-2xl font-bold tracking-[0.08em] text-red-500 transition group-hover:text-red-400">
                我要鬥歌
              </span>
            </Link>

            <Link
              href="/battle"
              className="group flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-950/80 px-5 py-4 transition duration-300 hover:border-[#ff6a00] hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a00]"
            >
              <WatchIcon />
              <span className="text-2xl font-bold tracking-[0.08em] text-red-500 transition group-hover:text-red-400">
                觀戰聽歌
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
