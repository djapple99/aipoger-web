import "server-only";
import { mvReviewAdmin } from "@/lib/server-mv-reviews";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { shouldExpireOpenDropQueue, isClosedDropBattleStatus } from "@/lib/battle-pool-client";
import { qCrashCatalogResponse } from "@/lib/server-q-crash-catalog";
import { GET as officialDropsResponse } from "@/app/api/official-gatekeeper-drops/route";
import type { OfficialGatekeeperDrop } from "@/lib/official-gatekeeper-drops";
import type { LiveBattleRow, PoolEntryRow, QCrashPoolCardRow } from "@/app/battle/battle-client";

export type PublicBattleSeed = { live: LiveBattleRow[]; pool: PoolEntryRow[]; qCrash: QCrashPoolCardRow[]; drops: OfficialGatekeeperDrop[] };
function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Public battle configuration unavailable");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const liveFields = "id,status,fighter_a_name,fighter_b_name,song_a_name,song_b_name,genre,created_at,scheduled_start_at,battle_started_at,started_at,battle_ended_at";
export const readPublicBattles = cache(async (): Promise<PublicBattleSeed> => {
  const client = publicClient();
  const [liveResult, poolResult, qResponse, dropResponse] = await Promise.all([
    client.from("battles").select(liveFields).in("status", ["matched", "active", "live"]).is("battle_ended_at", null).order("created_at", { ascending: false }).limit(30),
    client.from("battle_queue").select("id,fighter_name,original_file_name,genre,ai_tool,status,match_group_id,expires_at,scheduled_start_at,cancellation_evaluation_at,official_gatekeeper_id,official_gatekeeper_role,public_vote_score,created_at")
      .in("status", ["waiting_challenge", "matched", "public_voting", "ghost_battle"]).order("created_at", { ascending: false }).limit(24),
    qCrashCatalogResponse(false), officialDropsResponse(),
  ]);
  if (liveResult.error || poolResult.error || !qResponse.ok || !dropResponse.ok) throw new Error("Public battles are temporarily unavailable");
  const qPayload = await qResponse.json() as { cards?: QCrashPoolCardRow[] };
  const dPayload = await dropResponse.json() as { drops?: OfficialGatekeeperDrop[] };
  const qCrash = qPayload.cards ?? [];
  const qIds = new Set(qCrash.flatMap(card => card.queueIds));
  const qBattleIds = new Set(qCrash.map(card => card.battleId));
  const rawPool = (poolResult.data ?? []) as unknown as PoolEntryRow[];
  const linked = [...new Set(rawPool.map(row => row.match_group_id).filter((id): id is string => Boolean(id)))];
  const closed = new Set<string>();
  if (linked.length) {
    const result = await client.from("battles").select("id,status,battle_ended_at").in("id", linked);
    if (result.error) throw new Error("Public battle status unavailable");
    for (const row of result.data ?? []) if (row.battle_ended_at || isClosedDropBattleStatus(row.status)) closed.add(row.id);
  }
  const pool = rawPool.filter(row => !row.official_gatekeeper_id && !qIds.has(row.id) && !qBattleIds.has(row.match_group_id)
    && !shouldExpireOpenDropQueue(row) && !closed.has(row.match_group_id ?? "")).map(row => ({ ...row, user_id: "" }));
  const live = ((liveResult.data ?? []) as unknown as LiveBattleRow[]).filter(row => {
    if (row.battle_ended_at) return false;
    if (row.status === "matched" || row.status === "active") return true;
    const start = Date.parse(row.scheduled_start_at ?? row.started_at ?? "");
    return row.status === "live" && (!Number.isFinite(start) || start <= Date.now() || Boolean(row.battle_started_at));
  }).map(row => ({ ...row, fighter_a_user_id: "", fighter_b_user_id: "" }));
  return { live, pool, qCrash, drops: dPayload.drops ?? [] };
});

export type PublicBattleSummary = { id: string; status: string; fighter_a_name: string; fighter_b_name: string; song_a_name: string; song_b_name: string; genre: string | null; battle_type: string | null };
export const readPublicBattle = cache(async (id: string): Promise<PublicBattleSummary | null> => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const client = publicClient();
  const result = await client.from("battles").select("id,status,fighter_a_name,fighter_b_name,song_a_name,song_b_name,genre,battle_type").eq("id", id).maybeSingle();
  if (result.error) throw new Error("Public battle unavailable");
  if (result.data && ["matched", "active", "live", "finished", "completed", "cancelled", "cancelled_no_challenger", "cancelled_founder", "expired", "q_crash_voting", "q_crash_finished", "q_crash_insufficient"].includes(result.data.status)) return result.data as PublicBattleSummary;
  const queue = await client.from("battle_queue").select("id,status,fighter_name,original_file_name,genre").eq("id", id)
    .in("status", ["waiting_challenge", "matched", "public_voting", "ghost_battle"]).maybeSingle();
  if (queue.error) throw new Error("Public challenge unavailable");
  if (!queue.data) {
    const admin = mvReviewAdmin();
    const card = await admin.from("q_crash_cards").select("id,status,founder_queue_id,challenger_queue_id")
      .eq("id", id).in("status", ["q_crash_pending_invite", "q_crash_joining", "q_crash_voting", "q_crash_finished", "q_crash_insufficient", "q_crash_cancelled"]).maybeSingle();
    if (card.error) throw new Error("Public Q Crash unavailable");
    if (!card.data) return null;
    const publicCard = card.data;
    const ids = [publicCard.founder_queue_id, publicCard.challenger_queue_id].filter(Boolean);
    const members = await admin.from("battle_queue").select("id,title,creator,fighter_name,original_file_name,genre").in("id", ids);
    if (members.error) throw new Error("Public Q Crash works unavailable");
    const a = members.data?.find(row => row.id === publicCard.founder_queue_id);
    const b = members.data?.find(row => row.id === publicCard.challenger_queue_id);
    if (!a) return null;
    return { id, status: card.data.status, fighter_a_name: a.creator || a.fighter_name, fighter_b_name: b?.creator || b?.fighter_name || "",
      song_a_name: a.title || a.original_file_name, song_b_name: b?.title || b?.original_file_name || "", genre: a.genre, battle_type: "q_crash" };
  }
  return { id, status: queue.data.status, fighter_a_name: queue.data.fighter_name, fighter_b_name: "", song_a_name: queue.data.original_file_name, song_b_name: "", genre: queue.data.genre, battle_type: "drop" };
});
