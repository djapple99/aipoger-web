import type { SupabaseClient } from "@supabase/supabase-js";

export const EARWORM_AFFINITY_MIN_SAMPLES = 20;

export type EarwormAffinityMetric = {
  sampleCount: number;
  percent: number | null;
};

type EarwormAffinityRow = {
  track_id?: string | null;
  sample_count?: number | string | null;
  affinity_percent?: number | string | null;
};

export function calculateEarwormAffinityPercent(scores: number[]) {
  const validScores = scores.filter((score) => Number.isFinite(score) && score >= 0 && score <= 4);
  if (validScores.length === 0) return null;
  return Math.round((validScores.reduce((sum, score) => sum + score, 0) / (validScores.length * 4)) * 100);
}

export function publicEarwormAffinity(sampleCount: number, percent: number | null): EarwormAffinityMetric {
  const safeSampleCount = Number.isFinite(sampleCount) ? Math.max(0, Math.round(sampleCount)) : 0;
  const safePercent = typeof percent === "number" && Number.isFinite(percent)
    ? Math.min(100, Math.max(0, Math.round(percent)))
    : null;
  return {
    sampleCount: safeSampleCount,
    percent: safeSampleCount >= EARWORM_AFFINITY_MIN_SAMPLES ? safePercent : null,
  };
}

export function isEarwormAffinitySchemaMissing(error: unknown) {
  const text = error && typeof error === "object"
    ? `${(error as { message?: string }).message ?? ""} ${(error as { details?: string }).details ?? ""} ${(error as { code?: string }).code ?? ""}`
    : String(error ?? "");
  return /earworm_track_affinity_stats|earworm_track_reactions|schema cache|does not exist|PGRST205/i.test(text);
}

export async function readEarwormAffinityMap(admin: SupabaseClient, trackIds: string[]) {
  const ids = Array.from(new Set(trackIds.filter(Boolean)));
  const affinityByTrackId = new Map<string, EarwormAffinityMetric>();
  if (ids.length === 0) return affinityByTrackId;

  const result = await admin
    .from("earworm_track_affinity_stats")
    .select("track_id,sample_count,affinity_percent")
    .in("track_id", ids);
  if (result.error) {
    if (isEarwormAffinitySchemaMissing(result.error)) return affinityByTrackId;
    throw result.error;
  }

  for (const row of (result.data ?? []) as EarwormAffinityRow[]) {
    const trackId = row.track_id?.trim() ?? "";
    if (!trackId) continue;
    affinityByTrackId.set(trackId, publicEarwormAffinity(Number(row.sample_count), Number(row.affinity_percent)));
  }
  return affinityByTrackId;
}
