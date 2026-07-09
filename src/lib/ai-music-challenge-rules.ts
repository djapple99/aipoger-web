import { battleSideForDeck, firstDeckForBattleId, type BattleDeck, type BattleSide, type PredictionCounts } from "./battle-90s-system.ts";

export const AI_MUSIC_CHALLENGE_BATTLE_TYPE = "ai_music_challenge";
export const AI_MUSIC_CHALLENGE_DAILY_INVITE_LIMIT = 6;
export const AI_MUSIC_EXPLORE_FORMAL_LOSS_RETIREMENT_LIMIT = 8;

export const AI_MUSIC_CHALLENGE_STATUSES = ["showcase", "open", "custom"] as const;
export type AiMusicChallengeStatus = (typeof AI_MUSIC_CHALLENGE_STATUSES)[number];

export function isAiMusicChallengeStatus(value: unknown): value is AiMusicChallengeStatus {
  return AI_MUSIC_CHALLENGE_STATUSES.includes(value as AiMusicChallengeStatus);
}

export function normalizeAiMusicChallengeStatus(value: unknown): AiMusicChallengeStatus {
  return isAiMusicChallengeStatus(value) ? value : "showcase";
}

export function hasPreparedAiMusicDefenderDrop(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isAiMusicChallengeReady(status: unknown, defenderDropAudioPath: unknown): boolean {
  return normalizeAiMusicChallengeStatus(status) === "open" && hasPreparedAiMusicDefenderDrop(defenderDropAudioPath);
}

export function shouldRetireAiMusicTrackFromExplore(stats: {
  officialLosses?: number | null;
  isShowtimeCertified?: boolean | null;
}): boolean {
  const losses = Math.max(0, Math.floor(Number(stats.officialLosses ?? 0)));
  return !stats.isShowtimeCertified && losses >= AI_MUSIC_EXPLORE_FORMAL_LOSS_RETIREMENT_LIMIT;
}

export function isAiMusicTrackChallengeableOnExplore(
  status: unknown,
  defenderDropAudioPath: unknown,
  lifecycle: { officialLosses?: number | null; isShowtimeCertified?: boolean | null } = {},
): boolean {
  return isAiMusicChallengeReady(status, defenderDropAudioPath)
    && !lifecycle.isShowtimeCertified
    && !shouldRetireAiMusicTrackFromExplore(lifecycle);
}

export function isAiMusicChallengeBattleType(value: unknown): boolean {
  return value === AI_MUSIC_CHALLENGE_BATTLE_TYPE;
}

export function pickDropBattleWinnerForRules(
  counts: PredictionCounts,
  battleId: string,
  tieBreakerDeck?: BattleDeck | null,
  battleType?: string | null,
): BattleSide | null {
  if (counts.fighter_a + counts.fighter_b <= 0) return null;
  if (counts.fighter_a > counts.fighter_b) return "fighter_a";
  if (counts.fighter_b > counts.fighter_a) return "fighter_b";
  if (isAiMusicChallengeBattleType(battleType)) return "fighter_a";
  return battleSideForDeck(tieBreakerDeck ?? firstDeckForBattleId(battleId));
}

export function aiMusicChallengeStatusLabel(status: AiMusicChallengeStatus, lang: "zh" | "en" | string = "zh") {
  if (lang === "en") {
    if (status === "open") return "Open to Drop challenge";
    if (status === "custom") return "Custom battle";
    return "Showcase only";
  }
  if (status === "open") return "等人挑戰";
  if (status === "custom") return "自定開戰";
  return "僅展示";
}
