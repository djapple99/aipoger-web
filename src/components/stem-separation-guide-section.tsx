"use client";

import { BadgeCheck, ChevronDown, ChevronUp, CircleHelp, Cpu, ExternalLink, Gauge, Layers3, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import { type StemEngine, type StemGoal, type StemGoalKey, type StemGuideLocale } from "@/lib/stem-separation-guide";

function stemText(text: { zh: string; en: string }, locale: StemGuideLocale) {
  return text[locale];
}

export default function StemSeparationGuideSection({ locale, engines, goals }: { locale: StemGuideLocale; engines: StemEngine[]; goals: StemGoal[] }) {
  const isZh = locale === "zh";
  const [goal, setGoal] = useState<StemGoalKey>("vocals");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAllEngines, setShowAllEngines] = useState(false);
  const activeGoal = useMemo(() => goals.find((item) => item.key === goal) ?? goals[0], [goals, goal]);
  if (!activeGoal) {
    return <section id="stem-separation-guide" className="min-h-48 animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.025]" aria-label="Loading stem guide" />;
  }
  const highlighted = new Set(activeGoal.engineKeys);
  const orderedEngines = [...engines].sort((left, right) => Number(highlighted.has(right.key)) - Number(highlighted.has(left.key)));
  const visibleEngines = showAllEngines ? orderedEngines : orderedEngines.slice(0, 4);

  const confidenceLabel = {
    confirmed: isZh ? "官方資料可確認" : "Officially documented",
    mixed: isZh ? "模型依版本而變" : "Varies by model/version",
    undisclosed: isZh ? "底層未公開" : "Engine undisclosed",
  };

  return (
    <section id="stem-separation-guide" className="scroll-mt-20 overflow-hidden rounded-[1.6rem] border border-cyan-200/20 bg-[#060909]/92 shadow-[0_30px_100px_rgba(0,0,0,0.52)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_5%,rgba(255,106,0,0.13),transparent_30%)] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <Layers3 className="h-6 w-6 text-cyan-200" />
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.32em] text-cyan-200/75`}>ENGINE FIELD GUIDE · 2026</p>
            </div>
            <h2 className="mt-4 max-w-5xl text-[clamp(2.05rem,5vw,4.7rem)] font-black leading-[0.98] text-white">
              {isZh ? "AI 拆軌避坑指南" : "AI Stem Separation Field Guide"}
            </h2>
            <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-zinc-300">
              {isZh
                ? "別先問哪一套最好。先確認你已經擁有哪種引擎，再為真正不同的能力付費：更乾淨的人聲、手動頻譜修復、本機隱私，或大量 API。"
                : "Do not start with which app is best. Identify the engine you already own, then pay only for a genuinely different advantage: cleaner vocals, spectral repair, local privacy, or batch APIs."}
            </p>
          </div>
          <div className="rounded-xl border border-orange-300/18 bg-orange-400/[0.055] p-4 text-sm font-bold leading-6 text-orange-50/85">
            <ShieldAlert className="mb-3 h-5 w-5 text-orange-300" />
            {isZh
              ? "依使用者提供的《AI Stem Separation Guide 2026》重新整理與繁中化；原指南署名 @proaudio4musician，2026 年 6 月。AIPOGER 另以官方文件核對，未公開的底層不當成事實。"
              : "Adapted from the user-provided AI Stem Separation Guide 2026, credited in the PDF to @proaudio4musician (June 2026). AIPOGER cross-checks official documentation and does not present undisclosed engines as fact."}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-7 lg:px-9 lg:py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.28em] text-orange-300/75`}>PICK BY GOAL</p>
            <h3 className="mt-2 text-2xl font-black text-white md:text-3xl">{isZh ? "你這次到底要拆什麼？" : "What are you trying to solve?"}</h3>
          </div>
          <p className="text-xs font-black tracking-[0.12em] text-zinc-600">10 ENGINE FAMILIES · 7 GOALS</p>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {goals.map((item) => (
            <button key={item.key} type="button" onClick={() => { setGoal(item.key); setShowAllEngines(false); setExpanded(null); }} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition ${goal === item.key ? "border-cyan-200/65 bg-cyan-300/14 text-cyan-50" : "border-white/10 bg-white/[0.03] text-zinc-500 hover:text-white"}`}>
              {stemText(item.label, locale)}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-4 rounded-[1.15rem] border border-cyan-200/18 bg-cyan-300/[0.045] p-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-200/22 bg-black/45 text-cyan-200"><Gauge className="h-6 w-6" /></div>
          <div>
            <p className="text-xl font-black text-white">{stemText(activeGoal.pick, locale)}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">{stemText(activeGoal.why, locale)}</p>
          </div>
        </div>

        <div id="stem-engine-results" className="mt-8 grid gap-3 lg:grid-cols-2">
          {visibleEngines.map((engine) => {
            const index = engines.findIndex((item) => item.key === engine.key);
            const isOpen = expanded === engine.key;
            const isHighlighted = highlighted.has(engine.key);
            return (
              <article key={engine.key} className={`overflow-hidden rounded-[1.15rem] border bg-black/48 transition ${isHighlighted ? "border-orange-300/50 shadow-[0_0_38px_rgba(255,106,0,0.09)]" : "border-white/10"}`}>
                <button type="button" onClick={() => setExpanded(isOpen ? null : engine.key)} aria-expanded={isOpen} className="flex w-full items-start gap-4 p-5 text-left sm:p-6">
                  <span className={`${fontRighteous.className} mt-0.5 text-sm text-zinc-700`}>{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-xl font-black text-white sm:text-2xl">{engine.name}</strong>
                      {isHighlighted && <span className="rounded-full border border-orange-300/25 bg-orange-400/[0.09] px-2 py-1 text-[10px] font-black text-orange-200">{isZh ? "本次推薦" : "Goal match"}</span>}
                    </span>
                    <span className="mt-2 block text-xs font-black tracking-[0.08em] text-cyan-200/75">{stemText(engine.family, locale)} · {stemText(engine.access, locale)}</span>
                    <span className="mt-3 block text-sm font-bold leading-6 text-zinc-500">{stemText(engine.summary, locale)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <span className={`whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] ${isOpen ? "text-cyan-100" : "text-zinc-400"}`}>
                      {isOpen ? (isZh ? "收起詳細資料" : "Collapse details") : (isZh ? "展開優缺點" : "Open pros & limits")}
                    </span>
                    {isOpen ? <ChevronUp className="h-5 w-5 text-cyan-100" /> : <ChevronDown className="h-5 w-5 text-zinc-400" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-white/8 px-5 pb-6 pt-5 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/16 bg-emerald-300/[0.055] px-3 py-1.5 text-emerald-100"><BadgeCheck className="h-3.5 w-3.5" />{confidenceLabel[engine.confidence]}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-zinc-400"><Cpu className="h-3.5 w-3.5" />{stemText(engine.bestFor, locale)}</span>
                    </div>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300/75">{isZh ? "適合你的理由" : "Why it works"}</p>
                        <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 text-zinc-300">
                          {engine.strengths.map((item) => <li key={item.en} className="flex gap-2"><span className="text-emerald-300">+</span><span>{stemText(item, locale)}</span></li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-300/70">{isZh ? "先知道的限制" : "Know the limits"}</p>
                        <ul className="mt-3 grid gap-2 text-sm font-bold leading-6 text-zinc-400">
                          {engine.limits.map((item) => <li key={item.en} className="flex gap-2"><span className="text-red-300">−</span><span>{stemText(item, locale)}</span></li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.025] p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.15em] text-zinc-600">{isZh ? "你可能在哪裡遇到它" : "Where you may encounter it"}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-zinc-300">{engine.implementations.map((item) => stemText(item, locale)).join(" · ")}</p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {engine.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-200 hover:text-white">{source.label}<ExternalLink className="h-3.5 w-3.5" /></a>)}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {engines.length > 4 && (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-cyan-200/14 bg-cyan-300/[0.03] px-4 py-4 text-center">
            <p className="text-xs font-black text-cyan-100/70">
              {showAllEngines
                ? (isZh ? `已展開全部 ${engines.length} 類引擎` : `All ${engines.length} engine families are open`)
                : (isZh ? `優先顯示本次推薦，還有 ${engines.length - 4} 類引擎` : `Goal matches first, with ${engines.length - 4} more engine families`)}
            </p>
            <button type="button" onClick={() => { setShowAllEngines((value) => !value); setExpanded(null); }} aria-expanded={showAllEngines} aria-controls="stem-engine-results" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-cyan-200/38 bg-cyan-300/[0.08] px-6 text-sm font-black text-cyan-50 transition hover:border-cyan-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100">
              {showAllEngines ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAllEngines ? (isZh ? "收起，只看推薦 4 類" : "Collapse to 4 recommended") : (isZh ? `展開全部 ${engines.length} 類引擎` : `Show all ${engines.length} engine families`)}
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[1.15rem] border border-yellow-300/18 bg-yellow-300/[0.045] p-5 sm:p-6">
            <CircleHelp className="h-6 w-6 text-yellow-200" />
            <h3 className="mt-4 text-2xl font-black text-white">{isZh ? "FL Studio：功能確認，底層未公開" : "FL Studio: feature confirmed, engine undisclosed"}</h3>
            <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">
              {isZh
                ? "Image-Line 官方確認可拆 Vocal、Drums、Bass、Instruments，但沒有公開模型來源。原 PDF 對 Demucs 的推測只能當觀察，不能當成購買判斷。"
                : "Image-Line confirms Vocal, Drums, Bass, and Instruments extraction, but does not disclose the underlying model. The PDF's Demucs guess remains an observation, not a purchasing fact."}
            </p>
            <a href="https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/basics_new.htm" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-yellow-100 hover:text-white">Image-Line official manual<ExternalLink className="h-3.5 w-3.5" /></a>
          </article>
          <article className="rounded-[1.15rem] border border-orange-300/16 bg-orange-400/[0.035] p-5 sm:p-6">
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.25em] text-orange-300/75`}>BEFORE YOU PAY</p>
            <h3 className="mt-3 text-2xl font-black text-white">{isZh ? "付費前做這四件事" : "Four checks before paying"}</h3>
            <ol className="mt-4 grid gap-3 text-sm font-bold leading-6 text-zinc-300 sm:grid-cols-2">
              {(isZh
                ? ["先找 DAW 內建 Stem 功能", "用同一首歌比較漏音與殘影", "確認差異是模型、手動修復還是 API", "只用自己有權處理的音檔"]
                : ["Check your DAW's built-in stem feature", "Compare bleed on the same reference track", "Identify whether you are buying a model, repair tools, or an API", "Process only audio you have the right to use"]
              ).map((item, index) => <li key={item} className="flex gap-3 rounded-lg border border-white/8 bg-black/35 p-3"><span className={`${fontRighteous.className} text-orange-300`}>0{index + 1}</span><span>{item}</span></li>)}
            </ol>
          </article>
        </div>

        <p className="mt-5 text-xs font-bold leading-6 text-zinc-600">
          {isZh
            ? "資料核對：2026-07-17。產品版本、價格、模型與授權可能改變；購買前請再看官方文件。拆軌不會自動取得取樣、重混或公開發表權。"
            : "Cross-checked on 2026-07-17. Product versions, prices, models, and licenses can change; confirm official documentation before purchase. Stem separation does not grant sampling, remix, or publication rights."}
        </p>
      </div>
    </section>
  );
}
