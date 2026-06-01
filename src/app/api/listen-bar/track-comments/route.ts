import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type StoredTrackComment = {
  id: string;
  trackId: string;
  name: string;
  text: string;
  createdAt: string;
};

type TrackCommentDatabase = {
  public: {
    Tables: {
      listen_bar_tracks: {
        Row: { id: string };
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

type AdminClient = SupabaseClient<TrackCommentDatabase>;

const DATA_BUCKET = "listen-bar-data";
const COMMENT_LIMIT_PER_TRACK = 500;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function storagePath(trackId: string) {
  return `track-comments/${trackId}.json`;
}

async function ensureDataBucket(admin: AdminClient) {
  const { data } = await admin.storage.getBucket(DATA_BUCKET);
  if (data) return;
  await admin.storage.createBucket(DATA_BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024,
    allowedMimeTypes: ["application/json"],
  });
}

async function readComments(admin: AdminClient, trackId: string): Promise<StoredTrackComment[]> {
  await ensureDataBucket(admin);
  const { data, error } = await admin.storage.from(DATA_BUCKET).download(storagePath(trackId));
  if (error) {
    if (/not found|not exist|404/i.test(error.message)) return [];
    throw error;
  }
  const text = await data.text();
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is StoredTrackComment => (
    typeof item === "object" &&
    item !== null &&
    typeof (item as StoredTrackComment).id === "string" &&
    typeof (item as StoredTrackComment).trackId === "string" &&
    typeof (item as StoredTrackComment).name === "string" &&
    typeof (item as StoredTrackComment).text === "string" &&
    typeof (item as StoredTrackComment).createdAt === "string"
  ));
}

async function writeComments(admin: AdminClient, trackId: string, comments: StoredTrackComment[]) {
  await ensureDataBucket(admin);
  const { error } = await admin.storage.from(DATA_BUCKET).upload(
    storagePath(trackId),
    new Blob([JSON.stringify(comments, null, 2)], { type: "application/json" }),
    { contentType: "application/json", upsert: true },
  );
  if (error) throw error;
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<TrackCommentDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get("trackId");
  if (!isUuid(trackId)) return jsonError("Invalid track id.");

  try {
    const admin = adminClient();
    const comments = await readComments(admin, trackId);
    return NextResponse.json({ comments }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}

export async function POST(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入再留下歌曲評論。", 401);

  const body = (await request.json().catch(() => null)) as {
    trackId?: unknown;
    displayName?: unknown;
    text?: unknown;
  } | null;
  if (!isUuid(body?.trackId)) return jsonError("Invalid track id.");
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 280) : "";
  if (!text) return jsonError("Empty comment.");

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError("登入狀態已過期，請重新登入。", 401);
    const displayName = typeof body?.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim().slice(0, 48)
      : userData.user.email?.split("@")[0] ?? "吧友";

    const { data: trackExists, error: trackError } = await admin
      .from("listen_bar_tracks")
      .select("id")
      .eq("id", body.trackId)
      .maybeSingle();
    if (trackError) return jsonError(trackError.message, 500);
    if (!trackExists) return jsonError("Track not found.", 404);

    const comments = await readComments(admin, body.trackId);
    const comment: StoredTrackComment = {
      id: crypto.randomUUID(),
      trackId: body.trackId,
      name: displayName,
      text,
      createdAt: new Date().toISOString(),
    };
    await writeComments(admin, body.trackId, [...comments, comment].slice(-COMMENT_LIMIT_PER_TRACK));
    return NextResponse.json({ comment });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
