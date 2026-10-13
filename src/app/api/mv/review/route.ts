import { NextRequest, NextResponse } from "next/server";
import { readMvDiscovery } from "@/lib/server-home-discovery";
import { mvReviewAdmin } from "@/lib/server-mv-reviews";

const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const token = (request: NextRequest) => request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get("trackId");
  if (!uuid(trackId)) return reply({ error: "Invalid work" }, 400);
  try {
    const discovery = await readMvDiscovery();
    const work = discovery.works.find(item => item.id === trackId);
    if (!work) return reply({ error: "Unavailable work" }, 404);
    const admin = mvReviewAdmin();
    const bearer = token(request);
    let myScore: number | null = null; let canRate = false;
    if (bearer) {
      const { data, error } = await admin.auth.getUser(bearer);
      if (error || !data.user) return reply({ error: "Sign in again" }, 401);
      const [track, own] = await Promise.all([
        admin.from("listen_bar_tracks").select("created_by").eq("id", trackId).single(),
        admin.from("mv_work_ratings").select("score").eq("track_id", trackId).eq("user_id", data.user.id).maybeSingle(),
      ]);
      if (track.error || own.error) throw new Error("Read failed");
      canRate = track.data.created_by !== data.user.id;
      myScore = own.data?.score ?? null;
    }
    return reply({ myScore, canRate, ratingAverage: work.ratingAverage ?? null, ratingCount: work.ratingCount ?? 0 });
  } catch { return reply({ error: "Reviews unavailable" }, 503); }
}

export async function POST(request: NextRequest) {
  const bearer = token(request);
  if (!bearer) return reply({ error: "Sign in first" }, 401);
  const body = await request.json().catch(() => null);
  if (!uuid(body?.trackId) || !uuid(body?.requestId) || (body.score !== null && (!Number.isInteger(body.score) || body.score < 1 || body.score > 10))
    || typeof body.text !== "string" || body.text.trim().length > 280 || (body.score === null && !body.text.trim())) return reply({ error: "Invalid review" }, 400);
  try {
    const admin = mvReviewAdmin();
    const { data: user, error: authError } = await admin.auth.getUser(bearer);
    if (authError || !user.user) return reply({ error: "Sign in again" }, 401);
    // Use the same lifecycle/visibility rules as the public MV catalogue.
    if (!(await readMvDiscovery()).works.some(work => work.id === body.trackId)) return reply({ error: "Unavailable work" }, 404);
    const metadata = user.user.user_metadata;
    const name = String(metadata?.display_name || metadata?.nickname || metadata?.full_name || metadata?.name || "AIPOGER").trim().slice(0, 48) || "AIPOGER";
    const { data, error } = await admin.rpc("save_mv_review", {
      p_track_id: body.trackId, p_user_id: user.user.id, p_score: body.score,
      p_body: body.text.trim(), p_name: name, p_request_id: body.requestId,
    });
    if (error) return reply({ error: "Review could not be saved" }, error.code === "42501" ? 403 : 503);
    return reply(data);
  } catch { return reply({ error: "Reviews unavailable" }, 503); }
}
