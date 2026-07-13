import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  cleanShowtimeSupportLabel,
  cleanShowtimeSupportUrl,
  AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS,
  isAiMusicPersistedShowtimeCertified,
} from "@/lib/ai-music-showtime";
import {
  LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS,
  LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
  cleanListenBarDisplayText,
} from "@/lib/listen-bar-field-limits";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { normalizeYouTubeUrl } from "@/lib/youtube-url";

type ShowtimeTrackRow = {
  id: string;
  title: string | null;
  artist?: string | null;
  ai_tool?: string | null;
  genre?: string | null;
  mood?: string | null;
  description?: string | null;
  youtube_url?: string | null;
  lyrics?: string | null;
  duration_seconds?: number | null;
  audio_path?: string | null;
  cover_path?: string | null;
  created_by: string | null;
  source?: "official" | "community" | null;
  is_active: boolean | null;
  heart_count?: number | null;
  positive_reaction_count?: number | null;
  created_at?: string | null;
  promoted_at?: string | null;
  ai_music_challenge_status?: string | null;
  ai_music_showtime_certified?: boolean | null;
  ai_music_showtime_certified_at?: string | null;
  ai_music_showtime_certification_source?: string | null;
  ai_music_showtime_public_removed_at?: string | null;
  support_url?: string | null;
  support_url_label?: string | null;
  support_url_status?: string | null;
};

type ShowtimeDatabase = {
  public: {
    Tables: {
      listen_bar_tracks: {
        Row: ShowtimeTrackRow;
        Insert: Record<string, never>;
        Update: Partial<ShowtimeTrackRow> & {
          ai_music_showtime_public_removed_by?: string | null;
          ai_music_showtime_public_removal_note?: string | null;
          ai_music_showtime_updated_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AdminClient = SupabaseClient<ShowtimeDatabase>;
type ShowtimeSingleResult = {
  data: ShowtimeTrackRow | null;
  error: { message: string; details?: string; hint?: string; code?: string } | null;
};
type ShowtimeRowsResult = {
  data: ShowtimeTrackRow[] | null;
  error: { message: string; details?: string; hint?: string; code?: string } | null;
};

const SHOWTIME_SELECT = `id,title,artist,ai_tool,genre,mood,description,youtube_url,lyrics,duration_seconds,audio_path,cover_path,created_by,source,is_active,heart_count,positive_reaction_count,created_at,promoted_at,ai_music_challenge_status,${AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS}`;
const allowedGenreValues = new Set(MUSIC_GENRE_OPTIONS.map((genre) => genre.value));

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

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<ShowtimeDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingShowtimeSchema(error: unknown) {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /schema cache|column.*does not exist|PGRST204|ai_music_showtime|support_url/i.test(text);
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

function hasField(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function cleanOwnedShowtimeCoverPath(value: unknown, userId: string) {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path) return "";
  return path.startsWith(`${userId}/community/`) ? path : null;
}

async function readUser(admin: AdminClient, request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return { userId: null, error: jsonError("請先登入後再管理 Showtime 作品。", 401) };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { userId: null, error: jsonError("登入狀態已過期，請重新登入。", 401) };
  return { userId: data.user.id, error: null };
}

async function readOwnedShowtimeTrack(admin: AdminClient, trackId: string, userId: string) {
  const { data, error } = await admin
    .from("listen_bar_tracks")
    .select(SHOWTIME_SELECT)
    .eq("id", trackId)
    .eq("created_by", userId)
    .eq("source", "community")
    .maybeSingle() as ShowtimeSingleResult;
  if (error) return { track: null, error };
  if (!data || !isAiMusicPersistedShowtimeCertified(data)) return { track: null, error: null };
  return { track: data, error: null };
}

export async function GET(request: NextRequest) {
  let admin: AdminClient;
  try {
    admin = adminClient();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }

  const auth = await readUser(admin, request);
  if (auth.error) return auth.error;
  if (!auth.userId) return jsonError("請先登入後再管理 Showtime 作品。", 401);

  const result = await admin
    .from("listen_bar_tracks")
    .select(SHOWTIME_SELECT)
    .eq("created_by", auth.userId)
    .eq("source", "community")
    .eq("ai_music_showtime_certified", true)
    .order("ai_music_showtime_certified_at", { ascending: false }) as ShowtimeRowsResult;

  if (result.error) {
    if (isMissingShowtimeSchema(result.error)) return NextResponse.json({ tracks: [], schemaReady: false }, { headers: { "Cache-Control": "no-store" } });
    return jsonError(result.error.message, 500);
  }

  return NextResponse.json({
    schemaReady: true,
    tracks: (result.data ?? []).filter((row) => row.is_active !== false),
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  let admin: AdminClient;
  try {
    admin = adminClient();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration missing.", 500);
  }

  const auth = await readUser(admin, request);
  if (auth.error) return auth.error;
  if (!auth.userId) return jsonError("請先登入後再管理 Showtime 作品。", 401);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!isUuid(body?.trackId)) return jsonError("Invalid track id.");

  const { track, error: readError } = await readOwnedShowtimeTrack(admin, body.trackId, auth.userId);
  if (readError) return jsonError(readError.message, isMissingShowtimeSchema(readError) ? 409 : 500);
  if (!track) return jsonError("找不到可管理的 Showtime 作品。", 404);

  const now = new Date().toISOString();
  if (body.hidePublic === true) {
    const { data, error } = await admin
      .from("listen_bar_tracks")
      .update({
        ai_music_showtime_public_removed_at: now,
        ai_music_showtime_public_removed_by: auth.userId,
        ai_music_showtime_public_removal_note: "Creator removed own Showtime public display.",
        ai_music_challenge_status: "showcase",
        ai_music_showtime_updated_at: now,
        updated_at: now,
      })
      .eq("id", track.id)
      .eq("created_by", auth.userId)
      .select(SHOWTIME_SELECT)
      .maybeSingle() as ShowtimeSingleResult;
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ track: data });
  }

  const title = hasField(body, "title")
    ? cleanText(body.title, 500)
    : track.title?.trim() || "AIPOGER Showtime";
  if (!title) return jsonError("歌名必填。", 400);

  const artist = hasField(body, "artist")
    ? cleanShortField(body.artist)
    : track.artist?.trim() || "AIPOGER Creator";
  if (!artist) return jsonError("創作者顯示名必填。", 400);

  const genre = hasField(body, "genre")
    ? cleanText(body.genre, 80)
    : track.genre ?? "Original 自我風格";
  if (!genre || !allowedGenreValues.has(genre)) return jsonError("請從固定類型選單選擇 Showtime 類型。", 400);

  const aiTool = hasField(body, "aiTool")
    ? cleanShortField(body.aiTool) ?? "AI Music"
    : track.ai_tool?.trim() || "AI Music";
  const mood = hasField(body, "album") ? cleanShortField(body.album) : track.mood ?? null;
  const description = hasField(body, "description") ? cleanDescriptionField(body.description) : track.description ?? null;
  const lyrics = hasField(body, "lyrics")
    ? (typeof body.lyrics === "string" ? body.lyrics.trim().slice(0, 16000) || null : null)
    : track.lyrics ?? null;
  const youtubeUrl = hasField(body, "youtubeUrl")
    ? normalizeYouTubeUrl(body.youtubeUrl)
    : track.youtube_url ?? null;
  const incomingCoverPath = hasField(body, "coverPath") ? cleanOwnedShowtimeCoverPath(body.coverPath, auth.userId) : null;
  if (hasField(body, "coverPath") && incomingCoverPath === null) {
    return jsonError("Showtime 封面必須使用自己的已上傳圖片。", 400);
  }

  const supportUrl = Object.prototype.hasOwnProperty.call(body, "supportUrl")
    ? cleanShowtimeSupportUrl(body.supportUrl)
    : track.support_url?.trim() || null;
  if (Object.prototype.hasOwnProperty.call(body, "supportUrl") && body.supportUrl && !supportUrl) {
    return jsonError("外部支持連結只接受 HTTPS 網址。", 400);
  }
  const supportLabel = hasField(body, "supportLabel")
    ? cleanShowtimeSupportLabel(body.supportLabel)
    : track.support_url_label?.trim() || null;
  if (hasField(body, "supportLabel") && typeof body.supportLabel === "string" && body.supportLabel.trim() && !supportLabel) {
    return jsonError("請先填寫 HTTPS 外部連結，再設定連結用途。", 400);
  }
  const incomingSupport = typeof body.supportUrl === "string" ? body.supportUrl.trim() : null;
  const supportChanged = supportUrl !== (track.support_url?.trim() || null)
    || supportLabel !== (track.support_url_label?.trim() || null);
  const supportUrlStatus = !supportUrl
    ? "none"
    : !supportChanged && track.support_url_status === "approved"
      ? "approved"
      : "pending";

  const patch = {
    title,
    artist,
    ai_tool: aiTool,
    genre,
    mood,
    description,
    lyrics,
    youtube_url: youtubeUrl,
    cover_path: hasField(body, "coverPath") ? incomingCoverPath : track.cover_path ?? null,
    support_url: incomingSupport === "" ? null : supportUrl,
    support_url_label: supportUrl ? supportLabel : null,
    support_url_status: supportUrlStatus,
    ai_music_challenge_status: "showcase",
    ai_music_showtime_updated_at: now,
    updated_at: now,
  };

  const { data, error } = await admin
    .from("listen_bar_tracks")
    .update(patch)
    .eq("id", track.id)
    .eq("created_by", auth.userId)
    .eq("source", "community")
    .eq("ai_music_showtime_certified", true)
    .select(SHOWTIME_SELECT)
    .maybeSingle() as ShowtimeSingleResult;

  if (error) return jsonError(error.message, error.code === "23514" ? 400 : 500);
  if (!data) return jsonError("找不到可管理的 Showtime 作品。", 404);
  return NextResponse.json({ track: data });
}
