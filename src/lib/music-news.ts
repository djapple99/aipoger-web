import type { Lang } from "@/lib/locale";

// Public editorial catalog. Add only reviewed articles here; drafts never enter
// the home shelf, public index, metadata or sitemap.
export type MusicNews = {
  slug: string; title: string; summary: string; category: string;
  deck: string; coverCaption: string; sources: readonly { label: string; url: string }[];
  publishedOn: string; eventOn: string; verifiedOn: string;
  language: "zh-Hant"; cover: string; coverAlt: string; published: boolean;
};
const catalog: readonly MusicNews[] = [{
  slug: "youtube-music-ai-labels", published: true, language: "zh-Hant",
  title: "YouTube Music 開始標示 AI 歌曲：Suno 創作者上架前要注意什麼？",
  summary: "AI 歌曲開始有製作標示。哪些情況要申報、標示與營利資格有何關係？愛波哥先講重點，再陪你把規則看懂。",
  category: "發行與曝光", publishedOn: "2026-10-26", eventOn: "2026-10-14", verifiedOn: "2026-10-26",
  cover: "/news/youtube-music-ai-labels.png",
  coverAlt: "AIPOGER 原創圖解：AI 音樂、製作資訊與清楚揭露",
  deck: "先講重點，再陪你把規則看懂。創作已經夠燒腦，填資料就別再猜謎。",
  coverCaption: "圖／AIPOGER 原創概念圖，非 YouTube 實際介面",
  sources: [
    { label: "YouTube 官方公告：YouTube Music adds new labels for AI music", url: "https://blog.youtube/news-and-events/youtube-music-ai-labels/" },
    { label: "YouTube Help：Disclose Gen AI usage for music content", url: "https://support.google.com/youtube/answer/17124251" },
    { label: "YouTube Help：Disclosing use of GenAI content", url: "https://support.google.com/youtube/answer/14328491" },
  ],
}, {
  slug: "suno-reservoir-lawsuit-commercial-rights", published: true, language: "zh-Hant",
  title: "Suno 再遭版權起訴：平台訓練爭議，和你的歌曲商用權有何不同？",
  summary: "Reservoir 對 Suno 提起新訴訟。平台如何訓練、使用者獲得哪些商用許可、作品能否受著作權保護，分三層看懂。",
  category: "創作者權益", publishedOn: "2026-10-26", eventOn: "2026-10-21", verifiedOn: "2026-10-26",
  cover: "/news/suno-reservoir-lawsuit-commercial-rights.png",
  coverAlt: "AIPOGER 原創圖解：平台訓練、商用許可與作品著作權三個層次",
  coverCaption: "圖／AIPOGER 原創概念圖，非判決或法律文件",
  deck: "看到平台被告，先別急著刪歌；看到付費收據，也先別當成萬用通行證。我們把三件事拆開看。",
  sources: [
    { label: "Reservoir v. Suno 起訴狀（2026-10-21，MBW 提供的公開 PDF）", url: "https://www.musicbusinessworldwide.com/files/2026/10/Reservoir-vs-Suno-2.pdf" },
    { label: "Justia：Reservoir v. Suno 公開案件登錄（26-cv-12305）", url: "https://dockets.justia.com/docket/california/candce/5:2026cv12305/481740" },
    { label: "Suno：Terms of Service（2026-09-03 生效版本）", url: "https://suno.com/terms" },
    { label: "Suno Help：What rights do I have with a paid subscription?（2026-09-03 更新）", url: "https://help.suno.com/en/articles/9601665" },
    { label: "美國著作權局：2025-01-29 AI 產出著作權報告公告", url: "https://www.copyright.gov/newsnet/2025/1060.html" },
  ],
}, {
  slug: "spotify-believe-licensed-ai-remixes", published: true, language: "zh-Hant",
  title: "Spotify × Believe 聯手做 AI 翻唱、混音：誰授權、誰分潤？",
  summary: "Spotify 與 Believe 宣布授權 AI 翻唱、混音合作。工具仍待推出，創作者須分階段選擇參與；分潤與控制權有哪些事要先問清楚？",
  category: "產業與機會", publishedOn: "2026-10-26", eventOn: "2026-10-20", verifiedOn: "2026-10-26",
  cover: "/news/spotify-believe-licensed-ai-remixes.png",
  coverAlt: "AIPOGER 原創圖解：創作者選擇授權、歌迷改編與連回原曲",
  coverCaption: "圖／AIPOGER 原創概念圖，非 Spotify 功能畫面",
  deck: "歌迷可以玩改編，原創作者也要有得選、有得賺。方向值得看，分帳那一頁更值得看。",
  sources: [
    { label: "Spotify 官方公告：Believe and Spotify Partner…（2026-10-20）", url: "https://newsroom.spotify.com/2026-10-20/believe-spotify-licensing-agreement-fan-made-covers-remixes/" },
    { label: "Believe 官方新聞稿：Licensed Fan Remixes and Covers（2026-10-20）", url: "https://www.believe.com/press-release/believe-and-spotify-partner-to-unlock-new-opportunities-for-artists-through-licensed-fan-remixes-and-covers/" },
  ],
}];
export function publishedMusicNews(): MusicNews[] {
  return catalog.filter(article => article.published).sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || a.slug.localeCompare(b.slug));
}
export function musicNewsArticle(slug: string) { return publishedMusicNews().find(article => article.slug === slug); }
export function musicNewsHref(article: Pick<MusicNews, "slug">, lang: Lang = "zh") {
  return `/news/${encodeURIComponent(article.slug)}?lang=${lang}`;
}
// Kept for the original YouTube body; detail pages use their own source list.
export const musicNewsSources = catalog[0].sources;

export const musicNewsCopy = {
  zh: { title: "音樂新聞", latest: "最新音樂新聞", intro: "先講重點，再聊創作。", description: "AI 音樂工具、創作者權益、發行與曝光，以及作品背後的人與故事。", all: "查看全部", read: "閱讀文章", back: "返回音樂新聞", language: "繁體中文", languageNote: "本文以繁體中文撰寫。", published: "發布", event: "事件", verified: "查核", author: "愛波哥・AIPOGER", minutes: "約 5 分鐘", sources: "查核來源", share: "分享文章" },
  en: { title: "Music News", latest: "Latest Music News", intro: "The essentials first. Then the creator’s perspective.", description: "AI music tools, creator rights, music releases and the people behind the work.", all: "All articles", read: "Read article", back: "Back to Music News", language: "Traditional Chinese", languageNote: "This article is currently available in Traditional Chinese.", published: "Published", event: "Event", verified: "Checked", author: "Apple・AIPOGER", minutes: "5 min read", sources: "Sources", share: "Share article" },
  ja: { title: "音楽ニュース", latest: "最新の音楽ニュース", intro: "まず要点を。その先を、作り手の目線で。", description: "AI音楽ツール、クリエイターの権利、楽曲の発表、作品を生む人のストーリー。", all: "記事一覧", read: "記事を読む", back: "音楽ニュースに戻る", language: "繁体字中国語", languageNote: "この記事の本文は現在、繁体字中国語で提供しています。", published: "公開", event: "出来事", verified: "確認", author: "愛波哥・AIPOGER", minutes: "約5分", sources: "参照元", share: "記事をシェア" },
  ko: { title: "음악 뉴스", latest: "최신 음악 뉴스", intro: "핵심부터, 그리고 창작자의 시선으로.", description: "AI 음악 도구, 창작자 권리, 음원 발매와 작품 뒤의 사람들에 관한 이야기.", all: "전체 기사", read: "기사 읽기", back: "음악 뉴스로 돌아가기", language: "번체 중국어", languageNote: "이 기사의 본문은 현재 번체 중국어로 제공됩니다.", published: "게시", event: "발표", verified: "확인", author: "愛波哥・AIPOGER", minutes: "약 5분", sources: "출처", share: "기사 공유" },
} as const;
