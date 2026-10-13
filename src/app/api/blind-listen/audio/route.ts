import { creatorAdmin } from "@/lib/server-creator-auth";
import { blindStorageUrl, readBlindAudioToken } from "@/lib/server-blind-listening";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const fail = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const token = readBlindAudioToken(new URL(request.url).searchParams.get("token") ?? "");
    if (!token) return fail();
    const admin = creatorAdmin();
    const { data: path, error } = await admin.rpc("blind_audio_source", { p_question: token.id, p_side: token.side });
    if (error || typeof path !== "string") return fail();
    const url = blindStorageUrl(admin, path);
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
