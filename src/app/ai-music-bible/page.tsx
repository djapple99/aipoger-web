import type { Metadata } from "next";
import AiMusicBiblePage from "@/components/ai-music-bible-page";

type PageProps = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const isZh = !lang || lang === "zh";
  const title = isZh
    ? "AI 音樂練功聖經｜Suno、歌詞、Prompt 實戰資料庫"
    : "AI Music Practice Bible｜Suno, Lyrics, and Prompt Lab";
  const description = isZh
    ? "AIPOGER 的 AI 音樂實戰資料庫：Suno 台語歌詞調音、Prompt、Drop、編曲、版權與愛波哥教學。一起實測、回報並補充資料。"
    : "AIPOGER's living AI music field guide for Suno, Taiwanese lyrics, prompts, Drops, rights, and community-tested pronunciation.";

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
