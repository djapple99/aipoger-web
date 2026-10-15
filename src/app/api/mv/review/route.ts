import { loadPublicIdentity } from "@/lib/server-public-identity";
import { NextRequest, NextResponse } from "next/server";
import { readMvDiscovery, readMusicReviewWork } from "@/lib/server-home-discovery";
import { mvReviewAdmin } from "@/lib/server-mv-reviews";
import { isWorkRating } from "@/lib/work-rating";

const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const token = (request: NextRequest) => request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
const isMusic = (request: NextRequest) => request.nextUrl.pathname === "/api/listen-bar/review";
const reviewWork = async (request: NextRequest, trackId: string) => isMusic(request)
  ? readMusicReviewWork(trackId) : (await readMvDiscovery()).works.find(item => item.id === trackId);

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get("trackId");
  if (!uuid(trackId)) return reply({ error: "Invalid work" }, 400);
  try {
    const work = await reviewWork(request, trackId);
    if (!work) return reply({ error: "Unavailable work" }, 404);
    const admin = mvReviewAdmin();
    const bearer = token(request);
    let myScore: number | null = null; let canRate = false; let myComment: object | null = null;
    if (bearer) {
      const { data, error } = await admin.auth.getUser(bearer);
      if (error || !data.user || data.user.is_anonymous) return reply({ error: "Sign in again" }, 401);
      const [track, own] = await Promise.all([
        admin.from("listen_bar_tracks").select("created_by").eq("id", trackId).single(),
        admin.from("mv_work_ratings").select("score,comment_id").eq("track_id", trackId).eq("user_id", data.user.id).maybeSingle(),
      ]);
      if (track.error || own.error) throw new Error("Read failed");
      canRate = track.data.created_by !== data.user.id;
      myScore = own.data?.score ?? null;
      if (own.data?.comment_id) {
        const c = await admin.from("listen_bar_track_comments").select("id,body,moderation_status").eq("id", own.data.comment_id).eq("user_id", data.user.id).maybeSingle();
        if (c.error) throw c.error;
        if (c.data?.moderation_status === "visible") myComment = { id: c.data.id, text: c.data.body };
      }
    }
    return reply({ myScore, myComment, canRate, ratingAverage: work.ratingAverage ?? null, ratingCount: work.ratingCount ?? 0, ratingTotal: work.ratingTotal ?? 0 });
  } catch { return reply({ error: "Reviews unavailable" }, 503); }
}

export async function POST(request: NextRequest) {
  const bearer = token(request);
  if (!bearer) return reply({ error: "Sign in first" }, 401);
  const body = await request.json().catch(() => null);
  if (!uuid(body?.trackId) || !uuid(body?.requestId) || (body.score !== null && !isWorkRating(body.score))
    || typeof body.text !== "string" || body.text.trim().length > 280 || (body.score === null && !body.text.trim())) return reply({ error: "Invalid review" }, 400);
  try {
    const admin = mvReviewAdmin();
    const { data: user, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !user.user || user.user.is_anonymous) return reply({ error: "Sign in again" }, 401);
    // Use the same lifecycle/visibility rules as the public MV catalogue.
    if (!(await reviewWork(request, body.trackId))) return reply({ error: "Unavailable work" }, 404);
    const { displayName: name } = await loadPublicIdentity(admin, user.user.id);
    const { data, error } = await admin.rpc("save_work_review", {
      p_track_id: body.trackId, p_user_id: user.user.id, p_score: body.score,
      p_body: body.text.trim(), p_name: name, p_request_id: body.requestId, p_surface: isMusic(request) ? "music" : "mv",
    });
    if (error) return reply({ error: "Review could not be saved" }, error.code === "42501" ? 403 : 503);
    return reply(data);
  } catch { return reply({ error: "Reviews unavailable" }, 503); }
}

export async function PATCH(request: NextRequest) {
  const bearer = token(request);
  if (!bearer) return reply({ error: "Sign in first" }, 401);
  const body = await request.json().catch(() => null);
  if (!uuid(body?.commentId) || typeof body.text !== "string" || !body.text.trim() || body.text.trim().length > 280 || typeof body.active !== "boolean") return reply({ error: "Invalid review" }, 400);
  try {
    const admin = mvReviewAdmin();
    const { data, error } = await admin.auth.getUser(bearer);
    if (error || !data.user || data.user.is_anonymous) return reply({ error: "Sign in again" }, 401);
    const saved = await admin.rpc("edit_work_review", { p_user: data.user.id, p_comment: body.commentId, p_body: body.text.trim(), p_active: body.active });
    if (saved.error) return reply({ error: "Review could not be changed" }, saved.error.code === "42501" ? 403 : 503);
    return reply(saved.data);
  } catch { return reply({ error: "Reviews unavailable" }, 503); }
}
