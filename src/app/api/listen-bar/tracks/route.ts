import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  LISTEN_BAR_PUBLIC_REACTION_THRESHOLD,
  LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
} from "@/lib/listen-bar";

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
  audio_sha256?: string | null;
  lyrics: string | null;
  sort_order: number | null;
  is_active: boolean | null;
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

type ListenBarTracksDatabase = {
  public: {
    Tables: {
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

type AdminClient = SupabaseClient<ListenBarTracksDatabase>;

const MODERN_SELECT = [
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

const LEGACY_SELECT = [
  "id",
  "title",
  "artist",
  "ai_tool",
  "genre",
  "mood",
  "bpm",
  "duration_seconds",
  "audio_path",
  "cover_path",
  "lyrics",
  "sort_order",
  "is_active",
  "source",
  "is_featured_official",
  "positive_reaction_count",
  "heart_count",
  "star_count",
  "thumb_count",
  "happy_count",
  "created_at",
  "updated_at",
].join(",");

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<ListenBarTracksDatabase>(supabaseUrl, serviceKey, {
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
  return /schema cache|column.*does not exist|PGRST204|bar_phase|promoted_at|audio_sha256|description/i.test(text);
}

function applyLegacyOpeningGrace(rows: ListenBarTrackRow[]): ListenBarTrackRow[] {
  if (rows.length <= LISTEN_BAR_PUBLIC_ROTATION_LIMIT) {
    return rows.map((row) => ({
      ...row,
      bar_phase: "public",
      promoted_at: row.promoted_at ?? row.created_at,
    }));
  }

  const hasPersistedPhase = rows.some((row) => Object.prototype.hasOwnProperty.call(row, "bar_phase"));
  if (hasPersistedPhase) return rows;

  const observationCutoffMs = Date.now() - LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS * 60 * 60 * 1000;
  const eligiblePublicIds = new Set(
    rows
      .filter((row) => {
        const createdAtMs = new Date(row.created_at ?? 0).getTime();
        return Number.isFinite(createdAtMs)
          && createdAtMs < observationCutoffMs
          && (row.positive_reaction_count ?? 0) >= LISTEN_BAR_PUBLIC_REACTION_THRESHOLD;
      })
      .sort((a, b) => {
        const positiveDiff = (b.positive_reaction_count ?? 0) - (a.positive_reaction_count ?? 0);
        if (positiveDiff !== 0) return positiveDiff;
        return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      })
      .slice(0, LISTEN_BAR_PUBLIC_ROTATION_LIMIT)
      .map((row) => row.id),
  );

  return rows.map((row) => ({
    ...row,
    bar_phase: eligiblePublicIds.has(row.id) ? "public" : "challenger",
    promoted_at: eligiblePublicIds.has(row.id) ? (row.promoted_at ?? row.created_at) : row.promoted_at,
  }));
}

export async function GET() {
  try {
    const admin = adminClient();
    const modernResult = await admin
      .from("listen_bar_tracks")
      .select(MODERN_SELECT)
      .eq("source", "community")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    let rows = (modernResult.data as ListenBarTrackRow[] | null) ?? null;
    let error = modernResult.error;

    if (error && isMissingColumnError(error)) {
      const legacyResult = await admin
        .from("listen_bar_tracks")
        .select(LEGACY_SELECT)
        .eq("source", "community")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      rows = (legacyResult.data as ListenBarTrackRow[] | null) ?? null;
      error = legacyResult.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tracks: applyLegacyOpeningGrace(rows ?? []) });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
