/** Owner-approved seasonal exposure, Taipei time; never changes votes or publication. */
export const HALLOWEEN_MV_PROMOTION = {
  workId: "fda62063-417c-4d81-b3d7-b7d2d58f15f7",
  startsAt: "2026-10-27T00:00:00+08:00",
  endsAt: "2026-11-01T00:00:00+08:00",
} as const;

export function activeMvPromotion<T extends { id: string; videoId: string | null; workKind?: string }>(publicWorks: T[], now = new Date()) {
  const time = now.getTime();
  if (!(time >= Date.parse(HALLOWEEN_MV_PROMOTION.startsAt) && time < Date.parse(HALLOWEEN_MV_PROMOTION.endsAt))) return null;
  const work = publicWorks.find(work => work.id === HALLOWEEN_MV_PROMOTION.workId && work.videoId && work.workKind !== "album");
  return work ? { work, endsAt: HALLOWEEN_MV_PROMOTION.endsAt } : null;
}

/** Don't serve a cached seasonal recommendation across its deadline. */
export function homeDiscoveryCacheControl(now = new Date()) {
  const untilEnd = (Date.parse(HALLOWEEN_MV_PROMOTION.endsAt) - now.getTime()) / 1000;
  if (untilEnd >= 0 && untilEnd <= 60) return "no-store";
  return "public, max-age=15, s-maxage=15, stale-while-revalidate=30";
}
