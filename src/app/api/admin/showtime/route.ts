import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";

async function retired(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "").trim();
  if (!request.headers.get("authorization")?.startsWith("Bearer ") || !token) {
    return NextResponse.json({ error: "請先登入。" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Server configuration missing." }, { status: 500 });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "登入狀態已過期。" }, { status: 401 });
  if (!isAdminEmail(data.user.email)) return NextResponse.json({ error: "沒有後台權限。" }, { status: 403 });
  return NextResponse.json({
    error: "Showtime 認證已退役，請至作品管理或 Choice 管理。",
    managementUrl: "/admin/listen-bar",
    choiceUrl: "/admin/choice",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}

export const GET = retired;
export const PATCH = retired;
export const POST = retired;
