import type { SupabaseClient } from "@supabase/supabase-js";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";
import { buildAiMusicSurfaceLifecycleMap } from "@/lib/ai-music-surface-lifecycle";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import {
  LISTEN_BAR_AUDIO_BUCKET,
  LISTEN_BAR_COVER_BUCKET,
  type ListenBarTrackRow,
} from "@/lib/listen-bar";
import { isNewlyPublishedMusic } from "@/lib/music-newness";
import { isCurrentMusicGenre } from "@/lib/music-genres";
import { loadShowtimeAdminCatalog } from "@/lib/server-showtime-catalog";

export type AipogerChoiceSelectionCatalog = {
  schemaReady: boolean;
  items: AipogerChoiceCatalogItem[];
};

const CHOICE_RELEASE_SELECT = [
  "id",
  "title",
  "artist",
  "genre",
  "audio_path",
  "cover_path",
  "is_active",
  "review_status",
  "hidden_at",
  "removed_at",
  "source",
  "is_featured_official",
  "created_at",
  "ai_music_showtime_certified",
  "ai_music_showtime_public_removed_at",
].join(",");

function publicStorageUrl(admin: SupabaseClient, bucket: string, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^https?:/i.test(clean)) return clean;
  return admin.storage.from(bucket).getPublicUrl(clean).data.publicUrl || null;
}

function isPublicChoiceRelease(row: ListenBarTrackRow, retiredFromExplore: boolean) {
  const status = row.review_status?.toLowerCase();
  const moderationHeld = status === "moderation_hold" || status === "moderation hold";
  return (
    row.source === "community"
    && !row.is_featured_official
    && row.is_active !== false
    && status !== "hidden"
    && status !== "removed"
    && status !== "rejected"
    && !moderationHeld
    && !row.hidden_at
    && !row.removed_at
    && !retiredFromExplore
    && !row.ai_music_showtime_certified
    && Boolean(row.audio_path?.trim())
    && isCurrentMusicGenre(row.genre)
  );
}

function releaseCatalogItem(admin: SupabaseClient, row: ListenBarTrackRow): AipogerChoiceCatalogItem {
  const createdAt = row.created_at ?? new Date(0).toISOString();
  return {
    id: row.id,
    sourceKind: "listen_bar_track",
    title: row.title?.trim() || "未命名作品",
    artist: row.artist?.trim() || "AIPOGER 創作者",
    genre: row.genre?.trim() || "Original 自我風格",
    coverUrl: publicStorageUrl(admin, LISTEN_BAR_COVER_BUCKET, row.cover_path) || AIPOGER_BRAND_LOGO,
    audioUrl: publicStorageUrl(admin, LISTEN_BAR_AUDIO_BUCKET, row.audio_path),
    recognition: "Choice 新選",
    certifiedAt: createdAt,
    isPublic: true,
    selectable: isNewlyPublishedMusic(createdAt),
    choiceSource: "new_release",
  };
}

export async function loadChoiceSelectionCatalog(admin: SupabaseClient): Promise<AipogerChoiceSelectionCatalog> {
  const [showtime, releaseResult] = await Promise.all([
    loadShowtimeAdminCatalog(admin),
    admin
      .from("listen_bar_tracks")
      .select(CHOICE_RELEASE_SELECT)
      .eq("source", "community")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (!showtime.schemaReady) return { schemaReady: false, items: [] };
  if (releaseResult.error) throw releaseResult.error;

  const releaseRows = (releaseResult.data ?? []) as unknown as ListenBarTrackRow[];
  const lifecycleByTrackId = await buildAiMusicSurfaceLifecycleMap(admin, releaseRows);
  const releaseItems = releaseRows
    .filter((row) => isPublicChoiceRelease(row, lifecycleByTrackId.get(row.id)?.retiredFromExplore ?? false))
    .map((row) => releaseCatalogItem(admin, row));
  const showtimeItems = showtime.items.map((item) => ({ ...item, choiceSource: "showtime" as const }));

  return {
    schemaReady: true,
    items: [...releaseItems, ...showtimeItems].sort((left, right) => {
      const leftFresh = left.choiceSource === "new_release" && left.selectable ? 1 : 0;
      const rightFresh = right.choiceSource === "new_release" && right.selectable ? 1 : 0;
      return rightFresh - leftFresh
        || new Date(right.certifiedAt).getTime() - new Date(left.certifiedAt).getTime()
        || left.id.localeCompare(right.id);
    }),
  };
}
