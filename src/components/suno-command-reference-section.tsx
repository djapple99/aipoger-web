"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import {
  SUNO_COMMAND_REFERENCE,
  SUNO_PROBLEM_ROUTES,
  type ReferenceLocale,
  type ReferenceText,
  type SunoCommandReferenceKind,
} from "@/lib/suno-reference-guide";

const REFERENCE_PREVIEW_COUNT = 6;

function localize(value: ReferenceText, locale: ReferenceLocale) {
  return value[locale];
}

export default function SunoCommandReferenceSection({ locale }: { locale: ReferenceLocale }) {
  const isZh = locale === "zh";
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SunoCommandReferenceKind | "all">("all");
  const [showAll, setShowAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const labels = isZh
    ? {
        eyebrow: "SUNO COMMAND REFERENCE",
        title: "先查這一格，再開始生成",
        body: "把 Suno 的欄位、段落標籤、控制旋鈕與編輯功能放在同一張速查表。每一條都標出作用、風險與證據等級；標籤是提示，不是保證命令。",
        problemTitle: "你現在卡在哪裡？",
        problemBody: "從問題進場，不必先讀完整本教材。",
        search: "搜尋：Verse、滑桿、唱不清楚、Song Editor…",
        found: "找到",
        all: "全部",
        field: "欄位",
        tag: "標籤",
        control: "控制",
        edit: "編輯",
        official: "官方功能",
        fieldEvidence: "愛波哥實測",
        version: "版本敏感",
        effect: "會影響什麼",
        caution: "使用前注意",
        copy: "複製範例",
        copied: "已複製",
        showAll: "展開全部速查項目",
        collapse: "收起，只看前 6 項",
        noResult: "找不到符合的速查項目，換一個聽得見的關鍵字。",
      }
    : {
        eyebrow: "SUNO COMMAND REFERENCE",
        title: "Check the field before you render",
        body: "Keep Suno fields, section tags, controls, and editing tools in one quick reference. Every entry shows its effect, risk, and evidence level; tags are cues, not guarantees.",
        problemTitle: "Where are you stuck?",
        problemBody: "Start from the problem instead of reading the whole manual.",
        search: "Search: Verse, slider, rushed lyrics, Song Editor…",
        found: "Found",
        all: "All",
        field: "Fields",
        tag: "Tags",
        control: "Controls",
        edit: "Editing",
        official: "Official feature",
        fieldEvidence: "AIPOGER field test",
        version: "Version-sensitive",
        effect: "What it changes",
        caution: "Watch before using",
        copy: "Copy example",
        copied: "Copied",
        showAll: "Show all reference entries",
        collapse: "Collapse to the first 6",
        noResult: "No matching reference entry. Try a word you can hear.",
      };

  const kindLabels: Record<SunoCommandReferenceKind | "all", string> = {
    all: labels.all,
    field: labels.field,
    tag: labels.tag,
    control: labels.control,
    edit: labels.edit,
  };

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return SUNO_COMMAND_REFERENCE.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (!normalized) return true;
      return [
        item.title.zh,
        item.title.en,
        item.syntax.zh,
        item.syntax.en,
        item.effect.zh,
        item.effect.en,
        item.caution.zh,
        item.caution.en,
        item.version.zh,
        item.version.en,
        ...item.keywords,
      ].join(" ").toLocaleLowerCase().includes(normalized);
    });
  }, [kind, query]);

  const visibleResults = showAll || query.trim() || kind !== "all"
    ? results
    : results.slice(0, REFERENCE_PREVIEW_COUNT);

  const copyReference = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => current === key ? null : current), 1600);
    } catch {
      setCopiedKey(null);
    }
  };

  const evidenceLabel = (evidence: "official" | "field" | "version") => {
    if (evidence === "official") return labels.official;
    if (evidence === "field") return labels.fieldEvidence;
    return labels.version;
  };

  return (
    <section id="suno-command-reference" className="mt-10 scroll-mt-24 overflow-hidden rounded-[1.6rem] border border-cyan-200/20 bg-[#070808]/95 shadow-[0_28px_100px_rgba(0,0,0,0.48)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_90%_15%,rgba(255,106,0,0.12),transparent_32%)] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/28 bg-cyan-300/[0.08] text-cyan-200">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.32em] text-cyan-200/80`}>{labels.eyebrow}</p>
            </div>
            <h2 className="mt-4 text-[clamp(2rem,5vw,4.5rem)] font-black leading-[0.98] tracking-[-0.035em] text-white">{labels.title}</h2>
            <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-zinc-300">{labels.body}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/45 px-5 py-4 text-right">
            <p className="text-3xl font-black tabular-nums text-white">{SUNO_COMMAND_REFERENCE.length}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">{isZh ? "速查項目" : "REFERENCE ENTRIES"}</p>
          </div>
        </div>

        <div className="mt-7 border-t border-white/10 pt-5">
          <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.28em] text-orange-300/75`}>{isZh ? "PROBLEM ROUTER" : "PROBLEM ROUTER"}</p>
          <div className="mt-3 flex flex-col gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4">
            {SUNO_PROBLEM_ROUTES.map((route) => (
              <a key={route.key} href={route.href} className="group rounded-xl border border-white/10 bg-black/35 p-4 transition hover:-translate-y-0.5 hover:border-orange-300/40 hover:bg-orange-400/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200">
                <p className="text-base font-black text-white group-hover:text-orange-100">{localize(route.title, locale)}</p>
                <p className="mt-2 text-xs font-bold leading-6 text-zinc-500">{localize(route.body, locale)}</p>
              </a>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-zinc-600">{labels.problemTitle} · {labels.problemBody}</p>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-7 sm:py-7 lg:px-9 lg:py-9">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="flex min-h-13 items-center gap-3 rounded-xl border-2 border-cyan-200/22 bg-black/60 px-3 transition focus-within:border-cyan-200/60">
            <Search className="h-5 w-5 shrink-0 text-cyan-200/65" aria-hidden="true" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false); }} placeholder={labels.search} aria-label={labels.search} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label={isZh ? "清除搜尋" : "Clear search"} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>}
          </label>
          <p className="text-right text-xs font-black tracking-[0.12em] text-zinc-600" aria-live="polite">{labels.found} {results.length} / {SUNO_COMMAND_REFERENCE.length}</p>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="group" aria-label={isZh ? "速查分類" : "Reference categories"}>
          {(Object.keys(kindLabels) as (SunoCommandReferenceKind | "all")[]).map((item) => (
            <button key={item} type="button" onClick={() => { setKind(item); setShowAll(false); }} aria-pressed={kind === item} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${kind === item ? "border-cyan-200/70 bg-cyan-300/[0.13] text-cyan-50" : "border-white/10 bg-white/[0.035] text-zinc-500 hover:text-white"}`}>{kindLabels[item]}</button>
          ))}
        </div>

        <div id="suno-command-reference-results" className="mt-5 grid gap-3 lg:grid-cols-2">
          {visibleResults.map((item) => (
            <article key={item.key} className="rounded-[1.15rem] border border-white/10 bg-black/42 p-5 transition hover:border-cyan-200/28">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.055] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">{kindLabels[item.kind]}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${item.evidence === "official" ? "border-emerald-300/20 bg-emerald-300/[0.055] text-emerald-100" : item.evidence === "field" ? "border-orange-300/20 bg-orange-300/[0.055] text-orange-100" : "border-amber-300/20 bg-amber-300/[0.055] text-amber-100"}`}>{evidenceLabel(item.evidence)}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-black text-white">{localize(item.title, locale)}</h3>
                </div>
                <button type="button" onClick={() => void copyReference(item.key, localize(item.syntax, locale))} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/[0.06] px-3 text-xs font-black text-cyan-50 transition hover:border-cyan-100/65 hover:bg-cyan-300/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
                  {copiedKey === item.key ? <Check className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4" />}
                  {copiedKey === item.key ? labels.copied : labels.copy}
                </button>
              </div>
              <pre className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-cyan-200/12 bg-[#050707] p-4 font-mono text-xs font-bold leading-6 text-cyan-50/90">{localize(item.syntax, locale)}</pre>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3"><dt className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/60">{labels.effect}</dt><dd className="mt-1 font-bold leading-6 text-zinc-300">{localize(item.effect, locale)}</dd></div>
                <div className="rounded-xl border border-orange-300/12 bg-orange-300/[0.03] px-4 py-3"><dt className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/60">{labels.caution}</dt><dd className="mt-1 font-bold leading-6 text-zinc-400">{localize(item.caution, locale)}</dd></div>
              </dl>
              <div className="mt-4 border-t border-white/8 pt-3 text-[11px] font-black text-zinc-600">
                <span>{localize(item.version, locale)}</span>
              </div>
            </article>
          ))}
        </div>

        {results.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-white/12 p-8 text-center text-sm font-bold text-zinc-500">{labels.noResult}</p>}
        {results.length > REFERENCE_PREVIEW_COUNT && !query.trim() && kind === "all" && (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-cyan-200/14 bg-cyan-300/[0.035] px-4 py-4 text-center">
            <p className="text-xs font-black text-cyan-100/75">{showAll ? (isZh ? `已展開全部 ${results.length} 項` : `All ${results.length} entries are open`) : (isZh ? `目前顯示前 ${REFERENCE_PREVIEW_COUNT} 項，還有 ${results.length - REFERENCE_PREVIEW_COUNT} 項` : `Showing the first ${REFERENCE_PREVIEW_COUNT}; ${results.length - REFERENCE_PREVIEW_COUNT} more remain`)}</p>
            <button type="button" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll} aria-controls="suno-command-reference-results" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200/35 bg-cyan-300/[0.08] px-5 text-xs font-black text-cyan-50 transition hover:border-cyan-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAll ? labels.collapse : labels.showAll}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
