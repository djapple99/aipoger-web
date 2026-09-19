import type { Metadata } from "next";
import SeoJsonLd from "@/components/seo-json-ld";

export const metadata: Metadata = {
  title: "AI 音樂品牌合作與廣告投放",
  description: "探索 AIPOGER 的 AI 音樂品牌合作、Drop Battle 主題賽事、教學整合、MV 企劃與創作者活動方案。",
  alternates: {
    languages: {
      "zh-Hant": "/partners?lang=zh",
      en: "/partners?lang=en",
    },
  },
};

export default function PartnersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "AI 音樂品牌合作與廣告投放",
          description: "AIPOGER 為 AI 音樂工具、影像工具、品牌與活動提供創作者、Battle、教學與策展合作場景。",
          url: "https://aipoger.com/partners?lang=zh",
          inLanguage: "zh-Hant",
          isPartOf: { "@id": "https://aipoger.com/#website" },
          about: { "@type": "Thing", name: "AI 音樂品牌合作" },
        }}
      />
      {children}
    </>
  );
}
