"use client";

import {
  Check,
  ChevronDown,
  Copy,
  LibraryBig,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BibleEntryCommentsDialog from "@/components/bible-entry-comments-dialog";
import {
  SUNO_ARTIST_DNA_ENTRIES,
  SUNO_PROMPT_RECIPES,
  SUNO_RECIPE_GENRES,
  type SunoInspirationKind,
} from "@/lib/suno-inspiration-index";

type SunoInspirationIndexSectionProps = {
  isZh: boolean;
};

type CommentTarget = {
  kind: SunoInspirationKind;
  key: string;
  title: string;
};

const PAGE_SIZE = 18;

const ARTIST_GENRE_FILTERS = [
  { key: "all", zh: "全部風格", en: "All styles" },
  { key: "流行", zh: "流行", en: "Pop" },
  { key: "搖滾", zh: "搖滾", en: "Rock" },
  { key: "嘻哈／饒舌", zh: "嘻哈／饒舌", en: "Hip-hop / Rap" },
  { key: "節奏藍調", zh: "節奏藍調", en: "R&B" },
  { key: "電子音樂", zh: "電子", en: "Electronic" },
  { key: "鄉村／美式根源", zh: "鄉村／根源", en: "Country / Roots" },
  { key: "爵士", zh: "爵士", en: "Jazz" },
  { key: "靈魂／放克", zh: "靈魂／放克", en: "Soul / Funk" },
] as const;

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function highlightClass(active: boolean, tone: "orange" | "cyan") {
  if (!active) {
    return "border-white/14 bg-black/20 text-zinc-400 hover:border-white/30 hover:text-white";
  }
  return tone === "orange"
    ? "border-orange-300/65 bg-orange-400/15 text-orange-100 shadow-[0_0_24px_rgba(251,146,60,0.12)]"
    : "border-cyan-200/65 bg-cyan-200/12 text-cyan-50 shadow-[0_0_24px_rgba(103,232,249,0.1)]";
}

export default function SunoInspirationIndexSection({ isZh }: SunoInspirationIndexSectionProps) {
  const [activeKind, setActiveKind] = useState<SunoInspirationKind>("artist_dna");
  const [query, setQuery] = useState("");
  const [artistGenre, setArtistGenre] = useState("all");
  const [recipeGenre, setRecipeGenre] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [copiedKey, setCopiedKey] = useState("");
  const [commentTarget, setCommentTarget] = useState<CommentTarget | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeKind, artistGenre, query, recipeGenre]);

  const artistResults = useMemo(() => {
    const needle = normalize(query);
    return SUNO_ARTIST_DNA_ENTRIES.filter((entry) => {
      if (artistGenre !== "all" && !entry.summaryZh.includes(artistGenre)) return false;
      return !needle || entry.searchText.includes(needle);
    });
  }, [artistGenre, query]);

  const recipeResults = useMemo(() => {
    const needle = normalize(query);
    return SUNO_PROMPT_RECIPES.filter((entry) => {
      if (recipeGenre !== "all" && entry.genre !== recipeGenre) return false;
      return !needle || entry.searchText.includes(needle);
    });
  }, [query, recipeGenre]);

  const resultCount = activeKind === "artist_dna" ? artistResults.length : recipeResults.length;
  const visibleArtists = artistResults.slice(0, visibleCount);
  const visibleRecipes = recipeResults.slice(0, visibleCount);
  const activeFilterCount = activeKind === "artist_dna"
    ? Number(artistGenre !== "all") + Number(Boolean(query.trim()))
    : Number(recipeGenre !== "all") + Number(Boolean(query.trim()));

  async function copyPrompt(key: string, prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? "" : current)), 1800);
    } catch {
      setCopiedKey("");
    }
  }

  function switchKind(kind: SunoInspirationKind) {
    setActiveKind(kind);
    setQuery("");
  }

  function clearFilters() {
    setQuery("");
    setArtistGenre("all");
    setRecipeGenre("all");
  }

  return (
    <section className="mt-14 border-t border-white/10 pt-12">
      <div className="overflow-hidden rounded-[1.5rem] border border-white/12 bg-[linear-gradient(145deg,rgba(249,115,22,0.11),rgba(0,0,0,0.84)_42%,rgba(34,211,238,0.07))] shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
        <header className="border-b border-white/10 px-4 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-orange-200">
                <LibraryBig className="h-4 w-4" />
                {isZh ? "Suno 靈感導航器" : "Suno inspiration navigator"}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl">
                {isZh ? "聲音 DNA × Prompt 配方索引" : "Sonic DNA × Prompt Recipe Index"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-zinc-400 sm:text-base">
                {isZh
                  ? "不是把兩本 PDF 原樣堆上來。這裡把 771 組藝術家風格拆成可搜尋的聲音特徵，再把 750 組 Prompt 去除 3 筆重複，留下 747 組可直接練習的配方。"
                  : "A working index, not a PDF dump: 771 artist references become searchable sonic traits, while 750 source prompts become 747 unique practice recipes after exact deduplication."}
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2">
              <div className="rounded-xl border border-cyan-200/18 bg-black/45 px-4 py-3">
                <p className="text-2xl font-black tabular-nums text-cyan-100">771</p>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{isZh ? "聲音 DNA" : "Sonic DNA"}</p>
              </div>
              <div className="rounded-xl border border-orange-300/18 bg-black/45 px-4 py-3">
                <p className="text-2xl font-black tabular-nums text-orange-200">747</p>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{isZh ? "獨特配方" : "Unique recipes"}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-xl border border-cyan-100/16 bg-cyan-100/[0.045] p-4 md:grid-cols-[auto_1fr] md:items-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-100/25 bg-cyan-100/10 text-cyan-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-black text-cyan-50">{isZh ? "先看名字找方向，複製時只帶走聲音特徵" : "Search by name; copy only the sonic traits"}</p>
              <p className="mt-1 text-xs font-bold leading-6 text-zinc-400">
                {isZh
                  ? "藝術家名稱只用於站內索引，不會放進複製內容。請把結果當靈感起點，不要要求直接模仿；生成結果也會因模型版本而不同。"
                  : "Artist names are lookup references only and never enter the copied prompt. Use the result as a starting point, not a direct imitation request; output varies by model version."}
              </p>
            </div>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-7 sm:py-7">
          <div role="tablist" aria-label={isZh ? "選擇索引資料庫" : "Choose index database"} className="grid gap-2 sm:grid-cols-2">
            <button
              id="artist-dna-tab"
              type="button"
              role="tab"
              aria-selected={activeKind === "artist_dna"}
              aria-controls="suno-index-results"
              onClick={() => switchKind("artist_dna")}
              className={"min-h-16 rounded-xl border px-4 text-left transition " + highlightClass(activeKind === "artist_dna", "cyan")}
            >
              <span className="flex items-center gap-2 text-sm font-black">
                <Sparkles className="h-4 w-4" />
                {isZh ? "找藝術家聲音 DNA" : "Find Artist Sonic DNA"}
              </span>
              <span className="mt-1 block text-xs font-bold opacity-70">{isZh ? "771 組參考風格" : "771 reference styles"}</span>
            </button>
            <button
              id="prompt-recipe-tab"
              type="button"
              role="tab"
              aria-selected={activeKind === "prompt_recipe"}
              aria-controls="suno-index-results"
              onClick={() => switchKind("prompt_recipe")}
              className={"min-h-16 rounded-xl border px-4 text-left transition " + highlightClass(activeKind === "prompt_recipe", "orange")}
            >
              <span className="flex items-center gap-2 text-sm font-black">
                <WandSparkles className="h-4 w-4" />
                {isZh ? "找可直接練的 Prompt" : "Find a Practice Prompt"}
              </span>
              <span className="mt-1 block text-xs font-bold opacity-70">{isZh ? "747 組去重配方" : "747 deduplicated recipes"}</span>
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-white/12 bg-black/50 p-3 sm:p-4">
            <label className="flex min-h-14 items-center gap-3 rounded-lg border border-white/16 bg-black px-4 transition focus-within:border-cyan-100/60">
              <Search className="h-5 w-5 shrink-0 text-zinc-500" />
              <span className="sr-only">{isZh ? "搜尋索引" : "Search index"}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeKind === "artist_dna"
                  ? (isZh ? "搜尋：Adele、搖滾、沙啞人聲、鋼琴…" : "Search: Adele, rock, raspy vocal, piano…")
                  : (isZh ? "搜尋：夢幻流行、柔和人聲、鋼琴、告白…" : "Search: dream-pop, soft vocal, piano, confession…")}
                className="min-w-0 flex-1 bg-transparent text-base font-bold text-white outline-none placeholder:text-zinc-600"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 text-zinc-400 transition hover:text-white"
                  aria-label={isZh ? "清除搜尋" : "Clear search"}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            <div className="mt-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                {activeKind === "artist_dna"
                  ? (isZh ? "再用主要風格縮小範圍" : "Then narrow by primary style")
                  : (isZh ? "再選一種曲風" : "Then choose a genre")}
              </p>
              <div className="flex flex-wrap gap-2">
                {activeKind === "artist_dna"
                  ? ARTIST_GENRE_FILTERS.map((filter) => {
                      const selected = artistGenre === filter.key;
                      return (
                        <button
                          key={filter.key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setArtistGenre(filter.key)}
                          className={"min-h-11 rounded-full border px-4 text-xs font-black transition " + highlightClass(selected, "cyan")}
                        >
                          {isZh ? filter.zh : filter.en}
                        </button>
                      );
                    })
                  : [{ key: "all", zh: "全部曲風", en: "All genres" }, ...SUNO_RECIPE_GENRES].map((filter) => {
                      const selected = recipeGenre === filter.key;
                      return (
                        <button
                          key={filter.key}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setRecipeGenre(filter.key)}
                          className={"min-h-11 rounded-full border px-4 text-xs font-black transition " + highlightClass(selected, "orange")}
                        >
                          {isZh ? filter.zh : filter.en}
                        </button>
                      );
                    })}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
              <p className="text-sm font-black text-white" aria-live="polite">
                {isZh ? "找到 " : "Found "}
                <span className={activeKind === "artist_dna" ? "text-cyan-100" : "text-orange-200"}>{resultCount}</span>
                {isZh ? " 筆" : " results"}
                {activeFilterCount ? <span className="ml-2 text-xs text-zinc-500">· {activeFilterCount} {isZh ? "個條件" : "filters"}</span> : null}
              </p>
              {activeFilterCount ? (
                <button type="button" onClick={clearFilters} className="min-h-10 rounded-full border border-white/14 px-4 text-xs font-black text-zinc-300 transition hover:border-white/35 hover:text-white">
                  {isZh ? "清除全部條件" : "Clear all filters"}
                </button>
              ) : null}
            </div>
          </div>

          <div
            id="suno-index-results"
            role="tabpanel"
            aria-labelledby={activeKind === "artist_dna" ? "artist-dna-tab" : "prompt-recipe-tab"}
            className="mt-5"
          >
            {resultCount === 0 ? (
              <div className="rounded-xl border border-dashed border-white/16 py-14 text-center">
                <Search className="mx-auto h-6 w-6 text-zinc-600" />
                <p className="mt-3 text-sm font-black text-zinc-400">{isZh ? "沒有符合的資料，換一個詞試試。" : "No match. Try another term."}</p>
                <button type="button" onClick={clearFilters} className="mt-4 min-h-11 rounded-full border border-white/20 px-5 text-xs font-black text-white">{isZh ? "清除條件" : "Clear filters"}</button>
              </div>
            ) : null}

            {activeKind === "artist_dna" && visibleArtists.length ? (
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {visibleArtists.map((entry) => (
                  <article key={entry.key} className="flex min-w-0 flex-col rounded-xl border border-cyan-100/13 bg-black/54 p-4 transition hover:border-cyan-100/28">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/55">{isZh ? "站內參考名稱" : "Lookup reference"} · p.{entry.sourcePage}</p>
                        <h3 className="mt-1 break-words text-xl font-black text-white">{entry.artist}</h3>
                      </div>
                      <span className="shrink-0 rounded-full border border-cyan-100/16 bg-cyan-100/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100/75">DNA</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(isZh ? entry.summaryZh : entry.tags).map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-zinc-300">{tag}</span>
                      ))}
                    </div>
                    <p className="mt-4 line-clamp-3 break-words text-xs font-bold leading-6 text-zinc-500">{entry.prompt}</p>
                    <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-5">
                      <button
                        type="button"
                        onClick={() => void copyPrompt(entry.key, entry.prompt)}
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 text-xs font-black text-black transition hover:bg-cyan-100"
                        aria-label={isZh ? "複製不含藝術家名稱的聲音 DNA" : "Copy sonic DNA without artist name"}
                      >
                        {copiedKey === entry.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="truncate">{copiedKey === entry.key ? (isZh ? "已複製" : "Copied") : (isZh ? "複製聲音 DNA" : "Copy Sonic DNA")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentTarget({ kind: "artist_dna", key: entry.key, title: entry.artist })}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-xs font-black text-zinc-200 transition hover:border-white/35 hover:text-white"
                        aria-label={(isZh ? "查看評論：" : "View comments: ") + entry.artist}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">{isZh ? "評論" : "Comments"}</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {activeKind === "prompt_recipe" && visibleRecipes.length ? (
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {visibleRecipes.map((entry) => (
                  <article key={entry.key} className="flex min-w-0 flex-col rounded-xl border border-orange-300/14 bg-black/54 p-4 transition hover:border-orange-300/32">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-200/55">{isZh ? "來源配方" : "Source recipe"} #{entry.sourceIndex}</p>
                        <h3 className="mt-1 text-xl font-black text-white">{isZh ? entry.genreZh : entry.genre}</h3>
                      </div>
                      <span className="rounded-full border border-orange-300/22 bg-orange-400/[0.08] px-2.5 py-1 text-[10px] font-black text-orange-100">{isZh ? entry.genre : entry.genreZh}</span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      {[
                        [isZh ? "人聲" : "Vocal", isZh ? entry.vocalZh : entry.vocal],
                        [isZh ? "情緒" : "Mood", isZh ? entry.moodZh : entry.mood],
                        [isZh ? "樂器" : "Instrument", isZh ? entry.instrumentZh : entry.instrument],
                        [isZh ? "故事" : "Story", isZh ? entry.storyZh : entry.story],
                        [isZh ? "質感" : "Texture", isZh ? entry.textureZh : entry.texture],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-lg border border-white/8 bg-white/[0.025] p-2.5 last:col-span-2">
                          <dt className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">{label}</dt>
                          <dd className="mt-1 break-words font-bold leading-5 text-zinc-300">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-4 line-clamp-3 break-words text-xs font-bold leading-6 text-zinc-500">{entry.prompt}</p>
                    <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-2 pt-5">
                      <button
                        type="button"
                        onClick={() => void copyPrompt(entry.key, entry.prompt)}
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-xs font-black text-black transition hover:bg-orange-400"
                      >
                        {copiedKey === entry.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span className="truncate">{copiedKey === entry.key ? (isZh ? "已複製" : "Copied") : (isZh ? "複製英文 Prompt" : "Copy Prompt")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommentTarget({
                          kind: "prompt_recipe",
                          key: entry.key,
                          title: (isZh ? entry.genreZh : entry.genre) + " #" + entry.sourceIndex,
                        })}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-xs font-black text-zinc-200 transition hover:border-white/35 hover:text-white"
                        aria-label={isZh ? "查看這組配方的評論" : "View comments for this recipe"}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">{isZh ? "評論" : "Comments"}</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {visibleCount < resultCount ? (
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                className="mx-auto mt-6 flex min-h-12 items-center gap-2 rounded-full border border-white/18 bg-white/[0.04] px-6 text-sm font-black text-white transition hover:border-white/38 hover:bg-white/[0.07]"
              >
                <ChevronDown className="h-4 w-4" />
                {isZh ? "再載入 18 筆" : "Load 18 more"}
                <span className="text-xs text-zinc-500">({Math.min(visibleCount, resultCount)}/{resultCount})</span>
              </button>
            ) : null}
          </div>

          <footer className="mt-7 grid gap-3 border-t border-white/8 pt-5 text-xs font-bold leading-6 text-zinc-500 md:grid-cols-2">
            <p>{isZh ? "資料來源：使用者提供的《Suno AI — Full Artist Encyclopedia》；已重組為聲音特徵索引，非 Suno 官方推薦。" : "Source: the user-supplied Suno AI — Full Artist Encyclopedia, restructured as a sonic-trait index and not endorsed by Suno."}</p>
            <p>{isZh ? "資料來源：使用者提供的《750 Music Prompts》；3 組完全重複配方已移除。配方是練習起點，請自行試聽與改寫。" : "Source: the user-supplied 750 Music Prompts. Three exact duplicates were removed. Treat every recipe as a testable starting point."}</p>
          </footer>
        </div>
      </div>

      {commentTarget ? (
        <BibleEntryCommentsDialog
          open
          entryKind={commentTarget.kind}
          entryKey={commentTarget.key}
          title={commentTarget.title}
          isZh={isZh}
          onClose={() => setCommentTarget(null)}
        />
      ) : null}
    </section>
  );
}
