import type { SupabaseClient } from "@supabase/supabase-js";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { LISTEN_BAR_AUDIO_BUCKET, LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";
import { isPublicBarAirplayTrack } from "@/lib/listen-bar-airplay";
import { signedBattleAudioUrl } from "@/lib/official-gatekeeper-media";
import { favoriteSavedTime } from "@/lib/favorite-recency";

type TrackRow = {
  id: string; title: string | null; artist: string | null; genre: string | null;
  audio_path: string | null; cover_path: string | null; created_at: string | null;
  is_active: boolean | null; review_status: string | null; hidden_at: string | null;
  removed_at: string | null; ai_music_showtime_public_removed_at: string | null;
};
type ArchiveRow = {
  battle_id: string; battle_code: string | null; winner: string | null;
  winner_song_name: string | null; winner_name: string | null;
  result_payload: Record<string, unknown> | null; archived_at: string | null;
  total_votes: number | null; showtime_public_removed_at: string | null;
};
type CatalogItem = AipogerChoiceCatalogItem & { favoriteAliases?: string[] };

function mediaUrl(admin: SupabaseClient, bucket: string, path: string | null) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) return clean;
  return admin.storage.from(bucket).getPublicUrl(clean).data.publicUrl || null;
}

// Keep playback independent from the curator's current favorites. Never read
// favorite membership on public endpoints or change the underlying song IDs.
export async function loadCreatorChoicePlaybackCatalog(admin: SupabaseClient) {
  const items: CatalogItem[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const result = await admin.from("listen_bar_tracks")
      .select("id,title,artist,genre,audio_path,cover_path,created_at,is_active,review_status,hidden_at,removed_at,ai_music_showtime_public_removed_at")
      .eq("is_active", true).order("id").range(offset, offset + pageSize - 1);
    if (result.error) throw result.error;
    const rows = (result.data ?? []) as TrackRow[];
    for (const row of rows) {
      const status = row.review_status?.trim().toLowerCase().replace(/[ _-]+/g, "_");
      if (!isPublicBarAirplayTrack(row) || ["hidden", "removed", "completed", "rejected", "moderation_hold", "pending"].includes(status ?? "")) continue;
      items.push({
        id: row.id, sourceKind: "listen_bar_track", title: row.title?.trim() || "未命名作品",
        artist: row.artist?.trim() || "AIPOGER 創作者", genre: row.genre?.trim() || "AI Music",
        coverUrl: mediaUrl(admin, LISTEN_BAR_COVER_BUCKET, row.cover_path) || AIPOGER_BRAND_LOGO,
        audioUrl: mediaUrl(admin, LISTEN_BAR_AUDIO_BUCKET, row.audio_path),
        recognition: "", certifiedAt: row.created_at || new Date(0).toISOString(),
        isPublic: true, selectable: false,
      });
    }
    if (rows.length < pageSize) break;
  }

  // Legacy Battle choices retain their existing publication rules and IDs.
  for (let offset = 0; ; offset += pageSize) {
    const result = await admin.from("battle_result_archives")
      .select("battle_id,battle_code,winner,winner_song_name,winner_name,result_payload,archived_at,total_votes,showtime_public_removed_at")
      .is("showtime_public_removed_at", null).order("battle_id").range(offset, offset + pageSize - 1);
    if (result.error) throw result.error;
    const rows = (result.data ?? []) as ArchiveRow[];
    const visible = rows.filter((row) => {
      const payload = row.result_payload ?? {};
      return row.battle_id && !row.showtime_public_removed_at
        && Number(payload.audienceCount ?? payload.audienceVoterCount ?? payload.audience ?? row.total_votes) >= 3;
    });
    for (let start = 0; start < visible.length; start += 100) {
      const batch = visible.slice(start, start + 100);
      const media = await admin.from("battles").select("id,winner,audio_a_path,audio_b_path,queue_a_id,queue_b_id")
        .in("id", batch.map((row) => row.battle_id));
      if (media.error) throw media.error;
      const queueIds = [...new Set((media.data ?? []).flatMap((battle) => [battle.queue_a_id, battle.queue_b_id]).filter(Boolean))];
      const queues = queueIds.length ? await admin.from("battle_queue").select("id,full_audio_path,full_audio_public").in("id", queueIds)
        : { data: [], error: null };
      if (queues.error) throw queues.error;
      for (const row of batch) {
        const battle = media.data?.find((entry) => entry.id === row.battle_id);
        const winner = row.winner ?? battle?.winner;
        if (winner !== "fighter_a" && winner !== "fighter_b") continue;
        const winnerQueue = queues.data?.find((queue) => queue.id === (winner === "fighter_b" ? battle?.queue_b_id : battle?.queue_a_id));
        const fullSongPath = winnerQueue?.full_audio_public === true ? winnerQueue.full_audio_path?.trim() : null;
        const dropPath = winner === "fighter_b" ? battle?.audio_b_path : battle?.audio_a_path;
        // A consenting winner's full song takes precedence over the battle Drop.
        // Do not silently substitute a Drop if signing that full song fails.
        const audioUrl = await signedBattleAudioUrl(admin, fullSongPath || dropPath);
        if (!audioUrl) continue;
        const payload = row.result_payload ?? {};
        items.push({
          id: row.battle_id, sourceKind: "battle_archive", title: row.winner_song_name?.trim() || "Battle 作品",
          artist: row.winner_name?.trim() || "AIPOGER 創作者",
          genre: typeof payload.genre === "string" ? payload.genre : "AI Music",
          coverUrl: typeof payload.coverUrl === "string" ? payload.coverUrl : AIPOGER_BRAND_LOGO,
          audioUrl, recognition: "", certifiedAt: row.archived_at || new Date(0).toISOString(),
          isPublic: true, selectable: false,
          favoriteAliases: row.battle_code ? [row.battle_code] : [],
        });
      }
    }
    if (rows.length < pageSize) break;
  }
  return { schemaReady: true, items };
}

export async function loadCreatorChoiceSelectionCatalog(admin: SupabaseClient, userId: string) {
  const catalog = await loadCreatorChoicePlaybackCatalog(admin);
  const { data, error } = await admin.storage.from("listen-bar-data").download("honor-board/interactions.json");
  if (error && !/not found|not exist|404/i.test(error.message)) throw error;
  const stored: unknown = data ? JSON.parse(await data.text()) : { records: [] };
  const records = stored && typeof stored === "object" && "records" in stored && Array.isArray(stored.records)
    ? stored.records : [];
  const favorites = new Map<string, number>();
  for (const record of records) {
    if (!record || !Array.isArray(record.favoriteUserIds) || !record.favoriteUserIds.includes(userId)) continue;
    if (record.targetKind !== "bar" && record.targetKind !== "battle") continue;
    const savedAt = favoriteSavedTime(record, userId);
    const keys = [typeof record.targetId === "string" ? `${record.targetKind}:${record.targetId}` : null,
      typeof record.recordKey === "string" && record.recordKey.startsWith(`${record.targetKind}:`) ? record.recordKey : null];
    for (const key of keys) if (key) favorites.set(key, Math.max(favorites.get(key) ?? 0, savedAt));
  }
  return {
    ...catalog,
    items: catalog.items.map(({ favoriteAliases, ...item }) => {
      const keys = [item.id, ...(favoriteAliases ?? [])].map((id) =>
        `${item.sourceKind === "listen_bar_track" ? "bar" : "battle"}:${id}`);
      return { item: { ...item, selectable: keys.some((key) => favorites.has(key)) },
        savedAt: Math.max(0, ...keys.map((key) => favorites.get(key) ?? 0)) };
    }).sort((a, b) => b.savedAt - a.savedAt).map(({ item }) => item),
  };
}
