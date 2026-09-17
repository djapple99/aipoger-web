import { NextRequest, NextResponse } from "next/server";
import { MonthlyChartError, monthlyChartQuery, readMonthlyChart } from "@/lib/monthly-charts";
import { monthlyChartAdmin } from "@/lib/server-monthly-charts";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET(request: NextRequest) {
  try {
    monthlyChartQuery(request.nextUrl.searchParams);
    const admin = monthlyChartAdmin();
    const result = await readMonthlyChart(admin, request.nextUrl.searchParams,
      (bucket, path) => admin.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    return NextResponse.json(result, { headers });
  } catch (error) {
    const known = error instanceof MonthlyChartError;
    return NextResponse.json({ error: known ? error.message : "Monthly charts are temporarily unavailable." },
      { status: known ? error.status : 503, headers });
  }
}
