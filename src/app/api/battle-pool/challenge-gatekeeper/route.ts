import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildDropBattleSchedulePayload,
  buildDropBattleSchedulePayloadFromPreset,
  isDropBattleEndedOrPastExpectedEnd,
  validateDropBattleScheduledStart,
  type DropBattleSchedulePreset,
} from "@/lib/battle-pool-client";
import {
  ACTIVE_DROP_BATTLE_STATUSES,
  ACTIVE_DROP_QUEUE_STATUSES,
  dropBattleRoleForChallengeTarget,
  dropBattleRoleLockMessage,
} from "@/lib/battle-pool-rules";
import {
  OFFICIAL_GATEKEEPER_DROP_IDS,
  normalizeOfficialGatekeeperDrop,
  officialGatekeeperDisplayTitle,
} from "@/lib/official-gatekeeper-drops";
import { signedBattleAudioUrl } from "@/lib/official-gatekeeper-media";

type QueueRoleRow = {
  id: string;
  status: string;
  match_group_id?: string | null;
  challenge_target_queue_id?: string | null;
  official_gatekeeper_role?: string | null;
};

const CLOSED_BATTLE_STATUSES = ["finished", "cancelled", "cancelled_no_challenger", "cancelled_founder", "completed", "expired"];
const GATEKEEPER_FIGHTER_NAME = "AIPOGER";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isSchemaMissing(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /official_gatekeeper|official_gatekeeper_drops|full_audio_|schema cache|column.*does not exist|relation.*does not exist|PGRST204|42P01/i.test(msg);
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function trimOrNull(value: unknown, maxLength = 8000) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function scheduleFromBody(body: { schedulePreset?: unknown; scheduledStartIso?: unknown }) {
  const preset = Number(body.schedulePreset);
  if ([10, 15, 20].includes(preset)) {
    return buildDropBattleSchedulePayloadFromPreset(preset as DropBattleSchedulePreset);
  }
  const scheduledStartIso = typeof body.scheduledStartIso === "string" ? body.scheduledStartIso : null;
  const validation = validateDropBattleScheduledStart(scheduledStartIso);
  if (validation) return { error: validation };
  return buildDropBattleSchedulePayload(scheduledStartIso);
}

function scheduleErrorMessage(error: string) {
  if (error === "past") return "開戰時間至少要在 1 分鐘後。";
  if (error === "too_late") return "開戰時間不能超過 24 小時。";
  return "請選擇有效的開戰時間。";
}

export async function POST(request: NextRequest) {
  let admin: ReturnType<typeof adminClient>;
  try {
    admin = adminClient();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }

  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入。", 401);

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("登入狀態已過期。", 401);

  const body = (await request.json().catch(() => null)) as {
    gatekeeperId?: string;
    fighterName?: string;
    songName?: string;
    aiTool?: string | null;
    audioPath?: string;
    audioSha256?: string | null;
    fullAudioPath?: string | null;
    fullAudioSha256?: string | null;
    fullAudioOriginalName?: string | null;
    fullAudioDurationSeconds?: number | null;
    fullAudioPublic?: boolean | null;
    lyrics?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    schedulePreset?: unknown;
    scheduledStartIso?: unknown;
  } | null;

  const gatekeeperId = body?.gatekeeperId?.trim();
  if (!gatekeeperId || !OFFICIAL_GATEKEEPER_DROP_IDS.includes(gatekeeperId as (typeof OFFICIAL_GATEKEEPER_DROP_IDS)[number])) {
    return jsonError("無效的官方守門 Drop。", 400);
  }
  if (!body?.audioPath?.trim()) return jsonError("缺少挑戰者 Drop 音檔。", 400);

  const scheduleResult = scheduleFromBody(body);
  if (scheduleResult && "error" in scheduleResult) return jsonError(scheduleErrorMessage(scheduleResult.error), 400);
  const schedulePayload = scheduleResult ?? buildDropBattleSchedulePayloadFromPreset(10);

  const { data: gatekeeperRow, error: gatekeeperError } = await admin
    .from("official_gatekeeper_drops")
    .select("*")
    .eq("id", gatekeeperId)
    .eq("active", true)
    .not("audio_path", "is", null)
    .maybeSingle();

  if (gatekeeperError) {
    if (isSchemaMissing(gatekeeperError)) return jsonError("尚未建立官方守門 Drop 資料表，請先套用 supabase/20260618_official_gatekeeper_drops.sql。", 409);
    return jsonError(gatekeeperError.message, 500);
  }
  if (!gatekeeperRow) return jsonError("這張官方守門 Drop 尚未開放挑戰。", 404);

  const gatekeeper = normalizeOfficialGatekeeperDrop(gatekeeperRow as Record<string, unknown>);
  const defenderUserId = gatekeeper.updatedBy ?? gatekeeper.createdBy ?? null;
  if (!defenderUserId) return jsonError("這張官方守門 Drop 尚未由 owner 完成上傳設定。", 409);

  const { data: activeQueues, error: activeQueueError } = await admin
    .from("battle_queue")
    .select("id,status,match_group_id,challenge_target_queue_id,official_gatekeeper_role")
    .eq("user_id", user.id)
    .in("status", [...ACTIVE_DROP_QUEUE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(12);
  if (activeQueueError) {
    if (isSchemaMissing(activeQueueError)) return jsonError("尚未套用官方守門 Drop SQL 欄位。", 409);
    return jsonError(activeQueueError.message, 500);
  }

  const requestedRole = "challenger";
  for (const activeQueue of ((activeQueues ?? []) as QueueRoleRow[])) {
    if (activeQueue.match_group_id) {
      const { data: linkedBattle } = await admin
        .from("battles")
        .select("id,status,battle_ended_at,scheduled_start_at,started_at,battle_started_at,created_at")
        .eq("id", activeQueue.match_group_id)
        .maybeSingle();
      if (linkedBattle?.battle_ended_at || CLOSED_BATTLE_STATUSES.includes(linkedBattle?.status ?? "") || isDropBattleEndedOrPastExpectedEnd(linkedBattle)) {
        await admin.from("battle_queue").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", activeQueue.id);
        continue;
      }
    }
    const role = activeQueue.official_gatekeeper_role === "challenger"
      ? "challenger"
      : dropBattleRoleForChallengeTarget(activeQueue.challenge_target_queue_id);
    if (role === requestedRole) return jsonError(dropBattleRoleLockMessage("challenger", "zh"), 409);
  }

  const { data: activeBattles, error: activeBattleError } = await admin
    .from("battles")
    .select("id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,status,battle_ended_at,scheduled_start_at,started_at,battle_started_at,created_at")
    .or(`fighter_a_user_id.eq.${user.id},fighter_b_user_id.eq.${user.id}`)
    .in("status", [...ACTIVE_DROP_BATTLE_STATUSES])
    .is("battle_ended_at", null)
    .limit(8);
  if (activeBattleError) return jsonError(activeBattleError.message, 500);
  for (const activeBattle of activeBattles ?? []) {
    if (isDropBattleEndedOrPastExpectedEnd(activeBattle)) {
      await admin
        .from("battles")
        .update({ status: "finished", battle_ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", activeBattle.id);
      continue;
    }
    const userQueueId =
      activeBattle.fighter_a_user_id === user.id
        ? activeBattle.queue_a_id
        : activeBattle.fighter_b_user_id === user.id
          ? activeBattle.queue_b_id
          : null;
    if (!userQueueId) continue;
    const { data: queueRole } = await admin
      .from("battle_queue")
      .select("id,challenge_target_queue_id,official_gatekeeper_role")
      .eq("id", userQueueId)
      .maybeSingle<{ id: string; challenge_target_queue_id?: string | null; official_gatekeeper_role?: string | null }>();
    const role = queueRole?.official_gatekeeper_role === "challenger"
      ? "challenger"
      : dropBattleRoleForChallengeTarget(queueRole?.challenge_target_queue_id ?? null);
    if (role === requestedRole) return jsonError(dropBattleRoleLockMessage("challenger", "zh"), 409);
  }

  const now = new Date().toISOString();
  const fighterName = cleanText(body.fighterName, user.email?.split("@")[0] ?? "Challenger", 40);
  const songName = cleanText(body.songName, "未命名 Drop", 500);
  const challengerAudioPath = body.audioPath.trim();
  const challengerAiTool = trimOrNull(body.aiTool, 40);
  const lyrics = trimOrNull(body.lyrics);
  const audioSha256 = /^[a-f0-9]{64}$/i.test(body.audioSha256 ?? "") ? String(body.audioSha256).toLowerCase() : null;
  const fullAudioPath = body.fullAudioPublic && typeof body.fullAudioPath === "string" && body.fullAudioPath.trim()
    ? body.fullAudioPath.trim()
    : null;
  const fullAudioSha256 = fullAudioPath && /^[a-f0-9]{64}$/i.test(body.fullAudioSha256 ?? "")
    ? String(body.fullAudioSha256).toLowerCase()
    : null;
  const fullAudioOriginalName = fullAudioPath ? trimOrNull(body.fullAudioOriginalName, 500) : null;
  const fullAudioDurationSeconds = fullAudioPath && Number.isFinite(Number(body.fullAudioDurationSeconds))
    ? Math.max(0, Number(body.fullAudioDurationSeconds))
    : null;
  const gatekeeperLyrics = trimOrNull(gatekeeper.lyrics);
  const gatekeeperCover = gatekeeper.coverPath;
  const gatekeeperCoverForBattle = gatekeeperCover ? await signedBattleAudioUrl(admin, gatekeeperCover, 60 * 60 * 24 * 365) : null;
  const gatekeeperSongName = officialGatekeeperDisplayTitle(gatekeeper);

  const [{ data: challengerFighter }, { data: challengerProfile }] = await Promise.all([
    admin.from("fighter_profiles").select("avatar_url,song_cover_url").eq("id", user.id).maybeSingle(),
    admin.from("user_profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
  ]);

  const defenderInsert = {
    user_id: defenderUserId,
    fighter_name: GATEKEEPER_FIGHTER_NAME,
    genre: gatekeeper.genre,
    audio_path: gatekeeper.audioPath,
    original_file_name: gatekeeperSongName,
    status: "matched",
    ai_tool: gatekeeper.aiTool,
    lyrics: gatekeeperLyrics,
    expires_at: schedulePayload?.scheduled_start_at ?? null,
    ...schedulePayload,
    official_gatekeeper_id: gatekeeper.id,
    official_gatekeeper_role: "defender",
  };

  const { data: defenderQueue, error: defenderError } = await admin
    .from("battle_queue")
    .insert(defenderInsert)
    .select("id")
    .single<{ id: string }>();
  if (defenderError || !defenderQueue?.id) {
    if (isSchemaMissing(defenderError)) return jsonError("尚未套用官方守門 Drop SQL 欄位。", 409);
    return jsonError(defenderError?.message ?? "建立官方守門 queue 失敗。", 500);
  }

  const challengerInsert = {
    user_id: user.id,
    fighter_name: fighterName,
    genre: gatekeeper.genre,
    audio_path: challengerAudioPath,
    audio_sha256: audioSha256,
    original_file_name: songName,
    status: "matched",
    ai_tool: challengerAiTool,
    lyrics,
    ...(fullAudioPath
      ? {
          full_audio_path: fullAudioPath,
          full_audio_public: true,
          full_audio_sha256: fullAudioSha256,
          full_audio_original_name: fullAudioOriginalName,
          full_audio_duration_seconds: fullAudioDurationSeconds,
        }
      : {}),
    challenge_target_queue_id: defenderQueue.id,
    expires_at: schedulePayload?.scheduled_start_at ?? null,
    ...schedulePayload,
    official_gatekeeper_id: gatekeeper.id,
    official_gatekeeper_role: "challenger",
  };

  const { data: challengerQueue, error: challengerError } = await admin
    .from("battle_queue")
    .insert(challengerInsert)
    .select("id")
    .single<{ id: string }>();
  if (challengerError || !challengerQueue?.id) {
    await admin.from("battle_queue").update({ status: "cancelled", updated_at: now }).eq("id", defenderQueue.id);
    if (fullAudioPath && isSchemaMissing(challengerError)) return jsonError("尚未套用 Drop Battle 完整版欄位，請先執行 supabase/20260625_drop_battle_full_song_honor.sql。", 409);
    if (isSchemaMissing(challengerError)) return jsonError("尚未套用官方守門 Drop SQL 欄位。", 409);
    return jsonError(challengerError?.message ?? "建立挑戰者 queue 失敗。", 500);
  }

  const scheduledMs = new Date(schedulePayload?.scheduled_start_at ?? "").getTime();
  const startIso = Number.isFinite(scheduledMs) && scheduledMs > Date.now() ? new Date(scheduledMs).toISOString() : now;
  const battleInsert = {
    queue_a_id: defenderQueue.id,
    queue_b_id: challengerQueue.id,
    fighter_a_user_id: defenderUserId,
    fighter_b_user_id: user.id,
    fighter_a_name: GATEKEEPER_FIGHTER_NAME,
    fighter_b_name: fighterName,
    song_a_name: gatekeeperSongName,
    song_b_name: songName,
    audio_a_path: gatekeeper.audioPath,
    audio_b_path: challengerAudioPath,
    genre: gatekeeper.genre,
    status: startIso > now ? "active" : "live",
    battle_type: "formal",
    is_async_match: true,
    ai_tool_a: gatekeeper.aiTool,
    ai_tool_b: challengerAiTool,
    lyrics_a: gatekeeperLyrics,
    lyrics_b: lyrics,
    started_at: startIso,
    waiting_room_started_at: now,
    stake_apc: 0,
    pot_apc: 0,
    vote_stake_apc: 0,
    song_a_cover: gatekeeperCoverForBattle ?? gatekeeperCover,
    song_b_cover: firstText(body.coverUrl, challengerFighter?.song_cover_url),
    fighter_a_avatar: null,
    fighter_b_avatar: firstText(body.avatarUrl, challengerFighter?.avatar_url, challengerProfile?.avatar_url),
    ...schedulePayload,
    official_gatekeeper_id: gatekeeper.id,
  };

  const { data: battleRow, error: battleError } = await admin
    .from("battles")
    .insert(battleInsert)
    .select("id")
    .single<{ id: string }>();
  if (battleError || !battleRow?.id) {
    await admin.from("battle_queue").update({ status: "cancelled", updated_at: now }).in("id", [defenderQueue.id, challengerQueue.id]);
    if (isSchemaMissing(battleError)) return jsonError("尚未套用官方守門 Drop SQL 欄位。", 409);
    return jsonError(battleError?.message ?? "建立官方守門 Battle 失敗。", 500);
  }

  const battleId = battleRow.id;
  await Promise.all([
    admin
      .from("battle_queue")
      .update({ status: "matched", opponent_user_id: user.id, match_group_id: battleId, matched_at: now, updated_at: now })
      .eq("id", defenderQueue.id),
    admin
      .from("battle_queue")
      .update({ status: "matched", opponent_user_id: defenderUserId, match_group_id: battleId, matched_at: now, updated_at: now })
      .eq("id", challengerQueue.id),
  ]);

  await admin.from("battle_notifications").insert({
    user_id: user.id,
    queue_id: challengerQueue.id,
    battle_id: battleId,
    type: "battle_matched",
    title: "官方守門 Drop 挑戰成立",
    body: "挑戰已成立。請分享戰場連結，拉人進來投票。",
    metadata: { gatekeeperId: gatekeeper.id, gateNumber: gatekeeper.gateNumber, opponentName: GATEKEEPER_FIGHTER_NAME },
  });

  return NextResponse.json({
    battleId,
    challengerQueueId: challengerQueue.id,
    defenderQueueId: defenderQueue.id,
    gatekeeperId: gatekeeper.id,
  });
}
