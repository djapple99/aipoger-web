import { NextRequest, NextResponse } from "next/server";
import { mvReviewAdmin } from "@/lib/server-mv-reviews";
import { loadPublicIdentity } from "@/lib/server-public-identity";
import { readPublicWorkDetail } from "@/lib/server-home-discovery";
import { readAllHomePages } from "@/lib/home-discovery";

export const preferredRegion = "hnd1";
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const token = (r: NextRequest) => r.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
type Parent = { id: string; user_id: string | null };
type Reply = { id: string; comment_id: string; display_name: string; body: string; created_at: string };
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("trackId");
  if (!uuid(id)) return json({ error: "Invalid work" }, 400);
  try {
    if (!await readPublicWorkDetail(id)) return json({ error: "Unavailable work" }, 404);
    const admin = mvReviewAdmin(); const bearer = token(request);
    let userId: string | null = null;
    if (bearer) {
      const auth = await admin.auth.getUser(bearer);
      if (auth.error || !auth.data.user || auth.data.user.is_anonymous) return json({ error: "Sign in again" }, 401);
      userId = auth.data.user.id;
    }
    const [parents, replies, owner] = await Promise.all([
      readAllHomePages<Parent>((from, to) => admin.from("listen_bar_track_comments").select("id,user_id").eq("track_id", id).eq("moderation_status", "visible").order("id").range(from, to)),
      readAllHomePages<Reply>((from, to) => admin.from("work_comment_replies").select("id,comment_id,display_name,body,created_at").eq("track_id", id).eq("moderation_status", "visible").order("created_at").order("id").range(from, to)),
      userId ? admin.from("listen_bar_tracks").select("created_by").eq("id", id).single() : Promise.resolve({ data: null, error: null }),
    ]);
    if (owner.error) throw new Error("Reply permissions unavailable");
    const visible = new Set(parents.map(p => p.id));
    return json({ replies: replies.filter(r => visible.has(r.comment_id)).map(r => ({ id: r.id, commentId: r.comment_id, name: r.display_name, text: r.body, createdAt: r.created_at })),
      canReplyIds: userId && owner.data?.created_by === userId ? parents.filter(p => p.user_id && p.user_id !== userId).map(p => p.id) : [] });
  } catch { return json({ error: "Replies unavailable" }, 503); }
}
export async function POST(request: NextRequest) {
  const bearer = token(request); if (!bearer) return json({ error: "Sign in first" }, 401);
  const body = await request.json().catch(() => null);
  if (!uuid(body?.trackId) || !uuid(body?.commentId) || !uuid(body?.requestId) || typeof body?.text !== "string" || !body.text.trim() || body.text.trim().length > 280) return json({ error: "Invalid reply" }, 400);
  try {
    const admin = mvReviewAdmin(); const auth = await admin.auth.getUser(bearer);
    if (auth.error || !auth.data.user || auth.data.user.is_anonymous) return json({ error: "Sign in again" }, 401);
    if (!await readPublicWorkDetail(body.trackId)) return json({ error: "Unavailable work" }, 404);
    const identity = await loadPublicIdentity(admin, auth.data.user.id);
    const result = await admin.rpc("save_work_comment_reply", { p_user: auth.data.user.id, p_track: body.trackId, p_comment: body.commentId, p_body: body.text.trim(), p_name: identity.displayName, p_request: body.requestId });
    if (result.error) return json({ error: "Reply could not be saved", code: result.error.message?.match(/REPLY_[A-Z_]+/)?.[0] }, result.error.code === "42501" ? 403 : result.error.code === "22023" ? 400 : 503);
    return json(result.data);
  } catch { return json({ error: "Replies unavailable" }, 503); }
}
