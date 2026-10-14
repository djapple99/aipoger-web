import { NextResponse } from "next/server";
import { mvReviewAdmin } from "@/lib/server-mv-reviews";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";
import type { ShowtimeCommunity } from "@/lib/showtime-community";

export const preferredRegion = "hnd1";

export async function GET() {
  try {
    const admin = mvReviewAdmin();
    const { data, error } = await admin.rpc("showtime_community_summary");
    if (error || !data || typeof data !== "object") throw new Error("Showtime summary unavailable");
    const payload = data as Omit<ShowtimeCommunity, "reviews"> & {
      reviews: Array<Omit<ShowtimeCommunity["reviews"][number], "coverUrl"> & { coverPath: string | null }>;
    };
    const reviews = payload.reviews.map(review => ({
      id: review.id, trackId: review.trackId, name: review.name, body: review.body,
      title: review.title, isMv: review.isMv,
      coverUrl: review.coverPath?.trim()
        ? /^https:\/\//i.test(review.coverPath) ? review.coverPath : admin.storage.from(LISTEN_BAR_COVER_BUCKET).getPublicUrl(review.coverPath).data.publicUrl
        : AIPOGER_BRAND_LOGO,
    }));
    const contributors = (rows: ShowtimeCommunity["reviewers"]) => rows.slice(0, 5).map(row => ({ name: row.name, count: row.count }));
    return NextResponse.json({ reviewers: contributors(payload.reviewers), creators: contributors(payload.creators),
      listeners: contributors(payload.listeners), reviews, choiceCommentCounts: payload.choiceCommentCounts,
      generatedAt: payload.generatedAt }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Showtime community unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
