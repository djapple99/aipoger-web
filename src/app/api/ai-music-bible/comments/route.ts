import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  isSunoInspirationEntry,
  type SunoInspirationKind,
} from "@/lib/suno-inspiration-index";

export const runtime = "nodejs";

const TABLE = "ai_music_bible_entry_comments";
const MAX_COMMENT_LENGTH = 280;
const MAX_COMMENTS_PER_HOUR = 12;

type CommentRow = {
  id: string;
  entry_kind: SunoInspirationKind;
  entry_key: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
};

let cachedAdmin: SupabaseClient | null | undefined;

function adminClient() {
  if (cachedAdmin !== undefined) return cachedAdmin;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY)?.trim();
  cachedAdmin = supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  return cachedAdmin;
}
function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const requestOrigin = request.nextUrl.origin;
    const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || requestOrigin).origin;
    return [
      requestOrigin,
      siteOrigin,
      "https://aipoger.com",
      "https://www.aipoger.com",
    ].includes(origin);
  } catch {
    return false;
  }
}

function tokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim() || null
    : null;
}

function entryKind(value: unknown): SunoInspirationKind | null {
  return value === "artist_dna" || value === "prompt_recipe" ? value : null;
}

function entryKey(value: unknown) {
  return typeof value === "string" && /^[a-z0-9-]{1,80}$/.test(value) ? value : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function missingSchema(error: unknown) {
  const value = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /ai_music_bible_entry_comments|schema cache|relation.*does not exist|PGRST204|42P01/i.test(value);
}

async function optionalUser(request: NextRequest, admin: SupabaseClient) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

async function requiredUser(request: NextRequest, admin: SupabaseClient) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user ?? null;
}

async function commentIdentity(admin: SupabaseClient, user: User) {
  const [fighter, profile] = await Promise.all([
    admin.from("fighter_profiles").select("display_name,avatar_url").eq("id", user.id).maybeSingle(),
    admin.from("user_profiles").select("fighter_name,display_name").eq("id", user.id).maybeSingle(),
  ]);
  const metadata = user.user_metadata as Record<string, unknown>;
  const displayName = fighter.data?.display_name?.trim()
    || profile.data?.display_name?.trim()
    || profile.data?.fighter_name?.trim()
    || (typeof metadata.full_name === "string" ? metadata.full_name.trim() : "")
    || (typeof metadata.name === "string" ? metadata.name.trim() : "")
    || user.email?.split("@")[0]
    || "AIPOGER 創作者";
  const metadataAvatar = typeof metadata.avatar_url === "string"
    ? metadata.avatar_url.trim()
    : typeof metadata.picture === "string"
      ? metadata.picture.trim()
      : "";
  return {
    displayName: displayName.slice(0, 80),
    avatarUrl: fighter.data?.avatar_url?.trim() || metadataAvatar || null,
  };
}

function publicComment(row: CommentRow, userId: string | null) {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    body: row.body,
    createdAt: row.created_at,
    isMine: Boolean(userId && row.user_id === userId),
  };
}

function validEntry(kind: SunoInspirationKind | null, key: string | null) {
  return Boolean(kind && key && isSunoInspirationEntry(kind, key));
}

export async function GET(request: NextRequest) {
  const kind = entryKind(request.nextUrl.searchParams.get("entryKind"));
  const key = entryKey(request.nextUrl.searchParams.get("entryKey"));
  if (!validEntry(kind, key)) return jsonError("找不到這筆練功資料。", 404);

  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { schemaReady: false, comments: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const user = await optionalUser(request, admin);
    const { data, error } = await admin
      .from(TABLE)
      .select("id,entry_kind,entry_key,user_id,display_name,avatar_url,body,created_at")
      .eq("entry_kind", kind)
      .eq("entry_key", key)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({
      schemaReady: true,
      comments: ((data ?? []) as CommentRow[]).map((row) => publicComment(row, user?.id ?? null)),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (missingSchema(error)) {
      return NextResponse.json(
        { schemaReady: false, comments: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return jsonError(error instanceof Error ? error.message : "評論暫時無法讀取。", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError("不接受跨網站評論。", 403);
  const admin = adminClient();
  if (!admin) return jsonError("評論服務尚未連線。", 503);

  try {
    const user = await requiredUser(request, admin);
    if (!user) return jsonError("請先登入，才能留下評論。", 401);

    const payload = (await request.json().catch(() => null)) as {
      entryKind?: unknown;
      entryKey?: unknown;
      body?: unknown;
    } | null;
    const kind = entryKind(payload?.entryKind);
    const key = entryKey(payload?.entryKey);
    const body = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (!validEntry(kind, key)) return jsonError("找不到這筆練功資料。", 404);
    if (!body) return jsonError("請先寫下評論。");
    if (body.length > MAX_COMMENT_LENGTH) return jsonError("評論最多 280 個字。");

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= MAX_COMMENTS_PER_HOUR) {
      return jsonError("你這一小時的評論已達上限，晚一點再回來。", 429);
    }

    const identity = await commentIdentity(admin, user);
    const { data, error } = await admin
      .from(TABLE)
      .insert({
        entry_kind: kind,
        entry_key: key,
        user_id: user.id,
        display_name: identity.displayName,
        avatar_url: identity.avatarUrl,
        body,
      })
      .select("id,entry_kind,entry_key,user_id,display_name,avatar_url,body,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ comment: publicComment(data as CommentRow, user.id) }, { status: 201 });
  } catch (error) {
    if (missingSchema(error)) return jsonError("評論服務尚未準備完成。", 503);
    return jsonError(error instanceof Error ? error.message : "評論送出失敗。", 500);
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError("不接受跨網站操作。", 403);
  const admin = adminClient();
  if (!admin) return jsonError("評論服務尚未連線。", 503);

  try {
    const user = await requiredUser(request, admin);
    if (!user) return jsonError("請先登入。", 401);
    const payload = (await request.json().catch(() => null)) as { commentId?: unknown } | null;
    if (!isUuid(payload?.commentId)) return jsonError("找不到這則評論。");

    const { data, error } = await admin
      .from(TABLE)
      .delete()
      .eq("id", payload.commentId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return jsonError("只能刪除自己的評論。", 403);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (missingSchema(error)) return jsonError("評論服務尚未準備完成。", 503);
    return jsonError(error instanceof Error ? error.message : "評論刪除失敗。", 500);
  }
}
