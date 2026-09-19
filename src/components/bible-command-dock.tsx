"use client";

import {
  AudioWaveform,
  BookOpenText,
  CheckSquare,
  Command,
  FileKey2,
  FlaskConical,
  LibraryBig,
  ListTree,
  Search,
  SlidersHorizontal,
  WandSparkles,
  X,
} from "lucide-react";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { fontRighteous } from "@/lib/fonts";

type DockItem = {
  id: string;
  eyebrow: string;
  zh: string;
  en: string;
  keywords: string;
  icon: typeof Search;
  accent: "orange" | "cyan" | "amber";
};

const BIBLE_DOCK_ITEMS: readonly DockItem[] = [
  { id: "practice-map", eyebrow: "MAP", zh: "練功地圖", en: "Practice map", keywords: "入口 route tools 工具", icon: ListTree, accent: "orange" },
  { id: "suno-control-desk", eyebrow: "START", zh: "Suno 起手式", en: "Suno quick start", keywords: "style lyrics title 起手 template 模板", icon: SlidersHorizontal, accent: "cyan" },
  { id: "suno-preflight", eyebrow: "CHECK", zh: "生成前檢查", en: "Pre-flight check", keywords: "checklist prompt 生成 檢查", icon: CheckSquare, accent: "orange" },
  { id: "suno-troubleshooting", eyebrow: "FIX", zh: "疑難排解", en: "Troubleshooting", keywords: "咬字 聲線 副歌 失真 vocal lyric hook distortion", icon: WandSparkles, accent: "cyan" },
  { id: "suno-prompt-library", eyebrow: "PROMPT", zh: "Prompt 招式庫", en: "Prompt moves", keywords: "prompt mastering 曲風 錄音室", icon: WandSparkles, accent: "orange" },
  { id: "suno-inspiration-index", eyebrow: "1,519", zh: "聲音 DNA × Prompt 索引", en: "Sonic DNA × Prompt index", keywords: "artist recipe 藝術家 配方 772 747", icon: LibraryBig, accent: "cyan" },
  { id: "lyric-control-library", eyebrow: "LYRICS", zh: "歌詞控制", en: "Lyric control", keywords: "歌詞 唱法 段落 duet chorus", icon: BookOpenText, accent: "orange" },
  { id: "stem-separation-guide", eyebrow: "STEMS", zh: "AI 拆軌指南", en: "Stem separation", keywords: "人聲 伴奏 stem vocal separation", icon: AudioWaveform, accent: "cyan" },
  { id: "taiwanese-lab", eyebrow: "LAB", zh: "台語調音實驗室", en: "Taiwanese lyrics lab", keywords: "台語 發音 taiwanese pronunciation", icon: FlaskConical, accent: "orange" },
  { id: "suno-version-watch", eyebrow: "WATCH", zh: "版本與功能追蹤", en: "Version & feature watch", keywords: "v5.5 sliders song editor 版本 官方", icon: Command, accent: "cyan" },
  { id: "rights-release", eyebrow: "RIGHTS", zh: "權利與發行", en: "Rights & release", keywords: "商用 著作權 copyright commercial release", icon: FileKey2, accent: "amber" },
];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLocaleLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable || target.getAttribute("role") === "textbox";
}

export default function BibleCommandDock({ locale }: { locale: "zh" | "en" }) {
  const isZh = locale === "zh";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return BIBLE_DOCK_ITEMS;
    return BIBLE_DOCK_ITEMS.filter((item) => [item.zh, item.en, item.eyebrow, item.keywords].join(" ").toLocaleLowerCase().includes(normalized));
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    window.setTimeout(() => searchButtonRef.current?.focus(), 0);
  };

  const goTo = (item: DockItem) => {
    const target = document.getElementById(item.id);
    if (!target) return;
    close();
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${item.id}`);
    window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
  };

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === "Escape" && open) close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      goTo(results[activeIndex]);
    }
  };

  const visibleDockItems = BIBLE_DOCK_ITEMS.filter((item) => ["suno-control-desk", "suno-prompt-library", "suno-inspiration-index", "lyric-control-library", "stem-separation-guide", "rights-release"].includes(item.id));

  return (
    <>
      <nav aria-label={isZh ? "練功聖經章節導航" : "Practice Bible section navigation"} className="sticky top-[4.6rem] z-40 mt-4 rounded-[1.15rem] border border-white/12 bg-[#080807]/88 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button ref={searchButtonRef} type="button" onClick={() => setOpen(true)} className="group flex min-h-12 shrink-0 items-center gap-3 rounded-xl border border-orange-300/35 bg-orange-400/[0.1] px-4 text-left transition hover:border-orange-200/70 hover:bg-orange-400/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-300/12 text-orange-100"><Search className="h-4 w-4" /></span>
            <span>
              <span className="block text-xs font-black text-white">{isZh ? "搜尋整本聖經" : "Search the Bible"}</span>
              <span className="hidden text-[10px] font-bold text-zinc-500 sm:block">⌘K / Ctrl K /</span>
            </span>
          </button>
          <div className="hidden h-8 w-px shrink-0 bg-white/10 sm:block" />
          {visibleDockItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => goTo(item)} className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 text-xs font-black text-zinc-400 transition hover:border-white/10 hover:bg-white/[0.045] hover:text-white">
                <Icon className={`h-4 w-4 ${item.accent === "cyan" ? "text-cyan-200/70" : item.accent === "amber" ? "text-amber-200/70" : "text-orange-300/70"}`} />
                {isZh ? item.zh : item.en}
              </button>
            );
          })}
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/78 px-3 pb-5 pt-[12vh] backdrop-blur-md" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="bible-command-title" className="max-h-[74vh] w-full max-w-2xl overflow-hidden rounded-[1.45rem] border border-orange-300/25 bg-[#0b0b0a] shadow-[0_35px_120px_rgba(0,0,0,0.8),0_0_55px_rgba(251,146,60,0.08)]">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_8%_0%,rgba(255,106,0,0.16),transparent_42%),radial-gradient(circle_at_90%_0%,rgba(34,211,238,0.11),transparent_38%)] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.3em] text-orange-300/75`}>BIBLE COMMAND SEARCH</p>
                  <h2 id="bible-command-title" className="mt-1 text-xl font-black text-white">{isZh ? "你現在卡在哪一關？" : "Where are you stuck?"}</h2>
                </div>
                <button type="button" onClick={close} aria-label={isZh ? "關閉搜尋" : "Close search"} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <label className="mt-4 flex min-h-14 items-center gap-3 rounded-xl border-2 border-orange-300/28 bg-black/72 px-3 transition focus-within:border-orange-200/70">
                <Search className="h-5 w-5 text-orange-200" />
                <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKey} placeholder={isZh ? "搜尋：起手、咬字、拆軌、商用…" : "Search: starter, vocals, stems, rights…"} className="min-w-0 flex-1 bg-transparent py-3 text-base font-bold text-white outline-none placeholder:text-zinc-600" />
                <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black text-zinc-500 sm:inline">ESC</kbd>
              </label>
            </div>
            <div className="max-h-[48vh] overflow-y-auto p-2 sm:p-3" role="listbox" aria-label={isZh ? "聖經搜尋結果" : "Bible search results"}>
              {results.map((item, index) => {
                const Icon = item.icon;
                const active = index === activeIndex;
                return (
                  <button key={item.id} type="button" role="option" aria-selected={active} onMouseEnter={() => setActiveIndex(index)} onClick={() => goTo(item)} className={`flex min-h-16 w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${active ? "border-orange-300/32 bg-orange-400/[0.08]" : "border-transparent hover:bg-white/[0.035]"}`}>
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.accent === "cyan" ? "border-cyan-200/18 bg-cyan-300/[0.055] text-cyan-200" : item.accent === "amber" ? "border-amber-200/18 bg-amber-300/[0.055] text-amber-200" : "border-orange-300/18 bg-orange-400/[0.055] text-orange-200"}`}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">{item.eyebrow}</span>
                      <span className="mt-1 block truncate text-sm font-black text-white">{isZh ? item.zh : item.en}</span>
                    </span>
                    <span className="text-[10px] font-black text-zinc-700">↵</span>
                  </button>
                );
              })}
              {results.length === 0 && <p className="px-5 py-12 text-center text-sm font-bold text-zinc-500">{isZh ? "找不到這個主題，先從練功地圖選一區。" : "No matching topic. Start from the practice map."}</p>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
