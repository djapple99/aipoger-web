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
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": "inline",
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  if (contentLength) headers.set("Content-Length", contentLength);
  return headers;
}

type ByteRange = { start: number; end: number };

function parseByteRange(value: string | null, totalLength: number): ByteRange | null {
  if (!value || !value.startsWith("bytes=") || !Number.isSafeInteger(totalLength) || totalLength <= 0) {
    return null;
  }

  const match = /^(\d*)-(\d*)$/.exec(value.slice("bytes=".length).trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(0, totalLength - suffixLength),
      end: totalLength - 1,
    };
  }

  const start = Number(match[1]);
  if (!Number.isSafeInteger(start) || start < 0 || start >= totalLength) return null;
  const requestedEnd = match[2] ? Number(match[2]) : totalLength - 1;
  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) return null;
  return { start, end: Math.min(requestedEnd, totalLength - 1) };
}

function totalLengthFromHeaders(headers: Headers) {
  const contentRange = headers.get("content-range");
  const rangeMatch = contentRange && /\/(\d+)$/.exec(contentRange);
  const rangeTotal = rangeMatch ? Number(rangeMatch[1]) : null;
  if (rangeTotal && Number.isSafeInteger(rangeTotal)) return rangeTotal;

  const contentLength = Number(headers.get("content-length"));
  return Number.isSafeInteger(contentLength) && contentLength > 0 ? contentLength : null;
}

function counterAtByteOffset(iv: Buffer, byteOffset: number) {
  const counter = Buffer.from(iv);
  let carry = Math.floor(byteOffset / 16);
  for (let index = counter.length - 1; index >= 0 && carry > 0; index -= 1) {
    const sum = counter[index] + (carry % 256);
    counter[index] = sum % 256;
    carry = Math.floor(carry / 256) + Math.floor(sum / 256);
  }
  return counter;
}

function rangeNotSatisfiable(totalLength: number) {
  const headers = responseHeaders(null);
  headers.set("Content-Range", `bytes */${totalLength}`);
  return new Response(null, { status: 416, headers });
}

export async function GET(request: NextRequest) {
  const source = normalizeQCrashSunoUrl(request.nextUrl.searchParams.get("source"));
  if (!source) return jsonError("Suno 連結不正確。", 400);

  try {
    const media = await resolveQCrashSunoMediaSource(source);
    if (!media) return jsonError("這個 Suno 連結目前沒有可用的公開播放來源。", 404);

    const rangeHeader = request.headers.get("range");
    const upstreamHeaders: HeadersInit = {
      Accept: media.encrypted ? "audio/mp4" : "audio/*",
      Referer: "https://suno.com/",
      "User-Agent": "AIPOGER Q Crash playback",
    };

    if (rangeHeader && !media.encrypted) {
      upstreamHeaders.Range = rangeHeader;
    }

    if (rangeHeader && media.encrypted) {
      const probe = await fetchWithTimeout(media.url, {
        headers: { ...upstreamHeaders, Range: "bytes=0-0" },
      });
      const totalLength = totalLengthFromHeaders(probe.headers);
      await probe.body?.cancel();
      if (!probe.ok || !totalLength) return jsonError("Suno 播放來源目前無法載入。", 502);

      const range = parseByteRange(rangeHeader, totalLength);
      if (!range) return rangeNotSatisfiable(totalLength);

      const rights = await sunoRights(media.trackId);
      const alignedStart = Math.floor(range.start / 16) * 16;
      const rangeUpstream = await fetchWithTimeout(media.url, {
        headers: {
          ...upstreamHeaders,
          Range: `bytes=${alignedStart}-${range.end}`,
        },
      });
      if (!rangeUpstream.ok || rangeUpstream.status !== 206 || !rangeUpstream.body) {
        return jsonError("Suno 播放來源目前無法載入。", 502);
      }

      const encrypted = Buffer.from(await rangeUpstream.arrayBuffer());
      const decipher = createDecipheriv(
        `aes-${rights.key.length * 8}-ctr`,
        rights.key,
        counterAtByteOffset(rights.iv, alignedStart),
      );
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      const outputStart = range.start - alignedStart;
      const output = decrypted.subarray(outputStart, outputStart + range.end - range.start + 1);
      if (output.byteLength !== range.end - range.start + 1) {
        return jsonError("Suno 播放來源目前無法載入。", 502);
      }

      const headers = responseHeaders(String(output.byteLength));
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${totalLength}`);
      return new Response(output, { status: 206, headers });
    }

    const upstream = await fetchWithTimeout(media.url, {
      headers: upstreamHeaders,
    });
    if (!upstream.ok || !upstream.body) return jsonError("Suno 播放來源目前無法載入。", 502);

    if (!media.encrypted) {
      const headers = responseHeaders(upstream.headers.get("content-length"), upstream.headers.get("content-type") || "audio/mp4");
      const contentRange = upstream.headers.get("content-range");
      if (contentRange) headers.set("Content-Range", contentRange);
      return new Response(upstream.body, { status: upstream.status, headers });
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
