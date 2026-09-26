export type InsightEvent = { id: string; song_id: string; user_id: string | null; created_at: string; metadata: Record<string, unknown> | null };
export type InsightTrack = { id: string; title: string; artist: string; created_by: string };
export type InsightHeart = { track_id: string; user_id: string; created_at: string };
export type InsightFavorite = { targetKind: string; targetId: string; favoriteUserIds: string[]; favoriteSavedAt?: Record<string, string> };
export type InsightRate = { numerator: number; denominator: number; percent: number | null };
export function insightRate(numerator: number, denominator: number): InsightRate {
  return { numerator, denominator, percent: denominator ? Math.round(numerator / denominator * 1000) / 10 : null };
}
const ms = (value: unknown) => typeof value === "string" ? Date.parse(value) : NaN;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

export function summarizeCreatorTrack(track: InsightTrack, events: InsightEvent[], hearts: InsightHeart[], favorites: InsightFavorite[], from: string, to: string) {
  const start = ms(from), end = ms(to);
  const plays = new Map<string, { user: string; start: number; qualifiedAt: number; seconds: number; covered: number; duration: number; intentional: boolean }>();
  for (const event of events) {
    const meta = event.metadata;
    if (event.song_id !== track.id || !event.user_id || event.user_id === track.created_by || meta?.listeningVersion !== 1 || typeof meta.playbackId !== "string") continue;
    const began = ms(meta.startedAt), at = ms(event.created_at);
    if (!(began >= start && began < end && at >= began && at < end)) continue;
    const key = `${event.user_id}:${meta.playbackId}`;
    const duration = number(meta.durationSeconds);
    const seconds = Math.min(number(meta.listenedSeconds), Math.max(0, (at - began) / 1000 + 2));
    const covered = Math.min(number(meta.coveredSeconds), seconds, duration);
    const qualified = seconds >= 30;
    const previous = plays.get(key);
    plays.set(key, { user: event.user_id, start: began,
      qualifiedAt: Math.min(previous?.qualifiedAt ?? Infinity, qualified ? at : Infinity),
      seconds: Math.max(previous?.seconds ?? 0, seconds), covered: Math.max(previous?.covered ?? 0, covered),
      duration: duration || previous?.duration || 0, intentional: meta.intentional === true });
  }
  const values = [...plays.values()];
  const listeners = new Map<string, number>();
  values.filter(play => play.seconds >= 30).forEach(play => listeners.set(play.user, Math.min(listeners.get(play.user) ?? Infinity, play.qualifiedAt)));
  const replayUsers = new Set<string>();
  for (const user of listeners.keys()) {
    const attempts = values.filter(play => play.user === user && play.seconds >= 30).sort((a, b) => a.start - b.start);
    if (attempts.some((play, index) => index > 0 && play.intentional && play.start > attempts[0].qualifiedAt)) replayUsers.add(user);
  }
  const heartTimes = new Map<string, number>();
  hearts.filter(heart => heart.track_id === track.id && heart.user_id !== track.created_by).forEach(heart => heartTimes.set(heart.user_id, Math.min(heartTimes.get(heart.user_id) ?? Infinity, ms(heart.created_at))));
  const saved = new Map<string, number>();
  favorites.filter(item => item.targetKind === "bar" && item.targetId === track.id).forEach(item => {
    for (const user of item.favoriteUserIds) if (user !== track.created_by) saved.set(user, ms(item.favoriteSavedAt?.[user]));
  });
  // These are observed post-listening actions still present now, not historical
  // gross conversion. Missing legacy save timestamps never imply a new save.
  const converted = (times: Map<string, number>) => [...listeners].filter(([user, heardAt]) => {
    const at = times.get(user); return at !== undefined && at >= heardAt && at < end;
  }).length;
  const measurable = values.filter(play => play.duration > 0);
  return { id: track.id, title: track.title, artist: track.artist, listeners: listeners.size,
    measuredPlays: values.length, supporters: heartTimes.size, favorites: saved.size,
    completion: insightRate(measurable.filter(play => play.covered / play.duration >= 0.85).length, measurable.length),
    replay: insightRate(replayUsers.size, listeners.size),
    heartConversion: insightRate(converted(heartTimes), listeners.size),
    favoriteConversion: insightRate(converted(saved), listeners.size) };
}
export type CreatorTrackInsights = ReturnType<typeof summarizeCreatorTrack>;
export type CreatorBattleInsight = { id: string; title: string; opponent: string; mode: string; archivedAt: string; votes: InsightRate };
export type CreatorInsights = { from: string; to: string; tracks: CreatorTrackInsights[]; battles: CreatorBattleInsight[] };
