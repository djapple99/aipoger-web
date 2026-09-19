import { pickDropBattleWinnerForRules } from "./ai-music-challenge-rules.ts";

export const Q_CRASH_BATTLE_TYPE = "q_crash";
export const Q_CRASH_OFFICIAL_AUDIENCE_MIN = 3;
export const Q_CRASH_INVITE_HOURS = 24;
export const Q_CRASH_DURATION_PRESETS = [30, 120, 720, 1440] as const;
export const Q_CRASH_MIN_DURATION_MINUTES = 30;
export const Q_CRASH_MAX_DURATION_MINUTES = 3 * 24 * 60;
export const Q_CRASH_AUDIO_UPLOAD_ACCEPT =
  "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave,.mp3,.wav,.wave";
export const Q_CRASH_FEEDBACK_KEYS = ["rhyme", "impact", "melody", "emotion", "structure"] as const;
export const Q_CRASH_COMMENT_MAX_LENGTH = 120;

export type QCrashDurationMinutes = number;
export type QCrashSourceType = "suno" | "upload";
export type QCrashSide = "fighter_a" | "fighter_b";
export type QCrashFeedbackKey = (typeof Q_CRASH_FEEDBACK_KEYS)[number];
export type QCrashFeedbackCounts = Record<QCrashFeedbackKey, number>;
export type QCrashCardStatus =
  | "q_crash_pending_invite"
  | "q_crash_joining"
  | "q_crash_voting"
  | "q_crash_finished"
  | "q_crash_insufficient"
  | "q_crash_cancelled";

export type QCrashDisplayLang = "zh" | "en";

/** Q Crash only has Traditional Chinese copy; every other UI language uses English. */
export function qCrashDisplayLang(value: string | null | undefined): QCrashDisplayLang {
  return value === null || value === undefined || value === "zh" ? "zh" : "en";
}

export function qCrashDurationMinutes(value: unknown): QCrashDurationMinutes | null {
  const minutes = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(minutes)) return null;
  return minutes >= Q_CRASH_MIN_DURATION_MINUTES && minutes <= Q_CRASH_MAX_DURATION_MINUTES
    ? minutes
    : null;
}

export function qCrashDurationLabel(minutes: number | null | undefined, isZh: boolean) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return isZh ? "未設定" : "Not set";
  if (value % 1440 === 0) return isZh
    ? String(value / 1440) + " 天"
    : String(value / 1440) + " day" + (value / 1440 === 1 ? "" : "s");
  if (value % 60 === 0) return isZh
    ? String(value / 60) + " 小時"
    : String(value / 60) + " hour" + (value / 60 === 1 ? "" : "s");
  return isZh ? String(value) + " 分鐘" : String(value) + " minutes";
}

export function qCrashSourceType(value: unknown): QCrashSourceType | null {
  return value === "suno" || value === "upload" ? value : null;
}

export function normalizeQCrashSunoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase();
    const isSunoHost = hostname === "suno.com"
      || hostname.endsWith(".suno.com")
      || hostname === "suno.ai"
      || hostname.endsWith(".suno.ai");
    if (url.protocol !== "https:" || !isSunoHost || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isValidQCrashSunoUrl(value: unknown): value is string {
  return normalizeQCrashSunoUrl(value) !== null;
}

export function isValidQCrashAudioFile(file: Pick<File, "name" | "type">): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isAllowedExtension = extension === "mp3" || extension === "wav" || extension === "wave";
  const isAllowedMime = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/vnd.wave",
  ].includes(file.type);
  return isAllowedExtension || isAllowedMime;
}

export function isQCrashOfficialAudienceCount(value: unknown): boolean {
  const count = Number(value);
  return Number.isFinite(count) && count >= Q_CRASH_OFFICIAL_AUDIENCE_MIN;
}

export function isQCrashFeedbackKey(value: unknown): value is QCrashFeedbackKey {
  return typeof value === "string" && Q_CRASH_FEEDBACK_KEYS.includes(value as QCrashFeedbackKey);
}

export function qCrashCommentText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || Array.from(text).length > Q_CRASH_COMMENT_MAX_LENGTH) return null;
  return text;
}

export function emptyQCrashFeedbackCounts(): QCrashFeedbackCounts {
  return {
    rhyme: 0,
    impact: 0,
    melody: 0,
    emotion: 0,
    structure: 0,
  };
}

export function canQCrashAccountJoin(args: {
  status: string | null | undefined;
  founderUserId: string;
  invitedUserId?: string | null;
  viewerUserId?: string | null;
  inviteExpiresAt?: string | null;
  nowMs?: number;
}): boolean {
  if (args.status !== "q_crash_pending_invite" || !args.viewerUserId) return false;
  const expiresMs = new Date(args.inviteExpiresAt ?? "").getTime();
  if (Number.isFinite(expiresMs) && expiresMs <= (args.nowMs ?? Date.now())) return false;
  if (args.viewerUserId === args.founderUserId) return true;
  return !args.invitedUserId || args.viewerUserId === args.invitedUserId;
}

export function isQCrashVotingOpen(args: {
  status: string | null | undefined;
  votingEndsAt?: string | null;
  nowMs?: number;
}): boolean {
  if (args.status !== "q_crash_voting") return false;
  const endMs = new Date(args.votingEndsAt ?? "").getTime();
  return Number.isFinite(endMs) && endMs > (args.nowMs ?? Date.now());
}

export function canQCrashAccountVote(args: {
  status: string | null | undefined;
  votingEndsAt?: string | null;
  viewerUserId?: string | null;
  fighterAUserId?: string | null;
  fighterBUserId?: string | null;
  alreadyVoted?: boolean;
  nowMs?: number;
}): boolean {
  if (!args.viewerUserId || args.alreadyVoted) return false;
  if (args.viewerUserId === args.fighterAUserId || args.viewerUserId === args.fighterBUserId) return false;
  return isQCrashVotingOpen(args);
}

export function canQCrashAccountSendFeedback(args: {
  status: string | null | undefined;
  votingEndsAt?: string | null;
  viewerUserId?: string | null;
  fighterAUserId?: string | null;
  fighterBUserId?: string | null;
  nowMs?: number;
}): boolean {
  if (!args.viewerUserId) return false;
  if (args.viewerUserId === args.fighterAUserId || args.viewerUserId === args.fighterBUserId) return false;
  return isQCrashVotingOpen(args);
}

export function pickQCrashWinner(
  counts: Record<QCrashSide, number>,
  battleId: string,
): QCrashSide | null {
  return pickDropBattleWinnerForRules(counts, battleId, null, Q_CRASH_BATTLE_TYPE);
}

export function qCrashVersionLabels(songA: string | null | undefined, songB: string | null | undefined) {
  const sameTitle = Boolean(songA?.trim() && songA?.trim().localeCompare(songB?.trim() ?? "", undefined, { sensitivity: "base" }) === 0);
  return sameTitle
    ? { A: "版本 A", B: "版本 B" }
    : { A: "作品 A", B: "作品 B" };
}
