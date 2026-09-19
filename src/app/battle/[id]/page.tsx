import type { Metadata } from "next";
import BattleArenaPage from "./battle-room-client";
import QCrashCardClient from "@/components/q-crash-card-client";
import { getBattleOgData, siteOrigin } from "@/lib/battle-og";
import { qCrashDisplayLang } from "@/lib/q-crash-rules";

type BattlePageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: BattlePageProps): Promise<Metadata> {
  const { id } = await params;
  const battle = await getBattleOgData(id);
  const query = (await searchParams) ?? {};
  const rawLang = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  const isZh = qCrashDisplayLang(rawLang) === "zh";
  const origin = siteOrigin();
  const canonical = `${origin}/battle/${encodeURIComponent(id)}`;
  const image = `${canonical}/opengraph-image`;
  const isQCrash = battle.battle_type === "q_crash";
  const title = isQCrash
    ? isZh
      ? `Q Crash｜《${battle.song_a_name}》VS《${battle.song_b_name}》`
      : `Q Crash | ${battle.song_a_name} VS ${battle.song_b_name}`
    : isZh
      ? `AIPOGER 60s 最強Drop Battle 抓波戰帖｜${battle.fighter_a_name} VS ${battle.fighter_b_name}`
      : `AIPOGER 60s Drop Battle | ${battle.fighter_a_name} VS ${battle.fighter_b_name}`;
  const description = isQCrash
    ? isZh
      ? `這兩首歌到底哪首比較好聽啊？我有點選不出來！${battle.song_a_name} VS ${battle.song_b_name}，進來聽完整歌曲，幫我決定哪首勝出！`
      : `Which song sounds better? I can't decide! ${battle.song_a_name} vs ${battle.song_b_name} — listen to both full songs and help me pick a winner.`
    : isZh
      ? `${battle.fighter_a_name}《${battle.song_a_name}》VS ${battle.fighter_b_name}《${battle.song_b_name}》｜開打前集結，先聽 5 秒預播，預測誰的 Drop 最炸。`
      : `${battle.fighter_a_name} “${battle.song_a_name}” vs ${battle.fighter_b_name} “${battle.song_b_name}” — listen to the 5-second previews and predict whose Drop hits hardest.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function BattlePage({ params }: BattlePageProps) {
  const { id } = await params;
  const battle = await getBattleOgData(id);
  if (battle.battle_type === "q_crash") {
    return <QCrashCardClient identifier={id} />;
  }
  return <BattleArenaPage />;
}
