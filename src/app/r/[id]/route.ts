import { NextResponse } from "next/server";
import { decodeBase64UrlToUuid } from "@/lib/share-short-links";

type ResultShortLinkRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: ResultShortLinkRouteProps) {
  const { id } = await params;
  const url = new URL(request.url);
  const battleId = decodeBase64UrlToUuid(id);
  const lang = url.searchParams.get("lang") || "zh";

  if (!battleId) {
    return NextResponse.redirect(new URL(`/rank?lang=${encodeURIComponent(lang)}`, url.origin));
  }

  return NextResponse.redirect(new URL(`/battle/result?battleId=${encodeURIComponent(battleId)}&lang=${encodeURIComponent(lang)}`, url.origin));
}

