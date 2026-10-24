import { externalMusicFromRow } from "./external-music.ts";
import { isPublicMusicWork } from "./listen-bar-airplay.ts";
import { isCurrentMusicGenre } from "./music-genres.ts";
import { isInMusicPool } from "./music-pool.ts";

export type HomeWork = {
  workKind?: "single" | "album";
  id: string; title: string; artist: string; genre: string; description: string;
  coverUrl: string; audioUrl: string; lyrics: string; videoId: string | null;
  youtubeUrl: string | null; supporterCount: number; publishedAt: string;
  comment?: { name: string; text: string };
  ratingAverage?: number | null; ratingCount?: number; ratingTotal?: number;
};
export type HomeDiscovery = {
  week: { startDate: string; endDate: string };
  featured: HomeWork[]; featureKind: "community" | "new" | "empty"; singles: HomeWork[];
};
export type HomeTrackRow = {
  work_kind?: "single" | "album";
  album_track_ids?: string[] | null;
  id: string; title: string; artist: string; genre: string | null;
  description?: string | null; audio_path?: string | null; cover_path?: string | null;
  external_url?: string | null; is_music_video?: boolean;
  youtube_url?: string | null; lyrics?: string | null; created_at?: string | null;
  created_by?: string | null; source?: string | null; is_featured_official?: boolean | null;
  is_active?: boolean | null; review_status?: string | null; hidden_at?: string | null;
  removed_at?: string | null; ai_music_showtime_public_removed_at?: string | null;
};
export type HomeHeartRow = {
  track_id?: string | null; user_id?: string | null; vote_date?: string | null; reaction?: string | null;
};

export function excludeFeaturedWorks<T extends { id: string }>(works: T[], featured: { id: string }[]): T[] {
  const featuredIds = new Set(featured.map(work => work.id));
  return works.filter(work => !featuredIds.has(work.id));
}

const DAY = 86_400_000;
// Calendar dates are explicit; the server timezone must not determine the week.
export function taipeiHomeWeek(now: Date = new Date()) {
  const shifted = new Date(now.getTime() + 8 * 3_600_000);
  const midnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  const monday = midnight - ((shifted.getUTCDay() + 6) % 7) * DAY;
  return { startDate: new Date(monday).toISOString().slice(0, 10), endDate: new Date(monday + 7 * DAY).toISOString().slice(0, 10) };
}

export function homeYouTubeId(value: string | null | undefined): string | null {
  if (!value || value.length > 300) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    const parts = url.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be" ? parts[0]
      : ["youtube.com", "music.youtube.com"].includes(host)
        ? url.pathname === "/watch" ? url.searchParams.get("v")
          : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : null
        : null;
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function homeSupportCounts(rows: HomeTrackRow[], hearts: HomeHeartRow[], week: HomeDiscovery["week"]) {
  const authors = new Map(rows.map(row => [row.id, row.created_by]));
  const voters = new Map<string, Set<string>>();
  for (const heart of hearts) {
    const id = heart.track_id ?? "";
    const user = heart.user_id?.trim();
    const date = heart.vote_date ?? "";
    if (!authors.has(id) || !user || user === authors.get(id)
      || heart.reaction !== "heart" || date < week.startDate || date >= week.endDate) continue;
    const set = voters.get(id) ?? new Set<string>();
    set.add(user); voters.set(id, set);
  }
  return new Map(rows.map(row => [row.id, voters.get(row.id)?.size ?? 0]));
}

export function buildPublicHomeWorks(rows: HomeTrackRow[], hearts: HomeHeartRow[],
  mediaUrl: (bucket: string, path: string | null | undefined) => string, now = new Date()): HomeWork[] {
  const week = taipeiHomeWeek(now);
  const eligible = rows.filter(row => isPublicMusicWork(row)
    && isCurrentMusicGenre(row.genre) && row.source === "community" && !row.is_featured_official);
  const counts = homeSupportCounts(eligible, hearts, week);
  const works: HomeWork[] = eligible.flatMap(row => {
    const audioUrl = mediaUrl("listen-bar-audio", row.audio_path);
    const external = externalMusicFromRow(row);
    if (!audioUrl && !external && !(row.work_kind === "album" && row.album_track_ids?.length)) return [];
    const videoId = external ? (row.is_music_video && external.provider === "youtube" ? external.mediaId : homeYouTubeId(row.youtube_url)) : homeYouTubeId(row.youtube_url);
    return [{ id: row.id, ...(row.work_kind === "album" ? { workKind: "album" as const } : {}), title: row.title, artist: row.artist, genre: row.genre ?? "",
      description: row.description?.trim() ?? "", coverUrl: mediaUrl("listen-bar-covers", row.cover_path),
      audioUrl, lyrics: row.lyrics ?? "", videoId,
      youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      supporterCount: counts.get(row.id) ?? 0, publishedAt: row.created_at ?? "" }];
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
  return works;
}

export function buildHomeDiscovery(rows: HomeTrackRow[], hearts: HomeHeartRow[],
  mediaUrl: (bucket: string, path: string | null | undefined) => string, now = new Date()): HomeDiscovery {
  const week = taipeiHomeWeek(now);
  const works = buildPublicHomeWorks(rows, hearts, mediaUrl, now).filter(work => work.workKind !== "album");
  const mvs = works.filter(work => work.videoId);
  const topSupport = Math.max(0, ...mvs.map(work => work.supporterCount));
  // A tie is shared exposure, never a fabricated sole winner or personal endorsement.
  const featured = topSupport > 0 ? mvs.filter(work => work.supporterCount === topSupport) : mvs.slice(0, 1);
  return { week, featured, featureKind: topSupport > 0 ? "community" : featured.length ? "new" : "empty", singles: excludeFeaturedWorks(works, featured).filter(work => work.audioUrl && isInMusicPool(work.publishedAt, now.getTime())).slice(0, 3) };
}

type PageResult<T> = { data: T[] | null; error: { message: string } | null };
export async function readAllHomePages<T>(read: (from: number, to: number) => PromiseLike<PageResult<T>>, pageSize = 500): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 100_000; from += pageSize) {
    const { data, error } = await read(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Missing discovery data.");
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
  throw new Error("Discovery data exceeds the supported read size.");
}
