import { NextResponse } from "next/server";
import { creatorAuth } from "@/lib/server-creator-auth";

const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function GET(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return json({ error: "AUTH_REQUIRED" }, 401);
    const { admin, user } = auth;
    const params = new URL(request.url).searchParams;
    const count = await admin.from("battle_notifications").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).is("read_at", null);
    if (count.error) throw count.error;
    if (params.get("count") === "1") return json({ unreadCount: count.count ?? 0 });
    let query = admin.from("battle_notifications")
      .select("id,type,title,body,metadata,battle_id,created_at,read_at").eq("user_id", user.id);
    if (params.get("unread") === "1") query = query.is("read_at", null);
    const before = params.get("before"), beforeId = params.get("beforeId");
    if (before || beforeId) {
      if (!before || !beforeId || !uuid.test(beforeId) || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(before) || !Number.isFinite(Date.parse(before)))
        return json({ error: "INVALID_CURSOR" }, 400);
      query = query.or(`created_at.lt.${before},and(created_at.eq.${before},id.lt.${beforeId})`);
    }
    const result = await query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(11);
    if (result.error) throw result.error;
    return json({ notices: (result.data ?? []).slice(0, 10), hasMore: (result.data?.length ?? 0) > 10, unreadCount: count.count ?? 0 });
  } catch {
    return json({ error: "NOTICES_LOAD_FAILED" }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return json({ error: "AUTH_REQUIRED" }, 401);
    const body = await request.json().catch(() => null);
    if (!Array.isArray(body?.ids) || !body.ids.length || body.ids.length > 50 || body.ids.some((id: unknown) => typeof id !== "string" || !uuid.test(id)))
      return json({ error: "INVALID_NOTICE_IDS" }, 400);
    const readAt = new Date().toISOString();
    // Scope every write to the verified recipient; repeated acknowledgements are no-ops.
    const result = await auth.admin.from("battle_notifications").update({ read_at: readAt })
      .eq("user_id", auth.user.id).in("id", [...new Set(body.ids)]).is("read_at", null).select("id");
    if (result.error) throw result.error;
    return json({ readIds: (result.data ?? []).map(row => row.id), readAt });
  } catch {
    return json({ error: "NOTICES_READ_FAILED" }, 500);
  }
}
