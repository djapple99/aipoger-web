"use client";

import {
  BadgeCheck,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Play,
  Search,
  WandSparkles,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import ShowtimeQueuePlayer, {
  type ShowtimePlayerTrack,
  type ShowtimeQueuePlayerHandle,
} from "@/components/showtime-queue-player";
import { fontRighteous } from "@/lib/fonts";
import {
  type SunoEvidence,
  type SunoGenreGroup,
  type SunoLibraryLocale,
  type SunoLocalizedText,
  type SunoLyricCategory,
  type SunoPromptCategory,
  type SunoStudioMasteringFamily,
  type SunoTechnique,
  SUNO_STUDIO_MASTERING_FAMILY_OPTIONS,
} from "@/lib/suno-practice-library";
import type { SunoArtistDnaEntry, SunoPromptRecipe } from "@/lib/suno-inspiration-index";
import {
  getSunoStudioMasteringAudioPreview,
  SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS,
} from "@/lib/suno-studio-mastering-audio-previews";

const PROMPT_PREVIEW_COUNT = 6;
const LYRIC_PREVIEW_COUNT = 8;
const GENRE_PREVIEW_COUNT = 6;

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

function studioFamilyLabel(family: SunoStudioMasteringFamily, locale: SunoLibraryLocale) {
  return sunoLibraryText(
    SUNO_STUDIO_MASTERING_FAMILY_OPTIONS.find((option) => option.key === family)?.label ?? { zh: family, en: family },
    locale,
  );
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
  hasAudioPreview = false,
  onPlayAudioPreview,
}: {
  item: AnyTechnique;
  locale: SunoLibraryLocale;
  copied: boolean;
  onCopy: () => void;
  hasAudioPreview?: boolean;
  onPlayAudioPreview?: () => void;
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
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${evidenceStyle[item.evidence]}`}>
                {evidenceLabel[item.evidence]}
              </span>
              {item.studioFamily && (
                <span className="inline-flex rounded-full border border-orange-300/20 bg-orange-300/[0.06] px-2.5 py-1 text-[10px] font-black text-orange-100/85">
                  {studioFamilyLabel(item.studioFamily, locale)}
                </span>
              )}
            </div>
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
        {hasAudioPreview ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPlayAudioPreview?.()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-300/45 bg-orange-400/[0.1] px-4 text-sm font-black text-orange-50 transition hover:border-orange-200 hover:bg-orange-400/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100"
              aria-label={isZh ? `播放 ${item.title.zh} 的 15 秒聲音示例` : `Play the 15-second sound example for ${item.title.en}`}
            >
              <Play className="h-4 w-4" fill="currentColor" />
              {isZh ? "15 秒試聽" : "15s preview"}
            </button>
            <span className="text-[11px] font-bold leading-5 text-zinc-500">
              {isZh ? "聲音方向示例・不是正式母帶；Suno 實際生成仍會變化" : "Sound direction sketch · not a final master; Suno generations will vary"}
            </span>
          </div>
        ) : null}
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
  const [promptStudioFamily, setPromptStudioFamily] = useState<SunoStudioMasteringFamily | "all">("all");
  const [lyricCategory, setLyricCategory] = useState<SunoLyricCategory | "all">("all");
  const [promptSearch, setPromptSearch] = useState("");
  const [lyricSearch, setLyricSearch] = useState("");
  const [genreSearch, setGenreSearch] = useState("");
  const [showAllPrompt, setShowAllPrompt] = useState(false);
  const [showAllLyric, setShowAllLyric] = useState(false);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [genreCrateOpen, setGenreCrateOpen] = useState(false);
  const [lyricLibraryOpen, setLyricLibraryOpen] = useState(false);
  const [productionFlowOpen, setProductionFlowOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const previewPlayerRef = useRef<ShowtimeQueuePlayerHandle>(null);

  useEffect(() => {
    const openForHash = () => {
      if (window.location.hash === "#lyric-control-library") {
        setLyricLibraryOpen(true);
        window.setTimeout(() => document.getElementById("lyric-control-library")?.scrollIntoView({ block: "start" }), 0);
      }
    };
    openForHash();
    window.addEventListener("hashchange", openForHash);
    return () => window.removeEventListener("hashchange", openForHash);
  }, []);

  const promptResults = useMemo(
    () => promptMoves.filter((item) => (
      (promptCategory === "all" || item.category === promptCategory)
      && (promptCategory !== "mastering" || promptStudioFamily === "all" || item.studioFamily === promptStudioFamily)
      && techniqueMatches(item, promptSearch)
    )),
    [promptCategory, promptMoves, promptSearch, promptStudioFamily],
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

  const visiblePrompt = showAllPrompt ? promptResults : promptResults.slice(0, PROMPT_PREVIEW_COUNT);
  const visibleLyrics = showAllLyric ? lyricResults : lyricResults.slice(0, LYRIC_PREVIEW_COUNT);
  const visibleGenres = showAllGenres ? genreResults : genreResults.slice(0, GENRE_PREVIEW_COUNT);
  const masteringPreviewQueue = useMemo<ShowtimePlayerTrack[]>(() => (
    SUNO_STUDIO_MASTERING_AUDIO_PREVIEWS.flatMap((preview) => {
      const prompt = promptMoves.find((item) => item.key === preview.key);
      if (!prompt) return [];
      return [{
        id: preview.key,
        title: sunoLibraryText(prompt.title, locale),
        artist: "AIPOGER × Suno",
        coverUrl: "/aipoger-logo.png",
        audioUrl: preview.audioUrl,
      }];
    })
  ), [locale, promptMoves]);

  const playMasteringPreview = (key: string) => {
    const index = masteringPreviewQueue.findIndex((track) => track.id === key);
    if (index < 0) return;
    void previewPlayerRef.current?.start(
      masteringPreviewQueue,
      index,
      isZh ? "錄音室 Prompt 聲音示例" : "Studio Prompt sound examples",
    );
  };

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
                ? "九份教材加上 Beatport 類型截圖，整理成可以搜尋、可以複製、知道何時該用的招式。錄音室 Prompt 改用音樂文化與聽感分成 15 類，從電子音樂、Hip-Hop、Soul & R&B 一路到 Jazz、Pop、Rock 與世界音樂。"
                : "Nine supplied files plus the Beatport genre screenshot are distilled into searchable, copyable moves with clear use cases. Studio Prompt moves are now grouped by musical culture and listening character across 15 families, from Electronic, Hip-Hop, and Soul & R&B to Jazz, Pop, Rock, and world music."}
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
            <input aria-label={isZh ? "搜尋 Prompt 招式" : "Search prompt moves"} value={promptSearch} onChange={(event) => { setPromptSearch(event.target.value); setShowAllPrompt(false); }} placeholder={isZh ? "搜尋：Jazz、1980s、印度、交響、側鏈…" : "Search: jazz, 1980s, Indian, symphonic, sidechain…"} className="min-w-0 flex-1 bg-transparent py-3 text-base font-bold text-white outline-none placeholder:text-zinc-400" />
            {promptSearch && (
              <button type="button" onClick={() => { setPromptSearch(""); setShowAllPrompt(false); }} aria-label={isZh ? "清除 Prompt 搜尋" : "Clear prompt search"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] text-zinc-300 transition hover:border-white/30 hover:text-white">
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
                  <button key={category.key} type="button" aria-pressed={selected} onClick={() => { setPromptCategory(category.key); setPromptStudioFamily("all"); setShowAllPrompt(false); }} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-black transition ${selected ? "border-cyan-200 bg-cyan-300/[0.18] text-white shadow-[0_0_18px_rgba(34,211,238,0.13)]" : "border-white/20 bg-black/55 text-zinc-300 hover:border-cyan-200/45 hover:bg-cyan-300/[0.07] hover:text-white"}`}>
                    {selected && <Check className="h-4 w-4 text-cyan-200" />}
                    {sunoLibraryText(category.label, locale)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {promptCategory === "mastering" && (
            <fieldset className="mt-4 border-t border-cyan-200/10 pt-4">
              <legend className="text-xs font-black tracking-[0.12em] text-zinc-300">{isZh ? "錄音室類型" : "MUSIC FAMILY"}</legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SUNO_STUDIO_MASTERING_FAMILY_OPTIONS.map((family) => {
                  const selected = promptStudioFamily === family.key;
                  return (
                    <button key={family.key} type="button" aria-pressed={selected} onClick={() => { setPromptStudioFamily(family.key); setShowAllPrompt(false); }} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-black transition ${selected ? "border-orange-200 bg-orange-400/[0.18] text-white shadow-[0_0_18px_rgba(251,146,60,0.13)]" : "border-white/20 bg-black/55 text-zinc-300 hover:border-orange-200/45 hover:bg-orange-400/[0.07] hover:text-white"}`}>
                      {selected && <Check className="h-4 w-4 text-orange-200" />}
                      {sunoLibraryText(family.label, locale)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        </div>

        <div id="prompt-move-results" className="mt-5 grid gap-3 lg:grid-cols-2">
          {visiblePrompt.map((item) => (
            <TechniqueCard
              key={item.key}
              item={item}
              locale={locale}
              copied={copiedKey === item.key}
              onCopy={() => copyValue(item.key, sunoLibraryText(item.copy, locale))}
              hasAudioPreview={Boolean(getSunoStudioMasteringAudioPreview(item.key))}
              onPlayAudioPreview={() => playMasteringPreview(item.key)}
            />
          ))}
        </div>
        {promptResults.length === 0 && <p className="mt-6 rounded-xl border border-white/10 p-5 text-sm font-bold text-zinc-500">{isZh ? "找不到這個 Prompt 招式，換個關鍵字試試。" : "No matching prompt move. Try another search."}</p>}
        {promptResults.length > PROMPT_PREVIEW_COUNT && (
          <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-cyan-200/16 bg-cyan-300/[0.035] px-4 py-4 text-center">
            <p className="text-xs font-black text-cyan-100/75">
              {showAllPrompt
                ? (isZh ? `已展開全部 ${promptResults.length} 招` : `All ${promptResults.length} moves are open`)
                : (isZh ? `目前顯示前 ${PROMPT_PREVIEW_COUNT} 招，還有 ${promptResults.length - PROMPT_PREVIEW_COUNT} 招` : `Showing the first ${PROMPT_PREVIEW_COUNT}; ${promptResults.length - PROMPT_PREVIEW_COUNT} more moves remain`)}
            </p>
            <button type="button" onClick={() => setShowAllPrompt((value) => !value)} aria-expanded={showAllPrompt} aria-controls="prompt-move-results" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-cyan-200/45 bg-cyan-300/[0.1] px-6 text-sm font-black text-white transition hover:border-cyan-100 hover:bg-cyan-300/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100">
              {showAllPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showAllPrompt
                ? (isZh ? `收起，只看前 ${PROMPT_PREVIEW_COUNT} 招` : `Collapse to the first ${PROMPT_PREVIEW_COUNT}`)
                : (isZh ? `展開全部 ${promptResults.length} 招` : `Show all ${promptResults.length} moves`)}
            </button>
          </div>
        )}

        <div className="mt-10 rounded-[1.25rem] border border-cyan-200/16 bg-cyan-300/[0.035] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.25em] text-cyan-200/70`}>GENRE CRATE</p>
              <h3 className="mt-2 text-2xl font-black text-white sm:text-3xl">{isZh ? "曲風唱片箱" : "Genre crate"}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-zinc-500">{isZh ? "依使用者提供的曲風截圖重新校字與分組；曲風名稱是起點，不是完整 Prompt。" : "Cleaned and regrouped from the supplied genre screenshot. A genre name is a starting point, not a complete prompt."}</p>
            </div>
            <button type="button" onClick={() => setGenreCrateOpen((value) => !value)} aria-expanded={genreCrateOpen} aria-controls="genre-crate-content" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-cyan-200/35 bg-cyan-300/[0.08] px-5 text-sm font-black text-cyan-50 transition hover:border-cyan-100/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100">
              {genreCrateOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {genreCrateOpen ? (isZh ? "收起曲風唱片箱" : "Collapse genre crate") : (isZh ? `展開 ${genreResults.length} 組曲風` : `Open ${genreResults.length} genre groups`)}
            </button>
          </div>
          {genreCrateOpen && <div id="genre-crate-content">
          <label className="mt-5 flex min-h-11 w-full max-w-sm items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 focus-within:border-cyan-200/40">
            <Search className="h-4 w-4 text-zinc-600" />
            <input value={genreSearch} onChange={(event) => { setGenreSearch(event.target.value); setShowAllGenres(false); }} placeholder={isZh ? "搜尋曲風" : "Search genres"} className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-zinc-700" />
          </label>
          <div id="genre-crate-results" className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleGenres.map((group) => (
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
          {genreResults.length > GENRE_PREVIEW_COUNT && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-white/8 pt-5">
              <span className="text-xs font-black text-zinc-500">
                {showAllGenres
                  ? (isZh ? `全部 ${genreResults.length} 組曲風已展開` : `All ${genreResults.length} genre groups are open`)
                  : (isZh ? `還有 ${genreResults.length - GENRE_PREVIEW_COUNT} 組曲風分類` : `${genreResults.length - GENRE_PREVIEW_COUNT} more genre groups`)}
              </span>
              <button type="button" onClick={() => setShowAllGenres((value) => !value)} aria-expanded={showAllGenres} aria-controls="genre-crate-results" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200/28 bg-black/38 px-5 text-xs font-black text-cyan-50 transition hover:border-cyan-100/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100">
                {showAllGenres ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAllGenres ? (isZh ? "收起曲風分類" : "Collapse genres") : (isZh ? `展開全部 ${genreResults.length} 組` : `Show all ${genreResults.length} groups`)}
              </button>
            </div>
          )}
          </div>}
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
            <button type="button" onClick={() => setLyricLibraryOpen((value) => !value)} aria-expanded={lyricLibraryOpen} aria-controls="lyric-library-content" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-orange-300/38 bg-orange-400/[0.08] px-5 text-sm font-black text-orange-50 transition hover:border-orange-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200">
              <BookOpenText className="h-4 w-4" />
              {lyricLibraryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {lyricLibraryOpen ? (isZh ? "收起歌詞招式" : "Collapse lyric moves") : (isZh ? `展開 ${lyricResults.length} 招歌詞控制` : `Open ${lyricResults.length} lyric moves`)}
            </button>
          </div>

          {lyricLibraryOpen && <div id="lyric-library-content">
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
              <input aria-label={isZh ? "搜尋歌詞招式" : "Search lyric moves"} value={lyricSearch} onChange={(event) => { setLyricSearch(event.target.value); setShowAllLyric(false); }} placeholder={isZh ? "輸入關鍵字，例如：副歌、二重唱、哭腔…" : "Type a keyword, e.g. chorus, duet, crying…"} className="min-w-0 flex-1 bg-transparent py-3 text-base font-bold text-white outline-none placeholder:text-zinc-400" />
              {lyricSearch && (
                <button type="button" onClick={() => { setLyricSearch(""); setShowAllLyric(false); }} aria-label={isZh ? "清除歌詞搜尋" : "Clear lyric search"} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] text-zinc-300 transition hover:border-white/30 hover:text-white">
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
                    <button key={category.key} type="button" aria-pressed={selected} onClick={() => { setLyricCategory(category.key); setShowAllLyric(false); }} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-black transition ${selected ? "border-orange-300 bg-orange-400/[0.18] text-white shadow-[0_0_18px_rgba(251,146,60,0.13)]" : "border-white/20 bg-black/55 text-zinc-300 hover:border-orange-300/45 hover:bg-orange-400/[0.07] hover:text-white"}`}>
                      {selected && <Check className="h-4 w-4 text-orange-200" />}
                      {sunoLibraryText(category.label, locale)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div id="lyric-move-results" className="mt-5 grid gap-3 lg:grid-cols-2">
            {visibleLyrics.map((item) => (
              <TechniqueCard key={item.key} item={item} locale={locale} copied={copiedKey === item.key} onCopy={() => copyValue(item.key, sunoLibraryText(item.copy, locale))} />
            ))}
          </div>
          {lyricResults.length === 0 && <p className="mt-6 rounded-xl border border-white/10 p-5 text-sm font-bold text-zinc-500">{isZh ? "找不到這個歌詞招式，換個關鍵字試試。" : "No matching lyric move. Try another search."}</p>}
          {lyricResults.length > LYRIC_PREVIEW_COUNT && (
            <div className="mt-5 flex flex-col items-center gap-2 rounded-xl border border-orange-300/16 bg-orange-400/[0.035] px-4 py-4 text-center">
              <p className="text-xs font-black text-orange-100/75">
                {showAllLyric
                  ? (isZh ? `已展開全部 ${lyricResults.length} 招` : `All ${lyricResults.length} moves are open`)
                  : (isZh ? `目前顯示前 ${LYRIC_PREVIEW_COUNT} 招，還有 ${lyricResults.length - LYRIC_PREVIEW_COUNT} 招` : `Showing the first ${LYRIC_PREVIEW_COUNT}; ${lyricResults.length - LYRIC_PREVIEW_COUNT} more moves remain`)}
              </p>
              <button type="button" onClick={() => setShowAllLyric((value) => !value)} aria-expanded={showAllLyric} aria-controls="lyric-move-results" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-orange-300/45 bg-orange-400/[0.1] px-6 text-sm font-black text-white transition hover:border-orange-200 hover:bg-orange-400/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200">
                {showAllLyric ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAllLyric
                  ? (isZh ? `收起，只看前 ${LYRIC_PREVIEW_COUNT} 招` : `Collapse to the first ${LYRIC_PREVIEW_COUNT}`)
                  : (isZh ? `展開全部 ${lyricResults.length} 招` : `Show all ${lyricResults.length} moves`)}
              </button>
            </div>
          )}
          </div>}
        </div>

        <div className="mt-12 rounded-[1.25rem] border border-orange-300/16 bg-orange-400/[0.035] p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.25em] text-orange-300/75`}>FROM MATERIAL TO WORK</p>
              <h3 className="mt-3 text-2xl font-black text-white sm:text-3xl">{isZh ? "AI 音樂製作流程" : "AI music production flow"}</h3>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-zinc-500">{isZh ? "從生成、A&R 聽感驗證、Drop／Q Crash，到 Showtime／Choice 發表與保存，共 6 個步驟。" : "Six steps from rendering and A&R validation through Drop/Q Crash, Showtime/Choice release, and archiving."}</p>
            </div>
            <button type="button" onClick={() => setProductionFlowOpen((value) => !value)} aria-expanded={productionFlowOpen} aria-controls="production-flow-content" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-300/28 bg-black/35 px-5 text-xs font-black text-orange-50 transition hover:border-orange-200/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200">
              {productionFlowOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {productionFlowOpen ? (isZh ? "收起 6 步流程" : "Collapse 6-step flow") : (isZh ? "展開 6 步流程" : "Open 6-step flow")}
            </button>
          </div>
          {productionFlowOpen && <div id="production-flow-content" className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {productionFlow.map((step) => (
              <article key={step.title.en} className="rounded-xl border border-white/9 bg-black/38 p-4">
                <h4 className="text-sm font-black text-orange-100">{sunoLibraryText(step.title, locale)}</h4>
                <p className="mt-2 text-xs font-bold leading-6 text-zinc-400">{sunoLibraryText(step.body, locale)}</p>
              </article>
            ))}
          </div>}
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
      <ShowtimeQueuePlayer ref={previewPlayerRef} isZh={isZh} />
    </section>
  );
}
