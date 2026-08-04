import type { SupabaseClient } from "@supabase/supabase-js";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import {
  isAiMusicShowtimePubliclyVisible,
  normalizeAiMusicShowtimeCertificationSource,
} from "@/lib/ai-music-showtime";
import { LISTEN_BAR_AUDIO_BUCKET, LISTEN_BAR_COVER_BUCKET, type ListenBarTrackRow } from "@/lib/listen-bar";
import type { AipogerChoiceCatalogItem } from "@/lib/aipoger-choice";
import { signedBattleAudioUrl } from "@/lib/official-gatekeeper-media";
import { isCurrentMusicGenre } from "@/lib/music-genres";

export const SHOWTIME_REVIEW_AGE_DAYS = 30;
export const SHOWTIME_WEEKLY_AIRPLAY_CERTIFICATION_LIMIT = 4;

export type ShowtimeAdminTrackRow = ListenBarTrackRow & {
  created_by?: string | null;
  description?: string | null;
  youtube_url?: string | null;
  support_url?: string | null;
  support_url_label?: string | null;
  support_url_status?: string | null;
  ai_music_showtime_certified?: boolean | null;
  ai_music_showtime_certified_at?: string | null;
  ai_music_showtime_certification_source?: string | null;
  ai_music_showtime_public_removed_at?: string | null;
  ai_music_showtime_public_removal_note?: string | null;
};

export type ShowtimeAdminCandidate = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  coverUrl: string;
  audioUrl: string | null;
  heartCount: number;
  positiveReactionCount: number;
  createdAt: string;
};

export type ShowtimeAdminArchiveRow = {
  battle_id: string | null;
  battle_code: string | null;
  winner: "fighter_a" | "fighter_b" | null;
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

type ShowtimeBattleAudioRow = {
  id: string | null;
  winner: "fighter_a" | "fighter_b" | null;
  audio_a_path: string | null;
  audio_b_path: string | null;
};

export type ShowtimeAdminCatalog = {
  schemaReady: boolean;
  items: AipogerChoiceCatalogItem[];
  tracks: ShowtimeAdminTrackRow[];
  archives: ShowtimeAdminArchiveRow[];
  candidates: ShowtimeAdminCandidate[];
  weeklyAirplayCertificationCount: number;
  weeklyAirplayCertificationLimit: number;
};

const TRACK_SELECT = [
  "id",
  "title",
  "artist",
  "ai_tool",
  "genre",
  "mood",
  "description",
  "youtube_url",
  "lyrics",
  "support_url",
  "support_url_label",
  "support_url_status",
  "audio_path",
  "cover_path",
  "is_active",
  "review_status",
  "hidden_at",
  "removed_at",
  "source",
  "bar_phase",
  "created_at",
  "created_by",
  "heart_count",
  "positive_reaction_count",
  "ai_music_challenge_status",
  "ai_music_showtime_certified",
  "ai_music_showtime_certified_at",
  "ai_music_showtime_certification_source",
  "ai_music_showtime_public_removed_at",
  "ai_music_showtime_public_removal_note",
].join(",");

function taipeiWeekStartIso(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const taipeiDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = taipeiDate.getUTCDay() || 7;
  taipeiDate.setUTCDate(taipeiDate.getUTCDate() - weekday + 1);
  return new Date(taipeiDate.getTime() - 8 * 60 * 60 * 1000).toISOString();
}

function showtimeReviewCutoffIso(value = new Date()) {
  return new Date(value.getTime() - SHOWTIME_REVIEW_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

const ARCHIVE_SELECT = [
  "battle_id",
  "battle_code",
  "winner",
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

function audioUrl(admin: SupabaseClient, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^https?:/i.test(clean)) return clean;
  return admin.storage.from(LISTEN_BAR_AUDIO_BUCKET).getPublicUrl(clean).data.publicUrl || null;
}

function certificationLabel(source: unknown) {
  const normalized = normalizeAiMusicShowtimeCertificationSource(source);
  if (normalized === "battle") return "正式 Battle 認證";
  if (normalized === "defense") return "探索守擂認證";
  if (normalized === "founder_catalog") return "Showtime 建庫認證";
  return "傷心酒吧公播認證";
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
    audioUrl: audioUrl(admin, row.audio_path),
    recognition: certificationLabel(row.ai_music_showtime_certification_source),
    certifiedAt: dateValue(row.ai_music_showtime_certified_at ?? row.created_at),
    isPublic: publicVisible,
    selectable: publicVisible,
  };
}

function isEligibleShowtimeCandidate(row: ShowtimeAdminTrackRow, cutoffIso: string) {
  const status = row.review_status?.toLowerCase();
  const moderationHeld = status === "moderation_hold" || status === "moderation hold";
  const createdAt = new Date(row.created_at ?? 0);
  return (
    row.source === "community" &&
    row.is_active !== false &&
    !row.ai_music_showtime_certified &&
    !row.ai_music_showtime_public_removed_at &&
    status !== "hidden" &&
    status !== "removed" &&
    !moderationHeld &&
    !row.hidden_at &&
    !row.removed_at &&
    Boolean(row.audio_path?.trim()) &&
    isCurrentMusicGenre(row.genre) &&
    Number.isFinite(createdAt.getTime()) &&
    createdAt.toISOString() < cutoffIso
  );
}

function candidateFromTrack(admin: SupabaseClient, row: ShowtimeAdminTrackRow): ShowtimeAdminCandidate {
  return {
    id: row.id,
    title: stringValue(row.title, "未命名作品"),
    artist: stringValue(row.artist, "AIPOGER 創作者"),
    genre: stringValue(row.genre, "Original 自我風格"),
    coverUrl: coverUrl(admin, row.cover_path),
    audioUrl: audioUrl(admin, row.audio_path),
    heartCount: Math.max(0, Math.round(Number(row.heart_count ?? 0))),
    positiveReactionCount: Math.max(0, Math.round(Number(row.positive_reaction_count ?? 0))),
    createdAt: dateValue(row.created_at),
  };
}

function catalogItemFromArchive(row: ShowtimeAdminArchiveRow, playbackUrl: string | null): AipogerChoiceCatalogItem | null {
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
    audioUrl: playbackUrl,
    recognition: "正式 Battle 認證",
    certifiedAt: dateValue(row.archived_at),
    isPublic: publicVisible,
    selectable: publicVisible,
  };
}

export async function loadShowtimeAdminCatalog(
  admin: SupabaseClient,
  options: { includeCandidates?: boolean } = {},
): Promise<ShowtimeAdminCatalog> {
  const includeCandidates = options.includeCandidates === true;
  const [trackResult, archiveResult, candidateResult] = await Promise.all([
    admin.from("listen_bar_tracks").select(TRACK_SELECT).order("ai_music_showtime_certified_at", { ascending: false }).limit(500),
    admin.from("battle_result_archives").select(ARCHIVE_SELECT).order("archived_at", { ascending: false }).limit(200),
    includeCandidates
      ? admin.from("listen_bar_tracks").select(TRACK_SELECT).eq("source", "community").eq("is_active", true).order("created_at", { ascending: false }).limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (trackResult.error && isMissingShowtimeSchema(trackResult.error)) {
    return {
      schemaReady: false,
      items: [],
      tracks: [],
      archives: [],
      candidates: [],
      weeklyAirplayCertificationCount: 0,
      weeklyAirplayCertificationLimit: SHOWTIME_WEEKLY_AIRPLAY_CERTIFICATION_LIMIT,
    };
  }
  if (trackResult.error) throw trackResult.error;
  if (archiveResult.error && !isMissingShowtimeSchema(archiveResult.error)) throw archiveResult.error;
  if (candidateResult.error && !isMissingShowtimeSchema(candidateResult.error)) throw candidateResult.error;

  const tracks = (trackResult.data ?? []) as unknown as ShowtimeAdminTrackRow[];
  const archives = archiveResult.error ? [] : (archiveResult.data ?? []) as unknown as ShowtimeAdminArchiveRow[];
  const candidateRows = candidateResult.error ? [] : (candidateResult.data ?? []) as unknown as ShowtimeAdminTrackRow[];
  const currentTracks = tracks.filter(
    (row) => Boolean(row.ai_music_showtime_certified) && isAiMusicShowtimePubliclyVisible(row),
  );
  const currentArchives = archives
    .map((archive) => ({ archive, item: catalogItemFromArchive(archive, null) }))
    .filter((entry): entry is { archive: ShowtimeAdminArchiveRow; item: AipogerChoiceCatalogItem } => Boolean(entry.item?.isPublic && entry.item.selectable));
  const archiveIds = currentArchives.map((entry) => entry.archive.battle_id).filter((id): id is string => Boolean(id));
  const { data: battleRowsData, error: battleRowsError } = archiveIds.length > 0
    ? await admin.from("battles").select("id,winner,audio_a_path,audio_b_path").in("id", archiveIds)
    : { data: [], error: null };
  if (battleRowsError) throw battleRowsError;

  const battleRows = (battleRowsData ?? []) as unknown as ShowtimeBattleAudioRow[];
  const battleById = new Map(battleRows.filter((row): row is ShowtimeBattleAudioRow & { id: string } => Boolean(row.id)).map((row) => [row.id, row]));
  const archiveItems = await Promise.all(currentArchives.map(async ({ archive }) => {
    const battle = archive.battle_id ? battleById.get(archive.battle_id) : null;
    const winner = archive.winner ?? battle?.winner ?? null;
    const winnerAudioPath = winner === "fighter_b" ? battle?.audio_b_path : battle?.audio_a_path;
    const playbackUrl = await signedBattleAudioUrl(admin, winnerAudioPath, 60 * 60);
    return catalogItemFromArchive(archive, playbackUrl);
  }));
  const trackItems = currentTracks.map((row) => catalogItemFromTrack(admin, row));
  const items = [...trackItems, ...archiveItems]
    .filter((item): item is AipogerChoiceCatalogItem => Boolean(item))
    .sort((a, b) => new Date(b.certifiedAt).getTime() - new Date(a.certifiedAt).getTime() || a.id.localeCompare(b.id));

  const cutoffIso = showtimeReviewCutoffIso();
  const candidates = includeCandidates
    ? candidateRows
      .filter((row) => isEligibleShowtimeCandidate(row, cutoffIso))
      .map((row) => candidateFromTrack(admin, row))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || a.id.localeCompare(b.id))
    : [];

  let weeklyAirplayCertificationCount = 0;
  if (includeCandidates) {
    const weeklyCountResult = await admin
      .from("listen_bar_tracks")
      .select("id", { count: "exact", head: true })
      .eq("ai_music_showtime_certified", true)
      .eq("ai_music_showtime_certification_source", "airplay")
      .gte("ai_music_showtime_certified_at", taipeiWeekStartIso());
    if (weeklyCountResult.error) throw weeklyCountResult.error;
    weeklyAirplayCertificationCount = weeklyCountResult.count ?? 0;
  }

  return {
    schemaReady: true,
    items,
    tracks: currentTracks,
    archives: currentArchives.map((entry) => entry.archive),
    candidates,
    weeklyAirplayCertificationCount,
    weeklyAirplayCertificationLimit: SHOWTIME_WEEKLY_AIRPLAY_CERTIFICATION_LIMIT,
  };
}
