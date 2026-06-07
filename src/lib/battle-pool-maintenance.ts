import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DROP_BATTLE_CANCELLATION_DELAY_MS,
  shouldCancelStaleDropBattle,
} from "@/lib/battle-pool-client";

type SupabaseAdmin = SupabaseClient;

type StaleBattleRow = {
  id: string;
  queue_a_id?: string | null;
  queue_b_id?: string | null;
  fighter_a_user_id: string | null;
  fighter_b_user_id: string | null;
  status: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

type QueueScheduleRow = {
  id: string;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  expires_at?: string | null;
};

export function isMissingScheduleColumn(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;
  return /scheduled_start_at|cancellation_evaluation_at|schema cache|column.*does not exist/i.test(msg) || error?.code === "PGRST204";
}

function datePlusCancellationDelay(value: string | null | undefined) {
  const ms = new Date(value ?? "").getTime();
  return Number.isFinite(ms) ? new Date(ms + DROP_BATTLE_CANCELLATION_DELAY_MS).toISOString() : null;
}

function reasonColumnError(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /cancellation_reason|constraint|check|schema cache|column.*does not exist|PGRST204|23514/i.test(msg);
}

async function loadQueueSchedules(admin: SupabaseAdmin, queueIds: string[]) {
  if (queueIds.length === 0) return new Map<string, QueueScheduleRow>();

  let { data, error } = await admin
    .from("battle_queue")
    .select("id,scheduled_start_at,cancellation_evaluation_at,expires_at")
    .in("id", queueIds);

  if (error && isMissingScheduleColumn(error)) {
    const legacy = await admin.from("battle_queue").select("id,expires_at").in("id", queueIds);
    data = legacy.data as typeof data;
    error = legacy.error;
  }

  if (error) throw error;
  return new Map(((data ?? []) as QueueScheduleRow[]).map((row) => [row.id, row]));
}

async function readPendingBattles(admin: SupabaseAdmin) {
  let { data, error } = await admin
    .from("battles")
    .select("id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,status,scheduled_start_at,cancellation_evaluation_at")
    .eq("status", "pending")
    .is("fighter_b_user_id", null)
    .limit(80);

  if (error && isMissingScheduleColumn(error)) {
    const legacy = await admin
      .from("battles")
      .select("id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,status")
      .eq("status", "pending")
      .is("fighter_b_user_id", null)
      .limit(80);
    data = legacy.data as typeof data;
    error = legacy.error;
  }

  if (error) throw error;
  const rows = (data ?? []) as StaleBattleRow[];
  const queueIds = Array.from(
    new Set(rows.flatMap((row) => [row.queue_a_id, row.queue_b_id]).filter((id): id is string => Boolean(id))),
  );
  const schedules = await loadQueueSchedules(admin, queueIds);

  return rows.map((row) => {
    const queue = (row.queue_a_id ? schedules.get(row.queue_a_id) : null) ?? (row.queue_b_id ? schedules.get(row.queue_b_id) : null);
    const scheduledStartAt = row.scheduled_start_at ?? queue?.scheduled_start_at ?? null;
    const cancellationEvaluationAt =
      row.cancellation_evaluation_at ??
      queue?.cancellation_evaluation_at ??
      datePlusCancellationDelay(scheduledStartAt) ??
      queue?.expires_at ??
      null;

    return {
      ...row,
      scheduled_start_at: scheduledStartAt ?? null,
      cancellation_evaluation_at: cancellationEvaluationAt,
    };
  });
}

export async function cancelStalePendingDropBattles(admin: SupabaseAdmin) {
  const now = new Date().toISOString();
  const errors: string[] = [];
  let rows: StaleBattleRow[] = [];

  try {
    rows = await readPendingBattles(admin);
  } catch (error) {
    return { cancelled: 0, errors: [`stale battle query: ${String((error as { message?: string })?.message ?? error)}`] };
  }

  let cancelled = 0;

  for (const battle of rows) {
    if (!shouldCancelStaleDropBattle(battle, Date.parse(now))) continue;

    let update = await admin
      .from("battles")
      .update({
        status: "cancelled_no_challenger",
        cancellation_reason: "no_challenger",
        battle_ended_at: now,
        updated_at: now,
      })
      .eq("id", battle.id)
      .eq("status", "pending")
      .is("fighter_b_user_id", null)
      .select("id")
      .maybeSingle();

    if (update.error && reasonColumnError(update.error)) {
      update = await admin
        .from("battles")
        .update({
          status: "cancelled_no_challenger",
          battle_ended_at: now,
          updated_at: now,
        })
        .eq("id", battle.id)
        .eq("status", "pending")
        .is("fighter_b_user_id", null)
        .select("id")
        .maybeSingle();
    }

    if (update.error) {
      errors.push(`cancel battle ${battle.id}: ${update.error.message}`);
      continue;
    }
    if (!update.data?.id) continue;

    cancelled += 1;

    const queueIds = [battle.queue_a_id, battle.queue_b_id].filter((id): id is string => Boolean(id));
    if (queueIds.length > 0) {
      const queueResult = await admin
        .from("battle_queue")
        .update({ status: "expired", updated_at: now })
        .in("id", queueIds);
      if (queueResult.error) errors.push(`expire queues ${battle.id}: ${queueResult.error.message}`);
    }

    if (!battle.fighter_a_user_id) {
      errors.push(`notify founder ${battle.id}: missing fighter_a_user_id`);
      continue;
    }

    const notice = await admin.from("battle_notifications").insert({
      user_id: battle.fighter_a_user_id,
      queue_id: battle.queue_a_id ?? null,
      battle_id: battle.id,
      type: "battle_cancelled_no_challenger",
      title: "挑戰自動取消",
      body: "你發起的挑戰在開戰時間過後仍無對手接受，已自動取消。",
      metadata: {
        titleEn: "Battle Auto-Cancelled",
        scheduledStartAt: battle.scheduled_start_at ?? null,
        cancellationEvaluationAt: battle.cancellation_evaluation_at ?? null,
        cancelledAt: now,
      },
    });

    if (notice.error) {
      errors.push(`notify founder ${battle.id}: ${notice.error.message}`);
    }
  }

  return { cancelled, errors };
}
