import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { finalizeMonthlyCharts } from "@/lib/monthly-charts";
import { monthlyChartAdmin } from "@/lib/server-monthly-charts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const headers = { "Cache-Control": "no-store, max-age=0" };
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers });
  }
  try {
    const finalizedMonths = await finalizeMonthlyCharts(monthlyChartAdmin());
    return NextResponse.json({ ok: true, finalizedMonths }, { headers });
  } catch {
    return NextResponse.json({ error: "Monthly chart finalization failed." }, { status: 503, headers });
  }
}
