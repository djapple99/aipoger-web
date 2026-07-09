import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_MUSIC_CHALLENGE_BATTLE_TYPE,
  shouldRetireAiMusicTrackFromExplore,
} from "@/lib/ai-music-challenge-rules";
import { isOfficialDropBattleResult } from "@/lib/drop-battle-rematch";
import { listenBarRowToTrack, type ListenBarTrackRow } from "@/lib/listen-bar";
import {
  LISTEN_BAR_GENRE_POOL_LIMIT,
  listenBarIsHonorEligible,
  listenBarSurvivalStartedAt,
} from "@/lib/listen-bar-rules";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";

type AdminClient = SupabaseClient;

type InviteBattleRow = {
  defender_track_id?: string | null;
  battle_id?: string | null;
};

type BattleRow = {
  id?: string | null;
  battle_type?: string | null;
  status?: string | null;
  winner?: string | null;
};

type ArchiveRow = {
  battle_id?: string | null;
  winner?: string | null;
  total_votes?: number | null;
  result_payload?: Record<string, unknown> | null;
};

export type AiMusicSurfaceLifecycleStats = {
  officialChallengeCount: number;
  officialWins: number;
  officialLosses: number;
  officialAudienceVotes: number;
  isShowtimeCertified: boolean;
  retiredFromExplore: boolean;
};

const EMPTY_STATS: AiMusicSurfaceLifecycleStats = {
  officialChallengeCount: 0,
  officialWins: 0,
  officialLosses: 0,
  officialAudienceVotes: 0,
  isShowtimeCertified: false,
  retiredFromExplore: false,
};

function cloneEmptyStats(): AiMusicSurfaceLifecycleStats {
  return { ...EMPTY_STATS };
}

export function isAiMusicLifecycleSchemaMissing(error: { message?: string; details?: string; hint?: string; code?: string } | null | undefined) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`;
  return /ai_music_challenge_invites|battle_result_archives|battle_type|schema cache|column.*does not exist|relation.*does not exist|PGRST204|42P01/i.test(text);
}

function numberField(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function audienceCountFromArchive(row: ArchiveRow) {
  const payload = row.result_payload && typeof row.result_payload === "object" ? row.result_payload : {};
  return numberField(payload.audienceCount ?? payload.audience_count ?? row.total_votes);
}

function showtimeTrackIdsFromListenBarRows(rows: ListenBarTrackRow[]) {
  const communityTracks = rows
    .map((row) => ({ row, track: listenBarRowToTrack(row) }))
    .filter((item): item is { row: ListenBarTrackRow; track: NonNullable<ReturnType<typeof listenBarRowToTrack>> } => {
      return Boolean(item.track && item.track.source !== "official");
    });

  const survivalInput = communityTracks.map(({ row, track }) => ({
    barPhase: track.barPhase,
    genre: track.genre,
    promotedAt: row.promoted_at ?? track.promotedAt,
    createdAt: track.createdAt,
  }));
  const survivalStartedAtByGenre = new Map(
    MUSIC_GENRE_OPTIONS.map((genre) => [
      genre.value,
      listenBarSurvivalStartedAt(survivalInput, LISTEN_BAR_GENRE_POOL_LIMIT, genre.value),
    ]),
  );

  const ids = new Set<string>();
  for (const { row, track } of communityTracks) {
    if (listenBarIsHonorEligible({
      positiveReactionCount: track.positiveReactionCount,
      promotedAt: row.promoted_at ?? track.promotedAt,
      createdAt: track.createdAt,
    }, Date.now(), survivalStartedAtByGenre.get(track.genre) ?? null)) {
      ids.add(track.id);
    }
  }
  return ids;
}

export async function readAiMusicOfficialChallengeStats(admin: AdminClient, trackIds: string[]) {
  const statsByTrackId = new Map<string, AiMusicSurfaceLifecycleStats>();
  const ids = Array.from(new Set(trackIds.filter(Boolean)));
  for (const id of ids) statsByTrackId.set(id, cloneEmptyStats());
  if (ids.length === 0) return statsByTrackId;

  const { data: invites, error: inviteError } = await admin
    .from("ai_music_challenge_invites")
    .select("defender_track_id,battle_id")
    .in("defender_track_id", ids)
    .not("battle_id", "is", null);
  if (inviteError) {
    if (isAiMusicLifecycleSchemaMissing(inviteError)) return statsByTrackId;
    throw inviteError;
  }

  const inviteRows = ((invites ?? []) as InviteBattleRow[]).filter((row): row is { defender_track_id: string; battle_id: string } => {
    return Boolean(row.defender_track_id && row.battle_id);
  });
  const battleIds = Array.from(new Set(inviteRows.map((row) => row.battle_id)));
  if (battleIds.length === 0) return statsByTrackId;

  const [battleResult, archiveResult] = await Promise.all([
    admin
      .from("battles")
      .select("id,battle_type,status,winner")
      .in("id", battleIds),
    admin
      .from("battle_result_archives")
      .select("battle_id,winner,total_votes,result_payload")
      .in("battle_id", battleIds),
  ]);
  if (battleResult.error) {
    if (isAiMusicLifecycleSchemaMissing(battleResult.error)) return statsByTrackId;
    throw battleResult.error;
  }
  if (archiveResult.error) {
    if (isAiMusicLifecycleSchemaMissing(archiveResult.error)) return statsByTrackId;
    throw archiveResult.error;
  }

  const battleById = new Map(
    ((battleResult.data ?? []) as BattleRow[])
      .filter((battle) => battle.id && battle.battle_type === AI_MUSIC_CHALLENGE_BATTLE_TYPE)
      .map((battle) => [battle.id as string, battle]),
  );
  const defenderTrackByBattleId = new Map(inviteRows.map((row) => [row.battle_id, row.defender_track_id]));

  for (const archive of (archiveResult.data ?? []) as ArchiveRow[]) {
    const battleId = archive.battle_id ?? "";
    const battle = battleById.get(battleId);
    const defenderTrackId = defenderTrackByBattleId.get(battleId);
    if (!battle || !defenderTrackId) continue;
    const audienceCount = audienceCountFromArchive(archive);
    if (!isOfficialDropBattleResult({ audienceCount, totalVotes: archive.total_votes ?? audienceCount })) continue;
    const winner = archive.winner || battle.winner;
    if (winner !== "fighter_a" && winner !== "fighter_b") continue;

    const stats = statsByTrackId.get(defenderTrackId) ?? cloneEmptyStats();
    stats.officialChallengeCount += 1;
    stats.officialAudienceVotes += audienceCount;
    if (winner === "fighter_a") stats.officialWins += 1;
    if (winner === "fighter_b") stats.officialLosses += 1;
    statsByTrackId.set(defenderTrackId, stats);
  }

  return statsByTrackId;
}

export async function buildAiMusicSurfaceLifecycleMap(admin: AdminClient, rows: ListenBarTrackRow[]) {
  const trackIds = rows.map((row) => row.id).filter(Boolean);
  const challengeStats = await readAiMusicOfficialChallengeStats(admin, trackIds);
  const showtimeIds = showtimeTrackIdsFromListenBarRows(rows);

  const lifecycleByTrackId = new Map<string, AiMusicSurfaceLifecycleStats>();
  for (const row of rows) {
    const stats = challengeStats.get(row.id) ?? cloneEmptyStats();
    stats.isShowtimeCertified = showtimeIds.has(row.id) || stats.officialWins > 0;
    stats.retiredFromExplore = shouldRetireAiMusicTrackFromExplore({
      officialLosses: stats.officialLosses,
      isShowtimeCertified: stats.isShowtimeCertified,
    });
    lifecycleByTrackId.set(row.id, stats);
  }
  return lifecycleByTrackId;
}
