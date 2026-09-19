import { NextResponse } from "next/server";

const LISTEN_BAR_AUDIO_BUCKET = "listen-bar-audio";
const AUDIO_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const FORWARDED_REQUEST_HEADERS = ["accept", "if-none-match", "if-range", "range"];
const FORWARDED_RESPONSE_HEADERS = [
  "accept-ranges",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
];

type AudioRouteContext = {
  params: Promise<{ path: string[] }>;
};

function invalidAudioPath(path: string[]) {
  return path.length === 0 || path.some((segment) => !segment || segment === "." || segment === ".." || /[\\/]/.test(segment));
}

function upstreamAudioUrl(path: string[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return null;
  const baseUrl = supabaseUrl.replace(/\/+$/, "");
  const encodedPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  return `${baseUrl}/storage/v1/object/public/${LISTEN_BAR_AUDIO_BUCKET}/${encodedPath}`;
}

async function proxyAudio(request: Request, context: AudioRouteContext) {
  const { path } = await context.params;
  if (invalidAudioPath(path)) {
    return NextResponse.json({ error: "Invalid audio path." }, { status: 400 });
  }

  const targetUrl = upstreamAudioUrl(path);
  if (!targetUrl) {
    return NextResponse.json({ error: "Audio storage is not configured." }, { status: 500 });
  }

  const requestHeaders = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) requestHeaders.set(name, value);
  }
  requestHeaders.set("accept-encoding", "identity");

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      redirect: "error",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Audio storage is temporarily unavailable." }, { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  if (upstream.ok) {
    responseHeaders.set("Cache-Control", AUDIO_CACHE_CONTROL);
  } else {
    responseHeaders.delete("Cache-Control");
  }
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: AudioRouteContext) {
  return proxyAudio(request, context);
}

export async function HEAD(request: Request, context: AudioRouteContext) {
  return proxyAudio(request, context);
}
