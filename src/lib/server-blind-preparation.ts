import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareBlindQuestion } from "./server-blind-listening";

// Private, disposable optimization only: no issued question, vote or Credit.
// A cache miss always uses the authoritative existing preparation path.
const prepared = new Map<string, { expires: number; promise: ReturnType<typeof prepareBlindQuestion> }>();
const key = (userId: string, questionId: string) => `${userId}:${questionId}`;
export function warmBlindPreparation(admin: SupabaseClient, userId: string, questionId: string) {
  const id = key(userId, questionId), now = Date.now();
  for (const [entry, value] of prepared) if (value.expires <= now) prepared.delete(entry);
  const existing = prepared.get(id);
  if (existing) return existing.promise;
  if (prepared.size >= 64) prepared.delete(prepared.keys().next().value!);
  const promise = prepareBlindQuestion(admin, userId, questionId);
  const value = { expires: now + 60_000, promise };
  prepared.set(id, value);
  void promise.catch(() => { if (prepared.get(id) === value) prepared.delete(id); });
  return promise;
}
export async function takeBlindPreparation(admin: SupabaseClient, userId: string, questionId: string) {
  const id = key(userId, questionId), value = prepared.get(id);
  prepared.delete(id);
  if (value && value.expires > Date.now()) {
    try { return { ...await value.promise, revalidate: true }; }
    catch { /* Optional warming cannot prevent an authoritative retry. */ }
  }
  return { ...await prepareBlindQuestion(admin, userId, questionId), revalidate: false };
}
