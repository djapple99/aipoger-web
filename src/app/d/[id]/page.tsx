import { redirect } from "next/navigation";
import { dailyChallengeWaitingRoomPath, shortBattleCodeToUuid } from "@/lib/short-battle-links";

type DailyShortLinkPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

function safeLang(value: string | string[] | undefined) {
  const lang = Array.isArray(value) ? value[0] : value;
  return lang === "en" ? "en" : "zh";
}

export default async function DailyShortLinkPage({ params, searchParams }: DailyShortLinkPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const entryId = shortBattleCodeToUuid(id);
  const lang = safeLang(query.lang);

  if (!entryId) redirect(`/battle?lang=${lang}`);
  redirect(dailyChallengeWaitingRoomPath(entryId, lang));
}
