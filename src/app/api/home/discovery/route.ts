import { homeDiscoveryCacheControl } from "@/lib/mv-promotion";
import { NextResponse } from "next/server";
import { readHomeDiscovery } from "@/lib/server-home-discovery";

export async function GET() {
  try {
    return NextResponse.json(await readHomeDiscovery(), { headers: { "Cache-Control": homeDiscoveryCacheControl() } });
  } catch (error) {
    console.error("[home-discovery]", error instanceof Error ? error.message : "Unavailable");
    return NextResponse.json({ error: "Discovery is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
