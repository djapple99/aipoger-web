import type { Metadata } from "next";
import type { ReactNode } from "react";
import { battleOgDescription, battleOgTitle, getBattleOgData, siteOrigin } from "@/lib/battle-og";

type WaitingRoomLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Pick<WaitingRoomLayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const battle = await getBattleOgData(id);
  const title = battleOgTitle(battle);
  const description = battleOgDescription(battle);
  const origin = siteOrigin();
  const canonical = `${origin}/battle/${encodeURIComponent(id)}`;
  const image = `${canonical}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function WaitingRoomLayout({ children }: WaitingRoomLayoutProps) {
  return children;
}
