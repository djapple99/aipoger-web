import { NextResponse } from "next/server";
import { decodeBase64UrlToUuid } from "@/lib/share-short-links";

type DailyShortLinkRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: DailyShortLinkRouteProps) {
  const { id } = await params;
  const url = new URL(request.url);
  const entryId = decodeBase64UrlToUuid(id);
  const lang = url.searchParams.get("lang") || "zh";

  if (!entryId) {
    return NextResponse.redirect(new URL(`/battle?lang=${encodeURIComponent(lang)}`, url.origin));
  }

  return NextResponse.redirect(
    new URL(`/battle/daily/waiting-room/${encodeURIComponent(entryId)}?lang=${encodeURIComponent(lang)}`, url.origin),
  );
}

