import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { shouldExpireOpenDropQueue } from "@/lib/battle-pool-client";

type ExpiredHookQueueRow = {
  id: string;
  user_id: string | null;
  original_file_name?: string | null;
  status?: string | null;
  expires_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
};

const EXPIRABLE_STATUSES = ["searching", "waiting", "waiting_challenge", "public_voting", "ghost_battle"];

function isMissingScheduleColumn(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;
  return /scheduled_start_at|cancellation_evaluation_at|schema cache|column.*does not exist/i.test(msg) || error?.code === "PGRST204";
}

export async function GET() {
  return expireOpenCards();
}

export async function POST() {
  return expireOpenCards();
}

async function expireOpenCards() {
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
  const now = new Date().toISOString();

  let usesLegacySchedule = false;
  const scheduledRead = await admin
    .from("battle_queue")
    .select("id,user_id,original_file_name,status,expires_at,scheduled_start_at,cancellation_evaluation_at")
    .in("status", EXPIRABLE_STATUSES)
    .or(`expires_at.lte.${now},scheduled_start_at.lte.${now},cancellation_evaluation_at.lte.${now}`);
  let candidates = scheduledRead.data as ExpiredHookQueueRow[] | null;
  let readError = scheduledRead.error;

  if (readError && isMissingScheduleColumn(readError)) {
    usesLegacySchedule = true;
    const legacyRead = await admin
      .from("battle_queue")
      .select("id,user_id,original_file_name,status,expires_at")
      .in("status", EXPIRABLE_STATUSES)
      .lte("expires_at", now);
    candidates = legacyRead.data as ExpiredHookQueueRow[] | null;
    readError = legacyRead.error;
  }

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as ExpiredHookQueueRow[]).filter((row) => row.user_id);
  let notificationError: string | null = null;
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
    notificationError = noticeResult.error?.message ?? null;
  }

  return NextResponse.json({
    expired: data?.length ?? 0,
    notified: rows.length,
    notificationError,
  });
}
