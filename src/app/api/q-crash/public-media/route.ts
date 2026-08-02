import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isQCrashEditorialCoverPath, qCrashEditorialShowsFullSong } from "@/lib/q-crash-editorial";
import { loadQCrashEditorial, signedQCrashCover } from "@/lib/server-q-crash-editorial";

type BattleRow = {
  id: string;
  battle_type: string | null;
  status: string | null;
  queue_a_id: string | null;
  queue_b_id: string | null;
  song_a_cover: string | null;
  song_b_cover: string | null;
};

type QueueRow = {
  id: string;
  cover_url: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedMedia(admin: ReturnType<typeof adminClient>, value: string | null | undefined) {
  const clean = value?.trim();
  if (!clean) return null;
  if (/^(https?:|data:|blob:|\/)/i.test(clean)) return clean;
  if (isQCrashEditorialCoverPath(clean)) return signedQCrashCover(admin!, clean, 60 * 10);
  const { data } = await admin!.storage.from("battle-audio").createSignedUrl(clean, 60 * 10);
  return data?.signedUrl ?? null;
}

export async function GET(request: NextRequest) {
  const admin = adminClient();
  if (!admin) return jsonError("Q Crash 尚未完成伺服器設定。", 503);

  const rawIds = request.nextUrl.searchParams.get("battleIds") ?? "";
  const battleIds = Array.from(new Set(rawIds.split(",").map((value) => value.trim()).filter(isUuid))).slice(0, 30);
  if (battleIds.length === 0) return NextResponse.json({ schemaReady: true, items: [] });

  const { data: battles, error: battleError } = await admin
    .from("battles")
    .select("id,battle_type,status,queue_a_id,queue_b_id,song_a_cover,song_b_cover")
    .in("id", battleIds)
    .eq("battle_type", "q_crash")
    .eq("status", "q_crash_finished")
    .returns<BattleRow[]>();
  if (battleError) return jsonError(battleError.message, 500);

  const queueIds = Array.from(new Set((battles ?? []).flatMap((battle) => [battle.queue_a_id, battle.queue_b_id].filter((id): id is string => Boolean(id)))));
  const [{ data: queues, error: queueError }, editorial] = await Promise.all([
    queueIds.length > 0
      ? admin.from("battle_queue").select("id,cover_url").in("id", queueIds).returns<QueueRow[]>()
      : Promise.resolve({ data: [] as QueueRow[], error: null }),
    loadQCrashEditorial(admin, queueIds),
  ]);
  if (queueError) return jsonError(queueError.message, 500);

  const queueById = new Map((queues ?? []).map((queue) => [queue.id, queue]));
  const editorialByQueueId = new Map(editorial.rows.map((row) => [row.queue_id, row]));
  const items = await Promise.all((battles ?? []).map(async (battle) => {
    const buildWork = async (queueId: string | null, cover: string | null) => {
      const editorialRow = queueId ? editorialByQueueId.get(queueId) ?? null : null;
      const queue = queueId ? queueById.get(queueId) : null;
      const coverUrl = editorialRow?.cover_path
        ? await signedQCrashCover(admin, editorialRow.cover_path, 60 * 10)
        : await signedMedia(admin, cover || queue?.cover_url);
      return {
        queueId,
        coverUrl,
        fullSongUrl: qCrashEditorialShowsFullSong(battle.status) ? editorialRow?.full_song_url ?? null : null,
      };
    };
    return {
      battleId: battle.id,
      works: {
        A: await buildWork(battle.queue_a_id, battle.song_a_cover),
        B: await buildWork(battle.queue_b_id, battle.song_b_cover),
      },
    };
  }));

  return NextResponse.json({ schemaReady: editorial.schemaReady, items }, { headers: { "Cache-Control": "no-store" } });
}
