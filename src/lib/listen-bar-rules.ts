export const LISTEN_BAR_CHALLENGER_SLOT_LIMIT = 3;
export const LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD = 30;
export const LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS = 7;
export const LISTEN_BAR_PUBLIC_ROTATION_LIMIT = 88;
export const LISTEN_BAR_TOTAL_ROTATION_LIMIT = 100;
export const LISTEN_BAR_CHALLENGER_HOURLY_LIMIT = 8;
export const LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS = 24;
export const LISTEN_BAR_JUDGMENT_INTERVAL_HOURS = 8;
export const LISTEN_BAR_PUBLIC_EVICTION_LIMIT = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function listenBarChallengerSlotLimitForPublicCount(publicTrackCount: number): number {
  const count = Math.max(0, Math.floor(Number.isFinite(publicTrackCount) ? publicTrackCount : 0));
  if (count >= 6) return 1;
  if (count >= 3) return 2;
  return LISTEN_BAR_CHALLENGER_SLOT_LIMIT;
}

type ListenBarHonorTrack = {
  barPhase?: "challenger" | "public" | null;
  positiveReactionCount?: number | null;
  promotedAt?: string | null;
  createdAt?: string | null;
};

function timestampMs(value: string | null | undefined): number | null {
  const ms = new Date(value ?? "").getTime();
  return Number.isFinite(ms) ? ms : null;
}

function publicStartMs(track: Pick<ListenBarHonorTrack, "promotedAt" | "createdAt">) {
  return timestampMs(track.promotedAt) ?? timestampMs(track.createdAt);
}

export function listenBarSurvivalStartedAt(
  tracks: ListenBarHonorTrack[],
  publicLimit = LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
): string | null {
  const publicStartTimes = tracks
    .filter((track) => track.barPhase === "public")
    .map(publicStartMs)
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);

  if (publicStartTimes.length < publicLimit) return null;
  return new Date(publicStartTimes[publicLimit - 1]).toISOString();
}

export function listenBarPublicSurvivalDays(
  promotedAt: string | null | undefined,
  createdAt: string | null | undefined,
  nowMs = Date.now(),
  survivalStartedAt?: string | null,
) {
  const trackStartMs = publicStartMs({ promotedAt, createdAt });
  const survivalStartMs = timestampMs(survivalStartedAt);
  const startMs = survivalStartMs !== null
    ? Math.max(trackStartMs ?? survivalStartMs, survivalStartMs)
    : trackStartMs;
  if (!startMs || startMs > nowMs) return 0;
  return Math.floor((nowMs - startMs) / DAY_MS);
}

export function listenBarPublicDisplayDay(
  promotedAt: string | null | undefined,
  createdAt: string | null | undefined,
  nowMs = Date.now(),
  survivalStartedAt?: string | null,
) {
  const trackStartMs = publicStartMs({ promotedAt, createdAt });
  const survivalStartMs = timestampMs(survivalStartedAt);
  const startMs = survivalStartMs !== null
    ? Math.max(trackStartMs ?? survivalStartMs, survivalStartMs)
    : trackStartMs;
  if (!startMs || startMs > nowMs) return 0;
  return Math.max(1, Math.ceil((nowMs - startMs) / DAY_MS));
}

export function listenBarIsHonorEligible(
  track: Pick<ListenBarHonorTrack, "positiveReactionCount" | "promotedAt" | "createdAt">,
  nowMs = Date.now(),
  survivalStartedAt?: string | null,
) {
  if (!survivalStartedAt) return false;
  return (
    Math.max(0, Math.round(track.positiveReactionCount ?? 0)) >= LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD ||
    listenBarPublicSurvivalDays(track.promotedAt, track.createdAt, nowMs, survivalStartedAt) >= LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS
  );
}
