export const DAILY_BATTLE_DURATION_HOURS = 24;
export const DAILY_BATTLE_ACTIVE_LIMIT = 1;
export const DAILY_BATTLE_PUBLIC_ACTIVE_LIMIT = 88;
export const DAILY_BATTLE_HOME_FEATURED_LIMIT = 3;
export const DAILY_BATTLE_PAGE_LIMIT = 12;

export type DailyBattleEntryStatus = "queued" | "matched" | "live" | "finished" | "cancelled" | "expired";
export const ACTIVE_DAILY_BATTLE_STATUSES: DailyBattleEntryStatus[] = ["queued", "matched", "live"];

export type DailyBattleEntry = {
  userId: string;
  status: DailyBattleEntryStatus;
};

export function isActiveDailyBattleStatus(status: DailyBattleEntryStatus): boolean {
  return ACTIVE_DAILY_BATTLE_STATUSES.includes(status);
}

export function dailyBattleActiveCountForUser(entries: DailyBattleEntry[], userId: string): number {
  return entries.filter((entry) => entry.userId === userId && isActiveDailyBattleStatus(entry.status)).length;
}

export function canSubmitDailyBattle(entries: DailyBattleEntry[], userId: string): boolean {
  return dailyBattleActiveCountForUser(entries, userId) < DAILY_BATTLE_ACTIVE_LIMIT;
}
