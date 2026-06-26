import {
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  LISTEN_BAR_PUBLIC_EVICTION_LIMIT,
  LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
} from "./listen-bar-rules.ts";

export type ListenBarRotationTrack = {
  id: string;
  title?: string | null;
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

export function buildListenBarRotationPreview(
  tracks: ListenBarRotationTrack[],
  nowMs = Date.now(),
): ListenBarRotationPreview {
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
  const publicOverflow = Math.max(0, projectedPublicTracks.length - LISTEN_BAR_PUBLIC_ROTATION_LIMIT);
  const wouldRemove = [...projectedPublicTracks]
    .sort((left, right) => {
      const byReaction = reactionCount(left) - reactionCount(right);
      if (byReaction !== 0) return byReaction;
      return createdAtSortValue(left) - createdAtSortValue(right);
    })
    .slice(0, Math.min(publicOverflow, LISTEN_BAR_PUBLIC_EVICTION_LIMIT));

  return {
    activeCommunity: tracks.length,
    activePublic: activePublicTracks.length,
    activeChallenger: activeChallengerTracks.length,
    eligibleChallengerCount: wouldPromote.length,
    projectedPublicCount: projectedPublicTracks.length,
    publicOverflow,
    evictionLimit: LISTEN_BAR_PUBLIC_EVICTION_LIMIT,
    wouldPromote,
    wouldRemove,
  };
}
