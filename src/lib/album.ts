import type { HomeWork } from "./home-discovery";
export type WorkKind = "single" | "album";
export const workKind = (value: unknown): WorkKind => value === "album" ? "album" : "single";
export function albumTrackIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 50 || value.some(id => typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) return null;
  return new Set(value.map(id => id.toLowerCase())).size === value.length ? value.map(id => id.toLowerCase()) : null;
}
export type AlbumMember = HomeWork & { externalUrl?: string | null };
export type PublicAlbum = HomeWork & { workKind: "album"; trackIds: string[]; tracks: AlbumMember[]; durationSeconds: number | null; externalUrl: string | null };
export function albumPath(id: string, lang: string) { return `/ai-music?lang=${lang}&view=albums&album=${id}#works`; }
