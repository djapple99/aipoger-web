import { NextResponse } from "next/server";
import { readMvDiscovery } from "@/lib/server-home-discovery";

export async function GET() {
  try {
    return NextResponse.json(await readMvDiscovery(), { headers: { "Cache-Control": "public, max-age=15, s-maxage=15, stale-while-revalidate=30" } });
  } catch {
    return NextResponse.json({ error: "MV discovery is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
