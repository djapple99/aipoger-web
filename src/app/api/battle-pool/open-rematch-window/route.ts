import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pick90sBattleWinner } from "@/lib/battle-90s-system";
import {
  DROP_REMATCH_CLAIM_WINDOW_SECONDS,
  canOpenDropRematchWindow,
  isDropRematchStatus,
} from "@/lib/drop-battle-rematch";

type VoteRow = { voted_for: string | null; user_id?: string | null; voter_role?: string | null };
type GuestVoteRow = { voted_for: string | null; guest_id?: string | null };
type SupabaseAdmin = SupabaseClient;
const missingGuestVoteTablePattern = /battle_guest_votes|schema cache|relation.*does not exist|Could not find the table|PGRST205/i;

type BattleRow = {
  id: string;
  queue_a_id: string | null;
  queue_b_id: string | null;
  fighter_a_user_id: string | null;
  fighter_b_user_id: string | null;
  genre: string | null;
  battle_type?: string | null;
};

type RematchClaimRow = {
  id: string;
  source_battle_id: string;
  winner_user_id: string;
  winner_side: "fighter_a" | "fighter_b";
  defender_queue_id: string;
  claimer_user_id: string | null;
  status: string;
  claim_window_started_at: string;
  claim_window_ends_at: string;
  claimed_at: string | null;
  upload_deadline_at: string | null;
  next_battle_id: string | null;
  next_queue_id: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isWinnerSide(value: unknown): value is "fighter_a" | "fighter_b" {
  return value === "fighter_a" || value === "fighter_b";
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

function serializeClaim(claim: RematchClaimRow, battle: BattleRow) {
  return {
    claimId: claim.id,
    sourceBattleId: claim.source_battle_id,
    winnerUserId: claim.winner_user_id,
    winnerSide: claim.winner_side,
    defenderQueueId: claim.defender_queue_id,
    claimerUserId: claim.claimer_user_id,
    status: isDropRematchStatus(claim.status) ? claim.status : "cancelled",
    claimWindowStartedAt: claim.claim_window_started_at,
    claimWindowEndsAt: claim.claim_window_ends_at,
    claimedAt: claim.claimed_at,
    uploadDeadlineAt: claim.upload_deadline_at,
    nextBattleId: claim.next_battle_id,
    nextQueueId: claim.next_queue_id,
    genre: battle.genre || "AI Music",
  };
}

async function expireClaimIfNeeded(admin: SupabaseAdmin, sourceBattleId: string, nowIso: string) {
  await admin
    .from("drop_battle_rematch_claims")
    .update({ status: "expired", updated_at: nowIso })
    .eq("source_battle_id", sourceBattleId)
    .eq("status", "open")
    .lte("claim_window_ends_at", nowIso);

  await admin
    .from("drop_battle_rematch_claims")
    .update({ status: "expired", updated_at: nowIso })
    .eq("source_battle_id", sourceBattleId)
    .eq("status", "claimed")
    .lte("upload_deadline_at", nowIso);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const body = (await request.json().catch(() => null)) as { battleId?: unknown; winnerSide?: unknown } | null;
  const battleId = isUuid(body?.battleId) ? body.battleId : null;
  const requestedWinnerSide = isWinnerSide(body?.winnerSide) ? body.winnerSide : null;
  if (!battleId) return jsonError("Missing battleId");
  if (!requestedWinnerSide) return jsonError("Missing winnerSide");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: battle, error: battleError } = await admin
    .from("battles")
    .select("id,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id,genre,battle_type")
    .eq("id", battleId)
    .maybeSingle<BattleRow>();

  if (battleError) return jsonError(battleError.message, 500);
  if (!battle?.id) return jsonError("Battle not found", 404);
  if (!battle.queue_a_id || !battle.queue_b_id || !battle.fighter_a_user_id || !battle.fighter_b_user_id) {
    return jsonError("Battle is not a complete 90s Drop Battle", 409);
  }

  const voteRead = await readCombined90sVotes(admin, battle.id);
  if (voteRead.error) return jsonError(voteRead.error, 500);

  const counts = voteRead.counts;
  const totalVotes = counts.fighter_a + counts.fighter_b;
  const winner = pick90sBattleWinner(counts, battle.id);
  if (!canOpenDropRematchWindow({ winner, totalVotes, audienceCount: voteRead.audienceCount, battleType: battle.battle_type })) {
    return jsonError("No valid rematch window for this battle", 409);
  }
  if (winner !== requestedWinnerSide) return jsonError("Winner side does not match server result", 409);

  const winnerUserId = winner === "fighter_a" ? battle.fighter_a_user_id : battle.fighter_b_user_id;
  const defenderQueueId = winner === "fighter_a" ? battle.queue_a_id : battle.queue_b_id;
  const now = new Date();
  const nowIso = now.toISOString();
  await expireClaimIfNeeded(admin, battle.id, nowIso);

  const { data: existing, error: existingError } = await admin
    .from("drop_battle_rematch_claims")
    .select("*")
    .eq("source_battle_id", battle.id)
    .maybeSingle<RematchClaimRow>();
  if (existingError) return jsonError(existingError.message, 500);
  if (existing?.id) return NextResponse.json({ claim: serializeClaim(existing, battle) });

  const claimWindowEndsAt = new Date(now.getTime() + DROP_REMATCH_CLAIM_WINDOW_SECONDS * 1000).toISOString();
  const { data: inserted, error: insertError } = await admin
    .from("drop_battle_rematch_claims")
    .insert({
      source_battle_id: battle.id,
      winner_user_id: winnerUserId,
      winner_side: winner,
      defender_queue_id: defenderQueueId,
      status: "open",
      claim_window_started_at: nowIso,
      claim_window_ends_at: claimWindowEndsAt,
    })
    .select("*")
    .single<RematchClaimRow>();

  if (insertError) return jsonError(insertError.message, 500);
  return NextResponse.json({ claim: serializeClaim(inserted, battle) });
}
