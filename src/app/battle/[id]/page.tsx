import BattleArenaPage from "./battle-room-client";
import QCrashCardClient from "@/components/q-crash-card-client";
import { getBattleOgData } from "@/lib/battle-og";

type BattlePageProps = {
  params: Promise<{ id: string }>;
};

export default async function BattlePage({ params }: BattlePageProps) {
  const { id } = await params;
  const battle = await getBattleOgData(id);
  if (battle.battle_type === "q_crash") {
    return <QCrashCardClient identifier={id} />;
  }
  return <BattleArenaPage />;
}
