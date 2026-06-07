const BATTLE_GUEST_KEY = "aipoger:battle-guest-id-v1";

export function createBattleGuestId() {
  const cryptoApi = typeof crypto !== "undefined" ? crypto : null;
  const random =
    cryptoApi?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `guest-${random}`.slice(0, 80);
}

export function getBattleGuestId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(BATTLE_GUEST_KEY);
    if (existing?.startsWith("guest-")) return existing;
    const next = createBattleGuestId();
    window.localStorage.setItem(BATTLE_GUEST_KEY, next);
    return next;
  } catch {
    return createBattleGuestId();
  }
}

export function battleGuestDisplayName(guestId: string) {
  const suffix = guestId.replace(/^guest-/, "").replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase();
  return `AIPO-${suffix || "LIVE"}`;
}
