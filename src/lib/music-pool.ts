import { popularityScore, type BlindSummary } from "./blind-listening.ts";
import { isMusicPoolReturnCandidate, isMusicPoolReturnExcluded, MUSIC_POOL_RETURN_POINTS } from "./music-pool-return.ts";
// Three calendar months from publication, measured in Asia/Taipei.
// This is display eligibility; it never deletes or rewrites a work.
const TAIPEI_OFFSET = 8 * 3_600_000;
export function musicPoolExpiresAt(createdAt: string | null | undefined): number {
  if (!createdAt) return NaN;
  const date = new Date(new Date(createdAt).getTime() + TAIPEI_OFFSET);
  if (!Number.isFinite(date.getTime())) return NaN;
  const month = date.getUTCMonth() + 3;
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(date.getUTCFullYear(), month + 1, 0)).getUTCDate());
  return Date.UTC(date.getUTCFullYear(), month, day, date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()) - TAIPEI_OFFSET;
}
export function isInMusicPool(createdAt: string | null | undefined, now = Date.now()): boolean {
  const published = createdAt ? Date.parse(createdAt) : NaN;
  return Number.isFinite(published) && published <= now && now < musicPoolExpiresAt(createdAt);
}
// Explore's temporary cohort never overrides moderation/public-playability checks.
// Blind listening and homepage singles continue to use the ordinary expiry above.
export function isInDiscoveryMusicPool(createdAt: string | null | undefined, id: string | undefined, now = Date.now()): boolean {
  return !isMusicPoolReturnExcluded(id, now) && (isInMusicPool(createdAt, now) || isMusicPoolReturnCandidate(id, createdAt, now));
}
export function musicPoolReturnBonus(createdAt: string | null | undefined, id: string | undefined, now = Date.now()): number {
  return !isInMusicPool(createdAt, now) && isMusicPoolReturnCandidate(id, createdAt, now) ? MUSIC_POOL_RETURN_POINTS : 0;
}
export const MUSIC_POOL_NEW_SONG_WINDOW = 7 * 24 * 60 * 60 * 1000;
export const MUSIC_POOL_NEW_SONG_POINTS = 3;
export function musicPoolNewSongBonus(createdAt: string | null | undefined, now = Date.now()): number {
  const published = createdAt ? Date.parse(createdAt) : NaN;
  return Number.isFinite(published) && published <= now && now < published + MUSIC_POOL_NEW_SONG_WINDOW
    ? MUSIC_POOL_NEW_SONG_POINTS : 0;
}
export function musicPoolPopularityScore(id: string, createdAt: string | null | undefined, hearts: number, maxHearts: number, blind: BlindSummary, now = Date.now()) {
  return popularityScore(hearts, maxHearts, blind) + musicPoolReturnBonus(createdAt, id, now) + musicPoolNewSongBonus(createdAt, now);
}
export type PoolRankTrack = { id: string; sourceId?: string; createdAt: string; poolSupporterCount: number; blindSampleCount?: number; blindPreferencePoints?: number; popularityScore?: number };
export function rankMusicPool<T extends PoolRankTrack>(tracks: T[], now = Date.now()) {
  const current = tracks.filter(track => isInDiscoveryMusicPool(track.createdAt, track.sourceId ?? track.id, now) && Number.isFinite(track.poolSupporterCount));
  const mixed = current.some(track => typeof track.blindSampleCount === "number");
  const maxHearts = Math.max(0, ...current.map(track => track.poolSupporterCount));
  const score = (track: T) => (mixed ? popularityScore(track.poolSupporterCount, maxHearts,
    { people: track.blindSampleCount ?? 0, preferencePoints: track.blindPreferencePoints ?? 0 }) : track.poolSupporterCount)
    + musicPoolReturnBonus(track.createdAt, track.sourceId ?? track.id, now) + musicPoolNewSongBonus(track.createdAt, now);
  const sorted = current.filter(track => track.poolSupporterCount > 0 || (track.blindPreferencePoints ?? 0) > 0)
    .sort((a, b) => score(b) - score(a) || Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
  return sorted.map((track, index) => ({
    track: mixed ? { ...track, popularityScore: score(track) } : track, rank: index + 1,
  }));
}
export function musicPoolSupportCounts(tracks: { id: string; created_by?: string | null; created_at?: string | null }[],
  hearts: { track_id?: string | null; user_id?: string | null; reaction?: string | null; created_at?: string | null }[]) {
  const sources = new Map(tracks.map(track => [track.id, track]));
  const supporters = new Map<string, Set<string>>();
  for (const heart of hearts) {
    const track = sources.get(heart.track_id ?? "");
    const user = heart.user_id?.trim();
    if (!track || !user || heart.reaction !== "heart" || user === track.created_by) continue;
    const heartTime = Date.parse(heart.created_at ?? "");
    if (!Number.isFinite(heartTime) || heartTime < Date.parse(track.created_at ?? "")) continue;
    const set = supporters.get(track.id) ?? new Set<string>();
    set.add(user); supporters.set(track.id, set);
  }
  return new Map(tracks.map(track => [track.id, supporters.get(track.id)?.size ?? 0]));
}
