import type { Metadata } from "next";
import EarwormClient from "./earworm-client";

export const metadata: Metadata = {
  title: "耳朵蟲｜同類型抓耳聽感遊戲",
  description: "在同一種音樂類型裡，聽兩首作品，選出最容易留在耳朵裡的那一首。",
  alternates: { canonical: "/earworm" },
  openGraph: {
    title: "耳朵蟲｜AIPOGER",
    description: "同類型裡，哪首更抓耳？來當耳朵蟲，幫 AI 音樂留下聽感紀錄。",
    url: "/earworm",
  },
};

export default function EarwormPage() {
  return <EarwormClient />;
}
