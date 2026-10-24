import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { qCrashSourceType } from "@/lib/q-crash-rules";
import { settleQCrashBattle } from "@/lib/server-q-crash";
function jsonError(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
type PoolCardRow = {
  id: string;
  founder_queue_id: string;
  challenger_queue_id: string | null;
  battle_id: string | null;
  status: string;
  invite_expires_at: string;
  voting_ends_at: string | null;
  created_at: string;
};

type PoolQueueRow = {
  id: string;
  user_id: string;
  fighter_name: string;
  original_file_name: string;
  genre: string;
  ai_tool: string | null;
  cover_url: string | null;
  source_type: string | null;
  source_url: string | null;
  title: string | null;
  creator: string | null;
  duration_seconds: number | null;
};

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function qCrashCatalogResponse(settleExpired = true) {
  const admin = adminClient();
  if (!admin) return jsonError("Q Crash 尚未完成伺服器設定。", 503);

  const { data: cards, error: cardError } = await admin
    .from("q_crash_cards")
    .select("id,founder_queue_id,challenger_queue_id,battle_id,status,invite_expires_at,voting_ends_at,created_at")
    .in("status", ["q_crash_pending_invite", "q_crash_joining", "q_crash_voting"])
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<PoolCardRow[]>();
  if (cardError) {
    if (/q_crash_cards|schema cache|does not exist|PGRST/i.test(cardError.message)) {
      return NextResponse.json({ cards: [], available: false }, { headers: { "Cache-Control": "no-store" } });
    }
    return jsonError(cardError.message, 500);
  }

  const nowMs = Date.now();
  const visibleCards: PoolCardRow[] = [];
  for (const card of cards ?? []) {
    const endsAt = card.status === "q_crash_voting" ? card.voting_ends_at : card.invite_expires_at;
    const endsAtMs = new Date(endsAt ?? "").getTime();
    if (Number.isFinite(endsAtMs) && endsAtMs <= nowMs) {
      if (settleExpired && card.status === "q_crash_voting" && card.battle_id) {
        await settleQCrashBattle(admin, card.battle_id, nowMs);
      }
      continue;
    }
    visibleCards.push(card);
  }

  const queueIds = Array.from(new Set(visibleCards.flatMap((card) => [card.founder_queue_id, card.challenger_queue_id]).filter((id): id is string => Boolean(id))));
  const battleIds = Array.from(new Set(visibleCards.map((card) => card.battle_id).filter((id): id is string => Boolean(id))));
  const [queueResult, battleResult] = await Promise.all([
    queueIds.length > 0
      ? admin
          .from("battle_queue")
          .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,cover_url,source_type,source_url,title,creator,duration_seconds")
          .in("id", queueIds)
          .returns<PoolQueueRow[]>()
      : Promise.resolve({ data: [] as PoolQueueRow[], error: null }),
    battleIds.length > 0
      ? admin
          .from("battles")
          .select("id,song_a_name,song_b_name,fighter_a_name,fighter_b_name,genre,song_a_cover,song_b_cover")
          .in("id", battleIds)
          .returns<Array<{
            id: string;
            song_a_name: string;
            song_b_name: string;
            fighter_a_name: string;
            fighter_b_name: string;
            genre: string;
            song_a_cover: string | null;
            song_b_cover: string | null;
          }>>()
      : Promise.resolve({ data: [], error: null }),
  ]);
  let { data: queues, error: queueError } = queueResult;
  const { data: battles, error: battleError } = battleResult;
  if (queueError && /cover_url|schema cache|column.*does not exist|PGRST204/i.test(queueError.message)) {
    const legacyQueues = await admin
      .from("battle_queue")
      .select("id,user_id,fighter_name,original_file_name,genre,ai_tool")
      .in("id", queueIds)
      .returns<PoolQueueRow[]>();
    queues = legacyQueues.data;
    queueError = legacyQueues.error;
  }
  if (queueError) return jsonError(queueError.message, 500);
  if (battleError) return jsonError(battleError.message, 500);

  const queueMap = new Map((queues ?? []).map((queue) => [queue.id, queue]));
  const battleMap = new Map((battles ?? []).map((battle) => [battle.id, battle]));
  const userIds = Array.from(new Set((queues ?? []).map((queue) => queue.user_id).filter(Boolean)));
  const { data: profiles } = userIds.length > 0
    ? await admin.from("fighter_profiles").select("id,display_name,song_cover_url").in("id", userIds)
    : { data: [] };
  const profileMap = new Map(((profiles as Array<{ id: string; display_name?: string | null; song_cover_url?: string | null }> | null) ?? []).map((profile) => [profile.id, profile]));

  const poolCards = visibleCards.flatMap((card) => {
    const queueA = queueMap.get(card.founder_queue_id);
    const queueB = card.challenger_queue_id ? queueMap.get(card.challenger_queue_id) : null;
    if (!queueA) return [];
    const battle = card.battle_id ? battleMap.get(card.battle_id) : null;
    const profileA = profileMap.get(queueA.user_id);
    const profileB = queueB ? profileMap.get(queueB.user_id) : null;
    return [{
      cardId: card.id,
      battleId: card.battle_id,
      status: card.status,
      endsAt: card.status === "q_crash_voting" ? card.voting_ends_at : card.invite_expires_at,
      queueIds: [queueA.id, queueB?.id ?? null],
      genre: queueA.genre || battle?.genre,
      works: {
        A: {
          songName: battle?.song_a_name || queueA.title || queueA.original_file_name,
          creatorName: battle?.fighter_a_name || queueA.creator || queueA.fighter_name || profileA?.display_name || "AIPOGER 創作者",
          genre: queueA.genre,
          sourceType: qCrashSourceType(queueA.source_type) || "upload",
          sourceUrl: qCrashSourceType(queueA.source_type) === "suno" ? queueA.source_url : null,
          durationSeconds: queueA.duration_seconds ?? null,
          coverUrl: battle?.song_a_cover || queueA.cover_url || profileA?.song_cover_url || null,
        },
        B: queueB
          ? {
              songName: battle?.song_b_name || queueB.title || queueB.original_file_name,
              creatorName: battle?.fighter_b_name || queueB.creator || queueB.fighter_name || profileB?.display_name || "AIPOGER 創作者",
              genre: queueB.genre,
              sourceType: qCrashSourceType(queueB.source_type) || "upload",
              sourceUrl: qCrashSourceType(queueB.source_type) === "suno" ? queueB.source_url : null,
              durationSeconds: queueB.duration_seconds ?? null,
              coverUrl: battle?.song_b_cover || queueB.cover_url || profileB?.song_cover_url || null,
            }
          : null,
      },
    }];
  });

  return NextResponse.json(
    { cards: poolCards, available: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
