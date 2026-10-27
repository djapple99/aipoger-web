import "server-only";
import { cache } from "react";
import { externalMusicFromRow } from "@/lib/external-music";
import { createClient } from "@supabase/supabase-js";
import { buildAiMusicSurfaceLifecycleMap } from "./ai-music-surface-lifecycle";
import { buildHomeDiscovery, buildPublicHomeWorks, readAllHomePages, taipeiHomeWeek, type HomeHeartRow, type HomeTrackRow } from "./home-discovery";
import { isInDiscoveryMusicPool } from "./music-pool";
import type { ListenBarTrackRow } from "./listen-bar";
import { addWorkRatingSummaries, mvRatingSummaries } from "./server-mv-reviews";
import { buildMvDiscovery } from "./mv-discovery";
import { readMvPopularity } from "./server-mv-popularity";

const readDiscoverySource = cache(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing discovery configuration.");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date(); const week = taipeiHomeWeek(now);
  const rows = await readAllHomePages<HomeTrackRow>((from, to) => admin.from("listen_bar_tracks")
    .select("id,title,artist,genre,description,work_kind,album_track_ids,audio_path,external_url,is_music_video,cover_path,youtube_url,lyrics,created_at,created_by,source,is_featured_official,is_active,review_status,hidden_at,removed_at,ai_music_showtime_public_removed_at,ai_music_showtime_certified,ai_music_showtime_certified_at,ai_music_showtime_certification_source")
    .eq("source", "community").eq("is_active", true).order("id").range(from, to));
  const [lifecycle, hearts] = await Promise.all([
    buildAiMusicSurfaceLifecycleMap(admin, rows as ListenBarTrackRow[]),
    readAllHomePages<HomeHeartRow>((from, to) => admin.from("listen_bar_track_reactions")
      .select("track_id,user_id,vote_date,reaction").eq("reaction", "heart")
      .gte("vote_date", week.startDate).lt("vote_date", week.endDate)
      .order("track_id").order("user_id").order("vote_date").range(from, to)),
  ]);
  const mediaUrl = (bucket: string, path: string | null | undefined) => {
    const clean = path?.trim();
    if (!clean) return "";
    if (/^https?:\/\//i.test(clean)) return clean;
    if (/^[a-z][a-z\d+.-]*:/i.test(clean) || clean.startsWith("//")) return "";
    return admin.storage.from(bucket).getPublicUrl(clean).data.publicUrl;
  };
  return { rows: rows.filter(row => !lifecycle.get(row.id)?.retiredFromExplore), hearts, mediaUrl, now, admin };
});

async function addFeaturedComments(result: { featured: { id: string; comment?: { name: string; text: string } }[] }, source: Awaited<ReturnType<typeof readDiscoverySource>>) {
  const { rows, admin } = source;
  // Only moderation-visible public excerpts; raw voter identities stay on the server.
  await Promise.all(result.featured.slice(0, 6).map(async work => {
    const author = rows.find(row => row.id === work.id)?.created_by;
    let query = admin.from("listen_bar_track_comments").select("display_name,body")
      .eq("track_id", work.id).eq("moderation_status", "visible");
    if (author) query = query.neq("user_id", author);
    const { data, error } = await query.order("created_at", { ascending: false }).limit(1);
    const comment = data?.[0];
    if (!error && comment?.display_name?.trim() && comment?.body?.trim()) {
      work.comment = { name: comment.display_name.trim(), text: comment.body.trim().slice(0, 280) };
    }
  }));
}

export async function readHomeDiscovery() {
  const source = await readDiscoverySource();
  const result = buildHomeDiscovery(source.rows, source.hearts, source.mediaUrl, source.now);
  await Promise.all([
    addFeaturedComments(result, source),
    // Keep discovery usable on a ratings outage; missing fields remain unknown, never zero.
    addWorkRatingSummaries(result.featured, source.admin).catch(() => {}),
  ]);
  return result;
}

export async function readMvDiscovery() {
  const [source, summaries] = await Promise.all([readDiscoverySource(), mvRatingSummaries()]);
  const result = buildMvDiscovery(source.rows, source.hearts, source.mediaUrl, source.now);
  for (const work of [...result.works, ...result.featured]) Object.assign(work, summaries.get(work.id) ?? { ratingAverage: null, ratingCount: 0, ratingTotal: 0 });
  const rankedIds = await readMvPopularity(source.admin, result.works, source.rows, source.now);
  return { ...result, rankedIds, generatedAt: source.now.toISOString() };
}

export async function readMusicReviewWork(trackId: string) {
  const source = await readDiscoverySource();
  const work = buildPublicHomeWorks(source.rows, source.hearts, source.mediaUrl, source.now)
    .find(item => item.id === trackId && (item.workKind === "album" || isInDiscoveryMusicPool(item.publishedAt, item.id, source.now.getTime())));
  if (!work) return null;
  const summaries = await mvRatingSummaries(source.admin);
  return { ...work, ...(summaries.get(work.id) ?? { ratingAverage: null, ratingCount: 0, ratingTotal: 0 }) };
}

export const readPublicWorkDetail = cache(async (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing public work configuration");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await admin.from("listen_bar_tracks").select("id,title,artist,genre,description,work_kind,album_track_ids,audio_path,external_url,is_music_video,cover_path,youtube_url,lyrics,created_at,created_by,source,is_featured_official,is_active,review_status,hidden_at,removed_at,ai_music_showtime_public_removed_at,ai_music_showtime_certified,ai_music_showtime_certified_at,ai_music_showtime_certification_source").eq("id", id).eq("source", "community").eq("is_active", true).maybeSingle();
  if (result.error) throw new Error("Public work is temporarily unavailable");
  if (!result.data) return null;
  const row = result.data as HomeTrackRow; const now = new Date();
  const lifecycle = await buildAiMusicSurfaceLifecycleMap(admin, [row as ListenBarTrackRow]);
  if (lifecycle.get(id)?.retiredFromExplore) return null;
  const week = taipeiHomeWeek(now);
  const hearts = await readAllHomePages<HomeHeartRow>((from, to) => admin.from("listen_bar_track_reactions").select("track_id,user_id,vote_date,reaction")
    .eq("track_id", id).eq("reaction", "heart").gte("vote_date", week.startDate).lt("vote_date", week.endDate)
    .order("user_id").order("vote_date").range(from, to));
  const mediaUrl = (bucket: string, path: string | null | undefined) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) return "";
    return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };
  const work = buildPublicHomeWorks([row], hearts, mediaUrl, now)[0];
  if (!work || !(work.videoId || work.workKind === "album" || isInDiscoveryMusicPool(work.publishedAt, work.id, now.getTime()))) return null;
  return { work, externalMedia: externalMusicFromRow(row) };
});

export const readPublicWorkIndex = cache(async () => {
  const source = await readDiscoverySource();
  return buildPublicHomeWorks(source.rows, source.hearts, source.mediaUrl, source.now)
    .filter(work => work.videoId || work.workKind === "album" || isInDiscoveryMusicPool(work.publishedAt, work.id, source.now.getTime()));
});
