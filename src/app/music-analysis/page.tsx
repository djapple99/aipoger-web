'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, ArrowRight, Check, Copy, Download, Music2, Activity, Tags } from 'lucide-react';
import LangToggle from '@/components/lang-toggle';
import { useI18n } from '@/lib/i18n';
import { fontRighteous } from '@/lib/fonts';
import { ANALYSIS_COPY, ANALYSIS_TOOLS, ANALYSIS_TOOLS_CHECKED_AT, buildAnalysisRequest, type AnalysisNotes } from '@/lib/music-analysis-tools';

const icons = [Music2, Activity, Tags];
const fields = ['title', 'goal', 'source', 'results', 'lyrics'] as const;
const limits = [200, 1500, 400, 12000, 8000];
const blankNotes: AnalysisNotes = { title: '', goal: '', source: '', results: '', lyrics: '' };

export default function MusicAnalysisPage() {
  const { lang } = useI18n();
  const c = ANALYSIS_COPY[lang];
  const [notes, setNotes] = useState<AnalysisNotes>(blankNotes);
  const [notice, setNotice] = useState<'copied' | 'failed' | 'downloaded' | null>(null);
  const packet = buildAnalysisRequest(notes, lang);
  const nextLinks = [`/ai-music-bible?lang=${lang}#suno-inspiration-index`, `/ai-music-bible?lang=${lang}#suno-troubleshooting`, `/listen-bar?lang=${lang}`];

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(packet);
      setNotice('copied');
    } catch {
      setNotice('failed');
    }
  }
  function downloadNotes() {
    const url = URL.createObjectURL(new Blob([packet], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aipoger-music-notes.txt';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('downloaded');
  }

  return (
    <main className="aipo-stage-bg min-h-screen px-4 pb-20 pt-6 text-[#fffaf1] md:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="h-10 w-14" aria-hidden="true" />
        <LangToggle variant="inline" />
      </header>
      <div className="mx-auto max-w-6xl">
        <section className="pb-8 pt-10 md:pt-14" aria-labelledby="music-analysis-heading">
          <p className={`${fontRighteous.className} text-xs tracking-[0.28em] text-orange-200`}>AIPOGER MUSIC WORKBENCH</p>
          <h1 id="music-analysis-heading" className="mt-4 text-4xl font-black leading-tight md:text-6xl">{c.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">{c.intro}</p>
          <ol className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-orange-100">
            {c.steps.map((step, i) => <li key={step} className="flex items-center gap-2"><span className="text-orange-400">0{i + 1}</span>{step}{i < 2 && <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 text-zinc-500" />}</li>)}
          </ol>
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
                <div className="my-5 border-l-2 border-orange-300/60 pl-3"><p className="text-xs font-bold text-orange-200">{c.bringLabel}</p><p className="mt-1 text-sm leading-6 text-zinc-200">{t.bring}</p></div>
                <p className="mb-5 text-xs leading-6 text-zinc-400">{t.caution}</p>
                <a href={tool.href} target="_blank" rel="noopener noreferrer" className="aipo-primary-button mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300" aria-label={`${c.open} — ${tool.name}`}>{c.open}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>
                <a href={tool.source} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center justify-center text-xs text-zinc-400 underline underline-offset-4" aria-label={`${tool.name} — ${c.sourceLink}`}>{c.sourceLink}</a>
              </article>;
            })}
          </div>
          <p className="mt-4 text-xs leading-6 text-zinc-400">{c.checked}：{ANALYSIS_TOOLS_CHECKED_AT} · {c.external}</p>
        </section>

        <section className="mt-12 border-t border-white/10 pt-9" aria-labelledby="notes-title">
          <h2 id="notes-title" className="text-2xl font-black">{c.notesTitle}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-300">{c.notesIntro}</p>
          <div className="mt-6 grid gap-7 lg:grid-cols-2">
            <div className="space-y-4">
              {fields.map((key, i) => <div key={key}>
                <label htmlFor={`analysis-${key}`} className="mb-2 block text-sm font-bold text-zinc-200">{c.fields[i]}</label>
                {key === 'title' || key === 'source'
                  ? <input id={`analysis-${key}`} value={notes[key]} maxLength={limits[i]} placeholder={c.placeholders[i]} onChange={e => { setNotes(n => ({ ...n, [key]: e.target.value })); setNotice(null); }} className="min-h-12 w-full rounded-xl border border-white/20 bg-black/50 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-orange-300" />
                  : <textarea id={`analysis-${key}`} value={notes[key]} maxLength={limits[i]} rows={key === 'results' ? 6 : 3} placeholder={c.placeholders[i]} onChange={e => { setNotes(n => ({ ...n, [key]: e.target.value })); setNotice(null); }} className="w-full resize-y rounded-xl border border-white/20 bg-black/50 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-orange-300" />}
              </div>)}
              <p className="text-xs leading-6 text-zinc-400">{c.privacy}</p>
            </div>
            <div className="aipo-control-panel flex flex-col rounded-2xl p-5 md:p-6">
              <label htmlFor="analysis-request" className="text-lg font-black">{c.output}</label>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{c.empty}</p>
              <textarea id="analysis-request" value={packet} readOnly rows={14} className="mt-5 min-h-72 w-full flex-1 resize-y rounded-xl border border-white/15 bg-black/40 p-4 text-sm leading-7 text-zinc-200 focus:outline-orange-300" />
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" disabled={!packet} onClick={copyRequest} className="aipo-primary-button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40">{notice === 'copied' ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}{c.copy}</button>
                <button type="button" disabled={!packet} onClick={downloadNotes} className="aipo-ghost-button inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"><Download aria-hidden="true" className="h-4 w-4" />{c.download}</button>
              </div>
              <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm leading-6 text-orange-200">{notice ? c[notice] : ''}</p>
            </div>
          </div>
        </section>
        <section className="mt-10 border-t border-white/10 pt-7" aria-labelledby="next-title">
          <h2 id="next-title" className="text-xl font-black">{c.nextTitle}</h2>
          <div className="mt-4 flex flex-wrap gap-3">{c.next.map((label, i) => <Link key={label} href={nextLinks[i]} className="aipo-ghost-button inline-flex min-h-12 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold">{label}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></Link>)}</div>
          <p className="mt-3 text-xs leading-6 text-zinc-400">{c.nextNote}</p>
        </section>
      </div>
    </main>
  );
}
