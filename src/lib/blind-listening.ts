export const BLIND_START = 15;
export const BLIND_END = 45;
export const BLIND_SECONDS = 30;
export const BLIND_MIN_SECONDS = 8;
export const BLIND_CREDIT = 3;
export type BlindChoice = "A" | "B" | "tie";
export type BlindSide = "A" | "B";
export function blindPairKey(a: string, b: string) { return [a, b].sort().join(":"); }
export function isBlindChoice(value: unknown): value is BlindChoice { return value === "A" || value === "B" || value === "tie"; }
export type BlindSummary = { people: number; preferencePoints: number };
// Cumulative audience support: one retained heart = 3, one blind preference = 3.
// Blind summaries already average each listener's choices per work (tie = 0.5).
// Each listener's latest 1..10 work rating contributes its actual decimal score.
export function popularityScore(hearts: number, blind: BlindSummary, ratingTotal = 0) {
  const positive = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const people = positive(blind.people);
  const points = Math.min(people, positive(blind.preferencePoints));
  return Math.round((3 * positive(hearts) + 3 * points + positive(ratingTotal)) * 1e6) / 1e6;
}
