import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  canQCrashAccountSendFeedback,
  isQCrashFeedbackKey,
  type QCrashFeedbackKey,
} from "@/lib/q-crash-rules";
import { settleQCrashBattle } from "@/lib/server-q-crash";

type RouteProps = { params: Promise<{ id: string }> };

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
  if (!token) return jsonError("請先登入再送出評分。", 401);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return jsonError("登入狀態已失效。", 401);

  const body = (await request.json().catch(() => null)) as {
    queueId?: string;
    feedbackKey?: QCrashFeedbackKey;
  } | null;
  if (!isUuid(body?.queueId)) return jsonError("找不到要評分的作品。");
  if (!isQCrashFeedbackKey(body?.feedbackKey)) return jsonError("評分項目不正確。");

  const { data: card, error: cardError } = await admin
    .from("q_crash_cards")
    .select("id,battle_id,status,voting_ends_at")
    .or(`id.eq.${id},battle_id.eq.${id}`)
    .limit(1)
    .maybeSingle<{ id: string; battle_id: string | null; status: string; voting_ends_at: string | null }>();
  if (cardError) return jsonError(cardError.message, 500);
  if (!card?.battle_id) return jsonError("這張 Q Crash 還在等待作品 B。", 409);

  const { data: battle, error: battleError } = await admin
    .from("battles")
    .select("id,status,voting_ends_at,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id")
    .eq("id", card.battle_id)
    .maybeSingle<{
      id: string;
      status: string;
      voting_ends_at: string | null;
      queue_a_id: string;
      queue_b_id: string;
      fighter_a_user_id: string;
      fighter_b_user_id: string;
    }>();
  if (battleError) return jsonError(battleError.message, 500);
  if (!battle?.id) return jsonError("找不到 Q Crash Battle。", 404);
  if (body.queueId !== battle.queue_a_id && body.queueId !== battle.queue_b_id) {
    return jsonError("這首作品不屬於本場 Q Crash。", 409);
  }

  const nowMs = Date.now();
  if (!canQCrashAccountSendFeedback({
    status: card.status,
    votingEndsAt: battle.voting_ends_at,
    viewerUserId: user.id,
    fighterAUserId: battle.fighter_a_user_id,
    fighterBUserId: battle.fighter_b_user_id,
    nowMs,
  })) {
    if (user.id === battle.fighter_a_user_id || user.id === battle.fighter_b_user_id) {
      return jsonError("作品持有人不能替自己的 Q Crash 送出評分。", 403);
    }
    if (new Date(battle.voting_ends_at ?? "").getTime() <= nowMs) {
      await settleQCrashBattle(admin, battle.id, nowMs);
      return jsonError("評分已截止，結果正在公開。", 409);
    }
    return jsonError("Q Crash 評分尚未開始或已結束。", 409);
  }

  const { error: feedbackError } = await admin.from("q_crash_feedback").insert({
    battle_id: battle.id,
    queue_id: body.queueId,
    user_id: user.id,
    feedback_key: body.feedbackKey,
  });
  if (feedbackError) {
    if (feedbackError.code === "23505" || /unique|duplicate/i.test(feedbackError.message)) {
      return jsonError("這個評分已送出，每首作品的每一項只能點一次。", 409);
    }
    if (/q_crash_feedback|schema cache|does not exist|PGRST/i.test(feedbackError.message)) {
      return jsonError("Q Crash 五項評分資料庫尚未啟用。", 503);
    }
    return jsonError(feedbackError.message, 500);
  }

  return NextResponse.json({
    accepted: true,
    queueId: body.queueId,
    feedbackKey: body.feedbackKey,
    message: "評分已鎖定，總和將在截止後公開。",
  });
}
