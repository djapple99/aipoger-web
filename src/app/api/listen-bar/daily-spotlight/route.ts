import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ListenBarTrackRow } from "@/lib/listen-bar";

type SpotlightRow = {
  id: string;
  spotlight_date: string;
  track_id: string;
  title: string;
  intro: string | null;
  short_caption: string | null;
  status: "draft" | "active" | "archived";
  created_at: string | null;
  updated_at: string | null;
};

const TRACK_SELECT = [
  "id",
  "title",
  "artist",
  "ai_tool",
  "genre",
  "mood",
  "description",
  "bpm",
  "duration_seconds",
  "audio_path",
  "cover_path",
  "audio_sha256",
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
].join(",");

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function taipeiDateString(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : now.toISOString().slice(0, 10);
}

function isPlayable(row: ListenBarTrackRow | null | undefined) {
  const reviewStatus = row?.review_status?.toLowerCase();
  return Boolean(
    row?.id &&
    row.is_active !== false &&
    reviewStatus !== "hidden" &&
    reviewStatus !== "removed" &&
    !row.hidden_at &&
    !row.removed_at &&
    row.audio_path?.trim(),
  );
}

export async function GET(request: NextRequest) {
  try {
    const admin = adminClient();
    const searchParams = request.nextUrl.searchParams;
    const requestedDate = searchParams.get("date")?.trim();
    const spotlightDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : taipeiDateString();

    const { data: spotlight, error: spotlightError } = await admin
      .from("listen_bar_daily_spotlights")
      .select("id,spotlight_date,track_id,title,intro,short_caption,status,created_at,updated_at")
      .eq("spotlight_date", spotlightDate)
      .eq("status", "active")
      .maybeSingle<SpotlightRow>();

    if (spotlightError) throw spotlightError;
    if (!spotlight) {
      return NextResponse.json(
        { spotlight: null, track: null, date: spotlightDate },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const { data: track, error: trackError } = await admin
      .from("listen_bar_tracks")
      .select(TRACK_SELECT)
      .eq("id", spotlight.track_id)
      .maybeSingle<ListenBarTrackRow>();

    if (trackError) throw trackError;
    if (!isPlayable(track)) {
      return NextResponse.json(
        { spotlight, track: null, date: spotlightDate },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return NextResponse.json(
      { spotlight, track, date: spotlightDate },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
