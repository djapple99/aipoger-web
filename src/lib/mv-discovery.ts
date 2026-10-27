import { activeMvPromotion } from "./mv-promotion.ts";
import { buildPublicHomeWorks, taipeiHomeWeek, weeklyMvPicks, type HomeDiscovery, type HomeHeartRow, type HomeTrackRow, type HomeWork } from "./home-discovery.ts";

export type MvChannel = HomeWork & { channelUrl: string };
export type MvWork = HomeWork & { favoriteCount?: number | null };
export type MvDiscovery = Omit<HomeDiscovery, "singles"> & { works: MvWork[]; channels: MvChannel[]; rankedIds?: string[] | null; generatedAt?: string; promotion?: { work: MvWork; endsAt: string } | null };
export type MvSort = "rated" | "latest" | "support" | "popular";

export function mvChannelUrl(value: string | null | undefined) {
  if (!value || value.length > 300) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || host !== "youtube.com") return null;
    const path = url.pathname.replace(/\/$/, "");
    if (!/^\/@[^/]+$/.test(path) && !/^\/(channel|user|c)\/[^/]+$/.test(path)) return null;
    return `https://www.youtube.com${path}`;
  } catch { return null; }
}

export function buildMvDiscovery(rows: HomeTrackRow[], hearts: HomeHeartRow[],
  mediaUrl: (bucket: string, path: string | null | undefined) => string, now = new Date()): MvDiscovery {
  const works = buildPublicHomeWorks(rows, hearts, mediaUrl, now);
  const home = weeklyMvPicks(works.filter(work => work.workKind !== "album"));
  const channelById = new Map(rows.map(row => [row.id, mvChannelUrl(row.youtube_url)]));
  return { promotion: activeMvPromotion(works, now), week: taipeiHomeWeek(now), featured: home.featured, featureKind: home.featureKind,
    // Preserve work IDs: separate submissions may legitimately share one video.
    works: works.filter(work => work.videoId),
    channels: works.flatMap(work => !work.videoId && channelById.get(work.id)
      ? [{ ...work, channelUrl: channelById.get(work.id)! }] : []),
  };
}

export function filterMvWorks<T extends HomeWork>(works: T[], query: string, genre: string, sort: MvSort, rankedIds?: readonly string[] | null): T[] {
  const terms = query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  // Match the public score on the cover; unrated works follow by publish date.
  const rating = (work: HomeWork) => work.workKind !== "album" && (work.ratingCount ?? 0) > 0 && Number.isFinite(work.ratingAverage)
    && (work.ratingAverage ?? 0) > 0 ? Number(work.ratingAverage!.toFixed(1)) : 0;
  const ranks = new Map((rankedIds ?? []).map((id, index) => [id, index]));
  const popularity = (a: HomeWork, b: HomeWork) => (ranks.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (ranks.get(b.id) ?? Number.MAX_SAFE_INTEGER);
  return works.filter(work => (!genre || work.genre === genre) && terms.every(term =>
    `${work.title} ${work.artist}`.normalize("NFKC").toLocaleLowerCase().includes(term)))
    .sort((a, b) => (sort === "popular" ? popularity(a, b) : sort === "rated" ? rating(b) - rating(a) : sort === "support" ? b.supporterCount - a.supporterCount : 0)
      || b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
}
