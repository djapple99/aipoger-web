import type { Metadata } from "next";
import AiMusicBiblePage from "@/components/ai-music-bible-page";

type PageProps = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const isZh = !lang || lang === "zh";
  const title = isZh
    ? "AI 音樂練功聖經｜Stem 拆軌、Suno 歌詞與 Prompt 實戰資料庫"
    : "AI Music Practice Bible｜Stem Separation, Suno Lyrics, and Prompts";
  const description = isZh
    ? "AIPOGER 的 AI 音樂實戰資料庫：AI Stem 拆軌引擎、Suno 台語歌詞調音、Prompt、Drop、版權與愛波哥教學。"
    : "AIPOGER's living field guide for AI stem separation engines, Suno, Taiwanese lyrics, prompts, Drops, and rights.";

  return {
    title,
    description,
    alternates: { canonical: "/ai-music-bible" },
    openGraph: { title, description, url: "/ai-music-bible" },
  };
}

export default function Page() {
  return <AiMusicBiblePage />;
}
