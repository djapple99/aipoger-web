import { MUSIC_GENRE_VALUES } from "./music-genres.ts";
import { isNewlyPublishedMusic } from "./music-newness.ts";

export const AI_MUSIC_COLLAPSED_LANE_SIZE = 6;

export type AiMusicExploreOrderTrack = {
  id: string;
  genre: string;
  creator: string;
  createdAt: string;
  positiveReactionCount: number;
};

export type AiMusicExploreGenreLane<T extends AiMusicExploreOrderTrack> = {
  genre: string;
  tracks: T[];
  collapsedTracks: T[];
  newestNewCreatedAt: string | null;
};

function createdAtMs(track: AiMusicExploreOrderTrack) {
  const value = new Date(track.createdAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function compareNewestFirst(a: AiMusicExploreOrderTrack, b: AiMusicExploreOrderTrack) {
  const timeDifference = createdAtMs(b) - createdAtMs(a);
  if (timeDifference !== 0) return timeDifference;
  return b.id.localeCompare(a.id);
}

function compareEstablishedWorks(a: AiMusicExploreOrderTrack, b: AiMusicExploreOrderTrack) {
  const reactionDifference = b.positiveReactionCount - a.positiveReactionCount;
  if (reactionDifference !== 0) return reactionDifference;
  return compareNewestFirst(a, b);
}

function isNewWork(track: AiMusicExploreOrderTrack, now: Date) {
  return isNewlyPublishedMusic(track.createdAt, now);
}

function collapsedLaneTracks<T extends AiMusicExploreOrderTrack>(newTracks: T[], establishedTracks: T[]) {
  const creatorsShown = new Set<string>();
  const uniqueCreatorNewTracks: T[] = [];

  for (const track of newTracks) {
    const creatorKey = track.creator.trim().toLocaleLowerCase();
    if (creatorsShown.has(creatorKey)) continue;
    creatorsShown.add(creatorKey);
    uniqueCreatorNewTracks.push(track);
  }

  // Deferred new uploads remain in the expanded lane, while the compact lane
  // reserves at most one new-song slot per creator.
  return [...uniqueCreatorNewTracks, ...establishedTracks].slice(0, AI_MUSIC_COLLAPSED_LANE_SIZE);
}

export function buildAiMusicExploreGenreLanes<T extends AiMusicExploreOrderTrack>(
  tracks: T[],
  now: Date = new Date(),
): AiMusicExploreGenreLane<T>[] {
  const genreIndex = new Map(MUSIC_GENRE_VALUES.map((genre, index) => [genre, index]));
  const groups = new Map(MUSIC_GENRE_VALUES.map((genre) => [genre, [] as T[]]));

  for (const track of tracks) {
    if (!genreIndex.has(track.genre)) continue;
    groups.get(track.genre)?.push(track);
  }

  const lanes = MUSIC_GENRE_VALUES.map((genre) => {
    const newTracks = (groups.get(genre) ?? []).filter((track) => isNewWork(track, now)).sort(compareNewestFirst);
    const establishedTracks = (groups.get(genre) ?? []).filter((track) => !isNewWork(track, now)).sort(compareEstablishedWorks);
    return {
      genre,
      tracks: [...newTracks, ...establishedTracks],
      collapsedTracks: collapsedLaneTracks(newTracks, establishedTracks),
      newestNewCreatedAt: newTracks[0]?.createdAt ?? null,
    };
  });

  return lanes.sort((a, b) => {
    const aLatest = a.newestNewCreatedAt ? new Date(a.newestNewCreatedAt).getTime() : null;
    const bLatest = b.newestNewCreatedAt ? new Date(b.newestNewCreatedAt).getTime() : null;
    if (aLatest !== null && bLatest !== null && aLatest !== bLatest) return bLatest - aLatest;
    if (aLatest !== null && bLatest === null) return -1;
    if (aLatest === null && bLatest !== null) return 1;
    return (genreIndex.get(a.genre) ?? 0) - (genreIndex.get(b.genre) ?? 0);
  });
}
