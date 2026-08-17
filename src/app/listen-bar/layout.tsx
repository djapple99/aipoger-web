import type { Metadata } from "next";
import SeoJsonLd from "@/components/seo-json-ld";

export const metadata: Metadata = {
  title: "傷心酒吧｜AI 音樂生存電台",
  description: "在 AIPOGER 傷心酒吧聽 AI 音樂公播池，探索正在播放的作品、留下 Heart，並發現值得被聽見的創作者。",
  alternates: {
    languages: {
      "zh-Hant": "/listen-bar?lang=zh",
      en: "/listen-bar?lang=en",
      ja: "/listen-bar?lang=ja",
      ko: "/listen-bar?lang=ko",
    },
  },
};

export default function ListenBarLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "傷心酒吧｜AI 音樂生存電台",
          description: "AIPOGER 的 AI 音樂公共播放空間，讓投稿作品被播放、被支持並留下真實聽眾反應。",
          url: "https://aipoger.com/listen-bar?lang=zh",
          inLanguage: "zh-Hant",
          isPartOf: { "@id": "https://aipoger.com/#website" },
          about: { "@type": "Thing", name: "AI 音樂公共播放" },
        }}
      />
      {children}
    </>
  );
}
