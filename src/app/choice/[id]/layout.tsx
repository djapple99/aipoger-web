import type { Metadata } from "next";
import { choiceDisplayTitle } from "@/lib/aipoger-choice";
import { getChoiceCopy } from "@/lib/choice-copy";
import { isSupportedLang, type Lang } from "@/lib/locale";
import { loadChoiceShareMetadata } from "@/lib/server-choice-share-metadata";

const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aipoger.com").replace(/\/$/, "");
const siteUrl = configuredSiteUrl === "https://www.aipoger.com" ? "https://aipoger.com" : configuredSiteUrl;
const defaultImageUrl = `${siteUrl}/aipoger-og-card-20260522.png`;

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
    const imageUrl = choice.imageUrl || defaultImageUrl;
    const query = new URLSearchParams({ lang });
    if (choice.kind === "official") query.set("kind", "official");
    const shareUrl = `${siteUrl}/choice/${encodeURIComponent(id)}?${query.toString()}`;
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
        images: [{ url: imageUrl, alt: `${choice.curatorName} Choice` }],
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

export default function ChoiceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
