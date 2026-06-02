import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ExpiredDailyQueueRow = {
  id: string;
  user_id: string | null;
  title?: string | null;
  created_at?: string | null;
};

export async function GET() {
  return expireOpenDailyEntries();
}

export async function POST() {
  return expireOpenDailyEntries();
}

async function expireOpenDailyEntries() {
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
  const staleBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("daily_battle_entries")
    .update({ status: "expired", updated_at: now })
    .eq("status", "queued")
    .lt("created_at", staleBefore)
    .select("id,user_id,title,created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as ExpiredDailyQueueRow[]).filter((row) => row.user_id);
  let notificationError: string | null = null;
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
    notificationError = noticeResult.error?.message ?? null;
  }

  return NextResponse.json({
    expired: data?.length ?? 0,
    notified: rows.length,
    notificationError,
  });
}
