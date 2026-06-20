import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin-emails";

type TrackAction = "hide" | "restore" | "sort";

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
  return /schema cache|column.*does not exist|PGRST204|review_status|moderation_note|hidden_at|removed_at|source|bar_phase|positive_reaction_count|heart_count|star_count|thumb_count|happy_count|promoted_at/i.test(text);
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
  const modernSelect = "id, title, artist, ai_tool, genre, mood, bpm, duration_seconds, audio_path, cover_path, lyrics, sort_order, is_active, source, bar_phase, review_status, moderation_note, hidden_at, removed_at, promoted_at, positive_reaction_count, heart_count, star_count, thumb_count, happy_count, created_at, updated_at";
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

async function updateTrack(admin: ReturnType<typeof adminClient>, trackId: string, action: TrackAction, sortOrder: number | null, note: string | null) {
  const now = new Date().toISOString();
  const modernPayload =
    action === "hide"
      ? { is_active: false, review_status: "hidden", hidden_at: now, moderation_note: note }
      : action === "restore"
        ? { is_active: true, review_status: "approved", hidden_at: null, removed_at: null, moderation_note: note }
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
    action === "hide"
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
    const action = cleanText(body.action, 40) as TrackAction | null;
    if (!trackId) return jsonError("缺少歌曲 ID。", 400);
    if (action !== "hide" && action !== "restore" && action !== "sort") return jsonError("未知後台動作。", 400);

    const sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
      ? Math.round(body.sortOrder)
      : null;
    if (action === "sort" && sortOrder === null) return jsonError("缺少排序數字。", 400);

    await updateTrack(guard.admin, trackId, action, sortOrder, cleanText(body.note, 1200));
    const tracks = await loadTracks(guard.admin);
    return NextResponse.json({ ok: true, tracks });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
