/** 未登入或尚未寫入 DB 時，鬥士名稱後援來源 */
export const FIGHTER_NAME_LS_KEY = "aipoger_last_fighter_name";

export function readFighterNameFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(FIGHTER_NAME_LS_KEY);
  const t = v?.trim();
  return t && t.length > 0 ? t : null;
}

export function writeFighterNameToStorage(name: string) {
  const t = name.trim();
  if (!t || typeof window === "undefined") return;
  try {
    localStorage.setItem(FIGHTER_NAME_LS_KEY, t);
  } catch {
    /* ignore quota */
  }
}
