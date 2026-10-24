export const preferredRegion = "hnd1";
import { notFound } from "next/navigation";
import QCrashCardClient from "@/components/q-crash-card-client";
import PublicBattleSummaryView from "@/components/public-battle-summary";
import { readPublicBattle } from "@/lib/server-public-battles";
import { publicBattleMetadata } from "@/lib/server-battle-seo";
import { requestLang } from "@/lib/server-public-locale";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> };
export async function generateMetadata({ params, searchParams }: Props) {
  const { id } = await params; const lang = await requestLang((await searchParams).lang); const battle = await readPublicBattle(id);
  return battle?.battle_type === "q_crash" ? publicBattleMetadata(battle, lang, `/battle/q-crash/${id}`) : { robots: { index: false } };
}
export default async function QCrashPage({ params, searchParams }: Props) {
  const { id } = await params; const lang = await requestLang((await searchParams).lang); const battle = await readPublicBattle(id);
  if (!battle || battle.battle_type !== "q_crash") notFound();
  return <QCrashCardClient identifier={id} initialSummary={<PublicBattleSummaryView battle={battle} lang={lang} />} />;
}
