import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveDropBattleLinkResolution } from "@/lib/drop-battle-link-resolution";

type BattleRow = {
  id: string;
  status: string | null;
  battle_type: string | null;
  battle_ended_at: string | null;
  scheduled_start_at: string | null;
  battle_started_at: string | null;
  started_at: string | null;
  created_at: string | null;
};

type RematchClaimRow = {
  status: string | null;
  claim_window_ends_at: string | null;
  upload_deadline_at: string | null;
  next_battle_id: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const battleId = request.nextUrl.searchParams.get("battleId");
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "zh";
  if (!isUuid(battleId)) return jsonError("Missing battleId");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: battle, error: battleError } = await admin
    .from("battles")
    .select("id,status,battle_type,battle_ended_at,scheduled_start_at,battle_started_at,started_at,created_at")
    .eq("id", battleId)
    .maybeSingle<BattleRow>();
  if (battleError) return jsonError(battleError.message, 500);
  if (!battle?.id) return jsonError("Battle not found", 404);

  const { data: claim, error: claimError } = await admin
    .from("drop_battle_rematch_claims")
    .select("status,claim_window_ends_at,upload_deadline_at,next_battle_id")
    .eq("source_battle_id", battle.id)
    .maybeSingle<RematchClaimRow>();
  if (claimError && !/does not exist|schema cache|PGRST204/i.test(`${claimError.message} ${claimError.details ?? ""}`)) {
    return jsonError(claimError.message, 500);
  }

  return NextResponse.json(resolveDropBattleLinkResolution({ battle, claim: claim ?? null, lang }));
}
