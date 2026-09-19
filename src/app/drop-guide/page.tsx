import type { Metadata } from "next";
import InfoPageShell from "@/components/info-page-shell";
import SeoJsonLd from "@/components/seo-json-ld";

type DropGuidePageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ searchParams }: DropGuidePageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const isEnglish = lang === "en";
  const title = isEnglish ? "Drop Battle Rules and Q Crash Guide" : "Drop Battle 規則與 Q Crash 抓波指南";
  const description = isEnglish
    ? "Learn how AIPOGER 30-60 second Drop Battles and full-song Q Crash voting work, including official audience thresholds and creator rights rules."
    : "了解 AIPOGER 30-60 秒 Drop Battle 與整首歌曲 Q Crash 怎麼玩，包括正式觀眾門檻、投票規則與創作者權利原則。";

  return {
    title,
    description,
    keywords: isEnglish
      ? ["AI music battle", "Drop Battle", "Q Crash", "AI music creators"]
      : ["AI 音樂 Battle", "Drop Battle", "抓波", "Q Crash", "AI 音樂創作者"],
    alternates: {
      canonical: `/drop-guide?lang=${isEnglish ? "en" : "zh"}`,
      languages: {
        "zh-Hant": "/drop-guide?lang=zh",
        en: "/drop-guide?lang=en",
      },
    },
    openGraph: {
      title,
      description,
      url: `/drop-guide?lang=${isEnglish ? "en" : "zh"}`,
      type: "article",
    },
  };
}

export default function DropGuidePage() {
  const pageUrl = "https://aipoger.com/drop-guide?lang=zh";

  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "Drop Battle 規則與 Q Crash 抓波指南",
          description: "AIPOGER 30-60 秒 Drop Battle、整首歌曲 Q Crash、投票門檻與創作者權利規則。",
          url: pageUrl,
          inLanguage: "zh-Hant",
          dateModified: "2026-08-10",
          author: {
            "@type": "Person",
            name: "愛波哥",
            url: "https://www.youtube.com/@djapple2000",
          },
          publisher: {
            "@type": "Organization",
            name: "AIPOGER 愛播歌",
            url: "https://aipoger.com",
          },
          mainEntityOfPage: pageUrl,
          about: [
            { "@type": "Thing", name: "AI 音樂" },
            { "@type": "Thing", name: "Drop Battle" },
            { "@type": "Thing", name: "Q Crash" },
          ],
        }}
      />
      <InfoPageShell kind="hook-guide" />
    </>
  );
}
