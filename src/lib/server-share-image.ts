import "server-only";
import sharp from "sharp";
import { publicSiteUrl } from "@/lib/site-url";

import { canRenderShareCover } from "@/lib/share-cover-source";

export async function shareImageResponse(source: string) {
  if (!canRenderShareCover(source)) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  try {
    const response = await fetch(new URL(source, publicSiteUrl()), { redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/") || Number(response.headers.get("content-length")) > 10 * 1024 * 1024) throw new Error("Cover unavailable");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Cover too large");
    const output = await sharp(Buffer.from(bytes), { limitInputPixels: 64_000_000 }).rotate()
      .resize(1200, 630, { fit: "contain", background: "#101010" }).flatten({ background: "#101010" }).jpeg({ quality: 80 }).toBuffer();
    return new Response(new Uint8Array(output), { headers: { "Content-Type": "image/jpeg", "Content-Length": String(output.byteLength),
      "Cache-Control": "public, max-age=300, s-maxage=300", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("[public-share-image] Thumbnail unavailable", error);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
