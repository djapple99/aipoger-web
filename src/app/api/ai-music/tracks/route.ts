import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET,
  aiMusicShowtimeDefenseRemaining,
} from "@/lib/ai-music-challenge-rules";
import { buildAiMusicSurfaceLifecycleMap, isAiMusicLifecycleSchemaMissing } from "@/lib/ai-music-surface-lifecycle";
import {
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  listenBarPromotionProtectionActive,
  type ListenBarTrackRow,
} from "@/lib/listen-bar";

type AdminClient = SupabaseClient;

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
  "updated_at",
  "promoted_at",
  "created_by",
  "ai_music_challenge_status",
  "ai_music_defender_drop_audio_path",
  "ai_music_defender_drop_prepared_at",
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
  "updated_at",
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
  return /schema cache|column.*does not exist|PGRST204|ai_music_challenge|defender_drop|description|youtube_url/i.test(text);
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
  return (
    row.is_active !== false &&
    status !== "hidden" &&
    status !== "removed" &&
    !row.hidden_at &&
    !row.removed_at &&
    Boolean(row.audio_path?.trim()) &&
    row.source !== "official" &&
    !row.is_featured_official
  );
}

export async function GET() {
  try {
    const admin = adminClient();
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
    const lifecycleByTrackId = await buildAiMusicSurfaceLifecycleMap(admin, playableRows);
    const tracks = playableRows
      .map((row) => {
        const lifecycle = lifecycleByTrackId.get(row.id);
        return {
          ...row,
          ai_music_challenge_status: row.ai_music_challenge_status ?? "showcase",
          ai_music_showtime_certified: lifecycle?.isShowtimeCertified ?? false,
          ai_music_explore_retired: lifecycle?.retiredFromExplore ?? false,
          ai_music_official_challenge_count: lifecycle?.officialChallengeCount ?? 0,
          ai_music_official_defense_successes: lifecycle?.officialDefenseSuccesses ?? 0,
          ai_music_showtime_defense_target: AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET,
          ai_music_showtime_defense_remaining: aiMusicShowtimeDefenseRemaining(lifecycle?.officialDefenseSuccesses ?? 0),
          ai_music_official_wins: lifecycle?.officialWins ?? 0,
          ai_music_official_losses: lifecycle?.officialLosses ?? 0,
          ai_music_official_audience_votes: lifecycle?.officialAudienceVotes ?? 0,
        };
      })
      .filter((row) => !row.ai_music_explore_retired);

    return NextResponse.json({ tracks }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (isAiMusicLifecycleSchemaMissing(error as { message?: string })) {
      return NextResponse.json({ error: "AI music lifecycle schema is not ready." }, { status: 409 });
    }
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
