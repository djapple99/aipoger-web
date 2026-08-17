import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RouteProps = { params: Promise<{ id: string }> };
type PreferenceSide = "fighter_a" | "fighter_b";
type BattleRow = {
  id: string;
  battle_type: string;
  status: string;
  fighter_a_user_id: string;
  fighter_b_user_id: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function tokenFromRequest(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() || null : null;
}

function isMissingPreferenceSchema(message: string | null | undefined) {
  return /q_crash_post_result_preferences|schema cache|does not exist|PGRST/i.test(message ?? "");
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readBattle(admin: SupabaseClient, id: string) {
  const direct = await admin
    .from("battles")
    .select("id,battle_type,status,fighter_a_user_id,fighter_b_user_id")
    .eq("id", id)
    .maybeSingle<BattleRow>();
  if (direct.error && !/schema cache|does not exist|PGRST/i.test(direct.error.message)) return { data: null, error: direct.error };
  if (direct.data?.id) return direct;

  const card = await admin.from("q_crash_cards").select("battle_id").eq("id", id).maybeSingle<{ battle_id: string | null }>();
  if (card.error) return { data: null, error: card.error };
  if (!card.data?.battle_id) return { data: null, error: null };
  return admin
    .from("battles")
    .select("id,battle_type,status,fighter_a_user_id,fighter_b_user_id")
    .eq("id", card.data.battle_id)
    .maybeSingle<BattleRow>();
}

function side(value: unknown): PreferenceSide | null {
  return value === "fighter_a" || value === "fighter_b" ? value : null;
}

function responsePayload(
  preferredA: number,
  preferredB: number,
  viewerChoice: PreferenceSide | null,
  available = true,
) {
  return {
    available,
    counts: { fighter_a: preferredA, fighter_b: preferredB },
    viewerChoice,
  };
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Q Crash 連結不正確。");
  const admin = adminClient();
  if (!admin) return jsonError("Q Crash 尚未完成伺服器設定。", 503);

  const battleResult = await readBattle(admin, id);
  if (battleResult.error) return jsonError(battleResult.error.message, 500);
  const battle = battleResult.data;
  if (!battle?.id || battle.battle_type !== "q_crash") return jsonError("找不到這張 Q Crash。", 404);
  if (battle.status !== "q_crash_finished") {
    return NextResponse.json(responsePayload(0, 0, null));
  }

  const token = tokenFromRequest(request);
  const viewer = token ? (await admin.auth.getUser(token)).data.user : null;
  const preferences = await admin
    .from("q_crash_post_result_preferences")
    .select("user_id,preferred_side")
    .eq("battle_id", battle.id)
    .returns<Array<{ user_id: string; preferred_side: PreferenceSide }>>();
  if (preferences.error) {
    if (isMissingPreferenceSchema(preferences.error.message)) {
      return NextResponse.json(responsePayload(0, 0, null, false));
    }
    return jsonError(preferences.error.message, 500);
  }

  const rows = preferences.data ?? [];
  return NextResponse.json(responsePayload(
    rows.filter((row) => row.preferred_side === "fighter_a").length,
    rows.filter((row) => row.preferred_side === "fighter_b").length,
    side(rows.find((row) => row.user_id === viewer?.id)?.preferred_side),
  ), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, { params }: RouteProps) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Q Crash 連結不正確。");
  const admin = adminClient();
  if (!admin) return jsonError("Q Crash 尚未完成伺服器設定。", 503);
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入再留下結算後喜好。", 401);
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return jsonError("登入狀態已失效。", 401);

  const battleResult = await readBattle(admin, id);
  if (battleResult.error) return jsonError(battleResult.error.message, 500);
  const battle = battleResult.data;
  if (!battle?.id || battle.battle_type !== "q_crash") return jsonError("找不到這張 Q Crash。", 404);
  if (battle.status !== "q_crash_finished") return jsonError("正式結果公布後才能留下喜好。", 409);
  if (user.id === battle.fighter_a_user_id || user.id === battle.fighter_b_user_id) {
    return jsonError("作品持有人不能留下結算後喜好。", 403);
  }

  const body = (await request.json().catch(() => null)) as { preferredSide?: unknown } | null;
  const preferredSide = side(body?.preferredSide);
  if (!preferredSide) return jsonError("請選擇作品 A 或作品 B。");

  const saved = await admin.from("q_crash_post_result_preferences").upsert(
    {
      battle_id: battle.id,
      user_id: user.id,
      preferred_side: preferredSide,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "battle_id,user_id" },
  );
  if (saved.error) {
    if (isMissingPreferenceSchema(saved.error.message)) return jsonError("結算後喜好功能尚未啟用。", 503);
    return jsonError(saved.error.message, 500);
  }

  const refreshed = await admin
    .from("q_crash_post_result_preferences")
    .select("user_id,preferred_side")
    .eq("battle_id", battle.id)
    .returns<Array<{ user_id: string; preferred_side: PreferenceSide }>>();
  if (refreshed.error) return NextResponse.json({ saved: true, preferredSide });
  const rows = refreshed.data ?? [];
  return NextResponse.json({
    saved: true,
    ...responsePayload(
      rows.filter((row) => row.preferred_side === "fighter_a").length,
      rows.filter((row) => row.preferred_side === "fighter_b").length,
      preferredSide,
    ),
  });
}
