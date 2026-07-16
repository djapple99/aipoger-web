import type { Metadata } from "next";
import AiMusicBiblePage from "@/components/ai-music-bible-page";

type PageProps = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const isZh = !lang || lang === "zh";
  const title = isZh
    ? "AI 音樂練功聖經｜Suno 聲音 DNA、Prompt 索引與歌詞調教"
    : "AI Music Practice Bible｜Suno Sonic DNA, Prompt Index, and Lyrics";
  const description = isZh
    ? "AIPOGER 的 AI 音樂實戰資料庫：771 組聲音 DNA、747 組去重 Prompt 配方、歌詞控制、台語調音、AI Stem 拆軌與製作流程。"
    : "AIPOGER's living field guide with 771 sonic DNA references, 747 unique prompt recipes, lyric control, Taiwanese pronunciation, AI stem separation, and production workflows.";

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
