import type { Metadata } from "next";
import { headers } from "next/headers";
import { isSupportedLang } from "@/lib/locale";
import { showtimeCopy } from "@/lib/showtime-copy";
import SeoJsonLd from "@/components/seo-json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const requested = (await headers()).get("x-aipoger-lang");
  const lang = isSupportedLang(requested) ? requested : "zh";
  const copy = showtimeCopy(lang);
  return {
    title: { absolute: copy.metaTitle }, description: copy.metaDescription,
    alternates: { canonical: `/rank?lang=${lang}`, languages: {
      "zh-Hant": "/rank?lang=zh", en: "/rank?lang=en", ja: "/rank?lang=ja", ko: "/rank?lang=ko",
    } },
  };
}

export default async function RankLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requested = (await headers()).get("x-aipoger-lang");
  const lang = isSupportedLang(requested) ? requested : "zh";
  const copy = showtimeCopy(lang);
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "AIPOGER Showtime",
          description: copy.metaDescription,
          url: `https://aipoger.com/rank?lang=${lang}`,
          inLanguage: lang === "zh" ? "zh-Hant" : lang,
          isPartOf: { "@id": "https://aipoger.com/#website" },
          about: { "@type": "Thing", name: "AI 音樂與推薦歌單" },
        }}
      />
      {children}
    </>
  );
}
