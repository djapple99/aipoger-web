import type { Metadata } from "next";
import EarwormClient from "./earworm-client";

export const metadata: Metadata = {
  title: "耳朵蟲｜10 首音樂人格測驗",
  description: "盲聽 10 首 AIPOGER 作品，照第一直覺選擇，找出目前最接近你的音樂主場。",
  alternates: { canonical: "https://aipoger.com/earworm?lang=zh", languages: { "zh-Hant": "https://aipoger.com/earworm?lang=zh", "x-default": "https://aipoger.com/earworm?lang=zh" } },
  openGraph: {
    title: "耳朵蟲｜AIPOGER",
    description: "聽完 10 首，找出你的音樂主場。來做 AIPOGER 耳朵蟲音樂人格測驗。",
    url: "https://aipoger.com/earworm?lang=zh",
  },
};

export default function EarwormPage() {
  return <EarwormClient />;
}
