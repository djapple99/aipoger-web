import type { Metadata } from "next";
import AiMusicBiblePage from "@/components/ai-music-bible-page";
import PublicBibleFaq from "@/components/public-bible-faq";
import { PUBLIC_BIBLE_FAQ, type PublicFaqLocale } from "@/lib/suno-reference-guide";

type PageProps = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await searchParams;
  const locale: PublicFaqLocale = lang === "ja" || lang === "ko" || lang === "en" ? lang : "zh";
  const localized = locale === "ja"
    ? {
        title: "AI音楽 実践バイブル｜Suno Sonic DNA・Prompt・歌詞",
        description: "771件のSonic DNA、747件の重複なしPrompt、歌詞制御、台湾語の発音、AI Stem分離、制作フローを検索できる実践データベースです。",
      }
    : locale === "ko"
      ? {
          title: "AI 음악 실전 바이블｜Suno Sonic DNA·Prompt·가사",
          description: "Sonic DNA 771개, 중복 제거 Prompt 747개, 가사 제어, 대만어 발음, AI Stem 분리와 제작 흐름을 검색할 수 있는 실전 데이터베이스입니다.",
        }
      : locale === "en"
        ? {
            title: "AI Music Practice Bible | Suno Sonic DNA, Prompts, and Lyrics",
            description: "AIPOGER's living field guide with 771 sonic DNA references, 747 unique prompt recipes, lyric control, Taiwanese pronunciation, AI stem separation, and production workflows.",
          }
        : {
            title: "AI 音樂練功聖經｜Suno 聲音 DNA、Prompt 索引與歌詞調教",
            description: "AIPOGER 的 AI 音樂實戰資料庫：771 組聲音 DNA、747 組去重 Prompt 配方、歌詞控制、台語調音、AI Stem 拆軌與製作流程。",
          };

  return {
    ...localized,
    keywords: locale === "zh"
      ? ["Suno 教學", "Suno Prompt", "AI 音樂", "歌詞調教", "Stem 拆軌", "AI 音樂版權", "AIPOGER"]
      : ["Suno guide", "Suno prompts", "AI music", "lyric control", "stem separation", "AI music rights", "AIPOGER"],
    alternates: {
      canonical: `/ai-music-bible?lang=${locale}`,
      languages: {
        "zh-Hant": "/ai-music-bible?lang=zh",
        en: "/ai-music-bible?lang=en",
        ja: "/ai-music-bible?lang=ja",
        ko: "/ai-music-bible?lang=ko",
      },
    },
    openGraph: {
      ...localized,
      type: "article",
      url: `/ai-music-bible?lang=${locale}`,
      siteName: "AIPOGER 愛播歌",
      publishedTime: "2026-07-16T00:00:00+08:00",
      modifiedTime: "2026-07-28T00:00:00+08:00",
      images: [{ url: "/aipoger-og-card-20260522.png", width: 1200, height: 630, alt: localized.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: localized.title,
      description: localized.description,
      images: ["/aipoger-og-card-20260522.png"],
    },
  };
}

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function Page({ searchParams }: PageProps) {
  const { lang } = await searchParams;
  const locale: PublicFaqLocale = lang === "ja" || lang === "ko" || lang === "en" ? lang : "zh";
  const pageUrl = `https://aipoger.com/ai-music-bible?lang=${locale}`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: locale === "zh" ? "AI 音樂練功聖經" : locale === "ja" ? "AI音楽 実践バイブル" : locale === "ko" ? "AI 음악 실전 바이블" : "AI Music Practice Bible",
      description: locale === "zh"
        ? "AIPOGER 的 Suno、Prompt、歌詞、聲音 DNA、Stem 拆軌與權利發行實戰資料庫。"
        : "AIPOGER's field database for Suno, prompts, lyrics, sonic DNA, stem separation, and release rights.",
      url: pageUrl,
      inLanguage: locale === "zh" ? "zh-Hant" : locale,
      datePublished: "2026-07-16",
      dateModified: "2026-07-28",
      author: { "@type": "Organization", name: "AIPOGER 愛播歌", url: "https://aipoger.com" },
      publisher: { "@type": "Organization", name: "AIPOGER 愛播歌", url: "https://aipoger.com" },
      mainEntityOfPage: pageUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale === "zh" ? "zh-Hant" : locale,
      mainEntity: PUBLIC_BIBLE_FAQ[locale].map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <>
      <AiMusicBiblePage />
      <PublicBibleFaq lang={locale} />
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      ))}
    </>
  );
}
