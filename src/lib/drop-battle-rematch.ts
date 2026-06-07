export const DROP_REMATCH_CLAIM_WINDOW_SECONDS = 5;
export const DROP_REMATCH_UPLOAD_SECONDS = 120;

export const DROP_REMATCH_STATUSES = ["open", "claimed", "uploaded", "expired", "cancelled"] as const;

export type DropRematchStatus = (typeof DROP_REMATCH_STATUSES)[number];

export type DropRematchClaimSnapshot = {
  status?: string | null;
  claim_window_ends_at?: string | null;
  upload_deadline_at?: string | null;
  claimer_user_id?: string | null;
};

export type DropRematchBattleResultSnapshot = {
  winner?: "fighter_a" | "fighter_b" | null;
  totalVotes?: number | null;
  battleType?: string | null;
  nextBattleId?: string | null;
};

export function isDropRematchStatus(value: unknown): value is DropRematchStatus {
  return DROP_REMATCH_STATUSES.includes(value as DropRematchStatus);
}

export function rematchDeadlineSecondsLeft(value: string | null | undefined, nowMs = Date.now()): number {
  const endMs = new Date(value ?? "").getTime();
  if (!Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.ceil((endMs - nowMs) / 1000));
}

export function isDropRematchClaimOpen(claim: DropRematchClaimSnapshot, nowMs = Date.now()): boolean {
  return claim.status === "open" && rematchDeadlineSecondsLeft(claim.claim_window_ends_at, nowMs) > 0;
}

export function isDropRematchUploadActive(claim: DropRematchClaimSnapshot, nowMs = Date.now()): boolean {
  return claim.status === "claimed" && rematchDeadlineSecondsLeft(claim.upload_deadline_at, nowMs) > 0;
}

export function canOpenDropRematchWindow(result: DropRematchBattleResultSnapshot): boolean {
  if (result.battleType && result.battleType !== "formal") return false;
  if (result.nextBattleId) return false;
  if (result.winner !== "fighter_a" && result.winner !== "fighter_b") return false;
  return (result.totalVotes ?? 0) > 0;
}

export function dropRematchUploadUrl(args: {
  claimId: string;
  sourceBattleId: string;
  defenderQueueId: string;
  defenderUserId: string;
  genre: string;
  lang?: string;
}) {
  const params = new URLSearchParams({
    lang: args.lang ?? "zh",
    rematchClaimId: args.claimId,
    sourceBattleId: args.sourceBattleId,
    defenderUserId: args.defenderUserId,
    challengeEntryId: args.defenderQueueId,
    genre: args.genre || "AI Music",
    instantPairing: "auto",
  });
  return `/battle/hook-cut?${params.toString()}`;
}
