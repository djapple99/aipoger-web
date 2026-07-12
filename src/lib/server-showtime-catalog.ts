import type { SupabaseClient } from "@supabase/supabase-js";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import {
  isAiMusicShowtimePubliclyVisible,
  normalizeAiMusicShowtimeCertificationSource,
} from "@/lib/ai-music-showtime";
import { LISTEN_BAR_COVER_BUCKET, type ListenBarTrackRow } from "@/lib/listen-bar";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";

export type ShowtimeAdminTrackRow = ListenBarTrackRow & {
  ai_music_showtime_certified?: boolean | null;
  ai_music_showtime_certified_at?: string | null;
  ai_music_showtime_certification_source?: string | null;
  ai_music_showtime_public_removed_at?: string | null;
  ai_music_showtime_public_removal_note?: string | null;
};

export type ShowtimeAdminArchiveRow = {
  battle_id: string | null;
  battle_code: string | null;
  winner_name: string | null;
  winner_song_name: string | null;
  winner_ai_tool: string | null;
  final_vote_left: number | null;
  final_vote_right: number | null;
  total_votes: number | null;
  result_payload: unknown;
  archived_at: string | null;
  showtime_public_removed_at?: string | null;
  showtime_public_removal_note?: string | null;
};

export type ShowtimeAdminCatalog = {
  schemaReady: boolean;
  items: AipogerChoiceCatalogItem[];
  tracks: ShowtimeAdminTrackRow[];
  archives: ShowtimeAdminArchiveRow[];
};

const TRACK_SELECT = [
  "id",
  "title",
  "artist",
  "ai_tool",
  "genre",
  "mood",
  "audio_path",
  "cover_path",
  "is_active",
  "review_status",
  "hidden_at",
  "removed_at",
  "source",
  "bar_phase",
  "created_at",
  "ai_music_challenge_status",
  "ai_music_showtime_certified",
  "ai_music_showtime_certified_at",
  "ai_music_showtime_certification_source",
  "ai_music_showtime_public_removed_at",
  "ai_music_showtime_public_removal_note",
].join(",");

const ARCHIVE_SELECT = [
  "battle_id",
  "battle_code",
  "winner_name",
  "winner_song_name",
  "winner_ai_tool",
  "final_vote_left",
  "final_vote_right",
  "total_votes",
  "result_payload",
  "archived_at",
  "showtime_public_removed_at",
  "showtime_public_removal_note",
].join(",");

export function isMissingShowtimeSchema(error: unknown) {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /schema cache|column.*does not exist|relation.*does not exist|PGRST204|42P01|ai_music_showtime|showtime_public_removed/i.test(text);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function dateValue(value: unknown) {
  const date = new Date(typeof value === "string" ? value : 0);
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
}

function archivePayload(row: ShowtimeAdminArchiveRow) {
  return typeof row.result_payload === "object" && row.result_payload !== null
    ? row.result_payload as Record<string, unknown>
    : {};
}

function archiveAudienceCount(row: ShowtimeAdminArchiveRow) {
  const payload = archivePayload(row);
  const raw = payload.audienceCount ?? payload.audienceVoterCount ?? payload.audience ?? row.total_votes;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function coverUrl(admin: SupabaseClient, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return AIPOGER_BRAND_LOGO;
  if (/^https?:/i.test(clean)) return clean;
  return admin.storage.from(LISTEN_BAR_COVER_BUCKET).getPublicUrl(clean).data.publicUrl || AIPOGER_BRAND_LOGO;
}

function certificationLabel(source: unknown) {
  const normalized = normalizeAiMusicShowtimeCertificationSource(source);
  if (normalized === "battle") return "正式 Battle 認證";
  if (normalized === "defense") return "探索守擂認證";
  if (normalized === "founder_catalog") return "Showtime 建庫認證";
  return "傷心酒吧公播認證";
}

export function isShowtimeTrackCertificationCandidate(row: ShowtimeAdminTrackRow) {
  const status = row.review_status?.toLowerCase();
  return (
    row.source === "community" &&
    row.bar_phase === "public" &&
    row.is_active !== false &&
    status !== "hidden" &&
    status !== "removed" &&
    status !== "moderation_hold" &&
    !row.hidden_at &&
    !row.removed_at &&
    Boolean(row.audio_path?.trim()) &&
    !row.ai_music_showtime_certified
  );
}

function catalogItemFromTrack(admin: SupabaseClient, row: ShowtimeAdminTrackRow): AipogerChoiceCatalogItem {
  const certified = Boolean(row.ai_music_showtime_certified);
  const publicVisible = certified && isAiMusicShowtimePubliclyVisible(row);
  return {
    id: row.id,
    sourceKind: "listen_bar_track",
    title: stringValue(row.title, "未命名作品"),
    artist: stringValue(row.artist, "AIPOGER 創作者"),
    genre: stringValue(row.genre, "AI Music"),
    coverUrl: coverUrl(admin, row.cover_path),
    recognition: certified ? certificationLabel(row.ai_music_showtime_certification_source) : "傷心酒吧公播候選",
    certifiedAt: dateValue(row.ai_music_showtime_certified_at ?? row.created_at),
    isPublic: publicVisible,
    selectable: publicVisible,
  };
}

function catalogItemFromArchive(row: ShowtimeAdminArchiveRow): AipogerChoiceCatalogItem | null {
  const sourceId = stringValue(row.battle_id);
  if (!sourceId) return null;
  const payload = archivePayload(row);
  const audienceCount = archiveAudienceCount(row);
  const publicVisible = !row.showtime_public_removed_at && audienceCount >= 3;
  return {
    id: sourceId,
    sourceKind: "battle_archive",
    title: stringValue(row.winner_song_name, "未命名 Battle 作品"),
    artist: stringValue(row.winner_name, "AIPOGER 創作者"),
    genre: stringValue(payload.genre, "AI Music"),
    coverUrl: stringValue(payload.coverUrl, AIPOGER_BRAND_LOGO),
    recognition: "正式 Battle 認證",
    certifiedAt: dateValue(row.archived_at),
    isPublic: publicVisible,
    selectable: publicVisible,
  };
}

export async function loadShowtimeAdminCatalog(admin: SupabaseClient): Promise<ShowtimeAdminCatalog> {
  const [trackResult, archiveResult] = await Promise.all([
    admin.from("listen_bar_tracks").select(TRACK_SELECT).order("ai_music_showtime_certified_at", { ascending: false }).limit(500),
    admin.from("battle_result_archives").select(ARCHIVE_SELECT).order("archived_at", { ascending: false }).limit(200),
  ]);

  if (trackResult.error && isMissingShowtimeSchema(trackResult.error)) {
    return { schemaReady: false, items: [], tracks: [], archives: [] };
  }
  if (trackResult.error) throw trackResult.error;
  if (archiveResult.error && !isMissingShowtimeSchema(archiveResult.error)) throw archiveResult.error;

  const tracks = (trackResult.data ?? []) as unknown as ShowtimeAdminTrackRow[];
  const archives = archiveResult.error ? [] : (archiveResult.data ?? []) as unknown as ShowtimeAdminArchiveRow[];
  const trackItems = tracks
    .filter((row) => Boolean(row.ai_music_showtime_certified) || isShowtimeTrackCertificationCandidate(row))
    .map((row) => catalogItemFromTrack(admin, row));
  const archiveItems = archives.map(catalogItemFromArchive).filter((row): row is AipogerChoiceCatalogItem => Boolean(row));
  const items = [...trackItems, ...archiveItems]
    .sort((a, b) => new Date(b.certifiedAt).getTime() - new Date(a.certifiedAt).getTime() || a.id.localeCompare(b.id));

  return { schemaReady: true, items, tracks, archives };
}
