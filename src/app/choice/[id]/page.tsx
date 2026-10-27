export const preferredRegion = "hnd1";
import { notFound } from "next/navigation";
import { readPublicChoice } from "@/lib/server-public-choice";
import type { Metadata } from "next";
import { AIPOGER_SHARE_IMAGE_PATH } from "@/lib/brand";
import { choiceDisplayTitle } from "@/lib/aipoger-choice";
import { getChoiceCopy } from "@/lib/choice-copy";
import { isSupportedLang, type Lang } from "@/lib/locale";
import { loadChoiceShareMetadata } from "@/lib/server-choice-share-metadata";
import { publicSiteUrl } from "@/lib/site-url";
import { publicMetadata } from "@/lib/public-seo";
import { choiceShareImagePath } from "@/lib/choice-share";
import { isChoiceStorageCover } from "@/lib/choice-share-cover";

const siteUrl = publicSiteUrl();
const defaultImageUrl = new URL(AIPOGER_SHARE_IMAGE_PATH, siteUrl).href;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; kind?: string }>;
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
    return publicMetadata({ path: `/choice/${encodeURIComponent(id)}`, lang, params: { kind: choice.kind }, title, description, type: "article",
      image: { url: imageUrl, alt: title, ...(hasCover ? { width: 1200, height: 630, type: "image/jpeg" } : {}) } });
  } catch (error) {
    console.error("[choice-share-metadata] Failed to build Choice metadata", error);
    return {};
  }
}

import PublicChoicePage from "./choice-client";

export default async function ChoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string }> }) {
  const { id } = await params;
  const { kind } = await searchParams;
  const collection = await readPublicChoice(id, kind === "official" ? "official" : "creator");
  if (!collection) notFound();
  return <PublicChoicePage key={id} initialCollection={collection} />;
}
