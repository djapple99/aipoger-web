import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { EARWORM_MAX_EXPLANATION_LENGTH, EARWORM_MIN_LISTEN_SECONDS, EARWORM_REWARD_POINTS, earwormTaskKey, isEarwormSelection } from "@/lib/earworm";
import { canonicalMusicGenre, isCurrentMusicGenre, MUSIC_GENRE_VALUES } from "@/lib/music-genres";

type TrackRow = {
  id: string;
  title: string | null;
  artist: string | null;
  ai_tool: string | null;
  genre: string | null;
  bpm: number | null;
  duration_seconds: number | null;
  audio_path: string | null;
  cover_path: string | null;
  lyrics: string | null;
  is_active: boolean | null;
  source?: "official" | "community" | null;
  is_featured_official?: boolean | null;
  review_status?: string | null;
  hidden_at?: string | null;
  removed_at?: string | null;
  ai_music_showtime_certified?: boolean | null;
};

type EarwormDatabase = SupabaseClient;

const BASE_SELECT = [
  "id",
  "title",
  "artist",
  "ai_tool",
  "genre",
  "bpm",
  "duration_seconds",
  "audio_path",
  "cover_path",
  "lyrics",
  "is_active",
  "source",
  "is_featured_official",
  "review_status",
  "hidden_at",
  "removed_at",
].join(",");

const MODERN_SELECT = `${BASE_SELECT},ai_music_showtime_certified`;

function adminClient(): EarwormDatabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function storageUrl(admin: EarwormDatabase, bucket: string, path: string | null | undefined) {
  const value = path?.trim();
  if (!value) return AIPOGER_BRAND_LOGO;
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return admin.storage.from(bucket).getPublicUrl(value).data.publicUrl || AIPOGER_BRAND_LOGO;
}

function isPlayable(row: TrackRow) {
  const status = row.review_status?.toLowerCase();
  return (
    row.is_active !== false &&
    row.source !== "official" &&
    !row.is_featured_official &&
    status !== "hidden" &&
    status !== "removed" &&
    !row.hidden_at &&
    !row.removed_at &&
    !row.ai_music_showtime_certified &&
    Boolean(row.audio_path?.trim()) &&
    isCurrentMusicGenre(row.genre)
  );
}

function normalizedCreator(row: TrackRow) {
  return (row.artist ?? "").trim().toLowerCase();
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

async function readPlayableTracks(admin: EarwormDatabase) {
  const modern = await admin
    .from("listen_bar_tracks")
    .select(MODERN_SELECT)
    .eq("source", "community")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);

  let rows = (modern.data as TrackRow[] | null) ?? [];
  if (modern.error) {
    const legacy = await admin
      .from("listen_bar_tracks")
      .select(BASE_SELECT)
      .eq("source", "community")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500);
    if (legacy.error) throw legacy.error;
    rows = (legacy.data as TrackRow[] | null) ?? [];
  }
  return rows.filter(isPlayable);
}

function serializeTrack(admin: EarwormDatabase, row: TrackRow) {
  return {
    id: row.id,
    title: row.title?.trim() || "未命名作品",
    artist: row.artist?.trim() || "AIPOGER 創作者",
    aiTool: row.ai_tool?.trim() || "AI Music",
    genre: canonicalMusicGenre(row.genre),
    bpm: typeof row.bpm === "number" && row.bpm > 0 ? row.bpm : null,
    duration: Math.max(1, Math.round(row.duration_seconds ?? 45)),
    audioUrl: storageUrl(admin, "listen-bar-audio", row.audio_path),
    coverUrl: storageUrl(admin, "listen-bar-covers", row.cover_path),
    lyrics: row.lyrics?.trim() || null,
  };
}

function choosePair(rows: TrackRow[], requestedGenre: string | null, nonce = "") {
  const byGenre = new Map<string, TrackRow[]>();
  for (const row of rows) {
    const genre = canonicalMusicGenre(row.genre);
    const group = byGenre.get(genre) ?? [];
    group.push(row);
    byGenre.set(genre, group);
  }

  const preferred = requestedGenre ? canonicalMusicGenre(requestedGenre) : null;
  const genre = preferred && (byGenre.get(preferred)?.length ?? 0) >= 2
    ? preferred
    : MUSIC_GENRE_VALUES.find((value) => (byGenre.get(value)?.length ?? 0) >= 2) ?? null;
  if (!genre) return null;

  const group = [...(byGenre.get(genre) ?? [])].sort((left, right) => left.id.localeCompare(right.id));
  const slot = hashSeed(`${genre}:${nonce || new Date().toISOString().slice(0, 13)}`) % group.length;
  const trackA = group[slot];
  let nextIndex = (slot + 1) % group.length;
  if (normalizedCreator(group[nextIndex]) === normalizedCreator(trackA) && group.length > 2) {
    nextIndex = (slot + 2) % group.length;
  }
  return { genre, trackA, trackB: group[nextIndex], availableGenres: Array.from(byGenre.keys()).filter((value) => (byGenre.get(value)?.length ?? 0) >= 2) };
}

export async function GET(request: Request) {
  try {
    const admin = adminClient();
    const searchParams = new URL(request.url).searchParams;
    const requestedGenre = searchParams.get("genre");
    const pair = choosePair(await readPlayableTracks(admin), requestedGenre, searchParams.get("nonce") ?? "");
    if (!pair) {
      return NextResponse.json({ error: "目前還沒有足夠的同類型作品可以開始耳朵蟲。" }, { status: 404 });
    }
    return NextResponse.json({
      task: {
        id: earwormTaskKey(pair.genre, pair.trackA.id, pair.trackB.id),
        genre: pair.genre,
        trackA: serializeTrack(admin, pair.trackA),
        trackB: serializeTrack(admin, pair.trackB),
        minListenSeconds: EARWORM_MIN_LISTEN_SECONDS,
        rewardPoints: EARWORM_REWARD_POINTS,
      },
      availableGenres: pair.availableGenres,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "請先登入再送出耳朵蟲判斷。" }, { status: 401 });

    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "登入狀態已過期，請重新登入。" }, { status: 401 });

    const body = await request.json().catch(() => null) as {
      taskKey?: unknown;
      genre?: unknown;
      trackAId?: unknown;
      trackBId?: unknown;
      selection?: unknown;
      listenedASeconds?: unknown;
      listenedBSeconds?: unknown;
      explanation?: unknown;
    } | null;
    const genre = typeof body?.genre === "string" ? canonicalMusicGenre(body.genre) : "";
    const trackAId = typeof body?.trackAId === "string" ? body.trackAId.trim() : "";
    const trackBId = typeof body?.trackBId === "string" ? body.trackBId.trim() : "";
    const taskKey = typeof body?.taskKey === "string" ? body.taskKey.trim() : "";
    const listenedASeconds = Math.max(0, Number(body?.listenedASeconds) || 0);
    const listenedBSeconds = Math.max(0, Number(body?.listenedBSeconds) || 0);
    const explanation = typeof body?.explanation === "string" ? body.explanation.trim().slice(0, EARWORM_MAX_EXPLANATION_LENGTH) : null;

    if (!taskKey || !trackAId || !trackBId || trackAId === trackBId || !isCurrentMusicGenre(genre) || !isEarwormSelection(body?.selection)) {
      return NextResponse.json({ error: "耳朵蟲資料不完整，請重新載入這組作品。" }, { status: 400 });
    }
    if (listenedASeconds < EARWORM_MIN_LISTEN_SECONDS || listenedBSeconds < EARWORM_MIN_LISTEN_SECONDS) {
      return NextResponse.json({ error: `請先完整聽過 A、B 兩首至少 ${EARWORM_MIN_LISTEN_SECONDS} 秒。` }, { status: 400 });
    }

    const modernTracks = await admin
      .from("listen_bar_tracks")
      .select(MODERN_SELECT)
      .in("id", [trackAId, trackBId]);
    let rows = modernTracks.data as TrackRow[] | null;
    if (modernTracks.error) {
      const legacyTracks = await admin
        .from("listen_bar_tracks")
        .select(BASE_SELECT)
        .in("id", [trackAId, trackBId]);
      if (legacyTracks.error) {
        return NextResponse.json({ error: "這組作品已經不可用，請換下一組。" }, { status: 409 });
      }
      rows = legacyTracks.data as TrackRow[] | null;
    }
    if (!rows || rows.length !== 2) {
      return NextResponse.json({ error: "這組作品已經不可用，請換下一組。" }, { status: 409 });
    }
    const trackRows = rows as TrackRow[];
    if (!trackRows.every(isPlayable) || trackRows.some((row) => canonicalMusicGenre(row.genre) !== genre)) {
      return NextResponse.json({ error: "耳朵蟲只能比較同一類型的公開作品。" }, { status: 400 });
    }
    if (taskKey !== earwormTaskKey(genre, trackAId, trackBId)) {
      return NextResponse.json({ error: "這組耳朵蟲已失效，請載入下一組。" }, { status: 409 });
    }

    const { data: vote, error: voteError } = await admin
      .from("earworm_votes")
      .insert({
        user_id: userData.user.id,
        task_key: taskKey,
        genre,
        track_a_id: trackAId,
        track_b_id: trackBId,
        selection: body.selection,
        listened_a_seconds: listenedASeconds,
        listened_b_seconds: listenedBSeconds,
        explanation,
      })
      .select("id")
      .single();
    if (voteError) {
      if (voteError.code === "23505") return NextResponse.json({ error: "這組你已經判斷過了，換下一組吧。", alreadySubmitted: true }, { status: 409 });
      if (/earworm_votes|schema cache|does not exist/i.test(voteError.message)) {
        return NextResponse.json({ error: "耳朵蟲資料表尚未啟用，請先套用最新資料庫 migration。" }, { status: 503 });
      }
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    const reward = await admin.rpc("award_battle_points", {
      p_user_id: userData.user.id,
      p_points: EARWORM_REWARD_POINTS,
      p_event_type: "earworm_vote_reward",
      p_queue_id: null,
      p_battle_id: null,
      p_reason: "耳朵蟲同類型抓耳判斷獎勵",
    });
    if (reward.error) {
      await admin.from("earworm_votes").delete().eq("id", vote.id);
      return NextResponse.json({ error: "點數服務尚未啟用，這次判斷沒有被送出。" }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      rewardPoints: EARWORM_REWARD_POINTS,
      balance: typeof reward.data === "number" ? reward.data : null,
    });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
