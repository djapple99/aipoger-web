import { NextRequest, NextResponse } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { AIPOGER_CHOICE_COMMENT_MAX_LENGTH } from "@/lib/aipoger-choice";

type ChoiceCollectionKind = "official" | "creator";

type ChoiceCommentRow = {
  id: string;
  collection_kind: ChoiceCollectionKind;
  collection_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  body: string;
  created_at: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function collectionKind(value: unknown): ChoiceCollectionKind | null {
  return value === "official" || value === "creator" ? value : null;
}

function isMissingChoiceCommentsSchema(error: unknown) {
  const value = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /aipoger_choice_collection_comments|schema cache|relation.*does not exist|PGRST204|42P01/i.test(value);
}

async function isPublishedCollection(
  admin: ReturnType<typeof adminClient>,
  kind: ChoiceCollectionKind,
  collectionId: string,
) {
  const table = kind === "official" ? "aipoger_choice_collections" : "aipoger_creator_choice_collections";
  const { data, error } = await admin.from(table).select("id").eq("id", collectionId).eq("is_published", true).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function optionalUser(request: NextRequest, admin: ReturnType<typeof adminClient>) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user ?? null;
}

async function requiredUser(request: NextRequest, admin: ReturnType<typeof adminClient>) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

async function commentIdentity(admin: ReturnType<typeof adminClient>, user: User) {
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
    || "AIPOGER 聽眾";
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

function publicComment(row: ChoiceCommentRow, userId: string | null) {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    body: row.body,
    createdAt: row.created_at,
    isMine: Boolean(userId && row.user_id === userId),
  };
}

export async function GET(request: NextRequest) {
  const kind = collectionKind(request.nextUrl.searchParams.get("collectionKind"));
  const collectionId = request.nextUrl.searchParams.get("collectionId") ?? "";
  if (!kind || !isUuid(collectionId)) return jsonError("Choice 評論資料不完整。");

  try {
    const admin = adminClient();
    if (!(await isPublishedCollection(admin, kind, collectionId))) return jsonError("這份 Choice 目前未公開。", 404);
    const user = await optionalUser(request, admin);
    const { data, error } = await admin
      .from("aipoger_choice_collection_comments")
      .select("id,collection_kind,collection_id,user_id,display_name,avatar_url,body,created_at")
      .eq("collection_kind", kind)
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({
      schemaReady: true,
      comments: ((data ?? []) as ChoiceCommentRow[]).map((row) => publicComment(row, user?.id ?? null)),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingChoiceCommentsSchema(error)) {
      return NextResponse.json({ schemaReady: false, comments: [] }, { headers: { "Cache-Control": "no-store" } });
    }
    return jsonError(error instanceof Error ? error.message : "Choice 評論暫時無法讀取。", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = adminClient();
    const user = await requiredUser(request, admin);
    if (!user) return jsonError("請先登入，才能留下評論。", 401);
    const body = (await request.json().catch(() => null)) as { collectionKind?: unknown; collectionId?: unknown; body?: unknown } | null;
    const kind = collectionKind(body?.collectionKind);
    const collectionId = body?.collectionId;
    const commentBody = typeof body?.body === "string" ? body.body.trim() : "";
    if (!kind || !isUuid(collectionId)) return jsonError("Choice 評論資料不完整。");
    if (!commentBody) return jsonError("請先寫下評論。");
    if (commentBody.length > AIPOGER_CHOICE_COMMENT_MAX_LENGTH) return jsonError(`評論最多 ${AIPOGER_CHOICE_COMMENT_MAX_LENGTH} 個字。`);
    if (!(await isPublishedCollection(admin, kind, collectionId))) return jsonError("這份 Choice 目前未公開。", 404);

    const identity = await commentIdentity(admin, user);
    const { data, error } = await admin
      .from("aipoger_choice_collection_comments")
      .insert({
        collection_kind: kind,
        collection_id: collectionId,
        user_id: user.id,
        display_name: identity.displayName,
        avatar_url: identity.avatarUrl,
        body: commentBody,
      })
      .select("id,collection_kind,collection_id,user_id,display_name,avatar_url,body,created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ comment: publicComment(data as ChoiceCommentRow, user.id) });
  } catch (error) {
    if (isMissingChoiceCommentsSchema(error)) return jsonError("Choice 評論服務尚未準備完成。", 503);
    return jsonError(error instanceof Error ? error.message : "Choice 評論送出失敗。", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = adminClient();
    const user = await requiredUser(request, admin);
    if (!user) return jsonError("請先登入。", 401);
    const body = (await request.json().catch(() => null)) as { commentId?: unknown } | null;
    if (!isUuid(body?.commentId)) return jsonError("找不到這則評論。");
    const { data, error } = await admin
      .from("aipoger_choice_collection_comments")
      .delete()
      .eq("id", body.commentId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return jsonError("只能刪除自己的評論。", 403);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    if (isMissingChoiceCommentsSchema(error)) return jsonError("Choice 評論服務尚未準備完成。", 503);
    return jsonError(error instanceof Error ? error.message : "評論刪除失敗。", 500);
  }
}
