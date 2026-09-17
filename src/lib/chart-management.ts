import type { MonthlyChartResponse, MonthlyChartTrack } from "./monthly-charts.ts";

export type ChartTieGroup = {
  supporterCount: number;
  memberIds: string[];
  orderedIds: string[] | null;
  locked: boolean;
  tracks: Pick<MonthlyChartTrack, "id" | "title" | "artist" | "genre" | "supporterCount" | "rank">[];
};
export type DuplicateTrack = {
  id: string; title: string; artist: string; created_by: string | null;
  audio_path: string; cover_path: string | null; duration_seconds: number | null;
  created_at: string; audio_sha256: string | null;
};
export type DuplicateGroup = { key: string; reason: "same_file" | "similar_title"; tracks: (DuplicateTrack & { audioUrl: string; coverUrl: string })[] };
export type ChartManagementResponse = {
  chart: MonthlyChartResponse;
  groups: ChartTieGroup[];
  history: { id: number; supporter_count: number; ordered_ids: string[]; decided_at: string; decided_by: string }[];
  duplicates: DuplicateGroup[];
  pendingMonths: { month: string; count: number }[];
};

export function duplicateTitleKey(title: string) {
  return title.normalize("NFKC").toLocaleLowerCase("en")
    .replace(/\([^)]*\)|\[[^\]]*\]|【[^】]*】/gu, "")
    .replace(/[\p{P}\p{Z}\s]/gu, "");
}

// These are review candidates, never evidence for an automatic removal.
export function suspectedDuplicates(tracks: DuplicateTrack[], media: (bucket: string, path: string) => string): DuplicateGroup[] {
  const buckets = new Map<string, { reason: DuplicateGroup["reason"]; tracks: DuplicateTrack[] }>();
  for (const track of tracks) {
    const title = duplicateTitleKey(track.title ?? "");
    const keys: [string, DuplicateGroup["reason"]][] = [];
    if (track.audio_sha256) keys.push([`file:${track.audio_sha256}`, "same_file"]);
    if (track.created_by && [...title].length >= 4) keys.push([`title:${track.created_by}:${title}`, "similar_title"]);
    for (const [key, reason] of keys) {
      const group = buckets.get(key) ?? { reason, tracks: [] };
      group.tracks.push(track);
      buckets.set(key, group);
    }
  }
  const seen = new Set<string>();
  return [...buckets].flatMap(([key, group]) => {
    const identity = group.tracks.map((t) => t.id).sort().join(",");
    if (group.tracks.length < 2 || seen.has(identity)) return [];
    seen.add(identity);
    return [{ key, reason: group.reason, tracks: group.tracks.map((track) => ({ ...track,
      audioUrl: media("listen-bar-audio", track.audio_path),
      coverUrl: track.cover_path ? media("listen-bar-covers", track.cover_path) : "",
    })) }];
  });
}

export function monthlyChartSharePath(month: string, genre: string, lang: string) {
  const query = new URLSearchParams({ lang });
  if (/^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/.test(month)) query.set("chartMonth", month);
  if (genre && genre !== "all") query.set("chartGenre", genre);
  return `/rank?${query}#monthly-charts`;
}
