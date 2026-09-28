"use client";

import { ArrowUpRight, BookOpenText, Fingerprint, LibraryBig, Route, Wrench } from "lucide-react";

export const BIBLE_HOME_AREAS = [
  { name: "Knowledge", zh: "音樂知識", href: "#bible-knowledge", icon: BookOpenText, body: ["從曲風、段落、人聲與音色建立判斷。", "Build your vocabulary for genre, structure, vocals, and sound."] },
  { name: "Style DNA", zh: "風格拆解", href: "#suno-inspiration-index", icon: Fingerprint, body: ["搜尋聲音參考，拆解成自己的創作方向。", "Find sonic references and shape your own direction."] },
  { name: "Prompts", zh: "提示詞資料庫", href: "#suno-prompt-library", icon: LibraryBig, body: ["搜尋、複製與比較，找到適合這首歌的 Prompt。", "Search, copy, and compare prompts for your next track."] },
  { name: "Workflows", zh: "創作流程", href: "#bible-workflows", icon: Route, body: ["從一句想法到生成、修正與拆軌。", "Move from an idea to generation, revision, and stems."] },
  { name: "Solve My Problem", zh: "解決創作卡關", href: "#suno-troubleshooting", icon: Wrench, body: ["從人聲、歌詞、音質等症狀找到下一步。", "Find your next step from vocal, lyric, and sound problems."] },
] as const;

const linkClass = "inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-200 transition hover:border-orange-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300";
const panelClass = "scroll-mt-36 rounded-2xl border border-white/10 bg-black/50 p-5 sm:p-7";

export default function BibleHome({ locale }: { locale: "zh" | "en" }) {
  const zh = locale === "zh";
  return <section id="bible-home" className="scroll-mt-36 py-10">
    <p className="text-xs font-bold tracking-[0.3em] text-orange-300">MUSIC BIBLE 2.0</p>
    <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">{zh ? "從你想做的事開始" : "Start with what you want to make"}</h2>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">{zh ? "先建立音樂方向，再選工具。從知識、風格與 Prompt 找到靈感，透過創作流程與問題解法完成作品。" : "Shape the music, then choose your tools. Explore knowledge, styles, and prompts, then build your track with practical workflows and solutions."}</p>
    <nav aria-label={zh ? "Music Bible 創作入口" : "Music Bible creative areas"} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {BIBLE_HOME_AREAS.map(({ name, zh: title, href, icon: Icon, body }) => <a key={name} href={href} className="group rounded-2xl border border-white/15 bg-white/[0.025] p-5 transition hover:border-orange-300/70 hover:bg-orange-400/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
        <div className="flex justify-between text-orange-300"><Icon className="h-6 w-6" /><ArrowUpRight className="h-5 w-5" /></div>
        <h3 className="mt-5 text-xl font-black text-white">{name}</h3>
        {zh && <p className="mt-1 text-sm font-bold text-orange-100">{title}</p>}
        <p className="mt-3 text-sm leading-6 text-zinc-400">{body[zh ? 0 : 1]}</p>
      </a>)}
    </nav>
    <div className="mt-7 grid gap-4 lg:grid-cols-2">
      <section id="bible-knowledge" className={panelClass}>
        <h3 className="text-xl font-black">Knowledge · {zh ? "音樂知識" : "Musical foundations"}</h3>
        <p className="mt-3 text-sm leading-7 text-zinc-400">{zh ? "從已有資料學曲風、段落與人聲；工具操作保留在各自章節。" : "Explore genre, structure, and vocals through the existing library. Tool instructions stay in their own chapters."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className={linkClass} href="#bible-genres">{zh ? "曲風詞彙" : "Genre vocabulary"}</a>
          <a className={linkClass} href="#lyric-control-library">{zh ? "歌曲段落與人聲" : "Structure & vocals"}</a>
          <a className={linkClass} href="#stem-separation-guide">{zh ? "拆軌知識" : "Stems"}</a>
          <a className={linkClass} href="#practice-map">{zh ? "全部工具與教學" : "All tools & tutorials"}</a>
        </div>
      </section>
      <section id="bible-workflows" className={panelClass}>
        <h3 className="text-xl font-black">Workflows · {zh ? "一步步完成作品" : "Build a track step by step"}</h3>
        <ol className="mt-4 space-y-3 text-sm leading-7 text-zinc-300">
          <li>1. <a className="underline decoration-orange-300/50 underline-offset-4" href="#suno-inspiration-index">{zh ? "選聲音方向" : "Choose a sonic direction"}</a> → <a className="underline" href="#suno-control-desk">{zh ? "用 Suno 起手式建立第一版" : "Build a first version with the Suno starter"}</a></li>
          <li>2. <a className="underline decoration-orange-300/50 underline-offset-4" href="#suno-troubleshooting">{zh ? "找出卡關原因" : "Identify a problem"}</a> → <a className="underline" href="#lyric-control-library">{zh ? "調整段落與人聲，再比較" : "Adjust structure and vocals, then compare"}</a></li>
          <li>3. <a className="underline decoration-orange-300/50 underline-offset-4" href="#stem-separation-guide">{zh ? "按目標選擇拆軌方法" : "Choose a stem workflow"}</a> → <a className="underline" href="#rights-release">{zh ? "發行前檢查" : "Review before release"}</a></li>
        </ol>
        <a className={`${linkClass} mt-4`} href="#bible-production-flow">{zh ? "查看既有六步製作流程" : "Open the existing six-step production flow"}</a>
      </section>
    </div>
  </section>;
}
