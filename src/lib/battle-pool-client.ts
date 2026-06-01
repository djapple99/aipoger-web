export type MatchmakingQueueRow = {
  id: string;
  status: string;
  match_group_id: string | null;
  opponent_user_id: string | null;
  expires_at?: string | null;
};

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
