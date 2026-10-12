import { NextResponse } from "next/server";
import { readHomeDiscovery } from "@/lib/server-home-discovery";

export async function GET() {
  try {
    return NextResponse.json(await readHomeDiscovery(), { headers: { "Cache-Control": "public, max-age=15, s-maxage=15, stale-while-revalidate=30" } });
  } catch (error) {
    console.error("[home-discovery]", error instanceof Error ? error.message : "Unavailable");
    return NextResponse.json({ error: "Discovery is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
