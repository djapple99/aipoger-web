"use client";

import {
  BadgeCheck,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  LibraryBig,
  Search,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import {
  type SunoEvidence,
  type SunoGenreGroup,
  type SunoLibraryLocale,
  type SunoLocalizedText,
  type SunoLyricCategory,
  type SunoPromptCategory,
  type SunoTechnique,
} from "@/lib/suno-practice-library";
import type { SunoArtistDnaEntry, SunoPromptRecipe } from "@/lib/suno-inspiration-index";

const SunoInspirationIndexSection = dynamic(
  () => import("@/components/suno-inspiration-index-section"),
  {
    loading: () => (
      <div className="mt-14 min-h-48 animate-pulse rounded-[1.5rem] border border-white/10 bg-white/[0.025]" />
    ),
  },
);

type AnyTechnique = SunoTechnique<SunoPromptCategory> | SunoTechnique<SunoLyricCategory>;

function sunoLibraryText(text: SunoLocalizedText, locale: SunoLibraryLocale) {
  return text[locale];
}

function techniqueMatches(item: AnyTechnique, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    item.title.zh,
    item.title.en,
    item.summary.zh,
    item.summary.en,
    item.use.zh,
    item.use.en,
    item.copy.zh,
    item.copy.en,
    ...item.keywords,
  ].join(" ").toLowerCase().includes(query);
}

function TechniqueCard({
  item,
  locale,
  copied,
  onCopy,
}: {
  item: AnyTechnique;
  locale: SunoLibraryLocale;
  copied: boolean;
  onCopy: () => void;
}) {
  const isZh = locale === "zh";
  const [expanded, setExpanded] = useState(false);
  const evidenceLabel: Record<SunoEvidence, string> = {
    official: isZh ? "官方功能可確認" : "Official feature",
    field: isZh ? "愛波哥實測整理" : "AIPOGER field-tested",
    version: isZh ? "版本敏感・請重測" : "Version-sensitive",
  };
  const evidenceStyle: Record<SunoEvidence, string> = {
    official: "border-emerald-300/18 bg-emerald-300/[0.06] text-emerald-100",
    field: "border-cyan-200/18 bg-cyan-300/[0.06] text-cyan-100",
    version: "border-yellow-300/18 bg-yellow-300/[0.06] text-yellow-100",
  };
  const visibleSources = item.sources.filter((source) => {
    const normalized = source.toLowerCase();
    return !normalized.includes("nunaught") && !normalized.includes("suno-songwriting");
  });

  return (
    <article className="overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/45">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${evidenceStyle[item.evidence]}`}>
              {evidenceLabel[item.evidence]}
            </span>
            <h4 className="mt-3 text-xl font-black text-white sm:text-2xl">{sunoLibraryText(item.title, locale)}</h4>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? (isZh ? "收起說明" : "Collapse details") : (isZh ? "展開說明" : "Expand details")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition hover:border-white/25 hover:text-white"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">{sunoLibraryText(item.summary, locale)}</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/9 bg-[#050707]">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words p-4 font-mono text-xs font-bold leading-6 text-cyan-50/88">{sunoLibraryText(item.copy, locale)}</pre>
          <button
            type="button"
            onClick={onCopy}
            className="flex min-h-10 w-full items-center justify-center gap-2 border-t border-white/8 bg-white/[0.025] px-4 text-xs font-black text-zinc-400 transition hover:bg-white/[0.055] hover:text-white"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            {copied ? (isZh ? "已複製" : "Copied") : (isZh ? "複製這一招" : "Copy move")}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-white/8 bg-white/[0.018] px-5 py-4 sm:px-6">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-300/75">{isZh ? "適合使用" : "Best use"}</p>
          <p className="mt-2 text-sm font-bold leading-6 text-zinc-300">{sunoLibraryText(item.use, locale)}</p>
          {visibleSources.length > 0 && (
            <p className="mt-3 text-[11px] font-bold leading-5 text-zinc-600">
              {isZh ? "整理來源：" : "Source synthesis: "}{visibleSources.join(" · ")}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default function SunoPracticeLibrarySection({
  locale,
  promptMoves,
  lyricMoves,
  genreGroups,
  productionFlow,
  promptCategories,
  lyricCategories,
  artistDnaEntries,
  promptRecipes,
  recipeGenres,
}: {
  locale: SunoLibraryLocale;
  promptMoves: SunoTechnique<SunoPromptCategory>[];
  lyricMoves: SunoTechnique<SunoLyricCategory>[];
  genreGroups: SunoGenreGroup[];
  productionFlow: { title: SunoLocalizedText; body: SunoLocalizedText }[];
  promptCategories: { key: SunoPromptCategory | "all"; label: SunoLocalizedText }[];
  lyricCategories: { key: SunoLyricCategory | "all"; label: SunoLocalizedText }[];
  artistDnaEntries: readonly SunoArtistDnaEntry[];
  promptRecipes: readonly SunoPromptRecipe[];
  recipeGenres: { key: string; zh: string; en: string }[];
}) {
  const isZh = locale === "zh";
  const [promptCategory, setPromptCategory] = useState<SunoPromptCategory | "all">("all");
  const [lyricCategory, setLyricCategory] = useState<SunoLyricCategory | "all">("all");
  const [promptSearch, setPromptSearch] = useState("");
  const [lyricSearch, setLyricSearch] = useState("");
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllPrompt, setShowAllPrompt] = useState(false);
  const [showAllLyric, setShowAllLyric] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const promptResults = useMemo(
    () => promptMoves.filter((item) => (promptCategory === "all" || item.category === promptCategory) && techniqueMatches(item, promptSearch)),
    [promptCategory, promptMoves, promptSearch],
  );
  const lyricResults = useMemo(
    () => lyricMoves.filter((item) => (lyricCategory === "all" || item.category === lyricCategory) && techniqueMatches(item, lyricSearch)),
    [lyricCategory, lyricMoves, lyricSearch],
  );
  const genreResults = useMemo(() => {
    const query = genreSearch.trim().toLowerCase();
    if (!query) return genreGroups;
    return genreGroups.map((group) => ({
      ...group,
      terms: group.terms.filter((term) => `${term} ${group.label.zh} ${group.label.en}`.toLowerCase().includes(query)),
    })).filter((group) => group.terms.length > 0);
  }, [genreGroups, genreSearch]);

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => current === key ? null : current), 1500);
    } catch {
      setCopiedKey(null);
    }
  };

  const visiblePrompt = showAllPrompt || promptSearch || promptCategory !== "all" ? promptResults : promptResults.slice(0, 8);
  const visibleLyrics = showAllLyric || lyricSearch || lyricCategory !== "all" ? lyricResults : lyricResults.slice(0, 8);

  return (
    <section id="suno-prompt-library" className="scroll-mt-20 overflow-hidden rounded-[1.6rem] border border-orange-300/20 bg-[#070707]/94 shadow-[0_30px_100px_rgba(0,0,0,0.52)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_10%_0%,rgba(255,106,0,0.18),transparent_34%),radial-gradient(circle_at_86%_10%,rgba(34,211,238,0.14),transparent_30%)] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <WandSparkles className="h-6 w-6 text-orange-300" />
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.3em] text-orange-300/75`}>SUNO FIELD LIBRARY · 2026</p>
            </div>
            <h2 className="mt-4 max-w-5xl text-[clamp(2.1rem,5vw,4.8rem)] font-black leading-[0.98] text-white">
              {isZh ? "Prompt 招式庫＋歌詞控制" : "Prompt Moves + Lyric Control"}
            </h2>
            <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-zinc-300">
              {isZh
                ? "九份教材整理成可以搜尋、可以複製、知道何時該用的招式。重複內容已合併，拼字與過度堆疊的舊 Prompt 也已重新整理。"
                : "Nine supplied files are distilled into searchable, copyable moves with clear use cases. Duplicates are merged, while misspellings and overloaded legacy prompts are cleaned up."}
            </p>
          </div>
          <div className="rounded-xl border border-yellow-300/18 bg-yellow-300/[0.055] p-4 text-sm font-bold leading-6 text-yellow-50/85">
            <BadgeCheck className="mb-3 h-5 w-5 text-yellow-200" />
            {isZh
              ? "原資料以 V4.5／V5 為主；Suno 現行官方版本已到 V5.5。標籤是生成提示，不是命令保證，因此本站分成官方功能、愛波哥實測與版本敏感三種證據層級。"
              : "The supplied material focuses on V4.5/V5, while Suno's current official line is V5.5. Tags are generation signals, not guaranteed commands, so entries distinguish official features, field tests, and version-sensitive behavior."}
          </div>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 text-center sm:max-w-3xl sm:grid-cols-4">
          <div><strong className="block text-2xl font-black text-white">{promptMoves.length}</strong><span className="text-[10px] font-black tracking-[0.12em] text-zinc-600">PROMPT MOVES</span></div>
          <div><strong className="block text-2xl font-black text-white">{lyricMoves.length}</strong><span className="text-[10px] font-black tracking-[0.12em] text-zinc-600">LYRIC MOVES</span></div>
          <div><strong className="block text-2xl font-black text-white">1,519</strong><span className="text-[10px] font-black tracking-[0.12em] text-zinc-600">INDEXED REFERENCES</span></div>
          <div><strong className="block text-2xl font-black text-white">{genreGroups.reduce((sum, group) => sum + group.terms.length, 0)}</strong><span className="text-[10px] font-black tracking-[0.12em] text-zinc-600">GENRE TERMS</span></div>
        </div>
      </div>

      <div className="px-4 py-7 sm:px-7 lg:px-9 lg:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.28em] text-cyan-200/70`}>STYLE PROMPT</p>
            <h3 className="mt-2 text-3xl font-black text-white md:text-4xl">{isZh ? "先決定聲音，再開始寫歌" : "Define the sound before writing"}</h3>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black tracking-[0.12em] text-zinc-600">SEARCH · FILTER · COPY</span>
        </div>

        <div role="search" aria-label={isZh ? "搜尋與篩選 Prompt 招式" : "Search and filter prompt moves"} className="mt-6 rounded-[1.15rem] border border-cyan-200/25 bg-[#091011] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_50px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-base font-black text-white">{isZh ? "找你需要的 Prompt 招式" : "Find the prompt move you need"}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-zinc-400">{isZh ? "輸入關鍵字，或直接點下面的分類。" : "Type a keyword or choose a category below."}</p>
            </div>
            <span aria-live="polite" className="rounded-full border border-cyan-200/25 bg-cyan-300/[0.08] px-3 py-1.5 text-xs font-black text-cyan-50">
              {isZh ? `找到 ${promptResults.length} 招` : `${promptResults.length} moves found`}
            </span>
          </div>
          <label className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border-2 border-cyan-200/30 bg-black/75 px-3 shadow-[0_0_24px_rgba(34,211,238,0.05)] transition focus-within:border-cyan-200 focus-within:shadow-[0_0_28px_rgba(34,211,238,0.13)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-300/12 text-cyan-100">
              <Search className="h-5 w-5" />
            </span>
            <input aria-label={isZh ? "搜尋 Prompt 招式" : "Search prompt moves"} value={promptSearch} onChange={(event) => setPromptSearch(event.target.value)} placeholder={isZh ? "搜尋：Jazz、1980s、印度、交響、側鏈…" : "Search: jazz, 1980s, Indian, symphonic, sidechain…"} className="min-w-0 flex-1 bg-transparent py-3 text-base font-bold text-white outline-none placeholder:text-zinc-400" />
            {promptSearch && (
              <button type="button" onClick={() => setPromptSearch("")} aria-label={isZh ? "清除 Prompt 搜尋" : "Clear prompt search"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] text-zinc-300 transition hover:border-white/30 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <fieldset className="mt-4">
            <legend className="text-xs font-black tracking-[0.12em] text-zinc-300">{isZh ? "選擇分類" : "CHOOSE A CATEGORY"}</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
          {promptCategories.map((category) => {
                const selected = promptCategory === category.key;
                return (
                  <button key={category.key} type="button" aria-pressed={selected} onClick={() => setPromptCategory(category.key)} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-black transition ${selected ? "border-cyan-200 bg-cyan-300/[0.18] text-white shadow-[0_0_18px_rgba(34,211,238,0.13)]" : "border-white/20 bg-black/55 text-zinc-300 hover:border-cyan-200/45 hover:bg-cyan-300/[0.07] hover:text-white"}`}>
                    {selected && <Check className="h-4 w-4 text-cyan-200" />}
                    {sunoLibraryText(category.label, locale)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {visiblePrompt.map((item) => (
            <TechniqueCard key={item.key} item={item} locale={locale} copied={copiedKey === item.key} onCopy={() => copyValue(item.key, sunoLibraryText(item.copy, locale))} />
          ))}
        </div>
        {promptResults.length === 0 && <p className="mt-6 rounded-xl border border-white/10 p-5 text-sm font-bold text-zinc-500">{isZh ? "找不到這個 Prompt 招式，換個關鍵字試試。" : "No matching prompt move. Try another search."}</p>}
        {!showAllPrompt && !promptSearch && promptCategory === "all" && promptResults.length > 8 && (
          <button type="button" onClick={() => setShowAllPrompt(true)} className="aipo-ghost-button mx-auto mt-5 flex min-h-11 items-center gap-2 rounded-full px-5 text-xs font-black text-white">
            <LibraryBig className="h-4 w-4" />{isZh ? `展開全部 ${promptResults.length} 招` : `Show all ${promptResults.length} moves`}
          </button>
        )}

        <div className="mt-10 rounded-[1.25rem] border border-cyan-200/16 bg-cyan-300/[0.035] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.25em] text-cyan-200/70`}>GENRE CRATE</p>
              <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">{isZh ? "曲風唱片箱" : "Genre crate"}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-zinc-500">{isZh ? "依使用者提供的曲風截圖重新校字與分組；曲風名稱是起點，不是完整 Prompt。" : "Cleaned and regrouped from the supplied genre screenshot. A genre name is a starting point, not a complete prompt."}</p>
            </div>
            <label className="flex min-h-11 w-full max-w-sm items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 focus-within:border-cyan-200/40">
              <Search className="h-4 w-4 text-zinc-600" />
              <input value={genreSearch} onChange={(event) => setGenreSearch(event.target.value)} placeholder={isZh ? "搜尋曲風" : "Search genres"} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-700" />
            </label>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {genreResults.map((group) => (
              <article key={group.key} className="rounded-xl border border-white/9 bg-black/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-black text-white">{sunoLibraryText(group.label, locale)}</h4>
                  <button type="button" onClick={() => copyValue(`genre-${group.key}`, group.terms.join(", "))} aria-label={isZh ? "複製這組曲風" : "Copy genre group"} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-600 hover:text-white">
                    {copiedKey === `genre-${group.key}` ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {group.terms.map((term) => <span key={term} className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[11px] font-bold text-zinc-400">{term}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div id="suno-inspiration-index" className="scroll-mt-24">
          <SunoInspirationIndexSection
            isZh={isZh}
            artistDnaEntries={artistDnaEntries}
            promptRecipes={promptRecipes}
            recipeGenres={recipeGenres}
          />
        </div>

        <div id="lyric-control-library" className="scroll-mt-20 mt-12 border-t border-white/10 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.28em] text-orange-300/75`}>LYRIC CONTROL</p>
              <h3 className="mt-2 text-3xl font-black text-white md:text-4xl">{isZh ? "歌詞調教：控制怎麼唱" : "Lyric control: shape the delivery"}</h3>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-zinc-500">{isZh ? "這裡處理段落、唱法、情緒與表演；台語字詞發音仍在下方的台語調音實驗室。" : "This library handles sections, delivery, emotion, and performance. Taiwanese pronunciation remains in the dedicated lab below."}</p>
            </div>
            <BookOpenText className="h-8 w-8 text-orange-300/70" />
          </div>

          <div role="search" aria-label={isZh ? "搜尋與篩選歌詞招式" : "Search and filter lyric moves"} className="mt-6 rounded-[1.15rem] border border-orange-300/25 bg-[#120d09] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_50px_rgba(0,0,0,0.24)] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-white">{isZh ? "找你需要的歌詞控制" : "Find the lyric control you need"}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-zinc-400">{isZh ? "輸入唱法、情緒或段落，或直接點下面的分類。" : "Search by delivery, emotion, or section—or choose a category."}</p>
              </div>
              <span aria-live="polite" className="rounded-full border border-orange-300/25 bg-orange-400/[0.08] px-3 py-1.5 text-xs font-black text-orange-50">
                {isZh ? `找到 ${lyricResults.length} 招` : `${lyricResults.length} moves found`}
              </span>
            </div>
            <label className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border-2 border-orange-300/30 bg-black/75 px-3 shadow-[0_0_24px_rgba(251,146,60,0.05)] transition focus-within:border-orange-300 focus-within:shadow-[0_0_28px_rgba(251,146,60,0.13)]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-400/12 text-orange-100">
                <Search className="h-5 w-5" />
              </span>
              <input aria-label={isZh ? "搜尋歌詞招式" : "Search lyric moves"} value={lyricSearch} onChange={(event) => setLyricSearch(event.target.value)} placeholder={isZh ? "輸入關鍵字，例如：副歌、二重唱、哭腔…" : "Type a keyword, e.g. chorus, duet, crying…"} className="min-w-0 flex-1 bg-transparent py-3 text-base font-bold text-white outline-none placeholder:text-zinc-400" />
              {lyricSearch && (
                <button type="button" onClick={() => setLyricSearch("")} aria-label={isZh ? "清除歌詞搜尋" : "Clear lyric search"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] text-zinc-300 transition hover:border-white/30 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
            <fieldset className="mt-4">
              <legend className="text-xs font-black tracking-[0.12em] text-zinc-300">{isZh ? "選擇分類" : "CHOOSE A CATEGORY"}</legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {lyricCategories.map((category) => {
                  const selected = lyricCategory === category.key;
                  return (
                    <button key={category.key} type="button" aria-pressed={selected} onClick={() => setLyricCategory(category.key)} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-black transition ${selected ? "border-orange-300 bg-orange-400/[0.18] text-white shadow-[0_0_18px_rgba(251,146,60,0.13)]" : "border-white/20 bg-black/55 text-zinc-300 hover:border-orange-300/45 hover:bg-orange-400/[0.07] hover:text-white"}`}>
                      {selected && <Check className="h-4 w-4 text-orange-200" />}
                      {sunoLibraryText(category.label, locale)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {visibleLyrics.map((item) => (
              <TechniqueCard key={item.key} item={item} locale={locale} copied={copiedKey === item.key} onCopy={() => copyValue(item.key, sunoLibraryText(item.copy, locale))} />
            ))}
          </div>
          {lyricResults.length === 0 && <p className="mt-6 rounded-xl border border-white/10 p-5 text-sm font-bold text-zinc-500">{isZh ? "找不到這個歌詞招式，換個關鍵字試試。" : "No matching lyric move. Try another search."}</p>}
          {!showAllLyric && !lyricSearch && lyricCategory === "all" && lyricResults.length > 8 && (
            <button type="button" onClick={() => setShowAllLyric(true)} className="aipo-ghost-button mx-auto mt-5 flex min-h-11 items-center gap-2 rounded-full px-5 text-xs font-black text-white">
              <Sparkles className="h-4 w-4" />{isZh ? `展開全部 ${lyricResults.length} 招` : `Show all ${lyricResults.length} moves`}
            </button>
          )}
        </div>

        <div className="mt-12 rounded-[1.25rem] border border-orange-300/16 bg-orange-400/[0.035] p-5 sm:p-7">
          <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.25em] text-orange-300/75`}>FROM MATERIAL TO WORK</p>
          <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">{isZh ? "《AI 音樂製作小指南》放在這裡最合理" : "Where the AI production guide belongs"}</h3>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-zinc-500">{isZh ? "它不是 Prompt 字典，也不是歌詞技巧，而是從想法、挑選、拆軌、DAW 到留存創作證據的製作流程。" : "It is neither a prompt dictionary nor a lyric guide. It is a production path from ideation and selection through stems, DAW work, and process archiving."}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {productionFlow.map((step) => (
              <article key={step.title.en} className="rounded-xl border border-white/9 bg-black/38 p-4">
                <h4 className="text-sm font-black text-orange-100">{sunoLibraryText(step.title, locale)}</h4>
                <p className="mt-2 text-xs font-bold leading-6 text-zinc-400">{sunoLibraryText(step.body, locale)}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/8 pt-5 text-xs font-black">
          <span className="text-zinc-600">{isZh ? "官方文件核對：2026-07-28" : "Official docs cross-check: 2026-07-28"}</span>
          {[
            ["Suno v5.5", "https://help.suno.com/en/articles/11362305"],
            ["Creative Sliders", "https://help.suno.com/en/articles/6141377"],
            ["Music Glossary", "https://help.suno.com/en/articles/9010177"],
            ["Song Editor", "https://help.suno.com/en/articles/6141505"],
            ["Custom Lyrics", "https://help.suno.com/en/articles/2415873"],
          ].map(([label, href]) => (
            <a key={href} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-cyan-200 hover:text-white">{label}<ExternalLink className="h-3.5 w-3.5" /></a>
          ))}
        </div>
      </div>
    </section>
  );
}
