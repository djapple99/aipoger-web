import { isCurrentMusicGenre } from "@/lib/music-genres";
import type { ListenBarTrackRow } from "@/lib/listen-bar";

export const AI_MUSIC_SHOWTIME_CERTIFICATION_SOURCES = ["battle", "defense", "airplay", "founder_catalog"] as const;
export type AiMusicShowtimeCertificationSource = (typeof AI_MUSIC_SHOWTIME_CERTIFICATION_SOURCES)[number];

export const AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS = [
  "ai_music_showtime_certified",
  "ai_music_showtime_certified_at",
  "ai_music_showtime_certification_source",
  "ai_music_showtime_public_removed_at",
  "support_url",
  "support_url_label",
  "support_url_status",
].join(",");

export type AiMusicShowtimeTrackFields = {
  ai_music_showtime_certified?: boolean | null;
  ai_music_showtime_certified_at?: string | null;
  ai_music_showtime_certification_source?: string | null;
  ai_music_showtime_public_removed_at?: string | null;
  support_url?: string | null;
  support_url_label?: string | null;
  support_url_status?: string | null;
};

export function normalizeAiMusicShowtimeCertificationSource(value: unknown): AiMusicShowtimeCertificationSource {
  return AI_MUSIC_SHOWTIME_CERTIFICATION_SOURCES.includes(value as AiMusicShowtimeCertificationSource)
    ? value as AiMusicShowtimeCertificationSource
    : "airplay";
}

export function isAiMusicPersistedShowtimeCertified(row: AiMusicShowtimeTrackFields | null | undefined) {
  return Boolean(row?.ai_music_showtime_certified) && !row?.ai_music_showtime_public_removed_at;
}

export function isAiMusicShowtimePubliclyVisible(row: (ListenBarTrackRow & AiMusicShowtimeTrackFields) | null | undefined) {
  if (!row || !isAiMusicPersistedShowtimeCertified(row)) return false;
  const status = row.review_status?.toLowerCase();
  const moderationHeld = status === "moderation_hold" || status === "moderation hold";
  return (
    row.is_active !== false &&
    status !== "hidden" &&
    status !== "removed" &&
    !moderationHeld &&
    !row.hidden_at &&
    !row.removed_at &&
    Boolean(row.audio_path?.trim()) &&
    isCurrentMusicGenre(row.genre) &&
    row.source !== "official" &&
    !row.is_featured_official
  );
}

export function cleanShowtimeSupportUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!clean) return null;
  if (clean.length > 500) return null;
  let parsed: URL;
  try {
    parsed = new URL(clean);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  return parsed.toString();
}

export function cleanShowtimeSupportLabel(value: unknown) {
  if (typeof value !== "string") return null;
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  return clean.slice(0, 80);
}

export function canDisplayShowtimeSupportUrl(row: AiMusicShowtimeTrackFields | null | undefined) {
  return Boolean(row?.support_url?.trim()) && row?.support_url_status === "approved";
}
