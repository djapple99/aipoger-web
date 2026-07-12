import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  isMissingShowtimeSchema,
  isShowtimeTrackCertificationCandidate,
  loadShowtimeAdminCatalog,
  type ShowtimeAdminArchiveRow,
  type ShowtimeAdminTrackRow,
} from "@/lib/server-showtime-catalog";

type ShowtimeAction = "certify_track" | "hide_track" | "restore_track" | "hide_archive" | "restore_archive";

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

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireOwnerAdmin(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { error: jsonError("請先登入。", 401) };

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: jsonError("登入狀態已過期。", 401) };
  if (!isAdminEmail(data.user.email)) return { error: jsonError("沒有後台權限。", 403) };
  return { admin, userId: data.user.id };
}

async function loadTrack(admin: ReturnType<typeof adminClient>, id: string) {
  const { tracks } = await loadShowtimeAdminCatalog(admin);
  return tracks.find((row) => row.id === id) ?? null;
}

async function loadArchive(admin: ReturnType<typeof adminClient>, id: string) {
  const { archives } = await loadShowtimeAdminCatalog(admin);
  return archives.find((row) => row.battle_id === id) ?? null;
}

async function updateTrack(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  action: ShowtimeAction,
  track: ShowtimeAdminTrackRow,
) {
  const now = new Date().toISOString();
  if (action === "certify_track") {
    if (!isShowtimeTrackCertificationCandidate(track)) {
      throw new Error("這首歌目前不是可認證的傷心酒吧公播作品。" );
    }
    const { error } = await admin
      .from("listen_bar_tracks")
      .update({
        ai_music_showtime_certified: true,
        ai_music_showtime_certified_at: now,
        ai_music_showtime_certification_source: "airplay",
        ai_music_showtime_public_removed_at: null,
        ai_music_showtime_public_removed_by: null,
        ai_music_showtime_public_removal_note: null,
        ai_music_challenge_status: "showcase",
        ai_music_showtime_updated_at: now,
        updated_at: now,
      })
      .eq("id", track.id);
    if (error) throw error;
    return "已認證為 Showtime 傷心酒吧公播作品，並停止接戰。";
  }

  if (!track.ai_music_showtime_certified) throw new Error("只能管理已認證的 Showtime 作品。" );
  const hide = action === "hide_track";
  const { error } = await admin
    .from("listen_bar_tracks")
    .update({
      ai_music_showtime_public_removed_at: hide ? now : null,
      ai_music_showtime_public_removed_by: hide ? userId : null,
      ai_music_showtime_public_removal_note: hide ? "Admin removed public Showtime display." : null,
      ai_music_challenge_status: "showcase",
      ai_music_showtime_updated_at: now,
      updated_at: now,
    })
    .eq("id", track.id)
    .eq("ai_music_showtime_certified", true);
  if (error) throw error;
  return hide ? "已從 Showtime 公開目錄收回作品。" : "已恢復 Showtime 公開展示。";
}

async function updateArchive(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  action: ShowtimeAction,
  archive: ShowtimeAdminArchiveRow,
) {
  if (!archive.battle_id) throw new Error("找不到 Battle 封存紀錄。" );
  const now = new Date().toISOString();
  const hide = action === "hide_archive";
  const { error } = await admin
    .from("battle_result_archives")
    .update({
      showtime_public_removed_at: hide ? now : null,
      showtime_public_removed_by: hide ? userId : null,
      showtime_public_removal_note: hide ? "Admin removed public Showtime display." : null,
      showtime_updated_at: now,
    })
    .eq("battle_id", archive.battle_id);
  if (error) throw error;
  return hide ? "已從 Showtime 公開目錄收回 Battle 作品。" : "已恢復 Battle 作品的 Showtime 公開展示。";
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const catalog = await loadShowtimeAdminCatalog(guard.admin);
    return NextResponse.json(catalog, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (isMissingShowtimeSchema(error)) return NextResponse.json({ schemaReady: false, items: [], tracks: [], archives: [] });
    return jsonError(error instanceof Error ? error.message : "Showtime 後台資料讀取失敗。", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const body = (await request.json().catch(() => null)) as { action?: ShowtimeAction; id?: string } | null;
    if (!body?.action || !isUuid(body.id)) return jsonError("管理操作資料不完整。" );

    if (body.action === "certify_track" || body.action === "hide_track" || body.action === "restore_track") {
      const track = await loadTrack(guard.admin, body.id);
      if (!track) return jsonError("找不到 Showtime 作品。", 404);
      const message = await updateTrack(guard.admin, guard.userId, body.action, track);
      return NextResponse.json({ message });
    }

    const archive = await loadArchive(guard.admin, body.id);
    if (!archive) return jsonError("找不到 Battle Showtime 紀錄。", 404);
    const message = await updateArchive(guard.admin, guard.userId, body.action, archive);
    return NextResponse.json({ message });
  } catch (error) {
    if (isMissingShowtimeSchema(error)) return jsonError("Showtime 資料表尚未準備完成。", 409);
    return jsonError(error instanceof Error ? error.message : "Showtime 管理操作失敗。", 500);
  }
}
