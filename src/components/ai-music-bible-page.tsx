"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  Check,
  ChevronRight,
  Clipboard,
  FlaskConical,
  Headphones,
  LibraryBig,
  MessageCirclePlus,
  Music2,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import {
  TAIWANESE_LYRICS_CATEGORIES,
  TAIWANESE_LYRICS_ENTRIES,
  type TaiwaneseLyricsCategory,
} from "@/lib/taiwanese-lyrics-lab";

type SubmitState = { tone: "idle" | "loading" | "success" | "error"; message: string };

const categoryLabels: Record<TaiwaneseLyricsCategory, string> = {
  人稱: "Pronouns",
  動作與狀態: "Action / State",
  時間: "Time",
  情緒與口語: "Emotion / Spoken",
  空間與疑問: "Place / Question",
};

const tutorialPlaylist = "https://www.youtube.com/playlist?list=PL3mhsgQ58HjYu-vzSOr-s4SK5S3f0uaez";

type PracticeArea = {
  icon: typeof WandSparkles;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  accent: "orange" | "cyan";
  external?: boolean;
};

function practiceAreasForLanguage(isZh: boolean): PracticeArea[] {
  return isZh
    ? [
        { icon: WandSparkles, eyebrow: "PROMPT", title: "Prompt 招式庫", body: "把曲風、情緒、樂器、段落與 vocal 說清楚。", href: "#practice-map", accent: "orange" },
        { icon: BookOpenText, eyebrow: "LYRICS", title: "歌詞調教", body: "副歌記憶句、段落格式、口語與咬字實測。", href: "#taiwanese-lab", accent: "cyan" },
        { icon: Music2, eyebrow: "DROP", title: "Drop 製作練習", body: "用 30–60 秒練節奏、情緒與記憶點。", href: "/hook-guide", accent: "orange" },
        { icon: Headphones, eyebrow: "A&R TOOL", title: "分析你的音樂", body: "需要第二意見時，再用 A&R Gate 檢查作品路線。", href: "/music-analysis", accent: "cyan" },
        { icon: ShieldCheck, eyebrow: "RIGHTS", title: "版權與發表", body: "只使用自己有權利的聲音、歌詞與素材。", href: "#practice-map", accent: "orange" },
        { icon: Video, eyebrow: "AIPOGER", title: "愛波哥影片教學", body: "從中文實戰影片建立完整創作流程。", href: tutorialPlaylist, accent: "cyan", external: true },
      ]
    : [
        { icon: WandSparkles, eyebrow: "PROMPT", title: "Prompt Patterns", body: "Define genre, emotion, instruments, sections, and vocal direction.", href: "#practice-map", accent: "orange" },
        { icon: BookOpenText, eyebrow: "LYRICS", title: "Lyric Practice", body: "Practice chorus memory, section labels, diction, and pronunciation.", href: "#taiwanese-lab", accent: "cyan" },
        { icon: Music2, eyebrow: "DROP", title: "Drop Practice", body: "Train rhythm, emotion, and recall inside a focused 30–60 seconds.", href: "/hook-guide", accent: "orange" },
        { icon: Headphones, eyebrow: "A&R TOOL", title: "Analyze Your Music", body: "Use A&R Gate when you need a second opinion on the track's route.", href: "/music-analysis", accent: "cyan" },
        { icon: ShieldCheck, eyebrow: "RIGHTS", title: "Rights & Release", body: "Use only audio, lyrics, and media you have the right to publish.", href: "#practice-map", accent: "orange" },
        { icon: Video, eyebrow: "AIPOGER", title: "AIPOGER Tutorials", body: "Build your workflow with AIPOGER's Traditional Chinese videos.", href: tutorialPlaylist, accent: "cyan", external: true },
      ];
}

function appendLang(href: string, lang: string) {
  if (href.startsWith("#") || href.startsWith("http")) return href;
  return `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`;
}

async function submitContribution(payload: Record<string, string>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch("/api/ai-music-bible/contributions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(result?.error || "資料暫時送不出去，請稍後再試。");
}

export default function AiMusicBiblePage() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const ui = isZh
    ? {
        updated: "持續更新", enterLab: "進入台語調音實驗室", viewMap: "看練功地圖",
        labCount: "38+ 筆台語發音實測", seedSource: "第一批資料來自《Suno 台語歌歌詞調教對照表》，接下來由創作者一起補齊版本與唱法差異。",
        traits: ["可搜尋", "一鍵複製", "共同驗證"], practiceTitle: "今天要練哪一招？", practiceBody: "先選一個問題練，不必從頭把整本看完。每一區都會慢慢增加實測範例。",
        labTitle: "Suno 台語歌詞調音實驗室", labBody: "搜尋華語意思，複製實測寫法，再告訴大家這個版本唱得準不準。不同模型、旋律與聲線都可能改變結果。",
        addData: "補一筆資料", disclaimer: "這裡整理的是 AI 歌唱發音實測，不代表台語推薦正字。借音字只用來協助模型發音；正式書寫請另外查證。",
        search: "搜尋：忘記、現在、佗位、袂…", showing: "顯示", all: "全部", headers: ["華語原意", "推薦漢字", "Suno 實測寫法", "發音眉角", "回報"], recommended: "推薦漢字",
        noResult: "目前找不到這個詞", addMissing: "把它補進待驗證區 →", weeklyTitle: "一週不要急著做十首完整歌",
        weeklyBody: "先用同一個 Prompt 做三版，只練一件事：曲風、情緒、歌詞、vocal tone 或 Drop。把成功的條件留下來，才是真的練功。",
        weeklyItems: ["同一 Prompt 連做 3 版", "把好結果反推成模板", "歌詞用段落標籤整理", "只使用有權利的素材"],
        toolboxTitle: "卡關再分析", toolboxBody: "A&R Gate 是第二意見，不是創作答案。先完成作品，再用它找聲音、歌詞與市場路線上的盲點。", analyze: "分析你的音樂",
        modalTitle: "補一筆實測資料", modalBody: "送出後先進待驗證區，不會直接改正式對照表。", close: "關閉",
        meaning: "華語原意 *", meaningPlaceholder: "例如：回家", standard: "推薦漢字／台文", standardPlaceholder: "例如：轉去厝", suno: "Suno 實測寫法 *", sunoPlaceholder: "輸入最容易唱準的寫法",
        note: "實測說明 *", notePlaceholder: "在哪個句子、哪種旋律有效？有什麼容易唱錯的地方？", version: "Suno 版本", versionPlaceholder: "例如：v4.5／v5", name: "你的名稱（可不填）", namePlaceholder: "顯示名稱", cancel: "取消", submit: "送進待驗證區",
        submitting: "正在送進待驗證區…", submitted: "收到！資料已進待驗證區，確認後才會加入正式表。", submitError: "投稿失敗，請稍後再試。", copy: "複製 Suno 寫法", effective: "這個寫法有效", incorrect: "這個寫法會唱錯", reported: "已回報", unavailable: "暫時送不出",
      }
    : {
        updated: "Living guide", enterLab: "Enter Taiwanese Lyrics Lab", viewMap: "View practice map",
        labCount: "38+ Taiwanese pronunciation tests", seedSource: "The first 38 entries come from the owner-provided Suno Taiwanese Lyrics Tuning Table. Creators can now help test model and phrasing differences.",
        traits: ["Search", "One-tap copy", "Community tested"], practiceTitle: "What do you want to practice?", practiceBody: "Pick one problem instead of reading everything in order. Each section will keep gaining tested examples.",
        labTitle: "Suno Taiwanese Lyrics Lab", labBody: "Search by Mandarin meaning, copy a tested spelling, then report whether your Suno version sings it correctly.",
        addData: "Add a test", disclaimer: "These are AI singing pronunciation experiments, not recommended Taiwanese orthography. Loan characters are only used to guide model pronunciation.",
        search: "Search: 忘記, 現在, 佗位, 袂…", showing: "Showing", all: "All", headers: ["Mandarin meaning", "Recommended form", "Tested Suno spelling", "Pronunciation note", "Report"], recommended: "Recommended",
        noResult: "No matching phrase yet", addMissing: "Send it to the review queue →", weeklyTitle: "Do not rush into ten full songs this week",
        weeklyBody: "Make three versions from one prompt and train only one variable: genre, emotion, lyric, vocal tone, or Drop. Save the conditions that worked.",
        weeklyItems: ["Make 3 versions from one prompt", "Reverse good results into a template", "Organize lyrics with section labels", "Use only material you have rights to"],
        toolboxTitle: "Analyze when you are stuck", toolboxBody: "A&R Gate is a second opinion, not the answer. Finish the track first, then use it to spot blind spots in sound, lyrics, and market route.", analyze: "Analyze Your Music",
        modalTitle: "Add a pronunciation test", modalBody: "Submissions enter a review queue and never edit the public catalog directly.", close: "Close",
        meaning: "Mandarin meaning *", meaningPlaceholder: "Example: go home", standard: "Recommended Taiwanese form", standardPlaceholder: "Example: 轉去厝", suno: "Tested Suno spelling *", sunoPlaceholder: "Enter the spelling that sang correctly",
        note: "Test note *", notePlaceholder: "Which phrase, melody, or voice worked? What usually goes wrong?", version: "Suno version", versionPlaceholder: "Example: v4.5 / v5", name: "Your name (optional)", namePlaceholder: "Display name", cancel: "Cancel", submit: "Send to review",
        submitting: "Sending to the review queue…", submitted: "Received. Your test is waiting for review before it can join the public catalog.", submitError: "Submission failed. Please try again later.", copy: "Copy Suno spelling", effective: "This spelling worked", incorrect: "This spelling was wrong", reported: "Reported", unavailable: "Unavailable",
      };
  const practiceAreas = useMemo(() => practiceAreasForLanguage(isZh), [isZh]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TaiwaneseLyricsCategory | "全部">("全部");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ tone: "idle", message: "" });
  const [feedbackState, setFeedbackState] = useState<Record<string, "loading" | "sent" | "error">>({});

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return TAIWANESE_LYRICS_ENTRIES.filter((entry) => {
      if (category !== "全部" && entry.category !== category) return false;
      if (!normalized) return true;
      return [entry.meaning, entry.recommended, entry.sunoWriting, entry.note, entry.category]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized);
    });
  }, [category, query]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1600);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleFeedback = async (entryKey: string, outcome: "effective" | "incorrect") => {
    if (feedbackState[entryKey] === "loading" || feedbackState[entryKey] === "sent") return;
    setFeedbackState((current) => ({ ...current, [entryKey]: "loading" }));
    try {
      await submitContribution({ kind: "feedback", entryKey, outcome, sourceVersion: "Suno 版本未填" });
      setFeedbackState((current) => ({ ...current, [entryKey]: "sent" }));
    } catch {
      setFeedbackState((current) => ({ ...current, [entryKey]: "error" }));
    }
  };

  const handleSuggestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitState({ tone: "loading", message: ui.submitting });
    try {
      await submitContribution({
        kind: "suggestion",
        meaning: String(formData.get("meaning") || ""),
        recommended: String(formData.get("recommended") || ""),
        sunoWriting: String(formData.get("sunoWriting") || ""),
        note: String(formData.get("note") || ""),
        sourceVersion: String(formData.get("sourceVersion") || ""),
        contributorName: String(formData.get("contributorName") || ""),
        website: String(formData.get("website") || ""),
      });
      form.reset();
      setSubmitState({ tone: "success", message: ui.submitted });
    } catch (error) {
      setSubmitState({ tone: "error", message: error instanceof Error ? error.message : ui.submitError });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,106,0,0.19),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(52,211,153,0.11),transparent_27%),linear-gradient(180deg,#050505_0%,#0b0806_45%,#030707_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto w-full max-w-[1520px] px-4 pb-20 pt-24 sm:px-6 lg:px-10">
        <section className="relative overflow-hidden rounded-[1.6rem] border border-orange-300/24 bg-black/56 px-5 py-8 shadow-[0_30px_100px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] sm:px-8 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-10 lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`${fontRighteous.className} text-xs uppercase tracking-[0.38em] text-cyan-200/80`}>AIPOGER CREATOR CODEX</span>
              <span className="rounded-full border border-orange-300/24 bg-orange-400/[0.09] px-3 py-1 text-[11px] font-black text-orange-200">{ui.updated}</span>
            </div>
            <h1 className="mt-5 max-w-5xl text-[clamp(2.65rem,5.2vw,5.5rem)] font-black leading-[0.96] tracking-[-0.04em] text-[#fff8ed] [text-shadow:0_18px_45px_rgba(0,0,0,0.8)]">
              {isZh ? "AI 音樂練功聖經" : "AI Music Practice Bible"}
            </h1>
            <p className="mt-6 max-w-3xl text-base font-bold leading-8 text-zinc-300 md:text-xl md:leading-9">
              {isZh
                ? "不是看完就算的教學頁。這裡收集 Suno、Prompt、歌詞、Drop 與發表實戰，大家一起測、一起回報，把踩過的坑變成下一首歌的捷徑。"
                : "A living field guide for Suno, prompts, lyrics, Drops, rights, and real-world AI music practice."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#taiwanese-lab" className="aipo-primary-button inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black">
                {ui.enterLab} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#practice-map" className="aipo-ghost-button inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black text-white">
                {ui.viewMap}
              </a>
            </div>
          </div>

          <div className="relative mt-8 min-h-[20rem] overflow-hidden rounded-[1.35rem] border border-cyan-200/18 bg-[linear-gradient(145deg,rgba(255,106,0,0.09),rgba(0,0,0,0.72)_52%,rgba(34,211,238,0.09))] p-5 lg:mt-0">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-orange-300/15 [background:repeating-radial-gradient(circle,rgba(255,255,255,0.1)_0_1px,transparent_1px_12px)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <LibraryBig className="h-10 w-10 text-orange-300" />
                <p className={`${fontRighteous.className} mt-5 text-xs uppercase tracking-[0.32em] text-zinc-500`}>LIVE KNOWLEDGE BASE</p>
                <p className="mt-2 text-3xl font-black text-white">{ui.labCount}</p>
                <p className="mt-3 max-w-sm text-sm font-bold leading-6 text-zinc-400">{ui.seedSource}</p>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-2">
                {ui.traits.map((item) => (
                  <span key={item} className="rounded-xl border border-white/10 bg-black/45 px-2 py-3 text-center text-xs font-black text-cyan-50">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="practice-map" className="scroll-mt-24 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.34em] text-orange-300/80`}>PRACTICE MAP</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">{ui.practiceTitle}</h2>
            </div>
            <p className="max-w-xl text-sm font-bold leading-7 text-zinc-500">{ui.practiceBody}</p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {practiceAreas.map((area) => {
              const Icon = area.icon;
              const body = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <Icon className={`h-7 w-7 ${area.accent === "cyan" ? "text-cyan-200" : "text-orange-300"}`} />
                    <ChevronRight className="h-5 w-5 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                  <p className={`${fontRighteous.className} mt-7 text-[11px] uppercase tracking-[0.28em] text-zinc-600`}>{area.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-black text-white group-hover:text-orange-100">{area.title}</h3>
                  <p className="mt-3 text-sm font-bold leading-6 text-zinc-500">{area.body}</p>
                </>
              );
              const className = "group min-h-[14rem] rounded-[1.15rem] border border-white/10 bg-black/48 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:-translate-y-0.5 hover:border-orange-300/45 hover:bg-orange-400/[0.055]";
              return area.external ? (
                <a key={area.title} href={area.href} target="_blank" rel="noreferrer" className={className}>{body}</a>
              ) : area.href.startsWith("#") ? (
                <a key={area.title} href={area.href} className={className}>{body}</a>
              ) : (
                <Link key={area.title} href={appendLang(area.href, lang)} className={className}>{body}</Link>
              );
            })}
          </div>
        </section>

        <section id="taiwanese-lab" className="scroll-mt-20 overflow-hidden rounded-[1.6rem] border border-orange-300/22 bg-[#070707]/90 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_15%_0%,rgba(255,106,0,0.18),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(34,211,238,0.1),transparent_30%)] px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-4xl">
                <div className="flex items-center gap-3">
                  <FlaskConical className="h-6 w-6 text-cyan-200" />
                  <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.32em] text-cyan-200/75`}>COMMUNITY LAB · BETA</p>
                </div>
                <h2 className="mt-4 text-[clamp(2.1rem,5vw,4.8rem)] font-black leading-[0.98] text-white">{ui.labTitle}</h2>
                <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-zinc-300">{ui.labBody}</p>
              </div>
              <button type="button" onClick={() => { setSuggestionOpen(true); setSubmitState({ tone: "idle", message: "" }); }} className="aipo-primary-button inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-black">
                <MessageCirclePlus className="h-4 w-4" /> {ui.addData}
              </button>
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.055] px-4 py-3 text-sm font-bold leading-6 text-amber-100/85">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <p>{ui.disclaimer}</p>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-7 lg:px-9">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-600" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ui.search} className="h-13 w-full rounded-xl border border-white/12 bg-black/60 pl-12 pr-4 text-sm font-bold text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-200/55" />
              </label>
              <p className="text-right text-xs font-black tracking-[0.12em] text-zinc-600">{ui.showing} {filteredEntries.length} / {TAIWANESE_LYRICS_ENTRIES.length}</p>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {(["全部", ...TAIWANESE_LYRICS_CATEGORIES] as const).map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${category === item ? "border-orange-200/65 bg-orange-500/18 text-orange-100" : "border-white/10 bg-white/[0.035] text-zinc-500 hover:text-white"}`}>
                  {item === "全部" ? ui.all : isZh ? item : categoryLabels[item]}
                </button>
              ))}
            </div>

            <div className="mt-5 hidden overflow-hidden rounded-xl border border-white/10 lg:block">
              <div className="grid grid-cols-[0.82fr_1fr_1.15fr_1.55fr_9.5rem] bg-white/[0.055] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                {ui.headers.map((header) => <span key={header}>{header}</span>)}
              </div>
              {filteredEntries.map((entry) => (
                <div key={entry.key} className="grid grid-cols-[0.82fr_1fr_1.15fr_1.55fr_9.5rem] items-center border-t border-white/8 px-5 py-4 text-sm transition hover:bg-white/[0.025]">
                  <div><span className="mb-1 block text-[10px] font-black tracking-[0.16em] text-zinc-700">{isZh ? entry.category : categoryLabels[entry.category]}</span><strong className="text-white">{entry.meaning}</strong></div>
                  <span className="pr-4 font-bold text-zinc-300">{entry.recommended}</span>
                  <button type="button" onClick={() => void handleCopy(entry.key, entry.sunoWriting)} className="group/copy flex min-w-0 items-center gap-2 pr-4 text-left font-black text-cyan-100 hover:text-white" title={ui.copy}>
                    <span className="min-w-0 break-words">{entry.sunoWriting}</span>{copiedKey === entry.key ? <Check className="h-4 w-4 shrink-0 text-emerald-300" /> : <Clipboard className="h-4 w-4 shrink-0 opacity-35 group-hover/copy:opacity-100" />}
                  </button>
                  <span className="pr-4 text-xs font-bold leading-6 text-zinc-500">{entry.note}</span>
                  <FeedbackButtons entryKey={entry.key} state={feedbackState[entry.key]} onFeedback={handleFeedback} labels={ui} />
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 lg:hidden">
              {filteredEntries.map((entry) => (
                <article key={entry.key} className="rounded-xl border border-white/10 bg-black/48 p-4">
                  <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black tracking-[0.16em] text-zinc-600">{isZh ? entry.category : categoryLabels[entry.category]}</span><h3 className="mt-1 text-xl font-black text-white">{entry.meaning}</h3></div><FeedbackButtons compact entryKey={entry.key} state={feedbackState[entry.key]} onFeedback={handleFeedback} labels={ui} /></div>
                  <div className="mt-4 grid gap-2 text-sm"><p className="text-zinc-500"><span className="mr-2 text-xs font-black text-zinc-700">{ui.recommended}</span>{entry.recommended}</p><button type="button" onClick={() => void handleCopy(entry.key, entry.sunoWriting)} title={ui.copy} className="flex items-center justify-between rounded-lg border border-cyan-200/14 bg-cyan-300/[0.055] px-3 py-3 text-left font-black text-cyan-50"><span>{entry.sunoWriting}</span>{copiedKey === entry.key ? <Check className="h-4 w-4 text-emerald-300" /> : <Clipboard className="h-4 w-4 text-cyan-200/55" />}</button><p className="pt-1 text-xs font-bold leading-6 text-zinc-500">{entry.note}</p></div>
                </article>
              ))}
            </div>

            {filteredEntries.length === 0 && <div className="my-8 rounded-xl border border-dashed border-white/12 px-6 py-12 text-center"><p className="font-black text-zinc-300">{ui.noResult}</p><button type="button" onClick={() => setSuggestionOpen(true)} className="mt-3 text-sm font-black text-orange-200 hover:text-white">{ui.addMissing}</button></div>}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-[1.35rem] border border-white/10 bg-black/48 p-6 md:p-8">
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.3em] text-orange-300/75`}>WEEKLY PRACTICE</p>
            <h2 className="mt-3 text-3xl font-black text-white">{ui.weeklyTitle}</h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-zinc-400">{ui.weeklyBody}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">{ui.weeklyItems.map((item) => <div key={item} className="rounded-lg border border-white/8 bg-white/[0.025] px-4 py-3 text-sm font-black text-zinc-300"><Sparkles className="mr-2 inline h-4 w-4 text-orange-300" />{item}</div>)}</div>
          </article>
          <article className="rounded-[1.35rem] border border-cyan-200/14 bg-cyan-300/[0.04] p-6 md:p-8">
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.3em] text-cyan-200/70`}>TOOLBOX</p>
            <h2 className="mt-3 text-3xl font-black text-white">{ui.toolboxTitle}</h2>
            <p className="mt-4 text-sm font-bold leading-7 text-zinc-400">{ui.toolboxBody}</p>
            <Link href={appendLang("/music-analysis", lang)} className="aipo-ghost-button mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-black text-white">{ui.analyze} <ArrowRight className="h-4 w-4" /></Link>
          </article>
        </section>
      </div>

      {suggestionOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/78 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSuggestionOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="bible-suggestion-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[1.5rem] border border-orange-300/22 bg-[#0b0b0a] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.75)] sm:rounded-[1.5rem] sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className={`${fontRighteous.className} text-xs uppercase tracking-[0.28em] text-orange-300/75`}>COMMUNITY CONTRIBUTION</p><h2 id="bible-suggestion-title" className="mt-2 text-3xl font-black text-white">{ui.modalTitle}</h2><p className="mt-2 text-sm font-bold leading-6 text-zinc-500">{ui.modalBody}</p></div><button type="button" onClick={() => setSuggestionOpen(false)} className="rounded-full border border-white/10 p-2 text-zinc-400 hover:text-white" aria-label={ui.close}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSuggestion} className="mt-6 grid gap-4">
              <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              <div className="grid gap-4 sm:grid-cols-2"><Field label={ui.meaning} name="meaning" placeholder={ui.meaningPlaceholder} required /><Field label={ui.standard} name="recommended" placeholder={ui.standardPlaceholder} /></div>
              <Field label={ui.suno} name="sunoWriting" placeholder={ui.sunoPlaceholder} required />
              <label className="grid gap-2 text-sm font-black text-zinc-300">{ui.note}<textarea name="note" required maxLength={500} rows={4} placeholder={ui.notePlaceholder} className="rounded-xl border border-white/12 bg-black/60 px-4 py-3 font-bold leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-cyan-200/55" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><Field label={ui.version} name="sourceVersion" placeholder={ui.versionPlaceholder} /><Field label={ui.name} name="contributorName" placeholder={ui.namePlaceholder} /></div>
              {submitState.message && <p aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm font-bold ${submitState.tone === "success" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100" : submitState.tone === "error" ? "border-red-300/20 bg-red-400/[0.06] text-red-100" : "border-white/10 text-zinc-400"}`}>{submitState.message}</p>}
              <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setSuggestionOpen(false)} className="aipo-ghost-button min-h-11 rounded-full px-5 text-sm font-black text-zinc-300">{ui.cancel}</button><button type="submit" disabled={submitState.tone === "loading"} className="aipo-primary-button min-h-11 rounded-full px-6 text-sm font-black disabled:cursor-wait disabled:opacity-55">{ui.submit}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

function FeedbackButtons({ entryKey, state, compact = false, onFeedback, labels }: { entryKey: string; state?: "loading" | "sent" | "error"; compact?: boolean; onFeedback: (entryKey: string, outcome: "effective" | "incorrect") => Promise<void>; labels: { effective: string; incorrect: string; reported: string; unavailable: string } }) {
  if (state === "sent") return <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-300"><Check className="h-4 w-4" /> {labels.reported}</span>;
  if (state === "error") return <span className="text-[11px] font-black text-red-300">{labels.unavailable}</span>;
  return <div className={`flex ${compact ? "gap-1" : "gap-2"}`}><button type="button" disabled={state === "loading"} onClick={() => void onFeedback(entryKey, "effective")} className="rounded-full border border-white/10 p-2 text-zinc-500 transition hover:border-emerald-300/35 hover:text-emerald-200 disabled:opacity-40" title={labels.effective} aria-label={labels.effective}><ThumbsUp className="h-4 w-4" /></button><button type="button" disabled={state === "loading"} onClick={() => void onFeedback(entryKey, "incorrect")} className="rounded-full border border-white/10 p-2 text-zinc-500 transition hover:border-red-300/35 hover:text-red-200 disabled:opacity-40" title={labels.incorrect} aria-label={labels.incorrect}><ThumbsDown className="h-4 w-4" /></button></div>;
}

function Field({ label, name, placeholder, required = false }: { label: string; name: string; placeholder: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm font-black text-zinc-300">{label}<input name={name} required={required} maxLength={160} placeholder={placeholder} className="h-12 rounded-xl border border-white/12 bg-black/60 px-4 font-bold text-white outline-none placeholder:text-zinc-700 focus:border-cyan-200/55" /></label>;
}
