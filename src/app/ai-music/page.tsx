import type { Metadata } from "next";
import AiMusicClient from "./ai-music-client";

type PageProps = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const localized = lang === "ja"
    ? {
        title: "AI音楽を探す｜AIPOGER",
        description: "ジャンル別にAI音楽作品を再生し、Heartで保存し、気になる曲からDrop Battleへ挑戦できます。",
      }
    : lang === "ko"
      ? {
          title: "AI 음악 탐색｜AIPOGER",
          description: "장르별 AI 음악 작품을 듣고 Heart로 저장하거나 마음에 드는 곡에서 Drop Battle에 도전하세요.",
        }
      : lang === "en"
        ? {
            title: "Explore AI Music | AIPOGER",
            description: "Browse AI music by style, play and save tracks with a Heart, then start a Drop Battle from music you like.",
          }
        : {
            title: "探索 AI 音樂｜AIPOGER",
            description: "依照風格瀏覽 AIPOGER 的 AI 音樂作品，播放、送愛心，並從喜歡的作品延伸到 Drop Battle、Showtime 與傷心酒吧。",
          };
  return {
    ...localized,
    alternates: { canonical: "/ai-music" },
    openGraph: { ...localized, url: "/ai-music" },
  };
}

export default function AiMusicPage() {
  return <AiMusicClient />;
}
