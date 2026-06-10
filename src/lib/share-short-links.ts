const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE64URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function isUuid(value: string | null | undefined) {
  return UUID_PATTERN.test(String(value || "").trim());
}

export function encodeUuidToBase64Url(uuid: string) {
  const clean = uuid.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(clean)) return uuid;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(Number.parseInt(clean.slice(i, i + 2), 16));
  }

  let output = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    output += BASE64URL_CHARS[(n >> 18) & 63];
    output += BASE64URL_CHARS[(n >> 12) & 63];
    if (i + 1 < bytes.length) output += BASE64URL_CHARS[(n >> 6) & 63];
    if (i + 2 < bytes.length) output += BASE64URL_CHARS[n & 63];
  }
  return output;
}

export function decodeBase64UrlToUuid(value: string) {
  const clean = value.trim();
  if (isUuid(clean)) return clean.toLowerCase();
  if (!/^[A-Za-z0-9_-]{22}$/.test(clean)) return null;

  let bits = "";
  for (const char of clean) {
    const index = BASE64URL_CHARS.indexOf(char);
    if (index < 0) return null;
    bits += index.toString(2).padStart(6, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length && bytes.length < 16; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  if (bytes.length !== 16) return null;

  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function dailyEntryShortPath(entryId: string, lang = "zh") {
  const params = new URLSearchParams({ lang });
  return `/d/${encodeUuidToBase64Url(entryId)}?${params.toString()}`;
}

export function battleShortPath(battleId: string, lang = "zh") {
  const params = new URLSearchParams({ lang });
  return `/b/${encodeUuidToBase64Url(battleId)}?${params.toString()}`;
}

export function battleResultShortPath(battleId: string, lang = "zh") {
  const params = new URLSearchParams({ lang });
  return `/r/${encodeUuidToBase64Url(battleId)}?${params.toString()}`;
}

export function dailyBattleShortPath(battleId: string, lang = "zh") {
  const params = new URLSearchParams({ lang });
  return `/h/${encodeUuidToBase64Url(battleId)}?${params.toString()}`;
}
