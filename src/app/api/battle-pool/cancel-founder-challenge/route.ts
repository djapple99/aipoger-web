import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canFounderCancelDropBattle } from "@/lib/battle-pool-client";

type FounderBattleRow = {
  id: string;
  fighter_a_user_id: string;
  fighter_b_user_id: string | null;
  status: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const token = tokenFromRequest(request);
  if (!token) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { battleId?: unknown } | null;
  const battleId = isUuid(body?.battleId) ? body.battleId : null;
  if (!battleId) return jsonError("Invalid battleId");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("Unauthorized", 401);

  const { data: battle, error: readError } = await admin
    .from("battles")
    .select("id, fighter_a_user_id, fighter_b_user_id, status")
    .eq("id", battleId)
    .maybeSingle<FounderBattleRow>();

  if (readError) return jsonError(readError.message, 500);
  if (!battle) return jsonError("Battle not found", 404);
  if (battle.fighter_a_user_id !== user.id) return jsonError("Only the founder can cancel this challenge", 403);
  if (battle.fighter_b_user_id) return jsonError("已有人接受挑戰，無法取消", 409);
  if (battle.status === "cancelled_founder") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }
  if (!canFounderCancelDropBattle(battle, user.id)) {
    return jsonError("This battle can no longer be cancelled", 409);
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("battles")
    .update({
      status: "cancelled_founder",
      cancellation_reason: "founder_manual",
      updated_at: now,
    })
    .eq("id", battleId)
    .eq("fighter_a_user_id", user.id)
    .is("fighter_b_user_id", null)
    .select("id")
    .maybeSingle();

  if (updateError) return jsonError(updateError.message, 500);
  if (!updated?.id) return jsonError("已有人接受挑戰，無法取消", 409);

  const notice = await admin.from("battle_notifications").insert({
    user_id: user.id,
    queue_id: null,
    battle_id: battleId,
    type: "battle_cancelled_founder",
    title: "挑戰已取消",
    body: "你已手動取消這場挑戰。",
    metadata: {
      titleEn: "Challenge cancelled",
      bodyEn: "You manually cancelled this challenge.",
      cancellationReason: "founder_manual",
      cancelledAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    notificationError: notice.error?.message ?? null,
  });
}
