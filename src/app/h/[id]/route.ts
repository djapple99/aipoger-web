import { NextResponse } from "next/server";
import { decodeBase64UrlToUuid } from "@/lib/share-short-links";

type DailyBattleShortLinkRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: DailyBattleShortLinkRouteProps) {
  const { id } = await params;
  const url = new URL(request.url);
  const battleId = decodeBase64UrlToUuid(id);
  const lang = url.searchParams.get("lang") || "zh";

  if (!battleId) {
    return NextResponse.redirect(new URL(`/battle?lang=${encodeURIComponent(lang)}`, url.origin));
  }

  return NextResponse.redirect(new URL(`/battle/daily/${encodeURIComponent(battleId)}?lang=${encodeURIComponent(lang)}`, url.origin));
}

