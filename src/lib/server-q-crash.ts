import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Q_CRASH_BATTLE_TYPE,
  Q_CRASH_FEEDBACK_KEYS,
  Q_CRASH_OFFICIAL_AUDIENCE_MIN,
  emptyQCrashFeedbackCounts,
  isQCrashOfficialAudienceCount,
  pickQCrashWinner,
  type QCrashFeedbackCounts,
  type QCrashFeedbackKey,
  type QCrashSide,
} from "./q-crash-rules";

type QCrashBattleRow = {
  id: string;
  q_crash_card_id: string | null;
  queue_a_id: string;
  queue_b_id: string;
  fighter_a_user_id: string;
  fighter_b_user_id: string;
  fighter_a_name: string;
  fighter_b_name: string;
  song_a_name: string;
  song_b_name: string;
  genre: string | null;
  battle_type: string | null;
  status: string | null;
  voting_ends_at: string | null;
  winner: QCrashSide | null;
  winner_queue_id: string | null;
  result_archived_at?: string | null;
};

type QCrashVoteRow = {
  user_id: string;
  voted_for: QCrashSide;
  created_at?: string | null;
};

type QCrashFeedbackRow = {
  queue_id: string;
  feedback_key: QCrashFeedbackKey;
};

export type QCrashSettlementResult = {
  state: "open" | "official" | "insufficient" | "already_settled";
  battleId: string;
  audienceCount?: number;
  counts?: Record<QCrashSide, number>;
  winner?: QCrashSide | null;
  winnerQueueId?: string | null;
};

function uniqueAudienceVotes(rows: QCrashVoteRow[], excludedUserIds: Set<string>) {
  const byUser = new Map<string, QCrashVoteRow>();
  for (const row of rows) {
    if (!row.user_id || excludedUserIds.has(row.user_id)) continue;
    if (row.voted_for !== "fighter_a" && row.voted_for !== "fighter_b") continue;
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, row);
  }
  return [...byUser.values()];
}

function countQCrashVotes(rows: QCrashVoteRow[]) {
  return rows.reduce<Record<QCrashSide, number>>(
    (counts, row) => {
      counts[row.voted_for] += 1;
      return counts;
    },
    { fighter_a: 0, fighter_b: 0 },
  );
}

async function readQCrashFeedbackCounts(
  admin: SupabaseClient,
  battle: QCrashBattleRow,
): Promise<{ A: QCrashFeedbackCounts; B: QCrashFeedbackCounts }> {
  const counts = {
    A: emptyQCrashFeedbackCounts(),
    B: emptyQCrashFeedbackCounts(),
  };
  const { data, error } = await admin
    .from("q_crash_feedback")
    .select("queue_id,feedback_key")
    .eq("battle_id", battle.id)
    .returns<QCrashFeedbackRow[]>();
  if (error) {
    if (/q_crash_feedback|schema cache|does not exist|PGRST/i.test(error.message)) return counts;
    throw new Error(`Q Crash feedback read failed: ${error.message}`);
  }
  (data ?? []).forEach((row) => {
    const side = row.queue_id === battle.queue_a_id ? "A" : row.queue_id === battle.queue_b_id ? "B" : null;
    if (!side || !Q_CRASH_FEEDBACK_KEYS.includes(row.feedback_key)) return;
    counts[side][row.feedback_key] += 1;
  });
  return counts;
}

async function closeQCrashQueues(
  admin: SupabaseClient,
  battle: QCrashBattleRow,
  status: "completed" | "expired",
  now: string,
) {
  const { error } = await admin
    .from("battle_queue")
    .update({ status, updated_at: now })
    .in("id", [battle.queue_a_id, battle.queue_b_id]);
  if (error) throw new Error(`Q Crash queue close failed: ${error.message}`);
}

async function notifyQCrashResult(args: {
  admin: SupabaseClient;
  battle: QCrashBattleRow;
  official: boolean;
  counts: Record<QCrashSide, number>;
  audienceCount: number;
  winner: QCrashSide | null;
  winnerQueueId: string | null;
}) {
  const { admin, battle, official, counts, audienceCount, winner, winnerQueueId } = args;
  const winningSong = winner === "fighter_a" ? battle.song_a_name : winner === "fighter_b" ? battle.song_b_name : null;
  const winningCreator = winner === "fighter_a" ? battle.fighter_a_name : winner === "fighter_b" ? battle.fighter_b_name : null;
  const body = official && winningSong
    ? `《${winningSong}》勝出｜創作者：${winningCreator || "AIPOGER 創作者"}。Q Crash 結果已公開。`
    : `本場只有 ${audienceCount}/${Q_CRASH_OFFICIAL_AUDIENCE_MIN} 位有效觀眾，觀眾不足；不產生正式勝負、不進 Showtime。`;
  const baseNotice = {
    battle_id: battle.id,
    type: official ? "q_crash_finished" : "q_crash_insufficient",
    title: official ? "Q Crash 結果出爐" : "Q Crash 未成立",
    body,
    metadata: {
      href: `/battle/${battle.id}`,
      battleType: Q_CRASH_BATTLE_TYPE,
      winner,
      winnerQueueId,
      votesA: counts.fighter_a,
      votesB: counts.fighter_b,
      audienceCount,
      officialAudienceMin: Q_CRASH_OFFICIAL_AUDIENCE_MIN,
    },
  };

  const recipients = new Map<string, string>();
  recipients.set(battle.fighter_a_user_id, battle.queue_a_id);
  recipients.set(battle.fighter_b_user_id, battle.queue_b_id);
  const rows = [...recipients.entries()].map(([userId, queueId]) => ({
    ...baseNotice,
    user_id: userId,
    queue_id: queueId,
  }));
  const { error } = await admin.from("battle_notifications").insert(rows);
  if (error) throw new Error(`Q Crash notification failed: ${error.message}`);
}

export async function settleQCrashBattle(
  admin: SupabaseClient,
  battleId: string,
  nowMs = Date.now(),
): Promise<QCrashSettlementResult> {
  const { data: battle, error: battleError } = await admin
    .from("battles")
    .select(
      "id,q_crash_card_id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,genre,battle_type,status,voting_ends_at,winner,winner_queue_id,result_archived_at",
    )
    .eq("id", battleId)
    .maybeSingle<QCrashBattleRow>();
  if (battleError) throw new Error(`Q Crash battle read failed: ${battleError.message}`);
  if (!battle?.id || battle.battle_type !== Q_CRASH_BATTLE_TYPE) {
    throw new Error("Q Crash battle not found");
  }

  if (battle.status === "q_crash_finished" || battle.status === "q_crash_insufficient") {
    return {
      state: "already_settled",
      battleId: battle.id,
      winner: battle.winner,
      winnerQueueId: battle.winner_queue_id,
    };
  }

  const votingEndsMs = new Date(battle.voting_ends_at ?? "").getTime();
  if (!Number.isFinite(votingEndsMs) || votingEndsMs > nowMs) {
    return { state: "open", battleId: battle.id };
  }

  const { data: rawVotes, error: voteError } = await admin
    .from("q_crash_votes")
    .select("user_id,voted_for,created_at")
    .eq("battle_id", battle.id)
    .order("created_at", { ascending: true })
    .returns<QCrashVoteRow[]>();
  if (voteError) throw new Error(`Q Crash vote read failed: ${voteError.message}`);

  const audienceVotes = uniqueAudienceVotes(
    rawVotes ?? [],
    new Set([battle.fighter_a_user_id, battle.fighter_b_user_id]),
  );
  const audienceCount = audienceVotes.length;
  const counts = countQCrashVotes(audienceVotes);
  const now = new Date(nowMs).toISOString();

  if (!isQCrashOfficialAudienceCount(audienceCount)) {
    const { error: updateError } = await admin
      .from("battles")
      .update({
        status: "q_crash_insufficient",
        battle_ended_at: now,
        winner: null,
        winner_queue_id: null,
        updated_at: now,
      })
      .eq("id", battle.id);
    if (updateError) throw new Error(`Q Crash insufficient settlement failed: ${updateError.message}`);

    if (battle.q_crash_card_id) {
      const { error: cardError } = await admin
        .from("q_crash_cards")
        .update({ status: "q_crash_insufficient", updated_at: now })
        .eq("id", battle.q_crash_card_id);
      if (cardError) throw new Error(`Q Crash card settlement failed: ${cardError.message}`);
    }
    await closeQCrashQueues(admin, battle, "expired", now);
    await notifyQCrashResult({
      admin,
      battle,
      official: false,
      counts,
      audienceCount,
      winner: null,
      winnerQueueId: null,
    });
    return { state: "insufficient", battleId: battle.id, audienceCount, counts, winner: null, winnerQueueId: null };
  }

  const winner = pickQCrashWinner(counts, battle.id);
  if (!winner) throw new Error("Q Crash official result has no winner");
  const winnerQueueId = winner === "fighter_a" ? battle.queue_a_id : battle.queue_b_id;
  const feedbackCounts = await readQCrashFeedbackCounts(admin, battle);

  await admin.from("battle_guest_votes").delete().eq("battle_id", battle.id);
  const officialVoteRows = audienceVotes.map((vote) => ({
    battle_id: battle.id,
    user_id: vote.user_id,
    voted_for: vote.voted_for,
    voter_role: "audience",
    stake_apc: 0,
  }));
  const { error: copyError } = await admin
    .from("battle_votes")
    .upsert(officialVoteRows, { onConflict: "battle_id,user_id" });
  if (copyError) throw new Error(`Q Crash official vote copy failed: ${copyError.message}`);

  const settleResult = await admin.rpc("settle_90s_battle", {
    p_battle_id: battle.id,
    p_winner: winner,
  });
  if (settleResult.error) throw new Error(`Q Crash winner settlement failed: ${settleResult.error.message}`);

  const winningSong = winner === "fighter_a" ? battle.song_a_name : battle.song_b_name;
  const winningCreator = winner === "fighter_a" ? battle.fighter_a_name : battle.fighter_b_name;
  const archiveResult = await admin.rpc("archive_battle_result", {
    p_battle_id: battle.id,
    p_winner: winner,
    p_final_vote_left: counts.fighter_a,
    p_final_vote_right: counts.fighter_b,
    p_audience_review: `《${winningSong}》勝出｜創作者：${winningCreator}`,
    p_result_payload: {
      source: Q_CRASH_BATTLE_TYPE,
      battleType: Q_CRASH_BATTLE_TYPE,
      winnerQueueId,
      votesA: counts.fighter_a,
      votesB: counts.fighter_b,
      votesTotal: counts.fighter_a + counts.fighter_b,
      audienceCount,
      feedbackA: feedbackCounts.A,
      feedbackB: feedbackCounts.B,
      genre: battle.genre,
      officialAudienceMin: Q_CRASH_OFFICIAL_AUDIENCE_MIN,
      settledAt: now,
    },
  });
  if (archiveResult.error) throw new Error(`Q Crash archive failed: ${archiveResult.error.message}`);

  const { error: finalError } = await admin
    .from("battles")
    .update({
      status: "q_crash_finished",
      battle_ended_at: now,
      winner,
      winner_queue_id: winnerQueueId,
      updated_at: now,
    })
    .eq("id", battle.id);
  if (finalError) throw new Error(`Q Crash final status failed: ${finalError.message}`);

  if (battle.q_crash_card_id) {
    const { error: cardError } = await admin
      .from("q_crash_cards")
      .update({ status: "q_crash_finished", updated_at: now })
      .eq("id", battle.q_crash_card_id);
    if (cardError) throw new Error(`Q Crash card final status failed: ${cardError.message}`);
  }
  await closeQCrashQueues(admin, battle, "completed", now);
  await notifyQCrashResult({
    admin,
    battle,
    official: true,
    counts,
    audienceCount,
    winner,
    winnerQueueId,
  });

  return { state: "official", battleId: battle.id, audienceCount, counts, winner, winnerQueueId };
}
