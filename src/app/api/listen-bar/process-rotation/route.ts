import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT,
  LISTEN_BAR_GENRE_POOL_LIMIT,
  LISTEN_BAR_PUBLIC_EVICTION_LIMIT,
  LISTEN_BAR_PROMOTION_PROTECTION_UNTIL,
  listenBarIsHonorEligible,
  listenBarPromotionProtectionActive,
  listenBarSurvivalStartedAt,
} from "@/lib/listen-bar";
import { buildListenBarRotationPreview, type ListenBarRotationTrack } from "@/lib/listen-bar-rotation";
import { isAiMusicPersistedShowtimeCertified } from "@/lib/ai-music-showtime";

const CAPACITY_EVICTION_NOTE = "36-song genre public pool capacity rotation eviction.";

type TrackForRotation = {
  id: string;
  title?: string | null;
  genre?: string | null;
  created_by?: string | null;
  positive_reaction_count: number | null;
  created_at: string | null;
  promoted_at?: string | null;
  bar_phase?: "challenger" | "public" | null;
  review_status?: string | null;
  hidden_at?: string | null;
  removed_at?: string | null;
  ai_music_showtime_certified?: boolean | null;
  ai_music_showtime_public_removed_at?: string | null;
};

const ROTATION_SELECT_LEGACY = "id,title,genre,created_by,positive_reaction_count,created_at,promoted_at,bar_phase,review_status,hidden_at,removed_at";
const ROTATION_SELECT = `${ROTATION_SELECT_LEGACY},ai_music_showtime_certified,ai_music_showtime_public_removed_at`;

function isMissingShowtimeColumn(error: { message?: string; code?: string } | null | undefined) {
  return /schema cache|column.*does not exist|PGRST204|ai_music_showtime/i.test(`${error?.message ?? ""} ${error?.code ?? ""}`);
}

type TrackRowsResult = {
  data: TrackForRotation[] | null;
  error: { message?: string; code?: string } | null;
};

async function readActiveCommunityRows(admin: SupabaseClient) {
  let result = await admin
    .from("listen_bar_tracks")
    .select(ROTATION_SELECT)
    .eq("source", "community")
    .eq("is_active", true) as TrackRowsResult;
  if (result.error && isMissingShowtimeColumn(result.error)) {
    result = await admin
      .from("listen_bar_tracks")
      .select(ROTATION_SELECT_LEGACY)
      .eq("source", "community")
      .eq("is_active", true) as TrackRowsResult;
  }
  if (result.error) throw result.error;
  return ((result.data ?? []).filter(isVisibleActiveTrack));
}

export async function GET(request: NextRequest) {
  return processRotationPreview(request);
}

export async function POST(request: NextRequest) {
  return processRotation(request);
}

async function processRotation(request: NextRequest) {
  if (process.env.LISTEN_BAR_ROTATION_ENABLED !== "true") {
    return NextResponse.json({
      disabled: true,
      message: "Listen bar rotation is disabled. Set LISTEN_BAR_ROTATION_ENABLED=true to run it.",
    });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : request.nextUrl.searchParams.get("secret");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase admin environment variables" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const promotionProtectionActive = listenBarPromotionProtectionActive(now.getTime());
  const observationCutoff = new Date(now.getTime() - LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS * 60 * 60 * 1000).toISOString();

  let activeRows: TrackForRotation[];
  try {
    activeRows = await readActiveCommunityRows(admin);
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }

  const eligibleChallengers = activeRows
    .filter((row) => row.bar_phase === "challenger")
    .filter((row) => promotionProtectionActive || new Date(row.created_at ?? 0).getTime() < new Date(observationCutoff).getTime())
    .sort((left, right) => createdAtMs(left) - createdAtMs(right));
  const publicRowsBeforePromotion = activeRows
    .filter((row) => row.bar_phase === "public")
    .sort((left, right) => reactionCount(left) - reactionCount(right) || createdAtMs(left) - createdAtMs(right));

  const promotedIds = promotionCandidatesWithinCreatorGenreLimit(
    eligibleChallengers,
    publicRowsBeforePromotion,
  ).map((row) => row.id);
  if (promotedIds.length > 0) {
    const { error } = await admin
      .from("listen_bar_tracks")
      .update({ bar_phase: "public", review_status: "approved", promoted_at: now.toISOString(), updated_at: now.toISOString() })
      .in("id", promotedIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    activeRows = await readActiveCommunityRows(admin);
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
  const publicRows = activeRows
    .filter((row) => row.bar_phase === "public")
    .sort((left, right) => reactionCount(left) - reactionCount(right) || createdAtMs(left) - createdAtMs(right));

  const overflowCandidates = genreOverflowRemovalCandidates(publicRows, now.getTime());
  const publicOverflow = overflowCandidates.length;
  const removedPublicIds = promotionProtectionActive
    ? []
    : overflowCandidates
      .slice(0, LISTEN_BAR_PUBLIC_EVICTION_LIMIT)
      .map((row) => row.id);

  if (removedPublicIds.length > 0) {
    const { error } = await admin
      .from("listen_bar_tracks")
      .update({
        is_active: false,
        review_status: "removed",
        removed_at: now.toISOString(),
        moderation_note: CAPACITY_EVICTION_NOTE,
        updated_at: now.toISOString(),
      })
      .in("id", removedPublicIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    activeCommunity: activeRows.length,
    promotedToPublic: promotedIds.length,
    completedMonthlySurvival: 0,
    removedFromPublic: removedPublicIds.length,
    removedOverTotalLimit: 0,
    publicEvictionLimit: LISTEN_BAR_PUBLIC_EVICTION_LIMIT,
    promotionProtectionActive,
    evictionPausedUntil: LISTEN_BAR_PROMOTION_PROTECTION_UNTIL,
    publicPoolAtLimit: publicOverflow > 0,
    publicLimit: LISTEN_BAR_GENRE_POOL_LIMIT,
    genrePoolLimit: LISTEN_BAR_GENRE_POOL_LIMIT,
  });
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase admin environment variables");
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requestHasCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : request.nextUrl.searchParams.get("secret");
  return token === cronSecret;
}

function isVisibleActiveTrack(row: TrackForRotation) {
  const status = row.review_status?.toLowerCase();
  return (
    status !== "hidden" &&
    status !== "removed" &&
    status !== "completed" &&
    status !== "rejected" &&
    !row.hidden_at &&
    !row.removed_at &&
    !isAiMusicPersistedShowtimeCertified(row)
  );
}

function toRotationTrack(row: TrackForRotation): ListenBarRotationTrack {
  return {
    id: row.id,
    title: row.title,
    genre: row.genre,
    createdBy: row.created_by,
    barPhase: row.bar_phase === "public" ? "public" : "challenger",
    positiveReactionCount: row.positive_reaction_count,
    createdAt: row.created_at,
    promotedAt: row.promoted_at,
  };
}

function genreKey(row: TrackForRotation) {
  return row.genre?.trim() || "Original 自我風格";
}

function creatorGenreKey(row: TrackForRotation) {
  const creator = row.created_by?.trim();
  if (!creator) return null;
  return `${creator}\u001f${genreKey(row)}`;
}

function promotionCandidatesWithinCreatorGenreLimit(challengers: TrackForRotation[], publicRows: TrackForRotation[]) {
  const publicCounts = new Map<string, number>();
  publicRows.forEach((row) => {
    const key = creatorGenreKey(row);
    if (key) publicCounts.set(key, (publicCounts.get(key) ?? 0) + 1);
  });

  return challengers.filter((row) => {
    const key = creatorGenreKey(row);
    if (!key) return true;
    const count = publicCounts.get(key) ?? 0;
    if (count >= LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT) return false;
    publicCounts.set(key, count + 1);
    return true;
  });
}

function reactionCount(row: TrackForRotation) {
  return Math.max(0, Math.round(row.positive_reaction_count ?? 0));
}

function createdAtMs(row: TrackForRotation) {
  const value = new Date(row.created_at ?? 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function genreOverflowRemovalCandidates(rows: TrackForRotation[], nowMs: number) {
  const groups = new Map<string, TrackForRotation[]>();
  for (const row of rows) {
    const key = genreKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return Array.from(groups.entries()).flatMap(([genre, group]) => {
    const overflow = Math.max(0, group.length - LISTEN_BAR_GENRE_POOL_LIMIT);
    if (overflow === 0) return [];
    const survivalStartedAt = listenBarSurvivalStartedAt(group.map((track) => ({
      barPhase: track.bar_phase === "public" ? "public" : "challenger",
      genre: track.genre,
      promotedAt: track.promoted_at,
      createdAt: track.created_at,
    })), LISTEN_BAR_GENRE_POOL_LIMIT, genre);
    return [...group]
      .filter((track) => !listenBarIsHonorEligible({
        positiveReactionCount: track.positive_reaction_count,
        promotedAt: track.promoted_at,
        createdAt: track.created_at,
      }, nowMs, survivalStartedAt))
      .sort((left, right) => {
        const byReaction = reactionCount(left) - reactionCount(right);
        if (byReaction !== 0) return byReaction;
        return createdAtMs(left) - createdAtMs(right);
      })
      .slice(0, overflow);
  });
}

function redactPreviewTracks(tracks: ListenBarRotationTrack[], detailed: boolean) {
  if (detailed) return tracks;
  return tracks.map((track) => ({ id: track.id }));
}

async function processRotationPreview(request: NextRequest) {
  try {
    const admin = adminClient();
    const detailed = requestHasCronSecret(request);
    const data = await readActiveCommunityRows(admin);
    const rows = data.map(toRotationTrack);
    const preview = buildListenBarRotationPreview(rows);
    return NextResponse.json(
      {
        dryRun: true,
        enabledForMutation: process.env.LISTEN_BAR_ROTATION_ENABLED === "true",
        activeCommunity: preview.activeCommunity,
        activePublic: preview.activePublic,
        activeChallenger: preview.activeChallenger,
        eligibleChallengerCount: preview.eligibleChallengerCount,
        projectedPublicCount: preview.projectedPublicCount,
        publicOverflow: preview.publicOverflow,
        publicEvictionLimit: preview.evictionLimit,
        genrePoolLimit: LISTEN_BAR_GENRE_POOL_LIMIT,
        promotionProtectionActive: preview.evictionPaused,
        evictionPausedUntil: preview.evictionPausedUntil,
        wouldPromoteCount: preview.wouldPromote.length,
        wouldRemoveCount: preview.wouldRemove.length,
        wouldPromote: redactPreviewTracks(preview.wouldPromote, detailed),
        wouldRemove: redactPreviewTracks(preview.wouldRemove, detailed),
        message: preview.evictionPaused
          ? "Dry-run only. Bar Heartbreak capacity eviction is paused."
          : "Dry-run only. POST mutates only when LISTEN_BAR_ROTATION_ENABLED=true.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
