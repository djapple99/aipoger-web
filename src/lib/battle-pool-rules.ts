export const INSTANT_MATCH_TIMEOUT_SECONDS = 60;
export const BATTLE_POOL_FALLBACK_HOURS = 24;

export const BATTLE_POINT_REWARDS = {
  stageOneStake: 200,
  stageTwoStake: 300,
  stageThreeStake: 500,
  audienceVoteStake: 50,
  audienceVoteWinPayout: 100,
  publicVotingMin: 5,
  publicVotingMax: 30,
  abandonPenalty: -50,
} as const;

export type BattleRank = {
  level: number;
  minWins: number;
  stage: 1 | 2 | 3;
  stageName: string;
  stageNameEn: string;
  nameCn: string;
  nameEn: string;
  battleStake: 200 | 300 | 500;
  perk?: string;
};

export const AIPOGER_PERSONAL_RANK = "LV.0 掃地僧";

export const BATTLE_RANKS: BattleRank[] = [
  { level: 1, minWins: 0, stage: 1, stageName: "音樂工匠", stageNameEn: "Music Artisan", nameCn: "訊號啟動者", nameEn: "Signal Starter", battleStake: 200 },
  { level: 2, minWins: 10, stage: 1, stageName: "音樂工匠", stageNameEn: "Music Artisan", nameCn: "旋律達人", nameEn: "Melody Crafter", battleStake: 200 },
  { level: 3, minWins: 20, stage: 1, stageName: "音樂工匠", stageNameEn: "Music Artisan", nameCn: "詞曲鬼匠", nameEn: "Lyric Ghost", battleStake: 200 },
  { level: 4, minWins: 40, stage: 2, stageName: "推薦創作者", stageNameEn: "Featured Creator", nameCn: "流行領航員", nameEn: "Pop Navigator", battleStake: 300, perk: "推薦歌曲與 prompt 販售資格" },
  { level: 5, minWins: 60, stage: 2, stageName: "推薦創作者", stageNameEn: "Featured Creator", nameCn: "優美旋律之王", nameEn: "Melody Monarch", battleStake: 300, perk: "推薦歌曲與 prompt 販售資格" },
  { level: 6, minWins: 80, stage: 2, stageName: "推薦創作者", stageNameEn: "Featured Creator", nameCn: "超狂動感領航員", nameEn: "Rhythm Pilot", battleStake: 300, perk: "推薦歌曲與 prompt 販售資格" },
  { level: 7, minWins: 100, stage: 2, stageName: "推薦創作者", stageNameEn: "Featured Creator", nameCn: "魔幻聲空雕塑家", nameEn: "Sonic Sculptor", battleStake: 300, perk: "推薦歌曲與 prompt 販售資格" },
  { level: 8, minWins: 150, stage: 3, stageName: "殿堂級大師", stageNameEn: "Hall Master", nameCn: "百大 DJ 泰坦", nameEn: "Top 100 Titan", battleStake: 500, perk: "頁面空間與推薦歌曲 prompt 販售資格" },
  { level: 9, minWins: 200, stage: 3, stageName: "殿堂級大師", stageNameEn: "Hall Master", nameCn: "靈性薩滿法老王", nameEn: "Spirit Pharaoh", battleStake: 500, perk: "頁面空間與推薦歌曲 prompt 販售資格" },
  { level: 10, minWins: 250, stage: 3, stageName: "殿堂級大師", stageNameEn: "Hall Master", nameCn: "交響樂之教皇", nameEn: "Symphony Pope", battleStake: 500, perk: "頁面空間與推薦歌曲 prompt 販售資格" },
];

export function isAipogerIdentity(name: string | null | undefined): boolean {
  const normalized = name?.trim().toLowerCase().replace(/\s+/g, "") ?? "";
  return ["愛波哥", "我是愛波哥", "aipoger", "aipoger.ai", "aipoger99", "djapple99"].includes(normalized);
}

export function rankLabelForLevel(level: number | null | undefined, name?: string | null): string {
  if (isAipogerIdentity(name)) return AIPOGER_PERSONAL_RANK;
  const rank = rankForLevel(level ?? 1);
  return `Lv.${rank.level} ${rank.nameCn}`;
}

export function rankForWins(wins: number): BattleRank {
  const safeWins = Number.isFinite(wins) ? Math.max(0, Math.floor(wins)) : 0;
  return [...BATTLE_RANKS].reverse().find((rank) => safeWins >= rank.minWins) ?? BATTLE_RANKS[0];
}

export function rankForLevel(level: number): BattleRank {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.min(10, Math.floor(level))) : 1;
  return BATTLE_RANKS.find((rank) => rank.level === safeLevel) ?? BATTLE_RANKS[0];
}

export function battleStakeForLevel(level: number): 200 | 300 | 500 {
  return rankForLevel(level).battleStake;
}

export type BattleEntryStatus =
  | "searching"
  | "waiting"
  | "waiting_challenge"
  | "matched"
  | "active"
  | "completed"
  | "expired"
  | "ghost_battle"
  | "public_voting"
  | "cancelled";

export type BattleFallbackKind = "ghost_battle" | "public_voting";

export function publicVotingReward(score: number): number {
  if (!Number.isFinite(score)) return BATTLE_POINT_REWARDS.publicVotingMin;
  return Math.max(
    BATTLE_POINT_REWARDS.publicVotingMin,
    Math.min(BATTLE_POINT_REWARDS.publicVotingMax, Math.round(score)),
  );
}

export function shouldMoveToWaitingChallenge(
  createdAtMs: number,
  nowMs: number,
  timeoutSeconds = INSTANT_MATCH_TIMEOUT_SECONDS,
): boolean {
  return nowMs - createdAtMs >= timeoutSeconds * 1000;
}

export function shouldRunFallback(
  createdAtMs: number,
  nowMs: number,
  fallbackHours = BATTLE_POOL_FALLBACK_HOURS,
): boolean {
  return nowMs - createdAtMs >= fallbackHours * 60 * 60 * 1000;
}

export function isOpenPoolStatus(status: BattleEntryStatus): boolean {
  return status === "searching" || status === "waiting" || status === "waiting_challenge";
}

export type BattleMatchCandidate = {
  userId: string;
  queueId: string;
  genre: string;
  status: BattleEntryStatus;
  level?: number | null;
};

export function normalizeBattleGenre(genre: string): string {
  return genre.trim();
}

export function canBattleEntriesMatch(
  challenger: BattleMatchCandidate,
  opponent: BattleMatchCandidate,
  targetQueueId?: string | null,
  maxLevelGap = 2,
): boolean {
  if (challenger.userId === opponent.userId) return false;
  if (challenger.queueId === opponent.queueId) return false;
  if (!isOpenPoolStatus(challenger.status) || !isOpenPoolStatus(opponent.status)) return false;
  if (normalizeBattleGenre(challenger.genre) !== normalizeBattleGenre(opponent.genre)) return false;
  if (targetQueueId && opponent.queueId !== targetQueueId) return false;

  const challengerLevel = challenger.level ?? 1;
  const opponentLevel = opponent.level ?? 1;
  return Math.abs(opponentLevel - challengerLevel) <= maxLevelGap;
}
