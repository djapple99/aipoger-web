// Client-safe pricing. Prompt bodies remain in the member catalog.
export const BIBLE_EXPRESSION_COPY_COST = 8;
export type BiblePaidCopy = { requestId: string; key: string; locale: string; text?: string };

/** Keep one receipt until clipboard success, including an uncertain network result. */
export function createBibleCopyOperation(key: string, locale: string, userId?: string): BiblePaidCopy {
  const storageKey = `aipoger:bible-copy:${userId}:${locale}:${key}`;
  let requestId: string | null = null;
  try { requestId = userId ? sessionStorage.getItem(storageKey) : null; } catch { /* In-page receipt still works. */ }
  if (!requestId || !/^[0-9a-f-]{36}$/i.test(requestId)) requestId = crypto.randomUUID();
  try { if (userId) sessionStorage.setItem(storageKey, requestId); } catch { /* In-page receipt still works. */ }
  return { requestId, key, locale };
}

export function completeBibleCopyOperation(operation: BiblePaidCopy, userId: string) {
  try { sessionStorage.removeItem(`aipoger:bible-copy:${userId}:${operation.locale}:${operation.key}`); } catch { /* Copy already succeeded. */ }
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
  return result.text as string;
}
