import type { Metadata } from "next";
import { choiceDisplayTitle } from "@/lib/aipoger-choice";
import { loadChoiceShareMetadata } from "@/lib/server-choice-share-metadata";

const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aipoger.com").replace(/\/$/, "");
const siteUrl = configuredSiteUrl === "https://www.aipoger.com" ? "https://aipoger.com" : configuredSiteUrl;
const defaultImageUrl = `${siteUrl}/aipoger-og-card-20260522.png`;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const choice = await loadChoiceShareMetadata(id);
    if (!choice) return {};
    const title = choiceDisplayTitle(choice.curatorName, choice.title);
    const description = choice.intro || `${choice.curatorName} 的 AIPOGER Choice 歌單`;
    const imageUrl = choice.imageUrl || defaultImageUrl;
    const shareUrl = `${siteUrl}/choice/${encodeURIComponent(id)}${choice.kind === "official" ? "?kind=official" : ""}`;
    return {
      title,
      description,
      alternates: { canonical: shareUrl },
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName: "AIPOGER 愛播歌",
        locale: "zh_TW",
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
