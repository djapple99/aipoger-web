// Client-safe pricing and identifiers. Paid bodies are returned only by the copy API.
export const BIBLE_PROMPT_COPY_COST = 8;
export const BIBLE_EXPRESSION_COPY_COST = BIBLE_PROMPT_COPY_COST;
export type BiblePaidCopy = { requestId: string; key: string; locale: string; text?: string; exempt?: boolean };

export function biblePromptCopyKey(kind: "prompt_move" | "lyric_move" | "artist_dna" | "prompt_recipe", key: string) {
  if (kind === "prompt_move" && key.startsWith("expression-")) return key;
  return `${kind}:${key}`;
}

/** Stable opaque card IDs, without shipping the term-to-card lookup to clients. */
export function bibleExpressionCardKey(key: string) {
  if (key.startsWith("expression-card-")) return key;
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `expression-card-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function bibleMoveKeyFromHash(hash: string) {
  const key = hash.replace(/^#bible-move-/, "");
  return key.startsWith("expression-") ? bibleExpressionCardKey(key) : key;
}

/** Keep one receipt until clipboard success, including an uncertain network result. */
export function createBibleCopyOperation(key: string, locale: string, userId?: string): BiblePaidCopy {
  const storageKey = `aipoger:bible-copy:${userId}:${locale}:${key}`;
  let requestId: string | null = null;
  try {
    requestId = userId ? sessionStorage.getItem(storageKey) : null;
    // A pending receipt from the old, term-named card must still retry for free.
    if (!requestId && userId && key.startsWith("expression-card-")) {
      const prefix = `aipoger:bible-copy:${userId}:${locale}:`;
      for (let index = 0; index < sessionStorage.length; index++) {
        const storedKey = sessionStorage.key(index);
        if (storedKey?.startsWith(prefix) && bibleExpressionCardKey(storedKey.slice(prefix.length)) === key) {
          requestId = sessionStorage.getItem(storedKey);
          break;
        }
      }
    }
  } catch { /* In-page receipt still works. */ }
  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) requestId = crypto.randomUUID();
  try { if (userId) sessionStorage.setItem(storageKey, requestId); } catch { /* In-page receipt still works. */ }
  return { requestId, key, locale };
}

export function completeBibleCopyOperation(operation: BiblePaidCopy, userId: string) {
  try {
    const prefix = `aipoger:bible-copy:${userId}:${operation.locale}:`;
    const remove: string[] = [];
    for (let index = 0; index < sessionStorage.length; index++) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(prefix) && sessionStorage.getItem(key) === operation.requestId
        && bibleExpressionCardKey(key.slice(prefix.length)) === bibleExpressionCardKey(operation.key)) remove.push(key);
    }
    for (const key of remove) sessionStorage.removeItem(key);
  } catch { /* Copy already succeeded. */ }
}

export async function resolveBiblePaidCopy(operation: BiblePaidCopy, token: string, send: typeof fetch = fetch) {
  if (operation.text !== undefined) return operation.text;
  const response = await send("/api/ai-music-bible/copy", {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ requestId: operation.requestId, key: operation.key, locale: operation.locale, expectedCost: BIBLE_EXPRESSION_COPY_COST }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "COPY_UNAVAILABLE");
  if (typeof result.text !== "string") throw new Error("COPY_UNAVAILABLE");
  operation.text = result.text;
  operation.exempt = result.exempt === true;
  return result.text as string;
}
