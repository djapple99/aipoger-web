"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ShareButton from "@/components/share-button";
import ReportButton from "@/components/report-button";
import {
  AIPOGER_BRAND_LOGO,
  AIPOGER_CONTACT_EMAIL,
  AIPOGER_SOCIAL_LINKS,
} from "@/lib/brand";
import {
  looksLikeOpaqueArchiveValue,
  sanitizeSongBattleStatsSnapshot,
  stripCannedBattleReview,
  type ArchivedBattleResult,
  type SongBattleStatsSnapshot,
} from "@/lib/battle-result-archive";
import {
  AIPOGER_PERSONAL_RANK,
  isAipogerIdentity,
  rankLabelForLevel,
  rankForLevel,
} from "@/lib/battle-pool-rules";
import { fontGlowSans, fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import {
  LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
  listenBarRowToTrack,
  type ListenBarTrackRow,
} from "@/lib/listen-bar";
import { supabase } from "@/lib/supabase";

type BoardKey = "drop" | "bar";
type BattleWinnerSide = "fighter_a" | "fighter_b";

type RankRow = {
  id: string;
  kind: "battle" | "bar";
  name: string;
  rank: string;
  title: string;
  hook: string;
  note: string;
  genre: string;
  accent: "orange" | "cyan" | "gold";
  avatarUrl: string;
  coverUrl: string;
  aiTool: string;
  createdAt: string;
  opponentName?: string;
  opponentSong?: string;
  battleCode?: string;
  votesTotal?: number;
  aSideVotes?: number;
  bSideVotes?: number;
  aiReview?: string;
  audienceReview?: string;
  resultHref?: string;
  audioUrl?: string;
  lyrics?: string;
  songStats?: SongBattleStatsSnapshot | null;
  positiveReactions?: number;
};

type BoardMeta = {
  zh: string;
  en: string;
};

type LyricsModalState = {
  title: string;
  artist: string;
  lyrics: string;
};

const BOARD_META: Record<BoardKey, BoardMeta> = {
  drop: { zh: "熱血 Drop 抓波勝利榜", en: "Drop Victory Records" },
  bar: { zh: "傷心酒吧熱播榜", en: "Bar Heartbreak Heat Records" },
};

const BOARD_KEYS: BoardKey[] = ["drop", "bar"];
const MOCK_PATTERN = /(qa-|mock|demo|test|ghost|sample)/i;
const ARCHIVE_SELECT_BASE =
  "battle_id,battle_code,winner,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,final_vote_left,final_vote_right,total_votes,audience_review,result_payload,archived_at";
const ARCHIVE_SELECT_WITH_SONG_STATS = `${ARCHIVE_SELECT_BASE},winner_song_stats_id,winner_song_battle_count,winner_song_wins,winner_song_losses,winner_song_no_contests,winner_song_total_votes_for,winner_song_total_votes_against,winner_song_honor_board_count`;

function safeRankForFighter(name: string, rank?: string | null) {
  const cleanRank = rank?.trim() ?? "";
  if (cleanRank === AIPOGER_PERSONAL_RANK && !isAipogerIdentity(name)) {
    return rankLabelForLevel(1, name);
  }
  return cleanRank || "段位未封存";
}

function mediaSrc(value: string) {
  return value?.trim() || AIPOGER_BRAND_LOGO;
}

function displayText(value: string, fallback: string) {
  return value?.trim() || fallback;
}

function displaySongTitle(value: string, fallback: string) {
  return looksLikeOpaqueArchiveValue(value) ? fallback : displayText(value, fallback);
}

function cleanLyrics(value: string | null | undefined) {
  return String(value || "").trim();
}

function localizedRankLabel(rank: string, isZh: boolean) {
  if (isZh) return rank;
  const cleanRank = rank.trim();
  if (cleanRank === AIPOGER_PERSONAL_RANK) return "LV.0 AIPOGER Founder";
  const level = cleanRank.match(/Lv\.(\d+)/i)?.[1];
  if (!level) return cleanRank || "Rank Missing";
  const rankMeta = rankForLevel(Number(level));
  return `Lv.${rankMeta.level} ${rankMeta.nameEn}`;
}

function accentFromIndex(index: number): RankRow["accent"] {
  if (index === 0) return "gold";
  if (index % 3 === 1) return "orange";
  return "cyan";
}

function accentClasses(accent: RankRow["accent"]) {
  if (accent === "cyan") return "border-cyan-300/30 bg-cyan-300/[0.06] text-cyan-100";
  if (accent === "gold") return "border-yellow-300/35 bg-yellow-400/[0.08] text-yellow-100";
  return "border-orange-300/30 bg-orange-500/[0.08] text-orange-100";
}

function normalizeGenre(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function displayGenre(value: string | null | undefined, isZh: boolean) {
  return String(value || "").trim() || (isZh ? "未分類風格" : "Unsorted Style");
}

function resultHref(row: RankRow, lang: string) {
  const params = new URLSearchParams();
  if (row.resultHref) {
    const [path, rawQuery = ""] = row.resultHref.split("?");
    new URLSearchParams(rawQuery).forEach((value, key) => {
      if (["aiReview", "audienceReview", "votesTotal", "votes", "voteCount"].includes(key)) return;
      params.set(key, value);
    });
    params.set("lang", lang);
    return `${path || "/battle/result"}?${params.toString()}`;
  }

  params.set("winner", row.name);
  params.set("song", displaySongTitle(row.hook, ""));
  params.set("opponent", row.opponentName || "");
  params.set("opponentSong", displaySongTitle(row.opponentSong || "", ""));
  params.set("rank", localizedRankLabel(row.rank, lang === "zh"));
  params.set("tool", row.aiTool);
  params.set("battle", row.battleCode || "");
  params.set("votesTotal", String(row.votesTotal || 0));
  params.set("finalVoteLeft", String(row.aSideVotes || 0));
  params.set("finalVoteRight", String(row.bSideVotes || 0));
  if (row.coverUrl) params.set("coverUrl", row.coverUrl);
  if (row.avatarUrl) params.set("avatarUrl", row.avatarUrl);
  if (row.aiReview) params.set("aiReview", row.aiReview);
  if (row.audienceReview) params.set("audienceReview", row.audienceReview);
  params.set("lang", lang);

  return `/battle/result?${params.toString()}`;
}

function hasArchivedCoreData(entry: ArchivedBattleResult) {
  return Boolean(entry.battleCode && entry.winnerName && entry.winnerSong);
}

function isProbablyMockArchive(entry: ArchivedBattleResult) {
  const signature = `${entry.battleCode} ${entry.battleId ?? ""} ${entry.winnerName} ${entry.opponentName}`.toLowerCase();
  return MOCK_PATTERN.test(signature);
}

function archiveSignature(row: ArchivedBattleResult) {
  return [
    row.battleCode.trim().toLowerCase(),
    row.winnerName.trim().toLowerCase(),
    row.winnerSong.trim().toLowerCase(),
    row.opponentName.trim().toLowerCase(),
    row.opponentSong.trim().toLowerCase(),
  ].join("|");
}

function normalizeVoteCount(value: unknown) {
  const count = Number(value);
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.round(count));
}

function normalizeSongStatsKey(...values: Array<string | null | undefined>) {
  return values
    .map((value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\.(mp3|wav|aiff|aif|m4a)$/i, "")
        .replace(/\s+/g, " "),
    )
    .filter(Boolean)
    .join("|");
}

function emptySongStats(): SongBattleStatsSnapshot {
  return {
    battleCount: 0,
    wins: 0,
    losses: 0,
    noContests: 0,
    totalVotesFor: 0,
    totalVotesAgainst: 0,
    honorBoardCount: 0,
    winRate: 0,
  };
}

function addSongStatsOutcome(
  stats: SongBattleStatsSnapshot,
  outcome: "win" | "loss",
  votesFor: number,
  votesAgainst: number,
) {
  stats.battleCount += 1;
  if (outcome === "win") {
    stats.wins += 1;
    stats.honorBoardCount += 1;
  } else {
    stats.losses += 1;
  }
  stats.totalVotesFor += Math.max(0, votesFor);
  stats.totalVotesAgainst += Math.max(0, votesAgainst);
  stats.winRate = stats.battleCount > 0 ? Math.round((stats.wins / stats.battleCount) * 100) : 0;
}

function voteCountsForArchive(entry: ArchivedBattleResult) {
  const totalVotes = normalizeVoteCount(entry.votesTotal);
  const breakdown = computeVoteBreakdown(
    totalVotes,
    normalizeVoteCount(entry.finalVoteLeft),
    normalizeVoteCount(entry.finalVoteRight),
  );
  const winnerIsB = entry.winnerSide === "fighter_b";
  return {
    winnerVotes: winnerIsB ? breakdown.bVotes : breakdown.aVotes,
    opponentVotes: winnerIsB ? breakdown.aVotes : breakdown.bVotes,
  };
}

function applyFallbackSongStats(rows: ArchivedBattleResult[]) {
  const statsBySong = new Map<string, SongBattleStatsSnapshot>();
  for (const row of rows) {
    const winnerKey = normalizeSongStatsKey(row.winnerName, row.winnerSong);
    const opponentKey = normalizeSongStatsKey(row.opponentName, row.opponentSong);
    const { winnerVotes, opponentVotes } = voteCountsForArchive(row);
    if (winnerKey) {
      const stats = statsBySong.get(winnerKey) ?? emptySongStats();
      addSongStatsOutcome(stats, "win", winnerVotes, opponentVotes);
      statsBySong.set(winnerKey, stats);
    }
    if (opponentKey) {
      const stats = statsBySong.get(opponentKey) ?? emptySongStats();
      addSongStatsOutcome(stats, "loss", opponentVotes, winnerVotes);
      statsBySong.set(opponentKey, stats);
    }
  }

  return rows.map((row) => {
    if (row.songStats && row.songStats.battleCount > 0) return row;
    const fallback = statsBySong.get(normalizeSongStatsKey(row.winnerName, row.winnerSong));
    return fallback ? { ...row, songStats: fallback } : row;
  });
}

function formatSongStats(stats: SongBattleStatsSnapshot | null | undefined, isZh: boolean) {
  if (!stats || stats.battleCount <= 0) return "";
  const winRate = stats.winRate || Math.round((stats.wins / stats.battleCount) * 100);
  const honor = stats.honorBoardCount > 0 ? ` · ${isZh ? "榮譽榜" : "Honor"} ${stats.honorBoardCount}` : "";
  if (stats.noContests > 0) {
    return isZh
      ? `出戰 ${stats.battleCount} 次 · ${stats.wins} 勝 ${stats.losses} 敗 ${stats.noContests} 未分勝負 · 勝率 ${winRate}%${honor}`
      : `${stats.battleCount} battles · ${stats.wins}W ${stats.losses}L ${stats.noContests} NC · ${winRate}%${honor}`;
  }
  return isZh
    ? `出戰 ${stats.battleCount} 次 · ${stats.wins} 勝 ${stats.losses} 敗 · 勝率 ${winRate}%${honor}`
    : `${stats.battleCount} battles · ${stats.wins}W ${stats.losses}L · ${winRate}%${honor}`;
}

function normalizeWinnerSide(value: unknown): BattleWinnerSide | null {
  return value === "fighter_a" || value === "fighter_b" ? value : null;
}

function computeVoteBreakdown(votesTotal: number, aRaw: number, bRaw: number) {
  if (votesTotal <= 0) return { votesTotal: 0, aVotes: 0, bVotes: 0 };
  if (aRaw >= 0 && bRaw >= 0 && aRaw + bRaw === 100) {
    const aVotes = Math.round((votesTotal * aRaw) / 100);
    return { votesTotal, aVotes, bVotes: Math.max(0, votesTotal - aVotes) };
  }
  if (aRaw >= 0 && bRaw >= 0 && aRaw + bRaw === votesTotal) {
    return { votesTotal, aVotes: Math.round(aRaw), bVotes: Math.round(bRaw) };
  }
  if (aRaw >= 0 && bRaw >= 0 && aRaw + bRaw > 0) {
    const sum = aRaw + bRaw;
    const aVotes = Math.round((votesTotal * aRaw) / sum);
    return { votesTotal, aVotes, bVotes: Math.max(0, votesTotal - aVotes) };
  }
  return { votesTotal, aVotes: 0, bVotes: 0 };
}

function rowFromArchive(entry: ArchivedBattleResult, index: number): RankRow {
  const totalVotes = normalizeVoteCount(entry.votesTotal);
  const breakdown = computeVoteBreakdown(
    totalVotes,
    normalizeVoteCount(entry.finalVoteLeft),
    normalizeVoteCount(entry.finalVoteRight),
  );

  return {
    id: entry.battleId || entry.battleCode || entry.id,
    kind: "battle",
    name: entry.winnerName,
    rank: safeRankForFighter(entry.winnerName, entry.rank),
    title: "Drop 抓波勝利",
    hook: entry.winnerSong,
    note: displayText(entry.genre, "AI Music"),
    genre: displayText(entry.genre, "AI Music"),
    accent: accentFromIndex(index),
    avatarUrl: entry.avatarUrl,
    coverUrl: entry.coverUrl,
    aiTool: entry.tool,
    createdAt: entry.createdAt,
    opponentName: entry.opponentName,
    opponentSong: entry.opponentSong,
    battleCode: entry.battleCode,
    votesTotal: breakdown.votesTotal,
    aSideVotes: breakdown.aVotes,
    bSideVotes: breakdown.bVotes,
    aiReview: stripCannedBattleReview(entry.aiReview),
    audienceReview: stripCannedBattleReview(entry.audienceReview),
    resultHref: entry.resultHref,
    audioUrl: entry.audioUrl,
    lyrics: cleanLyrics(entry.lyrics) || undefined,
    songStats: entry.songStats,
  };
}

function mergeArchives(remoteRows: ArchivedBattleResult[]) {
  const unique = new Map<string, ArchivedBattleResult>();
  for (const row of remoteRows) {
    if (!hasArchivedCoreData(row)) continue;
    if (isProbablyMockArchive(row)) continue;
    const key = archiveSignature(row);
    if (!unique.has(key)) unique.set(key, row);
  }
  return [...unique.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function hotBarRowsFromTracks(tracks: ListenBarTrackRow[]) {
  return tracks
    .map((row) => ({ row, track: listenBarRowToTrack(row) }))
    .filter((item): item is { row: ListenBarTrackRow; track: NonNullable<ReturnType<typeof listenBarRowToTrack>> } => Boolean(item.track))
    .filter(({ track }) => track.source !== "official")
    .filter(({ track }) => (track.positiveReactionCount || 0) >= LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD)
    .sort((a, b) => {
      const byReaction = (b.track.positiveReactionCount || 0) - (a.track.positiveReactionCount || 0);
      if (byReaction !== 0) return byReaction;
      return new Date(b.track.createdAt || 0).getTime() - new Date(a.track.createdAt || 0).getTime();
    })
    .slice(0, 6)
    .map<RankRow>(({ row, track }, index) => ({
      id: `bar-${track.id}`,
      kind: "bar",
      name: track.artist,
      rank: track.queuedByRank || "創作者投稿",
      title: "傷心酒吧熱播",
      hook: track.title,
      note: track.mood || row.genre?.trim() || "AI Music",
      genre: row.genre?.trim() || track.mood || "AI Music",
      accent: accentFromIndex(index),
      avatarUrl: track.coverUrl || AIPOGER_BRAND_LOGO,
      coverUrl: track.coverUrl || AIPOGER_BRAND_LOGO,
      aiTool: track.tool || "AI Music",
      createdAt: track.createdAt || new Date().toISOString(),
      audioUrl: track.audioUrl,
      lyrics: cleanLyrics(track.lyrics) || undefined,
      positiveReactions: Math.max(0, Math.round(track.positiveReactionCount || 0)),
    }));
}

async function fetchBattleArchivesForRank() {
  const responseWithStats = await supabase
    .from("battle_result_archives")
    .select(ARCHIVE_SELECT_WITH_SONG_STATS)
    .order("archived_at", { ascending: false })
    .limit(200);

  if (responseWithStats.error) {
    const msg = `${responseWithStats.error.message ?? ""} ${responseWithStats.error.details ?? ""} ${responseWithStats.error.hint ?? ""}`;
    if (/winner_song_|battle_song_stats|schema cache|does not exist|PGRST204/i.test(msg)) {
      return supabase
        .from("battle_result_archives")
        .select(ARCHIVE_SELECT_BASE)
        .order("archived_at", { ascending: false })
        .limit(200);
    }
  }

  return responseWithStats;
}

function battleAudioPathToUrl(path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return Promise.resolve<string | null>(null);
  if (/^(https?:|blob:|data:)/i.test(clean)) return Promise.resolve(clean);
  return supabase.storage
    .from("battle-audio")
    .createSignedUrl(clean, 60 * 10)
    .then(({ data, error }) => {
      if (error) {
        console.warn("[rank battle audio]", error.message);
        return null;
      }
      return data?.signedUrl ?? null;
    });
}

async function attachBattleAudioUrls(rows: ArchivedBattleResult[]) {
  const battleIds = Array.from(new Set(rows.map((row) => row.battleId).filter((id): id is string => Boolean(id))));
  if (battleIds.length === 0) return rows;

  const battleRowsWithLyrics = await supabase
    .from("battles")
    .select("id,winner,fighter_a_name,fighter_b_name,song_a_name,song_b_name,ai_tool_a,ai_tool_b,audio_a_path,audio_b_path,lyrics_a,lyrics_b")
    .in("id", battleIds);
  let battleRowsData: unknown = battleRowsWithLyrics.data;
  let battleRowsError = battleRowsWithLyrics.error;

  if (battleRowsError) {
    const msg = `${battleRowsError.message ?? ""} ${battleRowsError.details ?? ""} ${battleRowsError.hint ?? ""}`;
    if (/lyrics_a|lyrics_b|schema cache|does not exist|PGRST204/i.test(msg)) {
      const fallbackRows = await supabase
        .from("battles")
        .select("id,winner,fighter_a_name,fighter_b_name,song_a_name,song_b_name,ai_tool_a,ai_tool_b,audio_a_path,audio_b_path")
        .in("id", battleIds);
      battleRowsData = fallbackRows.data;
      battleRowsError = fallbackRows.error;
    }
  }

  if (battleRowsError) {
    console.warn("[rank battle audio rows]", battleRowsError.message);
    return rows;
  }

  const truthByBattle = new Map<
    string,
    {
      winner: BattleWinnerSide | null;
      fighterAName: string;
      fighterBName: string;
      songAName: string;
      songBName: string;
      aiToolA: string;
      aiToolB: string;
      audioUrl: string | null;
      winnerLyrics: string;
    }
  >();
  await Promise.all(
    ((battleRowsData ?? []) as Array<{
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
      lyrics_a?: string | null;
      lyrics_b?: string | null;
    }>).map(async (battle) => {
      if (!battle.id) return;
      const winner = normalizeWinnerSide(battle.winner);
      const winnerPath = winner === "fighter_b" ? battle.audio_b_path : battle.audio_a_path;
      const winnerLyrics = cleanLyrics(winner === "fighter_b" ? battle.lyrics_b : battle.lyrics_a);
      truthByBattle.set(battle.id, {
        winner,
        fighterAName: String(battle.fighter_a_name || "").trim(),
        fighterBName: String(battle.fighter_b_name || "").trim(),
        songAName: String(battle.song_a_name || "").trim(),
        songBName: String(battle.song_b_name || "").trim(),
        aiToolA: String(battle.ai_tool_a || "").trim(),
        aiToolB: String(battle.ai_tool_b || "").trim(),
        audioUrl: await battleAudioPathToUrl(winnerPath),
        winnerLyrics,
      });
    }),
  );

  return rows.map((row) => {
    const truth = row.battleId ? truthByBattle.get(row.battleId) : null;
    const archivedSide = normalizeWinnerSide(row.winnerSide);
    const reconciled =
      truth?.winner && archivedSide && truth.winner !== archivedSide
        ? {
            ...row,
            winnerSide: truth.winner,
            winnerName: truth.winner === "fighter_b" ? truth.fighterBName || row.opponentName : truth.fighterAName || row.opponentName,
            winnerSong: truth.winner === "fighter_b" ? truth.songBName || row.opponentSong : truth.songAName || row.opponentSong,
            tool: truth.winner === "fighter_b" ? truth.aiToolB || row.tool : truth.aiToolA || row.tool,
            opponentName: truth.winner === "fighter_b" ? truth.fighterAName || row.winnerName : truth.fighterBName || row.winnerName,
            opponentSong: truth.winner === "fighter_b" ? truth.songAName || row.winnerSong : truth.songBName || row.winnerSong,
            coverUrl: row.opponentCoverUrl || row.coverUrl,
            avatarUrl: row.opponentAvatarUrl || row.avatarUrl,
            opponentCoverUrl: row.coverUrl || row.opponentCoverUrl,
            opponentAvatarUrl: row.avatarUrl || row.opponentAvatarUrl,
          }
        : row;
    return {
      ...reconciled,
      audioUrl: reconciled.audioUrl || (row.battleId ? truth?.audioUrl || undefined : undefined),
      lyrics: cleanLyrics(reconciled.lyrics) || (row.battleId ? truth?.winnerLyrics || undefined : undefined),
    };
  });
}

function LyricsAction({
  row,
  isZh,
  onOpen,
}: {
  row: RankRow;
  isZh: boolean;
  onOpen: (row: RankRow) => void;
}) {
  const hasLyrics = Boolean(cleanLyrics(row.lyrics));
  if (!hasLyrics) {
    return (
      <span className="inline-flex cursor-default items-center justify-center rounded-full border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px] font-black text-zinc-500">
        {isZh ? "歌詞未提供" : "No Lyrics"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="inline-flex items-center justify-center rounded-full border border-yellow-200/35 bg-yellow-300/10 px-2.5 py-1.5 text-[11px] font-black text-yellow-100 transition hover:border-yellow-100 hover:bg-yellow-300/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/70"
    >
      {isZh ? "歌詞" : "Lyrics"}
    </button>
  );
}

export default function RankPage() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [active, setActive] = useState<BoardKey>("drop");
  const [activeGenre, setActiveGenre] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [archivedResults, setArchivedResults] = useState<ArchivedBattleResult[]>([]);
  const [hotBarRows, setHotBarRows] = useState<RankRow[]>([]);
  const [lyricsModal, setLyricsModal] = useState<LyricsModalState | null>(null);
  const navSuffix = lang === "en" ? "?lang=en" : "?lang=zh";
  const boardTitle = isZh ? BOARD_META[active].zh : BOARD_META[active].en;

  const openLyricsModal = (row: RankRow) => {
    const lyrics = cleanLyrics(row.lyrics);
    if (!lyrics) return;
    setLyricsModal({
      title: displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived"),
      artist: row.name,
      lyrics,
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      const [
        { data: archiveData, error: archiveError },
        { data: hotData, error: hotError },
      ] = await Promise.all([
        fetchBattleArchivesForRank(),
        supabase
          .from("listen_bar_tracks")
          .select(
            "id,title,artist,ai_tool,genre,mood,bpm,duration_seconds,audio_path,cover_path,lyrics,is_active,source,is_featured_official,positive_reaction_count,heart_count,star_count,thumb_count,happy_count,created_at",
          )
          .eq("is_active", true)
          .order("positive_reaction_count", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(120),
      ]);

      if (archiveError) {
        console.warn("[rank archives]", archiveError.message);
      }
      if (hotError && !/schema cache|does not exist|permission denied/i.test(hotError.message || "")) {
        console.warn("[rank hot tracks]", hotError.message);
      }

      const mappedArchives: ArchivedBattleResult[] = Array.isArray(archiveData)
        ? archiveData.map((rawRow) => {
            const row = rawRow as Record<string, unknown>;
            const payload =
              typeof row.result_payload === "object" && row.result_payload !== null
                ? (row.result_payload as Record<string, unknown>)
                : {};
            const finalVoteLeft = normalizeVoteCount(row.final_vote_left);
            const finalVoteRight = normalizeVoteCount(row.final_vote_right);
            const tableVoteTotal = normalizeVoteCount(row.total_votes);
            const payloadVoteTotal = normalizeVoteCount(
              payload.votesTotal ?? payload.votes ?? payload.voteCount,
            );
            const hasPayloadVoteTotal = payloadVoteTotal > 0;
            const tableLooksLikePercentTotal =
              tableVoteTotal === 100 &&
              finalVoteLeft + finalVoteRight === 100 &&
              !hasPayloadVoteTotal;
            const payloadSongStats =
              typeof payload.songStats === "object" && payload.songStats !== null
                ? (payload.songStats as Record<string, unknown>).winner
                : null;
            const tableSongStats = sanitizeSongBattleStatsSnapshot({
              battleCount: row.winner_song_battle_count,
              wins: row.winner_song_wins,
              losses: row.winner_song_losses,
              noContests: row.winner_song_no_contests,
              totalVotesFor: row.winner_song_total_votes_for,
              totalVotesAgainst: row.winner_song_total_votes_against,
              honorBoardCount: row.winner_song_honor_board_count,
            });
            return {
              id: String(row.battle_id || row.battle_code || ""),
              battleId: row.battle_id ? String(row.battle_id) : null,
              battleCode: String(row.battle_code || ""),
              winnerSide: normalizeWinnerSide(row.winner),
              winnerName: String(row.winner_name || "").trim(),
              winnerSong: String(row.winner_song_name || "").trim(),
              opponentName: String(row.opponent_name || "").trim(),
              opponentSong: String(row.opponent_song_name || "").trim(),
              rank: safeRankForFighter(
                String(row.winner_name || ""),
                typeof payload.rank === "string" ? payload.rank : null,
              ),
              tool: String(row.winner_ai_tool || payload.tool || "").trim(),
              genre: String(payload.genre || "AI Music").trim(),
              coverUrl: String(payload.coverUrl || "").trim(),
              avatarUrl: String(payload.avatarUrl || "").trim(),
              opponentCoverUrl:
                typeof payload.opponentCoverUrl === "string" ? payload.opponentCoverUrl : null,
              opponentAvatarUrl:
                typeof payload.opponentAvatarUrl === "string" ? payload.opponentAvatarUrl : null,
              finalVoteLeft,
              finalVoteRight,
              votesTotal: hasPayloadVoteTotal
                ? payloadVoteTotal
                : tableLooksLikePercentTotal
                  ? 0
                  : tableVoteTotal,
              audienceReview: String(row.audience_review || payload.audienceReview || "").trim(),
              aiReview: String(payload.aiReview || "").trim(),
              feedbackA:
                typeof payload.feedbackA === "object" && payload.feedbackA !== null
                  ? (payload.feedbackA as ArchivedBattleResult["feedbackA"])
                  : { rhyme: 0, impact: 0, melody: 0, emotion: 0, structure: 0 },
              feedbackB:
                typeof payload.feedbackB === "object" && payload.feedbackB !== null
                  ? (payload.feedbackB as ArchivedBattleResult["feedbackB"])
                  : { rhyme: 0, impact: 0, melody: 0, emotion: 0, structure: 0 },
              resultHref: String(payload.resultHref || "").trim(),
              audioUrl: typeof payload.audioUrl === "string" ? payload.audioUrl.trim() : undefined,
              lyrics: typeof payload.lyrics === "string" ? payload.lyrics.trim() : undefined,
              songStats:
                tableSongStats && tableSongStats.battleCount > 0
                  ? tableSongStats
                  : sanitizeSongBattleStatsSnapshot(payloadSongStats),
              createdAt: String(row.archived_at || new Date().toISOString()),
            };
          })
        : [];

      const merged = await attachBattleAudioUrls(applyFallbackSongStats(mergeArchives(mappedArchives)));
      const hotRows = Array.isArray(hotData) ? hotBarRowsFromTracks(hotData as ListenBarTrackRow[]) : [];

      if (!cancelled) {
        setArchivedResults(merged);
        setHotBarRows(hotRows);
      }
    };

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const dropRows = useMemo(() => {
    return archivedResults.slice(0, 10).map((entry, index) => rowFromArchive(entry, index));
  }, [archivedResults]);

  const displayRows = useMemo(() => {
    if (active === "bar") return hotBarRows;
    return dropRows;
  }, [active, hotBarRows, dropRows]);

  useEffect(() => {
    setActiveGenre("all");
  }, [active]);

  useEffect(() => {
    if (!lyricsModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLyricsModal(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lyricsModal]);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  const searchedDisplayRows = useMemo(() => {
    if (!normalizedSearchTerm) return displayRows;
    return displayRows.filter((row) =>
      [
        row.name,
        row.hook,
        row.opponentName,
        row.opponentSong,
        row.genre,
        row.note,
        row.aiTool,
        row.battleCode,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearchTerm)),
    );
  }, [displayRows, normalizedSearchTerm]);

  const genreCounts = useMemo(() => {
    return searchedDisplayRows.reduce<Record<string, { label: string; count: number }>>((acc, row) => {
      const label = displayGenre(row.genre || row.note, isZh);
      const key = normalizeGenre(label);
      acc[key] = { label, count: (acc[key]?.count ?? 0) + 1 };
      return acc;
    }, {});
  }, [searchedDisplayRows, isZh]);

  const genreOptions = useMemo(() => {
    return Object.values(genreCounts).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [genreCounts]);

  const filteredDisplayRows = useMemo(() => {
    if (activeGenre === "all") return searchedDisplayRows;
    return searchedDisplayRows.filter((row) => normalizeGenre(row.genre || row.note) === activeGenre);
  }, [activeGenre, searchedDisplayRows]);

  const displayGroups = useMemo(() => {
    const groups = new Map<string, RankRow[]>();
    filteredDisplayRows.forEach((row) => {
      const label = displayGenre(row.genre || row.note, isZh);
      const existing = groups.get(label) ?? [];
      existing.push(row);
      groups.set(label, existing);
    });
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [filteredDisplayRows, isZh]);

  const activeBadge = active === "bar" ? "HOT" : "WIN";
  const featuredRows = filteredDisplayRows.slice(0, 4);
  const boardCount = displayRows.length;
  const genreCount = genreOptions.length;

  return (
    <main
      className={`${fontGlowSans.className} aipo-stage-bg relative min-h-screen overflow-hidden px-4 py-5 text-white sm:px-6 lg:px-8`}
    >
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_15%_0%,rgba(255,106,0,0.18),transparent_28%),radial-gradient(circle_at_92%_6%,rgba(0,202,255,0.12),transparent_26%),linear-gradient(180deg,#060606,#0a0806_48%,#050505)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="aipo-control-panel aipo-panel-line flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] px-4 py-3">
          <div className="h-11 w-16" aria-hidden="true" />
          <nav className="flex flex-wrap items-center gap-2 sm:pr-20">
            {[
              { href: "/battle", label: isZh ? "AI 音樂鬥歌場" : "AI Music Battle Hall" },
              { href: "/listen-bar", label: isZh ? "傷心酒吧" : "Bar Heartbreak" },
              { href: "/hook-guide", label: isZh ? "Drop Battle 規則" : "Drop Battle Rules" },
            ].map((item) => (
              <Link
                key={item.href}
                href={`${item.href}${navSuffix}`}
                className="aipo-ghost-button rounded-full px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
              {isZh ? "AIPOGER 榮譽榜" : "AIPOGER Honor Board"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
              {isZh
                ? "這裡只收被聽眾票數打出來的 AI 音樂戰績。勝出的 Drop、熱播的歌，會在這裡被封存、被分享、被下一位創作者挑戰。"
                : "This board archives AI music records earned by listener votes. Winning Drops and hot tracks are preserved, shared, and ready to be challenged again."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ShareButton
                title={isZh ? "AIPOGER 榮譽榜" : "AIPOGER Honor Board"}
                text={
                  isZh
                    ? "來看 AIPOGER 真實 Drop 勝利與傷心酒吧熱播紀錄。"
                    : "Check real AIPOGER Drop victories and Bar Heartbreak hot tracks."
                }
                label={isZh ? "分享榮譽榜" : "Share Board"}
                copiedLabel={isZh ? "榮譽榜連結已複製" : "Board Link Copied"}
                className="!px-4 !py-2 !text-xs border-yellow-200/45 bg-yellow-300/12 text-yellow-100 hover:bg-yellow-300/18"
              />
              <Link
                href={`/battle/setup${navSuffix}`}
                className="aipo-primary-button inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-black transition"
              >
                {isZh ? "我要參戰" : "Join Battle"}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-y border-white/10 py-3 lg:border-y-0 lg:border-l lg:py-0 lg:pl-5">
            {[
              { label: isZh ? "作品" : "Records", value: boardCount },
              { label: isZh ? "風格" : "Styles", value: genreCount },
              { label: isZh ? "精選" : "Featured", value: featuredRows.length },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex flex-wrap gap-2">
                {BOARD_KEYS.map((key) => {
                  const selected = active === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActive(key)}
                      className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                        selected
                          ? "aipo-primary-button text-black"
                          : "aipo-ghost-button text-zinc-300 hover:text-white"
                      }`}
                    >
                      {isZh ? BOARD_META[key].zh : BOARD_META[key].en}
                    </button>
                  );
                })}
              </div>
              <ShareButton
                title={isZh ? `${boardTitle} / AIPOGER 榮譽榜` : `${boardTitle} / AIPOGER Honor Board`}
                text={
                  isZh
                    ? `來看 AIPOGER ${boardTitle}，只顯示真實紀錄。`
                    : `Check the AIPOGER ${boardTitle} with real records only.`
                }
                label={isZh ? "分享這個榜" : "Share Board"}
                copiedLabel={isZh ? "榮譽榜連結已複製" : "Board Copied"}
                className="!px-3 !py-2 !text-xs"
              />
            </div>

            <div className="aipo-control-panel mt-4 rounded-[1.15rem] p-2">
              <label className="grid gap-2 sm:grid-cols-[5.25rem_1fr_auto] sm:items-center">
                <span className={`${fontRighteous.className} text-xs uppercase tracking-[0.18em] text-cyan-100/70`}>
                  SEARCH
                </span>
                <input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setActiveGenre("all");
                  }}
                  placeholder={isZh ? "搜尋歌手、歌名、對手、風格或 AI 工具" : "Search artist, song, opponent, style, or AI tool"}
                  className="aipo-input h-10 min-w-0 rounded-md px-3 text-sm font-bold transition placeholder:text-zinc-600"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveGenre("all");
                    }}
                    className="aipo-ghost-button h-10 rounded-md px-3 text-xs font-black text-zinc-300 transition hover:text-white"
                  >
                    {isZh ? "清除" : "Clear"}
                  </button>
                ) : (
                  <span className="hidden rounded-md border border-white/10 bg-black/35 px-3 py-2 text-xs font-black text-zinc-500 sm:inline-flex">
                    {searchedDisplayRows.length}/{displayRows.length}
                  </span>
                )}
              </label>
            </div>

            <div className="space-y-8 pt-5">
              {filteredDisplayRows.length === 0 ? (
                <div className="aipo-control-panel rounded-[1.15rem] px-5 py-10 text-center">
                  <Image
                    src={AIPOGER_BRAND_LOGO}
                    alt="AIPOGER"
                    width={72}
                    height={72}
                    className="mx-auto h-[4.5rem] w-[4.5rem] rounded-lg object-cover"
                  />
                  <p className="text-lg font-black text-white">
                    {isZh ? "目前沒有完整封存的正式紀錄" : "No Complete Archived Records Yet"}
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-zinc-500">
                    {isZh
                      ? "榮譽榜只顯示真實資料，等作品完成勝利或熱播紀錄後會出現在這裡。"
                      : "Only real archived data is shown here."}
                  </p>
                </div>
              ) : (
                <>
                  {featuredRows.length > 0 ? (
                    <section>
                      <div className="mb-3 flex items-end justify-between gap-3">
                        <div>
                          <p className={`${fontRighteous.className} text-xs uppercase text-orange-300/70`}>
                            FEATURED
                          </p>
                          <h2 className="mt-1 text-xl font-black text-white">
                            {isZh ? "榮譽精選" : "Featured Records"}
                          </h2>
                        </div>
                        <p className="text-xs font-bold text-zinc-500">
                          {isZh ? "小圖展示，重點回到作品" : "Compact shelf, music first"}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {featuredRows.map((row, index) => {
                          const rowResultHref = resultHref(row, lang);
                          return (
                            <article
                              key={`featured-${active}-${row.id}-${index}`}
                              className="aipo-control-panel group overflow-hidden rounded-lg transition hover:border-orange-300/45 hover:bg-white/[0.055]"
                            >
                              <div className="relative aspect-[16/9] overflow-hidden bg-black">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={mediaSrc(row.coverUrl)}
                                  alt={displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                />
                                <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5">
                                  <span className="rounded-full border border-black/50 bg-black/76 px-2 py-1 text-[10px] font-black text-yellow-100">
                                    {activeBadge}
                                  </span>
                                  <span className="max-w-[8rem] truncate rounded-full border border-cyan-100/25 bg-black/70 px-2 py-1 text-[10px] font-black text-cyan-100">
                                    {displayGenre(row.genre || row.note, isZh)}
                                  </span>
                                </div>
                              </div>
                              <div className="p-3">
                                <h3 className="truncate text-sm font-black text-white">
                                  {displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                                </h3>
                                <p className="mt-1 truncate text-xs font-bold text-zinc-400">{row.name}</p>
                                {row.kind === "battle" && row.songStats?.battleCount ? (
                                  <p className="mt-2 line-clamp-2 text-[11px] font-black leading-4 text-yellow-100/90">
                                    {formatSongStats(row.songStats, isZh)}
                                  </p>
                                ) : null}
                                {row.kind === "battle" ? (
                                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    <LyricsAction row={row} isZh={isZh} onOpen={openLyricsModal} />
                                    <Link
                                      href={rowResultHref}
                                      className="inline-flex rounded-full border border-orange-200/30 px-3 py-1.5 text-[11px] font-black text-orange-100 transition hover:border-orange-100 hover:text-white"
                                    >
                                      {isZh ? "成果卡" : "Result"}
                                    </Link>
                                    <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-black text-cyan-100">
                                      {displayText(row.aiTool, isZh ? "AI 工具未封存" : "AI Tool Missing")}
                                    </span>
                                  </div>
                                ) : row.audioUrl ? (
                                  <>
                                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                      <LyricsAction row={row} isZh={isZh} onOpen={openLyricsModal} />
                                    </div>
                                    <audio
                                      className="mt-3 h-9 w-full accent-orange-500"
                                      controls
                                      controlsList="nodownload"
                                      onContextMenu={(event) => event.preventDefault()}
                                      preload="metadata"
                                      src={row.audioUrl}
                                    >
                                      {isZh ? "你的瀏覽器暫時不支援播放。" : "Your browser does not support audio playback."}
                                    </audio>
                                  </>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <section>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className={`${fontRighteous.className} text-xs uppercase text-cyan-100/55`}>
                          {active === "bar" ? "BAR HEARTBREAK" : "DROP BATTLE"}
                        </p>
                        <h2 className="mt-1 text-2xl font-black text-white">{boardTitle}</h2>
                      </div>
                      <span className="text-xs font-bold text-zinc-500">
                        {filteredDisplayRows.length} {isZh ? "筆紀錄" : "records"}
                      </span>
                    </div>

                    <div className="space-y-7">
                      {displayGroups.map(([genreLabel, rows]) => (
                        <div key={`${active}-${genreLabel}`}>
                          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                            <h3 className="text-lg font-black text-white">{genreLabel}</h3>
                            <span className="text-xs font-black text-zinc-500">
                              {rows.length} {isZh ? "首" : "tracks"}
                            </span>
                          </div>
                          <div className="grid gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-4">
                            {rows.map((row, index) => {
                              const rowResultHref = resultHref(row, lang);
                              return (
                                <article
                                  key={`${active}-${genreLabel}-${row.id}-${index}`}
                                  className={`group min-w-0 rounded-lg border p-2.5 transition hover:-translate-y-0.5 hover:bg-white/[0.055] ${accentClasses(row.accent)}`}
                                >
                                  <div className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-black">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={mediaSrc(row.coverUrl)}
                                      alt={displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                                    />
                                    <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1.5">
                                      <span className="rounded-full border border-black/45 bg-black/76 px-2 py-1 text-[10px] font-black text-white">
                                        {activeBadge}
                                      </span>
                                      <span className="max-w-[8rem] truncate rounded-full border border-cyan-100/25 bg-black/70 px-2 py-1 text-[10px] font-black text-cyan-100">
                                        {displayGenre(row.genre || row.note, isZh)}
                                      </span>
                                    </div>
                                    <div className="absolute bottom-3 left-3 h-14 w-14 overflow-hidden rounded-full border-[3px] border-white/80 bg-black shadow-[0_0_28px_rgba(255,255,255,0.18)]">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img src={mediaSrc(row.avatarUrl)} alt={row.name} className="h-full w-full object-cover" />
                                    </div>
                                  </div>

                                  <div className="min-h-[8.2rem] pt-3">
                                    <h3 className="line-clamp-2 text-[15px] font-black leading-5 text-white">
                                      {displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                                    </h3>
                                    <p className="mt-1 truncate text-sm font-bold text-zinc-300">{row.name}</p>
                                    <p className="mt-1 truncate text-xs font-bold text-zinc-500">
                                      {row.kind === "battle"
                                        ? `VS ${displayText(row.opponentName || "", isZh ? "對手未封存" : "Opponent Missing")}`
                                        : row.note || (isZh ? "傷心酒吧熱播紀錄" : "Bar Heartbreak heat record")}
                                    </p>
                                    {row.kind === "battle" && row.songStats?.battleCount ? (
                                      <p className="mt-2 line-clamp-2 text-[11px] font-black leading-4 text-yellow-100/90">
                                        {formatSongStats(row.songStats, isZh)}
                                      </p>
                                    ) : null}
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      <span className="rounded-full border border-white/12 bg-black/28 px-2 py-1 text-[10px] font-bold text-zinc-100">
                                        {displayGenre(row.genre || row.note, isZh)}
                                      </span>
                                      <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-black text-cyan-100">
                                        {displayText(row.aiTool, isZh ? "未封存工具" : "Tool Missing")}
                                      </span>
                                    </div>
                                    <p className="mt-2 truncate text-xs font-bold text-zinc-500">
                                      {row.kind === "battle"
                                        ? row.votesTotal && row.votesTotal > 0
                                          ? `${row.votesTotal.toLocaleString()} ${isZh ? "票" : "votes"}`
                                          : isZh
                                            ? "封存勝利"
                                            : "Archived win"
                                        : isZh
                                          ? `正向反應 ${(row.positiveReactions || 0).toLocaleString()}`
                                          : `Positive ${(row.positiveReactions || 0).toLocaleString()}`}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                                    <LyricsAction row={row} isZh={isZh} onOpen={openLyricsModal} />
                                    {row.kind === "battle" ? (
                                      <>
                                        <Link
                                          href={rowResultHref}
                                          className="inline-flex items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-black text-cyan-100 transition hover:border-cyan-100 hover:text-white"
                                        >
                                          {isZh ? "成果卡" : "Result"}
                                        </Link>
                                        <span className="inline-flex items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-black text-cyan-100">
                                          {displayText(row.aiTool, isZh ? "AI 工具未封存" : "AI Tool Missing")}
                                        </span>
                                        <ShareButton
                                          title={`${row.name} VS ${displayText(row.opponentName || "", isZh ? "對手" : "Opponent")}`}
                                          text={
                                            isZh
                                              ? `AIPOGER 戰績：${row.name} VS ${displayText(row.opponentName || "", "對手")}`
                                              : `AIPOGER result: ${row.name} VS ${displayText(row.opponentName || "", "Opponent")}`
                                          }
                                          url={rowResultHref}
                                          label={isZh ? "分享" : "Share"}
                                          copiedLabel={isZh ? "已複製" : "Copied"}
                                          className="!px-2.5 !py-1.5 !text-[11px]"
                                        />
                                      </>
                                    ) : (
                                      <ShareButton
                                        title={`${row.name} / ${displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}`}
                                        text={
                                          isZh
                                            ? `AIPOGER 傷心酒吧熱播：${displaySongTitle(row.hook, "歌名未封存")}`
                                            : `AIPOGER Bar Heartbreak heat: ${displaySongTitle(row.hook, "Song Not Archived")}`
                                        }
                                        url={`/rank?lang=${lang}`}
                                        label={isZh ? "分享" : "Share"}
                                        copiedLabel={isZh ? "已複製" : "Copied"}
                                        className="!px-2.5 !py-1.5 !text-[11px]"
                                      />
                                    )}
                                    <ReportButton
                                      targetType={row.kind === "battle" ? "battle_result" : "listen_bar_track"}
                                      targetId={row.kind === "battle" ? row.battleCode || row.id : row.id}
                                      targetTitle={`${row.name} / ${displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}`}
                                      targetUrl={row.kind === "battle" ? rowResultHref : `/rank?lang=${lang}`}
                                      context={`Honor board row kind=${row.kind}`}
                                      lang={lang}
                                      className="!px-2.5 !py-1.5 !text-[11px]"
                                    />
                                  </div>

                                  {row.audioUrl ? (
                                    <audio
                                      className="mt-2 h-9 w-full accent-orange-500"
                                      controls
                                      controlsList="nodownload"
                                      onContextMenu={(event) => event.preventDefault()}
                                      preload="metadata"
                                      src={row.audioUrl}
                                    >
                                      {isZh ? "你的瀏覽器暫時不支援播放。" : "Your browser does not support audio playback."}
                                    </audio>
                                  ) : null}
                                </article>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>

          </div>

          <aside className="lg:sticky lg:top-5 lg:self-start lg:border-l lg:border-white/10 lg:pl-6">
            <div className="border-b border-white/10 pb-4">
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.16em] text-zinc-500`}>
                {isZh ? "音樂風格" : "Music Style"}
              </p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => setActiveGenre("all")}
                  className={`flex items-center justify-between rounded-full border px-3 py-2 text-left text-xs font-black transition ${
                    activeGenre === "all"
                      ? "border-yellow-200/55 bg-yellow-300 text-black"
                      : "border-white/10 bg-white/[0.035] text-zinc-300 hover:border-yellow-200/35 hover:text-white"
                  }`}
                >
                  <span>{isZh ? "所有類型" : "All Styles"}</span>
                  <span className="opacity-65">{displayRows.length}</span>
                </button>
                {genreOptions.map((genre) => {
                  const key = normalizeGenre(genre.label);
                  const selected = activeGenre === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveGenre(key)}
                      className={`flex items-center justify-between rounded-full border px-3 py-2 text-left text-xs font-black transition ${
                        selected
                          ? "border-cyan-100/70 bg-cyan-300 text-black"
                          : "border-white/10 bg-white/[0.035] text-zinc-300 hover:border-cyan-100/35 hover:text-white"
                      }`}
                    >
                      <span className="min-w-0 truncate">{genre.label}</span>
                      <span className="ml-2 opacity-65">{genre.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-b border-white/10 py-4">
              <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.16em] text-zinc-500`}>
                {isZh ? "快速連結" : "Quick Links"}
              </p>
              <div className="mt-3 grid gap-2 text-sm font-bold">
                <Link href={`/battle${navSuffix}`} className="text-zinc-300 transition hover:text-orange-100">
                  {isZh ? "AI 音樂鬥歌場" : "AI Music Battle Hall"}
                </Link>
                <Link href={`/listen-bar${navSuffix}`} className="text-zinc-300 transition hover:text-orange-100">
                  {isZh ? "傷心酒吧公播" : "Bar Heartbreak Radio"}
                </Link>
                <Link href={`/battle/setup${navSuffix}`} className="text-zinc-300 transition hover:text-orange-100">
                  {isZh ? "我要發起挑戰" : "Start a Challenge"}
                </Link>
              </div>
            </div>

            <p className="pt-4 text-xs font-bold leading-6 text-zinc-500">
              {isZh
                ? "榮譽榜只收真實完成的勝利與熱播紀錄，不用名次壓作品。"
                : "Honor Board keeps real completed wins and heat records without forcing numbered placements."}
            </p>
          </aside>
        </section>

        {lyricsModal ? (
          <div
            className="fixed inset-0 z-[220] flex items-end bg-black/76 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center sm:px-6"
            role="dialog"
            aria-modal="true"
            aria-label={isZh ? "歌詞" : "Lyrics"}
            onClick={() => setLyricsModal(null)}
          >
            <div
              className="aipo-control-panel max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-[1.25rem] border border-yellow-200/25 bg-zinc-950 shadow-[0_24px_90px_rgba(0,0,0,0.72)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.18em] text-yellow-100/65`}>
                    {isZh ? "LYRICS / 歌詞" : "LYRICS"}
                  </p>
                  <h2 className="mt-1 break-words text-lg font-black leading-6 text-white sm:text-xl">
                    {isZh ? `《${lyricsModal.title}》歌詞` : `${lyricsModal.title} Lyrics`}
                  </h2>
                  <p className="mt-1 truncate text-xs font-bold text-zinc-500">{lyricsModal.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLyricsModal(null)}
                  className="shrink-0 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-zinc-300 transition hover:border-yellow-100/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/70"
                >
                  {isZh ? "關閉" : "Close"}
                </button>
              </div>
              <div className="max-h-[58vh] overflow-y-auto px-4 py-4 sm:px-5">
                <p className="whitespace-pre-wrap break-words text-sm font-bold leading-7 text-zinc-200">
                  {lyricsModal.lyrics}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <footer className="mt-8 flex flex-col gap-4 border-t border-white/10 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={`${fontRighteous.className} text-sm uppercase text-zinc-200`}>AIPOGER.AI</p>
            <a
              href={`mailto:${AIPOGER_CONTACT_EMAIL}`}
              className="mt-1 block text-sm font-bold text-orange-200 transition hover:text-orange-100"
            >
              {AIPOGER_CONTACT_EMAIL}
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            {AIPOGER_SOCIAL_LINKS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-zinc-300 transition hover:border-cyan-200/60 hover:text-white"
              >
                {social.label} <span className="text-zinc-500">{social.handle}</span>
              </a>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
