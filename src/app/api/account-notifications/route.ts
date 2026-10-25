import { NextResponse } from "next/server";
import { creatorAuth } from "@/lib/server-creator-auth";
import { ACCOUNT_NOTICE_PAGE_SIZE } from "@/lib/account-notifications";

const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const visible = () => `kept_at.not.is.null,expires_at.gt.${new Date().toISOString()}`;

export async function GET(request: Request) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return json({ error: "AUTH_REQUIRED" }, 401);
    const { admin, user } = auth;
    const params = new URL(request.url).searchParams;
    const pageText = params.get("page") ?? "0";
    if (!/^[0-9]{1,5}$/.test(pageText)) return json({ error: "INVALID_PAGE" }, 400);
    const page = Number(pageText);
    const filter = params.get("filter") ?? (params.get("unread") === "1" ? "unread" : "all");
    if (!["all", "unread", "kept"].includes(filter)) return json({ error: "INVALID_FILTER" }, 400);
    const readThrough = new Date().toISOString();
    const visibility = visible();
    const count = await admin.from("battle_notifications").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).or(visibility).is("read_at", null);
    if (count.error) throw count.error;
    if (params.get("count") === "1") return json({ unreadCount: count.count ?? 0 });
    let query = admin.from("battle_notifications")
      .select("id,type,title,body,metadata,battle_id,created_at,read_at,kept_at,expires_at", { count: "exact" })
      .eq("user_id", user.id).or(visibility);
    if (filter === "unread") query = query.is("read_at", null);
    if (filter === "kept") query = query.not("kept_at", "is", null);
    const result = await query.order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(page * ACCOUNT_NOTICE_PAGE_SIZE, (page + 1) * ACCOUNT_NOTICE_PAGE_SIZE - 1);
    if (result.error) throw result.error;
    return json({ notices: result.data ?? [], total: result.count ?? 0, unreadCount: count.count ?? 0, readThrough });
  } catch {
    return json({ error: "NOTICES_LOAD_FAILED" }, 500);
  }
}

async function mutate(request: Request, deleting = false) {
  try {
    const auth = await creatorAuth(request);
    if (!auth) return json({ error: "AUTH_REQUIRED" }, 401);
    const body = await request.json().catch(() => null);
    if (!deleting && body?.action === "read_inbox") {
      const cutoff = typeof body.readThrough === "string" ? Date.parse(body.readThrough) : NaN;
      if (!Number.isFinite(cutoff)) return json({ error: "INVALID_READ_THROUGH" }, 400);
      const now = new Date().toISOString();
      const readThrough = new Date(Math.min(cutoff, Date.parse(now))).toISOString();
      const result = await auth.admin.from("battle_notifications").update({ read_at: now })
        .eq("user_id", auth.user.id).is("read_at", null).lte("created_at", readThrough).or(visible());
      if (result.error) throw result.error;
      const count = await auth.admin.from("battle_notifications").select("id", { count: "exact", head: true })
        .eq("user_id", auth.user.id).is("read_at", null).or(visible());
      if (count.error) throw count.error;
      return json({ readAt: now, readThrough, unreadCount: count.count ?? 0 });
    }
    if (!Array.isArray(body?.ids) || !body.ids.length || body.ids.length > 50 || body.ids.some((id: unknown) => typeof id !== "string" || !uuid.test(id)))
      return json({ error: "INVALID_NOTICE_IDS" }, 400);
    const action = deleting ? "delete" : body.action ?? "read";
    if (!deleting && !["read", "keep", "unkeep"].includes(action)) return json({ error: "INVALID_ACTION" }, 400);
    const now = new Date().toISOString();
    const table = auth.admin.from("battle_notifications");
    const update = action === "read" ? { read_at: now } : { kept_at: action === "keep" ? now : null };
    let query = (deleting ? table.delete() : table.update(update))
      .eq("user_id", auth.user.id).in("id", [...new Set<string>(body.ids)]);
    // Do not revive expired, unkept notices from stale browser pages.
    if (!deleting) query = query.or(visible());
    if (action === "read") query = query.is("read_at", null);
    const result = await query.select("id");
    if (result.error) throw result.error;
    const ids = (result.data ?? []).map(row => row.id);
    return json({ ids, ...(action === "read" ? { readIds: ids, readAt: now } : {}),
      ...(action === "keep" || action === "unkeep" ? { keptAt: action === "keep" ? now : null } : {}) });
  } catch {
    return json({ error: "NOTICES_UPDATE_FAILED" }, 500);
  }
}
export async function PATCH(request: Request) { return mutate(request); }
export async function DELETE(request: Request) { return mutate(request, true); }
