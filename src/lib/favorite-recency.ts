type FavoriteRecord = { favoriteUserIds: string[]; favoriteSavedAt?: Record<string, string> };

// Record only a genuine save transition; daily Hearts and other users' activity
// must not change an existing favorite's position.
export function setFavoriteMembership(record: FavoriteRecord, userId: string, saved: boolean, now: string) {
  const existed = record.favoriteUserIds.includes(userId);
  if (saved && !existed) {
    record.favoriteUserIds = [...record.favoriteUserIds, userId];
    record.favoriteSavedAt = { ...record.favoriteSavedAt, [userId]: now };
  } else if (!saved) {
    record.favoriteUserIds = record.favoriteUserIds.filter((id) => id !== userId);
    if (record.favoriteSavedAt) {
      record.favoriteSavedAt = { ...record.favoriteSavedAt };
      delete record.favoriteSavedAt[userId];
    }
  }
}

export function favoriteSavedTime(record: { favoriteSavedAt?: unknown }, userId: string): number {
  const values = record.favoriteSavedAt;
  if (!values || typeof values !== "object" || !Object.hasOwn(values, userId)) return 0;
  const value = (values as Record<string, unknown>)[userId];
  const timestamp = typeof value === "string" ? Date.parse(value) : NaN;
  // Legacy favorites have no per-user timestamp. Never infer it from updatedAt.
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}
