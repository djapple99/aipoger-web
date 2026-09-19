import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import {
  EARWORM_MIN_LISTEN_SECONDS,
  EARWORM_REACTION_POINTS,
  EARWORM_TRACK_COUNT,
  calculateEarwormResult,
  earwormQuizKey,
  isEarwormReaction,
  type EarwormAnswer,
} from "@/lib/earworm";
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

  let rows = (modern.data as unknown as TrackRow[] | null) ?? [];
  if (modern.error) {
    const legacy = await admin
      .from("listen_bar_tracks")
      .select(BASE_SELECT)
      .eq("source", "community")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500);
    if (legacy.error) throw legacy.error;
    rows = (legacy.data as unknown as TrackRow[] | null) ?? [];
  }
  return rows.filter(isPlayable);
}

async function readTracksByIds(admin: EarwormDatabase, ids: string[]) {
  const modern = await admin.from("listen_bar_tracks").select(MODERN_SELECT).in("id", ids);
  if (!modern.error) return (modern.data as unknown as TrackRow[] | null) ?? [];
  const legacy = await admin.from("listen_bar_tracks").select(BASE_SELECT).in("id", ids);
  if (legacy.error) throw legacy.error;
  return (legacy.data as unknown as TrackRow[] | null) ?? [];
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

function chooseQuizTracks(rows: TrackRow[], nonce: string) {
  if (rows.length < EARWORM_TRACK_COUNT) return null;

  const byGenre = new Map<string, TrackRow[]>();
  for (const row of rows) {
    const genre = canonicalMusicGenre(row.genre);
    const group = byGenre.get(genre) ?? [];
    group.push(row);
    byGenre.set(genre, group);
  }

  const genreOrder = MUSIC_GENRE_VALUES
    .filter((genre) => (byGenre.get(genre)?.length ?? 0) > 0)
    .sort((left, right) => hashSeed(`${nonce}:genre:${left}`) - hashSeed(`${nonce}:genre:${right}`));

  const selected: TrackRow[] = [];
  for (const genre of genreOrder.slice(0, EARWORM_TRACK_COUNT)) {
    const group = [...(byGenre.get(genre) ?? [])]
      .sort((left, right) => hashSeed(`${nonce}:${genre}:${left.id}`) - hashSeed(`${nonce}:${genre}:${right.id}`));
    if (group[0]) selected.push(group[0]);
  }

  if (selected.length < EARWORM_TRACK_COUNT) {
    const selectedIds = new Set(selected.map((row) => row.id));
    const selectedCreators = new Set(selected.map((row) => (row.artist ?? "").trim().toLowerCase()).filter(Boolean));
    const remaining = rows
      .filter((row) => !selectedIds.has(row.id))
      .sort((left, right) => {
        const leftCreator = (left.artist ?? "").trim().toLowerCase();
        const rightCreator = (right.artist ?? "").trim().toLowerCase();
        const leftRepeat = leftCreator && selectedCreators.has(leftCreator) ? 1 : 0;
        const rightRepeat = rightCreator && selectedCreators.has(rightCreator) ? 1 : 0;
        return leftRepeat - rightRepeat || hashSeed(`${nonce}:fill:${left.id}`) - hashSeed(`${nonce}:fill:${right.id}`);
      });
    selected.push(...remaining.slice(0, EARWORM_TRACK_COUNT - selected.length));
  }

  if (selected.length !== EARWORM_TRACK_COUNT) return null;
  return selected.sort((left, right) => hashSeed(`${nonce}:order:${left.id}`) - hashSeed(`${nonce}:order:${right.id}`));
}

function migrationUnavailable(message: string) {
  return /earworm_personality_results|earworm_track_reactions|schema cache|does not exist/i.test(message);
}

export async function GET(request: Request) {
  try {
    const admin = adminClient();
    const nonce = new URL(request.url).searchParams.get("nonce") || new Date().toISOString().slice(0, 16);
    const tracks = chooseQuizTracks(await readPlayableTracks(admin), nonce);
    if (!tracks) {
      return NextResponse.json({ error: `目前至少需要 ${EARWORM_TRACK_COUNT} 首公開作品才能開始耳朵蟲。` }, { status: 404 });
    }
    const serialized = tracks.map((row) => serializeTrack(admin, row));
    return NextResponse.json({
      quiz: {
        id: earwormQuizKey(serialized.map((track) => track.id)),
        tracks: serialized,
        minListenSeconds: EARWORM_MIN_LISTEN_SECONDS,
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "請先登入，再保存你的耳朵人格結果。" }, { status: 401 });

    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "登入狀態已過期，請重新登入。" }, { status: 401 });

    const body = await request.json().catch(() => null) as { quizKey?: unknown; answers?: unknown } | null;
    const quizKey = typeof body?.quizKey === "string" ? body.quizKey.trim() : "";
    if (!quizKey || !Array.isArray(body?.answers) || body.answers.length !== EARWORM_TRACK_COUNT) {
      return NextResponse.json({ error: `請完成全部 ${EARWORM_TRACK_COUNT} 首再保存結果。` }, { status: 400 });
    }

    const parsedAnswers = body.answers.map((answer) => {
      const value = answer as { trackId?: unknown; reaction?: unknown; listenedSeconds?: unknown };
      return {
        trackId: typeof value.trackId === "string" ? value.trackId.trim() : "",
        reaction: value.reaction,
        listenedSeconds: Math.max(0, Number(value.listenedSeconds) || 0),
      };
    });
    const trackIds = parsedAnswers.map((answer) => answer.trackId);
    if (
      trackIds.some((id) => !id) ||
      new Set(trackIds).size !== EARWORM_TRACK_COUNT ||
      parsedAnswers.some((answer) => !isEarwormReaction(answer.reaction) || answer.listenedSeconds < EARWORM_MIN_LISTEN_SECONDS) ||
      quizKey !== earwormQuizKey(trackIds)
    ) {
      return NextResponse.json({ error: "測驗資料不完整，請重新完成這次耳朵蟲。" }, { status: 400 });
    }

    const rows = await readTracksByIds(admin, trackIds);
    if (rows.length !== EARWORM_TRACK_COUNT || !rows.every(isPlayable)) {
      return NextResponse.json({ error: "測驗中的作品已經不可用，請重新測一次。" }, { status: 409 });
    }
    const byId = new Map(rows.map((row) => [row.id, row]));
    const answers: EarwormAnswer[] = parsedAnswers.map((answer) => ({
      trackId: answer.trackId,
      genre: canonicalMusicGenre(byId.get(answer.trackId)?.genre),
      reaction: answer.reaction as EarwormAnswer["reaction"],
      listenedSeconds: answer.listenedSeconds,
    }));
    if (answers.some((answer) => !isCurrentMusicGenre(answer.genre))) {
      return NextResponse.json({ error: "測驗類型資料已失效，請重新測一次。" }, { status: 409 });
    }

    const result = calculateEarwormResult(answers);
    const insertPayload = {
      user_id: userData.user.id,
      quiz_key: quizKey,
      track_ids: trackIds,
      answers,
      scores: result.scores,
      primary_genre: result.primaryGenre,
      secondary_genres: result.secondaryGenres,
    };

    const insertion = await admin.from("earworm_personality_results").insert(insertPayload).select("id").single();
    let quizResultId = typeof insertion.data?.id === "string" ? insertion.data.id : "";
    let alreadySaved = false;
    if (insertion.error?.code === "23505") {
      const existing = await admin
        .from("earworm_personality_results")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("quiz_key", quizKey)
        .maybeSingle();
      if (existing.data) {
        quizResultId = existing.data.id;
        alreadySaved = true;
      }
    }

    if ((!quizResultId || insertion.error) && !alreadySaved) {
      if (insertion.error && migrationUnavailable(insertion.error.message)) {
        return NextResponse.json({ error: "耳朵人格資料表尚未啟用，請先套用最新 Supabase migration。" }, { status: 503 });
      }
      return NextResponse.json({ error: insertion.error?.message || "結果暫時無法保存。" }, { status: 500 });
    }

    const reactionRows = answers.map((answer) => ({
      user_id: userData.user.id,
      track_id: answer.trackId,
      quiz_result_id: quizResultId,
      reaction: answer.reaction,
      reaction_score: EARWORM_REACTION_POINTS[answer.reaction],
      listened_seconds: Math.round(answer.listenedSeconds * 100) / 100,
      updated_at: new Date().toISOString(),
    }));
    const affinityInsertion = await admin
      .from("earworm_track_reactions")
      .upsert(reactionRows, { onConflict: "user_id,track_id" });
    if (affinityInsertion.error) {
      if (!alreadySaved) {
        await admin.from("earworm_personality_results").delete().eq("id", quizResultId);
      }
      if (migrationUnavailable(affinityInsertion.error.message)) {
        return NextResponse.json({ error: "耳朵蟲好感資料表尚未啟用，請先套用最新 Supabase migration。" }, { status: 503 });
      }
      return NextResponse.json({ error: affinityInsertion.error.message || "盲聽反應暫時無法保存。" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result, alreadySaved });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}
