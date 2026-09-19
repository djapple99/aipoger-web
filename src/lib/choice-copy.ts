import type { Lang } from "@/lib/locale";

export type ChoiceCopy = {
  dateLocale: string;
  loading: string;
  notFound: string;
  loadFailed: string;
  backToShowtime: string;
  playAll: string;
  favoriteChoice: string;
  removeChoice: string;
  comments: string;
  viewComments: string;
  shareChoice: string;
  copied: string;
  curatedBy: string;
  playlist: string;
  selection: string;
  works: string;
  tracklist: string;
  openTracklist: string;
  closeTracklist: string;
  tracklistPreview: string;
  previewTracklist: string;
  hoverToPreview: string;
  buildMyChoice: string;
  noPublished: string;
  openSharePage: string;
  playTrack: (title: string) => string;
  favoriteTrack: (title: string) => string;
  removeTrack: (title: string) => string;
  choiceDescription: (curator: string) => string;
  favoriteFailed: string;
  trackFavoriteFailed: string;
};

const COPY: Record<Lang, ChoiceCopy> = {
  zh: {
    dateLocale: "zh-TW",
    loading: "正在開啟 Choice...",
    notFound: "找不到這份 Choice。",
    loadFailed: "Choice 暫時無法讀取。",
    backToShowtime: "回到 Showtime",
    playAll: "全部播放",
    favoriteChoice: "收藏 Choice",
    removeChoice: "取消收藏 Choice",
    comments: "評論",
    viewComments: "查看 Choice 評論",
    shareChoice: "分享 Choice",
    copied: "已複製",
    curatedBy: "策展",
    playlist: "PLAYLIST",
    selection: "選曲",
    works: "首作品",
    tracklist: "曲目",
    openTracklist: "開啟曲目清單",
    closeTracklist: "關閉曲目清單",
    tracklistPreview: "Choice 歌單預覽",
    previewTracklist: "預覽歌單",
    hoverToPreview: "移到這裡預覽歌單",
    buildMyChoice: "建立我的 Choice",
    noPublished: "目前還沒有已發布的 Choice。",
    openSharePage: "開啟完整分享頁",
    playTrack: (title) => `播放 ${title}`,
    favoriteTrack: (title) => `收藏 ${title}`,
    removeTrack: (title) => `取消收藏 ${title}`,
    choiceDescription: (curator) => `${curator} 的 Choice`,
    favoriteFailed: "收藏失敗，請稍後再試。",
    trackFavoriteFailed: "歌曲收藏失敗，請稍後再試。",
  },
  en: {
    dateLocale: "en-US",
    loading: "Opening Choice...",
    notFound: "This Choice could not be found.",
    loadFailed: "Choice is temporarily unavailable.",
    backToShowtime: "Back to Showtime",
    playAll: "Play all",
    favoriteChoice: "Save Choice",
    removeChoice: "Remove Choice",
    comments: "Comments",
    viewComments: "View Choice comments",
    shareChoice: "Share Choice",
    copied: "Copied",
    curatedBy: "Curated by",
    playlist: "PLAYLIST",
    selection: "Playlist",
    works: "tracks",
    tracklist: "Tracklist",
    openTracklist: "Open tracklist",
    closeTracklist: "Close tracklist",
    tracklistPreview: "Choice playlist preview",
    previewTracklist: "Preview tracklist",
    hoverToPreview: "Hover to preview tracklist",
    buildMyChoice: "Build My Choice",
    noPublished: "No published Choice playlists yet.",
    openSharePage: "Open full share page",
    playTrack: (title) => `Play ${title}`,
    favoriteTrack: (title) => `Favorite ${title}`,
    removeTrack: (title) => `Remove ${title} from favorites`,
    choiceDescription: (curator) => `${curator}'s Choice`,
    favoriteFailed: "Saving failed. Try again later.",
    trackFavoriteFailed: "Saving the track failed. Try again later.",
  },
  ja: {
    dateLocale: "ja-JP",
    loading: "Choiceを開いています…",
    notFound: "このChoiceが見つかりません。",
    loadFailed: "Choiceを読み込めません。",
    backToShowtime: "Showtimeに戻る",
    playAll: "すべて再生",
    favoriteChoice: "Choiceを保存",
    removeChoice: "Choiceの保存を解除",
    comments: "コメント",
    viewComments: "Choiceのコメントを見る",
    shareChoice: "Choiceを共有",
    copied: "コピーしました",
    curatedBy: "キュレーター",
    playlist: "PLAYLIST",
    selection: "プレイリスト",
    works: "曲",
    tracklist: "曲目",
    openTracklist: "曲目リストを開く",
    closeTracklist: "曲目リストを閉じる",
    tracklistPreview: "Choiceプレイリストのプレビュー",
    previewTracklist: "曲目リストをプレビュー",
    hoverToPreview: "ここにカーソルを置いて曲目をプレビュー",
    buildMyChoice: "My Choiceを作る",
    noPublished: "公開済みのChoiceはまだありません。",
    openSharePage: "共有ページを開く",
    playTrack: (title) => `${title}を再生`,
    favoriteTrack: (title) => `${title}を保存`,
    removeTrack: (title) => `${title}の保存を解除`,
    choiceDescription: (curator) => `${curator}のChoice`,
    favoriteFailed: "保存に失敗しました。後でもう一度お試しください。",
    trackFavoriteFailed: "曲の保存に失敗しました。後でもう一度お試しください。",
  },
  ko: {
    dateLocale: "ko-KR",
    loading: "Choice를 여는 중…",
    notFound: "이 Choice를 찾을 수 없습니다.",
    loadFailed: "Choice를 불러올 수 없습니다.",
    backToShowtime: "Showtime으로 돌아가기",
    playAll: "전체 재생",
    favoriteChoice: "Choice 저장",
    removeChoice: "Choice 저장 취소",
    comments: "댓글",
    viewComments: "Choice 댓글 보기",
    shareChoice: "Choice 공유",
    copied: "복사됨",
    curatedBy: "큐레이터",
    playlist: "PLAYLIST",
    selection: "플레이리스트",
    works: "곡",
    tracklist: "트랙리스트",
    openTracklist: "트랙리스트 열기",
    closeTracklist: "트랙리스트 닫기",
    tracklistPreview: "Choice 플레이리스트 미리보기",
    previewTracklist: "트랙리스트 미리보기",
    hoverToPreview: "여기에 올려 트랙리스트 미리보기",
    buildMyChoice: "내 Choice 만들기",
    noPublished: "공개된 Choice가 아직 없습니다.",
    openSharePage: "전체 공유 페이지 열기",
    playTrack: (title) => `${title} 재생`,
    favoriteTrack: (title) => `${title} 저장`,
    removeTrack: (title) => `${title} 저장 취소`,
    choiceDescription: (curator) => `${curator}의 Choice`,
    favoriteFailed: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    trackFavoriteFailed: "곡을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  },
};

export function getChoiceCopy(lang: Lang) {
  return COPY[lang] ?? COPY.en;
}

