"use client";

import { ArrowRight, ChevronRight, Disc3, ExternalLink, MessageSquare, Mic2, Music2, Piano, SlidersHorizontal, Video } from "lucide-react";
import { useState } from "react";
import type { BibleCatalog } from "@/lib/ai-music-bible-content";
import type { SunoPromptCategory } from "@/lib/suno-practice-library";
import { AIPOGER_TUTORIAL_PLAYLIST_URL } from "@/lib/brand";
import { navigateBible } from "@/lib/bible-navigation";
import styles from "./bible-home.module.css";
import BiblePromptCopy from "@/components/bible-prompt-copy";
import { biblePromptCopyKey } from "@/lib/bible-prompt-copy";

const areas = [
  { tone: "orange", icon: Piano, target: "suno-control-desk", title: ["先做出第一首", "Make your first track"], body: ["Suno 起手式・欄位速查", "Suno basics · Field reference"] },
  { tone: "green", icon: SlidersHorizontal, target: "bible-knowledge", title: ["找到你的風格", "Find your sound"], body: ["音樂知識・聲音 DNA", "Music knowledge · Sonic DNA"] },
  { tone: "purple", icon: Music2, target: "suno-prompt-library", title: ["讓作品更好聽", "Shape a better track"], body: ["Prompt 招式・歌詞調教", "Prompt moves · Lyric control"] },
  { tone: "blue", icon: Disc3, target: "bible-production-flow", title: ["完成與發表", "Finish & release"], body: ["製作流程・拆軌・發行", "Workflow · Stems · Release"] },
] as const;
const categories: { key: SunoPromptCategory; zh: string; en: string }[] = [
  { key: "foundation", zh: "核心公式", en: "Core formula" },
  { key: "dance", zh: "舞曲能量", en: "Dance energy" },
  { key: "production", zh: "音色與混音", en: "Sound & mix" },
  { key: "mastering", zh: "錄音室 Mastering", en: "Studio mastering" },
];
const featuredKeys = ["prompt-focus", "instrument-role-map", "section-density-arc"];

export default function BibleHome({ locale, catalog, loading, error, onRetry, onCommunity }: {
  locale: "zh" | "en"; catalog: BibleCatalog; loading: boolean; error: boolean; onRetry: () => void; onCommunity: () => void;
}) {
  const zh = locale === "zh";
  const n = zh ? 0 : 1;
  const [category, setCategory] = useState<SunoPromptCategory>("foundation");
  const moves = category === "foundation"
    ? featuredKeys.flatMap(key => catalog.promptMoves.filter(item => item.key === key))
    : catalog.promptMoves.filter(item => item.category === category).slice(0, 3);
  const first = catalog.promptMoves.find(item => item.key === "two-field-routing");
  const dna = catalog.promptMoves.find(item => item.key === "prompt-dna");
  return <section id="bible-home" className={styles.home}>
    <nav className={styles.areas} aria-label={zh ? "創作學習路線" : "Creative learning path"}>
      {areas.map(({ tone, icon: Icon, target, title, body }, index) => <button type="button" key={tone} className={`${styles.area} ${styles[tone]}`} onClick={() => navigateBible(target)}>
        <span className={styles.step}>0{index + 1}</span>
        <span className={styles.areaBody}><Icon size={42} strokeWidth={1.65} /><span><strong>{title[n]}</strong><small>{body[n]}</small></span><ChevronRight className={styles.circleArrow} size={30} /></span>
      </button>)}
    </nav>
    <section className={styles.starter} aria-labelledby="bible-starter-heading">
      <div className={styles.sectionHeading}><h2 id="bible-starter-heading">{zh ? "不知道從哪開始？先學這 3 招" : "New here? Start with these 3 moves"}</h2><button type="button" onClick={() => navigateBible("suno-control-desk")}>{zh ? "查看入門路線" : "Quick-start guide"}<ArrowRight size={18} /></button></div>
      <div className={styles.lessons}>
        <article className={`${styles.lesson} ${styles.orange}`}><Piano className={styles.lessonIcon} size={42} strokeWidth={1.65} /><div><span className={styles.lessonLabel}>{zh ? "入門必練" : "START HERE"}</span><h3>{first?.title[locale] ?? (zh ? "Style 管聲音，Lyrics 管演出" : "Style shapes sound, Lyrics shape delivery")}</h3><p>{zh ? "先分清欄位，生成才有得比較。" : "Separate the fields to compare your results."}</p><pre>{zh ? "Style → 曲風、人聲、樂器\nLyrics → 歌詞、段落、唱法" : "Style → Genre, voice, instruments\nLyrics → Words, sections, delivery"}</pre><button type="button" className={styles.primary} onClick={() => navigateBible("bible-move-two-field-routing")}>{zh ? "開始這一招" : "Start this move"}<ArrowRight size={17} /></button></div></article>
        <article className={`${styles.lesson} ${styles.green}`}><SlidersHorizontal className={styles.lessonIcon} size={42} strokeWidth={1.65} /><div><span className={styles.lessonLabel}>{zh ? "建立方向" : "FIND DIRECTION"}</span><h3>{dna?.title[locale] ?? (zh ? "七格聲音 DNA" : "Seven-part sonic DNA")}</h3><p>{zh ? "把模糊的形容，變成清楚的聲音。" : "Turn vague descriptions into a clear sound."}</p><pre>{zh ? "主曲風 + 次曲風 + 情緒 + 樂器\n速度 + 調性 + 聲音質感" : "Genre + Subgenre + Mood + Instruments\nTempo + Key + Mix texture"}</pre><button type="button" className={styles.textAction} onClick={() => navigateBible("bible-move-prompt-dna")}>{zh ? "看範例" : "See example"}<ArrowRight size={17} /></button></div></article>
        <article className={`${styles.lesson} ${styles.purple}`}><Mic2 className={styles.lessonIcon} size={42} strokeWidth={1.65} /><div><span className={styles.lessonLabel}>{zh ? "人聲控制" : "VOCAL CONTROL"}</span><h3>{zh ? "副歌：把情緒推上去" : "Chorus: lift the emotion"}</h3><p>{zh ? "把唱法放在對的段落，讓情緒有層次。" : "Shape delivery where the emotion changes."}</p><pre>[Chorus | sung | powerful | emotional]</pre><button type="button" className={styles.textAction} onClick={() => navigateBible("vocal-starter-powerful-chorus")}>{zh ? "看範例" : "See example"}<ArrowRight size={17} /></button></div></article>
      </div>
    </section>
    <div className={styles.lower}>
      <section className={styles.moves} aria-labelledby="bible-moves-heading">
        <div className={styles.sectionHeading}><h2 id="bible-moves-heading">{zh ? "常用招式，直接拿來試" : "Practical moves to try"}</h2><button type="button" onClick={() => navigateBible("suno-prompt-library")}>{zh ? `全部 ${catalog.promptMoves.length || ""} 招` : `All ${catalog.promptMoves.length || ""} moves`}<ArrowRight size={18} /></button></div>
        <div className={styles.tabs} role="group" aria-label={zh ? "常用招式分類" : "Featured move categories"}>{categories.map(item => <button type="button" key={item.key} aria-pressed={category === item.key} onClick={() => setCategory(item.key)}>{item[locale]}</button>)}</div>
        <div className={styles.moveList} aria-live="polite">
          {loading ? <p className={styles.status}>{zh ? "正在整理招式…" : "Loading moves…"}</p> : error ? <p className={styles.status}>{zh ? "招式暫時載入失敗。" : "Unable to load moves."}<button onClick={onRetry} type="button">{zh ? "重新載入" : "Try again"}</button></p> : moves.length ? moves.map((item, index) => <div className={styles.move} key={item.key}><span className={styles.moveNumber}>0{index + 1}</span><button className={styles.moveTitle} type="button" onClick={() => navigateBible(`bible-move-${item.key}`)}>{item.title[locale]}</button><p>{item.summary[locale]}</p><BiblePromptCopy key={`${item.key}:${locale}`} copyKey={biblePromptCopyKey("prompt_move", item.key)} locale={locale} label={item.title[locale]} compact /></div>) : <p className={styles.status}>{zh ? "這個分類暫無招式，請查看完整資料庫。" : "No moves here yet. Browse the full library."}</p>}
        </div>

      </section>
      <aside className={styles.help}><h2>{zh ? "卡在哪裡？" : "Where are you stuck?"}</h2><div className={styles.helpLinks}>{[
        ["歌詞唱不清楚", "Unclear lyrics", "suno-troubleshooting"], ["副歌沒有記憶點", "A forgettable chorus", "suno-troubleshooting"], ["台語咬字不自然", "Taiwanese pronunciation", "taiwanese-lab"], ["不知道怎麼拆軌", "Choosing a stem workflow", "stem-separation-guide"],
      ].map(([zhTitle, enTitle, id]) => <button type="button" key={zhTitle} onClick={() => navigateBible(id)}>{zh ? zhTitle : enTitle}<ArrowRight size={18} /></button>)}</div><div className={styles.helpFooter}><a href={AIPOGER_TUTORIAL_PLAYLIST_URL} target="_blank" rel="noreferrer"><Video size={20} />{zh ? "影片教學" : "Tutorials"}<ExternalLink size={13} /></a><button type="button" onClick={onCommunity}><MessageSquare size={20} />{zh ? "實測討論" : "Community"}<ExternalLink size={13} /></button></div></aside>
    </div>
    <p className={styles.note}>{zh ? "提示是創作方向，生成後請比較與調整。" : "Prompts give direction. Compare and adjust after generating."}</p>
  </section>;
}
