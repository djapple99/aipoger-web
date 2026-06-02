const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/;

function normalizeUuid(value: string | null | undefined): string | null {
  const raw = value?.trim().toLowerCase();
  return raw && UUID_PATTERN.test(raw) ? raw : null;
}

function bytesToBinary(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return binary;
}

function binaryToBytes(binary: string) {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function uuidToShortBattleCode(value: string | null | undefined): string | null {
  const uuid = normalizeUuid(value);
  if (!uuid) return null;

  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let index = 0; index < 16; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return btoa(bytesToBinary(bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function shortBattleCodeToUuid(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const uuid = normalizeUuid(raw);
  if (uuid) return uuid;
  if (!SHORT_CODE_PATTERN.test(raw)) return null;

  try {
    const base64 = raw.replace(/-/g, "+").replace(/_/g, "/").padEnd(24, "=");
    const bytes = binaryToBytes(atob(base64));
    if (bytes.length !== 16) return null;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}

export function dailyChallengeSharePath(entryId: string, lang: string) {
  const code = uuidToShortBattleCode(entryId) ?? entryId;
  const params = new URLSearchParams();
  if (lang === "zh" || lang === "en") params.set("lang", lang);
  const query = params.toString();
  return `/d/${encodeURIComponent(code)}${query ? `?${query}` : ""}`;
}

export function dailyChallengeWaitingRoomPath(entryId: string, lang: string) {
  const params = new URLSearchParams();
  if (lang === "zh" || lang === "en") params.set("lang", lang);
  const query = params.toString();
  return `/battle/daily/waiting-room/${encodeURIComponent(entryId)}${query ? `?${query}` : ""}`;
}

export function dailyChallengeSetupPath(entryId: string, lang: string) {
  const params = new URLSearchParams({
    battleMode: "daily",
    dailyPairing: "invite",
    challengeDailyEntryId: entryId,
  });
  if (lang === "zh" || lang === "en") params.set("lang", lang);
  return `/battle/setup?${params.toString()}`;
}
