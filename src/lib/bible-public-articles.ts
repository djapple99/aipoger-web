import { PUBLIC_BIBLE_FAQ } from "@/lib/suno-reference-guide";
import type { Lang } from "@/lib/locale";

// Only the existing public starter is indexed. The member catalog is never
// imported, serialized, or expanded here.
export const BIBLE_PUBLIC_SLUGS = ["style-lyrics-title", "short-prompts", "section-labels", "commercial-use", "compare-versions"] as const;
export function publicBibleArticles(lang: Lang) {
  return BIBLE_PUBLIC_SLUGS.map((slug, index) => ({ slug, title: PUBLIC_BIBLE_FAQ[lang][index].question,
    summary: PUBLIC_BIBLE_FAQ[lang][index].answer, englishTitle: PUBLIC_BIBLE_FAQ.en[index].question }));
}
export function publicBibleArticle(slug: string, lang: Lang) {
  return publicBibleArticles(lang).find(article => article.slug === slug) ?? null;
}
export const biblePublicCopy = {
  zh: { title: "公開教學導讀", intro: "先讀一個觀念，再回到你的作品試一次。完整招式與配方索引在會員聖經裡。", read: "閱讀導讀", member: "開啟會員練功聖經", back: "回到創作聖經", note: "這是公開導讀。完整招式、配方與搜尋資料庫需登入。" },
  en: { title: "Public practice guides", intro: "Pick one idea, then try it on your track. The complete moves and recipe library are inside the member Bible.", read: "Read guide", member: "Open the member Practice Bible", back: "Back to Creation Bible", note: "This is a public introduction. Sign in for the complete moves, recipes, and searchable library." },
  ja: { title: "公開ガイド", intro: "一つの考え方を読んだら、自分の曲で試してみましょう。技法とレシピの完全版は会員向けバイブルで読めます。", read: "ガイドを読む", member: "会員向け実践バイブルを開く", back: "創作バイブルに戻る", note: "こちらは公開ガイドです。技法・レシピ・検索ライブラリの完全版にはログインが必要です。" },
  ko: { title: "공개 실전 가이드", intro: "한 가지 개념을 읽고 자신의 곡에 적용해 보세요. 전체 기법과 레시피는 회원용 바이블에서 볼 수 있습니다.", read: "가이드 읽기", member: "회원용 실전 바이블 열기", back: "창작 바이블로 돌아가기", note: "공개 입문 가이드입니다. 전체 기법, 레시피와 검색 라이브러리는 로그인 후 이용할 수 있습니다." },
} as const;
