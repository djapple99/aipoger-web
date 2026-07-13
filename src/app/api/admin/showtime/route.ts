import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import { cleanShowtimeSupportLabel, cleanShowtimeSupportUrl } from "@/lib/ai-music-showtime";
import {
  LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS,
  LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
  cleanListenBarDisplayText,
} from "@/lib/listen-bar-field-limits";
import { LISTEN_BAR_COVER_BUCKET } from "@/lib/listen-bar";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { normalizeYouTubeUrl } from "@/lib/youtube-url";
import {
  isMissingShowtimeSchema,
  isShowtimeTrackCertificationCandidate,
  loadShowtimeAdminCatalog,
  type ShowtimeAdminArchiveRow,
  type ShowtimeAdminTrackRow,
} from "@/lib/server-showtime-catalog";

type ShowtimeAction = "certify_track" | "hide_track" | "restore_track" | "hide_archive" | "restore_archive" | "update_track_metadata";

const allowedGenreValues = new Set(MUSIC_GENRE_OPTIONS.map((genre) => genre.value));
const allowedCoverMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxCoverBytes = 10 * 1024 * 1024;

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

function hasField(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().slice(0, maxLength);
  return clean || null;
}

function cleanShortField(value: unknown) {
  return cleanListenBarDisplayText(value, LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS);
}

function cleanDescriptionField(value: unknown) {
  return cleanListenBarDisplayText(value, LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS);
}

function extensionForCover(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "jpg";
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

async function updateTrackMetadata(
  admin: ReturnType<typeof adminClient>,
  track: ShowtimeAdminTrackRow,
  body: Record<string, unknown>,
) {
  if (track.source !== "community") throw new Error("只有創作者投稿的 AI Music 作品可以在這裡編輯展示資料。" );

  const title = hasField(body, "title") ? cleanText(body.title, 500) : track.title?.trim() || "AIPOGER Showtime";
  if (!title) throw new Error("歌名必填。" );
  const artist = hasField(body, "artist") ? cleanShortField(body.artist) : track.artist?.trim() || "AIPOGER Creator";
  if (!artist) throw new Error("創作者顯示名必填。" );
  const genre = hasField(body, "genre") ? cleanText(body.genre, 80) : track.genre?.trim() || "Original 自我風格";
  if (!genre || !allowedGenreValues.has(genre)) throw new Error("請從固定類型選單選擇 Showtime 類型。" );

  const incomingSupport = hasField(body, "supportUrl") && typeof body.supportUrl === "string" ? body.supportUrl.trim() : null;
  const supportUrl = hasField(body, "supportUrl") ? cleanShowtimeSupportUrl(body.supportUrl) : track.support_url?.trim() || null;
  if (hasField(body, "supportUrl") && incomingSupport && !supportUrl) throw new Error("外部支持連結只接受 HTTPS 網址。" );
  const supportLabel = hasField(body, "supportLabel") ? cleanShowtimeSupportLabel(body.supportLabel) : track.support_url_label?.trim() || null;
  if (hasField(body, "supportLabel") && typeof body.supportLabel === "string" && body.supportLabel.trim() && !supportUrl) {
    throw new Error("請先填寫 HTTPS 外部連結，再設定連結用途。" );
  }
  const supportChanged = supportUrl !== (track.support_url?.trim() || null)
    || supportLabel !== (track.support_url_label?.trim() || null);
  const supportUrlStatus = !supportUrl
    ? "none"
    : !supportChanged && track.support_url_status === "approved"
      ? "approved"
      : "pending";
  const now = new Date().toISOString();
  const isCertified = Boolean(track.ai_music_showtime_certified);
  const patch = {
    title,
    artist,
    ai_tool: hasField(body, "aiTool") ? cleanShortField(body.aiTool) ?? "AI Music" : track.ai_tool?.trim() || "AI Music",
    genre,
    mood: hasField(body, "album") ? cleanShortField(body.album) : track.mood ?? null,
    description: hasField(body, "description") ? cleanDescriptionField(body.description) : track.description ?? null,
    lyrics: hasField(body, "lyrics") ? (typeof body.lyrics === "string" ? body.lyrics.trim().slice(0, 16000) || null : null) : track.lyrics ?? null,
    youtube_url: hasField(body, "youtubeUrl") ? normalizeYouTubeUrl(body.youtubeUrl) : track.youtube_url ?? null,
    support_url: incomingSupport === "" ? null : supportUrl,
    support_url_label: supportUrl ? supportLabel : null,
    support_url_status: supportUrlStatus,
    ...(isCertified
      ? {
          ai_music_challenge_status: "showcase",
          ai_music_showtime_updated_at: now,
        }
      : {}),
    updated_at: now,
  };
  const { error } = await admin
    .from("listen_bar_tracks")
    .update(patch)
    .eq("id", track.id);
  if (error) throw error;
  return "Showtime 展示資料已更新；音檔、認可來源與戰績沒有變動。";
}

async function uploadTrackCover(
  admin: ReturnType<typeof adminClient>,
  track: ShowtimeAdminTrackRow,
  file: File,
) {
  if (track.source !== "community") throw new Error("只有創作者投稿的 AI Music 作品可以在這裡更換封面。" );
  if (!allowedCoverMimeTypes.has(file.type)) throw new Error("封面只接受 JPG、PNG、WebP 或 GIF。" );
  if (file.size <= 0 || file.size > maxCoverBytes) throw new Error("封面檔案需小於 10MB。" );

  const objectPath = `showtime/admin/${track.id}/${Date.now()}-${crypto.randomUUID()}.${extensionForCover(file.type)}`;
  const upload = await admin.storage
    .from(LISTEN_BAR_COVER_BUCKET)
    .upload(objectPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (upload.error) throw upload.error;

  const now = new Date().toISOString();
  const patch = {
    cover_path: objectPath,
    ...(track.ai_music_showtime_certified
      ? {
          ai_music_challenge_status: "showcase",
          ai_music_showtime_updated_at: now,
        }
      : {}),
    updated_at: now,
  };
  const { error } = await admin.from("listen_bar_tracks").update(patch).eq("id", track.id);
  if (error) {
    await admin.storage.from(LISTEN_BAR_COVER_BUCKET).remove([objectPath]);
    throw error;
  }
  return "作品封面已更新；音檔、認可來源與戰績沒有變動。";
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
    const body = (await request.json().catch(() => null)) as (Record<string, unknown> & { action?: ShowtimeAction; id?: string }) | null;
    if (!body?.action || !isUuid(body.id)) return jsonError("管理操作資料不完整。" );

    if (body.action === "certify_track" || body.action === "hide_track" || body.action === "restore_track" || body.action === "update_track_metadata") {
      const track = await loadTrack(guard.admin, body.id);
      if (!track) return jsonError("找不到 Showtime 作品。", 404);
      if (body.action === "update_track_metadata") {
        const message = await updateTrackMetadata(guard.admin, track, body);
        return NextResponse.json({ message });
      }
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

export async function POST(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const form = await request.formData();
    const id = form.get("id");
    const file = form.get("file");
    if (!isUuid(id)) return jsonError("管理操作資料不完整。" );
    if (!(file instanceof File)) return jsonError("請選擇要上傳的封面。" );
    const track = await loadTrack(guard.admin, id);
    if (!track) return jsonError("找不到 Showtime 作品。", 404);
    const message = await uploadTrackCover(guard.admin, track, file);
    return NextResponse.json({ message });
  } catch (error) {
    if (isMissingShowtimeSchema(error)) return jsonError("Showtime 資料表尚未準備完成。", 409);
    return jsonError(error instanceof Error ? error.message : "Showtime 封面更新失敗。", 500);
  }
}
