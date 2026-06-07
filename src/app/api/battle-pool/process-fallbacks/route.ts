import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DROP_BATTLE_EXPECTED_END_BUFFER_MS,
  isDropBattleEndedOrPastExpectedEnd,
  shouldExpireOpenDropQueue,
} from "@/lib/battle-pool-client";
import { cancelStalePendingDropBattles, isMissingScheduleColumn } from "@/lib/battle-pool-maintenance";
import { battleSeedForId, pick90sBattleWinner } from "@/lib/battle-90s-system";

type SupabaseAdmin = SupabaseClient;

type HookBattleRow = {
  id: string;
  queue_a_id: string | null;
  queue_b_id: string | null;
  fighter_a_user_id: string;
  fighter_b_user_id: string;
  fighter_a_name: string;
  fighter_b_name: string;
  song_a_name: string;
  song_b_name: string;
  status?: string | null;
  created_at: string;
  scheduled_start_at?: string | null;
  started_at?: string | null;
  battle_started_at?: string | null;
  battle_ended_at?: string | null;
  battle_number?: string | null;
};

type VoteRow = { voted_for: string | null };

type DailyBattleRow = {
  id: string;
  entry_a_id: string;
  entry_b_id: string;
  ends_at: string;
};

type DailyEntryRow = {
  id: string;
  user_id: string;
  title: string;
};

type ExpiredDailyQueueRow = {
  id: string;
  user_id: string | null;
  title?: string | null;
  created_at?: string | null;
};

type ExpiredHookQueueRow = {
  id: string;
  user_id: string | null;
  original_file_name?: string | null;
  status?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

export async function GET(request: NextRequest) {
  return processFallbacks(request);
}

export async function POST(request: NextRequest) {
  return processFallbacks(request);
}

async function processFallbacks(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : request.nextUrl.searchParams.get("secret");
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const warnings: string[] = [];
  let poolProcessed = 0;

  const fallbackResult = await admin.rpc("process_battle_pool_fallbacks");
  if (fallbackResult.error) {
    warnings.push(`pool fallback: ${fallbackResult.error.message}`);
  } else {
    poolProcessed = Number(fallbackResult.data ?? 0);
  }

  const hookSettled = await settleStaleHookBattles(admin, warnings);
  const dailySettled = await settleExpiredDailyBattles(admin, warnings);
  const expiredHookQueue = await expireStaleHookQueue(admin, warnings);
  const expiredDailyQueue = await expireStaleDailyQueue(admin, warnings);
  const expiredRematchClaims = await expireStaleRematchClaims(admin, warnings);
  const stalePendingBattles = await cancelStalePendingDropBattles(admin);
  warnings.push(...stalePendingBattles.errors);

  return NextResponse.json({
    processed: poolProcessed + hookSettled + dailySettled + expiredHookQueue + expiredDailyQueue + expiredRematchClaims + stalePendingBattles.cancelled,
    poolProcessed,
    hookSettled,
    dailySettled,
    expiredHookQueue,
    expiredDailyQueue,
    expiredRematchClaims,
    stalePendingBattles: stalePendingBattles.cancelled,
    warnings,
  });
}

async function expireStaleRematchClaims(admin: SupabaseAdmin, warnings: string[]) {
  const now = new Date().toISOString();
  const { data: openExpired, error: openError } = await admin
    .from("drop_battle_rematch_claims")
    .update({ status: "expired", updated_at: now })
    .eq("status", "open")
    .lte("claim_window_ends_at", now)
    .select("id");
  if (openError) {
    if (!/schema cache|does not exist|Could not find/i.test(openError.message)) {
      warnings.push(`expire open rematch claims: ${openError.message}`);
    }
    return 0;
  }

  const { data: claimedExpired, error: claimedError } = await admin
    .from("drop_battle_rematch_claims")
    .update({ status: "expired", updated_at: now })
    .eq("status", "claimed")
    .lte("upload_deadline_at", now)
    .select("id");
  if (claimedError) {
    if (!/schema cache|does not exist|Could not find/i.test(claimedError.message)) {
      warnings.push(`expire claimed rematch claims: ${claimedError.message}`);
    }
    return openExpired?.length ?? 0;
  }

  return (openExpired?.length ?? 0) + (claimedExpired?.length ?? 0);
}

async function expireStaleHookQueue(admin: SupabaseAdmin, warnings: string[]) {
  const now = new Date().toISOString();
  let usesLegacySchedule = false;
  const scheduledRead = await admin
    .from("battle_queue")
    .select("id,user_id,original_file_name,status,expires_at,scheduled_start_at,cancellation_evaluation_at")
    .in("status", ["searching", "waiting", "waiting_challenge", "public_voting", "ghost_battle"])
    .or(`expires_at.lte.${now},scheduled_start_at.lte.${now},cancellation_evaluation_at.lte.${now}`);
  let candidates = scheduledRead.data as ExpiredHookQueueRow[] | null;
  let readError = scheduledRead.error;

  if (readError && isMissingScheduleColumn(readError)) {
    usesLegacySchedule = true;
    const legacyRead = await admin
      .from("battle_queue")
      .select("id,user_id,original_file_name,status,expires_at")
      .in("status", ["searching", "waiting", "waiting_challenge", "public_voting", "ghost_battle"])
      .lte("expires_at", now);
    candidates = legacyRead.data as ExpiredHookQueueRow[] | null;
    readError = legacyRead.error;
  }

  if (readError) {
    warnings.push(`expire stale 90s queue: ${readError.message}`);
    return 0;
  }

  const expiredIds = ((candidates ?? []) as ExpiredHookQueueRow[])
    .filter((row) => shouldExpireOpenDropQueue(row, Date.parse(now)))
    .map((row) => row.id);

  const { data, error } = expiredIds.length > 0
    ? await admin
        .from("battle_queue")
        .update({ status: "expired", updated_at: now })
        .in("id", expiredIds)
        .select(
          usesLegacySchedule
            ? "id,user_id,original_file_name,status,expires_at"
            : "id,user_id,original_file_name,status,expires_at,scheduled_start_at,cancellation_evaluation_at",
        )
    : { data: [], error: null };

  if (error) {
    warnings.push(`expire stale 90s queue: ${error.message}`);
    return 0;
  }

  const rows = ((data ?? []) as ExpiredHookQueueRow[]).filter((row) => row.user_id);
  if (rows.length > 0) {
    const noticeResult = await admin.from("battle_notifications").insert(
      rows.map((row) => ({
        user_id: row.user_id,
        queue_id: row.id,
        battle_id: null,
        type: "battle_queue_expired",
        title: "Drop Battle 已取消",
        body: `你剛有一場 Drop Battle 因等待時間結束，已從公開挑戰池移除。${row.original_file_name ? `作品：${row.original_file_name}` : "可以重新上傳或開新戰帖。"}`,
        metadata: {
          originalFileName: row.original_file_name ?? null,
          expiredAt: now,
          sourceStatus: row.status ?? null,
          expiresAt: row.expires_at ?? null,
          scheduledStartAt: row.scheduled_start_at ?? null,
        },
      })),
    );
    if (noticeResult.error) warnings.push(`notify expired 90s queue: ${noticeResult.error.message}`);
  }

  return (data ?? []).length;
}

async function expireStaleDailyQueue(admin: SupabaseAdmin, warnings: string[]) {
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("daily_battle_entries")
    .update({ status: "expired", updated_at: now })
    .eq("status", "queued")
    .lt("created_at", staleBefore)
    .select("id,user_id,title,created_at");

  if (error) {
    if (!/schema cache|does not exist|Could not find/i.test(error.message)) {
      warnings.push(`expire stale daily queue: ${error.message}`);
    }
    return 0;
  }

  const rows = ((data ?? []) as ExpiredDailyQueueRow[]).filter((row) => row.user_id);
  if (rows.length > 0) {
    const noticeResult = await admin.from("battle_notifications").insert(
      rows.map((row) => ({
        user_id: row.user_id,
        queue_id: null,
        battle_id: null,
        type: "daily_battle_expired",
        title: "24H Full Song 已過期",
        body: `你剛有一場 24H Full Song 因 24 小時內沒有對手接受，已從公開挑戰池移除。${row.title ? `作品：${row.title}` : "可以重新上傳或開新戰帖。"}`,
        metadata: {
          dailyEntryId: row.id,
          title: row.title ?? null,
          expiredAt: now,
          createdAt: row.created_at ?? null,
        },
      })),
    );
    if (noticeResult.error) warnings.push(`notify expired daily queue: ${noticeResult.error.message}`);
  }

  return (data ?? []).length;
}

async function settleStaleHookBattles(admin: SupabaseAdmin, warnings: string[]) {
  const candidateCreatedBefore = new Date(Date.now() - DROP_BATTLE_EXPECTED_END_BUFFER_MS).toISOString();
  let { data, error } = await admin
    .from("battles")
    .select(
      "id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,status,created_at,scheduled_start_at,started_at,battle_started_at,battle_ended_at,battle_number",
    )
    .in("status", ["live", "active", "ghost_battle", "public_voting"])
    .is("battle_ended_at", null)
    .lt("created_at", candidateCreatedBefore)
    .order("created_at", { ascending: true })
    .limit(25);

  if (error && isMissingScheduleColumn(error)) {
    const legacyRead = await admin
      .from("battles")
      .select(
        "id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,status,created_at,started_at,battle_started_at,battle_ended_at,battle_number",
      )
      .in("status", ["live", "active", "ghost_battle", "public_voting"])
      .is("battle_ended_at", null)
      .lt("created_at", candidateCreatedBefore)
      .order("created_at", { ascending: true })
      .limit(25);
    data = legacyRead.data as typeof data;
    error = legacyRead.error;
  }

  if (error) {
    warnings.push(`stale 90s query: ${error.message}`);
    return 0;
  }

  const rows = (data ?? []) as HookBattleRow[];
  let settled = 0;
  for (const battle of rows) {
    if (!isDropBattleEndedOrPastExpectedEnd(battle)) continue;

    const { data: votes, error: voteError } = await admin
      .from("battle_votes")
      .select("voted_for")
      .eq("battle_id", battle.id);

    if (voteError) {
      warnings.push(`90s votes ${battle.id}: ${voteError.message}`);
      continue;
    }

    const counts = countSides((votes ?? []) as VoteRow[]);
    const winner = pick90sBattleWinner(counts, battle.id);
    if (!winner) {
      await expireHookBattle(admin, battle, warnings, counts);
      settled += 1;
      continue;
    }

    const rpc = await admin.rpc("settle_90s_battle", { p_battle_id: battle.id, p_winner: winner });
    if (rpc.error) {
      warnings.push(`settle_90s_battle ${battle.id}: ${rpc.error.message}`);
      const direct = await admin
        .from("battles")
        .update({
          winner,
          status: "finished",
          battle_ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", battle.id);
      if (direct.error) {
        warnings.push(`direct settle ${battle.id}: ${direct.error.message}`);
        continue;
      }
    }

    await completeQueues(admin, battle, "completed", warnings);
    await archiveHookBattleResult(admin, battle, winner, counts, warnings);
    await notifyHookBattleResult(admin, battle, winner, counts, warnings);
    await recordHookBattleHistory(admin, battle, winner, counts, warnings);
    settled += 1;
  }
  return settled;
}

async function expireHookBattle(
  admin: SupabaseAdmin,
  battle: HookBattleRow,
  warnings: string[],
  counts: { fighter_a: number; fighter_b: number },
) {
  const result = await admin
    .from("battles")
    .update({ status: "expired", battle_ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", battle.id);
  if (result.error) {
    warnings.push(`expire 90s ${battle.id}: ${result.error.message}`);
    return;
  }
  await completeQueues(admin, battle, "expired", warnings);
  await notifyHookBattleResult(admin, battle, null, counts, warnings);
  await recordHookBattleHistory(admin, battle, null, counts, warnings);
}

async function completeQueues(admin: SupabaseAdmin, battle: HookBattleRow, status: "completed" | "expired", warnings: string[]) {
  const ids = [battle.queue_a_id, battle.queue_b_id].filter((id): id is string => Boolean(id));
  if (ids.length === 0) return;
  const result = await admin.from("battle_queue").update({ status, updated_at: new Date().toISOString() }).in("id", ids);
  if (result.error) warnings.push(`queue close ${battle.id}: ${result.error.message}`);
}

function countSides(votes: VoteRow[]) {
  return votes.reduce(
    (acc, vote) => {
      if (vote.voted_for === "fighter_a") acc.fighter_a += 1;
      if (vote.voted_for === "fighter_b") acc.fighter_b += 1;
      return acc;
    },
    { fighter_a: 0, fighter_b: 0 },
  );
}

async function notifyHookBattleResult(
  admin: SupabaseAdmin,
  battle: HookBattleRow,
  winner: "fighter_a" | "fighter_b" | null,
  counts: { fighter_a: number; fighter_b: number },
  warnings: string[],
) {
  const noContest = !winner;
  const rows = [
    {
      user_id: battle.fighter_a_user_id,
      queue_id: battle.queue_a_id,
      battle_id: battle.id,
      type: noContest ? "battle_no_contest" : "battle_finished",
      title: noContest ? "Battle 已結束：未分勝負" : winner === "fighter_a" ? "Battle 勝利！" : "Battle 結束",
      body: noContest
        ? "這場 90s Drop Battle 沒有任何觀眾投票，已判定 no contest，不產生成果卡，也不進榮譽榜。"
        : winner === "fighter_a"
          ? `你擊敗了 ${battle.fighter_b_name}，成果已可查看。`
          : `${battle.fighter_b_name} 贏下這場，成果已可查看。`,
      metadata: {
        battleNumber: battle.battle_number,
        votesA: counts.fighter_a,
        votesB: counts.fighter_b,
        winner,
      },
    },
    {
      user_id: battle.fighter_b_user_id,
      queue_id: battle.queue_b_id,
      battle_id: battle.id,
      type: noContest ? "battle_no_contest" : "battle_finished",
      title: noContest ? "Battle 已結束：未分勝負" : winner === "fighter_b" ? "Battle 勝利！" : "Battle 結束",
      body: noContest
        ? "這場 90s Drop Battle 沒有任何觀眾投票，已判定 no contest，不產生成果卡，也不進榮譽榜。"
        : winner === "fighter_b"
          ? `你擊敗了 ${battle.fighter_a_name}，成果已可查看。`
          : `${battle.fighter_a_name} 贏下這場，成果已可查看。`,
      metadata: {
        battleNumber: battle.battle_number,
        votesA: counts.fighter_a,
        votesB: counts.fighter_b,
        winner,
      },
    },
  ];

  const result = await admin.from("battle_notifications").insert(rows);
  if (result.error) warnings.push(`notify 90s ${battle.id}: ${result.error.message}`);
}

async function archiveHookBattleResult(
  admin: SupabaseAdmin,
  battle: HookBattleRow,
  winner: "fighter_a" | "fighter_b",
  counts: { fighter_a: number; fighter_b: number },
  warnings: string[],
) {
  const archive = await admin.rpc("archive_battle_result", {
    p_battle_id: battle.id,
    p_winner: winner,
    p_final_vote_left: counts.fighter_a,
    p_final_vote_right: counts.fighter_b,
    p_audience_review:
      winner === "fighter_a"
        ? `${battle.fighter_a_name} 以 ${counts.fighter_a}:${counts.fighter_b} 拿下這場 Drop Battle。`
        : `${battle.fighter_b_name} 以 ${counts.fighter_b}:${counts.fighter_a} 拿下這場 Drop Battle。`,
    p_result_payload: {
      source: "cron",
      votesA: counts.fighter_a,
      votesB: counts.fighter_b,
      settledAt: new Date().toISOString(),
    },
  });
  if (archive.error && !/schema cache|does not exist|function.*does not exist/i.test(archive.error.message)) {
    warnings.push(`archive 90s ${battle.id}: ${archive.error.message}`);
  }
}

async function recordHookBattleHistory(
  admin: SupabaseAdmin,
  battle: HookBattleRow,
  winner: "fighter_a" | "fighter_b" | null,
  counts: { fighter_a: number; fighter_b: number },
  warnings: string[],
) {
  const outcomeA = !winner ? "no_contest" : winner === "fighter_a" ? "win" : "loss";
  const outcomeB = !winner ? "no_contest" : winner === "fighter_b" ? "win" : "loss";
  const rows = [
    {
      user_id: battle.fighter_a_user_id,
      battle_id: battle.id,
      battle_kind: "90s_hook",
      opponent_user_id: battle.fighter_b_user_id,
      opponent_name: battle.fighter_b_name,
      song_name: battle.song_a_name,
      result: outcomeA,
      votes_for: counts.fighter_a,
      votes_against: counts.fighter_b,
      battle_code: battle.battle_number,
    },
    {
      user_id: battle.fighter_b_user_id,
      battle_id: battle.id,
      battle_kind: "90s_hook",
      opponent_user_id: battle.fighter_a_user_id,
      opponent_name: battle.fighter_a_name,
      song_name: battle.song_b_name,
      result: outcomeB,
      votes_for: counts.fighter_b,
      votes_against: counts.fighter_a,
      battle_code: battle.battle_number,
    },
  ];

  const result = await admin.from("user_battle_history").insert(rows);
  if (result.error && !/schema cache|does not exist|Could not find/i.test(result.error.message)) {
    warnings.push(`history 90s ${battle.id}: ${result.error.message}`);
  }
}

async function settleExpiredDailyBattles(admin: SupabaseAdmin, warnings: string[]) {
  const { data, error } = await admin
    .from("daily_battles")
    .select("id,entry_a_id,entry_b_id,ends_at")
    .eq("status", "live")
    .lte("ends_at", new Date().toISOString())
    .limit(25);

  if (error) {
    if (!/schema cache|does not exist|Could not find/i.test(error.message)) {
      warnings.push(`daily battle query: ${error.message}`);
    }
    return 0;
  }

  const rows = (data ?? []) as DailyBattleRow[];
  let settled = 0;
  for (const battle of rows) {
    const { data: entries, error: entryError } = await admin
      .from("daily_battle_entries")
      .select("id,user_id,title")
      .in("id", [battle.entry_a_id, battle.entry_b_id]);
    if (entryError) {
      warnings.push(`daily entries ${battle.id}: ${entryError.message}`);
      continue;
    }

    const entryRows = (entries ?? []) as DailyEntryRow[];
    const entryA = entryRows.find((entry) => entry.id === battle.entry_a_id);
    const entryB = entryRows.find((entry) => entry.id === battle.entry_b_id);
    if (!entryA || !entryB) continue;

    const { data: votes, error: voteError } = await admin
      .from("daily_battle_votes")
      .select("picked_entry_id")
      .eq("battle_id", battle.id);
    if (voteError) {
      warnings.push(`daily votes ${battle.id}: ${voteError.message}`);
      continue;
    }

    const votesA = (votes ?? []).filter((vote: { picked_entry_id?: string | null }) => vote.picked_entry_id === entryA.id).length;
    const votesB = (votes ?? []).filter((vote: { picked_entry_id?: string | null }) => vote.picked_entry_id === entryB.id).length;
    const winnerEntryId = pickDailyWinnerEntryId(votesA, votesB, battle.id, entryA.id, entryB.id);

    const updated = await admin
      .from("daily_battles")
      .update({ status: "finished", winner_entry_id: winnerEntryId, updated_at: new Date().toISOString() })
      .eq("id", battle.id);
    if (updated.error) {
      warnings.push(`daily finish ${battle.id}: ${updated.error.message}`);
      continue;
    }

    await admin
      .from("daily_battle_entries")
      .update({ status: "finished", updated_at: new Date().toISOString() })
      .in("id", [entryA.id, entryB.id]);

    await notifyDailyBattleResult(admin, battle.id, entryA, entryB, winnerEntryId, votesA, votesB, warnings);
    settled += 1;
  }
  return settled;
}

async function notifyDailyBattleResult(
  admin: SupabaseAdmin,
  dailyBattleId: string,
  entryA: DailyEntryRow,
  entryB: DailyEntryRow,
  winnerEntryId: string | null,
  votesA: number,
  votesB: number,
  warnings: string[],
) {
  const rows = [entryA, entryB].map((entry) => {
    const opponent = entry.id === entryA.id ? entryB : entryA;
    const noContest = winnerEntryId === null;
    const won = winnerEntryId === entry.id;
    return {
      user_id: entry.user_id,
      queue_id: null,
      battle_id: null,
      type: "daily_battle_finished",
      title: noContest ? "24H Battle 已結束：No contest" : won ? "24H Battle 勝利！" : "24H Battle 已結束",
      body: noContest
        ? "這場 24H Battle 沒有任何觀眾投票，不產生成果，也不進榮譽榜。"
        : won
          ? `你的作品贏下 24H Battle，成果已留檔。`
          : `${opponent.title} 贏下這場 24H Battle，成果已留檔。`,
      metadata: {
        dailyBattleId,
        winnerEntryId,
        votesA,
        votesB,
      },
    };
  });

  const result = await admin.from("battle_notifications").insert(rows);
  if (result.error) warnings.push(`notify daily ${dailyBattleId}: ${result.error.message}`);
}

function pickDailyWinnerEntryId(votesA: number, votesB: number, battleId: string, entryAId: string, entryBId: string) {
  if (votesA + votesB <= 0) return null;
  if (votesA > votesB) return entryAId;
  if (votesB > votesA) return entryBId;
  return battleSeedForId(battleId) % 2 === 0 ? entryAId : entryBId;
}
