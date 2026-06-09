"use client";

import { AIPOGER_PERSONAL_RANK, isAipogerIdentity, rankLabelForLevel } from "@/lib/battle-pool-rules";

export type BattleFeedbackKey = "rhyme" | "impact" | "melody" | "emotion" | "structure";
export type BattleFeedbackCounts = Record<BattleFeedbackKey, number>;

export type SongBattleStatsSnapshot = {
  battleCount: number;
  wins: number;
  losses: number;
  noContests: number;
  totalVotesFor: number;
  totalVotesAgainst: number;
  honorBoardCount: number;
  winRate: number;
};

export type ArchivedBattleResult = {
  id: string;
  battleId?: string | null;
  battleCode: string;
  winnerSide?: "fighter_a" | "fighter_b" | null;
  winnerName: string;
  winnerSong: string;
  opponentName: string;
  opponentSong: string;
  rank: string;
  tool: string;
  genre: string;
  coverUrl: string;
  avatarUrl: string;
  opponentCoverUrl?: string | null;
  opponentAvatarUrl?: string | null;
  finalVoteLeft: number;
  finalVoteRight: number;
  votesTotal: number;
  audienceCount?: number;
  officialAudienceMin?: number;
  audienceReview: string;
  aiReview: string;
  feedbackA: BattleFeedbackCounts;
  feedbackB: BattleFeedbackCounts;
  resultHref: string;
  audioUrl?: string;
  songStats?: SongBattleStatsSnapshot | null;
  createdAt: string;
};

const ARCHIVE_KEY = "aipoger:battle-result-archive-v1";
export const BATTLE_RESULT_ARCHIVE_EVENT = "aipoger:battle-result-archive-updated";

const feedbackKeys: BattleFeedbackKey[] = ["rhyme", "impact", "melody", "emotion", "structure"];
const cannedReviewPatterns = [
  /旋律入口明確/,
  /Hook 記憶點集中/,
  /副歌一進來就有畫面/,
  /短短幾秒就讓人想重聽/,
  /Clear melodic entry/i,
  /The hook lands fast/i,
];

export function emptyBattleFeedbackCounts(): BattleFeedbackCounts {
  return { rhyme: 0, impact: 0, melody: 0, emotion: 0, structure: 0 };
}

export function sanitizeBattleFeedbackCounts(value: unknown): BattleFeedbackCounts {
  const source = typeof value === "object" && value !== null ? (value as Partial<Record<BattleFeedbackKey, unknown>>) : {};
  return feedbackKeys.reduce<BattleFeedbackCounts>((acc, key) => {
    const raw = source[key];
    const parsed = typeof raw === "number" ? raw : Number(raw);
    acc[key] = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
    return acc;
  }, emptyBattleFeedbackCounts());
}

export function sanitizeSongBattleStatsSnapshot(value: unknown): SongBattleStatsSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const source = value as Partial<Record<keyof SongBattleStatsSnapshot, unknown>>;
  const numberField = (key: keyof SongBattleStatsSnapshot) => {
    const parsed = Number(source[key]);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  };
  const battleCount = numberField("battleCount");
  const wins = numberField("wins");
  return {
    battleCount,
    wins,
    losses: numberField("losses"),
    noContests: numberField("noContests"),
    totalVotesFor: numberField("totalVotesFor"),
    totalVotesAgainst: numberField("totalVotesAgainst"),
    honorBoardCount: numberField("honorBoardCount"),
    winRate: battleCount > 0 ? numberField("winRate") || Math.round((wins / battleCount) * 100) : 0,
  };
}

export function parseBattleFeedbackParam(raw: string | null): BattleFeedbackCounts {
  if (!raw) return emptyBattleFeedbackCounts();
  try {
    return sanitizeBattleFeedbackCounts(JSON.parse(raw));
  } catch {
    return emptyBattleFeedbackCounts();
  }
}

export function stripCannedBattleReview(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  return cannedReviewPatterns.some((pattern) => pattern.test(text)) ? "" : text;
}

export function looksLikeOpaqueArchiveValue(value: unknown) {
  const text = String(value || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text);
}

function sanitizeArchiveEntry(value: unknown): ArchivedBattleResult | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as Partial<ArchivedBattleResult>;
  const id = String(row.id || row.battleCode || "").trim();
  const battleCode = String(row.battleCode || id).trim();
  const winnerName = String(row.winnerName || "").trim();
  const winnerSong = String(row.winnerSong || "").trim();
  const opponentName = String(row.opponentName || "").trim();
  const opponentSong = String(row.opponentSong || "").trim();
  if (!id || !battleCode || !winnerName || !winnerSong) return null;
  const rank = String(row.rank || "").trim();
  const safeRank =
    rank === AIPOGER_PERSONAL_RANK && !isAipogerIdentity(winnerName)
      ? rankLabelForLevel(1, winnerName)
      : rank;

  return {
    id,
    battleId: row.battleId ?? null,
    battleCode,
    winnerSide: row.winnerSide === "fighter_a" || row.winnerSide === "fighter_b" ? row.winnerSide : null,
    winnerName,
    winnerSong,
    opponentName,
    opponentSong,
    rank: safeRank,
    tool: String(row.tool || "").trim(),
    genre: String(row.genre || "").trim(),
    coverUrl: String(row.coverUrl || "").trim(),
    avatarUrl: String(row.avatarUrl || "").trim(),
    opponentCoverUrl: row.opponentCoverUrl ?? null,
    opponentAvatarUrl: row.opponentAvatarUrl ?? null,
    finalVoteLeft: Math.max(0, Number(row.finalVoteLeft) || 0),
    finalVoteRight: Math.max(0, Number(row.finalVoteRight) || 0),
    votesTotal: Math.max(0, Number(row.votesTotal) || 0),
    audienceCount: Math.max(0, Number(row.audienceCount) || 0),
    officialAudienceMin: Math.max(0, Number(row.officialAudienceMin) || 0),
    audienceReview: stripCannedBattleReview(row.audienceReview),
    aiReview: stripCannedBattleReview(row.aiReview),
    feedbackA: sanitizeBattleFeedbackCounts(row.feedbackA),
    feedbackB: sanitizeBattleFeedbackCounts(row.feedbackB),
    resultHref: String(row.resultHref || "").trim(),
    audioUrl: typeof row.audioUrl === "string" ? row.audioUrl.trim() : undefined,
    songStats: sanitizeSongBattleStatsSnapshot(row.songStats),
    createdAt: String(row.createdAt || new Date().toISOString()),
  };
}

export function readArchivedBattleResults(): ArchivedBattleResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeArchiveEntry)
      .filter((item): item is ArchivedBattleResult => Boolean(item))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function upsertArchivedBattleResult(entry: ArchivedBattleResult) {
  if (typeof window === "undefined") return;
  const clean = sanitizeArchiveEntry(entry);
  if (!clean) return;
  const current = readArchivedBattleResults();
  const next = [clean, ...current.filter((item) => item.id !== clean.id && item.battleCode !== clean.battleCode)].slice(0, 30);
  window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BATTLE_RESULT_ARCHIVE_EVENT, { detail: clean }));
}
