import { buildHomeDiscovery, buildPublicHomeWorks, type HomeDiscovery, type HomeHeartRow, type HomeTrackRow, type HomeWork } from "./home-discovery.ts";

export type MvChannel = HomeWork & { channelUrl: string };
export type MvDiscovery = Omit<HomeDiscovery, "singles"> & { works: HomeWork[]; channels: MvChannel[] };
export type MvSort = "latest" | "support";

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
  const home = buildHomeDiscovery(rows, hearts, mediaUrl, now);
  const works = buildPublicHomeWorks(rows, hearts, mediaUrl, now);
  const channelById = new Map(rows.map(row => [row.id, mvChannelUrl(row.youtube_url)]));
  return { week: home.week, featured: home.featured, featureKind: home.featureKind,
    // Preserve work IDs: separate submissions may legitimately share one video.
    works: works.filter(work => work.videoId),
    channels: works.flatMap(work => !work.videoId && channelById.get(work.id)
      ? [{ ...work, channelUrl: channelById.get(work.id)! }] : []),
  };
}

export function filterMvWorks<T extends HomeWork>(works: T[], query: string, genre: string, sort: MvSort): T[] {
  const terms = query.normalize("NFKC").toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return works.filter(work => (!genre || work.genre === genre) && terms.every(term =>
    `${work.title} ${work.artist}`.normalize("NFKC").toLocaleLowerCase().includes(term)))
    .sort((a, b) => (sort === "support" ? b.supporterCount - a.supporterCount : 0)
      || b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
}
