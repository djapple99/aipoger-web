"use client";

import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Gauge,
  RadioTower,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import {
  SUNO_FEATURE_WATCH,
  SUNO_OFFICIAL_CROSS_CHECK_DATE,
  SUNO_PREFLIGHT_ITEMS,
  SUNO_QUICK_START_FIELDS,
  SUNO_REFERENCE_PAGE_UPDATED_DATE,
  SUNO_RIGHTS_GUIDE,
  SUNO_STARTER_TEMPLATE,
  SUNO_TROUBLESHOOTING,
  type ReferenceLocale,
  type ReferenceText,
} from "@/lib/suno-reference-guide";

function localize(value: ReferenceText, locale: ReferenceLocale) {
  return value[locale];
}

export default function SunoReferenceGuideSection({ locale }: { locale: ReferenceLocale }) {
  const isZh = locale === "zh";
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [copied, setCopied] = useState(false);
  const [troubleQuery, setTroubleQuery] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const openForHash = () => {
      const target = window.location.hash;
      if (["#suno-control-desk", "#suno-preflight", "#suno-troubleshooting", "#suno-version-watch", "#rights-release"].includes(target)) {
        setGuideOpen(true);
        window.setTimeout(() => document.querySelector(target)?.scrollIntoView({ block: "start" }), 0);
      }
    };
    openForHash();
    window.addEventListener("hashchange", openForHash);
    return () => window.removeEventListener("hashchange", openForHash);
  }, []);

  const troubleResults = useMemo(() => {
    const query = troubleQuery.trim().toLocaleLowerCase();
    if (!query) return SUNO_TROUBLESHOOTING;
    return SUNO_TROUBLESHOOTING.filter((item) => [item.symptom.zh, item.symptom.en, item.likely.zh, item.likely.en, item.move.zh, item.move.en]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query));
  }, [troubleQuery]);

  const copyStarter = async () => {
    try {
      await navigator.clipboard.writeText(localize(SUNO_STARTER_TEMPLATE, locale));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const toggleCheck = (key: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section id="suno-control-desk" className="scroll-mt-32 overflow-hidden rounded-[1.65rem] border border-orange-300/24 bg-[#070706]/95 shadow-[0_34px_110px_rgba(0,0,0,0.58)]">
      <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_8%_0%,rgba(255,106,0,0.22),transparent_34%),radial-gradient(circle_at_90%_15%,rgba(34,211,238,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.035),transparent_58%)] px-5 py-8 sm:px-8 lg:px-10 lg:py-11">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-200/80 to-transparent" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-300/32 bg-orange-400/[0.1] text-orange-200 shadow-[0_0_30px_rgba(251,146,60,0.12)]">
                <Gauge className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.34em] text-orange-200/80`}>SUNO CONTROL DESK</p>
              <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.055] px-3 py-1 text-[10px] font-black tracking-[0.1em] text-cyan-100">
                {isZh ? "實戰起手式" : "STARTER ROUTE"}
              </span>
            </div>
            <h2 className="mt-5 max-w-5xl text-[clamp(2.15rem,5vw,4.7rem)] font-black leading-[0.98] tracking-[-0.035em] text-white">
              {isZh ? "先分清三件事，生成才有得比較" : "Separate three decisions before you render"}
            </h2>
            <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-zinc-300">
              {isZh
                ? "Style 決定聲音、Lyrics 決定怎麼唱、Title 留住記憶點。一次只讓一個變數移動，才知道哪一招真的有效。"
                : "Style sets the sound, Lyrics shape the delivery, and Title holds the memory point. Move one variable at a time so you know what worked."}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/48 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">REFERENCE STATUS</p>
                <p className="mt-1 text-sm font-black text-white">{isZh ? "頁面更新" : "Page updated"} · {SUNO_REFERENCE_PAGE_UPDATED_DATE}</p>
              </div>
              <RadioTower className="h-5 w-5 text-cyan-200" aria-hidden="true" />
            </div>
            <p className="mt-3 border-t border-white/8 pt-3 text-xs font-bold leading-5 text-zinc-500">
              {isZh ? `官方文件核對 · ${SUNO_OFFICIAL_CROSS_CHECK_DATE}` : `Official docs cross-check · ${SUNO_OFFICIAL_CROSS_CHECK_DATE}`}
            </p>
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-white">
              {isZh ? "內含 5 個實戰工具區" : "Includes 5 practical tool zones"}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-zinc-500">
              {isZh ? "3 欄工作法 · 可複製模板 · 8 關檢查 · 6 種排錯 · 版本與權利" : "3-field workflow · copyable template · 8 checks · 6 fixes · version and rights"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen((value) => !value)}
            aria-expanded={guideOpen}
            aria-controls="suno-control-desk-content"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full border border-orange-300/48 bg-orange-400/[0.12] px-6 text-sm font-black text-orange-50 shadow-[0_0_28px_rgba(251,146,60,0.1)] transition hover:border-orange-200 hover:bg-orange-400/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
          >
            {guideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {guideOpen ? (isZh ? "收起完整起手式" : "Collapse full starter") : (isZh ? "展開完整起手式" : "Open full starter")}
          </button>
        </div>
      </div>

      {guideOpen && <div id="suno-control-desk-content" className="px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-10">
        <div className="grid gap-3 lg:grid-cols-3">
          {SUNO_QUICK_START_FIELDS.map((field, index) => (
            <article key={field.key} className="group relative overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/48 p-5 transition hover:-translate-y-0.5 hover:border-orange-300/36 sm:p-6">
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${index === 1 ? "via-cyan-200/70" : "via-orange-300/70"} to-transparent`} />
              <div className="flex items-start justify-between gap-4">
                <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.24em] ${index === 1 ? "text-cyan-200/75" : "text-orange-300/75"}`}>{field.eyebrow}</p>
                <span className="text-3xl font-black tabular-nums text-white/[0.08]">0{index + 1}</span>
              </div>
              <h3 className="mt-4 text-2xl font-black text-white">{localize(field.title, locale)}</h3>
              <p className="mt-3 min-h-20 text-sm font-bold leading-7 text-zinc-400">{localize(field.body, locale)}</p>
              <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-white/8 bg-[#050707] p-4 font-mono text-xs font-bold leading-6 text-cyan-50/82">{localize(field.example, locale)}</pre>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <article className="overflow-hidden rounded-[1.25rem] border border-cyan-200/16 bg-cyan-300/[0.035]">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6">
              <div>
                <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.26em] text-cyan-200/70`}>COPY STARTER</p>
                <h3 className="mt-2 text-2xl font-black text-white">{isZh ? "一份能直接改的起手模板" : "A starter template you can reshape"}</h3>
              </div>
              <button type="button" onClick={() => void copyStarter()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200/28 bg-cyan-300/[0.07] px-4 text-xs font-black text-cyan-50 transition hover:border-cyan-100/60 hover:bg-cyan-300/[0.12]">
                {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                {copied ? (isZh ? "已複製" : "Copied") : (isZh ? "複製模板" : "Copy template")}
              </button>
            </div>
            <pre className="max-h-[25rem] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs font-bold leading-6 text-zinc-300 sm:p-6">{localize(SUNO_STARTER_TEMPLATE, locale)}</pre>
          </article>

          <article id="suno-preflight" className="scroll-mt-32 rounded-[1.25rem] border border-orange-300/18 bg-orange-400/[0.035] p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.26em] text-orange-300/75`}>PRE-FLIGHT CHECK</p>
                <h3 className="mt-2 text-2xl font-black text-white">{isZh ? "生成前，先過這 8 關" : "Eight checks before rendering"}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-black text-orange-100">
                <ClipboardCheck className="h-4 w-4" />
                <span aria-live="polite">{checked.size} / {SUNO_PREFLIGHT_ITEMS.length}</span>
                {checked.size > 0 && (
                  <button type="button" onClick={() => setChecked(new Set())} aria-label={isZh ? "重設檢查表" : "Reset checklist"} className="ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition hover:text-white">
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-5 grid gap-2 md:grid-cols-2">
              {SUNO_PREFLIGHT_ITEMS.map((item) => {
                const active = checked.has(item.key);
                return (
                  <button key={item.key} type="button" aria-pressed={active} onClick={() => toggleCheck(item.key)} className={`flex min-h-16 items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold leading-6 transition ${active ? "border-emerald-300/35 bg-emerald-300/[0.075] text-emerald-50" : "border-white/10 bg-black/36 text-zinc-400 hover:border-orange-300/30 hover:text-white"}`}>
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${active ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-200" : "border-white/15 text-transparent"}`}>
                      <Check className="h-4 w-4" />
                    </span>
                    <span>{localize(item.text, locale)}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] font-bold leading-5 text-zinc-600">
              {isZh ? "4–7 個 Style 重點與三版比較是實測工作法，不是 Suno 官方限制。" : "The 4–7 Style cues and three-render comparison are field methods, not official Suno limits."}
            </p>
          </article>
        </div>

        <section id="suno-troubleshooting" className="scroll-mt-32 mt-10 border-t border-white/10 pt-9">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.3em] text-cyan-200/75`}>TROUBLESHOOTING ROUTER</p>
              <h3 className="mt-3 text-3xl font-black text-white md:text-4xl">{isZh ? "不要一直重抽，先找到是哪裡失控" : "Do not keep rerolling—find what drifted"}</h3>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-zinc-500">{isZh ? "從聽見的症狀反推 Prompt 或歌詞問題，再用最小修改做下一版。" : "Trace an audible symptom back to the prompt or lyric, then make the smallest useful change."}</p>
            </div>
            <label className="flex min-h-13 items-center gap-3 rounded-xl border-2 border-cyan-200/22 bg-black/65 px-3 transition focus-within:border-cyan-200/60">
              <Search className="h-5 w-5 shrink-0 text-cyan-200/65" />
              <input value={troubleQuery} onChange={(event) => setTroubleQuery(event.target.value)} placeholder={isZh ? "搜尋：咬字、聲線、副歌、失真…" : "Search: lyrics, vocal, hook, distortion…"} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600" />
              {troubleQuery && <button type="button" onClick={() => setTroubleQuery("")} aria-label={isZh ? "清除搜尋" : "Clear search"} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>}
            </label>
          </div>
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {troubleResults.map((item) => (
              <article key={item.key} className="rounded-[1.1rem] border border-white/10 bg-black/42 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-300/22 bg-orange-400/[0.07] text-orange-200"><TriangleAlert className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h4 className="text-lg font-black text-white">{localize(item.symptom, locale)}</h4>
                    <p className="mt-2 text-xs font-bold leading-6 text-zinc-500"><span className="mr-2 text-zinc-300">{isZh ? "可能原因" : "LIKELY"}</span>{localize(item.likely, locale)}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-cyan-200/12 bg-cyan-300/[0.035] px-4 py-3 text-sm font-bold leading-7 text-cyan-50/84">
                  <span className="mr-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/60">{isZh ? "下一步" : "NEXT MOVE"}</span>
                  {localize(item.move, locale)}
                </div>
              </article>
            ))}
          </div>
          {troubleResults.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-white/12 p-8 text-center text-sm font-bold text-zinc-500">{isZh ? "找不到這個症狀，換一個聽得見的關鍵字。" : "No match yet. Try a keyword that describes what you hear."}</p>}
        </section>

        <section id="suno-version-watch" className="scroll-mt-32 mt-10 border-t border-white/10 pt-9">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.3em] text-orange-300/75`}>VERSION &amp; FEATURE WATCH</p>
              <h3 className="mt-3 text-3xl font-black text-white md:text-4xl">{isZh ? "先分清楚：官方功能，還是實測手感" : "Separate official features from field behavior"}</h3>
            </div>
            <p className="rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 text-xs font-black text-zinc-400">{isZh ? "官方核對" : "Cross-checked"} · {SUNO_OFFICIAL_CROSS_CHECK_DATE}</p>
          </div>
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            {SUNO_FEATURE_WATCH.map((item) => (
              <article key={item.key} className="flex min-h-60 flex-col rounded-[1.1rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,106,0,0.055),rgba(0,0,0,0.56)_46%,rgba(34,211,238,0.035))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/18 bg-emerald-300/[0.055] px-2.5 py-1 text-[10px] font-black text-emerald-100"><BadgeCheck className="h-3.5 w-3.5" />{localize(item.status, locale)}</span>
                  <SlidersHorizontal className="h-4 w-4 text-zinc-700" />
                </div>
                <h4 className="mt-5 text-2xl font-black text-white">{localize(item.title, locale)}</h4>
                <p className="mt-3 flex-1 text-sm font-bold leading-7 text-zinc-400">{localize(item.body, locale)}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="rights-release" className="scroll-mt-32 mt-10 overflow-hidden rounded-[1.35rem] border border-amber-300/18 bg-[radial-gradient(circle_at_100%_0%,rgba(251,191,36,0.09),transparent_34%),rgba(0,0,0,0.38)] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-4xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-amber-200" />
                <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.3em] text-amber-200/75`}>RIGHTS &amp; RELEASE CHECK</p>
              </div>
              <h3 className="mt-4 text-3xl font-black text-white md:text-4xl">{isZh ? "能生成、能商用、能主張著作權，是三個問題" : "Generation, commercial use, and copyright are different questions"}</h3>
              <p className="mt-4 text-sm font-bold leading-7 text-zinc-400">{isZh ? "正式上架前，重新核對當期方案、條款與每一項素材來源。這裡是風險檢查，不是法律意見。" : "Before release, re-check the active plan, current terms, and every source asset. This is a risk check, not legal advice."}</p>
            </div>
            <Sparkles className="h-8 w-8 text-amber-200/65" />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {SUNO_RIGHTS_GUIDE.map((item) => {
              const tone = item.tone === "green"
                ? "border-emerald-300/16 bg-emerald-300/[0.035]"
                : item.tone === "amber"
                  ? "border-amber-300/16 bg-amber-300/[0.035]"
                  : "border-cyan-200/16 bg-cyan-300/[0.035]";
              return (
                <article key={item.key} className={`rounded-[1.05rem] border p-5 ${tone}`}>
                  <h4 className="text-lg font-black text-white">{localize(item.title, locale)}</h4>
                  <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">{localize(item.body, locale)}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>}
    </section>
  );
}
