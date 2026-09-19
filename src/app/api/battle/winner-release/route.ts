import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DROP_BATTLE_OFFICIAL_AUDIENCE_MIN } from "@/lib/drop-battle-rematch";
import { normalizeYouTubeUrl } from "@/lib/youtube-url";

type WinnerSide = "fighter_a" | "fighter_b";

type BattleRow = {
  id: string;
  battle_type?: string | null;
  winner?: string | null;
  queue_a_id?: string | null;
  queue_b_id?: string | null;
  fighter_a_user_id?: string | null;
  fighter_b_user_id?: string | null;
};

type ArchiveRow = {
  winner?: string | null;
  result_payload?: Record<string, unknown> | null;
};

type QueueRow = {
  id: string;
  user_id?: string | null;
  full_audio_public?: boolean | null;
  full_audio_path?: string | null;
  full_song_youtube_url?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function tokenFromRequest(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() || null : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
}

function side(value: unknown): WinnerSide | null {
  return value === "fighter_a" || value === "fighter_b" ? value : null;
}

function audienceCount(archive: ArchiveRow) {
  const payload = archive.result_payload ?? {};
  const parsed = Number(payload.audienceCount ?? payload.audienceVoterCount ?? payload.distinctAudienceCount);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function missingReleaseSchema(error: unknown) {
  const record = error as { message?: string; details?: string; hint?: string; code?: string } | null;
  return /full_song_youtube_url|full_audio_|column.*does not exist|schema cache|PGRST204/i.test(
    [record?.message, record?.details, record?.hint, record?.code].filter(Boolean).join(" "),
  );
}

function errorMessage(error: unknown) {
  return String((error as { message?: string } | null)?.message ?? error ?? "Unknown error");
}

async function loadReleaseState(admin: SupabaseClient, battleId: string, userId: string) {
  const [{ data: battle, error: battleError }, { data: archive, error: archiveError }] = await Promise.all([
    admin
      .from("battles")
      .select("id,battle_type,winner,queue_a_id,queue_b_id,fighter_a_user_id,fighter_b_user_id")
      .eq("id", battleId)
      .maybeSingle<BattleRow>(),
    admin
      .from("battle_result_archives")
      .select("winner,result_payload")
      .eq("battle_id", battleId)
      .maybeSingle<ArchiveRow>(),
  ]);

  if (battleError) throw battleError;
  if (archiveError && archiveError.code !== "PGRST116") throw archiveError;
  if (!battle) return { eligible: false, reason: "not_found" as const };
  if (battle.battle_type === "q_crash") return { eligible: false, reason: "q_crash_editorial" as const };

  const archiveRow = archive ?? null;
  const archiveAudienceCount = archiveRow ? audienceCount(archiveRow) : 0;
  const official = archiveAudienceCount >= DROP_BATTLE_OFFICIAL_AUDIENCE_MIN;
  const winner = side(archiveRow?.winner) ?? side(battle.winner);
  if (!official || !winner) return { eligible: false, reason: "not_official" as const };

  const winnerQueueId = winner === "fighter_b" ? battle.queue_b_id : battle.queue_a_id;
  const winnerUserId = winner === "fighter_b" ? battle.fighter_b_user_id : battle.fighter_a_user_id;
  if (!winnerQueueId || !winnerUserId) return { eligible: false, reason: "winner_missing" as const };

  const { data: queue, error: queueError } = await admin
    .from("battle_queue")
    .select("id,user_id,full_audio_public,full_audio_path,full_song_youtube_url")
    .eq("id", winnerQueueId)
    .maybeSingle<QueueRow>();
  if (queueError) {
    if (missingReleaseSchema(queueError)) return { eligible: false, schemaReady: false, reason: "schema_missing" as const };
    throw queueError;
  }
  if (!queue || queue.user_id !== winnerUserId) return { eligible: false, reason: "winner_missing" as const };

  return {
    eligible: winnerUserId === userId && Boolean(queue.full_audio_public && queue.full_audio_path),
    schemaReady: true,
    reason: winnerUserId === userId
      ? queue.full_audio_public && queue.full_audio_path ? "ready" : "opt_out"
      : "not_winner",
    youtubeUrl: queue.full_song_youtube_url?.trim() || null,
    winnerQueueId,
    audienceCount: archiveAudienceCount,
  } as const;
}

async function authenticatedUser(request: NextRequest, admin: SupabaseClient) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function GET(request: NextRequest) {
  const admin = adminClient();
  if (!admin) return jsonError("勝出作品發布服務尚未完成設定。", 503);
  const battleId = request.nextUrl.searchParams.get("battleId")?.trim() ?? "";
  if (!isUuid(battleId)) return jsonError("找不到這場 Battle。", 400);
  const user = await authenticatedUser(request, admin);
  if (!user) return NextResponse.json({ eligible: false, requiresSignIn: true });

  try {
    const state = await loadReleaseState(admin, battleId, user.id);
    return NextResponse.json({ battleId, ...state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}

export async function POST(request: NextRequest) {
  const admin = adminClient();
  if (!admin) return jsonError("勝出作品發布服務尚未完成設定。", 503);
  const user = await authenticatedUser(request, admin);
  if (!user) return jsonError("請先登入，才能提交勝出作品連結。", 401);

  const body = (await request.json().catch(() => null)) as { battleId?: unknown; youtubeUrl?: unknown } | null;
  const battleId = typeof body?.battleId === "string" ? body.battleId.trim() : "";
  if (!isUuid(battleId)) return jsonError("找不到這場 Battle。", 400);

  let youtubeUrl: string | null;
  try {
    youtubeUrl = normalizeYouTubeUrl(body?.youtubeUrl);
    if (youtubeUrl && !youtubeUrl.startsWith("https://")) {
      return jsonError("YouTube MV 連結必須使用 HTTPS。", 400);
    }
  } catch (error) {
    return jsonError(errorMessage(error), 400);
  }

  try {
    const state = await loadReleaseState(admin, battleId, user.id);
    if (!state.eligible || !state.winnerQueueId) {
      if (state.reason === "opt_out") return jsonError("你在上傳時沒有同意勝出後公開完整版，因此目前不能提交發布連結。", 403);
      if (state.reason === "not_winner") return jsonError("只有勝出作品的創作者可以提交發布連結。", 403);
      if (state.reason === "not_official") return jsonError("本場尚未達到正式勝出門檻。", 409);
      if (state.reason === "q_crash_editorial") return jsonError("Q Crash 連結請從 Q Crash 專用流程管理。", 409);
      if (state.reason === "schema_missing") return jsonError("勝出作品發布欄位尚未套用，請先完成資料庫遷移。", 409);
      return jsonError("目前無法提交這場作品的發布連結。", 409);
    }

    const { error } = await admin
      .from("battle_queue")
      .update({ full_song_youtube_url: youtubeUrl })
      .eq("id", state.winnerQueueId)
      .eq("user_id", user.id);
    if (error) {
      if (missingReleaseSchema(error)) return jsonError("勝出作品發布欄位尚未套用，請先完成資料庫遷移。", 409);
      return jsonError(error.message, 500);
    }

    return NextResponse.json({ battleId, youtubeUrl, saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(errorMessage(error), 500);
  }
}
