export const AI_MUSIC_HEAT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type AiMusicHeatTrack = {
  id: string;
  createdAt: string;
  recentHeartSupporters: number;
  recentOfficialAudienceVotes: number;
  recentQualifiedInteractionAt: string | null;
};

export type AiMusicHeatListItem<T extends AiMusicHeatTrack> = {
  track: T;
  hasRecentSignal: boolean;
  rank: number | null;
};

function timestamp(value: string | null | undefined) {
  const parsed = new Date(value ?? "").getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareHeat<T extends AiMusicHeatTrack>(a: T, b: T) {
  const heartDifference = b.recentHeartSupporters - a.recentHeartSupporters;
  if (heartDifference !== 0) return heartDifference;

  const voteDifference = b.recentOfficialAudienceVotes - a.recentOfficialAudienceVotes;
  if (voteDifference !== 0) return voteDifference;

  const interactionDifference = timestamp(b.recentQualifiedInteractionAt) - timestamp(a.recentQualifiedInteractionAt);
  if (interactionDifference !== 0) return interactionDifference;

  const createdDifference = timestamp(b.createdAt) - timestamp(a.createdAt);
  if (createdDifference !== 0) return createdDifference;
  return b.id.localeCompare(a.id);
}

function compareAccumulating<T extends AiMusicHeatTrack>(a: T, b: T) {
  const createdDifference = timestamp(b.createdAt) - timestamp(a.createdAt);
  if (createdDifference !== 0) return createdDifference;
  return b.id.localeCompare(a.id);
}

export function hasRecentAiMusicHeatSignal(track: AiMusicHeatTrack) {
  return track.recentHeartSupporters > 0 || track.recentOfficialAudienceVotes > 0;
}

export function buildAiMusicHeatList<T extends AiMusicHeatTrack>(tracks: T[]): AiMusicHeatListItem<T>[] {
  const active = tracks.filter(hasRecentAiMusicHeatSignal).sort(compareHeat);
  const accumulating = tracks.filter((track) => !hasRecentAiMusicHeatSignal(track)).sort(compareAccumulating);
  return [
    ...active.map((track, index) => ({ track, hasRecentSignal: true, rank: index + 1 })),
    ...accumulating.map((track) => ({ track, hasRecentSignal: false, rank: null })),
  ];
}
