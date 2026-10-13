import { createClient } from "@supabase/supabase-js";

export function mvReviewAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing review configuration");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function mvRatingSummaries(admin = mvReviewAdmin()) {
  const { data, error } = await admin.rpc("mv_rating_summaries");
  if (error || !Array.isArray(data)) throw new Error("Ratings unavailable");
  return new Map<string, { ratingAverage: number | null; ratingCount: number }>(data.map(row =>
    [row.track_id, { ratingAverage: Number(row.average), ratingCount: Number(row.people) }]));
}
