import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CLOSEABLE_BATTLE_STATUSES = [
  "waiting",
  "confirming",
  "matched",
  "countdown",
  "live",
  "active",
  "ghost_battle",
  "public_voting",
  "settling",
];

const CLOSEABLE_QUEUE_STATUSES = [
  "queued",
  "pending",
  "searching",
  "waiting",
  "waiting_challenge",
  "confirming",
  "matched",
  "active",
  "ghost_battle",
  "public_voting",
];

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

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const token = tokenFromRequest(request);
  if (!token) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { battleId?: unknown; outcome?: unknown } | null;
  const battleId = isUuid(body?.battleId) ? body.battleId : null;
  if (!battleId) return jsonError("Missing battleId");

  const outcome = body?.outcome === "expired" ? "expired" : "completed";
  const battleStatus = outcome === "expired" ? "expired" : "finished";
  const now = new Date().toISOString();

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("Unauthorized", 401);

  const { data: battle, error: battleReadError } = await admin
    .from("battles")
    .select("id, queue_a_id, queue_b_id, status, fighter_a_user_id, fighter_b_user_id")
    .eq("id", battleId)
    .maybeSingle<{
      id: string;
      queue_a_id?: string | null;
      queue_b_id?: string | null;
      status?: string | null;
      fighter_a_user_id?: string | null;
      fighter_b_user_id?: string | null;
    }>();

  if (battleReadError) return jsonError(battleReadError.message, 500);
  if (!battle?.id) return jsonError("Battle not found", 404);
  if (battle.fighter_a_user_id !== user.id && battle.fighter_b_user_id !== user.id) return jsonError("Forbidden", 403);

  let completedBattles = 0;
  if (CLOSEABLE_BATTLE_STATUSES.includes(battle.status ?? "")) {
    const { data: updated, error } = await admin
      .from("battles")
      .update({ status: battleStatus, battle_ended_at: now, updated_at: now })
      .eq("id", battle.id)
      .in("status", CLOSEABLE_BATTLE_STATUSES)
      .select("id");
    if (error) return jsonError(error.message, 500);
    completedBattles = updated?.length ?? 0;
  }

  const linkedQueueIds = [battle.queue_a_id, battle.queue_b_id].filter((id): id is string => typeof id === "string" && id.length > 0);
  const queueIds = new Set<string>(linkedQueueIds);

  const { data: matchedQueues, error: queueReadError } = await admin
    .from("battle_queue")
    .select("id")
    .eq("match_group_id", battle.id)
    .in("status", CLOSEABLE_QUEUE_STATUSES);
  if (queueReadError) return jsonError(queueReadError.message, 500);
  (matchedQueues ?? []).forEach((row) => {
    if (typeof row.id === "string") queueIds.add(row.id);
  });

  let completedQueues = 0;
  const queueIdList = Array.from(queueIds);
  if (queueIdList.length > 0) {
    const { data: updatedQueues, error } = await admin
      .from("battle_queue")
      .update({ status: outcome, updated_at: now })
      .in("id", queueIdList)
      .in("status", CLOSEABLE_QUEUE_STATUSES)
      .select("id");
    if (error) return jsonError(error.message, 500);
    completedQueues = updatedQueues?.length ?? 0;
  }

  const notificationFilters: string[] = [`battle_id.eq.${battle.id}`];
  if (queueIdList.length > 0) notificationFilters.push(`queue_id.in.(${queueIdList.join(",")})`);
  await admin
    .from("battle_notifications")
    .update({ read_at: now })
    .in("type", ["battle_matched"])
    .is("read_at", null)
    .or(notificationFilters.join(","));

  return NextResponse.json({
    ok: true,
    completedBattles,
    completedQueues,
  });
}
