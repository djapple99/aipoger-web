import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  AI_MUSIC_CHALLENGE_BATTLE_TYPE,
  AI_MUSIC_CHALLENGE_DAILY_INVITE_LIMIT,
  hasPreparedAiMusicDefenderDrop,
  isAiMusicChallengeStatus,
} from "@/lib/ai-music-challenge-rules";
import { buildAiMusicSurfaceLifecycleMap } from "@/lib/ai-music-surface-lifecycle";
import type { ListenBarTrackRow as LifecycleListenBarTrackRow } from "@/lib/listen-bar";

type AdminClient = SupabaseClient;
type QueueRoleRow = {
  id: string;
  status: string | null;
  match_group_id?: string | null;
  challenge_target_queue_id?: string | null;
  official_gatekeeper_role?: string | null;
};
type ListenBarTrackRow = {
  id: string;
  title: string | null;
  artist: string | null;
  ai_tool: string | null;
  genre: string | null;
  mood?: string | null;
  lyrics?: string | null;
  bpm?: number | null;
  duration_seconds?: number | null;
  audio_path: string | null;
  cover_path?: string | null;
  created_by: string | null;
  source?: string | null;
  bar_phase?: string | null;
  is_active?: boolean | null;
  review_status?: string | null;
  hidden_at?: string | null;
  removed_at?: string | null;
  is_featured_official?: boolean | null;
  positive_reaction_count?: number | null;
  heart_count?: number | null;
  star_count?: number | null;
  thumb_count?: number | null;
  happy_count?: number | null;
  created_at?: string | null;
  promoted_at?: string | null;
  ai_music_challenge_status?: string | null;
  ai_music_defender_drop_audio_path?: string | null;
  ai_music_defender_drop_audio_sha256?: string | null;
  ai_music_defender_drop_original_name?: string | null;
  ai_music_defender_drop_duration_seconds?: number | null;
  ai_music_defender_drop_lyrics?: string | null;
  ai_music_defender_drop_prepared_at?: string | null;
};
type InviteRow = {
  id: string;
  defender_track_id: string;
  defender_user_id: string;
  challenger_user_id: string;
  defender_queue_id: string | null;
  challenger_queue_id: string | null;
  battle_id: string | null;
  status: string;
  scheduled_start_at: string | null;
  expires_at: string | null;
  created_at: string;
  defender_name?: string | null;
  defender_song_name?: string | null;
  defender_audio_path?: string | null;
  challenger_name?: string | null;
  challenger_song_name?: string | null;
  challenger_audio_path?: string | null;
  listen_bar_tracks?: {
    title?: string | null;
    artist?: string | null;
    genre?: string | null;
    ai_tool?: string | null;
  } | null;
};
type QueuePreviewRow = {
  id: string;
  fighter_name?: string | null;
  original_file_name?: string | null;
  genre?: string | null;
  ai_tool?: string | null;
  audio_path?: string | null;
};
type DefenderDropPayload = {
  audioPath?: unknown;
  audioSha256?: unknown;
  originalName?: unknown;
  durationSeconds?: unknown;
  lyrics?: unknown;
};

const CLOSED_BATTLE_STATUSES = ["finished", "cancelled", "cancelled_no_challenger", "cancelled_founder", "completed", "expired"];
const LIFECYCLE_TRACK_SELECT = "id,title,artist,ai_tool,genre,mood,bpm,duration_seconds,audio_path,cover_path,lyrics,is_active,review_status,hidden_at,removed_at,source,is_featured_official,bar_phase,positive_reaction_count,heart_count,star_count,thumb_count,happy_count,created_at,promoted_at";
const AI_MUSIC_INVITE_SELECT = "id,defender_track_id,defender_user_id,challenger_user_id,defender_queue_id,challenger_queue_id,battle_id,status,scheduled_start_at,expires_at,created_at,listen_bar_tracks(title,artist,genre,ai_tool)";
const AI_MUSIC_INVITE_RESPONSE_WINDOW_MS = 5 * 60 * 1000;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isSchemaMissing(error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /ai_music_challenge|battle_type|schema cache|column.*does not exist|relation.*does not exist|PGRST204|42P01/i.test(msg);
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

function cleanDurationSeconds(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(60, Number(number.toFixed(2))));
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function taipeiDayStartIso(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return new Date(`${year}-${month}-${day}T00:00:00+08:00`).toISOString();
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

function publicStorageUrl(admin: AdminClient, bucket: string, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^(https?:|blob:|data:|\/)/i.test(clean)) return clean;
  return admin.storage.from(bucket).getPublicUrl(clean).data.publicUrl;
}

async function getUserFromRequest(admin: AdminClient, request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401), token: null, user: null };
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user) return { error: jsonError("登入狀態已過期。", 401), token, user: null };
  return { error: null, token, user };
}

async function hasActiveChallengerLock(admin: AdminClient, userId: string) {
  const { data: activeQueues, error: activeQueueError } = await admin
    .from("battle_queue")
    .select("id,status,match_group_id,challenge_target_queue_id,official_gatekeeper_role")
    .eq("user_id", userId)
    .in("status", [...ACTIVE_DROP_QUEUE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(12);
  if (activeQueueError) throw activeQueueError;

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
    if (role === "challenger") return true;
  }

  const { data: activeBattles, error: activeBattleError } = await admin
    .from("battles")
    .select("id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,status,battle_ended_at,scheduled_start_at,started_at,battle_started_at,created_at")
    .or(`fighter_a_user_id.eq.${userId},fighter_b_user_id.eq.${userId}`)
    .in("status", [...ACTIVE_DROP_BATTLE_STATUSES])
    .is("battle_ended_at", null)
    .limit(8);
  if (activeBattleError) throw activeBattleError;

  for (const activeBattle of activeBattles ?? []) {
    if (isDropBattleEndedOrPastExpectedEnd(activeBattle)) {
      await admin
        .from("battles")
        .update({ status: "finished", battle_ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", activeBattle.id);
      continue;
    }
    const userQueueId =
      activeBattle.fighter_a_user_id === userId
        ? activeBattle.queue_a_id
        : activeBattle.fighter_b_user_id === userId
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
    if (role === "challenger") return true;
  }
  return false;
}

async function notify(admin: AdminClient, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;
  const { error } = await admin.from("battle_notifications").insert(rows);
  if (error && !/schema cache|does not exist|Could not find/i.test(error.message)) {
    console.warn("[ai-music challenge notify]", error.message);
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

async function enrichInviteRows(admin: AdminClient, rows: InviteRow[]): Promise<InviteRow[]> {
  const queueIds = uniqueStrings(rows.flatMap((row) => [row.defender_queue_id, row.challenger_queue_id]));
  if (queueIds.length === 0) return rows;

  const { data, error } = await admin
    .from("battle_queue")
    .select("id,fighter_name,original_file_name,genre,ai_tool,audio_path")
    .in("id", queueIds);
  if (error) {
    if (!/schema cache|does not exist|Could not find/i.test(error.message)) {
      console.warn("[ai-music challenge invite queues]", error.message);
    }
    return rows;
  }

  const queueById = new Map(((data ?? []) as QueuePreviewRow[]).map((queue) => [queue.id, queue]));
  return rows.map((row) => {
    const defenderQueue = row.defender_queue_id ? queueById.get(row.defender_queue_id) : null;
    const challengerQueue = row.challenger_queue_id ? queueById.get(row.challenger_queue_id) : null;
    return {
      ...row,
      defender_name: defenderQueue?.fighter_name ?? row.listen_bar_tracks?.artist ?? null,
      defender_song_name: defenderQueue?.original_file_name ?? row.listen_bar_tracks?.title ?? null,
      defender_audio_path: defenderQueue?.audio_path ?? null,
      challenger_name: challengerQueue?.fighter_name ?? null,
      challenger_song_name: challengerQueue?.original_file_name ?? null,
      challenger_audio_path: challengerQueue?.audio_path ?? null,
    };
  });
}

async function expirePendingInviteRows(admin: AdminClient, rows: InviteRow[]) {
  const nowIso = new Date().toISOString();
  const expiredRows = rows.filter((row) => {
    if (row.status !== "pending") return false;
    const expiresMs = new Date(row.expires_at ?? "").getTime();
    return Number.isFinite(expiresMs) && expiresMs <= Date.now();
  });
  if (expiredRows.length === 0) return 0;

  const ids = expiredRows.map((row) => row.id);
  const { error } = await admin
    .from("ai_music_challenge_invites")
    .update({ status: "expired", responded_at: nowIso, updated_at: nowIso })
    .in("id", ids)
    .eq("status", "pending");
  if (error) throw error;

  const battleIds = uniqueStrings(expiredRows.map((row) => row.battle_id));
  if (battleIds.length > 0) {
    await admin.from("battles").update({ status: "expired", battle_ended_at: nowIso, updated_at: nowIso }).in("id", battleIds);
  }

  const queueIds = uniqueStrings(expiredRows.flatMap((row) => [row.defender_queue_id, row.challenger_queue_id]));
  if (queueIds.length > 0) {
    await admin.from("battle_queue").update({ status: "expired", updated_at: nowIso }).in("id", queueIds);
  }

  await notify(admin, expiredRows.flatMap((row) => ([
    {
      user_id: row.defender_user_id,
      queue_id: row.defender_queue_id,
      battle_id: row.battle_id,
      type: "ai_music_challenge_expired",
      title: "攻擂邀請已失效",
      body: "未在預定開打前回覆，這場不算戰績、不進 Showtime，也不算任何一方勝敗。",
      metadata: { inviteId: row.id, defenderTrackId: row.defender_track_id, expiredAt: nowIso, href: "/profile#pending-ai-music-challenges" },
    },
    {
      user_id: row.challenger_user_id,
      queue_id: row.challenger_queue_id,
      battle_id: row.battle_id,
      type: "ai_music_challenge_expired",
      title: "攻擂邀請已失效",
      body: "關主未在期限內回覆，這場不算戰績、不進 Showtime，也不算任何一方勝敗。",
      metadata: { inviteId: row.id, defenderTrackId: row.defender_track_id, expiredAt: nowIso },
    },
  ])));

  return expiredRows.length;
}

async function expireExpiredInvitesForUser(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("ai_music_challenge_invites")
    .select(AI_MUSIC_INVITE_SELECT)
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString())
    .or(`defender_user_id.eq.${userId},challenger_user_id.eq.${userId}`);
  if (error) throw error;
  return expirePendingInviteRows(admin, (data ?? []) as InviteRow[]);
}

async function expireExpiredInvitesForTrack(admin: AdminClient, trackId: string) {
  const { data, error } = await admin
    .from("ai_music_challenge_invites")
    .select(AI_MUSIC_INVITE_SELECT)
    .eq("defender_track_id", trackId)
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString());
  if (error) throw error;
  return expirePendingInviteRows(admin, (data ?? []) as InviteRow[]);
}

export async function GET(request: NextRequest) {
  let admin: AdminClient;
  try {
    admin = adminClient();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }

  const auth = await getUserFromRequest(admin, request);
  if (auth.error || !auth.user) return auth.error;

  try {
    await expireExpiredInvitesForUser(admin, auth.user.id);
  } catch (error) {
    if (isSchemaMissing(error as { message?: string })) return jsonError(String((error as { message?: string })?.message ?? error), 409);
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }

  const [incoming, outgoing] = await Promise.all([
    admin
      .from("ai_music_challenge_invites")
      .select(AI_MUSIC_INVITE_SELECT)
      .eq("defender_user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("ai_music_challenge_invites")
      .select(AI_MUSIC_INVITE_SELECT)
      .eq("challenger_user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (incoming.error) return jsonError(incoming.error.message, isSchemaMissing(incoming.error) ? 409 : 500);
  if (outgoing.error) return jsonError(outgoing.error.message, isSchemaMissing(outgoing.error) ? 409 : 500);

  return NextResponse.json({
    incoming: await enrichInviteRows(admin, (incoming.data ?? []) as InviteRow[]),
    outgoing: await enrichInviteRows(admin, (outgoing.data ?? []) as InviteRow[]),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let admin: AdminClient;
  try {
    admin = adminClient();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }

  const auth = await getUserFromRequest(admin, request);
  if (auth.error || !auth.user) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    defenderTrackId?: unknown;
    fighterName?: unknown;
    songName?: unknown;
    aiTool?: unknown;
    audioPath?: unknown;
    audioSha256?: unknown;
    lyrics?: unknown;
    avatarUrl?: unknown;
    coverUrl?: unknown;
    schedulePreset?: unknown;
    scheduledStartIso?: unknown;
  } | null;
  const defenderTrackId = isUuid(body?.defenderTrackId) ? body.defenderTrackId : null;
  if (!defenderTrackId) return jsonError("缺少要挑戰的作品。");
  if (typeof body?.audioPath !== "string" || !body.audioPath.trim()) return jsonError("缺少挑戰者 Drop 音檔。");

  const scheduleResult = scheduleFromBody(body ?? {});
  if (scheduleResult && "error" in scheduleResult) return jsonError(scheduleErrorMessage(scheduleResult.error), 400);
  const schedulePayload = scheduleResult ?? buildDropBattleSchedulePayloadFromPreset(10);
  const scheduledMs = new Date(schedulePayload?.scheduled_start_at ?? "").getTime();
  const scheduledStartAt = Number.isFinite(scheduledMs) ? new Date(scheduledMs).toISOString() : new Date(Date.now() + 10 * 60 * 1000).toISOString();
  if (new Date(scheduledStartAt).getTime() - Date.now() < AI_MUSIC_INVITE_RESPONSE_WINDOW_MS) {
    return jsonError("攻擂開打時間至少要留 5 分鐘給關主回覆。", 400);
  }

  try {
    await expireExpiredInvitesForUser(admin, auth.user.id);
    await expireExpiredInvitesForTrack(admin, defenderTrackId);
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), isSchemaMissing(error as { message?: string }) ? 409 : 500);
  }

  const { count: todayInviteCount, error: countError } = await admin
    .from("ai_music_challenge_invites")
    .select("id", { count: "exact", head: true })
    .eq("challenger_user_id", auth.user.id)
    .gte("created_at", taipeiDayStartIso());
  if (countError) return jsonError(countError.message, isSchemaMissing(countError) ? 409 : 500);
  if ((todayInviteCount ?? 0) >= AI_MUSIC_CHALLENGE_DAILY_INVITE_LIMIT) {
    return jsonError(`你今天已送出 ${AI_MUSIC_CHALLENGE_DAILY_INVITE_LIMIT} 次攻擂邀請，明天再來。`, 429);
  }

  const { data: track, error: trackError } = await admin
    .from("listen_bar_tracks")
    .select("id,title,artist,ai_tool,genre,lyrics,audio_path,cover_path,created_by,source,bar_phase,is_active,review_status,ai_music_challenge_status,ai_music_defender_drop_audio_path,ai_music_defender_drop_audio_sha256,ai_music_defender_drop_original_name,ai_music_defender_drop_duration_seconds,ai_music_defender_drop_lyrics,ai_music_defender_drop_prepared_at")
    .eq("id", defenderTrackId)
    .maybeSingle<ListenBarTrackRow>();
  if (trackError) return jsonError(trackError.message, isSchemaMissing(trackError) ? 409 : 500);
  if (!track?.id) return jsonError("找不到要挑戰的作品。", 404);
  if (!track.created_by) return jsonError("這首作品沒有可接戰的創作者帳號。", 409);
  if (track.created_by === auth.user.id) return jsonError("不能從探索頁攻擂自己的作品。", 409);
  if (track.source !== "community" || track.is_active === false || track.review_status === "removed" || track.review_status === "rejected") {
    return jsonError("這首作品目前不在 AI 音樂公播池。", 409);
  }
  const { data: lifecycleRows, error: lifecycleRowsError } = await admin
    .from("listen_bar_tracks")
    .select(LIFECYCLE_TRACK_SELECT)
    .eq("source", "community")
    .eq("is_active", true)
    .limit(500);
  if (lifecycleRowsError) return jsonError(lifecycleRowsError.message, isSchemaMissing(lifecycleRowsError) ? 409 : 500);
  let lifecycleByTrackId: Awaited<ReturnType<typeof buildAiMusicSurfaceLifecycleMap>>;
  try {
    lifecycleByTrackId = await buildAiMusicSurfaceLifecycleMap(admin, (lifecycleRows ?? []) as LifecycleListenBarTrackRow[]);
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
  const lifecycle = lifecycleByTrackId.get(track.id);
  if (lifecycle?.isShowtimeCertified) {
    return jsonError("這首作品已進入 Showtime，入選後不再接受挑戰。", 409);
  }
  if (lifecycle?.retiredFromExplore) {
    return jsonError("這首作品已累積 8 場正式敗績，已從探索公開牆退場並停止接戰。", 409);
  }
  if (track.ai_music_challenge_status !== "open") return jsonError("這首作品目前暫不接戰。", 409);
  if (!hasPreparedAiMusicDefenderDrop(track.ai_music_defender_drop_audio_path)) {
    return jsonError("這首作品尚未準備守擂 60s Drop。", 409);
  }

  const { count: duplicatePendingCount, error: duplicatePendingError } = await admin
    .from("ai_music_challenge_invites")
    .select("id", { count: "exact", head: true })
    .eq("defender_track_id", track.id)
    .eq("challenger_user_id", auth.user.id)
    .eq("status", "pending");
  if (duplicatePendingError) return jsonError(duplicatePendingError.message, isSchemaMissing(duplicatePendingError) ? 409 : 500);
  if ((duplicatePendingCount ?? 0) > 0) {
    return jsonError("你已對這首歌送出待回覆攻擂邀請，請等關主回覆。", 409);
  }

  if (await hasActiveChallengerLock(admin, auth.user.id)) {
    return jsonError(dropBattleRoleLockMessage("challenger", "zh"), 409);
  }

  const now = new Date().toISOString();
  const fighterName = cleanText(body?.fighterName, auth.user.email?.split("@")[0] ?? "Challenger", 40);
  const songName = cleanText(body?.songName, "未命名 Drop", 500);
  const challengerAudioPath = body.audioPath.trim();
  const challengerAiTool = trimOrNull(body.aiTool, 40);
  const lyrics = trimOrNull(body.lyrics);
  const audioSha256 = /^[a-f0-9]{64}$/i.test(String(body.audioSha256 ?? "")) ? String(body.audioSha256).toLowerCase() : null;
  const defenderDropAudioPath = track.ai_music_defender_drop_audio_path?.trim() ?? "";
  if (!defenderDropAudioPath) return jsonError("這首作品尚未準備守擂 60s Drop。", 409);
  const defenderAudioSha256 = /^[a-f0-9]{64}$/i.test(String(track.ai_music_defender_drop_audio_sha256 ?? ""))
    ? String(track.ai_music_defender_drop_audio_sha256).toLowerCase()
    : null;
  const defenderCoverUrl = publicStorageUrl(admin, "listen-bar-covers", track.cover_path);
  const defenderName = cleanText(track.artist, "AIPOGER Creator", 80);
  const defenderSong = cleanText(track.title, "AI Music Work", 500);
  const defenderDropName = cleanText(track.ai_music_defender_drop_original_name, defenderSong, 500);
  const defenderLyrics = trimOrNull(track.ai_music_defender_drop_lyrics) ?? trimOrNull(track.lyrics);
  const defenderTool = trimOrNull(track.ai_tool, 40);
  const genre = cleanText(track.genre, "Original 自我風格", 80);

  const defenderInsert = {
    user_id: track.created_by,
    fighter_name: defenderName,
    genre,
    audio_path: defenderDropAudioPath,
    audio_sha256: defenderAudioSha256,
    original_file_name: defenderDropName,
    status: "matched",
    ai_tool: defenderTool,
    lyrics: defenderLyrics,
    expires_at: schedulePayload?.scheduled_start_at ?? null,
    ...schedulePayload,
  };
  const { data: defenderQueue, error: defenderError } = await admin
    .from("battle_queue")
    .insert(defenderInsert)
    .select("id")
    .single<{ id: string }>();
  if (defenderError || !defenderQueue?.id) {
    return jsonError(defenderError?.message ?? "建立關主 queue 失敗。", isSchemaMissing(defenderError) ? 409 : 500);
  }

  const challengerInsert = {
    user_id: auth.user.id,
    fighter_name: fighterName,
    genre,
    audio_path: challengerAudioPath,
    audio_sha256: audioSha256,
    original_file_name: songName,
    status: "matched",
    ai_tool: challengerAiTool,
    lyrics,
    challenge_target_queue_id: defenderQueue.id,
    expires_at: schedulePayload?.scheduled_start_at ?? null,
    ...schedulePayload,
  };
  const { data: challengerQueue, error: challengerError } = await admin
    .from("battle_queue")
    .insert(challengerInsert)
    .select("id")
    .single<{ id: string }>();
  if (challengerError || !challengerQueue?.id) {
    await admin.from("battle_queue").update({ status: "cancelled", updated_at: now }).eq("id", defenderQueue.id);
    return jsonError(challengerError?.message ?? "建立挑戰者 queue 失敗。", isSchemaMissing(challengerError) ? 409 : 500);
  }

  const battleInsert = {
    queue_a_id: defenderQueue.id,
    queue_b_id: challengerQueue.id,
    fighter_a_user_id: track.created_by,
    fighter_b_user_id: auth.user.id,
    fighter_a_name: defenderName,
    fighter_b_name: fighterName,
    song_a_name: defenderSong,
    song_b_name: songName,
    audio_a_path: defenderDropAudioPath,
    audio_b_path: challengerAudioPath,
    genre,
    status: "pending",
    battle_type: AI_MUSIC_CHALLENGE_BATTLE_TYPE,
    is_async_match: true,
    ai_tool_a: defenderTool,
    ai_tool_b: challengerAiTool,
    lyrics_a: defenderLyrics,
    lyrics_b: lyrics,
    started_at: scheduledStartAt,
    scheduled_start_at: scheduledStartAt,
    cancellation_evaluation_at: schedulePayload?.cancellation_evaluation_at ?? new Date(new Date(scheduledStartAt).getTime() + 60 * 1000).toISOString(),
    waiting_room_started_at: now,
    stake_apc: 0,
    pot_apc: 0,
    vote_stake_apc: 0,
    song_a_cover: defenderCoverUrl,
    song_b_cover: firstText(body.coverUrl),
    fighter_a_avatar: null,
    fighter_b_avatar: firstText(body.avatarUrl),
  };
  const { data: battleRow, error: battleError } = await admin
    .from("battles")
    .insert(battleInsert)
    .select("id")
    .single<{ id: string }>();
  if (battleError || !battleRow?.id) {
    await admin.from("battle_queue").update({ status: "cancelled", updated_at: now }).in("id", [defenderQueue.id, challengerQueue.id]);
    return jsonError(battleError?.message ?? "建立攻擂 Battle 失敗。", isSchemaMissing(battleError) ? 409 : 500);
  }

  const battleId = battleRow.id;
  await Promise.all([
    admin
      .from("battle_queue")
      .update({ status: "matched", opponent_user_id: auth.user.id, match_group_id: battleId, matched_at: now, updated_at: now })
      .eq("id", defenderQueue.id),
    admin
      .from("battle_queue")
      .update({ status: "matched", opponent_user_id: track.created_by, match_group_id: battleId, matched_at: now, updated_at: now })
      .eq("id", challengerQueue.id),
  ]);

  const { data: invite, error: inviteError } = await admin
    .from("ai_music_challenge_invites")
    .insert({
      defender_track_id: track.id,
      defender_user_id: track.created_by,
      challenger_user_id: auth.user.id,
      defender_queue_id: defenderQueue.id,
      challenger_queue_id: challengerQueue.id,
      battle_id: battleId,
      status: "pending",
      scheduled_start_at: scheduledStartAt,
      expires_at: scheduledStartAt,
    })
    .select("id")
    .single<{ id: string }>();
  if (inviteError || !invite?.id) {
    await admin.from("battle_queue").update({ status: "cancelled", updated_at: now }).in("id", [defenderQueue.id, challengerQueue.id]);
    await admin.from("battles").update({ status: "cancelled", battle_ended_at: now, updated_at: now }).eq("id", battleId);
    return jsonError(inviteError?.message ?? "建立攻擂邀請失敗。", isSchemaMissing(inviteError) ? 409 : 500);
  }

  await notify(admin, [
    {
      user_id: track.created_by,
      queue_id: defenderQueue.id,
      battle_id: battleId,
      type: "ai_music_challenge_invite",
      title: "有人向你的作品攻擂",
      body: `${fighterName} 想用《${songName}》挑戰你的《${defenderSong}》。請到創作者中心接受或拒絕。`,
      metadata: { inviteId: invite.id, defenderTrackId: track.id, scheduledStartAt, href: "/profile#pending-ai-music-challenges" },
    },
    {
      user_id: auth.user.id,
      queue_id: challengerQueue.id,
      battle_id: battleId,
      type: "ai_music_challenge_pending",
      title: "攻擂邀請已送出",
      body: `等待關主接受《${defenderSong}》。接受後依預定時間開打。`,
      metadata: { inviteId: invite.id, defenderTrackId: track.id, scheduledStartAt },
    },
  ]);

  return NextResponse.json({
    inviteId: invite.id,
    battleId,
    challengerQueueId: challengerQueue.id,
    defenderQueueId: defenderQueue.id,
    scheduledStartAt,
  });
}

export async function PATCH(request: NextRequest) {
  let admin: AdminClient;
  try {
    admin = adminClient();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }

  const auth = await getUserFromRequest(admin, request);
  if (auth.error || !auth.user) return auth.error;

  const body = (await request.json().catch(() => null)) as {
    trackId?: unknown;
    status?: unknown;
    defenderDrop?: DefenderDropPayload;
    inviteId?: unknown;
    decision?: unknown;
  } | null;

  if (isUuid(body?.trackId)) {
    if (body?.defenderDrop && typeof body.defenderDrop === "object") {
      const defenderDrop = body.defenderDrop;
      const audioPath = trimOrNull(defenderDrop.audioPath, 1600);
      if (!audioPath) return jsonError("請先切好或指定守擂 60s Drop。");

      try {
        await expireExpiredInvitesForTrack(admin, body.trackId);
      } catch (error) {
        return jsonError(String((error as { message?: string })?.message ?? error), isSchemaMissing(error as { message?: string }) ? 409 : 500);
      }

      const { count: pendingCount, error: pendingError } = await admin
        .from("ai_music_challenge_invites")
        .select("id", { count: "exact", head: true })
        .eq("defender_track_id", body.trackId)
        .eq("status", "pending");
      if (pendingError) return jsonError(pendingError.message, isSchemaMissing(pendingError) ? 409 : 500);
      if ((pendingCount ?? 0) > 0) return jsonError("有待回覆攻擂邀請時不能修改守擂 Drop。", 409);

      const audioSha256 = /^[a-f0-9]{64}$/i.test(String(defenderDrop.audioSha256 ?? ""))
        ? String(defenderDrop.audioSha256).toLowerCase()
        : null;
      const nowIso = new Date().toISOString();
      const { data, error } = await admin
        .from("listen_bar_tracks")
        .update({
          ai_music_defender_drop_audio_path: audioPath,
          ai_music_defender_drop_audio_sha256: audioSha256,
          ai_music_defender_drop_original_name: cleanText(defenderDrop.originalName, "守擂 60s Drop", 500),
          ai_music_defender_drop_duration_seconds: cleanDurationSeconds(defenderDrop.durationSeconds),
          ai_music_defender_drop_lyrics: trimOrNull(defenderDrop.lyrics),
          ai_music_defender_drop_prepared_at: nowIso,
          ai_music_challenge_updated_at: nowIso,
        })
        .eq("id", body.trackId)
        .eq("created_by", auth.user.id)
        .eq("source", "community")
        .eq("is_active", true)
        .select("id,ai_music_challenge_status,ai_music_defender_drop_audio_path,ai_music_defender_drop_prepared_at")
        .maybeSingle<{
          id: string;
          ai_music_challenge_status: string;
          ai_music_defender_drop_audio_path: string | null;
          ai_music_defender_drop_prepared_at: string | null;
        }>();
      if (error) return jsonError(error.message, isSchemaMissing(error) ? 409 : 500);
      if (!data?.id) return jsonError("找不到可修改的歌曲。", 404);
      return NextResponse.json({ track: data });
    }

    if (!isAiMusicChallengeStatus(body?.status)) return jsonError("無效的接戰狀態。");
    if (body.status === "open") {
      const { data: track, error: trackError } = await admin
        .from("listen_bar_tracks")
        .select("id,ai_music_defender_drop_audio_path")
        .eq("id", body.trackId)
        .eq("created_by", auth.user.id)
        .eq("source", "community")
        .eq("is_active", true)
        .maybeSingle<{ id: string; ai_music_defender_drop_audio_path: string | null }>();
      if (trackError) return jsonError(trackError.message, isSchemaMissing(trackError) ? 409 : 500);
      if (!track?.id) return jsonError("找不到可修改的歌曲。", 404);
      if (!hasPreparedAiMusicDefenderDrop(track.ai_music_defender_drop_audio_path)) {
        return jsonError("請先指定守擂 60s Drop，才能開放等人挑戰。", 409);
      }
    }
    const { data, error } = await admin
      .from("listen_bar_tracks")
      .update({
        ai_music_challenge_status: body.status,
        ai_music_challenge_updated_at: new Date().toISOString(),
      })
      .eq("id", body.trackId)
      .eq("created_by", auth.user.id)
      .eq("source", "community")
      .eq("is_active", true)
      .select("id,ai_music_challenge_status,ai_music_defender_drop_audio_path,ai_music_defender_drop_prepared_at")
      .maybeSingle<{
        id: string;
        ai_music_challenge_status: string;
        ai_music_defender_drop_audio_path: string | null;
        ai_music_defender_drop_prepared_at: string | null;
      }>();
    if (error) return jsonError(error.message, isSchemaMissing(error) ? 409 : 500);
    if (!data?.id) return jsonError("找不到可修改的歌曲。", 404);
    return NextResponse.json({ track: data });
  }

  const inviteId = isUuid(body?.inviteId) ? body.inviteId : null;
  const decision = body?.decision === "accept" || body?.decision === "reject" ? body.decision : null;
  if (!inviteId || !decision) return jsonError("缺少邀請或回應動作。");

  const { data: invite, error: inviteError } = await admin
    .from("ai_music_challenge_invites")
    .select(AI_MUSIC_INVITE_SELECT)
    .eq("id", inviteId)
    .maybeSingle<InviteRow>();
  if (inviteError) return jsonError(inviteError.message, isSchemaMissing(inviteError) ? 409 : 500);
  if (!invite?.id) return jsonError("找不到攻擂邀請。", 404);
  if (invite.defender_user_id !== auth.user.id) return jsonError("只有關主可以回應這個攻擂邀請。", 403);
  if (invite.status !== "pending") return jsonError("這個攻擂邀請已經處理過。", 409);

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresMs = new Date(invite.expires_at ?? "").getTime();
  if (Number.isFinite(expiresMs) && expiresMs <= now.getTime()) {
    await admin
      .from("ai_music_challenge_invites")
      .update({ status: "expired", responded_at: nowIso, updated_at: nowIso })
      .eq("id", invite.id);
    if (invite.battle_id) await admin.from("battles").update({ status: "expired", battle_ended_at: nowIso, updated_at: nowIso }).eq("id", invite.battle_id);
    const queueIds = [invite.defender_queue_id, invite.challenger_queue_id].filter((id): id is string => Boolean(id));
    if (queueIds.length > 0) await admin.from("battle_queue").update({ status: "expired", updated_at: nowIso }).in("id", queueIds);
    await notify(admin, [
      {
        user_id: invite.defender_user_id,
        queue_id: invite.defender_queue_id,
        battle_id: invite.battle_id,
        type: "ai_music_challenge_expired",
        title: "攻擂邀請已失效",
        body: "未在預定開打前回覆，這場不算戰績、不進 Showtime，也不算任何一方勝敗。",
        metadata: { inviteId: invite.id, defenderTrackId: invite.defender_track_id, expiredAt: nowIso, href: "/profile#pending-ai-music-challenges" },
      },
      {
        user_id: invite.challenger_user_id,
        queue_id: invite.challenger_queue_id,
        battle_id: invite.battle_id,
        type: "ai_music_challenge_expired",
        title: "攻擂邀請已失效",
        body: "關主未在期限內回覆，這場不算戰績、不進 Showtime，也不算任何一方勝敗。",
        metadata: { inviteId: invite.id, defenderTrackId: invite.defender_track_id, expiredAt: nowIso },
      },
    ]);
    return jsonError("這個攻擂邀請已逾時失效。", 409);
  }

  const queueIds = [invite.defender_queue_id, invite.challenger_queue_id].filter((id): id is string => Boolean(id));
  if (decision === "reject") {
    await admin
      .from("ai_music_challenge_invites")
      .update({ status: "rejected", responded_at: nowIso, updated_at: nowIso })
      .eq("id", invite.id);
    if (queueIds.length > 0) await admin.from("battle_queue").update({ status: "cancelled", updated_at: nowIso }).in("id", queueIds);
    if (invite.battle_id) {
      await admin.from("battles").update({ status: "cancelled_no_challenger", battle_ended_at: nowIso, updated_at: nowIso }).eq("id", invite.battle_id);
    }
    await notify(admin, [
      {
        user_id: invite.challenger_user_id,
        queue_id: invite.challenger_queue_id,
        battle_id: invite.battle_id,
        type: "ai_music_challenge_rejected",
        title: "關主拒絕攻擂",
        body: "這次攻擂已結束，不算戰績，也不會顯示為挑戰者失敗。",
        metadata: { inviteId: invite.id, defenderTrackId: invite.defender_track_id },
      },
    ]);
    return NextResponse.json({ inviteId: invite.id, status: "rejected" });
  }

  const scheduledMs = new Date(invite.scheduled_start_at ?? "").getTime();
  const startIso = Number.isFinite(scheduledMs) && scheduledMs > now.getTime() ? new Date(scheduledMs).toISOString() : nowIso;
  const nextStatus = startIso > nowIso ? "active" : "live";
  await admin
    .from("ai_music_challenge_invites")
    .update({ status: "accepted", responded_at: nowIso, updated_at: nowIso })
    .eq("id", invite.id);
  if (invite.battle_id) {
    await admin
      .from("battles")
      .update({
        status: nextStatus,
        started_at: startIso,
        battle_started_at: nextStatus === "live" ? nowIso : null,
        updated_at: nowIso,
      })
      .eq("id", invite.battle_id);
  }
  if (queueIds.length > 0) await admin.from("battle_queue").update({ status: "matched", updated_at: nowIso }).in("id", queueIds);
  await notify(admin, [
    {
      user_id: invite.challenger_user_id,
      queue_id: invite.challenger_queue_id,
      battle_id: invite.battle_id,
      type: "ai_music_challenge_accepted",
      title: "關主已接戰",
      body: nextStatus === "live" ? "攻擂已成立，現在可以進場開打。" : "攻擂已成立，請依預定時間進場開打。",
      metadata: { inviteId: invite.id, defenderTrackId: invite.defender_track_id, scheduledStartAt: startIso },
    },
    {
      user_id: invite.defender_user_id,
      queue_id: invite.defender_queue_id,
      battle_id: invite.battle_id,
      type: "ai_music_challenge_accepted_defender",
      title: "你已接受攻擂",
      body: nextStatus === "live" ? "攻擂已成立，現在可以進場開打。" : "攻擂已成立，請依預定時間進場開打。",
      metadata: { inviteId: invite.id, defenderTrackId: invite.defender_track_id, scheduledStartAt: startIso },
    },
  ]);

  return NextResponse.json({ inviteId: invite.id, status: "accepted", battleId: invite.battle_id, scheduledStartAt: startIso });
}
