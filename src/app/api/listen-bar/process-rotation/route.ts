import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  LISTEN_BAR_JUDGMENT_PROMOTION_LIMIT,
  LISTEN_BAR_PUBLIC_REACTION_THRESHOLD,
  LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
  LISTEN_BAR_PUBLIC_SURVIVAL_DAYS,
  LISTEN_BAR_TOTAL_ROTATION_LIMIT,
} from "@/lib/listen-bar";

type TrackForRotation = {
  id: string;
  positive_reaction_count: number | null;
  created_at: string | null;
  promoted_at?: string | null;
  bar_phase?: "challenger" | "public" | null;
};

export async function GET(request: NextRequest) {
  return processRotation(request);
}

export async function POST(request: NextRequest) {
  return processRotation(request);
}

async function processRotation(request: NextRequest) {
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
  const observationCutoff = new Date(now.getTime() - LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS * 60 * 60 * 1000).toISOString();
  const protectedPublicCutoff = observationCutoff;
  const survivalCutoff = new Date(now.getTime() - LISTEN_BAR_PUBLIC_SURVIVAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { count: activeCount, error: countError } = await admin
    .from("listen_bar_tracks")
    .select("id", { count: "exact", head: true })
    .eq("source", "community")
    .eq("is_active", true);

  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });

  const { count: publicCountBeforePromotion, error: publicCountBeforePromotionError } = await admin
    .from("listen_bar_tracks")
    .select("id", { count: "exact", head: true })
    .eq("source", "community")
    .eq("is_active", true)
    .eq("bar_phase", "public");

  if (publicCountBeforePromotionError) return NextResponse.json({ error: publicCountBeforePromotionError.message }, { status: 500 });

  const openingPublicSeats = Math.max(0, LISTEN_BAR_PUBLIC_ROTATION_LIMIT - (publicCountBeforePromotion ?? 0));
  const eligibleQuery = admin
    .from("listen_bar_tracks")
    .select("id, positive_reaction_count, created_at, bar_phase")
    .eq("source", "community")
    .eq("is_active", true)
    .eq("bar_phase", "challenger");
  const { data: eligibleChallengers, error: eligibleError } = openingPublicSeats > 0
    ? await eligibleQuery
      .order("created_at", { ascending: true })
      .limit(openingPublicSeats)
    : await eligibleQuery
      .lt("created_at", observationCutoff)
      .gte("positive_reaction_count", LISTEN_BAR_PUBLIC_REACTION_THRESHOLD)
      .order("positive_reaction_count", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(LISTEN_BAR_JUDGMENT_PROMOTION_LIMIT);

  if (eligibleError) return NextResponse.json({ error: eligibleError.message }, { status: 500 });

  const promotedIds = ((eligibleChallengers as TrackForRotation[] | null) ?? []).map((row) => row.id);
  if (promotedIds.length > 0) {
    const { error } = await admin
      .from("listen_bar_tracks")
      .update({ bar_phase: "public", review_status: "approved", promoted_at: now.toISOString(), updated_at: now.toISOString() })
      .in("id", promotedIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: completedRows, error: completedRowsError } = await admin
    .from("listen_bar_tracks")
    .select("id, promoted_at, created_at")
    .eq("source", "community")
    .eq("is_active", true)
    .eq("bar_phase", "public")
    .or(`promoted_at.lt.${survivalCutoff},and(promoted_at.is.null,created_at.lt.${survivalCutoff})`);

  if (completedRowsError) return NextResponse.json({ error: completedRowsError.message }, { status: 500 });

  const completedIds = ((completedRows as TrackForRotation[] | null) ?? []).map((row) => row.id);
  if (completedIds.length > 0) {
    const { error } = await admin
      .from("listen_bar_tracks")
      .update({ is_active: false, review_status: "completed", removed_at: now.toISOString(), updated_at: now.toISOString() })
      .in("id", completedIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: publicRows, error: publicRowsError } = await admin
    .from("listen_bar_tracks")
    .select("id, positive_reaction_count, created_at, promoted_at, bar_phase")
    .eq("source", "community")
    .eq("is_active", true)
    .eq("bar_phase", "public")
    .order("positive_reaction_count", { ascending: true })
    .order("created_at", { ascending: true });

  if (publicRowsError) return NextResponse.json({ error: publicRowsError.message }, { status: 500 });

  const publicOverflow = Math.max(0, ((publicRows as TrackForRotation[] | null) ?? []).length - LISTEN_BAR_PUBLIC_ROTATION_LIMIT);
  const removedPublicIds = ((publicRows as TrackForRotation[] | null) ?? [])
    .filter((row) => !row.promoted_at || row.promoted_at < protectedPublicCutoff)
    .slice(0, publicOverflow)
    .map((row) => row.id);

  if (removedPublicIds.length > 0) {
    const { error } = await admin
      .from("listen_bar_tracks")
      .update({ is_active: false, review_status: "removed", removed_at: now.toISOString(), updated_at: now.toISOString() })
      .in("id", removedPublicIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: activeRowsAfterPublicTrim, error: activeRowsAfterPublicTrimError } = await admin
    .from("listen_bar_tracks")
    .select("id, positive_reaction_count, created_at, promoted_at, bar_phase")
    .eq("source", "community")
    .eq("is_active", true)
    .order("bar_phase", { ascending: true })
    .order("positive_reaction_count", { ascending: true })
    .order("created_at", { ascending: true });

  if (activeRowsAfterPublicTrimError) return NextResponse.json({ error: activeRowsAfterPublicTrimError.message }, { status: 500 });

  const activeRows = (activeRowsAfterPublicTrim as TrackForRotation[] | null) ?? [];
  const totalOverflow = Math.max(0, activeRows.length - LISTEN_BAR_TOTAL_ROTATION_LIMIT);
  const overLimitIds = activeRows
    .filter((row) => row.bar_phase !== "public")
    .slice(0, totalOverflow)
    .map((row) => row.id);

  if (overLimitIds.length > 0) {
    const { error } = await admin
      .from("listen_bar_tracks")
      .update({ is_active: false, review_status: "removed", removed_at: now.toISOString(), updated_at: now.toISOString() })
      .in("id", overLimitIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    activeCommunity: activeCount ?? 0,
    promotedToPublic: promotedIds.length,
    completedMonthlySurvival: completedIds.length,
    removedFromPublic: removedPublicIds.length,
    removedOverTotalLimit: overLimitIds.length,
    openingPublicSeats,
    openingGraceMode: openingPublicSeats > 0,
    publicLimit: LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
    totalRotationLimit: LISTEN_BAR_TOTAL_ROTATION_LIMIT,
  });
}
