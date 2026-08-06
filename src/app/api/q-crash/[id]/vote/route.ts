import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Q_CRASH_COMMENT_MAX_LENGTH, canQCrashAccountVote, qCrashCommentText, type QCrashSide } from "@/lib/q-crash-rules";
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
  if (!token) return jsonError("請先登入再投票。", 401);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return jsonError("登入狀態已失效。", 401);

  const body = (await request.json().catch(() => null)) as { votedFor?: QCrashSide; confirmed?: boolean; comment?: unknown } | null;
  if (body?.votedFor !== "fighter_a" && body?.votedFor !== "fighter_b") return jsonError("請選擇作品 A 或作品 B。");
  if (body.confirmed !== true) return jsonError("請按「確定送出」完成投票。");
  const rawComment = typeof body.comment === "string" ? body.comment : "";
  const comment = qCrashCommentText(rawComment);
  if (rawComment.trim() && !comment) return jsonError(`評論請保持在 1-${Q_CRASH_COMMENT_MAX_LENGTH} 字內。`);

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
    .select("id,status,voting_ends_at,fighter_a_user_id,fighter_b_user_id")
    .eq("id", card.battle_id)
    .maybeSingle<{
      id: string;
      status: string;
      voting_ends_at: string | null;
      fighter_a_user_id: string;
      fighter_b_user_id: string;
    }>();
  if (battleError) return jsonError(battleError.message, 500);
  if (!battle?.id) return jsonError("找不到 Q Crash Battle。", 404);

  const nowMs = Date.now();
  const { data: existingVote } = await admin
    .from("q_crash_votes")
    .select("id")
    .eq("battle_id", battle.id)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!canQCrashAccountVote({
    status: card.status,
    votingEndsAt: battle.voting_ends_at,
    viewerUserId: user.id,
    fighterAUserId: battle.fighter_a_user_id,
    fighterBUserId: battle.fighter_b_user_id,
    alreadyVoted: Boolean(existingVote?.id),
    nowMs,
  })) {
    if (user.id === battle.fighter_a_user_id || user.id === battle.fighter_b_user_id) {
      return jsonError("作品持有人不能替自己的 Q Crash 投票。", 403);
    }
    if (existingVote?.id) return jsonError("你已經投過票，Q Crash 不提供改票。", 409);
    if (new Date(battle.voting_ends_at ?? "").getTime() <= nowMs) {
      await settleQCrashBattle(admin, battle.id, nowMs);
      return jsonError("投票已截止，結果正在公開。", 409);
    }
    return jsonError("Q Crash 投票尚未開始或已結束。", 409);
  }

  if (comment) {
    const { error: commentSchemaError } = await admin.from("q_crash_comments").select("id").limit(1);
    if (commentSchemaError) {
      if (/q_crash_comments|schema cache|does not exist|PGRST/i.test(commentSchemaError.message)) {
        return jsonError("Q Crash 評論功能尚未啟用，請稍後再試。", 503);
      }
      return jsonError(commentSchemaError.message, 500);
    }
  }

  const { error: voteError } = await admin.from("q_crash_votes").insert({
    battle_id: battle.id,
    user_id: user.id,
    voted_for: body.votedFor,
  });
  if (voteError) {
    if (voteError.code === "23505" || /unique|duplicate/i.test(voteError.message)) {
      return jsonError("你已經投過票，Q Crash 不提供改票。", 409);
    }
    return jsonError(voteError.message, 500);
  }

  if (comment) {
    const { error: commentError } = await admin.from("q_crash_comments").insert({
      battle_id: battle.id,
      user_id: user.id,
      body: comment,
    });
    if (commentError) {
      await admin.from("q_crash_votes").delete().eq("battle_id", battle.id).eq("user_id", user.id);
      if (/q_crash_comments|schema cache|does not exist|PGRST/i.test(commentError.message)) {
        return jsonError("Q Crash 評論功能尚未啟用，投票未送出。", 503);
      }
      return jsonError("評論儲存失敗，投票未送出，請再試一次。", 500);
    }
  }

  return NextResponse.json({
    accepted: true,
    votedFor: body.votedFor,
    commentSaved: Boolean(comment),
    message: comment ? "投票與評論已確認送出，結果將在截止後公開。" : "投票已確認送出，結果將在截止後公開。",
  });
}
