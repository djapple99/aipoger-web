import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readAllHomePages, type HomeTrackRow } from "./home-discovery";
import { blindSummaries } from "./server-blind-listening";
import { musicPoolSupportCounts, rankMusicPool } from "./music-pool";
import { readWorkFavoriteCounts } from "./server-work-favorites";
import type { MvWork } from "./mv-discovery";

/** Same Explore score/eligibility, scoped to public MVs. No separate rating system. */
export async function readMvPopularity(admin: SupabaseClient, works: MvWork[], rows: HomeTrackRow[], now: Date) {
  const ids = works.map(work => work.id);
  const wanted = new Set(ids);
  const sources = rows.filter(row => wanted.has(row.id));
  const favorites = readWorkFavoriteCounts(admin, ids);
  const ranking = (async () => {
    const [pages, blind] = await Promise.all([
      Promise.all(Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, index * 100 + 100)).map(batch =>
        readAllHomePages<{ track_id: string; user_id: string; reaction: string; created_at: string }>((from, to) => admin
          .from("listen_bar_track_reactions").select("track_id,user_id,reaction,created_at")
          .in("track_id", batch).eq("reaction", "heart").lte("created_at", now.toISOString())
          .order("track_id").order("user_id").order("vote_date").range(from, to)))),
      blindSummaries(admin),
    ]);
    const supporters = musicPoolSupportCounts(sources, pages.flat());
    return rankMusicPool(works.map(work => ({ id: work.id, workKind: work.workKind, createdAt: work.publishedAt,
      poolSupporterCount: supporters.get(work.id) ?? 0,
      blindSampleCount: blind.get(work.id)?.people ?? 0,
      blindPreferencePoints: blind.get(work.id)?.preferencePoints ?? 0,
      ratingCount: work.ratingCount, ratingTotal: work.ratingTotal })), now.getTime()).map(item => item.track.id);
  })().catch(() => null);
  const [counts, rankedIds] = await Promise.all([favorites, ranking]);
  for (const work of works) work.favoriteCount = counts === null ? null : counts.get(work.id) ?? 0;
  return rankedIds;
}
