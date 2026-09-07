import { isPublicBarAirplayTrack } from "@/lib/listen-bar-airplay";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS } from "@/lib/ai-music-showtime";
import { readEarwormAffinityMap } from "@/lib/earworm-affinity";

type ListenBarTrackRow = {
  id: string;
  title: string | null;
  artist: string | null;
  ai_tool: string | null;
  genre: string | null;
  mood: string | null;
  description?: string | null;
  youtube_url?: string | null;
  bpm: number | null;
  duration_seconds: number | null;
  audio_path: string | null;
  cover_path: string | null;
  audio_sha256?: string | null;
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
  ai_music_showtime_certified?: boolean | null;
  ai_music_showtime_public_removed_at?: string | null;
  support_url?: string | null;
  support_url_status?: string | null;
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
  "youtube_url",
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
  AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS,
].join(",");

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<ListenBarTracksDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  try {
    const admin = adminClient();
    const rows: ListenBarTrackRow[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const result = await admin.from("listen_bar_tracks").select(MODERN_SELECT)
        .eq("source", "community").eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }).order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
      const page = (result.data ?? []) as unknown as ListenBarTrackRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }

    const playableRows = (rows ?? []).filter(isPublicBarAirplayTrack).map((row) => ({ ...row, bar_phase: "public" as const }));
    const affinityByTrackId = new Map<string, { sampleCount: number; percent: number | null }>();
    for (let offset = 0; offset < playableRows.length; offset += 200) {
      const batch = await readEarwormAffinityMap(admin as unknown as SupabaseClient,
        playableRows.slice(offset, offset + 200).map((row) => row.id));
      for (const [id, metric] of batch) affinityByTrackId.set(id, metric);
    }
    const tracks = playableRows.map((row) => {
      const affinity = affinityByTrackId.get(row.id);
      return {
        ...row,
        earworm_affinity_sample_count: affinity?.sampleCount ?? 0,
        earworm_affinity_percent: affinity?.percent ?? null,
      };
    });

    return NextResponse.json(
      { tracks },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
