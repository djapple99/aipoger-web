export const LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS = 24;
export const LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS = 32;

const WIDE_CHARACTER_PATTERN =
  /[\u1100-\u115f\u2329\u232a\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u;

export function listenBarDisplayUnitCount(value: string) {
  return Array.from(value).reduce((total, char) => total + (WIDE_CHARACTER_PATTERN.test(char) ? 2 : 1), 0);
}

export function limitListenBarDisplayText(value: string, maxUnits: number) {
  let total = 0;
  let output = "";
  for (const char of Array.from(value)) {
    const width = WIDE_CHARACTER_PATTERN.test(char) ? 2 : 1;
    if (total + width > maxUnits) break;
    output += char;
    total += width;
  }
  return output;
}

export function cleanListenBarDisplayText(value: unknown, maxUnits: number) {
  if (typeof value !== "string") return null;
  const clean = limitListenBarDisplayText(value.trim(), maxUnits).trim();
  return clean || null;
}
