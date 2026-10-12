import type { Metadata } from "next";
import { headers } from "next/headers";
import HomeEditorial from "@/components/home-editorial";
import { homeCopy } from "@/lib/home-copy";
import { isSupportedLang } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const requested = (await headers()).get("x-aipoger-lang");
  const lang = isSupportedLang(requested) ? requested : "zh";
  const copy = homeCopy(lang);
  const title = copy.metaTitle;
  const description = copy.metaDescription;
  return {
    title: { absolute: title }, description,
    alternates: { canonical: `/?lang=${lang}`, languages: { "zh-Hant": "/?lang=zh", en: "/?lang=en", ja: "/?lang=ja", ko: "/?lang=ko" } },
    openGraph: { title, description, url: `/?lang=${lang}`, type: "website", siteName: "AIPOGER", locale: { zh: "zh_TW", en: "en_US", ja: "ja_JP", ko: "ko_KR" }[lang], images: [{ url: "/aipoger-og-card-20260522.png", width: 1200, height: 630, alt: "AIPOGER" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/aipoger-og-card-20260522.png"] },
  };
}

export default function HomePage() {
  return <HomeEditorial />;
}
