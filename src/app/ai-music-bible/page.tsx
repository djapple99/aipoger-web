import type { Metadata } from "next";
import AiMusicBiblePage from "@/components/ai-music-bible-page";

type PageProps = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const isZh = !lang || lang === "zh";
  const title = isZh
    ? "AI 音樂練功聖經｜Suno Prompt 招式、歌詞調教與 Stem 拆軌"
    : "AI Music Practice Bible｜Suno Prompt Moves, Lyrics, and Stem Separation";
  const description = isZh
    ? "AIPOGER 的 AI 音樂實戰資料庫：Suno Prompt 招式、曲風詞、歌詞控制、台語調音、AI Stem 拆軌與製作流程。"
    : "AIPOGER's living field guide for Suno prompt moves, genre terms, lyric control, Taiwanese pronunciation, AI stem separation, and production workflows.";

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
