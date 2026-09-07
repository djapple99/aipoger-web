export type ListenBarRotationTrack = {
  id: string;
  title?: string | null;
  genre?: string | null;
  createdBy?: string | null;
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

// Kept as a read-only compatibility shape for historical monitoring clients.
export function buildListenBarRotationPreview(tracks: ListenBarRotationTrack[], _nowMs = Date.now()): ListenBarRotationPreview {
  void _nowMs;
  return {
    activeCommunity: tracks.length,
    activePublic: tracks.length,
    activeChallenger: 0,
    eligibleChallengerCount: 0,
    projectedPublicCount: tracks.length,
    publicOverflow: 0,
    evictionLimit: 0,
    evictionPaused: true,
    evictionPausedUntil: "retired",
    wouldPromote: [],
    wouldRemove: [],
  };
}
