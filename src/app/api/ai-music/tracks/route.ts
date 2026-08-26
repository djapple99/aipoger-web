import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AI_MUSIC_CHALLENGE_BATTLE_TYPE,
  AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET,
  aiMusicShowtimeDefenseRemaining,
} from "@/lib/ai-music-challenge-rules";
import { buildAiMusicSurfaceLifecycleMap, isAiMusicLifecycleSchemaMissing } from "@/lib/ai-music-surface-lifecycle";
import { AI_MUSIC_HEAT_WINDOW_MS } from "@/lib/ai-music-heat";
import { isAiMusicPersistedShowtimeCertified, AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS } from "@/lib/ai-music-showtime";
import { isOfficialDropBattleResult } from "@/lib/drop-battle-rematch";
import {
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  listenBarPromotionProtectionActive,
  type ListenBarTrackRow,
} from "@/lib/listen-bar";
import { isCurrentMusicGenre } from "@/lib/music-genres";
import { readEarwormAffinityMap } from "@/lib/earworm-affinity";

type AdminClient = SupabaseClient;

type RecentHeartRow = {
  track_id?: string | null;
  user_id?: string | null;
  created_at?: string | null;
};

type RecentInviteRow = {
  defender_track_id?: string | null;
  battle_id?: string | null;
  status?: string | null;
};

type RecentBattleRow = {
  id?: string | null;
  battle_type?: string | null;
};

type RecentArchiveRow = {
  battle_id?: string | null;
  total_votes?: number | null;
  result_payload?: Record<string, unknown> | null;
  archived_at?: string | null;
};

type RecentHeat = {
  heartSupporterIds: Set<string>;
  officialAudienceVotes: number;
  latestInteractionAt: string | null;
};

const MODERN_SELECT = [
  "id",
  "title",
  "artist",
  "ai_tool",
  "genre",
  "mood",
  "description",
  "youtube_url",
  "bpm",
  "duration_seconds",
  "audio_path",
  "cover_path",
  "lyrics",
  "sort_order",
  "is_active",
  "review_status",
  "hidden_at",
  "removed_at",
  "source",
  "is_featured_official",
  "bar_phase",
  "positive_reaction_count",
  "heart_count",
  "star_count",
  "thumb_count",
  "happy_count",
  "created_at",
  "promoted_at",
  "created_by",
  "ai_music_challenge_status",
  "ai_music_defender_drop_audio_path",
  "ai_music_defender_drop_prepared_at",
  AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS,
].join(",");

const LEGACY_SELECT = [
  "id",
  "title",
  "artist",
  "ai_tool",
  "genre",
  "mood",
  "description",
  "youtube_url",
  "bpm",
  "duration_seconds",
  "audio_path",
  "cover_path",
  "lyrics",
  "sort_order",
  "is_active",
  "review_status",
  "hidden_at",
  "removed_at",
  "source",
  "is_featured_official",
  "bar_phase",
  "positive_reaction_count",
  "heart_count",
  "star_count",
  "thumb_count",
  "happy_count",
  "created_at",
  "promoted_at",
  "created_by",
].join(",");

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingTrackColumn(error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /schema cache|column.*does not exist|PGRST204|ai_music_challenge|defender_drop|ai_music_showtime|support_url|description|youtube_url/i.test(text);
}

function applyLegacyOpeningGrace(rows: ListenBarTrackRow[]): ListenBarTrackRow[] {
  const hasPersistedPhase = rows.some((row) => Object.prototype.hasOwnProperty.call(row, "bar_phase"));
  if (hasPersistedPhase) return rows;

  if (listenBarPromotionProtectionActive()) {
    return rows.map((row) => ({
      ...row,
      bar_phase: "public",
      promoted_at: row.promoted_at ?? row.created_at,
    }));
  }

  const observationCutoffMs = Date.now() - LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS * 60 * 60 * 1000;
  const eligiblePublicIds = new Set(
    rows
      .filter((row) => {
        const createdAtMs = new Date(row.created_at ?? 0).getTime();
        return Number.isFinite(createdAtMs) && createdAtMs < observationCutoffMs;
      })
      .sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
      .map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    bar_phase: eligiblePublicIds.has(row.id) ? "public" : "challenger",
    promoted_at: eligiblePublicIds.has(row.id) ? (row.promoted_at ?? row.created_at) : row.promoted_at,
  }));
}

function isPublicPlayableTrack(row: ListenBarTrackRow) {
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

function numberField(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function archiveAudienceCount(row: RecentArchiveRow) {
  const payload = row.result_payload && typeof row.result_payload === "object" ? row.result_payload : {};
  return numberField(payload.audienceCount ?? payload.audience_count ?? row.total_votes);
}

function latestIso(current: string | null, candidate: string | null | undefined) {
  const candidateMs = new Date(candidate ?? "").getTime();
  if (!Number.isFinite(candidateMs)) return current;
  const currentMs = new Date(current ?? "").getTime();
  return !Number.isFinite(currentMs) || candidateMs > currentMs ? new Date(candidateMs).toISOString() : current;
}

async function readRecentHeat(admin: AdminClient, trackIds: string[]) {
  const ids = Array.from(new Set(trackIds.filter(Boolean)));
  const heatByTrackId = new Map<string, RecentHeat>();
  for (const id of ids) {
    heatByTrackId.set(id, { heartSupporterIds: new Set<string>(), officialAudienceVotes: 0, latestInteractionAt: null });
  }
  if (ids.length === 0) return heatByTrackId;

  const since = new Date(Date.now() - AI_MUSIC_HEAT_WINDOW_MS).toISOString();
  const [heartResult, inviteResult] = await Promise.all([
    admin
      .from("listen_bar_track_reactions")
      .select("track_id,user_id,created_at")
      .in("track_id", ids)
      .eq("reaction", "heart")
      .gte("created_at", since),
    admin
      .from("ai_music_challenge_invites")
      .select("defender_track_id,battle_id,status")
      .in("defender_track_id", ids)
      .eq("status", "accepted")
      .not("battle_id", "is", null),
  ]);
  if (heartResult.error) throw heartResult.error;
  if (inviteResult.error) {
    if (isAiMusicLifecycleSchemaMissing(inviteResult.error)) return heatByTrackId;
    throw inviteResult.error;
  }

  for (const row of (heartResult.data ?? []) as RecentHeartRow[]) {
    const trackId = row.track_id ?? "";
    const userId = row.user_id?.trim() ?? "";
    const heat = heatByTrackId.get(trackId);
    if (!heat || !userId) continue;
    heat.heartSupporterIds.add(userId);
    heat.latestInteractionAt = latestIso(heat.latestInteractionAt, row.created_at);
  }

  const acceptedInvites = ((inviteResult.data ?? []) as RecentInviteRow[]).filter((row): row is { defender_track_id: string; battle_id: string; status: string } => {
    return Boolean(row.defender_track_id && row.battle_id && row.status === "accepted");
  });
  const battleIds = Array.from(new Set(acceptedInvites.map((row) => row.battle_id)));
  if (battleIds.length === 0) return heatByTrackId;

  const [battleResult, archiveResult] = await Promise.all([
    admin.from("battles").select("id,battle_type").in("id", battleIds),
    admin
      .from("battle_result_archives")
      .select("battle_id,total_votes,result_payload,archived_at")
      .in("battle_id", battleIds)
      .gte("archived_at", since),
  ]);
  if (battleResult.error || archiveResult.error) {
    const error = battleResult.error ?? archiveResult.error;
    if (isAiMusicLifecycleSchemaMissing(error)) return heatByTrackId;
    throw error;
  }

  const trackIdByBattleId = new Map(acceptedInvites.map((row) => [row.battle_id, row.defender_track_id]));
  const eligibleBattleIds = new Set(
    ((battleResult.data ?? []) as RecentBattleRow[])
      .filter((row) => row.id && row.battle_type === AI_MUSIC_CHALLENGE_BATTLE_TYPE)
      .map((row) => row.id as string),
  );
  for (const archive of (archiveResult.data ?? []) as RecentArchiveRow[]) {
    const battleId = archive.battle_id ?? "";
    const trackId = trackIdByBattleId.get(battleId);
    const heat = trackId ? heatByTrackId.get(trackId) : null;
    const audienceCount = archiveAudienceCount(archive);
    if (!heat || !eligibleBattleIds.has(battleId) || !isOfficialDropBattleResult({ audienceCount, totalVotes: archive.total_votes })) continue;
    heat.officialAudienceVotes += audienceCount;
    heat.latestInteractionAt = latestIso(heat.latestInteractionAt, archive.archived_at);
  }

  return heatByTrackId;
}

export async function GET(request: Request) {
  try {
    const admin = adminClient();
    const url = new URL(request.url);
    const surface = url.searchParams.get("surface") === "showtime" ? "showtime" : "explore";
    const modern = await admin
      .from("listen_bar_tracks")
      .select(MODERN_SELECT)
      .eq("source", "community")
      .eq("is_active", true)
      .order("positive_reaction_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    let rows = (modern.data as ListenBarTrackRow[] | null) ?? [];
    let error = modern.error;

    if (error && isMissingTrackColumn(error)) {
      const legacy = await admin
        .from("listen_bar_tracks")
        .select(LEGACY_SELECT)
        .eq("source", "community")
        .eq("is_active", true)
        .order("positive_reaction_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      rows = (legacy.data as ListenBarTrackRow[] | null) ?? [];
      error = legacy.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const playableRows = applyLegacyOpeningGrace(rows).filter(isPublicPlayableTrack);
    const [lifecycleByTrackId, recentHeatByTrackId, affinityByTrackId] = await Promise.all([
      buildAiMusicSurfaceLifecycleMap(admin, playableRows),
      readRecentHeat(admin, playableRows.map((row) => row.id)),
      readEarwormAffinityMap(admin, playableRows.map((row) => row.id)),
    ]);
    const tracks = playableRows
      .map((row) => {
        const lifecycle = lifecycleByTrackId.get(row.id);
        const recentHeat = recentHeatByTrackId.get(row.id);
        const affinity = affinityByTrackId.get(row.id);
        const persistedShowtimeCertified = isAiMusicPersistedShowtimeCertified(row);
        const showtimeCertified = persistedShowtimeCertified || lifecycle?.isShowtimeCertified || false;
        return {
          ...row,
          ai_music_challenge_status: row.ai_music_challenge_status ?? "showcase",
          ai_music_showtime_certified: showtimeCertified,
          ai_music_explore_retired: lifecycle?.retiredFromExplore ?? false,
          ai_music_official_challenge_count: lifecycle?.officialChallengeCount ?? 0,
          ai_music_official_defense_successes: lifecycle?.officialDefenseSuccesses ?? 0,
          ai_music_showtime_defense_target: AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET,
          ai_music_showtime_defense_remaining: aiMusicShowtimeDefenseRemaining(lifecycle?.officialDefenseSuccesses ?? 0),
          ai_music_official_wins: lifecycle?.officialWins ?? 0,
          ai_music_official_losses: lifecycle?.officialLosses ?? 0,
          ai_music_official_audience_votes: lifecycle?.officialAudienceVotes ?? 0,
          ai_music_recent_heart_supporter_count: recentHeat?.heartSupporterIds.size ?? 0,
          ai_music_recent_official_audience_votes: recentHeat?.officialAudienceVotes ?? 0,
          ai_music_recent_interaction_at: recentHeat?.latestInteractionAt ?? null,
          earworm_affinity_sample_count: affinity?.sampleCount ?? 0,
          earworm_affinity_percent: affinity?.percent ?? null,
        };
      })
      .filter((row) => {
        if (surface === "showtime") return row.ai_music_showtime_certified;
        return !row.ai_music_showtime_certified && !row.ai_music_explore_retired;
      });

    return NextResponse.json({ tracks }, {
      headers: {
        "Cache-Control": "public, max-age=15, s-maxage=15, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    if (isAiMusicLifecycleSchemaMissing(error as { message?: string })) {
      return NextResponse.json({ error: "AI music lifecycle schema is not ready." }, { status: 409 });
    }
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
