import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EVENT_TYPES = new Set([
  "page_view",
  "session_start",
  "song_play",
  "song_finish",
  "song_skip",
  "song_pause",
  "song_resume",
  "like",
  "reaction",
  "comment",
  "register",
  "login",
  "upload_song",
  "delete_song",
  "battle_enter",
  "battle_vote",
  "open_heartbreak_bar",
  "open_honor_board",
  "open_creator_profile",
  "share_song",
]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanUuid(value: unknown): string | null {
  const text = cleanText(value, 80);
  return text && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function cleanMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const json = JSON.stringify(value);
  if (json.length > 8000) return { truncated: true };
  return value as Record<string, unknown>;
}

function sourceFromReferrer(referrer: string | null) {
  const text = referrer?.trim();
  if (!text) return "direct";
  try {
    const host = new URL(text).hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("youtube.") || host.includes("youtu.be")) return "youtube";
    if (host.includes("facebook.") || host.includes("fb.")) return "facebook";
    if (host.includes("instagram.")) return "instagram";
    if (host.includes("tiktok.")) return "tiktok";
    if (host.includes("discord.")) return "discord";
    if (host.includes("reddit.")) return "reddit";
    if (host.includes("twitter.") || host === "x.com") return "x";
    if (host.includes("aipoger.com")) return "internal";
    return "other";
  } catch {
    return "other";
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid analytics payload.", 400);
  }

  const eventType = cleanText(body.eventType, 80);
  const sessionId = cleanText(body.sessionId, 120);
  if (!eventType || !EVENT_TYPES.has(eventType)) return jsonError("Unsupported analytics event.", 400);
  if (!sessionId) return jsonError("Missing analytics session.", 400);

  try {
    const admin = adminClient();
    const token = tokenFromRequest(request);
    const userResult = token ? await admin.auth.getUser(token) : null;
    const userId = userResult?.data.user?.id ?? null;
    const referrer = cleanText(body.referrer, 1000);
    const source = cleanText(body.source, 80) ?? sourceFromReferrer(referrer);

    const { error } = await admin.from("analytics_events").insert({
      event_type: eventType,
      user_id: userId,
      session_id: sessionId,
      song_id: cleanUuid(body.songId),
      battle_id: cleanUuid(body.battleId),
      creator_id: cleanUuid(body.creatorId),
      page_path: cleanText(body.pagePath, 500),
      referrer,
      source,
      user_agent: cleanText(request.headers.get("user-agent"), 1000),
      metadata: cleanMetadata(body.metadata),
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
