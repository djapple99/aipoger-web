import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RematchClaimRow = {
  id: string;
  source_battle_id: string;
  winner_user_id: string;
  winner_side: "fighter_a" | "fighter_b";
  defender_queue_id: string;
  claimer_user_id: string | null;
  status: string;
  upload_deadline_at: string | null;
};

type SourceBattleRow = {
  id: string;
  queue_a_id: string | null;
  queue_b_id: string | null;
  fighter_a_user_id: string;
  fighter_b_user_id: string;
  fighter_a_name: string;
  fighter_b_name: string;
  song_a_name: string;
  song_b_name: string;
  audio_a_path: string | null;
  audio_b_path: string | null;
  song_a_cover?: string | null;
  song_b_cover?: string | null;
  fighter_a_avatar?: string | null;
  fighter_b_avatar?: string | null;
  ai_tool_a?: string | null;
  ai_tool_b?: string | null;
  lyrics_a?: string | null;
  lyrics_b?: string | null;
  genre: string | null;
  battle_type?: string | null;
};

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
  challenge_target_queue_id?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const token = tokenFromRequest(request);
  if (!token) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as {
    claimId?: unknown;
    challengerQueueId?: unknown;
  } | null;
  const claimId = isUuid(body?.claimId) ? body.claimId : null;
  const challengerQueueId = isUuid(body?.challengerQueueId) ? body.challengerQueueId : null;
  if (!claimId) return jsonError("Missing claimId");
  if (!challengerQueueId) return jsonError("Missing challengerQueueId");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("Unauthorized", 401);

  const now = new Date();
  const nowIso = now.toISOString();
  const { data: claim, error: claimError } = await admin
    .from("drop_battle_rematch_claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle<RematchClaimRow>();
  if (claimError) return jsonError(claimError.message, 500);
  if (!claim?.id) return jsonError("Rematch claim not found", 404);
  if (claim.status !== "claimed") return jsonError("這個挑戰席已失效或已完成。", 409);
  if (claim.claimer_user_id !== user.id) return jsonError("Forbidden", 403);
  if (!claim.upload_deadline_at || new Date(claim.upload_deadline_at).getTime() <= now.getTime()) {
    await admin.from("drop_battle_rematch_claims").update({ status: "expired", updated_at: nowIso }).eq("id", claim.id);
    return jsonError("挑戰者上傳逾時，這場 Battle 已結束。", 409);
  }

  const [{ data: sourceBattle, error: sourceError }, { data: challengerQueue, error: queueError }] = await Promise.all([
    admin.from("battles").select("*").eq("id", claim.source_battle_id).maybeSingle<SourceBattleRow>(),
    admin.from("battle_queue").select("*").eq("id", challengerQueueId).maybeSingle<QueueRow>(),
  ]);
  if (sourceError) return jsonError(sourceError.message, 500);
  if (queueError) return jsonError(queueError.message, 500);
  if (!sourceBattle?.id) return jsonError("Source battle not found", 404);
  if (sourceBattle.battle_type && sourceBattle.battle_type !== "formal") return jsonError("Only 90s Drop Battle supports rematch", 409);
  if (!challengerQueue?.id || challengerQueue.user_id !== user.id) return jsonError("Challenger queue not found", 404);
  if (!["searching", "waiting", "waiting_challenge"].includes(challengerQueue.status)) {
    return jsonError("Challenger queue is not upload-ready", 409);
  }
  if (challengerQueue.user_id === claim.winner_user_id) return jsonError("擂主不能挑戰自己。", 409);

  const sourceGenre = sourceBattle.genre?.trim() || "AI Music";
  if ((challengerQueue.genre || "").trim() !== sourceGenre) {
    return jsonError("守擂挑戰必須沿用上一場 genre。", 409);
  }

  const defenderIsB = claim.winner_side === "fighter_b";
  const defenderQueueId = defenderIsB ? sourceBattle.queue_b_id : sourceBattle.queue_a_id;
  const defenderAudioPath = defenderIsB ? sourceBattle.audio_b_path : sourceBattle.audio_a_path;
  if (defenderQueueId !== claim.defender_queue_id || !defenderQueueId || !defenderAudioPath) {
    return jsonError("Defender battle data is incomplete", 409);
  }

  const defender = {
    userId: defenderIsB ? sourceBattle.fighter_b_user_id : sourceBattle.fighter_a_user_id,
    name: defenderIsB ? sourceBattle.fighter_b_name : sourceBattle.fighter_a_name,
    song: defenderIsB ? sourceBattle.song_b_name : sourceBattle.song_a_name,
    audioPath: defenderAudioPath,
    cover: defenderIsB ? sourceBattle.song_b_cover : sourceBattle.song_a_cover,
    avatar: defenderIsB ? sourceBattle.fighter_b_avatar : sourceBattle.fighter_a_avatar,
    aiTool: defenderIsB ? sourceBattle.ai_tool_b : sourceBattle.ai_tool_a,
    lyrics: defenderIsB ? sourceBattle.lyrics_b : sourceBattle.lyrics_a,
  };

  const [{ data: fighterB }, { data: userB }] = await Promise.all([
    admin.from("fighter_profiles").select("avatar_url, song_cover_url").eq("id", challengerQueue.user_id).maybeSingle(),
    admin.from("user_profiles").select("avatar_url").eq("id", challengerQueue.user_id).maybeSingle(),
  ]);

  const battleInsertBase = {
    queue_a_id: defenderQueueId,
    queue_b_id: challengerQueue.id,
    fighter_a_user_id: defender.userId,
    fighter_b_user_id: challengerQueue.user_id,
    fighter_a_name: defender.name,
    fighter_b_name: challengerQueue.fighter_name,
    song_a_name: defender.song,
    song_b_name: challengerQueue.original_file_name,
    audio_a_path: defender.audioPath,
    audio_b_path: challengerQueue.audio_path,
    genre: sourceGenre,
    status: "live",
  };

  const battleInsertCore = {
    ...battleInsertBase,
    battle_type: "formal",
    is_async_match: true,
    ai_tool_a: trimOrNull(defender.aiTool),
    ai_tool_b: trimOrNull(challengerQueue.ai_tool),
    lyrics_a: trimOrNull(defender.lyrics),
    lyrics_b: trimOrNull(challengerQueue.lyrics),
    started_at: nowIso,
    waiting_room_started_at: nowIso,
    stake_apc: 0,
    pot_apc: 0,
    vote_stake_apc: 0,
  };
  const battleInsertFull = {
    ...battleInsertCore,
    song_a_cover: trimOrNull(defender.cover),
    song_b_cover: firstText(fighterB?.song_cover_url),
    fighter_a_avatar: trimOrNull(defender.avatar),
    fighter_b_avatar: firstText(fighterB?.avatar_url, userB?.avatar_url),
  };

  let { data: battleRow, error: battleError } = await admin
    .from("battles")
    .insert(battleInsertFull)
    .select("id")
    .single<{ id: string }>();

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
  if (battleError || !battleRow?.id) return jsonError(battleError?.message ?? "Battle creation failed", 500);

  const nextBattleId = battleRow.id;
  const { error: queueUpdateError } = await admin
    .from("battle_queue")
    .update({
      status: "matched",
      opponent_user_id: defender.userId,
      match_group_id: nextBattleId,
      matched_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", challengerQueue.id);
  if (queueUpdateError) return jsonError(queueUpdateError.message, 500);

  const { error: claimUpdateError } = await admin
    .from("drop_battle_rematch_claims")
    .update({
      status: "uploaded",
      next_battle_id: nextBattleId,
      next_queue_id: challengerQueue.id,
      updated_at: nowIso,
    })
    .eq("id", claim.id)
    .eq("status", "claimed");
  if (claimUpdateError) return jsonError(claimUpdateError.message, 500);

  await admin.from("battle_notifications").insert([
    {
      user_id: defender.userId,
      queue_id: defenderQueueId,
      battle_id: nextBattleId,
      type: "drop_rematch_started",
      title: "擂主守擂中",
      body: `${challengerQueue.fighter_name} 已完成上傳，下一場守擂 Battle 開始。`,
      metadata: { sourceBattleId: sourceBattle.id, rematchClaimId: claim.id },
    },
    {
      user_id: challengerQueue.user_id,
      queue_id: challengerQueue.id,
      battle_id: nextBattleId,
      type: "drop_rematch_started",
      title: "挑戰擂主開始",
      body: `${defender.name} 正在守擂，請回到戰場開打。`,
      metadata: { sourceBattleId: sourceBattle.id, rematchClaimId: claim.id },
    },
  ]);

  return NextResponse.json({
    ok: true,
    nextBattleId,
    nextQueueId: challengerQueue.id,
  });
}
