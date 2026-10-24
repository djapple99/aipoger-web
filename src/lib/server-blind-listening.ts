import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { creatorAdmin } from "./server-creator-auth";
import { readAllHomePages } from "./home-discovery";
import { isInMusicPool } from "./music-pool";
import { isCurrentMusicGenre } from "./music-genres";
import { buildAiMusicSurfaceLifecycleMap } from "./ai-music-surface-lifecycle";
import { blindPairKey, isBlindChoice, type BlindReveal, type BlindSide, type BlindSummary } from "./blind-listening";
import type { ListenBarTrackRow } from "./listen-bar";
export type BlindRow = {
  id: string; title: string; artist: string; genre: string; created_by: string | null;
  created_at: string; audio_path: string; cover_path: string | null; duration_seconds: number;
  work_kind?: string; source: string; is_active: boolean; is_featured_official: boolean; review_status: string;
  hidden_at: string | null; removed_at: string | null; ai_music_showtime_public_removed_at: string | null;
};
export type QuestionRow = {
  id: string; user_id: string; track_a_id: string; track_b_id: string; state: string;
  choice: string | null; expires_at: string; heard_a: number; heard_b: number;
};
const fields = "id,work_kind,title,artist,genre,created_by,created_at,audio_path,cover_path,duration_seconds,source,is_active,is_featured_official,review_status,hidden_at,removed_at,ai_music_showtime_public_removed_at,ai_music_showtime_certified,ai_music_showtime_certified_at,ai_music_showtime_certification_source";
export function blindStorageUrl(admin: SupabaseClient, path: string | null, bucket = "listen-bar-audio") {
  if (!path?.trim()) return "";
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  const url = /^https?:/i.test(path) ? path : admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  try {
    const parsed = new URL(url);
    return parsed.origin === origin && parsed.pathname.startsWith("/storage/v1/object/public/" + bucket + "/")
      && !parsed.username && !parsed.password ? parsed.href : "";
  } catch { return ""; }
}
function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!value) throw new Error("Missing server configuration");
  return value;
}
export function makeBlindAudioToken(question: QuestionRow, side: BlindSide) {
  const payload = Buffer.from(JSON.stringify({ id: question.id, side, exp: Date.parse(question.expires_at) })).toString("base64url");
  return payload + "." + createHmac("sha256", secret()).update("blind-audio-v1:" + payload).digest("base64url");
}
export function readBlindAudioToken(token: string) {
  try {
    if (token.length > 500) return null;
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const actual = Buffer.from(signature, "base64url");
    const expected = createHmac("sha256", secret()).update("blind-audio-v1:" + payload).digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof value.id === "string" && /^[0-9a-f-]{36}$/i.test(value.id)
      && (value.side === "A" || value.side === "B") && Number.isFinite(value.exp) && value.exp > Date.now()
      ? value as { id: string; side: BlindSide; exp: number } : null;
  } catch { return null; }
}
export async function blindSummaries(admin = creatorAdmin()) {
  const { data, error } = await admin.rpc("blind_popularity_summaries");
  if (error || !Array.isArray(data)) throw new Error("Blind summaries unavailable");
  return new Map<string, BlindSummary>(data.map(r => [r.track_id, { people: Number(r.people), preferencePoints: Number(r.preference_points) }]));
}
export async function readCredit(admin: SupabaseClient, userId: string, signal?: AbortSignal) {
  const request = admin.rpc("creator_credit_summary", { p_user: userId });
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error || !data || !Number.isSafeInteger(data.balance) || data.balance < 0 || !Number.isSafeInteger(data.debt) || data.debt < 0 || !Array.isArray(data.entries)) throw new Error("Credit unavailable");
  return data as { enabled: boolean; balance: number; debt: number; entries: { id: string; delta: number; reason: string; created_at: string }[] };
}
export async function blindCatalog(admin: SupabaseClient, userId: string, trackIds?: string[]) {
  const rows = await readAllHomePages<BlindRow>(async (from, to) => {
    let query = admin.from("listen_bar_tracks").select(fields).eq("source", "community").eq("is_active", true)
      .eq("review_status", "approved").gte("duration_seconds", 45);
    if (trackIds) query = query.in("id", trackIds);
    const r = await query.order("id").range(from, to);
    return { data: r.data as unknown as BlindRow[], error: r.error };
  });
  const eligible = rows.filter(r => r.work_kind !== "album" && !r.is_featured_official && !r.hidden_at && !r.removed_at
    && !r.ai_music_showtime_public_removed_at && r.created_by !== userId && isInMusicPool(r.created_at)
    && isCurrentMusicGenre(r.genre) && Boolean(blindStorageUrl(admin, r.audio_path)));
  const lifecycle = await buildAiMusicSurfaceLifecycleMap(admin, eligible as unknown as ListenBarTrackRow[]);
  return eligible.filter(r => !lifecycle.get(r.id)?.retiredFromExplore);
}
export async function questionForUser(admin: SupabaseClient, userId: string, id: string) {
  const { data, error } = await admin.from("blind_listen_questions").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error || !data) throw new Error("QUESTION_UNAVAILABLE");
  return data as QuestionRow;
}
export function anonymousQuestion(q: QuestionRow) {
  return { id: q.id, expiresAt: q.expires_at, heardA: Number(q.heard_a), heardB: Number(q.heard_b),
    audioA: "/api/blind-listen/audio?token=" + makeBlindAudioToken(q, "A"),
    audioB: "/api/blind-listen/audio?token=" + makeBlindAudioToken(q, "B") };
}
export async function prepareBlindQuestion(admin: SupabaseClient, userId: string, completedId?: string) {
  const [catalog, seen, summaries] = await Promise.all([
    blindCatalog(admin, userId),
    readAllHomePages<QuestionRow>(async (from, to) => {
    const r = await admin.from("blind_listen_questions").select("id,user_id,track_a_id,track_b_id,state,choice,expires_at,heard_a,heard_b")
      .eq("user_id", userId).order("id").range(from, to);
    return { data: r.data, error: r.error };
    }),
    blindSummaries(admin),
  ]);
  const eligible = new Map(catalog.map(r => [r.id, r]));
  const pending = seen.find(q => q.id !== completedId && q.state === "pending" && Date.parse(q.expires_at) > Date.now() && eligible.has(q.track_a_id) && eligible.has(q.track_b_id));
  if (pending) return { pending, pairs: [] as string[][] };
  const previous = new Set(seen.map(q => blindPairKey(q.track_a_id, q.track_b_id)));
  // Prefer under-sampled songs; randomize ties and A/B positions. Same genre only.
  const shuffled = catalog.map(track => ({ track, random: randomInt(1_000_000) }))
    .sort((a, b) => (summaries.get(a.track.id)?.people ?? 0) - (summaries.get(b.track.id)?.people ?? 0) || a.random - b.random);
  const pairs: string[][] = [];
  for (const { track: a } of shuffled) {
    for (const { track: b } of shuffled) {
      if (a.id === b.id || a.genre !== b.genre || previous.has(blindPairKey(a.id, b.id))) continue;
      const pair = randomInt(2) ? [a, b] : [b, a];
      pairs.push([pair[0].id, pair[1].id]); previous.add(blindPairKey(a.id, b.id));
    }
  }
  return { pending: null, pairs };
}
export async function issuePreparedBlindQuestion(admin: SupabaseClient, userId: string, prepared: Awaited<ReturnType<typeof prepareBlindQuestion>>) {
  if (prepared.pending) return anonymousQuestion(prepared.pending);
  for (const pair of prepared.pairs) {
    const { data, error } = await admin.rpc("issue_blind_question", { p_user: userId, p_a: pair[0], p_b: pair[1] });
    if (error) throw new Error("QUESTION_UNAVAILABLE");
    if (data) return anonymousQuestion(await questionForUser(admin, userId, data));
  }
  return null;
}
export async function nextBlindQuestion(admin: SupabaseClient, userId: string) {
  return issuePreparedBlindQuestion(admin, userId, await prepareBlindQuestion(admin, userId));
}
export async function revealBlindQuestion(admin: SupabaseClient, userId: string, id: string): Promise<BlindReveal> {
  const q = await questionForUser(admin, userId, id);
  if (q.state !== "voted" || !isBlindChoice(q.choice)) throw new Error("QUESTION_UNAVAILABLE");
  // Only the committed choice controls disclosure, including retries with a
  // different request choice. Never read or return the unselected identity.
  const sides: BlindSide[] = q.choice === "tie" ? ["A", "B"] : [q.choice];
  const selected = sides.map(side => ({ side, id: side === "A" ? q.track_a_id : q.track_b_id }));
  const valid = await blindCatalog(admin, userId, selected.map(work => work.id));
  return { choice: q.choice, works: selected.map(({ side, id }) => {
    const r = valid.find(row => row.id === id);
    return r ? { side, id: r.id, title: r.title, artist: r.artist,
      coverUrl: blindStorageUrl(admin, r.cover_path, "listen-bar-covers"),
      audioUrl: blindStorageUrl(admin, r.audio_path),
      href: "/ai-music?track=" + r.id + "#works" } : { side, unavailable: true };
  }) };
}
