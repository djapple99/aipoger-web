import type { Metadata } from "next";
import { headers } from "next/headers";
import MvGallery from "@/components/mv-gallery";
import { mvCopy } from "@/lib/mv-copy";
import { isSupportedLang } from "@/lib/locale";
import { loadMvShareMetadata } from "@/lib/server-mv-share-metadata";

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ lang?: string | string[]; track?: string | string[] }>;
}): Promise<Metadata> {
  const query = await searchParams;
  const requested = query.lang ?? (await headers()).get("x-aipoger-lang");
  const lang = typeof requested === "string" && isSupportedLang(requested) ? requested : "zh";
  const copy = mvCopy(lang);
  let shared: Awaited<ReturnType<typeof loadMvShareMetadata>> = null;
  if (typeof query.track === "string") {
    try { shared = await loadMvShareMetadata(query.track); }
    catch { /* Keep the public gallery available if discovery is unavailable. */ }
  }
  const title = shared ? `${shared.title} — ${shared.artist}｜AIPOGER` : copy.metaTitle;
  const description = shared ? `${shared.artist} · ${shared.title}${shared.description ? `｜${shared.description}` : `｜${copy.metaDescription}`}` : copy.metaDescription;
  const path = (language: string) => `/mv?lang=${language}${shared ? `&track=${encodeURIComponent(shared.id)}` : ""}`;
  const image = shared ? { ...shared.image, alt: `${shared.title} — ${shared.artist}` }
    : { url: "/aipoger-og-card-20260522.png", width: 1200, height: 630, alt: "AIPOGER" };
  return { title: { absolute: title }, description,
    alternates: { canonical: path(lang), languages: { "zh-Hant": path("zh"), en: path("en"), ja: path("ja"), ko: path("ko") } },
    openGraph: { title, description, url: path(lang), type: "website", siteName: "AIPOGER", locale: { zh: "zh_TW", en: "en_US", ja: "ja_JP", ko: "ko_KR" }[lang], images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default function MvPage() { return <MvGallery />; }
