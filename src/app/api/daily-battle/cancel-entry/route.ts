import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CANCELLABLE_ENTRY_STATUSES = ["queued", "matched", "live"];
const CANCELLABLE_BATTLE_STATUSES = ["matched", "live", "settling"];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return jsonError("Missing Supabase server configuration.", 500);

  const token = tokenFromRequest(request);
  if (!token) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as { entryId?: unknown } | null;
  if (!isUuid(body?.entryId)) return jsonError("Invalid entry id.");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("Unauthorized", 401);

  const { data: entry, error: readError } = await admin
    .from("daily_battle_entries")
    .select("id,user_id,status,matched_battle_id")
    .eq("id", body.entryId)
    .maybeSingle();
  if (readError) return jsonError(readError.message, 500);
  if (!entry) return jsonError("Daily Battle not found.", 404);
  if (entry.user_id !== user.id) return jsonError("只能取消自己的 Daily Battle。", 403);
  if (entry.status === "cancelled") {
    return NextResponse.json({ ok: true, cancelledEntryId: entry.id, alreadyCancelled: true });
  }
  if (!CANCELLABLE_ENTRY_STATUSES.includes(entry.status)) {
    return jsonError("這場 Daily Battle 目前不能取消。");
  }

  const now = new Date().toISOString();
  let updateEntryQuery = admin
    .from("daily_battle_entries")
    .update({ status: "cancelled", updated_at: now })
    .in("status", CANCELLABLE_ENTRY_STATUSES);
  updateEntryQuery = entry.matched_battle_id
    ? updateEntryQuery.eq("matched_battle_id", entry.matched_battle_id)
    : updateEntryQuery.eq("id", entry.id);

  const { data: cancelledEntries, error: updateEntryError } = await updateEntryQuery.select("id");
  if (updateEntryError) return jsonError(updateEntryError.message, 500);

  if (entry.matched_battle_id) {
    const { error: updateBattleError } = await admin
      .from("daily_battles")
      .update({ status: "cancelled", updated_at: now })
      .eq("id", entry.matched_battle_id)
      .in("status", CANCELLABLE_BATTLE_STATUSES);
    if (updateBattleError) return jsonError(updateBattleError.message, 500);
  }

  return NextResponse.json({
    ok: true,
    cancelledEntryId: entry.id,
    cancelledEntries: cancelledEntries?.length ?? 0,
    cancelledBattleId: entry.matched_battle_id,
  });
}
