import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ListenBarRemoveTrackDatabase = {
  public: {
    Tables: {
      listen_bar_tracks: {
        Row: {
          id: string;
          title: string | null;
          created_by: string | null;
          source: "official" | "community" | null;
          bar_phase?: "challenger" | "public" | null;
          is_active: boolean | null;
        };
        Insert: Record<string, never>;
        Update: {
          is_active?: boolean;
          review_status?: "removed";
          removed_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AdminClient = SupabaseClient<ListenBarRemoveTrackDatabase>;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  return /schema cache|column.*does not exist|PGRST204|bar_phase|review_status|removed_at/i.test(text);
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<ListenBarRemoveTrackDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入後再撤下歌曲。", 401);

  const body = (await request.json().catch(() => null)) as { trackId?: unknown } | null;
  if (!isUuid(body?.trackId)) return jsonError("Invalid track id.");

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError("登入狀態已過期，請重新登入。", 401);

    let trackResult = await admin
      .from("listen_bar_tracks")
      .select("id,title,created_by,source,bar_phase,is_active")
      .eq("id", body.trackId)
      .maybeSingle();

    if (trackResult.error && isMissingColumnError(trackResult.error)) {
      trackResult = await admin
        .from("listen_bar_tracks")
        .select("id,title,created_by,source,is_active")
        .eq("id", body.trackId)
        .maybeSingle();
    }

    const { data: track, error: trackError } = trackResult;
    if (trackError) return jsonError(trackError.message, 500);
    if (!track || track.source !== "community" || !track.is_active) return jsonError("Track not found.", 404);
    if (track.created_by !== userData.user.id) return jsonError("只能撤下自己的歌曲。", 403);

    const now = new Date().toISOString();
    let updateResult = await admin
      .from("listen_bar_tracks")
      .update({
        is_active: false,
        review_status: "removed",
        removed_at: now,
        updated_at: now,
      })
      .eq("id", track.id);

    if (updateResult.error && isMissingColumnError(updateResult.error)) {
      updateResult = await admin
        .from("listen_bar_tracks")
        .update({
          is_active: false,
          updated_at: now,
        })
        .eq("id", track.id);
    }

    if (updateResult.error) return jsonError(updateResult.error.message, 500);

    return NextResponse.json({
      ok: true,
      track: {
        id: track.id,
        title: track.title,
        barPhase: track.bar_phase ?? "challenger",
      },
    });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
