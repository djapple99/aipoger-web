export type MatchmakingQueueRow = {
  id: string;
  status: string;
  match_group_id: string | null;
  opponent_user_id: string | null;
  expires_at?: string | null;
};

export type DropBattleSchedulePreset = 10 | 15 | 20;

export const DROP_BATTLE_SCHEDULE_PRESETS: DropBattleSchedulePreset[] = [10, 15, 20];
export const DROP_BATTLE_SCHEDULE_MIN_LEAD_MS = 60 * 1000;
export const DROP_BATTLE_SCHEDULE_MAX_LEAD_MS = 24 * 60 * 60 * 1000;
export const DROP_BATTLE_CANCELLATION_DELAY_MS = 60 * 1000;
export const DROP_BATTLE_EXPECTED_END_BUFFER_MS = (45 * 2 + 2 + 5 + 30) * 1000;

const CLOSED_DROP_BATTLE_STATUSES = new Set([
  "finished",
  "cancelled",
  "cancelled_no_challenger",
  "cancelled_founder",
  "completed",
  "expired",
]);

export type DropBattleScheduleValidationError = "invalid" | "past" | "too_late";
export type DropBattleScheduleQueueSnapshot = {
  status?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

export type DropBattleOpenQueueSnapshot = {
  status?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

export type DropBattleCancellationSnapshot = {
  status?: string | null;
  fighter_a_user_id?: string | null;
  fighter_b_user_id?: string | null;
  cancellation_evaluation_at?: string | null;
};

export type DropBattleRuntimeSnapshot = {
  status?: string | null;
  battle_ended_at?: string | null;
  scheduled_start_at?: string | null;
  battle_started_at?: string | null;
  started_at?: string | null;
  created_at?: string | null;
};

export function resolveDropBattleScheduledStart(queue: DropBattleOpenQueueSnapshot) {
  const scheduledMs = new Date(queue.scheduled_start_at ?? "").getTime();
  if (Number.isFinite(scheduledMs)) return new Date(scheduledMs).toISOString();

  const cancellationEvaluationMs = new Date(queue.cancellation_evaluation_at ?? "").getTime();
  if (Number.isFinite(cancellationEvaluationMs)) {
    return new Date(cancellationEvaluationMs - DROP_BATTLE_CANCELLATION_DELAY_MS).toISOString();
  }

  const expiresMs = new Date(queue.expires_at ?? "").getTime();
  return Number.isFinite(expiresMs) ? new Date(expiresMs).toISOString() : null;
}

export function buildDropBattleSchedulePayload(scheduledStartIso: string | null) {
  if (!scheduledStartIso) return null;
  const scheduledStartMs = new Date(scheduledStartIso).getTime();
  if (!Number.isFinite(scheduledStartMs)) return null;
  return {
    scheduled_start_at: new Date(scheduledStartMs).toISOString(),
    cancellation_evaluation_at: new Date(scheduledStartMs + DROP_BATTLE_CANCELLATION_DELAY_MS).toISOString(),
  };
}

export function isClosedDropBattleStatus(status: string | null | undefined): boolean {
  return CLOSED_DROP_BATTLE_STATUSES.has(status ?? "");
}

export function resolveDropBattleRuntimeStart(battle: DropBattleRuntimeSnapshot): string | null {
  return battle.scheduled_start_at ?? battle.battle_started_at ?? battle.started_at ?? battle.created_at ?? null;
}

export function isDropBattleEndedOrPastExpectedEnd(
  battle: DropBattleRuntimeSnapshot | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!battle) return false;
  if (battle.battle_ended_at || isClosedDropBattleStatus(battle.status)) return true;
  const startMs = new Date(resolveDropBattleRuntimeStart(battle) ?? "").getTime();
  return Number.isFinite(startMs) && startMs + DROP_BATTLE_EXPECTED_END_BUFFER_MS <= nowMs;
}

export function validateDropBattleScheduledStart(
  scheduledStartIso: string | null,
  nowMs = Date.now(),
): DropBattleScheduleValidationError | null {
  if (!scheduledStartIso) return "invalid";
  const scheduledStartMs = new Date(scheduledStartIso).getTime();
  if (!Number.isFinite(scheduledStartMs)) return "invalid";
  if (scheduledStartMs < nowMs + DROP_BATTLE_SCHEDULE_MIN_LEAD_MS) return "past";
  if (scheduledStartMs > nowMs + DROP_BATTLE_SCHEDULE_MAX_LEAD_MS) return "too_late";
  return null;
}

export function buildDropBattleSchedulePayloadFromQueues(
  meRow: DropBattleScheduleQueueSnapshot,
  opponentRow: DropBattleScheduleQueueSnapshot,
  targetQueueId?: string | null,
) {
  const directSourceRow =
    targetQueueId
      ? opponentRow
      : meRow.status === "waiting_challenge"
        ? meRow
        : opponentRow.status === "waiting_challenge"
          ? opponentRow
          : null;
  const sourceRow =
    directSourceRow ??
    [meRow, opponentRow]
      .map((row) => {
        const scheduledStart = resolveDropBattleScheduledStart(row);
        const scheduledMs = new Date(scheduledStart ?? "").getTime();
        return Number.isFinite(scheduledMs) ? { row, scheduledMs } : null;
      })
      .filter((item): item is { row: DropBattleScheduleQueueSnapshot; scheduledMs: number } => Boolean(item))
      .sort((a, b) => b.scheduledMs - a.scheduledMs)[0]?.row ??
    null;
  if (!sourceRow) return null;

  const payload = buildDropBattleSchedulePayload(resolveDropBattleScheduledStart(sourceRow));
  if (!payload) return null;

  const cancellationEvaluationMs = new Date(sourceRow.cancellation_evaluation_at ?? "").getTime();
  return {
    scheduled_start_at: payload.scheduled_start_at,
    cancellation_evaluation_at: Number.isFinite(cancellationEvaluationMs)
      ? new Date(cancellationEvaluationMs).toISOString()
      : payload.cancellation_evaluation_at,
  };
}

export function shouldCancelStaleDropBattle(
  battle: DropBattleCancellationSnapshot,
  nowMs = Date.now(),
) {
  if (battle.status !== "pending") return false;
  if (battle.fighter_b_user_id) return false;
  const cancellationEvaluationMs = new Date(battle.cancellation_evaluation_at ?? "").getTime();
  return Number.isFinite(cancellationEvaluationMs) && cancellationEvaluationMs <= nowMs;
}

export function isDropChallengeAcceptable(
  queue: DropBattleOpenQueueSnapshot,
  nowMs = Date.now(),
) {
  if (queue.status !== "waiting_challenge") return false;
  const expiresMs = new Date(queue.cancellation_evaluation_at ?? queue.scheduled_start_at ?? queue.expires_at ?? "").getTime();
  return !Number.isFinite(expiresMs) || expiresMs > nowMs;
}

export function shouldExpireOpenDropQueue(
  queue: DropBattleOpenQueueSnapshot,
  nowMs = Date.now(),
) {
  if (!["searching", "waiting", "waiting_challenge", "public_voting", "ghost_battle"].includes(queue.status ?? "")) {
    return false;
  }
  const expiresMs = new Date(queue.cancellation_evaluation_at ?? queue.scheduled_start_at ?? queue.expires_at ?? "").getTime();
  return Number.isFinite(expiresMs) && expiresMs <= nowMs;
}

export function canFounderCancelDropBattle(
  battle: DropBattleCancellationSnapshot,
  founderUserId: string | null | undefined,
) {
  if (!founderUserId || battle.fighter_a_user_id !== founderUserId) return false;
  if (battle.fighter_b_user_id) return false;
  return !["finished", "cancelled", "cancelled_no_challenger"].includes(battle.status ?? "");
}

export async function attemptMatchmakingWithoutApcGate(args: {
  queueId: string;
  targetQueueId?: string | null;
  accessToken: string;
}): Promise<MatchmakingQueueRow | null> {
  const response = await fetch("/api/battle-pool/attempt-matchmaking", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.accessToken}`,
    },
    body: JSON.stringify({
      queueId: args.queueId,
      targetQueueId: args.targetQueueId ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    row?: MatchmakingQueueRow | null;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Matchmaking failed (${response.status})`);
  }

  return payload?.row ?? null;
}

export async function cancelCurrentBattleIntent(args: {
  accessToken: string;
  battleId?: string | null;
}): Promise<{ cancelledBattles: number; cancelledQueues: number }> {
  const response = await fetch("/api/battle-pool/cancel-current", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.accessToken}`,
    },
    body: JSON.stringify({
      battleId: args.battleId ?? null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    cancelledBattles?: number;
    cancelledQueues?: number;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Cancel failed (${response.status})`);
  }

  return {
    cancelledBattles: payload?.cancelledBattles ?? 0,
    cancelledQueues: payload?.cancelledQueues ?? 0,
  };
}

export async function completeBattleCardIntent(args: {
  accessToken: string;
  battleId: string;
  outcome?: "completed" | "expired";
}): Promise<{ completedBattles: number; completedQueues: number }> {
  const response = await fetch("/api/battle-pool/complete-battle-card", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.accessToken}`,
    },
    body: JSON.stringify({
      battleId: args.battleId,
      outcome: args.outcome ?? "completed",
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    completedBattles?: number;
    completedQueues?: number;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? `Complete battle failed (${response.status})`);
  }

  return {
    completedBattles: payload?.completedBattles ?? 0,
    completedQueues: payload?.completedQueues ?? 0,
  };
}
