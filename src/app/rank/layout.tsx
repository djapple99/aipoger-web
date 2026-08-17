import type { Metadata } from "next";
import SeoJsonLd from "@/components/seo-json-ld";

export const metadata: Metadata = {
  title: "AIPOGER Showtime｜被認可的 AI 音樂作品",
  description: "瀏覽 AIPOGER Showtime 認證作品與 Choice 策展歌單，播放、收藏、分享被聽眾與平台留下紀錄的 AI 音樂。",
  alternates: {
    canonical: "/rank",
    languages: {
      "zh-Hant": "/rank?lang=zh",
      en: "/rank?lang=en",
      ja: "/rank?lang=ja",
      ko: "/rank?lang=ko",
    },
  },
};

export default function RankLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "AIPOGER Showtime",
          description: "AIPOGER 的 AI 音樂認證作品目錄與 Choice 人工策展入口。",
          url: "https://aipoger.com/rank?lang=zh",
          inLanguage: "zh-Hant",
          isPartOf: { "@id": "https://aipoger.com/#website" },
          about: { "@type": "Thing", name: "AI 音樂認可作品" },
        }}
      />
      {children}
    </>
  );
}
