'use client';

import Link from 'next/link';
import { ArrowUpRight, ArrowLeft, Music2, Activity, Tags } from 'lucide-react';
import LangToggle from '@/components/lang-toggle';
import { useI18n } from '@/lib/i18n';
import { fontRighteous } from '@/lib/fonts';
import { ANALYSIS_COPY, ANALYSIS_TOOLS, ANALYSIS_TOOLS_CHECKED_AT } from '@/lib/music-analysis-tools';

const icons = [Music2, Activity, Tags];
export default function MusicAnalysisPage() {
  const { lang } = useI18n();
  const c = ANALYSIS_COPY[lang];
  return (
    <main className="aipo-stage-bg min-h-screen px-4 pb-20 pt-6 text-[#fffaf1] md:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="h-10 w-14" aria-hidden="true" />
        <LangToggle variant="inline" />
      </header>
      <div className="mx-auto max-w-6xl">
        <section className="pb-8 pt-10 md:pt-14" aria-labelledby="music-analysis-heading">
          <p className={`${fontRighteous.className} text-xs tracking-[0.28em] text-orange-200`}>AIPOGER MUSIC TOOLS</p>
          <h1 id="music-analysis-heading" className="mt-4 text-4xl font-black leading-tight md:text-6xl">{c.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">{c.intro}</p>

        </section>

        <section aria-labelledby="tools-title">
          <h2 id="tools-title" className="text-2xl font-black">{c.toolsTitle}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">{c.fileHint}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {ANALYSIS_TOOLS.map((tool, i) => {
              const t = c.toolCopy[i]; const Icon = icons[i];
              return <article key={tool.key} className="aipo-control-panel flex flex-col rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between gap-3"><Icon aria-hidden="true" className="h-6 w-6 shrink-0 text-orange-300" /><span className="rounded-full border border-orange-200/20 bg-orange-300/5 px-3 py-1 text-xs font-bold leading-5 text-orange-100">{t.price}</span></div>
                <h3 className="mt-5 text-xl font-black leading-7">{t.question}</h3>
                <p className="mt-1 text-sm font-bold text-cyan-200">{tool.name}</p>
                <p className="mt-4 text-sm leading-6 text-zinc-200">{t.description}</p>
                <p className="mt-3 text-xs leading-6 text-zinc-400">{t.detail}</p>
                <div className="my-5 border-l-2 border-orange-300/60 pl-3"><p className="text-xs font-bold text-orange-200">{c.usage}</p><p className="mt-1 text-sm leading-6 text-zinc-200">{t.instructions}</p></div>
                <p className="mb-5 text-xs leading-6 text-zinc-400">{t.caution}</p>
                <a href={tool.href} target="_blank" rel="noopener noreferrer" className="aipo-primary-button mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300" aria-label={`${c.open} — ${tool.name}`}>{c.open}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>
                <a href={tool.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center justify-center text-xs text-zinc-400 underline underline-offset-4" aria-label={`${tool.name} — ${c.sourceLink}`}>{c.sourceLink}</a>
              </article>;
            })}
          </div>
          <p className="mt-4 text-xs leading-6 text-zinc-400">{c.checked}：{ANALYSIS_TOOLS_CHECKED_AT} · {c.external}</p>
        </section>

        <Link href={`/ai-music-bible?lang=${lang}`} className="aipo-ghost-button mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{c.back}</Link>
      </div>
    </main>
  );
}
