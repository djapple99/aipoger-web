import type { Metadata } from "next";
import { AIPOGER_SHARE_IMAGE_PATH } from "@/lib/brand";
import { isSupportedLang, type Lang } from "@/lib/locale";
import { publicSiteUrl } from "@/lib/site-url";

export const PUBLIC_LANGS = ["zh", "en", "ja", "ko"] as const;
export function publicLang(value: unknown): Lang { return typeof value === "string" && isSupportedLang(value) ? value : "zh"; }
export function publicUrl(path: string, lang: Lang, params: Record<string, string> = {}) {
  const url = new URL(path, publicSiteUrl());
  url.search = ""; url.hash = "";
  url.searchParams.set("lang", lang);
  for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
  return url.href;
}
export function publicAlternates(path: string, lang: Lang, params: Record<string, string> = {}): Metadata["alternates"] {
  return { canonical: publicUrl(path, lang, params), languages: {
    "zh-Hant": publicUrl(path, "zh", params), en: publicUrl(path, "en", params),
    ja: publicUrl(path, "ja", params), ko: publicUrl(path, "ko", params),
    "x-default": publicUrl(path, "zh", params),
  } };
}
export function publicMetadata({ path, lang, title, description, params, image, type = "website" }: {
  path: string; lang: Lang; title: string; description: string; params?: Record<string, string>;
  image?: { url: string; width?: number; height?: number; alt?: string; type?: string };
  type?: "website" | "article";
}): Metadata {
  const url = publicUrl(path, lang, params);
  const cover = image ?? { url: AIPOGER_SHARE_IMAGE_PATH, width: 1200, height: 630, alt: "AIPOGER" };
  const absoluteImage = { ...cover, url: new URL(cover.url, publicSiteUrl()).href };
  return { title: { absolute: title }, description, alternates: publicAlternates(path, lang, params),
    openGraph: { title, description, url, siteName: "AIPOGER", type, locale: { zh: "zh_TW", en: "en_US", ja: "ja_JP", ko: "ko_KR" }[lang], images: [absoluteImage] },
    twitter: { card: "summary_large_image", title, description, images: [absoluteImage.url] },
  };
}
export function workPath(id: string, lang: Lang) { return `/works/${encodeURIComponent(id)}?lang=${lang}`; }
