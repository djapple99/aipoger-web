export const EARWORM_REWARD_POINTS = 5;
export const EARWORM_MIN_LISTEN_SECONDS = 8;
export const EARWORM_MAX_EXPLANATION_LENGTH = 280;

export type EarwormSelection = "a" | "b" | "neither";

export function isEarwormSelection(value: unknown): value is EarwormSelection {
  return value === "a" || value === "b" || value === "neither";
}

export function earwormTaskKey(genre: string, trackAId: string, trackBId: string) {
  return `earworm:${genre}:${trackAId}:${trackBId}`;
}
