import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  return expireRematchClaims(request);
}

export async function POST(request: NextRequest) {
  return expireRematchClaims(request);
}

async function expireRematchClaims(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : request.nextUrl.searchParams.get("secret");
    if (token !== cronSecret) return jsonError("Unauthorized", 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const nowIso = new Date().toISOString();

  const { data: openExpired, error: openError } = await admin
    .from("drop_battle_rematch_claims")
    .update({ status: "expired", updated_at: nowIso })
    .eq("status", "open")
    .lte("claim_window_ends_at", nowIso)
    .select("id");
  if (openError) return jsonError(openError.message, 500);

  const { data: claimedExpired, error: claimedError } = await admin
    .from("drop_battle_rematch_claims")
    .update({ status: "expired", updated_at: nowIso })
    .eq("status", "claimed")
    .lte("upload_deadline_at", nowIso)
    .select("id");
  if (claimedError) return jsonError(claimedError.message, 500);

  return NextResponse.json({
    expiredOpen: openExpired?.length ?? 0,
    expiredClaimed: claimedExpired?.length ?? 0,
  });
}
