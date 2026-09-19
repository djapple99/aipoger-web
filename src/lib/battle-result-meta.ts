import { createClient } from "@supabase/supabase-js";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";

export type BattleResultShareData = {
  battleId: string;
  battleCode: string;
  winnerName: string;
  winnerSong: string;
  opponentName: string;
  opponentSong: string;
  rank: string;
  tool: string;
  genre: string;
  coverUrl: string;
  avatarUrl: string;
  opponentCoverUrl: string;
  opponentAvatarUrl: string;
  aiReview: string;
  audienceReview: string;
  votesTotal: number;
};

type SearchValue = string | string[] | undefined;
type SearchRecord = Record<string, SearchValue>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function firstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberFrom(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function payloadFrom(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function safeImage(value: string) {
  return value || AIPOGER_BRAND_LOGO;
}

export function isBattleUuid(value: string) {
  return uuidPattern.test(value);
}

export function resultShareDataFromSearch(searchParams: SearchRecord = {}): BattleResultShareData {
  return {
    battleId: clean(firstValue(searchParams.battleId)),
    battleCode: clean(firstValue(searchParams.battle)),
    winnerName: clean(firstValue(searchParams.winner)),
    winnerSong: clean(firstValue(searchParams.song)),
    opponentName: clean(firstValue(searchParams.opponent)),
    opponentSong: clean(firstValue(searchParams.opponentSong)),
    rank: clean(firstValue(searchParams.rank)),
    tool: clean(firstValue(searchParams.tool)),
    genre: clean(firstValue(searchParams.genre)) || "AI Music",
    coverUrl: clean(firstValue(searchParams.coverUrl)),
    avatarUrl: clean(firstValue(searchParams.avatarUrl)),
    opponentCoverUrl: clean(firstValue(searchParams.opponentCoverUrl)),
    opponentAvatarUrl: clean(firstValue(searchParams.opponentAvatarUrl)),
    aiReview: clean(firstValue(searchParams.aiReview)),
    audienceReview: clean(firstValue(searchParams.audienceReview)),
    votesTotal: numberFrom(firstValue(searchParams.votesTotal) ?? firstValue(searchParams.votes) ?? firstValue(searchParams.voteCount)),
  };
}

export function resultShareDataFromUrl(searchParams: URLSearchParams): BattleResultShareData {
  const record: SearchRecord = {};
  searchParams.forEach((value, key) => {
    record[key] = value;
  });
  return resultShareDataFromSearch(record);
}

function mergeArchive(base: BattleResultShareData, row: Record<string, unknown>): BattleResultShareData {
  const payload = payloadFrom(row.result_payload);
  return {
    battleId: clean(row.battle_id) || base.battleId,
    battleCode: clean(row.battle_code) || base.battleCode,
    winnerName: clean(row.winner_name) || base.winnerName,
    winnerSong: clean(row.winner_song_name) || base.winnerSong,
    opponentName: clean(row.opponent_name) || base.opponentName,
    opponentSong: clean(row.opponent_song_name) || base.opponentSong,
    rank: clean(payload.rank) || base.rank,
    tool: clean(row.winner_ai_tool) || clean(payload.tool) || base.tool,
    genre: clean(payload.genre) || base.genre,
    coverUrl: safeImage(clean(payload.coverUrl) || base.coverUrl),
    avatarUrl: safeImage(clean(payload.avatarUrl) || base.avatarUrl),
    opponentCoverUrl: safeImage(clean(payload.opponentCoverUrl) || base.opponentCoverUrl),
    opponentAvatarUrl: safeImage(clean(payload.opponentAvatarUrl) || base.opponentAvatarUrl),
    aiReview: clean(payload.aiReview) || base.aiReview,
    audienceReview: clean(row.audience_review) || clean(payload.audienceReview) || base.audienceReview,
    votesTotal: numberFrom(payload.votesTotal ?? row.total_votes) || base.votesTotal,
  };
}

export async function loadBattleResultShareData(base: BattleResultShareData) {
  if (!base.battleId || !isBattleUuid(base.battleId)) {
    return {
      ...base,
      coverUrl: safeImage(base.coverUrl),
      avatarUrl: safeImage(base.avatarUrl),
      opponentCoverUrl: safeImage(base.opponentCoverUrl),
      opponentAvatarUrl: safeImage(base.opponentAvatarUrl),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return base;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("battle_result_archives")
    .select("battle_id,battle_code,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,total_votes,audience_review,result_payload")
    .eq("battle_id", base.battleId)
    .maybeSingle();

  if (error || !data) return base;
  return mergeArchive(base, data as Record<string, unknown>);
}

export function buildResultOgQuery(data: BattleResultShareData) {
  const query = new URLSearchParams();
  Object.entries({
    battleId: data.battleId,
    battle: data.battleCode,
    winner: data.winnerName,
    song: data.winnerSong,
    opponent: data.opponentName,
    opponentSong: data.opponentSong,
    rank: data.rank,
    tool: data.tool,
    genre: data.genre,
    coverUrl: data.coverUrl,
    avatarUrl: data.avatarUrl,
    opponentCoverUrl: data.opponentCoverUrl,
    opponentAvatarUrl: data.opponentAvatarUrl,
    aiReview: data.aiReview,
    audienceReview: data.audienceReview,
    votesTotal: data.votesTotal ? String(data.votesTotal) : "",
  }).forEach(([key, value]) => {
    const cleanValue = String(value ?? "").trim();
    if (cleanValue) query.set(key, cleanValue);
  });
  return query;
}
