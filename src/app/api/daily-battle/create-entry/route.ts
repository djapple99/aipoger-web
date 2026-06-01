import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ACTIVE_DAILY_BATTLE_STATUSES } from "@/lib/daily-battle-rules";
import { isSha256Hash } from "@/lib/file-hash";

type CreateDailyEntryBody = {
  title?: unknown;
  genre?: unknown;
  aiTool?: unknown;
  audioPath?: unknown;
  audioSha256?: unknown;
  avatarUrl?: unknown;
  coverUrl?: unknown;
  lyrics?: unknown;
  pairingMode?: unknown;
  fighterName?: unknown;
  challengeDailyEntryId?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimOrNull(value: unknown): string | null {
  const text = trim(value);
  return text ? text : null;
}

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");
  return [
    (error as { message?: string }).message,
    (error as { details?: string }).details,
    (error as { hint?: string }).hint,
    (error as { code?: string }).code,
  ].filter(Boolean).join(" ");
}

function isMissingAudioHashColumn(error: unknown): boolean {
  return /audio_sha256|schema cache|column.*does not exist|PGRST204/i.test(errorText(error));
}

function isDuplicateAudioHash(error: unknown): boolean {
  return /audio_sha256|duplicate key value|23505/i.test(errorText(error));
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return jsonError("Missing Supabase server configuration.", 500);

  const token = tokenFromRequest(request);
  if (!token) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as CreateDailyEntryBody | null;
  const title = trim(body?.title);
  const genre = trim(body?.genre) || "自我風格";
  const aiTool = trimOrNull(body?.aiTool);
  const audioPath = trim(body?.audioPath);
  const audioSha256 = isSha256Hash(body?.audioSha256) ? trim(body?.audioSha256).toLowerCase() : null;
  const avatarUrl = trimOrNull(body?.avatarUrl);
  const coverUrl = trimOrNull(body?.coverUrl);
  const lyrics = trimOrNull(body?.lyrics);
  const fighterName = trim(body?.fighterName);
  const pairingMode = trim(body?.pairingMode) === "invite" ? "invite" : "auto";
  const rawChallengeDailyEntryId = body?.challengeDailyEntryId;
  const challengeDailyEntryId = isUuid(rawChallengeDailyEntryId) ? rawChallengeDailyEntryId : null;

  if (!title) return jsonError("歌曲名稱不可空白。");
  if (!audioPath) return jsonError("音檔尚未上傳完成。");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return jsonError("Unauthorized", 401);

  const { data: activeEntries, error: activeEntryError } = await admin
    .from("daily_battle_entries")
    .select("id,title,status")
    .eq("user_id", user.id)
    .in("status", ACTIVE_DAILY_BATTLE_STATUSES)
    .limit(1);
  if (activeEntryError) return jsonError(activeEntryError.message, 500);
  if ((activeEntries ?? []).length > 0) {
    return jsonError("你目前已有一場 24H Full Song 挑戰尚未結束。請等它完成、取消或過期後再發起下一場。", 409);
  }

  if (audioSha256) {
    const duplicateCheck = await admin
      .from("daily_battle_entries")
      .select("id,title,status")
      .eq("audio_sha256", audioSha256)
      .in("status", ["queued", "matched", "live"])
      .limit(1)
      .maybeSingle<{ id: string; title: string | null; status: string | null }>();
    if (duplicateCheck.error && !isMissingAudioHashColumn(duplicateCheck.error)) {
      return jsonError(duplicateCheck.error.message, 500);
    }
    if (duplicateCheck.data?.id) {
      return jsonError(`這個音檔已經在 24H Battle 裡了：${duplicateCheck.data.title || "未命名歌曲"}。請換另一首歌。`, 409);
    }
  }

  if (fighterName) {
    await admin.from("fighter_profiles").upsert(
      {
        id: user.id,
        display_name: fighterName,
        avatar_url: avatarUrl,
        song_cover_url: coverUrl,
      },
      { onConflict: "id" },
    );
    const profileWithFighterName = await admin.from("user_profiles").upsert(
      {
        id: user.id,
        fighter_name: fighterName,
        display_name: fighterName,
      },
      { onConflict: "id" },
    );
    if (profileWithFighterName.error) {
      await admin.from("user_profiles").upsert(
        {
          id: user.id,
          display_name: fighterName,
        },
        { onConflict: "id" },
      );
    }
  }

  if (challengeDailyEntryId) {
    const { data: targetEntry, error: targetError } = await admin
      .from("daily_battle_entries")
      .select("id,user_id,status")
      .eq("id", challengeDailyEntryId)
      .maybeSingle<{ id: string; user_id: string; status: string }>();
    if (targetError) return jsonError(targetError.message, 500);
    if (!targetEntry?.id) return jsonError("這場 24H 挑戰已不存在，請刷新後重試。", 404);
    if (targetEntry.user_id === user.id) return jsonError("不能接受自己發起的 24H 挑戰。", 409);
    if (targetEntry.status !== "queued") return jsonError("這場 24H 挑戰已被接受或已開戰。", 409);
  }

  const insertPayload = {
    user_id: user.id,
    title,
    genre,
    ai_tool: aiTool,
    audio_path: audioPath,
    audio_sha256: audioSha256,
    avatar_url: avatarUrl,
    cover_url: coverUrl,
    lyrics,
    pairing_mode: pairingMode,
    playback_mode: "full_track",
    status: "queued",
  };

  let dailyInsertResult = await admin
    .from("daily_battle_entries")
    .insert(insertPayload)
    .select("id")
    .single<{ id: string }>();
  if (dailyInsertResult.error && isMissingAudioHashColumn(dailyInsertResult.error)) {
    const fallbackPayload = { ...insertPayload };
    delete (fallbackPayload as Partial<typeof insertPayload>).audio_sha256;
    dailyInsertResult = await admin
      .from("daily_battle_entries")
      .insert(fallbackPayload)
      .select("id")
      .single<{ id: string }>();
  }
  const { data: dailyEntry, error: dailyError } = dailyInsertResult;
  if (dailyError && isDuplicateAudioHash(dailyError)) return jsonError("這個音檔已經上傳過了，請換另一首歌。", 409);
  if (dailyError) return jsonError(dailyError.message, 500);
  if (!dailyEntry?.id) return jsonError("建立 24H 作品失敗，請重試。", 500);

  if (!challengeDailyEntryId) {
    return NextResponse.json({ ok: true, entryId: dailyEntry.id, battleId: null });
  }

  const startsAtIso = new Date().toISOString();
  const endsAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: createdDailyBattle, error: createBattleError } = await admin
    .from("daily_battles")
    .insert({
      entry_a_id: challengeDailyEntryId,
      entry_b_id: dailyEntry.id,
      status: "live",
      starts_at: startsAtIso,
      ends_at: endsAtIso,
    })
    .select("id")
    .single<{ id: string }>();
  if (createBattleError) return jsonError(createBattleError.message, 500);
  if (!createdDailyBattle?.id) return jsonError("建立 24H 對戰房間失敗。", 500);

  const now = new Date().toISOString();
  const { error: updateTargetError } = await admin
    .from("daily_battle_entries")
    .update({ status: "live", matched_battle_id: createdDailyBattle.id, updated_at: now })
    .eq("id", challengeDailyEntryId)
    .eq("status", "queued");
  if (updateTargetError) return jsonError(updateTargetError.message, 500);

  const { error: updateNewEntryError } = await admin
    .from("daily_battle_entries")
    .update({ status: "live", matched_battle_id: createdDailyBattle.id, updated_at: now })
    .eq("id", dailyEntry.id);
  if (updateNewEntryError) return jsonError(updateNewEntryError.message, 500);

  return NextResponse.json({ ok: true, entryId: dailyEntry.id, battleId: createdDailyBattle.id });
}
