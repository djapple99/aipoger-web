import { creatorAdmin } from "@/lib/server-creator-auth";
import { blindStorageUrl, readBlindAudioToken } from "@/lib/server-blind-listening";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const fail = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const token = readBlindAudioToken(new URL(request.url).searchParams.get("token") ?? "");
    if (!token) return fail();
    const admin = creatorAdmin();
    const { data: q, error } = await admin.from("blind_listen_questions").select("track_a_id,track_b_id,user_id,state,expires_at").eq("id", token.id).maybeSingle();
    if (error || !q || q.state === "skipped" || Date.parse(q.expires_at) <= Date.now()) return fail();
    const id = token.side === "A" ? q.track_a_id : q.track_b_id;
    const { data: eligible } = await admin.rpc("blind_track_eligible", { p_track: id, p_user: q.user_id });
    if (!eligible) return fail();
    const { data: track } = await admin.from("listen_bar_tracks").select("audio_path").eq("id", id).maybeSingle();
    const url = blindStorageUrl(admin, track?.audio_path);
    if (!url) return fail();
    const range = request.headers.get("range");
    if (range && !/^bytes=\d*-\d*$/.test(range)) return new Response(null, { status: 416 });
    const response = await fetch(url, { headers: range ? { Range: range } : {}, cache: "no-store", redirect: "error", signal: request.signal });
    if (!response.ok && response.status !== 206) return fail();
    const headers = new Headers({ "Cache-Control": "private, no-store", "Content-Type": response.headers.get("content-type") || "audio/mpeg", "X-Content-Type-Options": "nosniff" });
    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = response.headers.get(name); if (value) headers.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers });
  } catch { return fail(); }
}
