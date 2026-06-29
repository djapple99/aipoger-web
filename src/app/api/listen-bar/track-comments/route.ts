import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type StoredTrackComment = {
  id: string;
  trackId: string;
  name: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  canEdit?: boolean;
};

type TrackCommentDatabase = {
  public: {
    Tables: {
      listen_bar_tracks: {
        Row: { id: string; title?: string | null; created_by?: string | null };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      listen_bar_track_comments: {
        Row: {
          id: string;
          track_id: string;
          user_id: string | null;
          display_name: string;
          body: string;
          created_at: string;
          updated_at?: string | null;
        };
        Insert: {
          track_id: string;
          user_id: string;
          display_name: string;
          body: string;
        };
        Update: {
          body?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      battle_notifications: {
        Row: Record<string, never>;
        Insert: {
          user_id: string;
          queue_id?: null;
          battle_id?: null;
          type: string;
          title: string;
          body: string;
          metadata?: Record<string, unknown>;
        };
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
const COMMENT_NOTIFICATION_TYPE = "listen_bar_track_comment";

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

async function readDatabaseComments(admin: AdminClient, trackId: string, viewerUserId?: string | null): Promise<StoredTrackComment[] | null> {
  const { data, error } = await admin
    .from("listen_bar_track_comments")
    .select("id, track_id, user_id, display_name, body, created_at, updated_at")
    .eq("track_id", trackId)
    .order("created_at", { ascending: true })
    .limit(COMMENT_LIMIT_PER_TRACK);

  if (error) {
    if (isMissingTrackCommentsTable(error)) return null;
    throw error;
  }

  return ((data as TrackCommentDatabase["public"]["Tables"]["listen_bar_track_comments"]["Row"][] | null) ?? []).map((row) => ({
    id: row.id,
    trackId: row.track_id,
    name: row.display_name,
    text: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    canEdit: Boolean(viewerUserId && row.user_id === viewerUserId),
  }));
}

function mergeComments(databaseComments: StoredTrackComment[] | null, storageComments: StoredTrackComment[]) {
  const seen = new Set<string>();
  return [...(databaseComments ?? []), ...storageComments]
    .filter((comment) => {
      if (seen.has(comment.id)) return false;
      seen.add(comment.id);
      return true;
    })
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .slice(-COMMENT_LIMIT_PER_TRACK);
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
    const token = tokenFromRequest(request);
    const viewerUserId = token
      ? (await admin.auth.getUser(token)).data.user?.id ?? null
      : null;
    const [databaseComments, storageComments] = await Promise.all([
      readDatabaseComments(admin, trackId, viewerUserId),
      readComments(admin, trackId),
    ]);
    return NextResponse.json({ comments: mergeComments(databaseComments, storageComments) }, { headers: { "Cache-Control": "no-store" } });
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
      .select("id,title,created_by")
      .eq("id", body.trackId)
      .maybeSingle<TrackCommentDatabase["public"]["Tables"]["listen_bar_tracks"]["Row"]>();
    if (trackError) return jsonError(trackError.message, 500);
    if (!trackExists) return jsonError("Track not found.", 404);

    let comment: StoredTrackComment | null = null;
    const inserted = await admin
      .from("listen_bar_track_comments")
      .insert({
        track_id: body.trackId,
        user_id: userData.user.id,
        display_name: displayName,
        body: text,
      })
      .select("id, track_id, user_id, display_name, body, created_at, updated_at")
      .maybeSingle<TrackCommentDatabase["public"]["Tables"]["listen_bar_track_comments"]["Row"]>();

    if (inserted.error && isMissingTrackCommentsTable(inserted.error)) {
      const comments = await readComments(admin, body.trackId);
      comment = {
        id: crypto.randomUUID(),
        trackId: body.trackId,
        name: displayName,
        text,
        createdAt: new Date().toISOString(),
      };
      await writeComments(admin, body.trackId, [...comments, comment].slice(-COMMENT_LIMIT_PER_TRACK));
    } else if (inserted.error) {
      return jsonError(inserted.error.message, 500);
    } else if (inserted.data) {
      comment = {
        id: inserted.data.id,
        trackId: inserted.data.track_id,
        name: inserted.data.display_name,
        text: inserted.data.body,
        createdAt: inserted.data.created_at,
        updatedAt: inserted.data.updated_at ?? inserted.data.created_at,
        canEdit: true,
      };
    }

    if (!comment) return jsonError("Comment was not saved.", 500);

    if (trackExists.created_by && trackExists.created_by !== userData.user.id) {
      const trackTitle = trackExists.title?.trim() || "你的歌曲";
      const notificationResult = await admin.from("battle_notifications").insert({
        user_id: trackExists.created_by,
        type: COMMENT_NOTIFICATION_TYPE,
        title: `你的歌曲〈${trackTitle}〉收到新留言`,
        body: `${displayName} 留言：${text}`,
        metadata: {
          trackId: body.trackId,
          trackTitle,
          commentId: comment.id,
          commenterName: displayName,
          href: "/listen-bar",
        },
      });
      if (notificationResult.error) {
        console.warn("[listen-bar track comment notification]", notificationResult.error.message);
      }
    }

    return NextResponse.json({ comment });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}

export async function PATCH(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入再修改自己的評論。", 401);

  const body = (await request.json().catch(() => null)) as {
    trackId?: unknown;
    commentId?: unknown;
    text?: unknown;
  } | null;
  if (!isUuid(body?.trackId)) return jsonError("Invalid track id.");
  if (!isUuid(body?.commentId)) return jsonError("Invalid comment id.");
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 280) : "";
  if (!text) return jsonError("Empty comment.");

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError("登入狀態已過期，請重新登入。", 401);

    const updated = await admin
      .from("listen_bar_track_comments")
      .update({ body: text, updated_at: new Date().toISOString() })
      .eq("id", body.commentId)
      .eq("track_id", body.trackId)
      .eq("user_id", userData.user.id)
      .select("id, track_id, user_id, display_name, body, created_at, updated_at")
      .maybeSingle<TrackCommentDatabase["public"]["Tables"]["listen_bar_track_comments"]["Row"]>();

    if (updated.error) {
      if (isMissingTrackCommentsTable(updated.error)) return jsonError("這則舊留言目前不能修改。", 409);
      return jsonError(updated.error.message, 500);
    }
    if (!updated.data) return jsonError("找不到可修改的自己的評論。", 404);

    return NextResponse.json({
      comment: {
        id: updated.data.id,
        trackId: updated.data.track_id,
        name: updated.data.display_name,
        text: updated.data.body,
        createdAt: updated.data.created_at,
        updatedAt: updated.data.updated_at ?? updated.data.created_at,
        canEdit: true,
      } satisfies StoredTrackComment,
    });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
