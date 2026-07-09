"use client";

import Link from "next/link";
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { fontGlowSans, fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import {
  canonicalMusicGenre,
  isCurrentMusicGenre,
  MUSIC_GENRE_OPTIONS,
  MUSIC_GENRE_VALUES,
} from "@/lib/music-genres";
import { supabase } from "@/lib/supabase";
import { listenBarRowToTrack, type ListenBarTrackRow } from "@/lib/listen-bar";
import {
  aiMusicChallengeStatusLabel,
  hasPreparedAiMusicDefenderDrop,
  isAiMusicChallengeReady,
  normalizeAiMusicChallengeStatus,
  type AiMusicChallengeStatus,
} from "@/lib/ai-music-challenge-rules";

type TrackSource = "battle" | "bar";
type BattleWinnerSide = "fighter_a" | "fighter_b";

type AiMusicTrack = {
  id: string;
  source: TrackSource;
  sourceId: string;
  recordKey: string;
  targetKind: TrackSource;
  targetId: string;
  title: string;
  creator: string;
  aiTool: string;
  genre: string;
  coverUrl: string;
  audioUrl: string | null;
  createdAt: string;
  heartCount: number;
  challengeCount: number;
  wins: number;
  losses: number;
  audienceVotes: number;
  winRate: number;
  openForChallenge: boolean;
  hasDefenderDrop: boolean;
  challengeStatus: AiMusicChallengeStatus;
  statusLabel: string;
  href: string;
};

type HonorInteractionPayload = {
  recordKey: string;
  favoriteCount: number;
  myFavorited: boolean;
  comments?: unknown[];
};

type HonorInteractionState = {
  favoriteCount: number;
  myFavorited: boolean;
};

type BattleMediaRow = {
  id?: string | null;
  winner?: string | null;
  fighter_a_name?: string | null;
  fighter_b_name?: string | null;
  song_a_name?: string | null;
  song_b_name?: string | null;
  ai_tool_a?: string | null;
  ai_tool_b?: string | null;
  audio_a_path?: string | null;
  audio_b_path?: string | null;
  song_a_cover?: string | null;
  song_b_cover?: string | null;
  fighter_a_avatar?: string | null;
  fighter_b_avatar?: string | null;
};

type SongStatsRow = {
  owner_user_id?: string | null;
  display_title?: string | null;
  genre?: string | null;
  ai_tool?: string | null;
  latest_audio_path?: string | null;
  battle_count?: number | null;
  wins?: number | null;
  losses?: number | null;
  no_contests?: number | null;
  total_votes_for?: number | null;
  total_votes_against?: number | null;
  honor_board_count?: number | null;
  last_battled_at?: string | null;
  updated_at?: string | null;
};

type LoadState = "loading" | "ready" | "error";

const BATTLE_ARCHIVE_SELECT =
  "battle_id,battle_code,winner,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,final_vote_left,final_vote_right,total_votes,audience_review,result_payload,archived_at,winner_song_battle_count,winner_song_wins,winner_song_losses,winner_song_no_contests,winner_song_total_votes_for,winner_song_total_votes_against,winner_song_honor_board_count";

function cleanText(value: unknown, fallback = "") {
  const clean = typeof value === "string" ? value.trim() : "";
  return clean || fallback;
}

function numberValue(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}

function normalizeWinnerSide(value: unknown): BattleWinnerSide | null {
  return value === "fighter_a" || value === "fighter_b" ? value : null;
}

function normalizeTitleKey(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.(mp3|wav|aiff|aif|m4a|aac|ogg)$/i, "")
    .replace(/[《》"']/g, "")
    .replace(/\s+/g, " ");
}

function canonicalGenreBucket(value: string | null | undefined) {
  const genre = canonicalMusicGenre(value);
  return isCurrentMusicGenre(genre) ? genre : "Original 自我風格";
}

function safeDate(value: string | null | undefined) {
  const parsed = new Date(value || "");
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function resultPathForBattle(id: string, lang: string) {
  const params = new URLSearchParams({ lang });
  return `/battle/result?battleId=${encodeURIComponent(id)}&${params.toString()}`;
}

function aiMusicChallengeHref(track: AiMusicTrack, lang: string) {
  const params = new URLSearchParams({
    lang,
    battleMode: "instant",
    instantPairing: "invite",
    aiMusicChallengeTrackId: track.sourceId,
    defenderTrackTitle: track.title,
    genre: track.genre,
  });
  return `/battle/setup?${params.toString()}`;
}

function listenBarHref(id: string, lang: string) {
  const params = new URLSearchParams({ lang, track: id });
  return `/listen-bar?${params.toString()}`;
}

function storagePublicUrl(bucket: string, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^(https?:|blob:|data:)/i.test(clean)) return clean;
  return supabase.storage.from(bucket).getPublicUrl(clean).data.publicUrl;
}

async function signedStorageUrl(bucket: string, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^(https?:|blob:|data:)/i.test(clean)) return clean;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(clean, 60 * 30);
  if (error) return null;
  return data?.signedUrl ?? null;
}

async function battleMediaUrl(path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^(https?:|blob:|data:)/i.test(clean)) return clean;
  for (const bucket of ["battle-audio", "avatars"] as const) {
    const url = await signedStorageUrl(bucket, clean);
    if (url) return url;
  }
  return null;
}

function payloadObject(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function songStatsFromArchive(row: Record<string, unknown>, payload: Record<string, unknown>) {
  const payloadStats =
    typeof payload.songStats === "object" && payload.songStats !== null
      ? payloadObject(payloadObject(payload.songStats).winner)
      : {};
  const battleCount = numberValue(row.winner_song_battle_count ?? payloadStats.battleCount);
  const wins = numberValue(row.winner_song_wins ?? payloadStats.wins);
  const losses = numberValue(row.winner_song_losses ?? payloadStats.losses);
  const totalVotes = numberValue(
    row.winner_song_total_votes_for ??
      payloadStats.totalVotesFor ??
      row.total_votes ??
      payload.votesTotal ??
      payload.votes,
  );
  return {
    battleCount,
    wins,
    losses,
    totalVotes,
    winRate: battleCount > 0 ? Math.round((wins / battleCount) * 100) : 0,
  };
}

async function readBattleArchiveRows() {
  const primary = await supabase
    .from("battle_result_archives")
    .select(BATTLE_ARCHIVE_SELECT)
    .order("archived_at", { ascending: false })
    .limit(180);
  if (!primary.error) return (primary.data ?? []) as Record<string, unknown>[];

  const fallback = await supabase
    .from("battle_result_archives")
    .select(
      "battle_id,battle_code,winner,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,final_vote_left,final_vote_right,total_votes,audience_review,result_payload,archived_at",
    )
    .order("archived_at", { ascending: false })
    .limit(180);
  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []) as Record<string, unknown>[];
}

async function readBattleMediaRows(battleIds: string[]) {
  if (battleIds.length === 0) return new Map<string, BattleMediaRow>();
  const selectAttempts = [
    "id,winner,fighter_a_name,fighter_b_name,song_a_name,song_b_name,ai_tool_a,ai_tool_b,audio_a_path,audio_b_path,song_a_cover,song_b_cover,fighter_a_avatar,fighter_b_avatar",
    "id,winner,fighter_a_name,fighter_b_name,song_a_name,song_b_name,ai_tool_a,ai_tool_b,audio_a_path,audio_b_path",
  ];

  for (const select of selectAttempts) {
    const { data, error } = await supabase.from("battles").select(select).in("id", battleIds);
    if (!error) {
      return new Map((data ?? []).map((row) => [String((row as BattleMediaRow).id), row as BattleMediaRow]));
    }
    if (!/schema cache|does not exist|PGRST204|song_a_cover|fighter_a_avatar/i.test(error.message)) {
      console.warn("[ai-music battle media]", error.message);
      return new Map<string, BattleMediaRow>();
    }
  }

  return new Map<string, BattleMediaRow>();
}

async function readSongStatsRows() {
  const { data, error } = await supabase
    .from("battle_song_stats")
    .select(
      "owner_user_id,display_title,genre,ai_tool,latest_audio_path,battle_count,wins,losses,no_contests,total_votes_for,total_votes_against,honor_board_count,last_battled_at,updated_at",
    )
    .order("battle_count", { ascending: false })
    .limit(240);
  if (error) {
    if (!/schema cache|does not exist|permission denied/i.test(error.message)) {
      console.warn("[ai-music song stats]", error.message);
    }
    return [];
  }
  return (data ?? []) as SongStatsRow[];
}

function buildSongStatsLookup(rows: SongStatsRow[]) {
  const byOwnerAndTitle = new Map<string, SongStatsRow>();
  const byTitle = new Map<string, SongStatsRow>();
  for (const row of rows) {
    const titleKey = normalizeTitleKey(row.display_title);
    if (!titleKey) continue;
    if (row.owner_user_id) byOwnerAndTitle.set(`${row.owner_user_id}:${titleKey}`, row);
    const current = byTitle.get(titleKey);
    if (!current || numberValue(row.battle_count) > numberValue(current.battle_count)) byTitle.set(titleKey, row);
  }
  return { byOwnerAndTitle, byTitle };
}

async function tracksFromBattleArchives(lang: string) {
  const rows = await readBattleArchiveRows();
  const filteredRows = rows.filter((row) => {
    const payload = payloadObject(row.result_payload);
    const audience = numberValue(payload.audienceCount ?? payload.audienceVoterCount ?? row.total_votes);
    const min = numberValue(payload.officialAudienceMin) || 3;
    return cleanText(row.winner_name) && cleanText(row.winner_song_name) && audience >= min;
  });
  const battleIds = Array.from(
    new Set(filteredRows.map((row) => cleanText(row.battle_id)).filter(Boolean)),
  );
  const battleMediaById = await readBattleMediaRows(battleIds);

  const mediaUrlByKey = new Map<string, string | null>();
  await Promise.all(
    filteredRows.map(async (row) => {
      const battleId = cleanText(row.battle_id);
      const media = battleId ? battleMediaById.get(battleId) : null;
      const winner = normalizeWinnerSide(media?.winner ?? row.winner);
      const winnerIsB = winner === "fighter_b";
      const audioPath = winnerIsB ? media?.audio_b_path : media?.audio_a_path;
      const coverPath = winnerIsB
        ? media?.song_b_cover || media?.fighter_b_avatar
        : media?.song_a_cover || media?.fighter_a_avatar;
      const [audioUrl, coverUrl] = await Promise.all([
        signedStorageUrl("battle-audio", audioPath),
        battleMediaUrl(coverPath),
      ]);
      if (battleId) {
        mediaUrlByKey.set(`${battleId}:audio`, audioUrl);
        mediaUrlByKey.set(`${battleId}:cover`, coverUrl);
      }
    }),
  );

  return filteredRows.map<AiMusicTrack>((row) => {
    const payload = payloadObject(row.result_payload);
    const battleId = cleanText(row.battle_id) || cleanText(row.battle_code) || cleanText(row.winner_song_name);
    const media = battleId ? battleMediaById.get(battleId) : null;
    const winner = normalizeWinnerSide(media?.winner ?? row.winner);
    const winnerIsB = winner === "fighter_b";
    const title = cleanText(
      winnerIsB ? media?.song_b_name : media?.song_a_name,
      cleanText(row.winner_song_name, "Untitled AI Music"),
    );
    const creator = cleanText(
      winnerIsB ? media?.fighter_b_name : media?.fighter_a_name,
      cleanText(row.winner_name, "AIPOGER Creator"),
    );
    const aiTool = cleanText(
      winnerIsB ? media?.ai_tool_b : media?.ai_tool_a,
      cleanText(row.winner_ai_tool || payload.tool, "AI Music"),
    );
    const stats = songStatsFromArchive(row, payload);
    const genre = canonicalGenreBucket(cleanText(payload.genre, cleanText(row.genre, "")));
    const audienceVotes = numberValue(payload.audienceCount ?? payload.audienceVoterCount ?? row.total_votes);
    const battleCode = cleanText(row.battle_code);
    const sourceId = cleanText(row.battle_id) || battleCode || battleId;
    const audioUrl =
      cleanText(payload.audioUrl) ||
      (cleanText(row.battle_id) ? mediaUrlByKey.get(`${cleanText(row.battle_id)}:audio`) ?? null : null);
    const coverUrl =
      cleanText(payload.coverUrl) ||
      (cleanText(row.battle_id) ? mediaUrlByKey.get(`${cleanText(row.battle_id)}:cover`) ?? "" : "") ||
      AIPOGER_BRAND_LOGO;

    return {
      id: `battle-${sourceId}`,
      source: "battle",
      sourceId,
      recordKey: `battle:${sourceId}`,
      targetKind: "battle",
      targetId: battleCode || sourceId,
      title,
      creator,
      aiTool,
      genre,
      coverUrl,
      audioUrl: audioUrl || null,
      createdAt: safeDate(cleanText(row.archived_at)),
      heartCount: 0,
      challengeCount: stats.battleCount,
      wins: stats.wins,
      losses: stats.losses,
      audienceVotes: stats.totalVotes || audienceVotes,
      winRate: stats.winRate,
      openForChallenge: false,
      hasDefenderDrop: false,
      challengeStatus: "showcase",
      statusLabel: lang === "zh" ? "Showtime 展示" : "Showtime showcase",
      href: resultPathForBattle(sourceId, lang),
    };
  });
}

async function tracksFromListenBar(songStats: ReturnType<typeof buildSongStatsLookup>, lang: string) {
  const { data, error } = await supabase
    .from("listen_bar_tracks")
    .select(
      "id,title,artist,ai_tool,genre,mood,description,youtube_url,bpm,duration_seconds,audio_path,cover_path,lyrics,is_active,review_status,hidden_at,removed_at,source,is_featured_official,bar_phase,positive_reaction_count,heart_count,star_count,thumb_count,happy_count,created_at,promoted_at,created_by,ai_music_challenge_status,ai_music_defender_drop_audio_path,ai_music_defender_drop_prepared_at",
    )
    .eq("is_active", true)
    .order("positive_reaction_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(240);
  if (error) {
    console.warn("[ai-music listen bar]", error.message);
    return [];
  }

  return ((data ?? []) as ListenBarTrackRow[])
    .map((row) => ({ row, track: listenBarRowToTrack(row) }))
    .filter((item): item is { row: ListenBarTrackRow; track: NonNullable<ReturnType<typeof listenBarRowToTrack>> } => {
      return Boolean(item.track && item.track.source !== "official");
    })
    .map<AiMusicTrack>(({ row, track }) => {
      const titleKey = normalizeTitleKey(track.title);
      const stats =
        (row.created_by ? songStats.byOwnerAndTitle.get(`${row.created_by}:${titleKey}`) : null) ??
        songStats.byTitle.get(titleKey) ??
        null;
      const battleCount = numberValue(stats?.battle_count);
      const wins = numberValue(stats?.wins);
      const losses = numberValue(stats?.losses);
      const votesFor = numberValue(stats?.total_votes_for);
      const votesAgainst = numberValue(stats?.total_votes_against);
      const genre = canonicalGenreBucket(row.genre ?? track.genre);
      const challengeStatus = normalizeAiMusicChallengeStatus((row as ListenBarTrackRow & { ai_music_challenge_status?: string | null }).ai_music_challenge_status);
      const defenderDropAudioPath = (row as ListenBarTrackRow & { ai_music_defender_drop_audio_path?: string | null }).ai_music_defender_drop_audio_path;
      const hasDefenderDrop = hasPreparedAiMusicDefenderDrop(defenderDropAudioPath);
      const openForChallenge = isAiMusicChallengeReady(challengeStatus, defenderDropAudioPath);
      const statusLabel = challengeStatus === "open" && !hasDefenderDrop
        ? lang === "zh"
          ? "尚未準備守擂 Drop"
          : "Defender Drop missing"
        : aiMusicChallengeStatusLabel(challengeStatus, lang);
      return {
        id: `bar-${track.id}`,
        source: "bar",
        sourceId: track.id,
        recordKey: `bar:${track.id}`,
        targetKind: "bar",
        targetId: track.id,
        title: track.title,
        creator: track.artist,
        aiTool: track.tool || cleanText(stats?.ai_tool, "AI Music"),
        genre,
        coverUrl: track.coverUrl || storagePublicUrl("listen-bar-covers", row.cover_path) || AIPOGER_BRAND_LOGO,
        audioUrl: track.audioUrl || storagePublicUrl("listen-bar-audio", row.audio_path),
        createdAt: safeDate(track.createdAt),
        heartCount: numberValue(track.positiveReactionCount),
        challengeCount: battleCount,
        wins,
        losses,
        audienceVotes: votesFor + votesAgainst,
        winRate: battleCount > 0 ? Math.round((wins / battleCount) * 100) : 0,
        openForChallenge,
        hasDefenderDrop,
        challengeStatus,
        statusLabel,
        href: listenBarHref(track.id, lang),
      };
    });
}

function mergeDuplicateTracks(rows: AiMusicTrack[]) {
  const bySignature = new Map<string, AiMusicTrack>();
  for (const row of rows) {
    const signature = `${normalizeTitleKey(row.creator)}:${normalizeTitleKey(row.title)}:${row.genre}`;
    const current = bySignature.get(signature);
    if (!current) {
      bySignature.set(signature, row);
      continue;
    }
    const currentScore = current.challengeCount * 10 + current.wins * 8 + current.heartCount;
    const nextScore = row.challengeCount * 10 + row.wins * 8 + row.heartCount;
    if (nextScore > currentScore) {
      bySignature.set(signature, {
        ...row,
        heartCount: Math.max(row.heartCount, current.heartCount),
        challengeCount: Math.max(row.challengeCount, current.challengeCount),
        wins: Math.max(row.wins, current.wins),
        losses: Math.max(row.losses, current.losses),
        audienceVotes: Math.max(row.audienceVotes, current.audienceVotes),
      });
    }
  }
  return Array.from(bySignature.values()).sort((a, b) => {
    const scoreA = a.challengeCount * 12 + a.wins * 10 + a.heartCount;
    const scoreB = b.challengeCount * 12 + b.wins * 10 + b.heartCount;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function PlayIcon({ playing = false }: { playing?: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7 5h3.5v14H7V5Zm6.5 0H17v14h-3.5V5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M8 5.4v13.2L18.4 12 8 5.4Z" />
    </svg>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={filled ? "currentColor" : "none"} aria-hidden="true">
      <path
        d="M12 20.2s-7.4-4.4-8.7-9.1C2.5 8.1 4.4 5.5 7.2 5.5c1.7 0 3.1.9 3.8 2.1.7-1.2 2.1-2.1 3.8-2.1 2.8 0 4.7 2.6 3.9 5.6C17.4 15.8 12 20.2 12 20.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M8.4 10.6 15.7 6.7M8.4 13.4l7.3 3.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="6.5" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.5" cy="5.8" r="2.7" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.5" cy="18.2" r="2.7" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function TrackCover({ track, className = "" }: { track: AiMusicTrack; className?: string }) {
  return (
    <div className={`overflow-hidden bg-black ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={track.coverUrl || AIPOGER_BRAND_LOGO}
        alt=""
        className={`h-full w-full ${track.coverUrl === AIPOGER_BRAND_LOGO ? "object-contain p-5" : "object-cover"}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function formatRecord(track: AiMusicTrack, isZh: boolean) {
  if (track.challengeCount <= 0) {
    return isZh ? "尚未形成正式戰績" : "No official record yet";
  }
  return isZh
    ? `${track.wins}W / ${track.losses}L · ${track.winRate}%`
    : `${track.wins}W / ${track.losses}L · ${track.winRate}%`;
}

function TrackHud({ track, isZh }: { track: AiMusicTrack; isZh: boolean }) {
  const hasOfficialRecord = track.challengeCount > 0;
  return (
    <div className="grid gap-2 rounded-md border border-white/14 bg-black/76 p-3 text-left shadow-[0_18px_44px_rgba(0,0,0,0.46)] backdrop-blur">
      <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.18em] text-cyan-100/75`}>
        Battle Record
      </p>
      <p className="text-sm font-black text-white">
        {hasOfficialRecord ? formatRecord(track, isZh) : isZh ? "尚未形成正式戰績" : "No official record yet"}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-300">
        <span>{isZh ? "有效投票" : "Valid votes"} {track.audienceVotes}</span>
        <span>{isZh ? "挑戰" : "Battles"} {track.challengeCount}</span>
        <span>{isZh ? "同類型勝率" : "Style win rate"} {track.winRate}%</span>
        <span>{track.statusLabel}</span>
      </div>
      {!hasOfficialRecord ? (
        <p className="text-[11px] font-bold leading-5 text-zinc-500">
          {isZh ? "正式戰績需要至少 3 位非參賽者投票。" : "Official records need at least 3 non-fighter votes."}
        </p>
      ) : null}
    </div>
  );
}

function TrackCard({
  track,
  isZh,
  isPlaying,
  isExpanded,
  interaction,
  favoriteBusy,
  lang,
  onPlay,
  onToggleExpand,
  onFavorite,
  onShare,
}: {
  track: AiMusicTrack;
  isZh: boolean;
  isPlaying: boolean;
  isExpanded: boolean;
  interaction: HonorInteractionState | undefined;
  favoriteBusy: boolean;
  lang: string;
  onPlay: (track: AiMusicTrack) => void;
  onToggleExpand: (track: AiMusicTrack) => void;
  onFavorite: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
}) {
  const heartCount = Math.max(track.heartCount, interaction?.favoriteCount ?? 0);
  const favorited = Boolean(interaction?.myFavorited);
  return (
    <article className="group relative w-[12.5rem] shrink-0 snap-start overflow-hidden rounded-md border border-white/10 bg-black/54 shadow-[0_18px_54px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-orange-200/45 hover:bg-orange-500/[0.055] sm:w-full">
      <div className="relative aspect-square">
        <TrackCover track={track} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/12 to-transparent" />
        <button
          type="button"
          onClick={() => onPlay(track)}
          disabled={!track.audioUrl}
          className="absolute bottom-3 left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_0_26px_rgba(255,106,0,0.36)] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          aria-label={isPlaying ? (isZh ? "暫停" : "Pause") : isZh ? `播放 ${track.title}` : `Play ${track.title}`}
        >
          <PlayIcon playing={isPlaying} />
        </button>
        <button
          type="button"
          onClick={() => onToggleExpand(track)}
          className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/62 text-xs font-black text-white backdrop-blur transition hover:border-cyan-100/50 md:hidden"
          aria-expanded={isExpanded}
          aria-label={isZh ? "顯示戰績資訊" : "Show record info"}
        >
          i
        </button>
        <div className="pointer-events-none absolute inset-x-3 top-3 hidden translate-y-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:block">
          <TrackHud track={track} isZh={isZh} />
        </div>
      </div>

      <div className="grid gap-2 p-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-black leading-5 text-white">{track.title}</h3>
          <p className="mt-1 truncate text-[11px] font-bold text-zinc-400">
            {isZh ? "by" : "by"} {track.creator} · {track.aiTool}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-black text-zinc-300">
          <span className="inline-flex items-center gap-1 text-rose-100">
            <HeartIcon filled />
            {heartCount}
          </span>
          <span className="text-orange-100">⚔ {track.challengeCount}</span>
        </div>
        {isExpanded ? (
          <div className="md:hidden">
            <TrackHud track={track} isZh={isZh} />
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onFavorite(track)}
            disabled={favoriteBusy}
            className={`inline-flex min-h-9 items-center justify-center rounded-md border px-2 text-[11px] font-black transition disabled:cursor-wait disabled:opacity-55 ${
              favorited
                ? "border-rose-200/55 bg-rose-400/18 text-rose-50"
                : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-rose-200/40 hover:text-white"
            }`}
            aria-label={favorited ? (isZh ? "取消收藏" : "Remove favorite") : isZh ? "收藏" : "Favorite"}
          >
            <HeartIcon filled={favorited} />
          </button>
          <button
            type="button"
            onClick={() => onShare(track)}
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-2 text-[11px] font-black text-zinc-300 transition hover:border-cyan-100/40 hover:text-white"
            aria-label={isZh ? "分享" : "Share"}
          >
            <ShareIcon />
          </button>
          {track.openForChallenge ? (
            <Link
              href={aiMusicChallengeHref(track, lang)}
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-orange-200/38 bg-orange-500/15 px-2 text-[11px] font-black text-orange-50 transition hover:border-orange-100/65 hover:bg-orange-500/22"
            >
              {isZh ? "攻擂" : "Challenge"}
            </Link>
          ) : (
            <span className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] px-2 text-[11px] font-black text-zinc-600">
              {track.challengeStatus === "open" && !track.hasDefenderDrop
                ? isZh
                  ? "未備 Drop"
                  : "No Drop"
                : isZh
                  ? "暫不接戰"
                  : "Closed"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function MiniPlayer({
  track,
  isZh,
  isPlaying,
  interaction,
  favoriteBusy,
  lang,
  onTogglePlay,
  onFavorite,
  onShare,
  audioRef,
  onEnded,
  onPause,
  onPlay,
}: {
  track: AiMusicTrack | null;
  isZh: boolean;
  isPlaying: boolean;
  interaction: HonorInteractionState | undefined;
  favoriteBusy: boolean;
  lang: string;
  onTogglePlay: () => void;
  onFavorite: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  onEnded: () => void;
  onPause: () => void;
  onPlay: () => void;
}) {
  if (!track) return null;
  const favorited = Boolean(interaction?.myFavorited);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-200/20 bg-black/92 px-3 py-2 text-white shadow-[0_-22px_70px_rgba(0,0,0,0.66)] backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[3.6rem_minmax(0,1fr)_auto] items-center gap-3">
        <TrackCover track={track} className="h-14 w-14 rounded-md border border-white/10" />
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{track.title}</p>
          <p className="truncate text-[11px] font-bold text-zinc-400">
            {track.creator} · {track.aiTool}
          </p>
          <audio
            ref={audioRef}
            src={track.audioUrl ?? undefined}
            preload="metadata"
            onEnded={onEnded}
            onPause={onPause}
            onPlay={onPlay}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300"
            aria-label={isPlaying ? (isZh ? "暫停" : "Pause") : isZh ? "播放" : "Play"}
          >
            <PlayIcon playing={isPlaying} />
          </button>
          <button
            type="button"
            onClick={() => onFavorite(track)}
            disabled={favoriteBusy}
            className={`hidden h-10 w-10 items-center justify-center rounded-full border transition disabled:cursor-wait disabled:opacity-55 sm:inline-flex ${
              favorited
                ? "border-rose-200/50 bg-rose-400/18 text-rose-50"
                : "border-white/12 bg-white/[0.045] text-zinc-300 hover:border-rose-200/42 hover:text-white"
            }`}
            aria-label={favorited ? (isZh ? "取消收藏" : "Remove favorite") : isZh ? "收藏" : "Favorite"}
          >
            <HeartIcon filled={favorited} />
          </button>
          <button
            type="button"
            onClick={() => onShare(track)}
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-zinc-300 transition hover:border-cyan-100/42 hover:text-white sm:inline-flex"
            aria-label={isZh ? "分享" : "Share"}
          >
            <ShareIcon />
          </button>
          {track.openForChallenge ? (
            <Link
              href={aiMusicChallengeHref(track, lang)}
              className="hidden min-h-10 items-center justify-center rounded-full border border-orange-200/38 bg-orange-500/15 px-3 text-xs font-black text-orange-50 transition hover:border-orange-100/65 hover:bg-orange-500/22 md:inline-flex"
            >
              {isZh ? "攻擂這首" : "Challenge"}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AiMusicClient() {
  const { lang, t } = useI18n();
  const isZh = lang === "zh";
  const [tracks, setTracks] = useState<AiMusicTrack[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [expandedGenres, setExpandedGenres] = useState<Record<string, boolean>>({});
  const [expandedHud, setExpandedHud] = useState<Record<string, boolean>>({});
  const [interactions, setInteractions] = useState<Record<string, HonorInteractionState>>({});
  const [favoriteBusy, setFavoriteBusy] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState("");
  const [currentTrack, setCurrentTrack] = useState<AiMusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const withLang = useCallback((href: string) => `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`, [lang]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadState("loading");
      setLoadError("");
      try {
        const statsRows = await readSongStatsRows();
        const statsLookup = buildSongStatsLookup(statsRows);
        const [battleTracks, barTracks] = await Promise.all([
          tracksFromBattleArchives(lang),
          tracksFromListenBar(statsLookup, lang),
        ]);
        if (!cancelled) {
          setTracks(mergeDuplicateTracks([...battleTracks, ...barTracks]));
          setLoadState("ready");
        }
      } catch (error) {
        console.error("[ai-music load]", error);
        if (!cancelled) {
          setLoadState("error");
          setLoadError(error instanceof Error ? error.message : "Load failed");
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const groupedTracks = useMemo(() => {
    const groups = new Map(MUSIC_GENRE_VALUES.map((genre) => [genre, [] as AiMusicTrack[]]));
    for (const track of tracks) {
      const genre = canonicalGenreBucket(track.genre);
      groups.get(genre)?.push({ ...track, genre });
    }
    return MUSIC_GENRE_VALUES.map((genre) => ({
      genre,
      label: t(MUSIC_GENRE_OPTIONS.find((option) => option.value === genre)?.labelKey ?? ""),
      tracks: groups.get(genre) ?? [],
    }));
  }, [tracks, t]);

  const visibleRecordKeys = useMemo(() => {
    const keys = new Set<string>();
    groupedTracks.forEach((group) => {
      const visible = expandedGenres[group.genre] ? group.tracks : group.tracks.slice(0, 6);
      visible.forEach((track) => keys.add(track.recordKey));
    });
    return Array.from(keys);
  }, [expandedGenres, groupedTracks]);

  useEffect(() => {
    if (visibleRecordKeys.length === 0) return;
    let cancelled = false;

    const loadInteractions = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `/api/honor-board/interactions?keys=${encodeURIComponent(visibleRecordKeys.join(","))}`,
        {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
          cache: "no-store",
        },
      );
      const payload = (await response.json().catch(() => null)) as { records?: HonorInteractionPayload[] } | null;
      if (!response.ok || !Array.isArray(payload?.records) || cancelled) return;
      setInteractions((current) => {
        const next = { ...current };
        payload.records?.forEach((record) => {
          next[record.recordKey] = {
            favoriteCount: Math.max(0, numberValue(record.favoriteCount)),
            myFavorited: Boolean(record.myFavorited),
          };
        });
        return next;
      });
    };

    void loadInteractions();
    return () => {
      cancelled = true;
    };
  }, [visibleRecordKeys]);

  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    if (!isPlaying) return;
    void audioRef.current.play().catch((error) => {
      console.warn("[ai-music player]", error);
      setIsPlaying(false);
      setNotice(isZh ? "瀏覽器暫時阻擋播放，請再按一次播放。" : "Playback was blocked. Tap play again.");
    });
  }, [currentTrack, isPlaying, isZh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handlePlayTrack = (track: AiMusicTrack) => {
    if (!track.audioUrl) {
      setNotice(isZh ? "這首作品目前沒有可播放音檔。" : "This track has no playable audio yet.");
      return;
    }
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
      }
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const toggleFavorite = async (track: AiMusicTrack) => {
    setNotice("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setNotice(isZh ? "請先登入，愛心會成為你的收藏。" : "Sign in to save this track.");
      return;
    }

    setFavoriteBusy((current) => ({ ...current, [track.recordKey]: true }));
    const response = await fetch("/api/honor-board/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: "favorite",
        recordKey: track.recordKey,
        targetKind: track.targetKind,
        targetId: track.targetId,
        targetTitle: track.title,
        targetArtist: track.creator,
        targetGenre: track.genre,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      record?: HonorInteractionPayload;
      error?: string;
    } | null;
    setFavoriteBusy((current) => ({ ...current, [track.recordKey]: false }));
    if (!response.ok || !payload?.record) {
      setNotice(payload?.error || (isZh ? "收藏失敗，請稍後再試。" : "Favorite failed. Try again later."));
      return;
    }
    setInteractions((current) => ({
      ...current,
      [track.recordKey]: {
        favoriteCount: Math.max(0, numberValue(payload.record?.favoriteCount)),
        myFavorited: Boolean(payload.record?.myFavorited),
      },
    }));
  };

  const shareTrack = async (track: AiMusicTrack) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${track.href}` : track.href;
    const text = isZh
      ? `在 AIPOGER 聽 ${track.creator} 的《${track.title}》`
      : `Listen to "${track.title}" by ${track.creator} on AIPOGER`;
    const fallback = `${text}\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(fallback);
      setNotice(isZh ? "作品連結已複製。" : "Track link copied.");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(fallback);
        setNotice(isZh ? "作品連結已複製。" : "Track link copied.");
      } catch {
        setNotice(isZh ? "分享失敗，請稍後再試。" : "Share failed. Try again later.");
      }
    }
  };

  const totalVisibleTracks = groupedTracks.reduce((sum, group) => sum + group.tracks.length, 0);

  return (
    <main className={`${fontGlowSans.className} aipo-stage-bg relative min-h-screen overflow-hidden px-4 pb-28 pt-20 text-white sm:px-6 lg:px-8`}>
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="grid gap-5 pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.24em] text-orange-100/68`}>
              Explore AI Music
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-white sm:text-5xl">
              {isZh ? "AI 音樂作品" : "AI Music Works"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-zinc-400 sm:text-base">
              {isZh
                ? "依照風格快速瀏覽作品，聽歌、收藏，或向你喜歡的作品發起挑戰。"
                : "Browse tracks by style, listen, save favorites, or start a challenge from music you like."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            {[
              { href: "#works", label: isZh ? "作品瀏覽" : "Works" },
              { href: withLang("/rank"), label: "Showtime" },
              { href: withLang("/battle"), label: "Drop Battle" },
              { href: withLang("/listen-bar"), label: isZh ? "傷心酒吧" : "Bar Heartbreak" },
              { href: `/rank?lang=${lang}#choice-weekly`, label: "Choice" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/12 bg-white/[0.045] px-3 text-xs font-black text-zinc-200 transition hover:border-orange-200/50 hover:bg-orange-500/12 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <section className="grid gap-3 pb-7 sm:grid-cols-3">
          {[
            {
              label: isZh ? "作品數" : "Tracks",
              value: totalVisibleTracks,
              note: isZh ? "真實資料，不含 mock" : "Real records only",
            },
            {
              label: isZh ? "風格" : "Styles",
              value: MUSIC_GENRE_OPTIONS.length,
              note: isZh ? "現行十種類型" : "Current genre set",
            },
            {
              label: "Drop Battle",
              value: isZh ? "頁內選項" : "Internal",
              note: isZh ? "先探索，再挑戰" : "Explore first, battle next",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-white/10 bg-black/46 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
              <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.18em] text-cyan-100/62`}>
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-black text-white">{item.value}</p>
              <p className="mt-1 text-[11px] font-bold text-zinc-500">{item.note}</p>
            </div>
          ))}
        </section>

        <section id="works" className="grid gap-7 scroll-mt-24">
          {loadState === "loading" ? (
            <div className="rounded-md border border-white/10 bg-black/46 px-5 py-12 text-center text-sm font-bold text-zinc-400">
              {isZh ? "正在載入 AI 音樂作品..." : "Loading AI music works..."}
            </div>
          ) : null}
          {loadState === "error" ? (
            <div className="rounded-md border border-red-200/25 bg-red-500/10 px-5 py-8 text-sm font-bold text-red-100">
              {isZh ? "作品載入失敗：" : "Could not load works: "} {loadError}
            </div>
          ) : null}
          {loadState === "ready"
            ? groupedTracks.map((group) => {
                const expanded = Boolean(expandedGenres[group.genre]);
                const visible = expanded ? group.tracks : group.tracks.slice(0, 6);
                return (
                  <section key={group.genre} className="grid gap-3">
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="min-w-0">
                        <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.18em] text-orange-100/58`}>
                          Style Lane
                        </p>
                        <h2 className="mt-1 text-xl font-black text-white">{group.label}</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-black text-zinc-400">
                          {group.tracks.length}
                        </span>
                        {group.tracks.length > 6 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedGenres((current) => ({ ...current, [group.genre]: !expanded }))}
                            className="rounded-md border border-orange-200/35 bg-orange-500/12 px-3 py-1.5 text-[11px] font-black text-orange-50 transition hover:border-orange-100/60 hover:bg-orange-500/20"
                          >
                            {expanded ? (isZh ? "收合" : "Show Less") : isZh ? "看更多" : "See More"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {visible.length > 0 ? (
                      <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 xl:grid-cols-6">
                        {visible.map((track) => (
                          <TrackCard
                            key={track.id}
                            track={track}
                            isZh={isZh}
                            isPlaying={currentTrack?.id === track.id && isPlaying}
                            isExpanded={Boolean(expandedHud[track.id])}
                            interaction={interactions[track.recordKey]}
                            favoriteBusy={Boolean(favoriteBusy[track.recordKey])}
                            lang={lang}
                            onPlay={handlePlayTrack}
                            onToggleExpand={(item) => setExpandedHud((current) => ({ ...current, [item.id]: !current[item.id] }))}
                            onFavorite={(item) => void toggleFavorite(item)}
                            onShare={(item) => void shareTrack(item)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-white/10 bg-black/34 px-4 py-6 text-sm font-bold text-zinc-500">
                        {isZh ? "這個類型目前還沒有可展示作品。" : "No public works in this style yet."}
                      </div>
                    )}
                  </section>
                );
              })
            : null}
        </section>
      </div>

      {notice ? (
        <div className="fixed bottom-24 left-1/2 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-md border border-orange-200/28 bg-black/92 px-4 py-3 text-center text-sm font-bold text-orange-50 shadow-[0_18px_50px_rgba(0,0,0,0.52)]">
          {notice}
        </div>
      ) : null}

      <MiniPlayer
        track={currentTrack}
        isZh={isZh}
        isPlaying={isPlaying}
        interaction={currentTrack ? interactions[currentTrack.recordKey] : undefined}
        favoriteBusy={currentTrack ? Boolean(favoriteBusy[currentTrack.recordKey]) : false}
        lang={lang}
        onTogglePlay={() => {
          if (!currentTrack) return;
          if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
          } else {
            setIsPlaying(true);
          }
        }}
        onFavorite={(track) => void toggleFavorite(track)}
        onShare={(track) => void shareTrack(track)}
        audioRef={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </main>
  );
}
