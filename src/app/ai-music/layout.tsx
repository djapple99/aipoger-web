import type { Metadata } from "next";
import SeoJsonLd from "@/components/seo-json-ld";

export const metadata: Metadata = {
  title: "探索 AI 音樂作品",
  description: "依照音樂風格瀏覽 AIPOGER 公開 AI 音樂作品，播放、送愛心、收藏，並從喜歡的作品延伸到 Drop Battle。",
  alternates: {
    languages: {
      "zh-Hant": "/ai-music?lang=zh",
      en: "/ai-music?lang=en",
      ja: "/ai-music?lang=ja",
      ko: "/ai-music?lang=ko",
    },
  },
};

export default function AiMusicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "探索 AI 音樂作品",
          description: "AIPOGER 公開 AI 音樂作品目錄，可依風格瀏覽、播放、送愛心與發起 Drop Battle。",
          url: "https://aipoger.com/ai-music?lang=zh",
          inLanguage: "zh-Hant",
          isPartOf: { "@id": "https://aipoger.com/#website" },
          about: { "@type": "Thing", name: "AI 音樂作品" },
        }}
      />
      {children}
    </>
  );
}
