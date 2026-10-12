import type { Metadata } from "next";
import { headers } from "next/headers";
import MvGallery from "@/components/mv-gallery";
import { mvCopy } from "@/lib/mv-copy";
import { isSupportedLang } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const requested = (await headers()).get("x-aipoger-lang");
  const lang = isSupportedLang(requested) ? requested : "zh";
  const { metaTitle: title, metaDescription: description } = mvCopy(lang);
  return { title: { absolute: title }, description,
    alternates: { canonical: `/mv?lang=${lang}`, languages: { "zh-Hant": "/mv?lang=zh", en: "/mv?lang=en", ja: "/mv?lang=ja", ko: "/mv?lang=ko" } },
    openGraph: { title, description, url: `/mv?lang=${lang}`, type: "website", siteName: "AIPOGER", locale: { zh: "zh_TW", en: "en_US", ja: "ja_JP", ko: "ko_KR" }[lang], images: [{ url: "/aipoger-og-card-20260522.png", width: 1200, height: 630, alt: "AIPOGER" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/aipoger-og-card-20260522.png"] },
  };
}

export default function MvPage() { return <MvGallery />; }
