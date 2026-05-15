/** 從 URL 參數還原封面網址（避免重複編碼） */
export function resolveCoverUrlFromParam(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  let s = raw;
  try {
    let prev = "";
    while (s !== prev && /%[0-9A-Fa-f]{2}/.test(s)) {
      prev = s;
      s = decodeURIComponent(s);
    }
  } catch {
    /* keep s */
  }
  const t = s.trim();
  return t.length > 0 ? t : null;
}
