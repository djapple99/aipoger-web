import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  LISTEN_BAR_PUBLIC_REACTION_THRESHOLD,
  LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
} from "@/lib/listen-bar";

type ListenBarTrackRow = {
  id: string;
  title: string | null;
  artist?: string | null;
  ai_tool?: string | null;
  genre?: string | null;
  mood?: string | null;
  description?: string | null;
  lyrics?: string | null;
  duration_seconds?: number | null;
  created_by: string | null;
  source?: "official" | "community" | null;
  bar_phase?: "challenger" | "public" | null;
  is_active: boolean | null;
  heart_count?: number | null;
  star_count?: number | null;
  thumb_count?: number | null;
  happy_count?: number | null;
  positive_reaction_count?: number | null;
  created_at?: string | null;
  promoted_at?: string | null;
};

type ListenBarMyTracksDatabase = {
  public: {
    Tables: {
      listen_bar_tracks: {
        Row: ListenBarTrackRow;
        Insert: Record<string, never>;
        Update: Partial<ListenBarTrackRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AdminClient = SupabaseClient<ListenBarMyTracksDatabase>;

const MODERN_SELECT = "id,title,artist,ai_tool,genre,mood,description,lyrics,duration_seconds,created_by,source,bar_phase,is_active,heart_count,star_count,thumb_count,happy_count,positive_reaction_count,created_at,promoted_at";
const LEGACY_SELECT = "id,title,artist,ai_tool,genre,mood,lyrics,duration_seconds,created_by,source,is_active,heart_count,star_count,thumb_count,happy_count,positive_reaction_count,created_at";

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<ListenBarMyTracksDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingColumnError(error: unknown): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /schema cache|column.*does not exist|PGRST204|bar_phase|promoted_at|description/i.test(text);
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, maxLength);
  return clean || null;
}

function applyLegacyOpeningGrace(rows: ListenBarTrackRow[], openingGraceMode: boolean): ListenBarTrackRow[] {
  if (openingGraceMode) {
    return rows.map((row) => ({
      ...row,
      bar_phase: "public",
      promoted_at: row.promoted_at ?? row.created_at,
    }));
  }

  const hasPersistedPhase = rows.some((row) => Object.prototype.hasOwnProperty.call(row, "bar_phase"));
  if (hasPersistedPhase) return rows;

  const observationCutoffMs = Date.now() - LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS * 60 * 60 * 1000;
  return rows.map((row) => {
    const createdAtMs = new Date(row.created_at ?? 0).getTime();
    const shouldBePublic = Number.isFinite(createdAtMs)
      && createdAtMs < observationCutoffMs
      && (row.positive_reaction_count ?? 0) >= LISTEN_BAR_PUBLIC_REACTION_THRESHOLD;
    return {
      ...row,
      bar_phase: shouldBePublic ? "public" : "challenger",
      promoted_at: shouldBePublic ? (row.promoted_at ?? row.created_at) : row.promoted_at,
    };
  });
}

export async function GET(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "請先登入後再查看自己的歌曲。" }, { status: 401 });

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "登入狀態已過期，請重新登入。" }, { status: 401 });

    const { count: activeCommunityCount, error: activeCommunityError } = await admin
      .from("listen_bar_tracks")
      .select("id", { count: "exact", head: true })
      .eq("source", "community")
      .eq("is_active", true);
    if (activeCommunityError) return NextResponse.json({ error: activeCommunityError.message }, { status: 500 });

    const modernResult = await admin
      .from("listen_bar_tracks")
      .select(MODERN_SELECT)
      .eq("created_by", userData.user.id)
      .eq("source", "community")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    let rows = (modernResult.data as ListenBarTrackRow[] | null) ?? null;
    let error = modernResult.error;

    if (error && isMissingColumnError(error)) {
      const legacyResult = await admin
        .from("listen_bar_tracks")
        .select(LEGACY_SELECT)
        .eq("created_by", userData.user.id)
        .eq("source", "community")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      rows = (legacyResult.data as ListenBarTrackRow[] | null) ?? null;
      error = legacyResult.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tracks = applyLegacyOpeningGrace(rows ?? [], (activeCommunityCount ?? 0) <= LISTEN_BAR_PUBLIC_ROTATION_LIMIT);
    const challengerCount = tracks.filter((track) => track.bar_phase !== "public").length;
    return NextResponse.json({ activeTrackCount: tracks.length, challengerCount, tracks });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "請先登入後再補歌曲資料。" }, { status: 401 });

  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const trackId = cleanText(body?.trackId, 80);
    if (!trackId) return NextResponse.json({ error: "缺少歌曲 ID。" }, { status: 400 });

    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "登入狀態已過期，請重新登入。" }, { status: 401 });

    const patch = {
      ai_tool: cleanText(body?.aiTool, 40) ?? "AI Music",
      genre: cleanText(body?.genre, 40) ?? "自我風格",
      mood: cleanText(body?.album, 80),
      description: cleanText(body?.description, 120),
    };

    let updateResult = await admin
      .from("listen_bar_tracks")
      .update(patch)
      .eq("id", trackId)
      .eq("created_by", userData.user.id)
      .eq("source", "community")
      .eq("is_active", true)
      .select(MODERN_SELECT)
      .maybeSingle();

    if (updateResult.error && isMissingColumnError(updateResult.error)) {
      const fallbackPatch = { ...patch };
      delete (fallbackPatch as Partial<typeof patch>).description;
      updateResult = await admin
        .from("listen_bar_tracks")
        .update(fallbackPatch)
        .eq("id", trackId)
        .eq("created_by", userData.user.id)
        .eq("source", "community")
        .eq("is_active", true)
        .select(LEGACY_SELECT)
        .maybeSingle();
    }

    if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    if (!updateResult.data) return NextResponse.json({ error: "找不到可修改的歌曲。" }, { status: 404 });

    return NextResponse.json({ track: updateResult.data });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
