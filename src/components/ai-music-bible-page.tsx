"use client";

import Link from "next/link";
import {
  AudioWaveform,
  ArrowRight,
  BookOpenText,
  Check,
  ChevronRight,
  Clipboard,
  ExternalLink,
  FileKey2,
  FlaskConical,
  Gauge,
  Headphones,
  LibraryBig,
  LockKeyhole,
  MessageCirclePlus,
  Music2,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { AIPOGER_LINE_COMMUNITY_URL, AIPOGER_TUTORIAL_PLAYLIST_URL } from "@/lib/brand";
import StemSeparationGuideSection from "@/components/stem-separation-guide-section";
import SunoPracticeLibrarySection from "@/components/suno-practice-library-section";
import SunoReferenceGuideSection from "@/components/suno-reference-guide-section";
import BibleCommandDock from "@/components/bible-command-dock";
import AuthRequiredDialog from "@/components/auth-required-dialog";
import ShareButton from "@/components/share-button";
import { LineCommunityDialog, SocialIcon } from "@/components/social-icons";
import type { BibleCatalog } from "@/lib/ai-music-bible-content";
import {
  type TaiwaneseLyricsCategory,
} from "@/lib/taiwanese-lyrics-lab";

type SubmitState = { tone: "idle" | "loading" | "success" | "error"; message: string };
type AccessState = "checking" | "signedOut" | "signedIn";

const categoryLabels: Record<TaiwaneseLyricsCategory, string> = {
  人稱: "Pronouns",
  動作與狀態: "Action / State",
  時間: "Time",
  情緒與口語: "Emotion / Spoken",
  空間與疑問: "Place / Question",
};

const TAIWANESE_LYRICS_CATEGORIES: TaiwaneseLyricsCategory[] = ["人稱", "動作與狀態", "時間", "情緒與口語", "空間與疑問"];

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
        { icon: Gauge, eyebrow: "START HERE", title: "Suno 起手式", body: "先分清 Style、Lyrics、Title，再過生成前檢查。", href: "#suno-control-desk", accent: "cyan" },
        { icon: WandSparkles, eyebrow: "PROMPT", title: "Prompt 招式庫", body: "42 招 Prompt、80+ 個曲風詞與愛波哥私藏配方。", href: "#suno-prompt-library", accent: "orange" },
        { icon: LibraryBig, eyebrow: "1,519 INDEX", title: "聲音 DNA × Prompt 索引", body: "772 組藝術家聲音 DNA 與 747 組去重配方，可搜尋、複製與評論。", href: "#suno-inspiration-index", accent: "cyan" },
        { icon: BookOpenText, eyebrow: "LYRICS", title: "歌詞調教", body: "段落、唱法、合唱、情緒與台語咬字實測。", href: "#lyric-control-library", accent: "cyan" },
        { icon: Music2, eyebrow: "DROP", title: "Drop 製作練習", body: "用 30–60 秒練節奏、情緒與記憶點。", href: "/hook-guide", accent: "orange" },
        { icon: Headphones, eyebrow: "A&R TOOL", title: "分析你的音樂", body: "需要第二意見時，再用 A&R Gate 檢查作品路線。", href: "/music-analysis", accent: "cyan" },
        { icon: AudioWaveform, eyebrow: "STEMS", title: "AI 拆軌避坑指南", body: "看懂 10 種引擎家族，避免為同一能力重複付費。", href: "#stem-separation-guide", accent: "orange" },
        { icon: FileKey2, eyebrow: "RIGHTS", title: "權利與發行", body: "分清生成、商用與著作權，正式發行前先過風險檢查。", href: "#rights-release", accent: "cyan" },
        { icon: Video, eyebrow: "AIPOGER", title: "愛波哥影片教學", body: "從中文實戰影片建立完整創作流程。", href: AIPOGER_TUTORIAL_PLAYLIST_URL, accent: "cyan", external: true },
      ]
    : [
        { icon: Gauge, eyebrow: "START HERE", title: "Suno Quick Start", body: "Separate Style, Lyrics, and Title, then run the pre-flight check.", href: "#suno-control-desk", accent: "cyan" },
        { icon: WandSparkles, eyebrow: "PROMPT", title: "Prompt Moves", body: "42 prompt moves, 80+ genre terms, and curated AIPOGER recipes.", href: "#suno-prompt-library", accent: "orange" },
        { icon: LibraryBig, eyebrow: "1,519 INDEX", title: "Sonic DNA × Prompt Index", body: "Search, copy, and discuss 772 artist DNA references and 747 unique recipes.", href: "#suno-inspiration-index", accent: "cyan" },
        { icon: BookOpenText, eyebrow: "LYRICS", title: "Lyric Control", body: "Shape sections, delivery, duets, emotion, and Taiwanese pronunciation.", href: "#lyric-control-library", accent: "cyan" },
        { icon: Music2, eyebrow: "DROP", title: "Drop Practice", body: "Train rhythm, emotion, and recall inside a focused 30–60 seconds.", href: "/hook-guide", accent: "orange" },
        { icon: Headphones, eyebrow: "A&R TOOL", title: "Analyze Your Music", body: "Use A&R Gate when you need a second opinion on the track's route.", href: "/music-analysis", accent: "cyan" },
        { icon: AudioWaveform, eyebrow: "STEMS", title: "Stem Separation Guide", body: "Understand 10 engine families and avoid paying twice for the same capability.", href: "#stem-separation-guide", accent: "orange" },
        { icon: FileKey2, eyebrow: "RIGHTS", title: "Rights & Release", body: "Separate generation, commercial use, and copyright before release.", href: "#rights-release", accent: "cyan" },
        { icon: Video, eyebrow: "AIPOGER", title: "AIPOGER Tutorials", body: "Build your workflow with AIPOGER's Traditional Chinese videos.", href: AIPOGER_TUTORIAL_PLAYLIST_URL, accent: "cyan", external: true },
      ];
}

function appendLang(href: string, lang: string) {
  if (href.startsWith("#") || href.startsWith("http")) return href;
  return `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`;
}

function bibleGateCopyForLanguage(lang: string) {
  if (lang === "ja") {
    return {
      title: "AI音楽 実践バイブル",
      body: "Prompt、歌詞、Sonic DNA、Stem分離、台湾語の発音テストを、検索・コピーして何度でも使える実践データベースにまとめています。",
      start: "練習を始める",
      listen: "まず音楽を聴く",
      bar: "Bar Heartbreakへ",
      marker: "実践データベース",
      stats: ["1,519件の検索インデックス", "Prompt × 歌詞の実践集", "コピー・コメント・共同検証"],
      asideEyebrow: "WHAT IS INSIDE",
      asideTitle: "迷ったときに、すぐ調べられる",
      asideBody: "長い教材を最初から読むのではなく、今つまずいている場所から入れます。",
      cards: [
        ["Prompt × 歌詞", "曲調、歌い方、構成、感情をすぐ試せる形に整理。"],
        ["Sonic DNA × レシピ", "772件の音色リファレンスと747件の重複なしレシピ。"],
        ["Stem × 台湾語", "分離ツールの選び方と、AI歌唱の発音テストを収録。"],
      ],
    };
  }
  if (lang === "ko") {
    return {
      title: "AI 음악 실전 바이블",
      body: "Prompt, 가사, Sonic DNA, Stem 분리, 대만어 발음 테스트를 검색하고 복사해 반복해서 쓸 수 있는 실전 데이터베이스로 정리했습니다.",
      start: "연습 시작",
      listen: "음악 먼저 듣기",
      bar: "Bar Heartbreak 가기",
      marker: "실전 데이터베이스",
      stats: ["검색 가능한 인덱스 1,519개", "Prompt × 가사 실전 자료", "복사·댓글·공동 검증"],
      asideEyebrow: "WHAT IS INSIDE",
      asideTitle: "막힐 때 바로 찾아보세요",
      asideBody: "처음부터 긴 자료를 읽지 않아도, 지금 막힌 문제부터 바로 들어갈 수 있습니다.",
      cards: [
        ["Prompt × 가사", "장르, 보컬, 구성, 감정을 바로 테스트할 수 있게 정리했습니다."],
        ["Sonic DNA × 레시피", "사운드 레퍼런스 772개와 중복을 뺀 레시피 747개."],
        ["Stem × 대만어", "분리 도구 선택법과 AI 보컬 발음 테스트를 함께 제공합니다."],
      ],
    };
  }
  if (lang === "en") {
    return {
      title: "AI Music Practice Bible",
      body: "A searchable, copyable field database for prompts, lyrics, sonic DNA, stem separation, and Taiwanese pronunciation tests—built to revisit whenever a track gets stuck.",
      start: "Start practicing",
      listen: "Listen first",
      bar: "Visit Bar Heartbreak",
      marker: "Field database",
      stats: ["1,519 searchable entries", "Prompt × lyric practice", "Copy, discuss, verify"],
      asideEyebrow: "WHAT IS INSIDE",
      asideTitle: "A place to look whenever a track gets stuck",
      asideBody: "Start from the problem in front of you instead of reading one long manual from beginning to end.",
      cards: [
        ["Prompt × Lyrics", "Shape genre, vocal delivery, structure, and emotion with practical moves."],
        ["Sonic DNA × Recipes", "772 sonic references and 747 deduplicated prompt recipes."],
        ["Stems × Taiwanese", "Choose separation tools and learn from AI singing pronunciation tests."],
      ],
    };
  }
  return {
    title: "AI 音樂練功聖經",
    body: "把 Prompt、歌詞、聲音 DNA、Stem 與台語調音整理成可以搜尋、複製、反覆回來查的實戰資料庫。",
    start: "開始練功",
    listen: "先去聽歌",
    bar: "去傷心酒吧",
    marker: "實戰資料庫",
    stats: ["1,519 組可搜尋索引", "Prompt × 歌詞實戰庫", "複製、評論、共同驗證"],
    asideEyebrow: "WHAT IS INSIDE",
    asideTitle: "每次卡關，都有地方查",
    asideBody: "不用從頭讀完一整本教材，直接從你現在卡住的問題開始練。",
    cards: [
      ["Prompt × 歌詞", "曲風、唱法、段落與情緒，整理成能立刻試的招式。"],
      ["聲音 DNA × 配方", "772 組聲音參考與 747 組去重 Prompt 配方。"],
      ["Stem × 台語", "拆軌工具選擇與 AI 歌唱發音實測，少走冤枉路。"],
    ],
  };
}

function bibleShareCopyForLanguage(lang: string) {
  if (lang === "ja") {
    return {
      title: "AI音楽 実践バイブル｜AIPOGER",
      text: "Suno、Prompt、歌詞、Sonic DNAをまとめたAIPOGERの実践データベース。",
      label: "バイブルを共有",
      copiedLabel: "コピーしました",
    };
  }
  if (lang === "ko") {
    return {
      title: "AI 음악 실전 바이블｜AIPOGER",
      text: "Suno, Prompt, 가사와 Sonic DNA를 모은 AIPOGER 실전 데이터베이스입니다.",
      label: "바이블 공유",
      copiedLabel: "복사됨",
    };
  }
  if (lang === "en") {
    return {
      title: "AI Music Practice Bible | AIPOGER",
      text: "AIPOGER's searchable field database for Suno, prompts, lyrics, and Sonic DNA.",
      label: "Share Bible",
      copiedLabel: "Copied",
    };
  }
  return {
    title: "AI 音樂練功聖經｜AIPOGER 愛播歌",
    text: "AIPOGER 的 Suno、Prompt、歌詞與聲音 DNA 實戰資料庫。",
    label: "分享聖經",
    copiedLabel: "已複製",
  };
}

function bibleCommunityCopyForLanguage(lang: string) {
  if (lang === "ja") {
    return {
      eyebrow: "LINE FIELD ROOM",
      title: "LINEで実測を共有する",
      body: "Suno、Prompt、歌詞、台湾語の発音テストを持ち寄って、うまくいった条件と失敗を一緒に検証します。",
      join: "LINEコミュニティに参加",
      qr: "QRコードを表示",
      note: "バイブルで調べた内容を、実際のテスト結果と一緒にコミュニティへ戻してください。",
    };
  }
  if (lang === "ko") {
    return {
      eyebrow: "LINE FIELD ROOM",
      title: "LINE에서 실전 테스트를 나눠요",
      body: "Suno, Prompt, 가사와 대만어 발음 테스트를 가져와 성공한 조건과 실패를 함께 검증합니다.",
      join: "LINE 커뮤니티 참여",
      qr: "QR 코드 보기",
      note: "바이블에서 찾은 내용을 실제 테스트 결과와 함께 커뮤니티로 다시 가져와 주세요.",
    };
  }
  if (lang === "en") {
    return {
      eyebrow: "LINE FIELD ROOM",
      title: "Bring your tests into the room",
      body: "Share Suno, prompt, lyric, and Taiwanese pronunciation tests so the community can compare what worked and what broke.",
      join: "Join LINE community",
      qr: "Show QR code",
      note: "Look it up in the Bible, test it in your workflow, then bring the result back to the room.",
    };
  }
  return {
    eyebrow: "LINE 實測討論區",
    title: "來 LINE 一起補完這本聖經",
    body: "把 Suno、Prompt、歌詞與台語發音實測帶進來；成功與唱錯，都可以一起討論、一起驗證。",
    join: "加入 LINE 社群",
    qr: "顯示 QR code",
    note: "先在聖經查資料，再把你的實測、問題與新發現帶回社群。",
  };
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
        updated: "持續更新", enterLab: "進入 Prompt 招式庫", viewMap: "看練功地圖",
        labCount: "8 個實戰模組", seedSource: "從 Suno 起手式、疑難排解、Prompt、歌詞、聲音 DNA、Stem 到權利發行；每區都標示可靠度與更新狀態。",
        traits: ["繁中整理", "官方核對", "共同驗證"], practiceTitle: "今天要練哪一招？", practiceBody: "先選一個問題練，不必從頭把整本看完。每一區都會慢慢增加實測範例。",
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
        updated: "Living guide", enterLab: "Enter Prompt Moves", viewMap: "View practice map",
        labCount: "8 practice modules", seedSource: "Move from Suno quick start and troubleshooting through prompts, lyrics, sonic DNA, stems, and release rights with evidence status kept visible.",
        traits: ["Bilingual", "Cross-checked", "Community tested"], practiceTitle: "What do you want to practice?", practiceBody: "Pick one problem instead of reading everything in order. Each section will keep gaining tested examples.",
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
  const shareCopy = bibleShareCopyForLanguage(lang);
  const communityCopy = bibleCommunityCopyForLanguage(lang);
  const shareUrl = `/ai-music-bible?lang=${lang}`;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<TaiwaneseLyricsCategory | "全部">("全部");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ tone: "idle", message: "" });
  const [feedbackState, setFeedbackState] = useState<Record<string, "loading" | "sent" | "error">>({});
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [lineCommunityOpen, setLineCommunityOpen] = useState(false);
  const [bibleContent, setBibleContent] = useState<BibleCatalog>({
    promptMoves: [],
    lyricMoves: [],
    taiwaneseEntries: [],
  });

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setAccessState(data.session?.user ? "signedIn" : "signedOut");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAccessState(session?.user ? "signedIn" : "signedOut");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (accessState === "signedOut") setAuthPromptOpen(true);
  }, [accessState]);

  useEffect(() => {
    if (accessState !== "signedIn") return;
    let active = true;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch("/api/ai-music-bible/content", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) return;
      const payload = await response.json().catch(() => null) as Partial<BibleCatalog> | null;
      if (!active || !payload) return;
      setBibleContent((current) => ({
        promptMoves: Array.isArray(payload.promptMoves) ? payload.promptMoves : current.promptMoves,
        lyricMoves: Array.isArray(payload.lyricMoves) ? payload.lyricMoves : current.lyricMoves,
        taiwaneseEntries: Array.isArray(payload.taiwaneseEntries) ? payload.taiwaneseEntries : current.taiwaneseEntries,
        genreGroups: Array.isArray(payload.genreGroups) ? payload.genreGroups : current.genreGroups,
        productionFlow: Array.isArray(payload.productionFlow) ? payload.productionFlow : current.productionFlow,
        promptCategories: Array.isArray(payload.promptCategories) ? payload.promptCategories : current.promptCategories,
        lyricCategories: Array.isArray(payload.lyricCategories) ? payload.lyricCategories : current.lyricCategories,
        stemEngines: Array.isArray(payload.stemEngines) ? payload.stemEngines : current.stemEngines,
        stemGoals: Array.isArray(payload.stemGoals) ? payload.stemGoals : current.stemGoals,
        artistDnaEntries: Array.isArray(payload.artistDnaEntries) ? payload.artistDnaEntries : current.artistDnaEntries,
        promptRecipes: Array.isArray(payload.promptRecipes) ? payload.promptRecipes : current.promptRecipes,
        recipeGenres: Array.isArray(payload.recipeGenres) ? payload.recipeGenres : current.recipeGenres,
      }));
    })();
    return () => { active = false; };
  }, [accessState]);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return bibleContent.taiwaneseEntries.filter((entry) => {
      if (category !== "全部" && entry.category !== category) return false;
      if (!normalized) return true;
      return [entry.meaning, entry.recommended, entry.sunoWriting, entry.note, entry.category]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized);
    });
  }, [bibleContent.taiwaneseEntries, category, query]);

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

  if (accessState !== "signedIn") {
    const gateCopy = bibleGateCopyForLanguage(lang);
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] px-4 pb-20 pt-24 text-zinc-100 sm:px-6">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,106,0,0.22),transparent_32%),radial-gradient(circle_at_86%_14%,rgba(34,211,238,0.13),transparent_28%),linear-gradient(180deg,#050505_0%,#0b0806_48%,#030707_100%)]" />
        <div className="pointer-events-none fixed inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:64px_64px]" />
        <section className="relative mx-auto grid min-h-[calc(100svh-8rem)] w-full max-w-6xl place-items-center">
          {accessState === "checking" ? (
            <div className="text-center" role="status">
              <LockKeyhole className="mx-auto h-9 w-9 animate-pulse text-orange-300" />
              <p className={`${fontRighteous.className} mt-5 text-xs uppercase tracking-[0.34em] text-cyan-200/70`}>CHECKING MEMBER ACCESS</p>
              <p className="mt-3 text-sm font-black text-zinc-500">{isZh ? "正在確認會員狀態…" : "Checking member access…"}</p>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-[1.7rem] border border-orange-300/24 bg-black/62 shadow-[0_35px_120px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(21rem,0.85fr)]">
              <div className="relative px-5 py-9 sm:px-9 lg:px-12 lg:py-14">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" />
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`${fontRighteous.className} text-xs uppercase tracking-[0.34em] text-cyan-100/82`}>AIPOGER PRACTICE BIBLE</span>
                  <span className="rounded-full border border-orange-300/28 bg-orange-400/[0.09] px-3 py-1 text-[11px] font-black text-orange-100">{gateCopy.marker}</span>
                </div>
                <h1 className={`mt-6 whitespace-nowrap font-black leading-[1.02] tracking-[-0.05em] text-[#fff8ed] ${lang === "en" ? "text-[clamp(1.72rem,7.1vw,4.15rem)]" : "text-[clamp(2.05rem,7.8vw,4.15rem)]"}`}>
                  {gateCopy.title}
                </h1>
                <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-zinc-200 sm:text-lg">{gateCopy.body}</p>
                <div className="mt-7 grid gap-2 sm:grid-cols-3">
                  {gateCopy.stats.map((item) => (
                    <div key={item} className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-black text-zinc-200"><Check className="mr-2 inline h-4 w-4 text-emerald-300" />{item}</div>
                  ))}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button type="button" onClick={() => setAuthPromptOpen(true)} className="aipo-primary-button inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black">
                    <BookOpenText className="h-4 w-4" /> {gateCopy.start}
                  </button>
                  <Link href={appendLang("/ai-music", lang)} className="aipo-ghost-button inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black text-white">
                    <Headphones className="h-4 w-4" /> {gateCopy.listen}
                  </Link>
                  <Link href={appendLang("/listen-bar", lang)} className="aipo-ghost-button inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black text-white">
                    <Music2 className="h-4 w-4" /> {gateCopy.bar}
                  </Link>
                  <ShareButton
                    title={shareCopy.title}
                    text={shareCopy.text}
                    url={shareUrl}
                    label={shareCopy.label}
                    copiedLabel={shareCopy.copiedLabel}
                    className="min-h-12 border-cyan-200/25 bg-cyan-300/[0.06] px-6 text-cyan-50 hover:border-cyan-100/65 hover:bg-cyan-300/[0.12]"
                  />
                </div>
              </div>

              <aside className="border-t border-white/10 bg-[radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.12),transparent_36%),linear-gradient(145deg,rgba(255,106,0,0.09),rgba(0,0,0,0.78)_58%)] p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-9">
                <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.3em] text-orange-200/82`}>{gateCopy.asideEyebrow}</p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white">{gateCopy.asideTitle}</h2>
                <p className="mt-3 text-sm font-bold leading-7 text-zinc-300">{gateCopy.asideBody}</p>
                <div className="mt-7 grid gap-3">
                  {gateCopy.cards.map(([title, body], index) => {
                    const Icon = index === 0 ? WandSparkles : index === 1 ? LibraryBig : AudioWaveform;
                    return (
                      <div key={title} className="rounded-[1.05rem] border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-6 w-6 ${index === 1 ? "text-cyan-200" : "text-orange-200"}`} />
                          <p className="text-lg font-black text-white">{title}</p>
                        </div>
                        <p className="mt-2 text-xs font-bold leading-6 text-zinc-300">{body}</p>
                      </div>
                    );
                  })}
                </div>
              </aside>
            </div>
          )}
        </section>
        <AuthRequiredDialog
          open={authPromptOpen}
          kind="bible"
          lang={lang}
          nextPath={`/ai-music-bible?lang=${lang}`}
          onClose={() => setAuthPromptOpen(false)}
        />
      </main>
    );
  }

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
              <a href="#suno-prompt-library" className="aipo-primary-button inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black">
                {ui.enterLab} <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#practice-map" className="aipo-ghost-button inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-black text-white">
                {ui.viewMap}
              </a>
              <ShareButton
                title={shareCopy.title}
                text={shareCopy.text}
                url={shareUrl}
                label={shareCopy.label}
                copiedLabel={shareCopy.copiedLabel}
                className="min-h-12 border-cyan-200/25 bg-cyan-300/[0.06] px-6 text-cyan-50 hover:border-cyan-100/65 hover:bg-cyan-300/[0.12]"
              />
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

        <BibleCommandDock locale={isZh ? "zh" : "en"} />

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

        <section id="line-community" className="scroll-mt-24 mt-2 overflow-hidden rounded-[1.5rem] border border-[#06c755]/25 bg-[linear-gradient(135deg,rgba(6,199,85,0.12),rgba(0,0,0,0.78)_48%,rgba(34,211,238,0.07))] shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
          <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-9">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#06c755]/65 to-transparent" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#06c755]/40 bg-[#06c755]/[0.12] shadow-[0_12px_30px_rgba(6,199,85,0.16)]">
                <SocialIcon label="LINE" className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.28em] text-[#7af0a1]`}>{communityCopy.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">{communityCopy.title}</h2>
                <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-zinc-300">{communityCopy.body}</p>
              </div>
            </div>
            <div className="relative flex flex-wrap gap-2 lg:justify-end">
              <a href={AIPOGER_LINE_COMMUNITY_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#06c755] px-5 text-sm font-black text-[#031b0b] transition hover:bg-[#38df79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b6ffcb]">
                {communityCopy.join}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <button type="button" onClick={() => setLineCommunityOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#06c755]/45 bg-black/35 px-5 text-sm font-black text-[#c8ffd7] transition hover:border-[#06c755] hover:bg-[#06c755]/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06c755]">
                <QrCode className="h-4 w-4" aria-hidden="true" />
                {communityCopy.qr}
              </button>
            </div>
            <p className="relative text-xs font-bold leading-6 text-[#a7d8b4]/75 lg:col-span-2">{communityCopy.note}</p>
          </div>
        </section>

        <LineCommunityDialog open={lineCommunityOpen} onClose={() => setLineCommunityOpen(false)} lang={lang as "zh" | "en" | "ja" | "ko"} />

        <SunoReferenceGuideSection locale={isZh ? "zh" : "en"} />

        <div className="mt-10">
          <SunoPracticeLibrarySection
          locale={isZh ? "zh" : "en"}
          promptMoves={bibleContent.promptMoves}
          lyricMoves={bibleContent.lyricMoves}
          genreGroups={bibleContent.genreGroups ?? []}
          productionFlow={bibleContent.productionFlow ?? []}
          promptCategories={bibleContent.promptCategories ?? []}
          lyricCategories={bibleContent.lyricCategories ?? []}
          artistDnaEntries={bibleContent.artistDnaEntries ?? []}
          promptRecipes={bibleContent.promptRecipes ?? []}
          recipeGenres={bibleContent.recipeGenres ?? []}
          />
        </div>

        <div className="mt-10">
          <StemSeparationGuideSection locale={isZh ? "zh" : "en"} engines={bibleContent.stemEngines ?? []} goals={bibleContent.stemGoals ?? []} />
        </div>

        <section id="taiwanese-lab" className="mt-10 scroll-mt-20 overflow-hidden rounded-[1.6rem] border border-orange-300/22 bg-[#070707]/90 shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
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
              <p className="text-right text-xs font-black tracking-[0.12em] text-zinc-600">{ui.showing} {filteredEntries.length} / {bibleContent.taiwaneseEntries.length}</p>
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
