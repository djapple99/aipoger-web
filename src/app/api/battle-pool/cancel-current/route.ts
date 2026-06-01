import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ACTIVE_QUEUE_STATUSES = [
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
const ACTIVE_BATTLE_STATUSES = [
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

  const body = (await request.json().catch(() => null)) as { battleId?: unknown } | null;
  const battleId = isUuid(body?.battleId) ? body.battleId : null;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("Unauthorized", 401);

  let battleQuery = admin
    .from("battles")
    .select("id, queue_a_id, queue_b_id, status")
    .in("status", ACTIVE_BATTLE_STATUSES)
    .or(`fighter_a_user_id.eq.${user.id},fighter_b_user_id.eq.${user.id}`);

  if (battleId) battleQuery = battleQuery.eq("id", battleId);

  const { data: activeBattles, error: battleReadError } = await battleQuery;
  if (battleReadError) return jsonError(battleReadError.message, 500);

  const activeBattleIds = (activeBattles ?? []).map((row) => row.id).filter(Boolean);
  const linkedQueueIds = (activeBattles ?? [])
    .flatMap((row) => [row.queue_a_id, row.queue_b_id])
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const now = new Date().toISOString();

  if (activeBattleIds.length > 0) {
    const { error } = await admin
      .from("battles")
      .update({ status: "cancelled", updated_at: now })
      .in("id", activeBattleIds);
    if (error) return jsonError(error.message, 500);
  }

  let queueQuery = admin
    .from("battle_queue")
    .select("id")
    .in("status", ACTIVE_QUEUE_STATUSES)
    .eq("user_id", user.id);

  if (battleId) queueQuery = queueQuery.eq("match_group_id", battleId);
  const { data: ownQueues, error: ownQueueReadError } = await queueQuery;
  if (ownQueueReadError) return jsonError(ownQueueReadError.message, 500);

  const queueIds = Array.from(new Set([...(ownQueues ?? []).map((row) => row.id), ...linkedQueueIds].filter(Boolean)));
  if (queueIds.length > 0) {
    const { error } = await admin
      .from("battle_queue")
      .update({ status: "cancelled", updated_at: now })
      .in("id", queueIds);
    if (error) return jsonError(error.message, 500);
  }

  let cancelledNotifications = 0;
  const notificationFilters: string[] = [];
  if (queueIds.length > 0) notificationFilters.push(`queue_id.in.(${queueIds.join(",")})`);
  if (activeBattleIds.length > 0) notificationFilters.push(`battle_id.in.(${activeBattleIds.join(",")})`);
  if (notificationFilters.length > 0) {
    const { data: readNotifications } = await admin
      .from("battle_notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null)
      .or(notificationFilters.join(","))
      .select("id");
    cancelledNotifications = readNotifications?.length ?? 0;
  }

  return NextResponse.json({
    ok: true,
    cancelledBattles: activeBattleIds.length,
    cancelledQueues: queueIds.length,
    cancelledNotifications,
  });
}
