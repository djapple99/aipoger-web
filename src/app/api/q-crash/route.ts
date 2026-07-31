import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  Q_CRASH_INVITE_HOURS,
  canQCrashAccountJoin,
  isValidQCrashDropDuration,
  qCrashDurationMinutes,
} from "@/lib/q-crash-rules";
import { ACTIVE_DROP_QUEUE_STATUSES, dropBattleRoleLockMessage } from "@/lib/battle-pool-rules";

type QueueRow = {
  id: string;
  user_id: string;
  fighter_name: string;
  genre: string;
  audio_path: string;
  original_file_name: string;
  status: string;
  match_group_id: string | null;
  challenge_target_queue_id: string | null;
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

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: NextRequest) {
  const admin = adminClient();
  if (!admin) return jsonError("Q Crash 尚未完成伺服器設定。", 503);
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入再建立 Q Crash。", 401);

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("登入狀態已失效，請重新登入。", 401);

  const body = (await request.json().catch(() => null)) as {
    queueId?: string;
    durationMinutes?: number | string;
    dropDurationSeconds?: number;
    invitedUserId?: string | null;
  } | null;
  if (!isUuid(body?.queueId)) return jsonError("找不到作品 A 的 Drop。");
  const durationMinutes = qCrashDurationMinutes(body?.durationMinutes);
  if (!durationMinutes) return jsonError("請選擇 30 分鐘、2 小時、6 小時或 24 小時。");
  if (!isValidQCrashDropDuration(body?.dropDurationSeconds)) return jsonError("Q Crash Drop 必須在 60 秒以內。");
  const invitedUserId = body?.invitedUserId && isUuid(body.invitedUserId) ? body.invitedUserId : null;
  if (body?.invitedUserId && !invitedUserId) return jsonError("邀請的創作者資料不正確。");
  if (invitedUserId === user.id) return jsonError("自己的第二首作品不需要指定邀請，直接放入作品 B 即可。");

  const { data: queue, error: queueError } = await admin
    .from("battle_queue")
    .select("id,user_id,fighter_name,genre,audio_path,original_file_name,status,match_group_id,challenge_target_queue_id")
    .eq("id", body.queueId)
    .maybeSingle<QueueRow>();
  if (queueError) return jsonError(queueError.message, 500);
  if (!queue?.id || queue.user_id !== user.id) return jsonError("作品 A 的 Drop 不存在。", 404);
  if (queue.match_group_id || !["searching", "waiting_challenge"].includes(queue.status)) {
    return jsonError("這段 Drop 已經進入其他 Battle。", 409);
  }
  if (queue.challenge_target_queue_id) return jsonError("請使用自己開卡的 Drop 建立 Q Crash。", 409);

  const { data: existingCard, error: existingCardError } = await admin
    .from("q_crash_cards")
    .select("id,status")
    .eq("founder_queue_id", queue.id)
    .maybeSingle<{ id: string; status: string }>();
  if (existingCardError && !/q_crash_cards|schema cache|does not exist|PGRST/i.test(existingCardError.message)) {
    return jsonError(existingCardError.message, 500);
  }
  if (existingCard?.id) {
    return NextResponse.json({ cardId: existingCard.id, status: existingCard.status });
  }

  const { data: activeCards, error: activeCardError } = await admin
    .from("q_crash_cards")
    .select("id")
    .eq("founder_user_id", user.id)
    .in("status", ["q_crash_pending_invite", "q_crash_joining", "q_crash_voting"])
    .limit(1);
  if (activeCardError) {
    if (/q_crash_cards|schema cache|does not exist|PGRST/i.test(activeCardError.message)) {
      return jsonError("Q Crash 資料庫尚未啟用，請先完成新增規則設定。", 503);
    }
    return jsonError(activeCardError.message, 500);
  }
  if ((activeCards ?? []).length > 0) return jsonError(dropBattleRoleLockMessage("founder", "zh"), 409);

  const { data: otherFounderQueues, error: otherQueueError } = await admin
    .from("battle_queue")
    .select("id")
    .eq("user_id", user.id)
    .neq("id", queue.id)
    .is("challenge_target_queue_id", null)
    .in("status", [...ACTIVE_DROP_QUEUE_STATUSES])
    .limit(1);
  if (otherQueueError) return jsonError(otherQueueError.message, 500);
  if ((otherFounderQueues ?? []).length > 0) return jsonError(dropBattleRoleLockMessage("founder", "zh"), 409);

  if (invitedUserId) {
    const { data: invitedUser } = await admin.auth.admin.getUserById(invitedUserId);
    if (!invitedUser?.user) return jsonError("找不到這位創作者的帳號。", 404);
  }

  const nowMs = Date.now();
  const inviteExpiresAt = new Date(nowMs + Q_CRASH_INVITE_HOURS * 60 * 60 * 1000).toISOString();
  const { data: card, error: cardError } = await admin
    .from("q_crash_cards")
    .insert({
      founder_user_id: user.id,
      founder_queue_id: queue.id,
      invited_user_id: invitedUserId,
      duration_minutes: durationMinutes,
      invite_expires_at: inviteExpiresAt,
      status: "q_crash_pending_invite",
    })
    .select("id,status")
    .single<{ id: string; status: string }>();
  if (cardError || !card?.id) return jsonError(cardError?.message ?? "Q Crash 建立失敗。", 500);

  const { error: durationError } = await admin
    .from("battle_queue")
    .update({
      status: "waiting_challenge",
      drop_duration_seconds: Number(body.dropDurationSeconds),
      expires_at: inviteExpiresAt,
      updated_at: new Date(nowMs).toISOString(),
    })
    .eq("id", queue.id);
  if (durationError) {
    await admin.from("q_crash_cards").delete().eq("id", card.id).eq("status", "q_crash_pending_invite");
    return jsonError(durationError.message, 500);
  }

  if (invitedUserId) {
    await admin.from("battle_notifications").insert({
      user_id: invitedUserId,
      queue_id: queue.id,
      type: "q_crash_invite",
      title: "你收到一張 Q Crash 邀請",
      body: `${queue.fighter_name} 邀請你放入作品 B；兩首 60 秒 Drop 到齊後立即開始投票。`,
      metadata: {
        href: `/battle/q-crash/${card.id}`,
        cardId: card.id,
        founderQueueId: queue.id,
        battleType: "q_crash",
        inviteExpiresAt,
      },
    });
  }

  return NextResponse.json({
    cardId: card.id,
    status: card.status,
    inviteExpiresAt,
    canFounderJoin: canQCrashAccountJoin({
      status: card.status,
      founderUserId: user.id,
      viewerUserId: user.id,
      inviteExpiresAt,
    }),
  });
}
