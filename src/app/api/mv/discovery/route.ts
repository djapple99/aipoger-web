import { NextResponse } from "next/server";
import { readMvDiscovery } from "@/lib/server-home-discovery";

export async function GET() {
  try {
    return NextResponse.json(await readMvDiscovery(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "MV discovery is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
