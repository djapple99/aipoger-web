import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type VoteTarget = "fighter_a" | "fighter_b";
type VoteCounts = { fighter_a: number; fighter_b: number };
type VoteRow = { voted_for: VoteTarget | null };
type GuestVoteRow = { voted_for: VoteTarget | null; guest_id?: string | null };

const missingGuestVoteTablePattern = /battle_guest_votes|schema cache|relation.*does not exist|Could not find the table|PGRST205/i;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanGuestId(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!/^guest-[a-z0-9-]{8,74}$/i.test(text)) return null;
  return text.slice(0, 80);
}

function countSides(rows: VoteRow[]): VoteCounts {
  return rows.reduce<VoteCounts>(
    (acc, row) => {
      if (row.voted_for === "fighter_a") acc.fighter_a += 1;
      if (row.voted_for === "fighter_b") acc.fighter_b += 1;
      return acc;
    },
    { fighter_a: 0, fighter_b: 0 },
  );
}

async function readVoteState(admin: SupabaseClient, battleId: string, guestId: string | null) {
  const [{ data: userVotes, error: userVoteError }, guestVotesResult] = await Promise.all([
    admin.from("battle_votes").select("voted_for").eq("battle_id", battleId),
    admin.from("battle_guest_votes").select("voted_for,guest_id").eq("battle_id", battleId),
  ]);
  if (userVoteError) throw userVoteError;

  const userCounts = countSides((userVotes ?? []) as VoteRow[]);
  const guestVoteError = guestVotesResult.error;
  if (guestVoteError) {
    if (!missingGuestVoteTablePattern.test(`${guestVoteError.message} ${guestVoteError.details ?? ""}`)) {
      throw guestVoteError;
    }
    return { counts: userCounts, guestVote: null };
  }

  const guestRows = (guestVotesResult.data ?? []) as GuestVoteRow[];
  const guestCounts = countSides(guestRows);
  const guestVote = guestId ? guestRows.find((row) => row.guest_id === guestId)?.voted_for ?? null : null;
  return {
    counts: {
      fighter_a: userCounts.fighter_a + guestCounts.fighter_a,
      fighter_b: userCounts.fighter_b + guestCounts.fighter_b,
    },
    guestVote,
  };
}

function adminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: NextRequest) {
  const admin = adminClient();
  if (!admin) return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  const battleId = request.nextUrl.searchParams.get("battleId");
  const guestId = cleanGuestId(request.nextUrl.searchParams.get("guestId"));
  if (!isUuid(battleId)) return jsonError("Missing battleId");

  try {
    const state = await readVoteState(admin, battleId, guestId);
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}

export async function POST(request: NextRequest) {
  const admin = adminClient();
  if (!admin) return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);

  const body = (await request.json().catch(() => null)) as { battleId?: unknown; guestId?: unknown; votedFor?: unknown } | null;
  const battleId = isUuid(body?.battleId) ? body.battleId : null;
  const guestId = cleanGuestId(body?.guestId);
  const votedFor = body?.votedFor === "fighter_a" || body?.votedFor === "fighter_b" ? body.votedFor : null;
  if (!battleId) return jsonError("Missing battleId");
  if (!guestId) return jsonError("Missing guestId");
  if (!votedFor) return jsonError("Missing vote target");

  const { data: battle, error: battleError } = await admin
    .from("battles")
    .select("id,status,winner,battle_ended_at")
    .eq("id", battleId)
    .maybeSingle<{ id: string; status: string | null; winner: string | null; battle_ended_at: string | null }>();
  if (battleError) return jsonError(battleError.message, 500);
  if (!battle?.id) return jsonError("Battle not found", 404);
  if (battle.winner || battle.status === "finished" || battle.battle_ended_at) return jsonError("Battle already settled", 409);

  const { error: upsertError } = await admin.from("battle_guest_votes").upsert(
    {
      battle_id: battleId,
      guest_id: guestId,
      voted_for: votedFor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "battle_id,guest_id" },
  );
  if (upsertError) return jsonError(upsertError.message, 500);

  const state = await readVoteState(admin, battleId, guestId);
  return NextResponse.json({ ok: true, ...state }, { headers: { "Cache-Control": "no-store" } });
}
