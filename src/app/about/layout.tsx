import type { Metadata } from "next";
import SeoJsonLd from "@/components/seo-json-ld";

export const metadata: Metadata = {
  title: "關於 AIPOGER 愛播歌",
  description: "了解 AIPOGER 愛播歌如何透過公開播放、Drop Battle、聽眾反應與 Showtime，讓 AI 音樂作品被看見與認可。",
  alternates: {
    languages: {
      "zh-Hant": "/about?lang=zh",
      en: "/about?lang=en",
    },
  },
};

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "關於 AIPOGER 愛播歌",
          description: "AIPOGER 是 AI 音樂創作者的探索、Battle、公共播放與認可系統。",
          url: "https://aipoger.com/about?lang=zh",
          inLanguage: "zh-Hant",
          mainEntity: { "@id": "https://aipoger.com/#organization" },
        }}
      />
      {children}
    </>
  );
}
