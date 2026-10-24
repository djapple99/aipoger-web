import type { SupabaseClient } from "@supabase/supabase-js";

// Favorites are retained membership, not daily Heart reactions or ranking points.
export function workFavoriteCounts(store: unknown, trackIds: readonly string[]): Map<string, number> {
  if (!store || typeof store !== "object" || !Array.isArray((store as { records?: unknown }).records)) {
    throw new Error("Invalid favorites store");
  }
  const wanted = new Set(trackIds);
  const members = new Map<string, Set<string>>();
  for (const record of (store as { records: unknown[] }).records) {
    if (!record || typeof record !== "object") continue;
    const row = record as { targetKind?: unknown; targetId?: unknown; favoriteUserIds?: unknown };
    if (row.targetKind !== "bar" || typeof row.targetId !== "string" || !wanted.has(row.targetId)) continue;
    if (!Array.isArray(row.favoriteUserIds)) throw new Error("Invalid favorites membership");
    const users = members.get(row.targetId) ?? new Set<string>();
    for (const user of row.favoriteUserIds) {
      if (typeof user === "string" && user.trim()) users.add(user.trim());
    }
    members.set(row.targetId, users);
  }
  return new Map(trackIds.map(id => [id, members.get(id)?.size ?? 0]));
}

export async function readWorkFavoriteCounts(admin: SupabaseClient, trackIds: readonly string[]): Promise<Map<string, number> | null> {
  if (!trackIds.length) return new Map();
  try {
    const { data, error } = await admin.storage.from("listen-bar-data").download("honor-board/interactions.json");
    if (error) {
      if (/^object not found\.?$/i.test(error.message)) return new Map();
      throw new Error("Favorites unavailable");
    }
    if (!data) throw new Error("Favorites unavailable");
    return workFavoriteCounts(JSON.parse(await data.text()), trackIds);
  } catch {
    // Keep discovery available, but never present a read failure as zero saves.
    console.warn("Work favorite counts unavailable");
    return null;
  }
}
