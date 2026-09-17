import type { Metadata } from "next";
import SeoJsonLd from "@/components/seo-json-ld";

export const metadata: Metadata = {
  title: "AIPOGER Showtime｜月排行榜與 Choice 歌單",
  description: "聆聽 AIPOGER 月排行榜，探索創作者的 Choice 推薦歌單，收藏並分享喜歡的 AI 音樂。",
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
          description: "AIPOGER AI 音樂月排行榜與 Choice 推薦歌單。",
          url: "https://aipoger.com/rank?lang=zh",
          inLanguage: "zh-Hant",
          isPartOf: { "@id": "https://aipoger.com/#website" },
          about: { "@type": "Thing", name: "AI 音樂與推薦歌單" },
        }}
      />
      {children}
    </>
  );
}
