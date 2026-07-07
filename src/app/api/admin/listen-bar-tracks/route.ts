import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";

type TrackAction = "hide" | "restore" | "remove" | "sort" | "randomize" | "move" | "normalize" | "metadata" | "bulkMetadata";
type AdminListenBarTrackRow = {
  id: string;
  is_active?: boolean | null;
  review_status?: string | null;
  hidden_at?: string | null;
  removed_at?: string | null;
  audio_path?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function isMissingColumnError(error: unknown): boolean {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /schema cache|column.*does not exist|PGRST204|review_status|moderation_note|hidden_at|removed_at|source|bar_phase|positive_reaction_count|heart_count|star_count|thumb_count|happy_count|promoted_at|youtube_url/i.test(text);
}

const allowedGenreValues = new Set(MUSIC_GENRE_OPTIONS.map((genre) => genre.value));

function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.max(0, Math.round(numberValue));
}

function cleanYouTubeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 300) throw new Error("YouTube MV 連結太長。");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("請貼上有效的 YouTube MV 連結。");
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  if ((url.protocol !== "https:" && url.protocol !== "http:") || (host !== "youtube.com" && host !== "youtu.be")) {
    throw new Error("目前只接受 YouTube MV 連結。");
  }
  return url.toString();
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

async function loadTracks(admin: ReturnType<typeof adminClient>) {
  const modernSelect = "id, title, artist, ai_tool, genre, mood, youtube_url, bpm, duration_seconds, audio_path, cover_path, lyrics, sort_order, is_active, source, bar_phase, review_status, moderation_note, hidden_at, removed_at, promoted_at, positive_reaction_count, heart_count, star_count, thumb_count, happy_count, created_at, updated_at";
  const legacySelect = "id, title, artist, ai_tool, genre, mood, bpm, duration_seconds, audio_path, cover_path, lyrics, sort_order, is_active, created_at, updated_at";

  const modern = await admin
    .from("listen_bar_tracks")
    .select(modernSelect)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (!modern.error) return modern.data ?? [];
  if (!isMissingColumnError(modern.error)) throw modern.error;

  const legacy = await admin
    .from("listen_bar_tracks")
    .select(legacySelect)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (legacy.error) throw legacy.error;
  return legacy.data ?? [];
}

function isPlayableForRandomSort(track: AdminListenBarTrackRow) {
  const status = track.review_status?.toLowerCase();
  return (
    track.is_active !== false &&
    status !== "hidden" &&
    status !== "removed" &&
    !track.hidden_at &&
    !track.removed_at &&
    Boolean(track.audio_path?.trim())
  );
}

function sortOrderValue(track: AdminListenBarTrackRow) {
  return typeof track.sort_order === "number" && Number.isFinite(track.sort_order) ? track.sort_order : 1000;
}

function createdAtValue(track: AdminListenBarTrackRow) {
  const value = new Date(track.created_at ?? 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function publicRotationSort(a: AdminListenBarTrackRow, b: AdminListenBarTrackRow) {
  const sortDiff = sortOrderValue(a) - sortOrderValue(b);
  if (sortDiff !== 0) return sortDiff;
  return createdAtValue(b) - createdAtValue(a);
}

function shuffled<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

async function writeNormalizedPlayableOrder(admin: ReturnType<typeof adminClient>, tracks: AdminListenBarTrackRow[]) {
  for (let index = 0; index < tracks.length; index += 1) {
    const { error } = await admin
      .from("listen_bar_tracks")
      .update({ sort_order: 1000 + index * 10 })
      .eq("id", tracks[index].id);
    if (error) throw error;
  }
}

async function updateTrack(admin: ReturnType<typeof adminClient>, trackId: string, action: TrackAction, sortOrder: number | null, note: string | null) {
  const now = new Date().toISOString();
  const modernPayload =
    action === "hide"
      ? { is_active: false, review_status: "hidden", hidden_at: now, moderation_note: note }
      : action === "restore"
        ? { is_active: true, review_status: "approved", hidden_at: null, removed_at: null, moderation_note: note }
        : action === "remove"
          ? { is_active: false, review_status: "removed", hidden_at: now, removed_at: now, moderation_note: note }
          : { sort_order: sortOrder };

  const modern = await admin
    .from("listen_bar_tracks")
    .update(modernPayload)
    .eq("id", trackId)
    .select("id")
    .maybeSingle();
  if (!modern.error) return;
  if (!isMissingColumnError(modern.error)) throw modern.error;

  const legacyPayload =
    action === "hide" || action === "remove"
      ? { is_active: false }
      : action === "restore"
        ? { is_active: true }
        : { sort_order: sortOrder };
  const legacy = await admin
    .from("listen_bar_tracks")
    .update(legacyPayload)
    .eq("id", trackId)
    .select("id")
    .maybeSingle();
  if (legacy.error) throw legacy.error;
}

async function updateTrackMetadata(admin: ReturnType<typeof adminClient>, trackId: string, body: Record<string, unknown>) {
  const title = cleanText(body.title, 120);
  const artist = cleanText(body.artist, 120);
  const genre = cleanText(body.genre, 80);
  if (!title) throw new Error("歌名必填。");
  if (!artist) throw new Error("創作者必填。");
  if (!genre || !allowedGenreValues.has(genre)) throw new Error("請從固定類型選單選擇歌曲類型。");

  const payload = {
    title,
    artist,
    ai_tool: cleanText(body.aiTool, 80) ?? "AI Music",
    genre,
    mood: cleanText(body.mood, 80),
    youtube_url: cleanYouTubeUrl(body.youtubeUrl),
    bpm: cleanNumber(body.bpm),
    duration_seconds: cleanNumber(body.durationSeconds),
    lyrics: cleanText(body.lyrics, 12000),
    sort_order: cleanNumber(body.sortOrder) ?? 1000,
    updated_at: new Date().toISOString(),
  };

  const modern = await admin
    .from("listen_bar_tracks")
    .update(payload)
    .eq("id", trackId)
    .select("id")
    .maybeSingle();
  if (!modern.error) return;
  if (!isMissingColumnError(modern.error)) throw modern.error;

  const legacy = await admin
    .from("listen_bar_tracks")
    .update({
      title: payload.title,
      artist: payload.artist,
      ai_tool: payload.ai_tool,
      genre: payload.genre,
      mood: payload.mood,
      bpm: payload.bpm,
      duration_seconds: payload.duration_seconds,
      lyrics: payload.lyrics,
      sort_order: payload.sort_order,
    })
    .eq("id", trackId)
    .select("id")
    .maybeSingle();
  if (legacy.error) throw legacy.error;
}

async function updateBulkTrackMetadata(admin: ReturnType<typeof adminClient>, trackIds: string[], body: Record<string, unknown>) {
  const genre = cleanText(body.genre, 80);
  const aiTool = cleanText(body.aiTool, 80);
  const mood = cleanText(body.mood, 80);
  if (genre && !allowedGenreValues.has(genre)) throw new Error("請從固定類型選單選擇歌曲類型。");

  const payload: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };
  if (genre) payload.genre = genre;
  if (aiTool) payload.ai_tool = aiTool;
  if (typeof body.mood === "string") payload.mood = mood;

  if (!payload.genre && !payload.ai_tool && !("mood" in payload)) {
    throw new Error("請至少填一個要批次更新的欄位。");
  }

  const modern = await admin
    .from("listen_bar_tracks")
    .update(payload)
    .in("id", trackIds)
    .select("id");
  if (!modern.error) return;
  if (!isMissingColumnError(modern.error)) throw modern.error;

  const legacyPayload = { ...payload };
  delete legacyPayload.updated_at;
  const legacy = await admin
    .from("listen_bar_tracks")
    .update(legacyPayload)
    .in("id", trackIds)
    .select("id");
  if (legacy.error) throw legacy.error;
}

async function randomizeActiveTracks(admin: ReturnType<typeof adminClient>) {
  const tracks = (await loadTracks(admin)) as AdminListenBarTrackRow[];
  const activeTracks = shuffled(tracks.filter(isPlayableForRandomSort));
  await writeNormalizedPlayableOrder(admin, activeTracks);
  return activeTracks.length;
}

async function moveTrack(admin: ReturnType<typeof adminClient>, trackId: string, direction: "up" | "down") {
  const tracks = ((await loadTracks(admin)) as AdminListenBarTrackRow[])
    .filter(isPlayableForRandomSort)
    .sort(publicRotationSort);
  const currentIndex = tracks.findIndex((track) => track.id === trackId);
  if (currentIndex < 0) throw new Error("這首歌目前不在可播放輪播中，不能調整順序。");
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= tracks.length) {
    await writeNormalizedPlayableOrder(admin, tracks);
    return tracks.length;
  }
  [tracks[currentIndex], tracks[targetIndex]] = [tracks[targetIndex], tracks[currentIndex]];
  await writeNormalizedPlayableOrder(admin, tracks);
  return tracks.length;
}

async function normalizeActiveTrackOrder(admin: ReturnType<typeof adminClient>) {
  const tracks = ((await loadTracks(admin)) as AdminListenBarTrackRow[])
    .filter(isPlayableForRandomSort)
    .sort(publicRotationSort);
  await writeNormalizedPlayableOrder(admin, tracks);
  return tracks.length;
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const tracks = await loadTracks(guard.admin);
    return NextResponse.json({ tracks });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireOwnerAdmin(request);
    if (guard.error) return guard.error;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return jsonError("後台動作格式不正確。", 400);

    const trackId = cleanText(body.trackId, 160);
    const trackIds = Array.isArray(body.trackIds)
      ? body.trackIds.map((id) => cleanText(id, 160)).filter((id): id is string => Boolean(id))
      : [];
    const action = cleanText(body.action, 40) as TrackAction | null;
    if (action !== "hide" && action !== "restore" && action !== "remove" && action !== "sort" && action !== "randomize" && action !== "move" && action !== "normalize" && action !== "metadata" && action !== "bulkMetadata") return jsonError("未知後台動作。", 400);
    const targetTrackIds = trackIds.length > 0 ? trackIds : trackId ? [trackId] : [];
    if (action !== "randomize" && action !== "normalize" && targetTrackIds.length === 0) return jsonError("缺少歌曲 ID。", 400);
    if ((action === "metadata" || action === "move" || action === "sort") && !trackId) return jsonError("這個動作需要單一歌曲 ID。", 400);

    const sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.round(body.sortOrder)
      : null;
    if (action === "sort" && sortOrder === null) return jsonError("缺少排序數字。", 400);

    if (action === "randomize") {
      await randomizeActiveTracks(guard.admin);
    } else if (action === "normalize") {
      await normalizeActiveTrackOrder(guard.admin);
    } else if (action === "move") {
      const direction = body.direction === "up" ? "up" : body.direction === "down" ? "down" : null;
      if (!direction) return jsonError("缺少移動方向。", 400);
      await moveTrack(guard.admin, trackId as string, direction);
    } else if (action === "metadata") {
      await updateTrackMetadata(guard.admin, trackId as string, body);
    } else if (action === "bulkMetadata") {
      await updateBulkTrackMetadata(guard.admin, targetTrackIds, body);
    } else {
      await Promise.all(targetTrackIds.map((id) => updateTrack(guard.admin, id, action, sortOrder, cleanText(body.note, 1200))));
    }
    const tracks = await loadTracks(guard.admin);
    return NextResponse.json({ ok: true, tracks });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
