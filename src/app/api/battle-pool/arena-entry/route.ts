import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDropChallengeAcceptable, resolveDropBattleScheduledStart } from "@/lib/battle-pool-client";
import { rankLabelForLevel } from "@/lib/battle-pool-rules";
import { resolveDropBattleLinkResolution } from "@/lib/drop-battle-link-resolution";

type Lang = "zh" | "en";
type ProfileMedia = { avatar_url?: string | null; song_cover_url?: string | null; level?: number | null };
type QueueArenaRow = {
  id: string;
  user_id: string | null;
  fighter_name: string | null;
  original_file_name: string | null;
  genre: string | null;
  ai_tool: string | null;
  lyrics?: string | null;
  audio_path: string | null;
  status: string | null;
  match_group_id: string | null;
  expires_at: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  created_at: string | null;
};
type BattleRow = {
  id: string;
  fighter_a_user_id: string;
  fighter_b_user_id: string | null;
  fighter_a_name: string;
  fighter_b_name: string;
  song_a_name: string;
  song_b_name: string;
  audio_a_path: string | null;
  audio_b_path: string | null;
  song_a_cover?: string | null;
  song_b_cover?: string | null;
  fighter_a_avatar?: string | null;
  fighter_b_avatar?: string | null;
  ai_tool_a: string | null;
  ai_tool_b: string | null;
  lyrics_a: string | null;
  lyrics_b: string | null;
  genre: string | null;
  status: string | null;
  battle_type?: string | null;
  battle_ended_at?: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  battle_started_at?: string | null;
  started_at?: string | null;
  created_at?: string | null;
};
type RematchClaimRow = {
  status: string | null;
  claim_window_ends_at: string | null;
  upload_deadline_at: string | null;
  next_battle_id: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = value?.trim();
    if (text) return text;
  }
  return null;
}

async function signedBattleAudio(admin: SupabaseClient, path: string | null | undefined) {
  const text = path?.trim();
  if (!text) return null;
  if (/^(https?:|data:|\/)/i.test(text)) return text;
  const { data } = await admin.storage.from("battle-audio").createSignedUrl(text, 60 * 60);
  return data?.signedUrl ?? text;
}

async function profileMedia(admin: SupabaseClient, userId: string | null | undefined): Promise<ProfileMedia> {
  if (!userId) return {};
  const [{ data: fighter }, { data: profile }] = await Promise.all([
    admin.from("fighter_profiles").select("avatar_url,song_cover_url").eq("id", userId).maybeSingle<ProfileMedia>(),
    admin.from("user_profiles").select("avatar_url,level").eq("id", userId).maybeSingle<ProfileMedia>(),
  ]);
  return {
    avatar_url: firstText(profile?.avatar_url, fighter?.avatar_url),
    song_cover_url: fighter?.song_cover_url ?? null,
    level: typeof profile?.level === "number" ? profile.level : 1,
  };
}

async function readBattle(admin: SupabaseClient, battleId: string, lang: Lang) {
  const { data: battle, error } = await admin.from("battles").select("*").eq("id", battleId).maybeSingle<BattleRow>();
  if (error) return { error: error.message };
  if (!battle?.id) return null;

  const { data: claim, error: claimError } = await admin
    .from("drop_battle_rematch_claims")
    .select("status,claim_window_ends_at,upload_deadline_at,next_battle_id")
    .eq("source_battle_id", battle.id)
    .maybeSingle<RematchClaimRow>();
  if (claimError && !/does not exist|schema cache|PGRST204/i.test(`${claimError.message} ${claimError.details ?? ""}`)) {
    return { error: claimError.message };
  }

  const resolution = resolveDropBattleLinkResolution({ battle, claim: claim ?? null, lang });
  if (resolution.action === "redirect") return resolution;

  const [profileA, profileB, audioA, audioB] = await Promise.all([
    profileMedia(admin, battle.fighter_a_user_id),
    profileMedia(admin, battle.fighter_b_user_id),
    signedBattleAudio(admin, battle.audio_a_path),
    signedBattleAudio(admin, battle.audio_b_path),
  ]);

  return {
    action: "battle" as const,
    battle: {
      ...battle,
      arena_kind: "battle" as const,
      fighter_a_user_id: battle.fighter_a_user_id,
      fighter_b_user_id: battle.fighter_b_user_id,
      fighter_a_avatar: firstText(battle.fighter_a_avatar, profileA.avatar_url),
      fighter_b_avatar: firstText(battle.fighter_b_avatar, profileB.avatar_url),
      fighter_a_rank: rankLabelForLevel(profileA.level ?? 1, battle.fighter_a_name),
      fighter_b_rank: rankLabelForLevel(profileB.level ?? 1, battle.fighter_b_name),
      song_a_cover: battle.song_a_cover ?? profileA.song_cover_url ?? null,
      song_b_cover: battle.song_b_cover ?? profileB.song_cover_url ?? null,
      audio_a_path: audioA,
      audio_b_path: audioB,
      genre: battle.genre || "AI Music",
      status: battle.status || "live",
    },
  };
}

async function readQueue(admin: SupabaseClient, queueId: string, lang: Lang) {
  let { data: queue, error } = await admin
    .from("battle_queue")
    .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,lyrics,audio_path,status,match_group_id,expires_at,scheduled_start_at,cancellation_evaluation_at,created_at")
    .eq("id", queueId)
    .maybeSingle<QueueArenaRow>();

  if (error) {
    const msg = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
    if (/scheduled_start_at|cancellation_evaluation_at|schema cache|column.*does not exist|PGRST204/i.test(msg)) {
      const legacy = await admin
        .from("battle_queue")
        .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,lyrics,audio_path,status,match_group_id,expires_at,created_at")
        .eq("id", queueId)
        .maybeSingle<QueueArenaRow>();
      queue = legacy.data;
      error = legacy.error;
    }
  }
  if (error) return { error: error.message };
  if (!queue?.id) return null;

  if (queue.match_group_id) {
    return { action: "redirect" as const, href: `/battle/${encodeURIComponent(queue.match_group_id)}?lang=${lang}`, reason: "queue_matched" };
  }
  if (
    !isDropChallengeAcceptable({
      status: queue.status,
      scheduled_start_at: queue.scheduled_start_at,
      cancellation_evaluation_at: queue.cancellation_evaluation_at,
      expires_at: queue.expires_at,
    })
  ) {
    return { action: "redirect" as const, href: `/listen-bar?lang=${lang}`, reason: "queue_expired" };
  }

  const [profile, audioA] = await Promise.all([profileMedia(admin, queue.user_id), signedBattleAudio(admin, queue.audio_path)]);
  const queueStatus = queue.status ?? "waiting_challenge";
  return {
    action: "battle" as const,
    battle: {
      id: queue.id,
      arena_kind: "queue" as const,
      match_group_id: queue.match_group_id,
      queue_status: queueStatus,
      fighter_a_user_id: queue.user_id ?? "",
      fighter_b_user_id: null,
      fighter_a_name: queue.fighter_name || "AIPOGER",
      fighter_b_name: lang === "zh" ? "等待挑戰者" : "Waiting Rival",
      song_a_name: queue.original_file_name || "45s Drop",
      song_b_name: lang === "zh" ? "挑戰者 Drop" : "Rival Drop",
      audio_a_path: audioA,
      audio_b_path: null,
      fighter_a_avatar: profile.avatar_url ?? null,
      fighter_b_avatar: null,
      fighter_a_rank: rankLabelForLevel(profile.level ?? 1, queue.fighter_name || "AIPOGER"),
      fighter_b_rank: null,
      song_a_cover: profile.song_cover_url ?? null,
      song_b_cover: null,
      ai_tool_a: queue.ai_tool?.trim() || "AI Music",
      ai_tool_b: lang === "zh" ? "挑戰者進場後顯示" : "Shows after rival enters",
      lyrics_a: typeof queue.lyrics === "string" && queue.lyrics.trim() ? queue.lyrics : null,
      lyrics_b: null,
      genre: queue.genre || "AI Music",
      scheduled_start_at: resolveDropBattleScheduledStart(queue),
      cancellation_evaluation_at: queue.cancellation_evaluation_at ?? null,
      battle_started_at: null,
      started_at: null,
      status: queueStatus === "expired" ? "cancelled_no_challenger" : queueStatus === "cancelled" ? "cancelled" : "pending",
    },
  };
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return jsonError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", 500);
  }

  const id = request.nextUrl.searchParams.get("id");
  const lang: Lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "zh";
  if (!isUuid(id)) return jsonError("Missing id");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const battle = await readBattle(admin, id, lang);
  if (battle && "error" in battle) return jsonError(battle.error ?? "Battle load failed", 500);
  if (battle) return NextResponse.json(battle, { headers: { "Cache-Control": "no-store" } });

  const queue = await readQueue(admin, id, lang);
  if (queue && "error" in queue) return jsonError(queue.error ?? "Queue load failed", 500);
  if (queue) return NextResponse.json(queue, { headers: { "Cache-Control": "no-store" } });

  return jsonError("Battle not found", 404);
}
