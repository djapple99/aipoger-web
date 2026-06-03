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
