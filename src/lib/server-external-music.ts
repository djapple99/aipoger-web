import { createHmac, timingSafeEqual } from "node:crypto";
import { parseExternalMusic, type ExternalMusic } from "@/lib/external-music";
export type LinkPreview = {
  media: ExternalMusic;
  title: string;
  artist: string;
  coverUrl: string;
  token: string;
};
function key() {
  const k =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!k) throw new Error("Missing signing key");
  return k;
}
export function signLinkPreview(
  userId: string,
  media: ExternalMusic,
  metadata: { title: string; artist: string; coverUrl: string },
  now = Date.now(),
) {
  const payload = Buffer.from(
    JSON.stringify({ userId, media, ...metadata, expires: now + 30 * 60_000 }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", key())
      .update("creator-link-preview:" + payload)
      .digest("base64url")
  );
}
export function verifyLinkPreview(
  token: unknown,
  userId: string,
  now = Date.now(),
): (Omit<LinkPreview, "token"> & { expires: number }) | null {
  if (typeof token !== "string" || token.length > 12000) return null;
  const [payload, sig, ...extra] = token.split(".");
  if (!payload || !sig || extra.length) return null;
  const expected = createHmac("sha256", key())
    .update("creator-link-preview:" + payload)
    .digest();
  const actual = Buffer.from(sig, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    const media = parseExternalMusic(p.media?.url);
    return p.userId === userId &&
      p.expires > now &&
      media &&
      media.mediaId === p.media.mediaId &&
      media.provider === p.media.provider
      ? { ...p, media }
      : null;
  } catch {
    return null;
  }
}
async function boundedText(response: Response) {
  if (!response.ok || !response.body) throw new Error("SOURCE_UNAVAILABLE");
  const reader = response.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.byteLength;
      if (size > 1_500_000) throw new Error("SOURCE_TOO_LARGE");
      chunks.push(r.value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString("utf8");
}
const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, (raw, hex, decimal) => {
      const point = parseInt(hex ?? decimal, hex ? 16 : 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : raw;
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
function meta(html: string, name: string) {
  const tags = html.match(/<meta\s[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (new RegExp(`(?:property|name)=["']${name}["']`, "i").test(tag)) {
      const v = tag.match(/content=(["'])(.*?)\1/i)?.[2];
      if (v) return decode(v);
    }
  }
  return "";
}
function safeCover(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      /^(i\.ytimg\.com|img\.youtube\.com|i\.scdn\.co|image-cdn-[\w-]+\.spotifycdn\.com|cdn\d?\.suno\.ai|cdn-o\.suno\.com)$/.test(
        u.hostname,
      )
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export async function resolveLinkPreview(
  raw: unknown,
  userId: string,
): Promise<LinkPreview> {
  let media = parseExternalMusic(raw);
  // Resolve official Suno short shares with a single guarded redirect, never arbitrary hosts.
  if (!media && typeof raw === "string") {
    const u = new URL(raw);
    if (
      u.protocol === "https:" &&
      ["suno.com", "www.suno.com"].includes(u.hostname) &&
      !u.username &&
      !u.password &&
      !u.port &&
      /^\/s\/[\w-]+\/?$/.test(u.pathname)
    ) {
      const r = await fetch(u.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      media = parseExternalMusic(
        new URL(r.headers.get("location") ?? "", u).href,
      );
      if (media?.provider !== "suno") media = null;
    }
  }
  if (!media) throw new Error("UNSUPPORTED_LINK");
  const endpoint =
    media.provider === "youtube"
      ? `https://www.youtube.com/oembed?url=${encodeURIComponent(media.url)}&format=json`
      : media.provider === "spotify"
        ? `https://open.spotify.com/oembed?url=${encodeURIComponent(media.url)}`
        : media.url;
  const response = await fetch(endpoint, {
    redirect: "error",
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  const body = await boundedText(response);
  let title = "",
    artist = "",
    coverUrl = "";
  if (media.provider === "suno") {
    title = meta(body, "og:title").replace(/\s*\|\s*Suno.*$/i, "");
    coverUrl = meta(body, "og:image");
    if (!title) throw new Error("SOURCE_UNAVAILABLE");
  } else {
    const p = JSON.parse(body);
    title = p.title ?? "";
    artist = p.author_name ?? "";
    coverUrl = p.thumbnail_url ?? "";
  }
  const metadata = {
    title: String(title).trim().slice(0, 160),
    artist: String(artist).trim().slice(0, 80),
    coverUrl: safeCover(coverUrl),
  };
  if (!metadata.title) throw new Error("SOURCE_UNAVAILABLE");
  return {
    media,
    ...metadata,
    token: signLinkPreview(userId, media, metadata),
  };
}
