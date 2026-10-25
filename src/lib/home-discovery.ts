import { externalMusicFromRow, type ExternalMusic } from "./external-music.ts";
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
  externalMedia?: ExternalMusic;
  discoveryReason?: "new" | "community" | "discovery";
};
export type HomeDiscovery = {
  week: { startDate: string; endDate: string };
  featured: HomeWork[]; featureKind: "community" | "new" | "empty"; singles: HomeWork[];
  rotationKey?: string;
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
      audioUrl, ...(external ? { externalMedia: external } : {}), lyrics: row.lyrics ?? "", videoId,
      youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      supporterCount: counts.get(row.id) ?? 0, publishedAt: row.created_at ?? "" }];
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
  return works;
}

/** Weekly support remains a count, independent of the homepage's rotating exposure. */
export function weeklyMvPicks(works: HomeWork[]) {
  const mvs = works.filter(work => work.videoId);
  const topSupport = Math.max(0, ...mvs.map(work => work.supporterCount));
  const featured = topSupport > 0 ? mvs.filter(work => work.supporterCount === topSupport) : mvs.slice(0, 1);
  return { featured, featureKind: topSupport > 0 ? "community" as const : featured.length ? "new" as const : "empty" as const };
}

const HOME_ROTATION_MS = 4 * 3_600_000;
const HOME_RECENT_MS = 30 * DAY;

export function buildHomeDiscovery(rows: HomeTrackRow[], hearts: HomeHeartRow[],
  mediaUrl: (bucket: string, path: string | null | undefined) => string, now = new Date()): HomeDiscovery {
  const week = taipeiHomeWeek(now);
  const works = buildPublicHomeWorks(rows, hearts, mediaUrl, now).filter(work => work.workKind !== "album");
  const slot = Math.floor((now.getTime() + 8 * 3_600_000) / HOME_ROTATION_MS);
  const rotate = (items: HomeWork[]) => {
    const offset = items.length ? slot % items.length : 0;
    return [...items.slice(offset), ...items.slice(0, offset)];
  };
  const recent = (items: HomeWork[]) => items.filter(work => {
    const age = now.getTime() - Date.parse(work.publishedAt);
    return age >= 0 && age < HOME_RECENT_MS;
  });
  // Identity is used only for exposure diversity; member IDs never leave the server.
  const authors = new Map(rows.map(row => [row.id, row.created_by?.trim() || row.artist.normalize("NFKC").trim().toLocaleLowerCase()]));
  const rotationCandidates = (items: HomeWork[]) => {
    const byCreator = new Map<string, HomeWork[]>();
    for (const work of items) {
      const creator = authors.get(work.id) ?? work.id;
      const group = byCreator.get(creator) ?? [];
      group.push(work); byCreator.set(creator, group);
    }
    // Rotate creators first: a large batch from one author cannot stall everyone else.
    const representatives = [...byCreator.values()].map(group => group[slot % group.length]);
    return [...rotate(representatives), ...rotate(items)];
  };
  const addDiverse = (selected: HomeWork[], candidates: HomeWork[], limit: number) => {
    for (const diverseOnly of [true, false]) for (const work of candidates) {
      if (selected.length >= limit) return;
      if (selected.some(item => item.id === work.id)) continue;
      if (diverseOnly && selected.some(item => authors.get(item.id) === authors.get(work.id))) continue;
      selected.push(work);
    }
  };
  const mvs = works.filter(work => work.videoId);
  const recentMvs = recent(mvs);
  const mvPool = recentMvs.length ? recentMvs : mvs;
  const featured: HomeWork[] = [];
  // A new upload leads immediately for four hours, then joins the regular rotation.
  const newest = mvPool[0];
  const age = newest ? now.getTime() - Date.parse(newest.publishedAt) : Infinity;
  const lead = age >= 0 && age < HOME_ROTATION_MS ? newest : rotationCandidates(mvPool)[0];
  if (lead) featured.push(lead);
  if (newest && newest.id !== lead?.id) addDiverse(featured, [newest], 2);
  addDiverse(featured, rotationCandidates(mvPool), 3);
  const freshIds = new Set(recentMvs.map(work => work.id));
  const labelled: HomeWork[] = featured.map(work => ({ ...work, discoveryReason: freshIds.has(work.id) ? "new" as const : "discovery" as const }));
  const weekly = weeklyMvPicks(works);
  if (weekly.featureKind === "community") {
    const community: HomeWork[] = [...labelled];
    addDiverse(community, rotationCandidates(weekly.featured), labelled.length + 1);
    for (const work of community.slice(labelled.length)) labelled.push({ ...work, discoveryReason: "community" });
  }
  const candidates = excludeFeaturedWorks(works, labelled)
    .filter(work => (work.audioUrl || work.externalMedia) && isInMusicPool(work.publishedAt, now.getTime()));
  const singles: HomeWork[] = candidates.slice(0, 1);
  const recentSingles = recent(candidates);
  addDiverse(singles, rotationCandidates(recentSingles.length ? recentSingles : candidates), 3);
  return { week, rotationKey: String(slot), featured: labelled,
    featureKind: labelled.some(work => work.discoveryReason === "community") ? "community" : labelled.length ? "new" : "empty", singles };
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
