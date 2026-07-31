import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() || null : null;
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return jsonError("Q Crash 尚未完成伺服器設定。", 503);
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入。", 401);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return jsonError("登入狀態已失效。", 401);

  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 40) ?? "";
  if (query.length < 2) return NextResponse.json({ creators: [] });
  const pattern = `%${query.replace(/[%_]/g, "")}%`;
  const { data, error } = await admin
    .from("fighter_profiles")
    .select("id,display_name,avatar_url")
    .neq("id", user.id)
    .not("display_name", "is", null)
    .ilike("display_name", pattern)
    .order("display_name", { ascending: true })
    .limit(8);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({
    creators: (data ?? [])
      .filter((row) => typeof row.display_name === "string" && row.display_name.trim())
      .map((row) => ({
        id: row.id,
        name: row.display_name.trim(),
        avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
      })),
  });
}
