import { type EarwormPersonalityResult } from "./earworm.ts";
import { isCurrentMusicGenre } from "./music-genres.ts";

export const EARWORM_PROFILE_STORAGE_KEY = "aipoger-earworm-profile-v1";
export const EARWORM_PROMPT_SKIP_STORAGE_KEY = "aipoger-earworm-prompt-skip-v1";
export const EARWORM_PROFILE_PROMPT_FRESH_MS = 30 * 24 * 60 * 60 * 1000;
export const EARWORM_PROMPT_SKIP_MS = 7 * 24 * 60 * 60 * 1000;

export type EarwormLocalProfile = {
  version: 2;
  primaryGenre: string;
  secondaryGenres: string[];
  keywords: string[];
  completedAt: number;
};

function validTimestamp(value: unknown) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
}

export function parseEarwormLocalProfile(value: unknown): EarwormLocalProfile | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<Omit<EarwormLocalProfile, "version">> & { version?: unknown };
  const completedAt = validTimestamp(candidate.completedAt);
  const primaryGenre = candidate.primaryGenre;
  if (
    (candidate.version !== 1 && candidate.version !== 2) ||
    !completedAt ||
    typeof primaryGenre !== "string" ||
    !isCurrentMusicGenre(primaryGenre) ||
    !Array.isArray(candidate.secondaryGenres) ||
    !Array.isArray(candidate.keywords)
  ) return null;

  return {
    version: 2,
    primaryGenre,
    secondaryGenres: candidate.secondaryGenres.filter(isCurrentMusicGenre).slice(0, 2),
    keywords: candidate.keywords.filter((keyword): keyword is string => typeof keyword === "string" && Boolean(keyword.trim())).slice(0, 3),
    completedAt,
  };
}

export function buildEarwormLocalProfile(
  result: EarwormPersonalityResult,
  completedAt = Date.now(),
): EarwormLocalProfile {
  return {
    version: 2,
    primaryGenre: result.primaryGenre,
    secondaryGenres: result.secondaryGenres.slice(0, 2),
    keywords: result.keywords.slice(0, 3),
    completedAt,
  };
}

export function readEarwormLocalProfile(): EarwormLocalProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(EARWORM_PROFILE_STORAGE_KEY);
    const profile = raw ? parseEarwormLocalProfile(JSON.parse(raw)) : null;
    if (profile && raw !== JSON.stringify(profile)) {
      window.localStorage.setItem(EARWORM_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    }
    return profile;
  } catch {
    return null;
  }
}

export function writeEarwormLocalProfile(profile: EarwormLocalProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EARWORM_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.localStorage.removeItem(EARWORM_PROMPT_SKIP_STORAGE_KEY);
  } catch {
    // The result screen still works when storage is unavailable.
  }
}

export function markEarwormPromptSkipped(now = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(EARWORM_PROMPT_SKIP_STORAGE_KEY, String(now));
  } catch {
    // A blocked storage API should not prevent browsing.
  }
}

export function shouldPromptForEarworm(options: {
  profile: EarwormLocalProfile | null;
  skippedAt: number | null;
  search: string;
  hash: string;
  now?: number;
}) {
  const now = options.now ?? Date.now();
  if (options.hash && options.hash !== "#works") return false;
  const params = new URLSearchParams(options.search);
  const hasIntent = Array.from(params.keys()).some((key) => key !== "lang");
  if (hasIntent) return false;
  if (options.profile && now - options.profile.completedAt < EARWORM_PROFILE_PROMPT_FRESH_MS) return false;
  if (options.skippedAt && now - options.skippedAt < EARWORM_PROMPT_SKIP_MS) return false;
  return true;
}

export function shouldPromptForEarwormFromBrowser(profile = readEarwormLocalProfile(), now = Date.now()) {
  if (typeof window === "undefined") return false;
  try {
    const skippedAt = validTimestamp(window.localStorage.getItem(EARWORM_PROMPT_SKIP_STORAGE_KEY));
    return shouldPromptForEarworm({
      profile,
      skippedAt,
      search: window.location.search,
      hash: window.location.hash,
      now,
    });
  } catch {
    return false;
  }
}
