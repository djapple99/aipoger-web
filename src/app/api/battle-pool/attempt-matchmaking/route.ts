import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildDropBattleSchedulePayloadFromQueues, isDropChallengeAcceptable } from "@/lib/battle-pool-client";

type QueueRow = {
  id: string;
  user_id: string;
  fighter_name: string;
  genre: string;
  audio_path: string;
  original_file_name: string;
  ai_tool?: string | null;
  lyrics?: string | null;
  status: string;
  match_group_id?: string | null;
  opponent_user_id?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

const OPEN_QUEUE_STATUSES = ["searching", "waiting", "waiting_challenge"];
const ACTIVE_QUEUE_STATUSES = [
  "pending",
  "searching",
  "waiting",
  "waiting_challenge",
];
const ACTIVE_BATTLE_STATUSES = [
  "pending",
  "live",
];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function trimOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function battleStartFromRows(meRow: QueueRow, opponentRow: QueueRow, targetQueueId?: string | null) {
  const schedulePayload = buildDropBattleSchedulePayloadFromQueues(meRow, opponentRow, targetQueueId);
  const scheduledMs = schedulePayload?.scheduled_start_at ? new Date(schedulePayload.scheduled_start_at).getTime() : NaN;
  const startMs = Number.isFinite(scheduledMs) && scheduledMs > Date.now() ? scheduledMs : Date.now();
  const startedAt = new Date(startMs).toISOString();
  const waitingRoomStartedAt = new Date(Date.now()).toISOString();
  return { startedAt, waitingRoomStartedAt };
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const token = tokenFromRequest(request);
  if (!token) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as {
    queueId?: string;
    targetQueueId?: string | null;
  } | null;
  const queueId = body?.queueId;
  const targetQueueId = body?.targetQueueId;

  if (!queueId || !/^[0-9a-f-]{36}$/i.test(queueId)) {
    return jsonError("Invalid queueId");
  }
  if (targetQueueId && !/^[0-9a-f-]{36}$/i.test(targetQueueId)) {
    return jsonError("Invalid targetQueueId");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("Unauthorized", 401);

  const { data: meRow, error: meError } = await admin
    .from("battle_queue")
    .select("*")
    .eq("id", queueId)
    .maybeSingle<QueueRow>();

  if (meError) return jsonError(meError.message, 500);
  if (!meRow || meRow.user_id !== user.id) return jsonError("Queue row not found", 404);
  if (!OPEN_QUEUE_STATUSES.includes(meRow.status)) return NextResponse.json({ row: meRow });
  if (meRow.status === "waiting_challenge" && !targetQueueId) {
    return NextResponse.json({ row: meRow });
  }

  const { data: otherActiveQueues, error: otherActiveQueueError } = await admin
    .from("battle_queue")
    .select("id, status")
    .eq("user_id", user.id)
    .neq("id", meRow.id)
    .in("status", ACTIVE_QUEUE_STATUSES)
    .limit(1);

  if (otherActiveQueueError) return jsonError(otherActiveQueueError.message, 500);
  if ((otherActiveQueues ?? []).length > 0) {
    return jsonError("同一個帳號一次只能保留一場 Drop Battle。請先完成或取消目前這場 Drop，再開始下一場。", 409);
  }

  const { data: activeBattles, error: activeBattleError } = await admin
    .from("battles")
    .select("id, status")
    .or(`fighter_a_user_id.eq.${user.id},fighter_b_user_id.eq.${user.id}`)
    .in("status", ACTIVE_BATTLE_STATUSES)
    .limit(1);

  if (activeBattleError) return jsonError(activeBattleError.message, 500);
  if ((activeBattles ?? []).length > 0) {
    return jsonError("你目前已有一場 Drop Battle 進行中。請先完成或取消目前這場 Drop，再開始下一場 Drop。", 409);
  }

  let opponentQuery = admin
    .from("battle_queue")
    .select("*")
    .in("status", OPEN_QUEUE_STATUSES)
    .neq("user_id", meRow.user_id)
    .neq("id", meRow.id)
    .eq("genre", meRow.genre)
    .order("created_at", { ascending: true })
    .limit(targetQueueId ? 1 : 10);

  if (targetQueueId) {
    opponentQuery = opponentQuery.eq("id", targetQueueId);
  }

  const { data: opponents, error: opponentError } = await opponentQuery.returns<QueueRow[]>();
  if (opponentError) return jsonError(opponentError.message, 500);

  const opponentRow = (opponents ?? []).find((row) => {
    if (targetQueueId) return isDropChallengeAcceptable(row);
    return row.status !== "waiting_challenge" || isDropChallengeAcceptable(row);
  }) ?? null;
  if (!opponentRow) {
    if (targetQueueId) {
      await admin
        .from("battle_queue")
        .update({ status: "cancelled" })
        .eq("id", meRow.id)
        .in("status", OPEN_QUEUE_STATUSES);
      return jsonError("這張 Drop Battle 挑戰卡已失效或已被接受，請回公開挑戰池重新選一場。", 409);
    }
    return NextResponse.json({ row: meRow });
  }

  const battleInsertBase = {
    queue_a_id: meRow.id,
    queue_b_id: opponentRow.id,
    fighter_a_user_id: meRow.user_id,
    fighter_b_user_id: opponentRow.user_id,
    fighter_a_name: meRow.fighter_name,
    fighter_b_name: opponentRow.fighter_name,
    song_a_name: meRow.original_file_name,
    song_b_name: opponentRow.original_file_name,
    audio_a_path: meRow.audio_path,
    audio_b_path: opponentRow.audio_path,
    genre: meRow.genre,
    status: "live",
  };
  const battleTiming = battleStartFromRows(meRow, opponentRow, targetQueueId);
  const [{ data: fighterA }, { data: fighterB }, { data: userA }, { data: userB }] = await Promise.all([
    admin.from("fighter_profiles").select("avatar_url, song_cover_url").eq("id", meRow.user_id).maybeSingle(),
    admin.from("fighter_profiles").select("avatar_url, song_cover_url").eq("id", opponentRow.user_id).maybeSingle(),
    admin.from("user_profiles").select("avatar_url").eq("id", meRow.user_id).maybeSingle(),
    admin.from("user_profiles").select("avatar_url").eq("id", opponentRow.user_id).maybeSingle(),
  ]);

  const battleInsertCore = {
    ...battleInsertBase,
    battle_type: "formal",
    is_async_match: true,
    ai_tool_a: trimOrNull(meRow.ai_tool),
    ai_tool_b: trimOrNull(opponentRow.ai_tool),
    lyrics_a: trimOrNull(meRow.lyrics),
    lyrics_b: trimOrNull(opponentRow.lyrics),
    started_at: battleTiming.startedAt,
    waiting_room_started_at: battleTiming.waitingRoomStartedAt,
    stake_apc: 0,
    pot_apc: 0,
    vote_stake_apc: 0,
  };
  const battleSchedule = buildDropBattleSchedulePayloadFromQueues(meRow, opponentRow, targetQueueId);
  const battleInsertCoreWithSchedule = battleSchedule
    ? { ...battleInsertCore, ...battleSchedule }
    : battleInsertCore;
  const battleInsertFull = {
    ...battleInsertCoreWithSchedule,
    song_a_cover: firstText(fighterA?.song_cover_url),
    song_b_cover: firstText(fighterB?.song_cover_url),
    fighter_a_avatar: firstText(fighterA?.avatar_url, userA?.avatar_url),
    fighter_b_avatar: firstText(fighterB?.avatar_url, userB?.avatar_url),
  };
  const battleInsertFullWithoutSchedule = {
    ...battleInsertCore,
    song_a_cover: firstText(fighterA?.song_cover_url),
    song_b_cover: firstText(fighterB?.song_cover_url),
    fighter_a_avatar: firstText(fighterA?.avatar_url, userA?.avatar_url),
    fighter_b_avatar: firstText(fighterB?.avatar_url, userB?.avatar_url),
  };

  let { data: battleRow, error: battleError } = await admin
    .from("battles")
    .insert(battleInsertFull)
    .select("id")
    .single<{ id: string }>();

  if (battleError && /column|schema cache|PGRST204/i.test(`${battleError.message} ${battleError.details ?? ""}`)) {
    const fallback = await admin.from("battles").insert(battleInsertFullWithoutSchedule).select("id").single<{ id: string }>();
    battleRow = fallback.data;
    battleError = fallback.error;
  }

  if (battleError && /column|schema cache|PGRST204/i.test(`${battleError.message} ${battleError.details ?? ""}`)) {
    const fallback = await admin.from("battles").insert(battleInsertCoreWithSchedule).select("id").single<{ id: string }>();
    battleRow = fallback.data;
    battleError = fallback.error;
  }

  if (battleError && /column|schema cache|PGRST204/i.test(`${battleError.message} ${battleError.details ?? ""}`)) {
    const fallback = await admin.from("battles").insert(battleInsertCore).select("id").single<{ id: string }>();
    battleRow = fallback.data;
    battleError = fallback.error;
  }

  if (battleError && /column|schema cache|PGRST204/i.test(`${battleError.message} ${battleError.details ?? ""}`)) {
    const fallback = await admin.from("battles").insert(battleInsertBase).select("id").single<{ id: string }>();
    battleRow = fallback.data;
    battleError = fallback.error;
  }

  if (battleError || !battleRow?.id) {
    return jsonError(battleError?.message ?? "Battle creation failed", 500);
  }

  const battleId = battleRow.id;

  const updateA = admin
    .from("battle_queue")
    .update({
      status: "matched",
      opponent_user_id: opponentRow.user_id,
      match_group_id: battleId,
      matched_at: new Date().toISOString(),
    })
    .eq("id", meRow.id)
    .select("*")
    .single<QueueRow>();

  const updateB = admin
    .from("battle_queue")
    .update({
      status: "matched",
      opponent_user_id: meRow.user_id,
      match_group_id: battleId,
      matched_at: new Date().toISOString(),
    })
    .eq("id", opponentRow.id);

  const [{ data: updatedMe, error: updateMeError }, { error: updateOpponentError }] = await Promise.all([updateA, updateB]);

  if (updateMeError || updateOpponentError) {
    return jsonError(updateMeError?.message ?? updateOpponentError?.message ?? "Queue update failed", 500);
  }

  await admin.from("battle_notifications").insert([
    {
      user_id: meRow.user_id,
      queue_id: meRow.id,
      battle_id: battleId,
      type: "battle_matched",
      title: "找到對手了",
      body: "找到對手了！公測期免 APC 入場，請回來確認參戰。",
      metadata: { opponentName: opponentRow.fighter_name, stakeApc: 0, potApc: 0 },
    },
    {
      user_id: opponentRow.user_id,
      queue_id: opponentRow.id,
      battle_id: battleId,
      type: "battle_matched",
      title: "找到對手了",
      body: "找到對手了！公測期免 APC 入場，請回來確認參戰。",
      metadata: { opponentName: meRow.fighter_name, stakeApc: 0, potApc: 0 },
    },
  ]);

  return NextResponse.json({ row: updatedMe ?? { ...meRow, status: "matched", match_group_id: battleId } });
}
