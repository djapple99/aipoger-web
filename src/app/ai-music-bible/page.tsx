import type { Metadata } from "next";
import AiMusicBiblePage from "@/components/ai-music-bible-page";

type PageProps = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const localized = lang === "ja"
    ? {
        title: "AI音楽 実践バイブル｜Suno Sonic DNA・Prompt・歌詞",
        description: "771件のSonic DNA、747件の重複なしPrompt、歌詞制御、台湾語の発音、AI Stem分離、制作フローを検索できる実践データベースです。",
      }
    : lang === "ko"
      ? {
          title: "AI 음악 실전 바이블｜Suno Sonic DNA·Prompt·가사",
          description: "Sonic DNA 771개, 중복 제거 Prompt 747개, 가사 제어, 대만어 발음, AI Stem 분리와 제작 흐름을 검색할 수 있는 실전 데이터베이스입니다.",
        }
      : lang === "en"
        ? {
            title: "AI Music Practice Bible | Suno Sonic DNA, Prompts, and Lyrics",
            description: "AIPOGER's living field guide with 771 sonic DNA references, 747 unique prompt recipes, lyric control, Taiwanese pronunciation, AI stem separation, and production workflows.",
          }
        : {
            title: "AI 音樂練功聖經｜Suno 聲音 DNA、Prompt 索引與歌詞調教",
            description: "AIPOGER 的 AI 音樂實戰資料庫：771 組聲音 DNA、747 組去重 Prompt 配方、歌詞控制、台語調音、AI Stem 拆軌與製作流程。",
          };

  return {
    ...localized,
    alternates: { canonical: "/ai-music-bible" },
    openGraph: { ...localized, url: "/ai-music-bible" },
  };
}

export default function Page() {
  return <AiMusicBiblePage />;
}
