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
// Both terms are 0..1. Ten neutral prior observations soften tiny blind samples.
// No-sample works receive neutral confidence, not a negative rating.
export function popularityScore(hearts: number, maxHearts: number, blind: BlindSummary) {
  const people = Math.max(0, blind.people);
  const points = Math.max(0, Math.min(people, blind.preferencePoints));
  const heartRate = maxHearts > 0 ? Math.min(1, Math.max(0, hearts) / maxHearts) : 0;
  const preference = (points + 5) / (people + 10);
  return Math.round((50 * heartRate + 50 * preference) * 10000) / 10000;
}
