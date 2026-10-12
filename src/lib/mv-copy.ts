import type { Lang } from "./locale";

const zh = {
  metaTitle: "AIPOGER 愛播歌｜值得一看的 MV", metaDescription: "集中探索 AI 創作者已投稿的 MV，觀看 YouTube 影片，分享評論與愛心支持，尋找本週社群精選。",
  title: "值得一看的 MV", more: "更多 MV", all: "全部曲風", latest: "最新投稿", support: "本週支持",
  search: "搜尋作品或創作者", clear: "清除搜尋", count: "支 MV", noResults: "還沒有符合的 MV。", reset: "重設篩選",
  loadMore: "載入更多", channels: "創作者提供的頻道", channelNote: "這些作品附的是頻道連結，進去找找更多音樂。", openChannel: "前往頻道",
  yourMv: "讓你的 MV 被看見", submitNote: "在自己的音樂作品加入 YouTube 影片連結，就會一起出現在這裡。", myWorks: "管理我的作品",
};
type MvCopy = { [K in keyof typeof zh]: string };
const copies: Record<Lang, MvCopy> = {
  zh,
  en: {
    metaTitle: "AIPOGER | MVs Worth Watching", metaDescription: "Explore MVs submitted by AI creators, watch their YouTube videos, share comments and support, and discover this week's community picks.",
    title: "MVs worth watching", more: "More MVs", all: "All genres", latest: "Latest submissions", support: "This week's support",
    search: "Search works or creators", clear: "Clear search", count: "MVs", noResults: "No MVs match yet.", reset: "Reset filters",
    loadMore: "Load more", channels: "Channels shared by creators", channelNote: "These works include channel links. Visit to discover more music.", openChannel: "Visit channel",
    yourMv: "Bring your MV into the spotlight", submitNote: "Add a YouTube video link to your own music submission to appear here.", myWorks: "Manage my works",
  },
  ja: {
    metaTitle: "AIPOGER｜観てほしい MV", metaDescription: "AIクリエイターが投稿したMVを探し、YouTube動画を観てコメントや応援を届けよう。今週のコミュニティ推薦作品にも出会えます。",
    title: "観てほしい MV", more: "もっと MV を探す", all: "すべてのジャンル", latest: "新しい投稿", support: "今週の応援",
    search: "作品やクリエイターを検索", clear: "検索をクリア", count: "本の MV", noResults: "条件に合う MV はまだありません。", reset: "絞り込みをリセット",
    loadMore: "もっと見る", channels: "クリエイターが紹介するチャンネル", channelNote: "こちらの作品にはチャンネルへのリンクが添えられています。さらに音楽を探してみよう。", openChannel: "チャンネルへ",
    yourMv: "あなたの MV を届けよう", submitNote: "自分の音楽作品に YouTube 動画リンクを追加すると、ここにも表示されます。", myWorks: "自分の作品を管理",
  },
  ko: {
    metaTitle: "AIPOGER | 볼 만한 MV", metaDescription: "AI 크리에이터가 제출한 MV를 탐색하고 YouTube 영상을 감상하며 댓글과 응원을 나누세요. 이번 주 커뮤니티 추천작도 만나보세요.",
    title: "볼 만한 MV", more: "더 많은 MV", all: "모든 장르", latest: "최신 제출작", support: "이번 주 응원",
    search: "작품 또는 크리에이터 검색", clear: "검색 지우기", count: "개의 MV", noResults: "조건에 맞는 MV가 아직 없어요.", reset: "필터 초기화",
    loadMore: "더 보기", channels: "크리에이터가 공유한 채널", channelNote: "이 작품들은 채널 링크를 제공합니다. 방문해 더 많은 음악을 찾아보세요.", openChannel: "채널 방문",
    yourMv: "당신의 MV를 알리세요", submitNote: "내 음악 작품에 YouTube 영상 링크를 추가하면 여기에 함께 표시됩니다.", myWorks: "내 작품 관리",
  },
};
export const mvCopy = (lang: Lang) => copies[lang];
