import { NextRequest, NextResponse } from "next/server";
import { musicNewsArticle } from "@/lib/music-news";
import { mvReviewAdmin } from "@/lib/server-mv-reviews";
import { loadPublicIdentity } from "@/lib/server-public-identity";

export const runtime = "nodejs";
export const preferredRegion = "hnd1";
type Context = { params: Promise<{ slug: string }> };
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
const fail = (code: string, status: number) => json({ code }, status);
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || [request.nextUrl.origin, "https://aipoger.com", "https://www.aipoger.com"].includes(origin);
}
async function actor(request: NextRequest, admin: ReturnType<typeof mvReviewAdmin>) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return !error && data.user && !data.user.is_anonymous ? data.user : null;
}
function failure(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (message.includes("NEWS_RATE_LIMIT")) return fail("RATE_LIMIT", 429);
  if (message.includes("NEWS_REQUEST_CONFLICT")) return fail("REQUEST_CONFLICT", 409);
  if (message.includes("NEWS_COMMENT_UNAVAILABLE")) return fail("COMMENT_UNAVAILABLE", 403);
  // Never send database/schema details, tokens or account metadata to a public reader.
  return fail("UNAVAILABLE", 503);
}
export async function GET(request: NextRequest, context: Context) {
  const { slug } = await context.params;
  if (!musicNewsArticle(slug)) return fail("NOT_FOUND", 404);
  const before = request.nextUrl.searchParams.get("before");
  const beforeId = request.nextUrl.searchParams.get("beforeId");
  if ((before === null) !== (beforeId === null) || (before !== null && (!Number.isFinite(Date.parse(before)) || !uuid(beforeId)))) return fail("INVALID_CURSOR", 400);
  try {
    const admin = mvReviewAdmin();
    const user = await actor(request, admin);
    const { data, error } = await admin.rpc("read_music_news_discussion", { p_slug: slug, p_user: user?.id ?? null, p_before: before ? new Date(before).toISOString() : null, p_before_id: beforeId });
    if (error) throw error;
    if (!data || !Array.isArray(data.comments)) throw new Error("Missing discussion");
    const viewer = user ? await loadPublicIdentity(admin, user.id) : null;
    return json({ ...data, signedIn: Boolean(user), viewerName: viewer?.displayName ?? null });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return fail("CROSS_ORIGIN", 403);
  const { slug } = await context.params;
  if (!musicNewsArticle(slug)) return fail("NOT_FOUND", 404);
  try {
    const admin = mvReviewAdmin();
    const user = await actor(request, admin);
    if (!user) return fail("AUTH_REQUIRED", 401);
    const payload = await request.json().catch(() => null) as { body?: unknown; requestId?: unknown } | null;
    const body = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (!body || Array.from(body).length > 1000 || !uuid(payload?.requestId)) return fail("INVALID_COMMENT", 400);
    const identity = await loadPublicIdentity(admin, user.id);
    const { data, error } = await admin.rpc("save_music_news_comment", { p_user: user.id, p_slug: slug, p_request: payload.requestId, p_name: identity.displayName, p_body: body });
    if (error) throw error;
    if (!data?.comment) throw new Error("Missing saved comment");
    return json(data, data.replayed ? 200 : 201);
  } catch (error) { return failure(error); }
}
export async function PUT(request: NextRequest, context: Context) {
  if (!sameOrigin(request)) return fail("CROSS_ORIGIN", 403);
  const { slug } = await context.params;
  if (!musicNewsArticle(slug)) return fail("NOT_FOUND", 404);
  try {
    const admin = mvReviewAdmin();
    const user = await actor(request, admin);
    if (!user) return fail("AUTH_REQUIRED", 401);
    const payload = await request.json().catch(() => null) as { liked?: unknown } | null;
    if (typeof payload?.liked !== "boolean") return fail("INVALID_LIKE", 400);
    const { data, error } = await admin.rpc("set_music_news_like", { p_user: user.id, p_slug: slug, p_liked: payload.liked });
    if (error) throw error;
    if (!data || typeof data.liked !== "boolean") throw new Error("Missing like state");
    return json(data);
  } catch (error) { return failure(error); }
}
