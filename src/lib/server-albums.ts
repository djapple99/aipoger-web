import "server-only";
import { mvReviewAdmin } from "./server-mv-reviews";
import { buildPublicHomeWorks, homeYouTubeId, readAllHomePages, type HomeTrackRow } from "./home-discovery";
import { isPublicMusicWork } from "./listen-bar-airplay";
import { externalMusicFromRow } from "./external-music";
import { isInDiscoveryMusicPool } from "./music-pool";
import type { PublicAlbum } from "./album";

export const ALBUM_FIELDS = "id,title,artist,genre,description,work_kind,album_track_ids,album_duration_seconds,audio_path,cover_path,external_url,youtube_url,is_music_video,created_at,created_by,source,is_featured_official,is_active,review_status,hidden_at,removed_at,ai_music_showtime_public_removed_at";
export type AlbumRow = HomeTrackRow & { album_duration_seconds?: number | null };

export async function readPublicAlbums(id?: string) {
  const admin = mvReviewAdmin();
  const rows = await readAllHomePages<AlbumRow>(async (from, to) => {
    let query = admin.from("listen_bar_tracks").select(ALBUM_FIELDS).eq("work_kind", "album").eq("source", "community").eq("is_active", true);
    if (id) query = query.eq("id", id);
    const result = await query.order("created_at", { ascending: false }).order("id").range(from, to);
    return { data: result.data as AlbumRow[] | null, error: result.error };
  });
  const albums = rows.filter(row => isPublicMusicWork(row) && (id || isInDiscoveryMusicPool(row.created_at, row.id)));
  const ids = [...new Set(albums.flatMap(row => row.album_track_ids ?? []))];
  const memberRows: AlbumRow[] = [];
  for (let index = 0; index < ids.length; index += 100) {
    const result = await admin.from("listen_bar_tracks").select(ALBUM_FIELDS).in("id", ids.slice(index, index + 100));
    if (result.error) throw result.error;
    memberRows.push(...result.data as AlbumRow[]);
  }
  const mediaUrl = (bucket: string, path: string | null | undefined) => !path ? "" : /^https:\/\//i.test(path) ? path : admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const memberWorks = new Map(buildPublicHomeWorks(memberRows.filter(row => row.work_kind !== "album"), [], mediaUrl).map(work => [work.id, work]));
  return albums.flatMap<PublicAlbum>(row => {
    const tracks = (row.album_track_ids ?? []).flatMap(trackId => {
      const source = memberRows.find(member => member.id === trackId);
      const work = memberWorks.get(trackId);
      return work && source && source.created_by === row.created_by ? [{ ...work, externalUrl: externalMusicFromRow(source)?.url ?? null }] : [];
    });
    if ((row.album_track_ids?.length ?? 0) > 0 && !tracks.length) return [];
    // The converted compilation's video is 24:24; its preserved older audio is a
    // different 6:31 source. Present the classified video without rewriting it.
    const videoId = homeYouTubeId(row.youtube_url) ?? (row.is_music_video ? homeYouTubeId(row.external_url) : null);
    return [{ id: row.id, title: row.title, artist: row.artist, genre: row.genre ?? "", description: row.description ?? "",
      workKind: "album", coverUrl: mediaUrl("listen-bar-covers", row.cover_path), audioUrl: videoId ? "" : mediaUrl("listen-bar-audio", row.audio_path),
      videoId, youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null, lyrics: "", supporterCount: 0,
      publishedAt: row.created_at ?? "", trackIds: tracks.map(track => track.id), tracks,
      durationSeconds: row.album_duration_seconds ?? null, externalUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : externalMusicFromRow(row)?.url ?? null }];
  });
}
