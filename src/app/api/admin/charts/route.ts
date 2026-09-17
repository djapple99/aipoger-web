import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-emails";
import { monthlyChartAdmin } from "@/lib/server-monthly-charts";
import { MonthlyChartError, monthlyChartQuery, publicMonthlyChart, type MonthlyChartRpcResponse } from "@/lib/monthly-charts";
import { suspectedDuplicates, type DuplicateTrack } from "@/lib/chart-management";

const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
async function guard(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return { error: jsonError("請先登入。", 401) };
  const admin = monthlyChartAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { admin, userId: data.user.id };
}

export async function GET(request: NextRequest) {
  try {
    const owner = await guard(request);
    if (owner.error) return owner.error;
    const { p_month } = monthlyChartQuery(request.nextUrl.searchParams);
    const { data, error } = await owner.admin.rpc("admin_monthly_chart", { p_month });
    if (error) return jsonError("排行榜管理暫時無法讀取。", 503);
    const media = (bucket: string, path: string) => /^https?:\/\//.test(path) ? path : owner.admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    const tracks: DuplicateTrack[] = [];
    for (let offset = 0; ; offset += 1000) {
      const result = await owner.admin.from("listen_bar_tracks")
        .select("id,title,artist,created_by,audio_path,cover_path,duration_seconds,created_at,audio_sha256")
        .eq("source", "community").eq("is_active", true).eq("review_status", "approved")
        .is("hidden_at", null).is("removed_at", null).is("ai_music_showtime_public_removed_at", null)
        .order("id").range(offset, offset + 999);
      if (result.error) throw result.error;
      tracks.push(...(result.data ?? []).filter((t) => t.audio_path?.trim()));
      if (!result.data || result.data.length < 1000) break;
    }
    return NextResponse.json({ ...data,
      chart: publicMonthlyChart(data.chart as MonthlyChartRpcResponse, media),
      duplicates: suspectedDuplicates(tracks, media),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MonthlyChartError) return jsonError(error.message, error.status);
    return jsonError("排行榜管理暫時無法讀取。", 503);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const owner = await guard(request);
    if (owner.error) return owner.error;
    const body = await request.json().catch(() => null);
    const ids = body?.orderedIds;
    if (typeof body?.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)
      || !Number.isSafeInteger(body?.supporterCount) || body.supporterCount < 3
      || !Array.isArray(ids) || ids.length < 2 || ids.length > 10000
      || ids.some((id) => typeof id !== "string" || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id))
      || new Set(ids).size !== ids.length) return jsonError("裁定資料不正確。", 400);
    const { error } = await owner.admin.rpc("decide_monthly_chart_tie", {
      p_month: body.month, p_supporter_count: body.supporterCount, p_ordered_ids: ids, p_actor: owner.userId,
    });
    if (error?.code === "40001") return jsonError("支持數或同票歌曲已變動，請重新整理後再決定。", 409);
    if (error?.code === "55000") return jsonError("這份歷史裁定已確定，不能覆寫。", 409);
    if (error?.code === "22023" || error?.code === "P0002") return jsonError("裁定月份或資料不正確。", 400);
    if (error) return jsonError("裁定未儲存，請重試。", 503);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return jsonError("裁定未儲存，請重試。", 503); }
}
