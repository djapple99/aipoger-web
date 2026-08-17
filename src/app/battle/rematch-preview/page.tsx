"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function CountdownPill() {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => (current <= 1 ? 5 : current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mt-5 inline-flex items-baseline gap-3 rounded-full border border-yellow-200/35 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.2),rgba(255,106,0,0.08))] px-5 py-3 text-yellow-100 shadow-[0_0_34px_rgba(250,204,21,0.18)]">
      <span className="bg-gradient-to-b from-white via-yellow-100 to-orange-400 bg-clip-text text-7xl font-black leading-[0.82] text-transparent drop-shadow-[0_0_26px_rgba(255,106,0,0.62)]">
        {seconds}
      </span>
      <span className="text-sm font-black tracking-[0.18em]">秒內搶挑戰席</span>
    </div>
  );
}

export default function RematchPreviewPage() {
  return (
    <main className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-black px-4 py-5 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_16%,rgba(255,106,0,0.22),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(59,225,246,0.18),transparent_32%),linear-gradient(180deg,#020202_0%,#050505_44%,#0d0806_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="pointer-events-none absolute left-1/2 top-28 h-px w-[70vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-400/80 to-transparent shadow-[0_0_48px_rgba(255,106,0,0.7)]" />

      <header className="relative z-10 flex flex-wrap items-start justify-between gap-3 pl-16 pt-1 sm:pl-20">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.36em] text-orange-200/80">AIPOGER DROP BATTLE</p>
          <h1 className="mt-2 text-2xl font-black text-white sm:text-4xl">5 秒守擂挑戰 Preview</h1>
        </div>
        <Link href="/battle?lang=zh" className="rounded-full border border-white/15 bg-black/42 px-4 py-2 text-xs font-black text-zinc-200">
          回鬥歌池
        </Link>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-4 py-6 md:grid-cols-[1fr_auto_1fr] md:gap-5">
        <article className="flex min-h-52 items-center gap-4 rounded-[1.4rem] border border-orange-300/25 bg-black/50 p-4 shadow-[0_0_60px_rgba(255,106,0,0.13)] backdrop-blur md:min-h-64 md:p-5">
          <div className="aspect-square w-24 shrink-0 rounded-[1.1rem] border border-white/15 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.24),transparent_32%),linear-gradient(135deg,#301104,#030303_58%,#07202a)] md:w-36" />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-200/75">擂主 / Defender</p>
            <h2 className="mt-2 break-words text-3xl font-black leading-none text-white md:text-5xl">飄浪a勇哥</h2>
            <p className="mt-3 break-words text-base font-extrabold leading-6 text-zinc-300 md:text-lg">《相思伴我長眠》</p>
          </div>
        </article>

        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-orange-200/40 bg-black/60 text-2xl font-black text-orange-300 shadow-[0_0_48px_rgba(255,106,0,0.24)] md:h-24 md:w-24 md:text-4xl">
          VS
        </div>

        <article className="flex min-h-52 items-center gap-4 rounded-[1.4rem] border border-cyan-200/25 bg-black/50 p-4 shadow-[0_0_60px_rgba(34,211,238,0.1)] backdrop-blur md:min-h-64 md:p-5">
          <div className="aspect-square w-24 shrink-0 rounded-[1.1rem] border border-white/15 bg-[radial-gradient(circle_at_40%_22%,rgba(255,255,255,0.2),transparent_32%),linear-gradient(135deg,#041d28,#030303_58%,#321204)] md:w-36" />
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/75">挑戰席 / Challenger Slot</p>
            <h2 className="mt-2 break-words text-3xl font-black leading-none text-white md:text-5xl">等待挑戰</h2>
            <p className="mt-3 break-words text-base font-extrabold leading-6 text-zinc-300 md:text-lg">第一個按下的人取得位置</p>
          </div>
        </article>
      </section>

      <section className="relative z-10 mx-auto mb-3 w-[min(94vw,720px)] rounded-[1.4rem] border border-orange-200/35 bg-black/84 px-5 py-5 text-center shadow-[0_0_80px_rgba(255,106,0,0.28),inset_0_0_42px_rgba(255,255,255,0.04)] backdrop-blur-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-200/80">擂台熱鬥中</p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-white sm:text-5xl">有人要挑戰擂主嗎？</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm font-extrabold leading-7 text-zinc-300 sm:text-base">
          第一個按下的人取得挑戰席，接著有 120 秒上傳 Drop。擂主保留上一場勝出歌曲，下一場直接接上。
        </p>
        <CountdownPill />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button className="rounded-full border border-orange-200/55 bg-orange-500 px-6 py-3 text-sm font-black text-black shadow-[0_0_28px_rgba(255,106,0,0.34)] transition hover:bg-orange-300">
            我要挑戰擂主
          </button>
        </div>
        <p className="mt-4 text-xs font-black text-yellow-100">倒數結束沒人接戰，直接進成果卡。</p>
      </section>
    </main>
  );
}
