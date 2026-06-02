import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ExpiredHookQueueRow = {
  id: string;
  user_id: string | null;
  original_file_name?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

const EXPIRABLE_STATUSES = ["searching", "waiting", "waiting_challenge", "public_voting", "ghost_battle"];

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

  const { data, error } = await admin
    .from("battle_queue")
    .update({ status: "expired", updated_at: now })
    .in("status", EXPIRABLE_STATUSES)
    .lte("expires_at", now)
    .select("id,user_id,original_file_name,status,expires_at");

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
