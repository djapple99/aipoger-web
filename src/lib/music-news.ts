import type { Lang } from "@/lib/locale";

// Public editorial catalog. Add only reviewed articles here; drafts never enter
// the home shelf, public index, metadata or sitemap.
export type MusicNews = {
  slug: string; title: string; summary: string; category: string;
  deck: string; coverCaption: string; sources: readonly { label: string; url: string }[];
  publishedOn: string; eventOn: string; verifiedOn: string; sourceNote?: string;
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
}, {
  slug: "sba-creator-small-business-guidance", published: true, language: "zh-Hant",
  title: "創作者也是老闆：美國 SBA 釐清影音創作者的小企業分類",
  summary: "美國 SBA 釐清影音創作者的事業分類。這次改了什麼、和貸款補助有何差別？從 MV、音樂教學到頻道經營，整理創作帳本可以先做這三件事。",
  category: "創作者經營", publishedOn: "2026-10-27", eventOn: "2026-10-15", verifiedOn: "2026-10-27",
  cover: "/news/sba-creator-small-business-guidance.png",
  coverAlt: "AIPOGER 原創圖解：影音創作者以作品、收入與合約建立自己的事業紀錄",
  coverCaption: "圖／AIPOGER 原創概念圖，非 SBA 文件或申請介面",
  deck: "做歌、剪 MV、經營頻道，幕後還有報價、合約與帳本。美國這次把分類說清楚，我們也來把自己的創作事業整理清楚。",
  sources: [
    { label: "SBA 官方公告：創作者事業分類指引（2026-10-15）", url: "https://legacy.sba.gov/article/2026/10/15/sba-issues-historic-guidance-recognize-americas-content-creator-economy" },
    { label: "SBA：Grants，補助的用途與限制（2026-10-27 查核）", url: "https://www.sba.gov/loans/additional-funding-opportunities/grants/" },
    { label: "美國勞工統計局：NAICS 5121 影音與 5122 錄音產業分類", url: "https://www.bls.gov/iag/tgs/iag512.htm" },
    { label: "Inc.：SBA 新指引與創作者融資（2026-10-26）", url: "https://www.inc.com/melissa-angell/are-you-a-content-creator-heres-how-the-sbas-new-guidance-could-help-you-get-funding/91422681" },
  ],
}, {
  slug: "deezer-ai-music-search-toggle", published: true, language: "zh-Hant",
  title: "Deezer 再確認年底前推出 AI 音樂搜尋開關：上架、推薦、被找到，是三件事",
  summary: "Deezer 10 月 27 日重申 AI 音樂搜尋開關預計年底前推出，尚未確認上線。開關針對全 AI 生成內容；上架、推薦與搜尋可見度，要分開理解。",
  category: "發行與曝光", publishedOn: "2026-10-28", eventOn: "2026-10-27", verifiedOn: "2026-10-28",
  cover: "/news/deezer-ai-music-search-toggle.png",
  coverAlt: "AIPOGER 原創概念圖：曲庫、推薦與搜尋是三個不同的作品曝光層次",
  coverCaption: "圖／AIPOGER 原創概念圖，非 Deezer 產品介面",
  deck: "歌上了架，不代表每個人都會看見。Deezer 再次確認搜尋過濾計畫，先把三層曝光拆清楚。",
  sources: [
    { label: "Deezer 官方 Q3 公告：重申 AI 搜尋開關預計年底前推出（2026-10-27）", url: "https://newsroom-deezer.com/2026/10/deezer-delivers-second-consecutive-quarter-of-revenue-growth-and-upgrades-its-fy26-outlook/" },
    { label: "Deezer 官方功能公告與 FAQ：AI music toggle（2026-10-13）", url: "https://newsroom-deezer.com/2026/10/deezer-ai-music-toggle/" },
    { label: "MBW：Deezer Q3 報導，本文議題發現來源（2026-10-27）", url: "https://www.musicbusinessworldwide.com/deezer-raises-2026-outlook-as-q3-revenues-grow-1-8-yoy-to-149-5m-but-total-subscribers-fall-to-8-7m/" },
  ],
}, {
  slug: "easol-teammates-festival-ai-agents", published: true, language: "zh-Hant",
  title: "Easol 把 AI 放進音樂節後台：客服、套票與加購怎麼運作，主辦人該守住哪些權限？",
  summary: "Easol Teammates 把 AI 接進活動營運。人工核准怎麼做、平台與 AI 費用怎麼算？從音樂節實例到繁中、幣別與票務串接，主辦人先看這幾個關卡。",
  category: "創作者經營", publishedOn: "2026-10-29", eventOn: "2026-10-28", verifiedOn: "2026-10-29",
  cover: "/news/easol-festival-ai-approval.png",
  coverAlt: "AIPOGER 原創概念圖：AI 提案、主辦人核准與營運執行的交棒流程",
  coverCaption: "圖／AIPOGER 原創營運分工示意，非 Easol 產品介面",
  deck: "開演前訊息塞滿、套票又有變更，AI 能幫哪一段？先看工作流程，再把批准權與總成本問清楚。",
  sources: [
    { label: "Easol 公司公告（PR Newswire，2026-10-28 11:00 ET）", url: "https://www.prnewswire.com/news-releases/experience-commerce-platform-easol-raises-30-million-launches-total-ai-solution-for-experience-businesses-302921596.html" },
    { label: "Easol：Teammates 官方產品頁（2026-10-29 查核）", url: "https://easol.com/teammates/" },
    { label: "Easol：Easol Agent 官方說明（2026-10-29 查核）", url: "https://easol.com/teammates/easol-agent/" },
    { label: "Easol：Sales Agent 官方說明（2026-10-29 查核）", url: "https://easol.com/teammates/sales-agent/" },
    { label: "Easol：Support Agent 官方說明（2026-10-29 查核）", url: "https://easol.com/teammates/support-agent/" },
    { label: "Easol Newsroom：官方收錄（2026-10-29 查核）", url: "https://easol.com/newsroom/" },
    { label: "MBW：Easol 與音樂節 AI 代理，本文議題發現來源（2026-10-28）", url: "https://www.musicbusinessworldwide.com/event-tech-startup-easol-secures-30m-in-new-funding-launches-ai-agents-for-festival-promoters/" },
    { label: "Easol Help：Support Agent 操作與人工批准（2026-10-29 查核）", url: "https://support.easol.com/hc/en-gb/articles/49952471969937-Teammates-Support-Agent" },
    { label: "Easol：Boots in the Park 音樂節案例（2026-10-29 查核）", url: "https://easol.com/case-study/boots-in-the-park/" },
    { label: "Easol：Pricing 平台方案（2026-10-29 查核）", url: "https://easol.com/pricing/" },
    { label: "Easol Help：Agent Resolved 案件與計費（2026-10-29 查核）", url: "https://support.easol.com/hc/en-gb/articles/49952739442833-Agent-Resolved-tickets-and-billing" },
    { label: "Easol Help：顧客顯示與付款幣別（2026-10-29 查核）", url: "https://support.easol.com/hc/en-gb/articles/11430937653521-What-currency-will-my-customers-see-on-my-website" },
    { label: "Easol Help：網站與帳戶多語翻譯（2026-10-29 查核）", url: "https://support.easol.com/hc/en-gb/articles/21902683536657-Multi-language-website-translations" },
    { label: "Easol：Creator Terms（2026-10-29 查核，既有條款背景）", url: "https://easol.com/creator-terms/" },
  ],
}, {
  slug: "prs-soundtrack-uk-play-data-royalties", published: true, language: "zh-Hant",
  title: "店裡播了什麼歌，版稅就更有依據：PRS 將導入約 7,000 個英國場所的播放紀錄",
  summary: "據公開新聞稿及 MBW，PRS 計畫 12 月起採用 Soundtrack 英國場所播放資料。使用紀錄如何對上詞曲權利？分清 PRS、PPL 與這次合作的範圍。",
  category: "創作者權益", publishedOn: "2026-10-29", eventOn: "2026-10-28", verifiedOn: "2026-10-29",
  cover: "/news/prs-soundtrack-uk-play-data-royalties.png",
  coverAlt: "AIPOGER 原創概念圖：商業場所播放紀錄、權利匹配與版稅分配的資料連結",
  coverCaption: "圖／AIPOGER 原創資料流程示意，非 PRS 或 Soundtrack 介面",
  deck: "一首歌在店裡響起，後續資料要怎麼接？這次合作擴大英國場所紀錄，我們把權利與分配的界線拆清楚。",
  sourceNote: "合作消息據公開新聞稿重刊及 MBW 報導，權利背景另核官方說明；未在雙方官網找到本次公告，不把同源報導當獨立查證。事實與本站觀點分別呈現。",
  sources: [
    { label: "Record of the Day：合作新聞稿公開重刊（2026-10-28，標示 Press release）", url: "https://www.recordoftheday.com/news-and-press/prs-for-music-and-soundtrack-partner-to-improve-distribution-of-public-performance-royalties" },
    { label: "MBW：PRS × Soundtrack 合作報導（2026-10-28）", url: "https://www.musicbusinessworldwide.com/prs-for-music-partners-with-b2b-streaming-service-soundtrack-to-get-data-on-music-played-in-7000-uk-shops-bars-and-public-spaces-and-pay-royalties-accordingly/" },
    { label: "PPL PRS：Where does the money go? 權利與分配背景（2026-10-29 查核）", url: "https://pplprs.co.uk/themusiclicence/music-licence-cost/where-does-the-money-go/" },
    { label: "PRS for Music：About PPL（2026-10-29 查核）", url: "https://www.prsformusic.com/what-we-do/ppl" },
    { label: "PRS for Music：Register your music 作品登記（2026-10-29 查核）", url: "https://www.prsformusic.com/music-and-royalties/register-and-manage-music/register-your-works" },
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
  zh: { popular: "熱門新聞", catalog: "所有文章", newest: "最新發布", popularOrder: "按讚＋留言排序 · 同分以最新優先", popularEmpty: "尚無互動，先看最新文章", popularUnavailable: "熱門資料暫時無法讀取，先看最新文章", title: "音樂新聞", latest: "最新音樂新聞", intro: "先講重點，再聊創作。", description: "AI 音樂工具、創作者權益、發行與曝光，以及作品背後的人與故事。", all: "查看全部", read: "閱讀文章", back: "返回音樂新聞", language: "繁體中文", languageNote: "本文以繁體中文撰寫。", published: "發布", event: "事件", verified: "查核", author: "愛波哥・AIPOGER", minutes: "約 5 分鐘", sources: "查核來源", share: "分享文章" },
  en: { popular: "Popular news", catalog: "All articles", newest: "Newest first", popularOrder: "Likes + comments · Newest breaks ties", popularEmpty: "No interactions yet. Showing the latest articles.", popularUnavailable: "Popularity unavailable. Showing the latest articles.", title: "Music News", latest: "Latest Music News", intro: "The essentials first. Then the creator’s perspective.", description: "AI music tools, creator rights, music releases and the people behind the work.", all: "All articles", read: "Read article", back: "Back to Music News", language: "Traditional Chinese", languageNote: "This article is currently available in Traditional Chinese.", published: "Published", event: "Event", verified: "Checked", author: "Apple・AIPOGER", minutes: "5 min read", sources: "Sources", share: "Share article" },
  ja: { popular: "人気ニュース", catalog: "すべての記事", newest: "新着順", popularOrder: "いいね＋コメント順・同数なら新着順", popularEmpty: "まだ反応がないため、新着順で表示", popularUnavailable: "人気情報を取得できないため、新着順で表示", title: "音楽ニュース", latest: "最新の音楽ニュース", intro: "まず要点を。その先を、作り手の目線で。", description: "AI音楽ツール、クリエイターの権利、楽曲の発表、作品を生む人のストーリー。", all: "記事一覧", read: "記事を読む", back: "音楽ニュースに戻る", language: "繁体字中国語", languageNote: "この記事の本文は現在、繁体字中国語で提供しています。", published: "公開", event: "出来事", verified: "確認", author: "愛波哥・AIPOGER", minutes: "約5分", sources: "参照元", share: "記事をシェア" },
  ko: { popular: "인기 뉴스", catalog: "전체 기사", newest: "최신순", popularOrder: "좋아요 + 댓글순 · 동점이면 최신순", popularEmpty: "아직 반응이 없어 최신순으로 표시해요", popularUnavailable: "인기 정보를 불러올 수 없어 최신순으로 표시해요", title: "음악 뉴스", latest: "최신 음악 뉴스", intro: "핵심부터, 그리고 창작자의 시선으로.", description: "AI 음악 도구, 창작자 권리, 음원 발매와 작품 뒤의 사람들에 관한 이야기.", all: "전체 기사", read: "기사 읽기", back: "음악 뉴스로 돌아가기", language: "번체 중국어", languageNote: "이 기사의 본문은 현재 번체 중국어로 제공됩니다.", published: "게시", event: "발표", verified: "확인", author: "愛波哥・AIPOGER", minutes: "약 5분", sources: "출처", share: "기사 공유" },
} as const;
