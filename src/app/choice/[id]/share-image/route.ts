import { isChoiceStorageCover } from "@/lib/choice-share-cover";
import { loadChoiceShareMetadata } from "@/lib/server-choice-share-metadata";
import { shareImageResponse } from "@/lib/server-share-image";
export const runtime = "nodejs";
export const preferredRegion = "hnd1";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const choice = await loadChoiceShareMetadata((await params).id);
    if (!choice || !isChoiceStorageCover(choice.imageUrl)) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    return shareImageResponse(choice.imageUrl);
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
