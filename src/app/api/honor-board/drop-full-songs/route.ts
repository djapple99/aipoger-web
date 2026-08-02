import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type BattleRow = {
  id: string;
  winner: string | null;
  queue_a_id: string | null;
  queue_b_id: string | null;
};

type QueueRow = {
  id: string;
  full_audio_path?: string | null;
  full_audio_public?: boolean | null;
  full_audio_original_name?: string | null;
  full_audio_duration_seconds?: number | null;
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

function cleanBattleIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => /^[0-9a-f-]{36}$/i.test(item)),
    ),
  ).slice(0, 80);
}

function isMissingFullAudioSchema(error: { message?: string; details?: string; hint?: string; code?: string } | null) {
  const msg = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /full_audio_|full_song_youtube_url|column.*does not exist|schema cache|PGRST204/i.test(msg);
}

export async function POST(request: Request) {
  const admin = adminClient();
  if (!admin) return jsonError("Missing Supabase server configuration.", 500);

  const body = (await request.json().catch(() => null)) as { battleIds?: unknown } | null;
  const battleIds = cleanBattleIds(body?.battleIds);
  if (battleIds.length === 0) return NextResponse.json({ items: [] });

  const { data: archives, error: archiveError } = await admin
    .from("battle_result_archives")
    .select("battle_id,showtime_public_removed_at")
    .in("battle_id", battleIds)
    .is("showtime_public_removed_at", null);
  if (archiveError) return jsonError(archiveError.message, 500);

  const archivedBattleIds = Array.from(
    new Set((archives ?? []).map((row) => String(row.battle_id || "")).filter(Boolean)),
  );
  if (archivedBattleIds.length === 0) return NextResponse.json({ items: [] });

  const { data: battles, error: battleError } = await admin
    .from("battles")
    .select("id,winner,queue_a_id,queue_b_id")
    .in("id", archivedBattleIds);
  if (battleError) return jsonError(battleError.message, 500);

  const battleRows = (battles ?? []) as BattleRow[];
  const queueIdByBattleId = new Map<string, string>();
  for (const battle of battleRows) {
    const winnerQueueId = battle.winner === "fighter_b" ? battle.queue_b_id : battle.queue_a_id;
    if (battle.id && winnerQueueId) queueIdByBattleId.set(battle.id, winnerQueueId);
  }

  const queueIds = Array.from(new Set([...queueIdByBattleId.values()]));
  if (queueIds.length === 0) return NextResponse.json({ items: [] });

  const queueSelects = [
    "id,full_audio_path,full_audio_public,full_audio_original_name,full_audio_duration_seconds,full_song_youtube_url",
    "id,full_audio_path,full_audio_public,full_audio_original_name,full_audio_duration_seconds",
  ];
  let queues: QueueRow[] | null = null;
  let queueError: { message?: string; details?: string; hint?: string; code?: string } | null = null;
  for (const select of queueSelects) {
    const result = await admin.from("battle_queue").select(select).in("id", queueIds);
    queueError = result.error;
    queues = result.data as QueueRow[] | null;
    if (!queueError) break;
    if (!/full_song_youtube_url|column.*does not exist|schema cache|PGRST204/i.test(`${queueError.message ?? ""} ${queueError.code ?? ""}`)) break;
  }
  if (queueError) {
    if (isMissingFullAudioSchema(queueError)) return NextResponse.json({ items: [] });
    return jsonError(queueError.message ?? "Full Song 資料讀取失敗。", 500);
  }

  const queuesById = new Map<string, QueueRow>();
  for (const queue of (queues ?? []) as QueueRow[]) {
    queuesById.set(queue.id, queue);
  }

  const items = await Promise.all(
    [...queueIdByBattleId.entries()].map(async ([battleId, queueId]) => {
      const queue = queuesById.get(queueId);
      const path = queue?.full_audio_public ? queue.full_audio_path?.trim() : "";
      if (!path) return null;
      const { data, error } = await admin.storage.from("battle-audio").createSignedUrl(path, 60 * 10);
      if (error || !data?.signedUrl) return null;
      return {
        battleId,
        audioUrl: data.signedUrl,
        label: queue?.full_audio_original_name?.trim() || "Full Song",
        durationSeconds: Math.max(0, Number(queue?.full_audio_duration_seconds) || 0),
        youtubeUrl: queue?.full_song_youtube_url?.trim() || null,
      };
    }),
  );

  return NextResponse.json({ items: items.filter(Boolean) });
}
