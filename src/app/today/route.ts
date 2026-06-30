import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function taipeiDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10);
}

export function GET(request: NextRequest) {
  const url = new URL("/listen-bar", request.nextUrl.origin);
  url.searchParams.set("spotlight", taipeiDateString());
  url.searchParams.set("lang", "zh");
  return NextResponse.redirect(url, 307);
}
