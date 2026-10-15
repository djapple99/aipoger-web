import { NextRequest, NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron-auth";
import { creatorAdmin } from "@/lib/server-creator-auth";

export async function GET(request: NextRequest) {
  const authorization = authorizeCronRequest(request);
  if (!authorization.ok) return NextResponse.json({ error: authorization.error }, { status: authorization.status });
  try {
    // A single conditional DELETE keeps a concurrent successful keep safe.
    const result = await creatorAdmin().from("battle_notifications").delete({ count: "exact" })
      .is("kept_at", null).lte("expires_at", new Date().toISOString());
    if (result.error) throw result.error;
    return NextResponse.json({ removed: result.count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "NOTICE_CLEANUP_FAILED" }, { status: 500 });
  }
}
