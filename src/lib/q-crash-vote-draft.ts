export type QCrashVoteDraftSide = "fighter_a" | "fighter_b";

export type QCrashVoteDraft = {
  vote: QCrashVoteDraftSide | null;
  comment: string;
  expiresAt: number;
};

const Q_CRASH_VOTE_DRAFT_PREFIX = "aipoger:q-crash-vote-draft:";
const DEFAULT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export function qCrashVoteDraftKey(cardOrBattleId: string) {
  return `${Q_CRASH_VOTE_DRAFT_PREFIX}${cardOrBattleId}`;
}

export function parseQCrashVoteDraft(raw: string | null, now = Date.now()): QCrashVoteDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<QCrashVoteDraft>;
    const vote = value.vote === "fighter_a" || value.vote === "fighter_b" ? value.vote : null;
    const expiresAt = Number(value.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
    return {
      vote,
      comment: typeof value.comment === "string" ? value.comment : "",
      expiresAt,
    };
  } catch {
    return null;
  }
}

export function readQCrashVoteDraft(cardOrBattleId: string): QCrashVoteDraft | null {
  if (typeof window === "undefined") return null;
  const key = qCrashVoteDraftKey(cardOrBattleId);
  try {
    const draft = parseQCrashVoteDraft(window.localStorage.getItem(key));
    if (!draft) window.localStorage.removeItem(key);
    return draft;
  } catch {
    return null;
  }
}

export function rememberQCrashVoteDraft(
  cardOrBattleId: string,
  patch: Partial<Pick<QCrashVoteDraft, "vote" | "comment">>,
  expiresAt?: string | number | null,
) {
  if (typeof window === "undefined") return;
  const previous = readQCrashVoteDraft(cardOrBattleId);
  const parsedExpiry = typeof expiresAt === "number" ? expiresAt : new Date(expiresAt ?? "").getTime();
  const safeExpiry = Number.isFinite(parsedExpiry) && parsedExpiry > Date.now()
    ? parsedExpiry
    : Date.now() + DEFAULT_DRAFT_TTL_MS;
  const next: QCrashVoteDraft = {
    vote: patch.vote === undefined ? previous?.vote ?? null : patch.vote,
    comment: patch.comment === undefined ? previous?.comment ?? "" : patch.comment,
    expiresAt: safeExpiry,
  };
  try {
    window.localStorage.setItem(qCrashVoteDraftKey(cardOrBattleId), JSON.stringify(next));
  } catch {
    // A draft is a convenience only; voting still works if storage is blocked.
  }
}

export function clearQCrashVoteDraft(cardOrBattleId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(qCrashVoteDraftKey(cardOrBattleId));
  } catch {
    // Ignore storage cleanup failures.
  }
}
