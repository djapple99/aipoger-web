import type { Metadata } from "next";
import { headers } from "next/headers";
import SeoJsonLd from "@/components/seo-json-ld";
import { htmlLangFor, isSupportedLang } from "@/lib/locale";
import { brandEditorialCopy } from "@/lib/brand-editorial-copy";

async function readPartnersCopy() {
  const requested = (await headers()).get("x-aipoger-lang");
  const lang = isSupportedLang(requested) ? requested : "zh";
  return { lang, ...brandEditorialCopy(lang) };
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = await readPartnersCopy();
  return {
  title: copy.partnersLabel,
  description: copy.partnersLead,
  alternates: {
    languages: {
      "zh-Hant": "/partners?lang=zh",
      en: "/partners?lang=en",
      ja: "/partners?lang=ja",
      ko: "/partners?lang=ko",
    },
  },
  };
}

export default async function PartnersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const copy = await readPartnersCopy();
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: copy.partnersLabel,
          description: copy.partnersLead,
          url: `https://aipoger.com/partners?lang=${copy.lang}`,
          inLanguage: htmlLangFor(copy.lang),
          isPartOf: { "@id": "https://aipoger.com/#website" },
          about: { "@type": "Thing", name: "AI 音樂品牌合作" },
        }}
      />
      {children}
    </>
  );
}
