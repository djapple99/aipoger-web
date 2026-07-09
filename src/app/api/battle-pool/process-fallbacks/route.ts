import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DROP_BATTLE_EXPECTED_END_BUFFER_MS,
  isDropBattleEndedOrPastExpectedEnd,
  shouldExpireOpenDropQueue,
} from "@/lib/battle-pool-client";
import { cancelStalePendingDropBattles, isMissingScheduleColumn } from "@/lib/battle-pool-maintenance";
import { battleSeedForId } from "@/lib/battle-90s-system";
import { DROP_BATTLE_OFFICIAL_AUDIENCE_MIN } from "@/lib/drop-battle-rematch";
import { pickDropBattleWinnerForRules } from "@/lib/ai-music-challenge-rules";

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
  song_a_cover?: string | null;
  song_b_cover?: string | null;
  status?: string | null;
  created_at: string;
  scheduled_start_at?: string | null;
  started_at?: string | null;
  battle_started_at?: string | null;
  battle_ended_at?: string | null;
  battle_number?: string | null;
  result_archived_at?: string | null;
  ai_tool_a?: string | null;
  ai_tool_b?: string | null;
  winner?: string | null;
  battle_type?: string | null;
};

type VoteRow = { voted_for: string | null; user_id?: string | null; voter_role?: string | null };
type GuestVoteRow = { voted_for: string | null; guest_id?: string | null };
const missingGuestVoteTablePattern = /battle_guest_votes|schema cache|relation.*does not exist|Could not find the table|PGRST205/i;

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

type AiMusicChallengeInviteRow = {
  id: string;
  defender_track_id: string;
  defender_user_id: string;
  challenger_user_id: string;
  defender_queue_id?: string | null;
  challenger_queue_id?: string | null;
  battle_id?: string | null;
  status?: string | null;
  scheduled_start_at?: string | null;
  expires_at?: string | null;
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
  const hookArchived = await archiveFinishedUnarchivedHookBattles(admin, warnings);
  const dailySettled = await settleExpiredDailyBattles(admin, warnings);
  const expiredHookQueue = await expireStaleHookQueue(admin, warnings);
  const expiredDailyQueue = await expireStaleDailyQueue(admin, warnings);
  const expiredRematchClaims = await expireStaleRematchClaims(admin, warnings);
  const expiredAiMusicInvites = await expireStaleAiMusicChallengeInvites(admin, warnings);
  const stalePendingBattles = await cancelStalePendingDropBattles(admin);
  warnings.push(...stalePendingBattles.errors);

  return NextResponse.json({
    processed: poolProcessed + hookSettled + hookArchived + dailySettled + expiredHookQueue + expiredDailyQueue + expiredRematchClaims + expiredAiMusicInvites + stalePendingBattles.cancelled,
    poolProcessed,
    hookSettled,
    hookArchived,
    dailySettled,
    expiredHookQueue,
    expiredDailyQueue,
    expiredRematchClaims,
    expiredAiMusicInvites,
    stalePendingBattles: stalePendingBattles.cancelled,
    warnings,
  });
}

async function expireStaleAiMusicChallengeInvites(admin: SupabaseAdmin, warnings: string[]) {
  const now = new Date().toISOString();
  const { data: candidates, error: readError } = await admin
    .from("ai_music_challenge_invites")
    .select("id,defender_track_id,defender_user_id,challenger_user_id,defender_queue_id,challenger_queue_id,battle_id,status,scheduled_start_at,expires_at")
    .eq("status", "pending")
    .lte("expires_at", now)
    .limit(50);

  if (readError) {
    if (!/ai_music_challenge_invites|schema cache|does not exist|Could not find/i.test(readError.message)) {
      warnings.push(`expire ai music challenge invites: ${readError.message}`);
    }
    return 0;
  }

  const rows = (candidates ?? []) as AiMusicChallengeInviteRow[];
  if (rows.length === 0) return 0;

  const ids = rows.map((row) => row.id);
  const { error: updateError } = await admin
    .from("ai_music_challenge_invites")
    .update({ status: "expired", responded_at: now, updated_at: now })
    .in("id", ids)
    .eq("status", "pending");
  if (updateError) {
    warnings.push(`expire ai music challenge invites: ${updateError.message}`);
    return 0;
  }

  const battleIds = Array.from(new Set(rows.map((row) => row.battle_id).filter((id): id is string => Boolean(id))));
  if (battleIds.length > 0) {
    const battleResult = await admin
      .from("battles")
      .update({ status: "expired", battle_ended_at: now, updated_at: now })
      .in("id", battleIds);
    if (battleResult.error) warnings.push(`expire ai music challenge battles: ${battleResult.error.message}`);
  }

  const queueIds = Array.from(new Set(rows.flatMap((row) => [row.defender_queue_id, row.challenger_queue_id]).filter((id): id is string => Boolean(id))));
  if (queueIds.length > 0) {
    const queueResult = await admin.from("battle_queue").update({ status: "expired", updated_at: now }).in("id", queueIds);
    if (queueResult.error) warnings.push(`expire ai music challenge queues: ${queueResult.error.message}`);
  }

  const noticeRows = rows.flatMap((row) => ([
    {
      user_id: row.defender_user_id,
      queue_id: row.defender_queue_id ?? null,
      battle_id: row.battle_id ?? null,
      type: "ai_music_challenge_expired",
      title: "攻擂邀請已失效",
      body: "未在預定開打前回覆，這場不算戰績、不進 Showtime，也不算任何一方勝敗。",
      metadata: { inviteId: row.id, defenderTrackId: row.defender_track_id, expiredAt: now, href: "/profile#pending-ai-music-challenges" },
    },
    {
      user_id: row.challenger_user_id,
      queue_id: row.challenger_queue_id ?? null,
      battle_id: row.battle_id ?? null,
      type: "ai_music_challenge_expired",
      title: "攻擂邀請已失效",
      body: "關主未在期限內回覆，這場不算戰績、不進 Showtime，也不算任何一方勝敗。",
      metadata: { inviteId: row.id, defenderTrackId: row.defender_track_id, expiredAt: now },
    },
  ]));
  const noticeResult = await admin.from("battle_notifications").insert(noticeRows);
  if (noticeResult.error) warnings.push(`notify expired ai music invites: ${noticeResult.error.message}`);

  return rows.length;
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
      "id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,song_a_cover,song_b_cover,status,created_at,scheduled_start_at,started_at,battle_started_at,battle_ended_at,battle_number,result_archived_at,ai_tool_a,ai_tool_b,winner,battle_type",
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
        "id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,song_a_cover,song_b_cover,status,created_at,started_at,battle_started_at,battle_ended_at,battle_number,result_archived_at,ai_tool_a,ai_tool_b,winner,battle_type",
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

    const voteRead = await readCombined90sVotes(admin, battle.id);
    if (voteRead.error) {
      warnings.push(`90s votes ${battle.id}: ${voteRead.error}`);
      continue;
    }

    const counts = voteRead.counts;
    if (voteRead.audienceCount < DROP_BATTLE_OFFICIAL_AUDIENCE_MIN) {
      await expireHookBattle(admin, battle, warnings, counts, voteRead.audienceCount);
      settled += 1;
      continue;
    }

    const winner = pickDropBattleWinnerForRules(counts, battle.id, null, battle.battle_type);
    if (!winner) {
      await expireHookBattle(admin, battle, warnings, counts, voteRead.audienceCount);
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
    await archiveHookBattleResult(admin, battle, winner, counts, voteRead.audienceCount, true, warnings);
    await notifyHookBattleResult(admin, battle, winner, counts, warnings, voteRead.audienceCount, true);
    await recordHookBattleHistory(admin, battle, winner, counts, warnings);
    settled += 1;
  }
  return settled;
}

async function archiveFinishedUnarchivedHookBattles(admin: SupabaseAdmin, warnings: string[]) {
  const { data, error } = await admin
    .from("battles")
    .select(
      "id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,song_a_cover,song_b_cover,status,created_at,scheduled_start_at,started_at,battle_started_at,battle_ended_at,battle_number,result_archived_at,ai_tool_a,ai_tool_b,winner,battle_type",
    )
    .eq("status", "finished")
    .not("winner", "is", null)
    .is("result_archived_at", null)
    .order("battle_ended_at", { ascending: true, nullsFirst: false })
    .limit(25);

  if (error) {
    if (!/schema cache|does not exist|Could not find/i.test(error.message)) {
      warnings.push(`finished 90s archive query: ${error.message}`);
    }
    return 0;
  }

  let archived = 0;
  for (const battle of (data ?? []) as HookBattleRow[]) {
    const winner = battle.winner === "fighter_a" || battle.winner === "fighter_b" ? battle.winner : null;
    if (!winner) continue;

    const voteRead = await readCombined90sVotes(admin, battle.id);
    if (voteRead.error) {
      warnings.push(`finished 90s votes ${battle.id}: ${voteRead.error}`);
      continue;
    }
    const counts = voteRead.counts;
    if (voteRead.audienceCount < DROP_BATTLE_OFFICIAL_AUDIENCE_MIN) continue;

    await archiveHookBattleResult(admin, battle, winner, counts, voteRead.audienceCount, true, warnings);
    archived += 1;
  }
  return archived;
}

async function expireHookBattle(
  admin: SupabaseAdmin,
  battle: HookBattleRow,
  warnings: string[],
  counts: { fighter_a: number; fighter_b: number },
  audienceCount = 0,
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
  await notifyHookBattleResult(admin, battle, null, counts, warnings, audienceCount, false);
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

function isAudienceVote(row: VoteRow) {
  return !row.voter_role || row.voter_role === "audience";
}

function distinctTextCount(values: Array<string | null | undefined>) {
  return new Set(values.map((value) => String(value || "").trim()).filter(Boolean)).size;
}

async function readCombined90sVotes(admin: SupabaseAdmin, battleId: string) {
  const { data: votes, error: voteError } = await admin
    .from("battle_votes")
    .select("voted_for,user_id,voter_role")
    .eq("battle_id", battleId);
  if (voteError) return { counts: { fighter_a: 0, fighter_b: 0 }, audienceCount: 0, error: voteError.message };

  const signedRows = ((votes ?? []) as VoteRow[]).filter(isAudienceVote);
  const counts = countSides(signedRows);
  const signedAudienceCount = distinctTextCount(signedRows.map((row) => row.user_id));
  const { data: guestVotes, error: guestVoteError } = await admin
    .from("battle_guest_votes")
    .select("voted_for,guest_id")
    .eq("battle_id", battleId);
  if (guestVoteError) {
    const msg = `${guestVoteError.message ?? ""} ${guestVoteError.details ?? ""}`;
    if (!missingGuestVoteTablePattern.test(msg)) return { counts, audienceCount: signedAudienceCount, error: guestVoteError.message };
    return { counts, audienceCount: signedAudienceCount, error: null };
  }

  const guestRows = (guestVotes ?? []) as GuestVoteRow[];
  const guestCounts = countSides(guestRows);
  const guestAudienceCount = distinctTextCount(guestRows.map((row) => row.guest_id));
  return {
    counts: {
      fighter_a: counts.fighter_a + guestCounts.fighter_a,
      fighter_b: counts.fighter_b + guestCounts.fighter_b,
    },
    audienceCount: signedAudienceCount + guestAudienceCount,
    error: null,
  };
}

async function notifyHookBattleResult(
  admin: SupabaseAdmin,
  battle: HookBattleRow,
  winner: "fighter_a" | "fighter_b" | null,
  counts: { fighter_a: number; fighter_b: number },
  warnings: string[],
  audienceCount = 0,
  official = true,
) {
  const noContest = !winner;
  const audienceInsufficientBody =
    `這場 Drop Battle 需要至少 ${DROP_BATTLE_OFFICIAL_AUDIENCE_MIN} 位非參賽者投票才成立；本場只有 ${audienceCount}/${DROP_BATTLE_OFFICIAL_AUDIENCE_MIN} 位，不產生成果卡、不進 Showtime、不算勝敗。`;
  const rows = [
    {
      user_id: battle.fighter_a_user_id,
      queue_id: battle.queue_a_id,
      battle_id: battle.id,
      type: noContest || !official ? "battle_no_contest" : "battle_finished",
      title: noContest || !official ? "Battle 已結束：觀眾不足" : winner === "fighter_a" ? "Battle 勝利！" : "Battle 結束",
      body: noContest
        ? audienceInsufficientBody
        : !official
          ? audienceInsufficientBody
        : winner === "fighter_a"
          ? `你擊敗了 ${battle.fighter_b_name}，成果已可查看。`
          : `${battle.fighter_b_name} 贏下這場，成果已可查看。`,
      metadata: {
        battleNumber: battle.battle_number,
        votesA: counts.fighter_a,
        votesB: counts.fighter_b,
        audienceCount,
        officialAudienceMin: DROP_BATTLE_OFFICIAL_AUDIENCE_MIN,
        winner,
      },
    },
    {
      user_id: battle.fighter_b_user_id,
      queue_id: battle.queue_b_id,
      battle_id: battle.id,
      type: noContest || !official ? "battle_no_contest" : "battle_finished",
      title: noContest || !official ? "Battle 已結束：觀眾不足" : winner === "fighter_b" ? "Battle 勝利！" : "Battle 結束",
      body: noContest
        ? audienceInsufficientBody
        : !official
          ? audienceInsufficientBody
        : winner === "fighter_b"
          ? `你擊敗了 ${battle.fighter_a_name}，成果已可查看。`
          : `${battle.fighter_a_name} 贏下這場，成果已可查看。`,
      metadata: {
        battleNumber: battle.battle_number,
        votesA: counts.fighter_a,
        votesB: counts.fighter_b,
        audienceCount,
        officialAudienceMin: DROP_BATTLE_OFFICIAL_AUDIENCE_MIN,
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
  audienceCount: number,
  isOfficial: boolean,
  warnings: string[],
) {
  if (!isOfficial) {
    return;
  }

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
      audienceCount,
      officialAudienceMin: DROP_BATTLE_OFFICIAL_AUDIENCE_MIN,
      settledAt: new Date().toISOString(),
    },
  });
  if (!archive.error) return;

  const direct = await archiveHookBattleResultDirect(admin, battle, winner, counts, audienceCount, true);
  if (direct.error) {
    warnings.push(`archive 90s ${battle.id}: ${archive.error.message}; direct archive: ${direct.error}`);
  }
}

async function archiveHookBattleResultDirect(
  admin: SupabaseAdmin,
  battle: HookBattleRow,
  winner: "fighter_a" | "fighter_b",
  counts: { fighter_a: number; fighter_b: number },
  audienceCount: number,
  isOfficial: boolean,
) {
  const fresh = await admin
    .from("battles")
    .select(
      "id,fighter_a_user_id,fighter_b_user_id,fighter_a_name,fighter_b_name,song_a_name,song_b_name,song_a_cover,song_b_cover,battle_number,ai_tool_a,ai_tool_b,winner",
    )
    .eq("id", battle.id)
    .maybeSingle();

  if (fresh.error && !/schema cache|does not exist|Could not find/i.test(fresh.error.message)) {
    return { error: fresh.error.message };
  }

  const row = ((fresh.data as HookBattleRow | null) ?? battle) as HookBattleRow;
  const battleNumber = Number(row.battle_number ?? battle.battle_number);
  if (!Number.isFinite(battleNumber) || battleNumber <= 0) {
    return { error: "missing battle_number for direct archive" };
  }

  const effectiveWinner = row.winner === "fighter_a" || row.winner === "fighter_b" ? row.winner : winner;
  const winnerIsA = effectiveWinner === "fighter_a";
  const now = new Date().toISOString();
  const totalVotes = Math.max(0, counts.fighter_a) + Math.max(0, counts.fighter_b);
  const winnerCoverUrl = winnerIsA ? row.song_a_cover ?? null : row.song_b_cover ?? null;
  const opponentCoverUrl = winnerIsA ? row.song_b_cover ?? null : row.song_a_cover ?? null;
  const audienceReview = winnerIsA
    ? `${row.fighter_a_name} 以 ${counts.fighter_a}:${counts.fighter_b} 拿下這場 Drop Battle。`
    : `${row.fighter_b_name} 以 ${counts.fighter_b}:${counts.fighter_a} 拿下這場 Drop Battle。`;

  const upsert = await admin
    .from("battle_result_archives")
    .upsert(
      {
        battle_id: battle.id,
        battle_number: battleNumber,
        battle_code: `AIPO-${String(battleNumber).padStart(6, "0")}`,
        winner: effectiveWinner,
        winner_user_id: winnerIsA ? row.fighter_a_user_id : row.fighter_b_user_id,
        winner_name: winnerIsA ? row.fighter_a_name : row.fighter_b_name,
        winner_song_name: winnerIsA ? row.song_a_name : row.song_b_name,
        winner_ai_tool: winnerIsA ? row.ai_tool_a ?? null : row.ai_tool_b ?? null,
        opponent_user_id: winnerIsA ? row.fighter_b_user_id : row.fighter_a_user_id,
        opponent_name: winnerIsA ? row.fighter_b_name : row.fighter_a_name,
        opponent_song_name: winnerIsA ? row.song_b_name : row.song_a_name,
        final_vote_left: Math.max(0, counts.fighter_a),
        final_vote_right: Math.max(0, counts.fighter_b),
        total_votes: totalVotes,
        audience_review: audienceReview,
        result_payload: {
          source: "cron-direct-fallback",
          archiveScope: "official-result",
          isOfficial: true,
          votesA: counts.fighter_a,
          votesB: counts.fighter_b,
          audienceCount,
          coverUrl: winnerCoverUrl,
          opponentCoverUrl,
          officialAudienceMin: DROP_BATTLE_OFFICIAL_AUDIENCE_MIN,
          settledAt: now,
        },
        archived_at: now,
      },
      { onConflict: "battle_id" },
    );

  if (upsert.error) return { error: upsert.error.message };

  if (isOfficial) {
    const stats = await admin.rpc("record_battle_song_stats_for_battle", {
      p_battle_id: battle.id,
      p_winner: effectiveWinner,
      p_final_vote_left: counts.fighter_a,
      p_final_vote_right: counts.fighter_b,
    });
    if (stats.error && !/schema cache|does not exist|Could not find|PGRST/i.test(stats.error.message)) {
      return { error: stats.error.message };
    }
  }

  const marked = await admin
    .from("battles")
    .update({ result_archived_at: now, winner: effectiveWinner, status: "finished", updated_at: now })
    .eq("id", battle.id);
  if (marked.error && !/schema cache|does not exist|Could not find/i.test(marked.error.message)) {
    return { error: marked.error.message };
  }

  return { error: null };
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
        ? "這場 24H Battle 沒有任何觀眾投票，不產生成果，也不進 Showtime。"
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
