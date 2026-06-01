import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getBattleOgData, siteOrigin } from "@/lib/battle-og";

type BattleLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Pick<BattleLayoutProps, "params">): Promise<Metadata> {
  const { id } = await params;
  const battle = await getBattleOgData(id);
  const origin = siteOrigin();
  const canonical = `${origin}/battle/${encodeURIComponent(id)}`;
  const image = `${canonical}/opengraph-image`;
  const title = `AIPOGER 90S 最強抓波Drop Battle 戰帖｜${battle.fighter_a_name} VS ${battle.fighter_b_name}`;
  const description = `${battle.fighter_a_name}《${battle.song_a_name}》VS ${battle.fighter_b_name}《${battle.song_b_name}》｜開打前集結，先聽 5 秒 teaser，預測誰的 Drop 最炸。`;

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

export default function BattleLayout({ children }: BattleLayoutProps) {
  return children;
}
