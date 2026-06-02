export const WAITING_ROOM_SECONDS = 90;
export const TEASER_SECONDS = 5;
export const HUMAN_MATCH_TIMEOUT_SECONDS = 30;
export const APC_SUPPORT_MAX = 88;
export const APC_CORRECT_FINAL_VOTE_REWARD = 100;

export const PREDICTION_STAKES = [APC_SUPPORT_MAX] as const;
export type PredictionStake = (typeof PREDICTION_STAKES)[number];
export type BattleSide = "fighter_a" | "fighter_b";

export type PredictionCounts = {
  fighter_a: number;
  fighter_b: number;
};

export type ViewerLevel = {
  title: string;
  minXp: number;
};

export const VIEWER_LEVELS: ViewerLevel[] = [
  { title: "Rookie Listener", minXp: 0 },
  { title: "Drop Analyst", minXp: 120 },
  { title: "Trend Hunter", minXp: 420 },
  { title: "Battle Oracle", minXp: 900 },
];

export function isPredictionStake(value: number): value is PredictionStake {
  return PREDICTION_STAKES.includes(value as PredictionStake);
}

export function predictionPercentages(counts: PredictionCounts): PredictionCounts {
  const total = counts.fighter_a + counts.fighter_b;
  if (total <= 0) return { fighter_a: 50, fighter_b: 50 };
  const left = Math.round((counts.fighter_a / total) * 100);
  return { fighter_a: left, fighter_b: 100 - left };
}

export function secondsUntilBattleStart(waitingStartedAtMs: number, nowMs: number): number {
  if (!Number.isFinite(waitingStartedAtMs) || !Number.isFinite(nowMs)) return WAITING_ROOM_SECONDS;
  const elapsed = Math.max(0, Math.floor((nowMs - waitingStartedAtMs) / 1000));
  return Math.max(0, WAITING_ROOM_SECONDS - elapsed);
}

export function predictionRewardForStake(stake: number, correct: boolean): number {
  if (!correct) return 0;
  if (!isPredictionStake(stake)) return 0;
  return APC_CORRECT_FINAL_VOTE_REWARD;
}

export function predictionXpForStake(stake: number, correct: boolean): number {
  const safeStake = isPredictionStake(stake) ? stake : 0;
  return Math.round(safeStake / 11) + (correct ? 20 : 4);
}

export function viewerLevelForXp(xp: number): ViewerLevel {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  return [...VIEWER_LEVELS].reverse().find((level) => safeXp >= level.minXp) ?? VIEWER_LEVELS[0];
}

export function eloDeltaForBattle(winnerElo: number, loserElo: number, kFactor = 32): number {
  const expected = 1 / (1 + 10 ** ((loserElo - winnerElo) / 400));
  return Math.round(kFactor * (1 - expected));
}
