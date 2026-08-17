export const Q_CRASH_EDITORIAL_COVER_BUCKET = "battle-audio";
export const Q_CRASH_EDITORIAL_COVER_PREFIX = "q-crash/editorial";

export type QCrashEditorialStatus =
  | "q_crash_pending_invite"
  | "q_crash_joining"
  | "q_crash_voting"
  | "q_crash_finished"
  | "q_crash_insufficient"
  | "q_crash_cancelled";

export function qCrashEditorialCanEdit(status: string | null | undefined) {
  return status === "q_crash_pending_invite" || status === "q_crash_joining" || status === "q_crash_finished";
}

export function qCrashEditorialIsVotingLocked(status: string | null | undefined) {
  return status === "q_crash_voting";
}

export function qCrashEditorialShowsFullSong(status: string | null | undefined) {
  return status === "q_crash_finished";
}

export function normalizeQCrashFullSongUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean) return null;
  if (clean.length > 500) return null;
  try {
    const url = new URL(clean);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isQCrashEditorialCoverPath(value: string | null | undefined) {
  return Boolean(value && value.startsWith(`${Q_CRASH_EDITORIAL_COVER_PREFIX}/`));
}
