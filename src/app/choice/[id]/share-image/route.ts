import sharp from "sharp";
import { isChoiceStorageCover } from "@/lib/choice-share-cover";
import { loadChoiceShareMetadata } from "@/lib/server-choice-share-metadata";

export const runtime = "nodejs";
export const preferredRegion = "hnd1";
const MAX_BYTES = 10 * 1024 * 1024;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const choice = await loadChoiceShareMetadata(id);
    if (!choice || !isChoiceStorageCover(choice.imageUrl)) {
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const source = await fetch(choice.imageUrl, { redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!source.ok || !source.headers.get("content-type")?.startsWith("image/")
      || Number(source.headers.get("content-length")) > MAX_BYTES) throw new Error("Cover unavailable");
    const input = await source.arrayBuffer();
    if (input.byteLength > MAX_BYTES) throw new Error("Cover too large");
    // Preserve the full authored artwork, including non-square covers. JPEG is
    // predictable for chat crawlers regardless of the uploaded file format.
    const image = await sharp(Buffer.from(input), { limitInputPixels: 64_000_000 })
      .rotate().resize(800, 800, { fit: "contain", background: "#101010" })
      .flatten({ background: "#101010" }).jpeg({ quality: 80 }).toBuffer();
    return new Response(new Uint8Array(image), { headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(image.byteLength),
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    console.error("[choice-share-image] Cover unavailable", error);
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
