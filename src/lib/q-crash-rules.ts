import { pickDropBattleWinnerForRules } from "./ai-music-challenge-rules.ts";

export const Q_CRASH_BATTLE_TYPE = "q_crash";
export const Q_CRASH_OFFICIAL_AUDIENCE_MIN = 3;
export const Q_CRASH_MAX_DROP_SECONDS = 60;
export const Q_CRASH_INVITE_HOURS = 24;
export const Q_CRASH_DURATION_PRESETS = [30, 120, 360, 1440] as const;

export type QCrashDurationMinutes = (typeof Q_CRASH_DURATION_PRESETS)[number];
export type QCrashSide = "fighter_a" | "fighter_b";
export type QCrashCardStatus =
  | "q_crash_pending_invite"
  | "q_crash_joining"
  | "q_crash_voting"
  | "q_crash_finished"
  | "q_crash_insufficient"
  | "q_crash_cancelled";

export function qCrashDurationMinutes(value: unknown): QCrashDurationMinutes | null {
  const minutes = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Q_CRASH_DURATION_PRESETS.includes(minutes as QCrashDurationMinutes)
    ? (minutes as QCrashDurationMinutes)
    : null;
}

export function isValidQCrashDropDuration(value: unknown): boolean {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 && seconds <= Q_CRASH_MAX_DROP_SECONDS;
}

export function qCrashGenresMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = left?.trim();
  const b = right?.trim();
  return Boolean(a && b && a === b);
}

export function isQCrashOfficialAudienceCount(value: unknown): boolean {
  const count = Number(value);
  return Number.isFinite(count) && count >= Q_CRASH_OFFICIAL_AUDIENCE_MIN;
}

export function canQCrashAccountJoin(args: {
  status: string | null | undefined;
  founderUserId: string;
  invitedUserId?: string | null;
  viewerUserId?: string | null;
  inviteExpiresAt?: string | null;
  nowMs?: number;
}): boolean {
  if (args.status !== "q_crash_pending_invite" || !args.viewerUserId) return false;
  const expiresMs = new Date(args.inviteExpiresAt ?? "").getTime();
  if (Number.isFinite(expiresMs) && expiresMs <= (args.nowMs ?? Date.now())) return false;
  if (args.viewerUserId === args.founderUserId) return true;
  return !args.invitedUserId || args.viewerUserId === args.invitedUserId;
}

export function isQCrashVotingOpen(args: {
  status: string | null | undefined;
  votingEndsAt?: string | null;
  nowMs?: number;
}): boolean {
  if (args.status !== "q_crash_voting") return false;
  const endMs = new Date(args.votingEndsAt ?? "").getTime();
  return Number.isFinite(endMs) && endMs > (args.nowMs ?? Date.now());
}

export function canQCrashAccountVote(args: {
  status: string | null | undefined;
  votingEndsAt?: string | null;
  viewerUserId?: string | null;
  fighterAUserId?: string | null;
  fighterBUserId?: string | null;
  alreadyVoted?: boolean;
  nowMs?: number;
}): boolean {
  if (!args.viewerUserId || args.alreadyVoted) return false;
  if (args.viewerUserId === args.fighterAUserId || args.viewerUserId === args.fighterBUserId) return false;
  return isQCrashVotingOpen(args);
}

export function pickQCrashWinner(
  counts: Record<QCrashSide, number>,
  battleId: string,
): QCrashSide | null {
  return pickDropBattleWinnerForRules(counts, battleId, null, Q_CRASH_BATTLE_TYPE);
}

export function qCrashVersionLabels(songA: string | null | undefined, songB: string | null | undefined) {
  const sameTitle = Boolean(songA?.trim() && songA?.trim().localeCompare(songB?.trim() ?? "", undefined, { sensitivity: "base" }) === 0);
  return sameTitle
    ? { A: "版本 A", B: "版本 B" }
    : { A: "作品 A", B: "作品 B" };
}
