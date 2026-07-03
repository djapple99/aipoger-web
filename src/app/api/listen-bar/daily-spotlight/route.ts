import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import { normalizeSpotlightDate } from "@/lib/daily-spotlight";

type ListenBarTrackRow = {
  id: string;
  title: string | null;
  artist: string | null;
  ai_tool: string | null;
  genre: string | null;
  mood: string | null;
  description?: string | null;
  bpm: number | null;
  duration_seconds: number | null;
  audio_path: string | null;
  cover_path: string | null;
  lyrics: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  review_status?: string | null;
  hidden_at?: string | null;
  removed_at?: string | null;
  source?: "official" | "community" | null;
  is_featured_official?: boolean | null;
  bar_phase?: "challenger" | "public" | null;
  positive_reaction_count?: number | null;
  heart_count?: number | null;
  star_count?: number | null;
  thumb_count?: number | null;
  happy_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  promoted_at?: string | null;
};

type DailySpotlightRow = {
  id: string;
  spotlight_date: string;
  track_id: string;
  headline: string | null;
  intro: string | null;
  caption: string | null;
  media_path: string | null;
  media_type: string | null;
  is_active: boolean | null;
  created_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DailySpotlightDatabase = {
  public: {
    Tables: {
      listen_bar_daily_spotlights: {
        Row: DailySpotlightRow;
        Insert: Partial<DailySpotlightRow>;
        Update: Partial<DailySpotlightRow>;
        Relationships: [];
      };
      listen_bar_tracks: {
        Row: ListenBarTrackRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AdminClient = SupabaseClient<DailySpotlightDatabase>;

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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<DailySpotlightDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function isMissingSpotlightTable(error: unknown) {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /listen_bar_daily_spotlights|relation.*does not exist|schema cache|42P01|PGRST204/i.test(text);
}

function isTrackPlayable(row: ListenBarTrackRow | null) {
  if (!row) return false;
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

async function requireOwnerAdmin(request: NextRequest, admin: AdminClient) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401) };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { userId: data.user.id };
}

async function loadSpotlight(admin: AdminClient, spotlightDate: string) {
  const spotlight = await admin
    .from("listen_bar_daily_spotlights")
    .select("id,spotlight_date,track_id,headline,intro,caption,media_path,media_type,is_active,created_at,updated_at")
    .eq("spotlight_date", spotlightDate)
    .eq("is_active", true)
    .maybeSingle<DailySpotlightRow>();

  if (spotlight.error) {
    if (isMissingSpotlightTable(spotlight.error)) return { missingTable: true, spotlight: null, track: null };
    throw spotlight.error;
  }
  if (!spotlight.data) return { missingTable: false, spotlight: null, track: null };

  const track = await admin
    .from("listen_bar_tracks")
    .select(TRACK_SELECT)
    .eq("id", spotlight.data.track_id)
    .maybeSingle<ListenBarTrackRow>();
  if (track.error) throw track.error;

  return {
    missingTable: false,
    spotlight: spotlight.data,
    track: isTrackPlayable(track.data) ? track.data : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const admin = adminClient();
    const spotlightDate = normalizeSpotlightDate(request.nextUrl.searchParams.get("date"));
    const result = await loadSpotlight(admin, spotlightDate);
    return NextResponse.json(
      {
        date: spotlightDate,
        missingTable: result.missingTable,
        spotlight: result.spotlight,
        track: result.track,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = adminClient();
    const guard = await requireOwnerAdmin(request, admin);
    if (guard.error) return guard.error;

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("每日推薦格式不正確。", 400);
    const spotlightDate = normalizeSpotlightDate(cleanText(body.date, 20));
    const trackId = cleanText(body.trackId, 80);
    if (!trackId) return jsonError("請選擇推薦歌曲。", 400);

    const track = await admin
      .from("listen_bar_tracks")
      .select(TRACK_SELECT)
      .eq("id", trackId)
      .maybeSingle<ListenBarTrackRow>();
    if (track.error) throw track.error;
    if (!isTrackPlayable(track.data)) return jsonError("這首歌目前不是可公開播放的傷心酒吧歌曲。", 400);

    const payload = {
      spotlight_date: spotlightDate,
      track_id: trackId,
      headline: cleanText(body.headline, 120),
      intro: cleanText(body.intro, 500),
      caption: cleanText(body.caption, 1200),
      is_active: body.isActive === false ? false : true,
      created_by: guard.userId,
      updated_at: new Date().toISOString(),
    };

    const saved = await admin
      .from("listen_bar_daily_spotlights")
      .upsert(payload, { onConflict: "spotlight_date" })
      .select("id,spotlight_date,track_id,headline,intro,caption,media_path,media_type,is_active,created_at,updated_at")
      .maybeSingle<DailySpotlightRow>();

    if (saved.error) {
      if (isMissingSpotlightTable(saved.error)) return jsonError("尚未建立每日推薦歌資料表，請先套用 supabase/20260702_listen_bar_daily_spotlight.sql。", 409);
      throw saved.error;
    }

    return NextResponse.json({ ok: true, spotlight: saved.data, track: track.data });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
