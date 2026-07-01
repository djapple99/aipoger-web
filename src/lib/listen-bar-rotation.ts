import {
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  LISTEN_BAR_GENRE_POOL_LIMIT,
  LISTEN_BAR_PUBLIC_EVICTION_LIMIT,
  LISTEN_BAR_PROMOTION_PROTECTION_UNTIL,
  listenBarIsHonorEligible,
  listenBarPromotionProtectionActive,
  listenBarSurvivalStartedAt,
} from "./listen-bar-rules.ts";

export type ListenBarRotationTrack = {
  id: string;
  title?: string | null;
  genre?: string | null;
  barPhase?: "challenger" | "public" | null;
  positiveReactionCount?: number | null;
  createdAt?: string | null;
  promotedAt?: string | null;
};

export type ListenBarRotationPreview = {
  activeCommunity: number;
  activePublic: number;
  activeChallenger: number;
  eligibleChallengerCount: number;
  projectedPublicCount: number;
  publicOverflow: number;
  evictionLimit: number;
  evictionPaused: boolean;
  evictionPausedUntil: string;
  wouldPromote: ListenBarRotationTrack[];
  wouldRemove: ListenBarRotationTrack[];
};

function timestampMs(value: string | null | undefined) {
  const ms = new Date(value ?? "").getTime();
  return Number.isFinite(ms) ? ms : null;
}

function reactionCount(track: ListenBarRotationTrack) {
  return Math.max(0, Math.round(track.positiveReactionCount ?? 0));
}

function createdAtSortValue(track: ListenBarRotationTrack) {
  return timestampMs(track.createdAt) ?? 0;
}

function genreKey(track: ListenBarRotationTrack) {
  return track.genre?.trim() || "Original 自我風格";
}

function overflowRemovalCandidatesByGenre(tracks: ListenBarRotationTrack[], nowMs: number) {
  const groups = new Map<string, ListenBarRotationTrack[]>();
  for (const track of tracks) {
    const key = genreKey(track);
    groups.set(key, [...(groups.get(key) ?? []), track]);
  }

  return Array.from(groups.entries()).flatMap(([genre, group]) => {
    const overflow = Math.max(0, group.length - LISTEN_BAR_GENRE_POOL_LIMIT);
    if (overflow === 0) return [];
    const survivalStartedAt = listenBarSurvivalStartedAt(group, LISTEN_BAR_GENRE_POOL_LIMIT, genre);
    return [...group]
      .filter((track) => !listenBarIsHonorEligible(track, nowMs, survivalStartedAt))
      .sort((left, right) => {
        const byReaction = reactionCount(left) - reactionCount(right);
        if (byReaction !== 0) return byReaction;
        return createdAtSortValue(left) - createdAtSortValue(right);
      })
      .slice(0, overflow);
  });
}

export function buildListenBarRotationPreview(
  tracks: ListenBarRotationTrack[],
  nowMs = Date.now(),
): ListenBarRotationPreview {
  const evictionPaused = listenBarPromotionProtectionActive(nowMs);
  const activePublicTracks = tracks.filter((track) => track.barPhase === "public");
  const activeChallengerTracks = tracks.filter((track) => track.barPhase !== "public");
  const observationCutoffMs = nowMs - LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS * 60 * 60 * 1000;
  const wouldPromote = activeChallengerTracks
    .filter((track) => {
      const createdAtMs = timestampMs(track.createdAt);
      return createdAtMs !== null && createdAtMs < observationCutoffMs;
    })
    .sort((left, right) => createdAtSortValue(left) - createdAtSortValue(right));

  const projectedPublicTracks = [...activePublicTracks, ...wouldPromote];
  const removalCandidates = overflowRemovalCandidatesByGenre(projectedPublicTracks, nowMs);
  const publicOverflow = removalCandidates.length;
  const wouldRemove = evictionPaused
    ? []
    : removalCandidates.slice(0, LISTEN_BAR_PUBLIC_EVICTION_LIMIT);

  return {
    activeCommunity: tracks.length,
    activePublic: activePublicTracks.length,
    activeChallenger: activeChallengerTracks.length,
    eligibleChallengerCount: wouldPromote.length,
    projectedPublicCount: projectedPublicTracks.length,
    publicOverflow,
    evictionLimit: LISTEN_BAR_PUBLIC_EVICTION_LIMIT,
    evictionPaused,
    evictionPausedUntil: LISTEN_BAR_PROMOTION_PROTECTION_UNTIL,
    wouldPromote,
    wouldRemove,
  };
}
