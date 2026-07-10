import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const requestedLang = request.nextUrl.searchParams.get("lang")?.trim() ?? "zh";
  const lang = /^[a-z]{2}$/i.test(requestedLang) ? requestedLang : "zh";
  return NextResponse.redirect(new URL(`/rank?lang=${encodeURIComponent(lang)}#choice-weekly`, request.url), 307);
}
