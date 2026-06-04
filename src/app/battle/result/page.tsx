import type { Metadata } from "next";
import BattleResultClient from "./battle-result-client";
import {
  buildResultOgQuery,
  loadBattleResultShareData,
  resultShareDataFromSearch,
} from "@/lib/battle-result-meta";

type BattleResultPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aipoger.com").replace(/\/$/, "");

export async function generateMetadata({ searchParams }: BattleResultPageProps): Promise<Metadata> {
  const resolvedSearchParams = (await searchParams) ?? {};
  const shareData = await loadBattleResultShareData(resultShareDataFromSearch(resolvedSearchParams));
  const winnerName = shareData.winnerName || "AIPOGER Fighter";
  const winnerSong = shareData.winnerSong || "AI Drop";
  const opponentName = shareData.opponentName || "Drop Rival";
  const title = `AIPOGER Drop Battle 戰果｜${winnerName}《${winnerSong}》`;
  const description = `${winnerName}《${winnerSong}》擊敗 ${opponentName}。進來看 AIPOGER 最強抓波 Drop Battle 成果卡。`;
  const resultQuery = new URLSearchParams();
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    const cleanValue = Array.isArray(value) ? value[0] : value;
    if (cleanValue) resultQuery.set(key, cleanValue);
  });
  if (shareData.battleId) resultQuery.set("battleId", shareData.battleId);
  const canonical = `/battle/result${resultQuery.toString() ? `?${resultQuery.toString()}` : ""}`;
  const image = `/battle/result/opengraph-image?${buildResultOgQuery(shareData).toString()}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: new URL(canonical, siteUrl).toString(),
      siteName: "AIPOGER 愛播歌",
      type: "website",
      locale: "zh_TW",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${winnerName} Drop Battle winner card`,
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

export default function BattleResultPage() {
  return <BattleResultClient />;
}
