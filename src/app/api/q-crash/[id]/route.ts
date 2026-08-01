import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  Q_CRASH_FEEDBACK_KEYS,
  Q_CRASH_OFFICIAL_AUDIENCE_MIN,
  canQCrashAccountJoin,
  canQCrashAccountSendFeedback,
  canQCrashAccountVote,
  emptyQCrashFeedbackCounts,
  qCrashVersionLabels,
  type QCrashFeedbackCounts,
  type QCrashFeedbackKey,
  type QCrashSide,
} from "@/lib/q-crash-rules";
import { settleQCrashBattle } from "@/lib/server-q-crash";

type RouteProps = { params: Promise<{ id: string }> };
type CardRow = {
  id: string;
  founder_user_id: string;
  founder_queue_id: string;
  invited_user_id: string | null;
  challenger_user_id: string | null;
  challenger_queue_id: string | null;
  battle_id: string | null;
  status: string;
  duration_minutes: number;
  invite_expires_at: string;
  voting_started_at: string | null;
  voting_ends_at: string | null;
  created_at: string;
};
type QueueRow = {
  id: string;
  user_id: string;
  fighter_name: string;
  original_file_name: string;
  genre: string;
  ai_tool: string | null;
  lyrics: string | null;
  audio_path: string;
  drop_duration_seconds: number | null;
  cover_url: string | null;
};
type BattleRow = {
  id: string;
  battle_type: string;
  status: string;
  fighter_a_user_id: string;
  fighter_b_user_id: string;
  fighter_a_name: string;
  fighter_b_name: string;
  queue_a_id: string;
  queue_b_id: string;
  song_a_name: string;
  song_b_name: string;
  audio_a_path: string;
  audio_b_path: string;
  genre: string;
  ai_tool_a: string | null;
  ai_tool_b: string | null;
  lyrics_a: string | null;
  lyrics_b: string | null;
  winner: QCrashSide | null;
  winner_queue_id: string | null;
  voting_ends_at: string | null;
  battle_ended_at: string | null;
  song_a_cover: string | null;
  song_b_cover: string | null;
  fighter_a_avatar: string | null;
  fighter_b_avatar: string | null;
};
type FeedbackRow = {
  queue_id: string;
  feedback_key: QCrashFeedbackKey;
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

function isMissingFeedbackSchema(message: string | null | undefined) {
  return /q_crash_feedback|schema cache|does not exist|PGRST/i.test(message ?? "");
}

function feedbackCountsByQueue(rows: FeedbackRow[], queueAId: string, queueBId: string | null) {
  const counts: { A: QCrashFeedbackCounts; B: QCrashFeedbackCounts } = {
    A: emptyQCrashFeedbackCounts(),
    B: emptyQCrashFeedbackCounts(),
  };
  rows.forEach((row) => {
    const side = row.queue_id === queueAId ? "A" : row.queue_id === queueBId ? "B" : null;
    if (!side || !Q_CRASH_FEEDBACK_KEYS.includes(row.feedback_key)) return;
    counts[side][row.feedback_key] += 1;
  });
  return counts;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readCard(admin: SupabaseClient, id: string) {
  return admin
    .from("q_crash_cards")
    .select("id,founder_user_id,founder_queue_id,invited_user_id,challenger_user_id,challenger_queue_id,battle_id,status,duration_minutes,invite_expires_at,voting_started_at,voting_ends_at,created_at")
    .or(`id.eq.${id},battle_id.eq.${id}`)
    .limit(1)
    .maybeSingle<CardRow>();
}

async function signedAudio(admin: SupabaseClient, path: string) {
  if (/^(https?:|data:|blob:|\/)/i.test(path)) return path;
  const { data } = await admin.storage.from("battle-audio").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function profileMedia(admin: SupabaseClient, userId: string) {
  const [{ data: fighter }, { data: profile }] = await Promise.all([
    admin.from("fighter_profiles").select("display_name,avatar_url,song_cover_url").eq("id", userId).maybeSingle(),
    admin.from("user_profiles").select("fighter_name,avatar_url").eq("id", userId).maybeSingle(),
  ]);
  return {
    name: fighter?.display_name || profile?.fighter_name || null,
    avatarUrl: profile?.avatar_url || fighter?.avatar_url || null,
    coverUrl: fighter?.song_cover_url || null,
  };
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Q Crash 連結不正確。");
  const admin = adminClient();
  if (!admin) return jsonError("Q Crash 尚未完成伺服器設定。", 503);

  const initialCardResult = await readCard(admin, id);
  let card = initialCardResult.data;
  const cardError = initialCardResult.error;
  if (cardError) {
    if (/q_crash_cards|schema cache|does not exist|PGRST/i.test(cardError.message)) {
      return jsonError("Q Crash 資料庫尚未啟用。", 503);
    }
    return jsonError(cardError.message, 500);
  }
  if (!card?.id) return jsonError("找不到這張 Q Crash。", 404);

  const nowMs = Date.now();
  if (card.status === "q_crash_pending_invite" && new Date(card.invite_expires_at).getTime() <= nowMs) {
    const now = new Date(nowMs).toISOString();
    await admin
      .from("q_crash_cards")
      .update({ status: "q_crash_cancelled", cancelled_at: now, updated_at: now })
      .eq("id", card.id)
      .eq("status", "q_crash_pending_invite");
    await admin.from("battle_queue").update({ status: "expired", updated_at: now }).eq("id", card.founder_queue_id);
    card = { ...card, status: "q_crash_cancelled" };
  }

  if (card.battle_id && card.status === "q_crash_voting") {
    const endMs = new Date(card.voting_ends_at ?? "").getTime();
    if (Number.isFinite(endMs) && endMs <= nowMs) {
      await settleQCrashBattle(admin, card.battle_id, nowMs);
      const refreshed = await readCard(admin, card.id);
      if (refreshed.data) card = refreshed.data;
    }
  }

  const queueIds = [card.founder_queue_id, card.challenger_queue_id].filter((value): value is string => Boolean(value));
  const [queueResult, battleResult] = await Promise.all([
    admin
      .from("battle_queue")
      .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,lyrics,audio_path,drop_duration_seconds,cover_url")
      .in("id", queueIds)
      .returns<QueueRow[]>(),
    card.battle_id
      ? admin
          .from("battles")
          .select("id,battle_type,status,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,queue_a_id,queue_b_id,song_a_name,song_b_name,audio_a_path,audio_b_path,genre,ai_tool_a,ai_tool_b,lyrics_a,lyrics_b,winner,winner_queue_id,voting_ends_at,battle_ended_at,song_a_cover,song_b_cover,fighter_a_avatar,fighter_b_avatar")
          .eq("id", card.battle_id)
          .maybeSingle<BattleRow>()
      : Promise.resolve({ data: null as BattleRow | null, error: null }),
  ]);
  let { data: queues, error: queueError } = queueResult;
  if (queueError && /cover_url|schema cache|column.*does not exist|PGRST204/i.test(queueError.message)) {
    const legacyQueues = await admin
      .from("battle_queue")
      .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,lyrics,audio_path,drop_duration_seconds")
      .in("id", queueIds)
      .returns<QueueRow[]>();
    queues = legacyQueues.data;
    queueError = legacyQueues.error;
  }
  if (queueError) return jsonError(queueError.message, 500);
  if (battleResult.error) return jsonError(battleResult.error.message, 500);
  const queueMap = new Map((queues ?? []).map((queue) => [queue.id, queue]));
  const queueA = queueMap.get(card.founder_queue_id);
  const queueB = card.challenger_queue_id ? queueMap.get(card.challenger_queue_id) : null;
  if (!queueA) return jsonError("作品 A 已無法讀取。", 500);
  const battle = battleResult.data;
  const songAName = battle?.song_a_name || queueA.original_file_name;
  const songBName = battle?.song_b_name || queueB?.original_file_name;

  const token = tokenFromRequest(request);
  const viewer = token ? (await admin.auth.getUser(token)).data.user : null;
  const { data: viewerVote } =
    viewer && card.battle_id
      ? await admin
          .from("q_crash_votes")
          .select("voted_for")
          .eq("battle_id", card.battle_id)
          .eq("user_id", viewer.id)
          .maybeSingle<{ voted_for: QCrashSide }>()
      : { data: null };

  let feedbackAvailable = true;
  let viewerFeedbackRows: FeedbackRow[] = [];
  if (viewer && card.battle_id) {
    const viewerFeedbackResult = await admin
      .from("q_crash_feedback")
      .select("queue_id,feedback_key")
      .eq("battle_id", card.battle_id)
      .eq("user_id", viewer.id)
      .returns<FeedbackRow[]>();
    if (viewerFeedbackResult.error) {
      if (isMissingFeedbackSchema(viewerFeedbackResult.error.message)) feedbackAvailable = false;
      else return jsonError(viewerFeedbackResult.error.message, 500);
    } else {
      viewerFeedbackRows = viewerFeedbackResult.data ?? [];
    }
  }

  const [profileA, profileB, audioA, audioB] = await Promise.all([
    profileMedia(admin, queueA.user_id),
    queueB ? profileMedia(admin, queueB.user_id) : Promise.resolve(null),
    signedAudio(admin, battle?.audio_a_path || queueA.audio_path),
    queueB ? signedAudio(admin, battle?.audio_b_path || queueB.audio_path) : Promise.resolve(null),
  ]);
  const labels = qCrashVersionLabels(songAName, songBName);
  const isFinal = card.status === "q_crash_finished" || card.status === "q_crash_insufficient";
  let counts: Record<QCrashSide, number> | null = null;
  let audienceCount: number | null = null;
  let feedbackCounts: { A: QCrashFeedbackCounts; B: QCrashFeedbackCounts } | null = null;
  if (isFinal && card.battle_id) {
    const { data: finalVotes } = await admin
      .from("q_crash_votes")
      .select("user_id,voted_for")
      .eq("battle_id", card.battle_id)
      .returns<Array<{ user_id: string; voted_for: QCrashSide }>>();
    const validVotes = (finalVotes ?? []).filter(
      (vote) => vote.user_id !== queueA.user_id && vote.user_id !== queueB?.user_id,
    );
    counts = {
      fighter_a: validVotes.filter((vote) => vote.voted_for === "fighter_a").length,
      fighter_b: validVotes.filter((vote) => vote.voted_for === "fighter_b").length,
    };
    audienceCount = new Set(validVotes.map((vote) => vote.user_id)).size;

    if (card.status === "q_crash_finished") {
      const finalFeedbackResult = await admin
        .from("q_crash_feedback")
        .select("queue_id,feedback_key")
        .eq("battle_id", card.battle_id)
        .returns<FeedbackRow[]>();
      if (finalFeedbackResult.error) {
        if (isMissingFeedbackSchema(finalFeedbackResult.error.message)) feedbackAvailable = false;
        else return jsonError(finalFeedbackResult.error.message, 500);
      } else {
        feedbackCounts = feedbackCountsByQueue(finalFeedbackResult.data ?? [], queueA.id, queueB?.id ?? null);
      }
    }
  }

  const viewerId = viewer?.id ?? null;
  const hasVoted = Boolean(viewerVote?.voted_for);
  const canJoin = canQCrashAccountJoin({
    status: card.status,
    founderUserId: card.founder_user_id,
    invitedUserId: card.invited_user_id,
    viewerUserId: viewerId,
    inviteExpiresAt: card.invite_expires_at,
    nowMs,
  });
  const canVote = canQCrashAccountVote({
    status: card.status,
    votingEndsAt: card.voting_ends_at,
    viewerUserId: viewerId,
    fighterAUserId: queueA.user_id,
    fighterBUserId: queueB?.user_id,
    alreadyVoted: hasVoted,
    nowMs,
  });
  const canSendFeedback = feedbackAvailable && canQCrashAccountSendFeedback({
    status: card.status,
    votingEndsAt: card.voting_ends_at,
    viewerUserId: viewerId,
    fighterAUserId: queueA.user_id,
    fighterBUserId: queueB?.user_id,
    nowMs,
  });
  const selectedFeedback = {
    A: viewerFeedbackRows
      .filter((row) => row.queue_id === queueA.id)
      .map((row) => row.feedback_key),
    B: viewerFeedbackRows
      .filter((row) => row.queue_id === queueB?.id)
      .map((row) => row.feedback_key),
  };

  return NextResponse.json(
    {
      card: {
        id: card.id,
        battleId: card.battle_id,
        status: card.status,
        durationMinutes: card.duration_minutes,
        inviteExpiresAt: card.invite_expires_at,
        votingStartedAt: card.voting_started_at,
        votingEndsAt: card.voting_ends_at,
        officialAudienceMin: Q_CRASH_OFFICIAL_AUDIENCE_MIN,
      },
      works: {
        A: {
          queueId: queueA.id,
          label: labels.A,
          songName: songAName,
          creatorName: battle?.fighter_a_name || queueA.fighter_name || profileA.name || "AIPOGER 創作者",
          genre: battle?.genre || queueA.genre,
          aiTool: battle?.ai_tool_a ?? queueA.ai_tool,
          lyrics: battle?.lyrics_a ?? queueA.lyrics,
          durationSeconds: queueA.drop_duration_seconds,
          audioUrl: audioA,
          coverUrl: battle?.song_a_cover || queueA.cover_url || profileA.coverUrl,
          avatarUrl: battle?.fighter_a_avatar || profileA.avatarUrl,
        },
        B: queueB
            ? {
              queueId: queueB.id,
              label: labels.B,
              songName: songBName || queueB.original_file_name,
              creatorName: battle?.fighter_b_name || queueB.fighter_name || profileB?.name || "AIPOGER 創作者",
              genre: battle?.genre || queueB.genre,
              aiTool: battle?.ai_tool_b ?? queueB.ai_tool,
              lyrics: battle?.lyrics_b ?? queueB.lyrics,
              durationSeconds: queueB.drop_duration_seconds,
              audioUrl: audioB,
              coverUrl: battle?.song_b_cover || queueB.cover_url || profileB?.coverUrl,
              avatarUrl: battle?.fighter_b_avatar || profileB?.avatarUrl,
            }
          : null,
      },
      viewer: {
        userId: viewerId,
        isFounder: viewerId === card.founder_user_id,
        isInvited: Boolean(viewerId && viewerId === card.invited_user_id),
        isParticipant: Boolean(viewerId && (viewerId === queueA.user_id || viewerId === queueB?.user_id)),
        canJoin,
        canVote,
        hasVoted,
        votedFor: viewerVote?.voted_for ?? null,
      },
      feedback: {
        available: feedbackAvailable,
        canSubmit: canSendFeedback,
        selected: selectedFeedback,
        counts: feedbackCounts,
      },
      result: isFinal
        ? {
            official: card.status === "q_crash_finished",
            winner: battle?.winner ?? null,
            winnerQueueId: battle?.winner_queue_id ?? null,
            counts,
            audienceCount,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(request: NextRequest, { params }: RouteProps) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Q Crash 連結不正確。");
  const admin = adminClient();
  if (!admin) return jsonError("Q Crash 尚未完成伺服器設定。", 503);
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入。", 401);
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return jsonError("登入狀態已失效。", 401);

  const { data: card, error } = await readCard(admin, id);
  if (error) return jsonError(error.message, 500);
  if (!card?.id) return jsonError("找不到這張 Q Crash。", 404);
  if (card.founder_user_id !== user.id) return jsonError("只有開卡者可以取消。", 403);
  if (card.status !== "q_crash_pending_invite") return jsonError("第二首作品已加入，投票開始後不能取消或改期限。", 409);

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("q_crash_cards")
    .update({ status: "q_crash_cancelled", cancelled_at: now, updated_at: now })
    .eq("id", card.id)
    .eq("status", "q_crash_pending_invite");
  if (updateError) return jsonError(updateError.message, 500);
  await admin.from("battle_queue").update({ status: "cancelled", updated_at: now }).eq("id", card.founder_queue_id);
  if (card.invited_user_id) {
    await admin.from("battle_notifications").insert({
      user_id: card.invited_user_id,
      queue_id: card.founder_queue_id,
      type: "q_crash_cancelled",
      title: "Q Crash 邀請已取消",
      body: "開卡者已取消這張 Q Crash；不產生投票或戰績。",
      metadata: { cardId: card.id, battleType: "q_crash" },
    });
  }
  return NextResponse.json({ cancelled: true });
}
