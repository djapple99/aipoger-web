import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-emails";
import { monthlyChartAdmin } from "@/lib/server-monthly-charts";
import type { AdminTaskId, AdminTasks } from "@/lib/admin-tasks";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
type Admin = ReturnType<typeof monthlyChartAdmin>;
type Report = { id: string; status: string; target_type: string };

async function rows<T>(admin: Admin, table: string, select: string): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await admin.from(table).select(select).order("id").range(offset, offset + 999);
    if (result.error) throw result.error;
    all.push(...(result.data as T[]));
    if (result.data.length < 1000) return all;
  }
}

async function reports(admin: Admin) {
  const stored = await admin.storage.from("listen-bar-data").download("moderation/content-reports.json");
  if (stored.error && !/not found|not exist|404/i.test(stored.error.message)) throw stored.error;
  const raw: unknown = stored.data ? JSON.parse(await stored.data.text()) : [];
  if (!Array.isArray(raw)) throw new Error("Invalid reports");
  const fallback = raw.filter((r): r is Report => r && typeof r.id === "string" && typeof r.status === "string" && typeof r.target_type === "string");
  let database: Report[];
  try { database = await rows<Report>(admin, "content_reports", "id,status,target_type"); }
  catch (error) {
    if (!["42P01", "PGRST205"].includes(String((error as { code?: string }).code))) throw error;
    database = [];
  }
  // The main moderation screen gives DB records precedence over storage fallback.
  const merged = new Map(fallback.map((r) => [r.id, r]));
  database.forEach((r) => merged.set(r.id, r));
  return [...merged.values()].filter((r) => r.status === "open" || r.status === "reviewing");
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return reply({ error: "請先登入。" }, 401);
    const admin = monthlyChartAdmin();
    const user = await admin.auth.getUser(token);
    if (user.error || !user.data.user) return reply({ error: "登入狀態已過期。" }, 401);
    if (!isAdminEmail(user.data.user.email)) return reply({ error: "沒有後台權限。" }, 403);
    const counts: AdminTasks["counts"] = { charts: null, reports: null, comments: null, social: null };
    const collect = async (id: AdminTaskId, run: () => Promise<number>) => {
      try { counts[id] = await run(); } catch { /* Preserve unavailable as null, never a false zero. */ }
    };
    await Promise.all([
      collect("charts", async () => {
        const result = await admin.rpc("admin_monthly_chart", { p_month: null });
        if (result.error || !Array.isArray(result.data?.pendingMonths)) throw new Error("Charts unavailable");
        return result.data.pendingMonths.reduce((n: number, m: { count: number }) => n + m.count, 0);
      }),
      (async () => {
        try { const pending = await reports(admin); counts.comments = pending.filter((r) => r.target_type === "comment").length; counts.reports = pending.length - counts.comments; } catch { /* Both report counts remain unknown. */ }
      })(),
      collect("social", async () => (await rows<{ status: string; social_post_targets: { platform: string; status: string }[] }>(admin, "social_posts", "id,status,social_post_targets(platform,status)")).filter((p) => p.status !== "published" && p.social_post_targets?.some((t) => t.platform !== "tiktok" && t.status !== "published")).length),
    ]);
    return reply({ counts, checkedAt: new Date().toISOString() } satisfies AdminTasks);
  } catch { return reply({ error: "待辦暫時無法讀取。" }, 503); }
}
