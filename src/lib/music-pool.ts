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
export type PoolRankTrack = { id: string; createdAt: string; poolSupporterCount: number };
export function rankMusicPool<T extends PoolRankTrack>(tracks: T[], now = Date.now()) {
  const sorted = tracks.filter(track => isInMusicPool(track.createdAt, now) && Number.isFinite(track.poolSupporterCount) && track.poolSupporterCount > 0)
    .sort((a, b) => b.poolSupporterCount - a.poolSupporterCount || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  let rank = 0;
  return sorted.map((track, index) => {
    if (index === 0 || track.poolSupporterCount !== sorted[index - 1].poolSupporterCount) rank = index + 1;
    return { track, rank };
  });
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
