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

export type DropBattleScheduleValidationError = "invalid" | "past" | "too_late";
export type DropBattleScheduleQueueSnapshot = {
  status?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

export function buildDropBattleSchedulePayload(scheduledStartIso: string | null) {
  if (!scheduledStartIso) return null;
  const scheduledStartMs = new Date(scheduledStartIso).getTime();
  if (!Number.isFinite(scheduledStartMs)) return null;
  return {
    scheduled_start_at: new Date(scheduledStartMs).toISOString(),
    cancellation_evaluation_at: new Date(scheduledStartMs + DROP_BATTLE_CANCELLATION_DELAY_MS).toISOString(),
  };
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
  const sourceRow =
    targetQueueId
      ? opponentRow
      : meRow.status === "waiting_challenge"
        ? meRow
        : opponentRow.status === "waiting_challenge"
          ? opponentRow
          : null;
  if (!sourceRow) return null;

  const payload = buildDropBattleSchedulePayload(sourceRow.scheduled_start_at ?? sourceRow.expires_at ?? null);
  if (!payload) return null;

  const cancellationEvaluationMs = new Date(sourceRow.cancellation_evaluation_at ?? "").getTime();
  return {
    scheduled_start_at: payload.scheduled_start_at,
    cancellation_evaluation_at: Number.isFinite(cancellationEvaluationMs)
      ? new Date(cancellationEvaluationMs).toISOString()
      : payload.cancellation_evaluation_at,
  };
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
