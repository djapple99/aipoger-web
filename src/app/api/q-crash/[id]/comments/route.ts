import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type RouteProps = { params: Promise<{ id: string }> };
type CardRow = { id: string; battle_id: string | null; status: string };
type BattleRow = {
  id: string;
  battle_type: string | null;
  status: string | null;
  fighter_a_user_id: string;
  fighter_b_user_id: string;
};
type CommentRow = {
  id: string;
  battle_id: string;
  user_id: string;
  body: string;
  moderation_status: string;
  created_at: string;
  updated_at: string;
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

function isMissingCommentSchema(message: string | null | undefined) {
  return /q_crash_comments|schema cache|does not exist|PGRST/i.test(message ?? "");
}

function isFinalQCrash(status: string | null | undefined) {
  return status === "q_crash_finished" || status === "q_crash_insufficient";
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readViewer(admin: SupabaseClient, request: NextRequest): Promise<User | null> {
  const token = tokenFromRequest(request);
  if (!token) return null;
  return (await admin.auth.getUser(token)).data.user ?? null;
}

async function readContext(admin: SupabaseClient, id: string) {
  const { data: card, error: cardError } = await admin
    .from("q_crash_cards")
    .select("id,battle_id,status")
    .or(`id.eq.${id},battle_id.eq.${id}`)
    .limit(1)
    .maybeSingle<CardRow>();
  if (cardError) throw cardError;
  if (!card?.id) return { card: null, battle: null };
  if (!card.battle_id) return { card, battle: null };

  const { data: battle, error: battleError } = await admin
    .from("battles")
    .select("id,battle_type,status,fighter_a_user_id,fighter_b_user_id")
    .eq("id", card.battle_id)
    .maybeSingle<BattleRow>();
  if (battleError) throw battleError;
  return { card, battle: battle?.battle_type === "q_crash" ? battle : null };
}

async function commentIdentityMap(admin: SupabaseClient, userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map<string, { displayName: string; avatarUrl: string | null }>();
  const [{ data: fighters }, { data: profiles }] = await Promise.all([
    admin.from("fighter_profiles").select("id,display_name,avatar_url").in("id", ids),
    admin.from("user_profiles").select("id,fighter_name,avatar_url").in("id", ids),
  ]);
  const profileMap = new Map((profiles ?? []).map((row) => [row.id, row]));
  return new Map(ids.map((userId) => {
    const fighter = (fighters ?? []).find((row) => row.id === userId);
    const profile = profileMap.get(userId);
    return [userId, {
      displayName: fighter?.display_name || profile?.fighter_name || "AIPOGER 聽眾",
      avatarUrl: profile?.avatar_url || fighter?.avatar_url || null,
    }];
  }));
}

async function publicComments(admin: SupabaseClient, rows: CommentRow[], viewerId: string | null) {
  const identities = await commentIdentityMap(admin, rows.map((row) => row.user_id));
  return rows.map((row) => ({
    id: row.id,
    displayName: identities.get(row.user_id)?.displayName ?? "AIPOGER 聽眾",
    avatarUrl: identities.get(row.user_id)?.avatarUrl ?? null,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isMine: row.user_id === viewerId,
  }));
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Q Crash 連結不正確。");
  const admin = adminClient();
  if (!admin) return jsonError("Q Crash 尚未完成伺服器設定。", 503);

  try {
    const [{ card, battle }, viewer] = await Promise.all([readContext(admin, id), readViewer(admin, request)]);
    if (!card?.id) return jsonError("找不到這張 Q Crash。", 404);
    if (!battle?.id) {
      return NextResponse.json({ available: true, revealed: false, canComment: false, viewerComment: null, comments: [] });
    }

    const revealed = isFinalQCrash(card.status) || isFinalQCrash(battle.status);
    let rows: CommentRow[] = [];
    const commentQuery = admin
      .from("q_crash_comments")
      .select("id,battle_id,user_id,body,moderation_status,created_at,updated_at")
      .eq("battle_id", battle.id);
    const result = revealed
      ? await commentQuery.eq("moderation_status", "visible").order("created_at", { ascending: true }).returns<CommentRow[]>()
      : viewer
        ? await commentQuery.eq("user_id", viewer.id).limit(1).returns<CommentRow[]>()
        : { data: [] as CommentRow[], error: null };
    if (result.error) {
      if (isMissingCommentSchema(result.error.message)) {
        return NextResponse.json({ available: false, revealed, canComment: false, viewerComment: null, comments: [] });
      }
      throw result.error;
    }
    rows = result.data ?? [];
    const mapped = await publicComments(admin, rows, viewer?.id ?? null);
    const viewerComment = viewer ? mapped.find((comment) => comment.isMine) ?? null : null;
    return NextResponse.json({
      available: true,
      revealed,
      canComment: false,
      viewerComment,
      comments: revealed ? mapped : [],
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Q Crash 評論讀取失敗。", 500);
  }
}

export async function POST() {
  return jsonError("Q Crash 評論必須在投票時一起送出，投票後不能新增或修改。", 410);
}

export async function DELETE() {
  return jsonError("Q Crash 評論已隨投票送出，投票後不能刪除。", 410);
}
