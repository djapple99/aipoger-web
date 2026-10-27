import { AIPOGER_SHARE_IMAGE_PATH } from "@/lib/brand";
import { readPublicWorkDetail } from "@/lib/server-home-discovery";
import { youtubeShareImage } from "@/lib/server-mv-share-metadata";
import { shareImageResponse } from "@/lib/server-share-image";
import { publicSiteUrl } from "@/lib/site-url";
export const runtime = "nodejs";
export const preferredRegion = "hnd1";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const detail = await readPublicWorkDetail((await params).id);
    if (!detail) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    const source = detail.work.videoId ? (await youtubeShareImage(detail.work.videoId)).url
      : detail.work.coverUrl || new URL(AIPOGER_SHARE_IMAGE_PATH, publicSiteUrl()).href;
    return shareImageResponse(source);
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
