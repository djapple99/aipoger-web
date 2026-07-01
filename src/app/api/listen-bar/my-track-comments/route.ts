import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ListenBarTrackRow = {
  id: string;
  title?: string | null;
  created_by?: string | null;
  source?: string | null;
};

type ListenBarTrackCommentRow = {
  id: string;
  track_id: string;
  user_id: string | null;
  display_name: string;
  body: string;
  created_at: string;
  updated_at?: string | null;
};

type MyTrackCommentsDatabase = {
  public: {
    Tables: {
      listen_bar_tracks: {
        Row: ListenBarTrackRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      listen_bar_track_comments: {
        Row: ListenBarTrackCommentRow;
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

type AdminClient = SupabaseClient<MyTrackCommentsDatabase>;

const MAX_CREATOR_TRACKS = 200;
const MAX_RECENT_COMMENTS_PER_TRACK = 3;

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<MyTrackCommentsDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingTrackCommentsTable(error: unknown): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /listen_bar_track_comments|schema cache|relation.*does not exist|Could not find the table|PGRST205/i.test(text);
}

export async function GET(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "請先登入後再查看自己的歌曲留言。" }, { status: 401 });

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "登入狀態已過期，請重新登入。" }, { status: 401 });

    const { data: tracks, error: tracksError } = await admin
      .from("listen_bar_tracks")
      .select("id,title,created_by")
      .eq("created_by", userData.user.id)
      .eq("source", "community")
      .limit(MAX_CREATOR_TRACKS);

    if (tracksError) return NextResponse.json({ error: tracksError.message }, { status: 500 });

    const trackIds = ((tracks as ListenBarTrackRow[] | null) ?? [])
      .map((track) => track.id)
      .filter(Boolean);
    if (trackIds.length === 0) {
      return NextResponse.json({ commentsByTrackId: {} }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: comments, error: commentsError } = await admin
      .from("listen_bar_track_comments")
      .select("id,track_id,user_id,display_name,body,created_at,updated_at")
      .in("track_id", trackIds)
      .order("created_at", { ascending: false });

    if (commentsError) {
      if (isMissingTrackCommentsTable(commentsError)) {
        return NextResponse.json({ commentsByTrackId: {} }, { headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json({ error: commentsError.message }, { status: 500 });
    }

    const commentsByTrackId: Record<string, {
      count: number;
      latestComments: Array<{
        id: string;
        name: string;
        text: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }> = {};

    for (const row of ((comments as ListenBarTrackCommentRow[] | null) ?? [])) {
      if (row.user_id === userData.user.id) continue;
      const summary = commentsByTrackId[row.track_id] ?? { count: 0, latestComments: [] };
      summary.count += 1;
      if (summary.latestComments.length < MAX_RECENT_COMMENTS_PER_TRACK) {
        summary.latestComments.push({
          id: row.id,
          name: row.display_name,
          text: row.body,
          createdAt: row.created_at,
          updatedAt: row.updated_at ?? row.created_at,
        });
      }
      commentsByTrackId[row.track_id] = summary;
    }

    return NextResponse.json({ commentsByTrackId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
