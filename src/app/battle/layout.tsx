import type { Metadata } from "next";
import SeoJsonLd from "@/components/seo-json-ld";

export const metadata: Metadata = {
  title: "Drop Battle 公開挑戰池",
  description: "進入 AIPOGER Drop Battle 公開挑戰池，觀戰、聽 30-60 秒抓波、投票，或帶自己的 AI 音樂作品上場。",
  alternates: {
    languages: {
      "zh-Hant": "/battle?lang=zh",
      en: "/battle?lang=en",
      ja: "/battle?lang=ja",
      ko: "/battle?lang=ko",
    },
  },
};

export default function BattleLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Drop Battle 公開挑戰池",
          description: "AIPOGER 30-60 秒 AI 音樂 Drop Battle 公開挑戰與觀戰入口。",
          url: "https://aipoger.com/battle?lang=zh",
          inLanguage: "zh-Hant",
          isPartOf: { "@id": "https://aipoger.com/#website" },
          about: { "@type": "Thing", name: "AI 音樂 Drop Battle" },
        }}
      />
      {children}
    </>
  );
}
