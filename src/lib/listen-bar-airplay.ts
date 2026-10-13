import { externalMusicFromRow } from "./external-music.ts";
type AirplayRow = {
  is_active?: boolean | null;
  review_status?: string | null;
  hidden_at?: string | null;
  removed_at?: string | null;
  ai_music_showtime_certified?: boolean | null;
  ai_music_showtime_public_removed_at?: string | null;
  audio_path?: string | null;
  external_url?: string | null;
};

// Recognition is not a reason to stop playing; an explicit removal always is.
export function isPublicBarAirplayTrack(row: AirplayRow): boolean {
  return row.is_active !== false
    && (row.review_status == null || row.review_status.toLowerCase() === "approved")
    && !row.hidden_at && !row.removed_at && !row.ai_music_showtime_public_removed_at
    && Boolean(row.audio_path?.trim());
}

// Linked works are discoverable, while the continuous audio station stays audio-only.
export function isPublicDiscoveryTrack(row: AirplayRow): boolean {
  return isPublicBarAirplayTrack(row) || Boolean(externalMusicFromRow(row) && row.is_active !== false && (row.review_status == null || row.review_status.toLowerCase() === "approved") && !row.hidden_at && !row.removed_at && !row.ai_music_showtime_public_removed_at);
}
