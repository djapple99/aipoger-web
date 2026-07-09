import type { Metadata } from "next";
import AiMusicClient from "./ai-music-client";

export const metadata: Metadata = {
  title: "探索 AI 音樂",
  description: "依照風格瀏覽 AIPOGER 的 AI 音樂作品，播放、送愛心，並從喜歡的作品延伸到 Drop Battle、Showtime 與傷心酒吧。",
  alternates: {
    canonical: "/ai-music",
  },
};

export default function AiMusicPage() {
  return <AiMusicClient />;
}
