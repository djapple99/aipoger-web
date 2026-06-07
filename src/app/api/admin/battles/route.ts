import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import { cancelStalePendingDropBattles, isMissingScheduleColumn } from "@/lib/battle-pool-maintenance";

const ACTIVE_BATTLE_STATUSES = [
  "pending",
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

type AdminClient = ReturnType<typeof adminClient>;

type BattleRow = {
  id: string;
  queue_a_id?: string | null;
  queue_b_id?: string | null;
  fighter_a_user_id?: string | null;
  fighter_b_user_id?: string | null;
  fighter_a_name?: string | null;
  fighter_b_name?: string | null;
  song_a_name?: string | null;
  song_b_name?: string | null;
  status?: string | null;
  genre?: string | null;
  created_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  started_at?: string | null;
  battle_started_at?: string | null;
  battle_ended_at?: string | null;
};

type QueueRow = {
  id: string;
  user_id?: string | null;
  fighter_name?: string | null;
  original_file_name?: string | null;
  genre?: string | null;
  status?: string | null;
  match_group_id?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cancellationReasonError(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /cancellation_reason|constraint|check|schema cache|column.*does not exist|PGRST204|23514/i.test(msg);
}

async function requireOwnerAdmin(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401) };

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { admin, userId: data.user.id };
}

async function loadBattles(admin: AdminClient) {
  const modernSelect = [
    "id",
    "queue_a_id",
    "queue_b_id",
    "fighter_a_user_id",
    "fighter_b_user_id",
    "fighter_a_name",
    "fighter_b_name",
    "song_a_name",
    "song_b_name",
    "status",
    "genre",
    "created_at",
    "scheduled_start_at",
    "cancellation_evaluation_at",
    "started_at",
    "battle_started_at",
    "battle_ended_at",
  ].join(",");
  const legacySelect = modernSelect
    .replace(",scheduled_start_at", "")
    .replace(",cancellation_evaluation_at", "");

  let { data, error } = await admin
    .from("battles")
    .select(modernSelect)
    .in("status", ACTIVE_BATTLE_STATUSES)
    .is("battle_ended_at", null)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error && isMissingScheduleColumn(error)) {
    const legacy = await admin
      .from("battles")
      .select(legacySelect)
      .in("status", ACTIVE_BATTLE_STATUSES)
      .is("battle_ended_at", null)
      .order("created_at", { ascending: false })
      .limit(80);
    data = legacy.data as typeof data;
    error = legacy.error;
  }

  if (error) throw error;
  return (data ?? []) as unknown as BattleRow[];
}

async function loadQueues(admin: AdminClient) {
  const modernSelect = "id,user_id,fighter_name,original_file_name,genre,status,match_group_id,created_at,expires_at,scheduled_start_at,cancellation_evaluation_at";
  const legacySelect = "id,user_id,fighter_name,original_file_name,genre,status,match_group_id,created_at,expires_at";

  let { data, error } = await admin
    .from("battle_queue")
    .select(modernSelect)
    .in("status", ACTIVE_QUEUE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error && isMissingScheduleColumn(error)) {
    const legacy = await admin
      .from("battle_queue")
      .select(legacySelect)
      .in("status", ACTIVE_QUEUE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(120);
    data = legacy.data as typeof data;
    error = legacy.error;
  }

  if (error) throw error;
  return (data ?? []) as unknown as QueueRow[];
}

async function updateBattleCancelled(admin: AdminClient, battleId: string, now: string) {
  let result = await admin
    .from("battles")
    .update({
      status: "cancelled",
      cancellation_reason: "admin_cancelled",
      battle_ended_at: now,
      updated_at: now,
    })
    .eq("id", battleId)
    .in("status", ACTIVE_BATTLE_STATUSES)
    .select("id,status")
    .maybeSingle();

  if (result.error && cancellationReasonError(result.error)) {
    result = await admin
      .from("battles")
      .update({
        status: "cancelled",
        battle_ended_at: now,
        updated_at: now,
      })
      .eq("id", battleId)
      .in("status", ACTIVE_BATTLE_STATUSES)
      .select("id,status")
      .maybeSingle();
  }

  if (result.error) throw result.error;
  return result.data?.id ? 1 : 0;
}

async function cancelBattle(admin: AdminClient, battleId: string, note: string | null) {
  const { data: battle, error } = await admin
    .from("battles")
    .select("id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,status")
    .eq("id", battleId)
    .maybeSingle<BattleRow>();
  if (error) throw error;
  if (!battle?.id) return { cancelledBattles: 0, cancelledQueues: 0, notificationsRead: 0, noticeInserted: 0 };

  const now = new Date().toISOString();
  const cancelledBattles = await updateBattleCancelled(admin, battle.id, now);
  const baseQueueIds = [battle.queue_a_id, battle.queue_b_id].filter((id): id is string => Boolean(id));

  let queueQuery = admin
    .from("battle_queue")
    .select("id,user_id,status,original_file_name,match_group_id");
  queueQuery = baseQueueIds.length > 0
    ? queueQuery.or(`id.in.(${baseQueueIds.join(",")}),match_group_id.eq.${battle.id}`)
    : queueQuery.eq("match_group_id", battle.id);
  const { data: linkedQueues, error: queueReadError } = await queueQuery;
  if (queueReadError) throw queueReadError;

  const queueIds = Array.from(new Set(((linkedQueues ?? []) as QueueRow[]).map((row) => row.id).filter(Boolean)));
  const queueUsers = ((linkedQueues ?? []) as QueueRow[]).map((row) => row.user_id).filter((id): id is string => Boolean(id));
  const queueUpdate = queueIds.length > 0
    ? await admin.from("battle_queue").update({ status: "cancelled", updated_at: now }).in("id", queueIds).in("status", ACTIVE_QUEUE_STATUSES).select("id")
    : { data: [], error: null };
  if (queueUpdate.error) throw queueUpdate.error;

  const notificationFilters = [`battle_id.eq.${battle.id}`];
  if (queueIds.length > 0) notificationFilters.push(`queue_id.in.(${queueIds.join(",")})`);
  const readNotifications = await admin
    .from("battle_notifications")
    .update({ read_at: now })
    .is("read_at", null)
    .or(notificationFilters.join(","))
    .select("id");

  const notifyUsers = Array.from(
    new Set([battle.fighter_a_user_id, battle.fighter_b_user_id, ...queueUsers].filter((id): id is string => Boolean(id))),
  );
  const notices = notifyUsers.map((userId) => ({
    user_id: userId,
    queue_id: null,
    battle_id: battle.id,
    type: "battle_admin_cancelled",
    title: "Battle 已取消",
    body: note || "這場 Drop Battle 已由 AIPOGER 後台取消。",
    metadata: {
      cancelledAt: now,
      reason: "admin_cancelled",
      fighterA: battle.fighter_a_name ?? null,
      fighterB: battle.fighter_b_name ?? null,
      songA: battle.song_a_name ?? null,
      songB: battle.song_b_name ?? null,
    },
  }));
  const noticeInsert = notices.length > 0
    ? await admin.from("battle_notifications").insert(notices).select("id")
    : { data: [], error: null };

  return {
    cancelledBattles,
    cancelledQueues: queueUpdate.data?.length ?? 0,
    notificationsRead: readNotifications.data?.length ?? 0,
    noticeInserted: noticeInsert.error ? 0 : (noticeInsert.data?.length ?? 0),
    noticeError: noticeInsert.error?.message ?? null,
  };
}

async function cancelQueue(admin: AdminClient, queueId: string, note: string | null) {
  const { data: queue, error } = await admin
    .from("battle_queue")
    .select("id,user_id,status,match_group_id")
    .eq("id", queueId)
    .maybeSingle<QueueRow>();
  if (error) throw error;
  if (!queue?.id) return { cancelledBattles: 0, cancelledQueues: 0, notificationsRead: 0, noticeInserted: 0 };
  if (queue.match_group_id) return cancelBattle(admin, queue.match_group_id, note);

  const now = new Date().toISOString();
  const queueUpdate = await admin
    .from("battle_queue")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", queue.id)
    .in("status", ACTIVE_QUEUE_STATUSES)
    .select("id")
    .maybeSingle();
  if (queueUpdate.error) throw queueUpdate.error;

  const readNotifications = await admin
    .from("battle_notifications")
    .update({ read_at: now })
    .eq("queue_id", queue.id)
    .is("read_at", null)
    .select("id");

  const noticeInsert = queue.user_id
    ? await admin.from("battle_notifications").insert({
        user_id: queue.user_id,
        queue_id: queue.id,
        battle_id: null,
        type: "battle_admin_cancelled",
        title: "戰帖已取消",
        body: note || "這張 Drop Battle 戰帖已由 AIPOGER 後台取消。",
        metadata: { cancelledAt: now, reason: "admin_cancelled" },
      }).select("id")
    : { data: [], error: null };

  return {
    cancelledBattles: 0,
    cancelledQueues: queueUpdate.data?.id ? 1 : 0,
    notificationsRead: readNotifications.data?.length ?? 0,
    noticeInserted: noticeInsert.error ? 0 : (Array.isArray(noticeInsert.data) ? noticeInsert.data.length : 1),
    noticeError: noticeInsert.error?.message ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const { admin } = guard;
    const [battles, queues] = await Promise.all([loadBattles(admin), loadQueues(admin)]);
    return NextResponse.json({ battles, queues });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const { admin } = guard;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("後台動作格式不正確。");

    const action = cleanText(body.action, 80);
    if (action === "cleanup_expired") {
      const rpc = await admin.rpc("process_battle_pool_fallbacks");
      const stalePending = await cancelStalePendingDropBattles(admin);
      return NextResponse.json({
        ok: true,
        poolProcessed: rpc.error ? 0 : Number(rpc.data ?? 0),
        cancelledBattles: stalePending.cancelled,
        cancelledQueues: 0,
        warnings: [rpc.error?.message, ...stalePending.errors].filter(Boolean),
      });
    }

    const battleId = isUuid(body.battleId) ? body.battleId : null;
    const queueId = isUuid(body.queueId) ? body.queueId : null;
    const note = cleanText(body.note, 500);
    if (!battleId && !queueId) return jsonError("缺少 battleId 或 queueId。");

    const result = battleId ? await cancelBattle(admin, battleId, note) : await cancelQueue(admin, queueId as string, note);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
