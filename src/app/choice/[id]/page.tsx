import type { Metadata } from "next";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { choiceDisplayTitle } from "@/lib/aipoger-choice";
import { getChoiceCopy } from "@/lib/choice-copy";
import { isSupportedLang, type Lang } from "@/lib/locale";
import { loadChoiceShareMetadata } from "@/lib/server-choice-share-metadata";
import { publicSiteUrl } from "@/lib/site-url";
import { choiceShareImagePath, choiceSharePath } from "@/lib/choice-share";
import { isChoiceStorageCover } from "@/lib/choice-share-cover";

const siteUrl = publicSiteUrl();
const defaultImageUrl = new URL(AIPOGER_BRAND_LOGO, siteUrl).href;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const requestedLang = (await searchParams)?.lang;
  const lang: Lang = isSupportedLang(requestedLang) ? requestedLang : "zh";
  const copy = getChoiceCopy(lang);
  try {
    const choice = await loadChoiceShareMetadata(id);
    if (!choice) return {};
    const title = choiceDisplayTitle(choice.curatorName, choice.title);
    const curator = choice.curatorName || "AIPOGER";
    const description = choice.intro || copy.choiceDescription(curator);
    const hasCover = isChoiceStorageCover(choice.imageUrl);
    const imageUrl = hasCover ? new URL(choiceShareImagePath(id, choice.imageUrl), siteUrl).href : choice.imageUrl || defaultImageUrl;
    const shareUrl = new URL(choiceSharePath(id, choice.kind, lang, choice.imageUrl || AIPOGER_BRAND_LOGO), siteUrl).href;
    const siteName = lang === "zh" ? "AIPOGER 愛播歌" : "AIPOGER";
    const locale = lang === "zh" ? "zh_TW" : lang === "ja" ? "ja_JP" : lang === "ko" ? "ko_KR" : "en_US";
    return {
      title,
      description,
      alternates: { canonical: shareUrl },
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName,
        locale,
        type: "article",
        images: [{ url: imageUrl, alt: title, ...(hasCover ? { width: 800, height: 800, type: "image/jpeg" } : {}) }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error("[choice-share-metadata] Failed to build Choice metadata", error);
    return {};
  }
}

import PublicChoicePage from "./choice-client";

export default PublicChoicePage;
