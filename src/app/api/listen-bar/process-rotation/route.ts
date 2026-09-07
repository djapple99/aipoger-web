import { NextResponse } from "next/server";

// Compatibility endpoint: old cron calls must never mutate the curated library.
export async function GET() {
  return NextResponse.json({ enabled: false, retired: true, reason: "curated_airplay", promoted: 0, removed: 0 });
}

export const POST = GET;
