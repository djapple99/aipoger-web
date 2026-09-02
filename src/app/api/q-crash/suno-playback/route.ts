import { createDecipheriv, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizeQCrashSunoUrl } from "@/lib/q-crash-rules";
import { resolveQCrashSunoMediaSource } from "@/lib/q-crash-suno-media";

export const runtime = "nodejs";

const SUNO_RIGHTS_URL = "https://studio-api-prod.suno.com/api/mango/rights";
const REQUEST_TIMEOUT_MS = 15_000;

type MangoRightsResponse = {
  key?: unknown;
  iv?: unknown;
  glt?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function fetchWithTimeout(input: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function base64Bytes(value: unknown) {
  if (typeof value !== "string" || !value) throw new Error("Invalid Suno playback key");
  const bytes = Buffer.from(value, "base64");
  if (bytes.length < 28) throw new Error("Invalid Suno playback key");
  return bytes;
}

function decryptWrappedValue(value: unknown, userKey: Buffer, trackId: string) {
  const wrapped = base64Bytes(value);
  const decipher = createDecipheriv("aes-256-gcm", userKey, wrapped.subarray(0, 12));
  decipher.setAAD(Buffer.from(trackId, "utf8"));
  decipher.setAuthTag(wrapped.subarray(wrapped.length - 16));
  return Buffer.concat([
    decipher.update(wrapped.subarray(12, wrapped.length - 16)),
    decipher.final(),
  ]);
}

async function sunoRights(trackId: string) {
  const response = await fetchWithTimeout(SUNO_RIGHTS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Origin: "https://suno.com",
      Referer: "https://suno.com/",
      "User-Agent": "AIPOGER Q Crash playback",
    },
    body: JSON.stringify({ content_params: { content_id: trackId, content_type: "clip" } }),
  });
  if (!response.ok) throw new Error("Suno playback rights unavailable");
  const data = (await response.json().catch(() => null)) as MangoRightsResponse | null;
  if (!data || typeof data.glt !== "string") throw new Error("Suno playback rights unavailable");
  const guestKey = createHash("sha256").update(data.glt).digest();
  return {
    key: decryptWrappedValue(data.key, guestKey, trackId),
    iv: decryptWrappedValue(data.iv, guestKey, trackId),
  };
}

function responseHeaders(contentLength: string | null, contentType = "audio/mp4") {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": "inline",
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  if (contentLength) headers.set("Content-Length", contentLength);
  return headers;
}

export async function GET(request: NextRequest) {
  const source = normalizeQCrashSunoUrl(request.nextUrl.searchParams.get("source"));
  if (!source) return jsonError("Suno 連結不正確。", 400);

  try {
    const media = await resolveQCrashSunoMediaSource(source);
    if (!media) return jsonError("這個 Suno 連結目前沒有可用的公開播放來源。", 404);

    const upstream = await fetchWithTimeout(media.url, {
      headers: {
        Accept: media.encrypted ? "audio/mp4" : "audio/*",
        Referer: "https://suno.com/",
        "User-Agent": "AIPOGER Q Crash playback",
      },
    });
    if (!upstream.ok || !upstream.body) return jsonError("Suno 播放來源目前無法載入。", 502);

    if (!media.encrypted) {
      const headers = responseHeaders(upstream.headers.get("content-length"), upstream.headers.get("content-type") || "audio/mp4");
      return new Response(upstream.body, { headers });
    }

    const rights = await sunoRights(media.trackId);
    const encrypted = upstream.body;
    const decipher = createDecipheriv(`aes-${rights.key.length * 8}-ctr`, rights.key, rights.iv);
    const reader = encrypted.getReader();
    const decrypted = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            const plain = decipher.update(Buffer.from(chunk.value));
            if (plain.byteLength > 0) controller.enqueue(new Uint8Array(plain));
          }
          const final = decipher.final();
          if (final.byteLength > 0) controller.enqueue(new Uint8Array(final));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason);
      },
    });
    return new Response(decrypted, {
      headers: responseHeaders(upstream.headers.get("content-length")),
    });
  } catch {
    return jsonError("Suno 播放來源目前無法載入，請稍後再試。", 502);
  }
}
