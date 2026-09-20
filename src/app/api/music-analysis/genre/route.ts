import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GENRE_SAMPLE_MAX_BYTES, isGenreSample, parseGenreSuggestion } from "@/lib/genre-suggestion";

export const runtime = "nodejs";
export const maxDuration = 60;

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return reply({ error: "sign_in_required" }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return reply({ error: "unavailable" }, 503);
  try {
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.getUser(token);
    if (error || !data.user) return reply({ error: "sign_in_required" }, 401);
    const endpoint = process.env.MUSIC_GENRE_ANALYSIS_URL;
    const secret = process.env.MUSIC_GENRE_ANALYSIS_SECRET;
    if (!endpoint || !secret) return reply({ error: "unavailable" }, 503);
    const target = new URL(endpoint);
    if (target.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && target.protocol === "http:" && ["127.0.0.1", "localhost"].includes(target.hostname))) {
      return reply({ error: "unavailable" }, 503);
    }
    if (request.headers.get("content-type") !== "audio/wav") return reply({ error: "invalid_audio" }, 400);
    const declaredSize = Number(request.headers.get("content-length"));
    if (declaredSize > GENRE_SAMPLE_MAX_BYTES) return reply({ error: "sample_too_large" }, 413);
    // Bound streamed bodies too, including requests with no Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "invalid_audio" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > GENRE_SAMPLE_MAX_BYTES) {
        await reader.cancel();
        return reply({ error: "sample_too_large" }, 413);
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    if (!isGenreSample(body.buffer)) return reply({ error: "invalid_audio" }, 400);
    const response = await fetch(target, {
      method: "POST", body, cache: "no-store", redirect: "error",
      headers: { "Content-Type": "audio/wav", Authorization: `Bearer ${secret}`, "X-Aipoger-User": data.user.id },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(45000)]),
    });
    if (!response.ok) return reply({ error: response.status === 429 ? "busy" : "unavailable" }, response.status === 429 ? 429 : 503);
    const result = parseGenreSuggestion(await response.json());
    return result ? reply(result) : reply({ error: "unavailable" }, 503);
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}
