import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ReactionKey = "heart" | "star" | "thumb" | "happy";

type ReactionCounts = Record<ReactionKey, number>;

type ReactionDatabase = {
  public: {
    Tables: {
      listen_bar_track_reactions: {
        Row: { track_id: string; user_id: string; vote_date: string; reaction: ReactionKey; created_at: string; updated_at: string };
        Insert: { track_id: string; user_id: string; vote_date: string; reaction: ReactionKey };
        Update: { reaction?: ReactionKey; updated_at?: string };
        Relationships: [];
      };
      listen_bar_tracks: {
        Row: { id: string };
        Insert: Record<string, never>;
        Update: {
          heart_count?: number;
          star_count?: number;
          thumb_count?: number;
          happy_count?: number;
          positive_reaction_count?: number;
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

type AdminClient = SupabaseClient<ReactionDatabase>;

const reactionKeys = new Set<ReactionKey>(["heart", "star", "thumb", "happy"]);

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

function countReactions(reactions: ReactionKey[]): ReactionCounts {
  const counts: ReactionCounts = { heart: 0, star: 0, thumb: 0, happy: 0 };
  for (const key of reactions) {
    if (reactionKeys.has(key)) counts[key] += 1;
  }
  return counts;
}

function taipeiVoteDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return now.toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing Supabase server configuration.", 500);
  }

  const body = (await request.json().catch(() => null)) as { trackId?: unknown; reaction?: unknown } | null;
  if (!isUuid(body?.trackId)) return jsonError("Invalid track id.");
  const reaction = typeof body?.reaction === "string" && reactionKeys.has(body.reaction as ReactionKey)
    ? (body.reaction as ReactionKey)
    : null;

  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入再投票；聽歌不需要登入。", 401);

  const admin: AdminClient = createClient<ReactionDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) return jsonError("登入狀態已過期，請重新登入後再投票。", 401);

  const voteDate = taipeiVoteDate();

  if (reaction) {
    const { error } = await admin.from("listen_bar_track_reactions").upsert(
      { track_id: body.trackId, user_id: user.id, vote_date: voteDate, reaction },
      { onConflict: "track_id,user_id,vote_date" },
    );
    if (error) return jsonError(error.message, 500);
  } else {
    const { error } = await admin
      .from("listen_bar_track_reactions")
      .delete()
      .eq("track_id", body.trackId)
      .eq("user_id", user.id)
      .eq("vote_date", voteDate);
    if (error) return jsonError(error.message, 500);
  }

  const { data: reactionRows, error: countError } = await admin
    .from("listen_bar_track_reactions")
    .select("reaction")
    .eq("track_id", body.trackId);
  if (countError) return jsonError(countError.message, 500);

  const counts = countReactions([
    ...((reactionRows ?? []).map((row) => row.reaction)),
  ]);
  const total = counts.heart + counts.star + counts.thumb + counts.happy;

  const { error: updateError } = await admin
    .from("listen_bar_tracks")
    .update({
      heart_count: counts.heart,
      star_count: counts.star,
      thumb_count: counts.thumb,
      happy_count: counts.happy,
      positive_reaction_count: total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.trackId);
  if (updateError) return jsonError(updateError.message, 500);

  return NextResponse.json({ ok: true, reaction, voteDate, counts, positiveReactionCount: total });
}
