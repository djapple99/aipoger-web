import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  canQCrashAccountJoin,
  isValidQCrashSunoUrl,
  qCrashSourceType,
} from "@/lib/q-crash-rules";
import { ACTIVE_DROP_QUEUE_STATUSES, dropBattleRoleLockMessage } from "@/lib/battle-pool-rules";
import { isValidStorageObjectKey } from "@/lib/storage-path";
import { resolveQCrashSunoMediaSource } from "@/lib/q-crash-suno-media";

type RouteProps = { params: Promise<{ id: string }> };
type CardRow = {
  id: string;
  founder_user_id: string;
  founder_queue_id: string;
  invited_user_id: string | null;
  status: string;
  duration_minutes: number;
  invite_expires_at: string;
};
type QueueRow = {
  id: string;
  user_id: string;
  fighter_name: string;
  genre: string;
  audio_path: string | null;
  original_file_name: string;
  source_type: string | null;
  source_url: string | null;
  title: string | null;
  creator: string | null;
  duration_seconds: number | null;
  rights_confirmed_at: string | null;
  ai_tool: string | null;
  lyrics: string | null;
  cover_url: string | null;
  status: string;
  match_group_id: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function tokenFromRequest(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() || null : null;
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Q Crash 連結不正確。");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return jsonError("Q Crash 尚未完成伺服器設定。", 503);
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入再放入作品 B。", 401);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return jsonError("登入狀態已失效。", 401);

  const body = (await request.json().catch(() => null)) as {
    queueId?: string;
    rightsConfirmed?: boolean;
  } | null;
  if (!isUuid(body?.queueId)) return jsonError("找不到作品 B 的歌曲。");
  if (body?.rightsConfirmed !== true) return jsonError("請先確認歌曲的創作或使用權利。");

  const { data: card, error: cardError } = await admin
    .from("q_crash_cards")
    .select("id,founder_user_id,founder_queue_id,invited_user_id,status,duration_minutes,invite_expires_at")
    .eq("id", id)
    .maybeSingle<CardRow>();
  if (cardError) return jsonError(cardError.message, 500);
  if (!card?.id) return jsonError("找不到這張 Q Crash。", 404);
  if (!canQCrashAccountJoin({
    status: card.status,
    founderUserId: card.founder_user_id,
    invitedUserId: card.invited_user_id,
    viewerUserId: user.id,
    inviteExpiresAt: card.invite_expires_at,
  })) {
    return jsonError("這張 Q Crash 已被接受、已過期，或只開放給指定創作者。", 409);
  }

  let { data: queues, error: queuesError } = await admin
    .from("battle_queue")
    .select("id,user_id,fighter_name,genre,audio_path,original_file_name,ai_tool,lyrics,cover_url,status,match_group_id,source_type,source_url,title,creator,duration_seconds,rights_confirmed_at")
    .in("id", [card.founder_queue_id, body.queueId])
    .returns<QueueRow[]>();
  if (queuesError && /cover_url|schema cache|column.*does not exist|PGRST204/i.test(queuesError.message)) {
    const legacyQueues = await admin
      .from("battle_queue")
      .select("id,user_id,fighter_name,genre,audio_path,original_file_name,ai_tool,lyrics,status,match_group_id")
      .in("id", [card.founder_queue_id, body.queueId])
      .returns<QueueRow[]>();
    queues = legacyQueues.data;
    queuesError = legacyQueues.error;
  }
  if (queuesError) return jsonError(queuesError.message, 500);
  const founderQueue = (queues ?? []).find((queue) => queue.id === card.founder_queue_id);
  const challengerQueue = (queues ?? []).find((queue) => queue.id === body.queueId);
  if (!founderQueue) return jsonError("作品 A 已無法讀取。", 404);
  if (!challengerQueue || challengerQueue.user_id !== user.id) return jsonError("作品 B 的歌曲不存在。", 404);
  if (founderQueue.id === challengerQueue.id) return jsonError("作品 A、B 必須使用兩首不同的歌曲。");
  const challengerSourceType = qCrashSourceType(challengerQueue.source_type) || (challengerQueue.audio_path ? "upload" : null);
  const challengerSourceUrl = challengerQueue.source_url?.trim() || (challengerSourceType === "upload" ? challengerQueue.audio_path : null);
  if (!challengerSourceType) return jsonError("作品 B 的歌曲來源資料不完整，請重新提交。", 422);
  if (challengerSourceType === "suno" && (!isValidQCrashSunoUrl(challengerSourceUrl) || Boolean(challengerQueue.audio_path))) {
    return jsonError("Suno 來源必須是公開 HTTPS 連結，且不能上傳或轉存 Suno 音訊。", 422);
  }
  const [founderSunoPlaybackUrl, challengerSunoPlaybackUrl] = await Promise.all([
    qCrashSourceType(founderQueue.source_type) === "suno" ? resolveQCrashSunoMediaSource(founderQueue.source_url) : Promise.resolve(null),
    challengerSourceType === "suno" ? resolveQCrashSunoMediaSource(challengerSourceUrl) : Promise.resolve(null),
  ]);
  if (qCrashSourceType(founderQueue.source_type) === "suno" && !founderSunoPlaybackUrl) {
    return jsonError("作品 A 的 Suno 連結目前沒有可用的公開播放來源，無法開始 Q Crash。", 422);
  }
  if (challengerSourceType === "suno" && !challengerSunoPlaybackUrl) {
    return jsonError("作品 B 的 Suno 連結目前沒有可用的公開播放來源，請確認歌曲仍可公開播放。", 422);
  }
  if (challengerSourceType === "upload" && (!challengerQueue.audio_path || !isValidStorageObjectKey(challengerQueue.audio_path) || challengerSourceUrl !== challengerQueue.audio_path)) {
    return jsonError("作品 B 的上傳檔案資料不完整，請重新提交。", 422);
  }
  if (challengerQueue.match_group_id || !["searching", "waiting_challenge"].includes(challengerQueue.status)) {
    return jsonError("作品 B 已進入其他 Battle。", 409);
  }
  if (user.id !== card.founder_user_id) {
    const { data: otherChallenges, error: otherChallengeError } = await admin
      .from("battle_queue")
      .select("id")
      .eq("user_id", user.id)
      .neq("id", challengerQueue.id)
      .not("challenge_target_queue_id", "is", null)
      .in("status", [...ACTIVE_DROP_QUEUE_STATUSES])
      .limit(1);
    if (otherChallengeError) return jsonError(otherChallengeError.message, 500);
    if ((otherChallenges ?? []).length > 0) return jsonError(dropBattleRoleLockMessage("challenger", "zh"), 409);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const votingEndsAt = new Date(now.getTime() + card.duration_minutes * 60 * 1000).toISOString();
  const { data: claimed, error: claimError } = await admin
    .from("q_crash_cards")
    .update({
      status: "q_crash_joining",
      challenger_user_id: user.id,
      challenger_queue_id: challengerQueue.id,
      updated_at: nowIso,
    })
    .eq("id", card.id)
    .eq("status", "q_crash_pending_invite")
    .select("id")
    .maybeSingle<{ id: string }>();
  if (claimError) return jsonError(claimError.message, 500);
  if (!claimed?.id) return jsonError("另一位創作者已經放入作品 B。", 409);

  const [{ data: fighterA }, { data: fighterB }, { data: userA }, { data: userB }] = await Promise.all([
    admin.from("fighter_profiles").select("avatar_url,song_cover_url").eq("id", founderQueue.user_id).maybeSingle(),
    admin.from("fighter_profiles").select("avatar_url,song_cover_url").eq("id", challengerQueue.user_id).maybeSingle(),
    admin.from("user_profiles").select("avatar_url").eq("id", founderQueue.user_id).maybeSingle(),
    admin.from("user_profiles").select("avatar_url").eq("id", challengerQueue.user_id).maybeSingle(),
  ]);

  const { data: battle, error: battleError } = await admin
    .from("battles")
    .insert({
      q_crash_card_id: card.id,
      queue_a_id: founderQueue.id,
      queue_b_id: challengerQueue.id,
      fighter_a_user_id: founderQueue.user_id,
      fighter_b_user_id: challengerQueue.user_id,
      fighter_a_name: founderQueue.fighter_name,
      fighter_b_name: challengerQueue.fighter_name,
      song_a_name: founderQueue.title || founderQueue.original_file_name,
      song_b_name: challengerQueue.title || challengerQueue.original_file_name,
      audio_a_path: qCrashSourceType(founderQueue.source_type) === "suno" ? null : founderQueue.audio_path,
      audio_b_path: challengerSourceType === "suno" ? null : challengerQueue.audio_path,
      genre: founderQueue.genre,
      status: "q_crash_voting",
      battle_type: "q_crash",
      is_async_match: true,
      ai_tool_a: founderQueue.ai_tool,
      ai_tool_b: challengerQueue.ai_tool,
      lyrics_a: founderQueue.lyrics,
      lyrics_b: challengerQueue.lyrics,
      song_a_cover: founderQueue.cover_url ?? fighterA?.song_cover_url ?? null,
      song_b_cover: challengerQueue.cover_url ?? fighterB?.song_cover_url ?? null,
      fighter_a_avatar: userA?.avatar_url || fighterA?.avatar_url || null,
      fighter_b_avatar: userB?.avatar_url || fighterB?.avatar_url || null,
      started_at: nowIso,
      voting_ends_at: votingEndsAt,
      stake_apc: 0,
      pot_apc: 0,
      vote_stake_apc: 0,
    })
    .select("id")
    .single<{ id: string }>();
  if (battleError || !battle?.id) {
    await admin
      .from("q_crash_cards")
      .update({ status: "q_crash_pending_invite", challenger_user_id: null, challenger_queue_id: null, updated_at: nowIso })
      .eq("id", card.id)
      .eq("status", "q_crash_joining");
    return jsonError(battleError?.message ?? "Q Crash 開戰失敗。", 500);
  }

  const [cardUpdate, queueAUpdate, queueBUpdate] = await Promise.all([
    admin
      .from("q_crash_cards")
      .update({
        status: "q_crash_voting",
        battle_id: battle.id,
        accepted_at: nowIso,
        voting_started_at: nowIso,
        voting_ends_at: votingEndsAt,
        updated_at: nowIso,
      })
      .eq("id", card.id)
      .eq("status", "q_crash_joining"),
    admin
      .from("battle_queue")
      .update({
        status: "matched",
        match_group_id: battle.id,
        opponent_user_id: challengerQueue.user_id,
        matched_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", founderQueue.id),
    admin
      .from("battle_queue")
      .update({
        status: "matched",
        match_group_id: battle.id,
        opponent_user_id: founderQueue.user_id,
        matched_at: nowIso,
        rights_confirmed_at: nowIso,
        ...(user.id === card.founder_user_id ? { challenge_target_queue_id: null } : {}),
        updated_at: nowIso,
      })
      .eq("id", challengerQueue.id),
  ]);
  const updateError = cardUpdate.error || queueAUpdate.error || queueBUpdate.error;
  if (updateError) {
    await Promise.all([
      admin
        .from("battles")
        .update({
          status: "q_crash_cancelled",
          battle_ended_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", battle.id),
      admin
        .from("q_crash_cards")
        .update({
          status: "q_crash_pending_invite",
          battle_id: null,
          challenger_user_id: null,
          challenger_queue_id: null,
          accepted_at: null,
          voting_started_at: null,
          voting_ends_at: null,
          updated_at: nowIso,
        })
        .eq("id", card.id)
        .in("status", ["q_crash_joining", "q_crash_voting"]),
      admin
        .from("battle_queue")
        .update({
          status: "waiting_challenge",
          match_group_id: null,
          opponent_user_id: null,
          matched_at: null,
          updated_at: nowIso,
        })
        .eq("id", founderQueue.id),
      admin
        .from("battle_queue")
        .update({
          status: challengerQueue.status,
          match_group_id: null,
          opponent_user_id: null,
          matched_at: null,
          updated_at: nowIso,
        })
        .eq("id", challengerQueue.id),
    ]);
    return jsonError(updateError.message, 500);
  }

  const recipients = new Map<string, string>();
  recipients.set(founderQueue.user_id, founderQueue.id);
  recipients.set(challengerQueue.user_id, challengerQueue.id);
  await admin.from("battle_notifications").insert(
    [...recipients.entries()].map(([userId, queueId]) => ({
      user_id: userId,
      queue_id: queueId,
      battle_id: battle.id,
      type: "q_crash_voting_started",
      title: "Q Crash 投票開始",
      body: `《${founderQueue.title || founderQueue.original_file_name}》與《${challengerQueue.title || challengerQueue.original_file_name}》已到位；分享同一張卡，邀請大家聽完整歌曲投票。`,
      metadata: {
        href: `/battle/${battle.id}`,
        cardId: card.id,
        battleType: "q_crash",
        votingEndsAt,
      },
    })),
  );

  return NextResponse.json({ cardId: card.id, battleId: battle.id, votingEndsAt });
}
