import { NextRequest, NextResponse } from "next/server";
import { todaySpotlightPath } from "@/lib/daily-spotlight";

export function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") ?? "zh";
  return NextResponse.redirect(new URL(todaySpotlightPath(lang), request.url), 307);
}
