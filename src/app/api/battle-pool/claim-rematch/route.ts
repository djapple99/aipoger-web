import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_DROP_QUEUE_STATUSES } from "@/lib/battle-pool-rules";
import { DROP_REMATCH_UPLOAD_SECONDS, dropRematchUploadUrl } from "@/lib/drop-battle-rematch";

type RematchClaimRow = {
  id: string;
  source_battle_id: string;
  winner_user_id: string;
  winner_side: "fighter_a" | "fighter_b";
  defender_queue_id: string;
  claimer_user_id: string | null;
  status: string;
  claim_window_started_at: string;
  claim_window_ends_at: string;
  claimed_at: string | null;
  upload_deadline_at: string | null;
  next_battle_id: string | null;
  next_queue_id: string | null;
};

type SupabaseAdmin = SupabaseClient;

type BattleRow = {
  id: string;
  genre: string | null;
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
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function serializeClaim(claim: RematchClaimRow, battle: BattleRow) {
  return {
    claimId: claim.id,
    sourceBattleId: claim.source_battle_id,
    winnerUserId: claim.winner_user_id,
    winnerSide: claim.winner_side,
    defenderQueueId: claim.defender_queue_id,
    claimerUserId: claim.claimer_user_id,
    status: claim.status,
    claimWindowStartedAt: claim.claim_window_started_at,
    claimWindowEndsAt: claim.claim_window_ends_at,
    claimedAt: claim.claimed_at,
    uploadDeadlineAt: claim.upload_deadline_at,
    nextBattleId: claim.next_battle_id,
    nextQueueId: claim.next_queue_id,
    genre: battle.genre || "AI Music",
  };
}

async function expireStaleClaims(admin: SupabaseAdmin, nowIso: string) {
  await admin
    .from("drop_battle_rematch_claims")
    .update({ status: "expired", updated_at: nowIso })
    .eq("status", "open")
    .lte("claim_window_ends_at", nowIso);

  await admin
    .from("drop_battle_rematch_claims")
    .update({ status: "expired", updated_at: nowIso })
    .eq("status", "claimed")
    .lte("upload_deadline_at", nowIso);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const token = tokenFromRequest(request);
  if (!token) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { sourceBattleId?: unknown; lang?: unknown } | null;
  const sourceBattleId = isUuid(body?.sourceBattleId) ? body.sourceBattleId : null;
  const lang = body?.lang === "en" ? "en" : "zh";
  if (!sourceBattleId) return jsonError("Missing sourceBattleId");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("Unauthorized", 401);

  const now = new Date();
  const nowIso = now.toISOString();
  await expireStaleClaims(admin, nowIso);

  const { data: claim, error: claimError } = await admin
    .from("drop_battle_rematch_claims")
    .select("*")
    .eq("source_battle_id", sourceBattleId)
    .maybeSingle<RematchClaimRow>();
  if (claimError) return jsonError(claimError.message, 500);
  if (!claim?.id) return jsonError("Rematch window not found", 404);
  if (claim.status !== "open") return jsonError("已有人取得挑戰席，或挑戰時間已結束。", 409);
  if (claim.winner_user_id === user.id) return jsonError("擂主不能挑戰自己。", 409);
  if (new Date(claim.claim_window_ends_at).getTime() <= now.getTime()) return jsonError("5 秒挑戰席已截止。", 409);

  const { data: battle, error: battleError } = await admin
    .from("battles")
    .select("id,genre")
    .eq("id", sourceBattleId)
    .maybeSingle<BattleRow>();
  if (battleError) return jsonError(battleError.message, 500);
  if (!battle?.id) return jsonError("Battle not found", 404);

  const { data: activeRematch, error: activeRematchError } = await admin
    .from("drop_battle_rematch_claims")
    .select("id")
    .eq("claimer_user_id", user.id)
    .eq("status", "claimed")
    .gt("upload_deadline_at", nowIso)
    .limit(1);
  if (activeRematchError) return jsonError(activeRematchError.message, 500);
  if ((activeRematch ?? []).length > 0) return jsonError("你已有一個守擂挑戰席正在上傳中。", 409);

  const { data: activeChallengerQueues, error: activeQueueError } = await admin
    .from("battle_queue")
    .select("id")
    .eq("user_id", user.id)
    .in("status", [...ACTIVE_DROP_QUEUE_STATUSES])
    .not("challenge_target_queue_id", "is", null)
    .limit(1);
  if (activeQueueError) return jsonError(activeQueueError.message, 500);
  if ((activeChallengerQueues ?? []).length > 0) {
    return jsonError("你目前已經接了一張 Drop Battle 戰帖。請先完成或取消那場挑戰，再接下一張。", 409);
  }

  const uploadDeadlineAt = new Date(now.getTime() + DROP_REMATCH_UPLOAD_SECONDS * 1000).toISOString();
  const { data: updated, error: updateError } = await admin
    .from("drop_battle_rematch_claims")
    .update({
      claimer_user_id: user.id,
      status: "claimed",
      claimed_at: nowIso,
      upload_deadline_at: uploadDeadlineAt,
      updated_at: nowIso,
    })
    .eq("id", claim.id)
    .eq("status", "open")
    .is("claimer_user_id", null)
    .gt("claim_window_ends_at", nowIso)
    .select("*")
    .maybeSingle<RematchClaimRow>();

  if (updateError) return jsonError(updateError.message, 500);
  if (!updated?.id) return jsonError("已有人先搶到挑戰席。", 409);

  const uploadUrl = dropRematchUploadUrl({
    claimId: updated.id,
    sourceBattleId,
    defenderQueueId: updated.defender_queue_id,
    defenderUserId: updated.winner_user_id,
    genre: battle.genre || "AI Music",
    lang,
  });

  return NextResponse.json({
    claim: serializeClaim(updated, battle),
    uploadDeadlineAt,
    uploadUrl,
  });
}
