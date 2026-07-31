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
  const isQCrash = battle.battle_type === "q_crash";
  const title = isQCrash
    ? `Q Crash｜《${battle.song_a_name}》VS《${battle.song_b_name}》`
    : `AIPOGER 60s 最強Drop Battle 抓波戰帖｜${battle.fighter_a_name} VS ${battle.fighter_b_name}`;
  const description = isQCrash
    ? `${battle.fighter_a_name}《${battle.song_a_name}》VS ${battle.fighter_b_name}《${battle.song_b_name}》｜兩首 60 秒 Drop，不用等人到齊，截止後才公開票數。`
    : `${battle.fighter_a_name}《${battle.song_a_name}》VS ${battle.fighter_b_name}《${battle.song_b_name}》｜開打前集結，先聽 5 秒預播，預測誰的 Drop 最炸。`;

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
