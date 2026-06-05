import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { shouldCancelStaleDropBattle } from "@/lib/battle-pool-client";

type SupabaseAdmin = SupabaseClient;

type StaleBattleRow = {
  id: string;
  fighter_a_user_id: string | null;
  fighter_b_user_id: string | null;
  status: string | null;
  scheduled_start_at: string | null;
  cancellation_evaluation_at: string | null;
};

export async function GET(request: NextRequest) {
  return cancelStaleChallenges(request);
}

export async function POST(request: NextRequest) {
  return cancelStaleChallenges(request);
}

async function cancelStaleChallenges(request: NextRequest) {
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
      { cancelled: 0, errors: ["Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"] },
      { status: 500 },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await cancelStalePendingBattles(admin);
  const status = result.errors.length > 0 && result.cancelled === 0 ? 500 : 200;
  return NextResponse.json(result, { status });
}

async function cancelStalePendingBattles(admin: SupabaseAdmin) {
  const now = new Date().toISOString();
  const errors: string[] = [];

  const { data, error } = await admin
    .from("battles")
    .select("id, fighter_a_user_id, fighter_b_user_id, status, scheduled_start_at, cancellation_evaluation_at")
    .eq("status", "pending")
    .is("fighter_b_user_id", null)
    .lte("cancellation_evaluation_at", now);

  if (error) {
    return { cancelled: 0, errors: [`stale battle query: ${error.message}`] };
  }

  const rows = (data ?? []) as StaleBattleRow[];
  let cancelled = 0;

  for (const battle of rows) {
    if (!shouldCancelStaleDropBattle(battle, Date.parse(now))) continue;

    const update = await admin
      .from("battles")
      .update({
        status: "cancelled_no_challenger",
        cancellation_reason: "no_challenger",
        updated_at: now,
      })
      .eq("id", battle.id)
      .eq("status", "pending")
      .is("fighter_b_user_id", null)
      .select("id")
      .maybeSingle();

    if (update.error) {
      errors.push(`cancel battle ${battle.id}: ${update.error.message}`);
      continue;
    }
    if (!update.data?.id) continue;

    cancelled += 1;

    if (!battle.fighter_a_user_id) {
      errors.push(`notify founder ${battle.id}: missing fighter_a_user_id`);
      continue;
    }

    const notice = await admin.from("battle_notifications").insert({
      user_id: battle.fighter_a_user_id,
      queue_id: null,
      battle_id: battle.id,
      type: "battle_cancelled_no_challenger",
      title: "挑戰自動取消",
      body: "你發起的挑戰在開戰時間過後 1 分鐘仍無對手接受，已自動取消。",
      metadata: {
        titleEn: "Battle Auto-Cancelled",
        scheduledStartAt: battle.scheduled_start_at,
        cancellationEvaluationAt: battle.cancellation_evaluation_at,
        cancelledAt: now,
      },
    });

    if (notice.error) {
      errors.push(`notify founder ${battle.id}: ${notice.error.message}`);
    }
  }

  return { cancelled, errors };
}
