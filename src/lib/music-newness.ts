export const MUSIC_NEW_BADGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isNewlyPublishedMusic(
  createdAt: string | null | undefined,
  now: Date = new Date(),
) {
  const createdAtMs = new Date(createdAt ?? "").getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(nowMs)) return false;

  const ageMs = nowMs - createdAtMs;
  return ageMs >= 0 && ageMs < MUSIC_NEW_BADGE_WINDOW_MS;
}
