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
  stripCannedBattleReview,
  type ArchivedBattleResult,
} from "@/lib/battle-result-archive";
import {
  AIPOGER_PERSONAL_RANK,
  isAipogerIdentity,
  rankLabelForLevel,
  rankForLevel,
} from "@/lib/battle-pool-rules";
import { fontGlowSans, fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { listenBarRowToTrack, type ListenBarTrackRow } from "@/lib/listen-bar";
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
  positiveReactions?: number;
};

type BoardMeta = {
  zh: string;
  en: string;
};

const BOARD_META: Record<BoardKey, BoardMeta> = {
  drop: { zh: "熱血 Drop 抓波勝利榜", en: "Drop Victory Records" },
  bar: { zh: "傷心酒吧熱播榜", en: "Bar Heartbreak Heat Records" },
};

const BOARD_KEYS: BoardKey[] = ["drop", "bar"];
const MOCK_PATTERN = /(qa-|mock|demo|test|ghost|sample)/i;

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
      positiveReactions: Math.max(0, Math.round(track.positiveReactionCount || 0)),
    }));
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

  const { data, error } = await supabase
    .from("battles")
    .select("id,winner,fighter_a_name,fighter_b_name,song_a_name,song_b_name,ai_tool_a,ai_tool_b,audio_a_path,audio_b_path")
    .in("id", battleIds);
  if (error) {
    console.warn("[rank battle audio rows]", error.message);
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
    }
  >();
  await Promise.all(
    ((data ?? []) as Array<{
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
    }>).map(async (battle) => {
      if (!battle.id) return;
      const winner = normalizeWinnerSide(battle.winner);
      const winnerPath = winner === "fighter_b" ? battle.audio_b_path : battle.audio_a_path;
      truthByBattle.set(battle.id, {
        winner,
        fighterAName: String(battle.fighter_a_name || "").trim(),
        fighterBName: String(battle.fighter_b_name || "").trim(),
        songAName: String(battle.song_a_name || "").trim(),
        songBName: String(battle.song_b_name || "").trim(),
        aiToolA: String(battle.ai_tool_a || "").trim(),
        aiToolB: String(battle.ai_tool_b || "").trim(),
        audioUrl: await battleAudioPathToUrl(winnerPath),
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
    };
  });
}

export default function RankPage() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [active, setActive] = useState<BoardKey>("drop");
  const [activeGenre, setActiveGenre] = useState("all");
  const [archivedResults, setArchivedResults] = useState<ArchivedBattleResult[]>([]);
  const [hotBarRows, setHotBarRows] = useState<RankRow[]>([]);
  const navSuffix = lang === "en" ? "?lang=en" : "?lang=zh";
  const boardTitle = isZh ? BOARD_META[active].zh : BOARD_META[active].en;

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      const [
        { data: archiveData, error: archiveError },
        { data: hotData, error: hotError },
      ] = await Promise.all([
        supabase
          .from("battle_result_archives")
          .select(
            "battle_id,battle_code,winner,winner_name,winner_song_name,winner_ai_tool,opponent_name,opponent_song_name,final_vote_left,final_vote_right,total_votes,audience_review,result_payload,archived_at",
          )
          .order("archived_at", { ascending: false })
          .limit(200),
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
        ? archiveData.map((row) => {
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
              createdAt: String(row.archived_at || new Date().toISOString()),
            };
          })
        : [];

      const merged = await attachBattleAudioUrls(mergeArchives(mappedArchives));
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

  const genreCounts = useMemo(() => {
    return displayRows.reduce<Record<string, { label: string; count: number }>>((acc, row) => {
      const label = displayGenre(row.genre || row.note, isZh);
      const key = normalizeGenre(label);
      acc[key] = { label, count: (acc[key]?.count ?? 0) + 1 };
      return acc;
    }, {});
  }, [displayRows, isZh]);

  const genreOptions = useMemo(() => {
    return Object.values(genreCounts).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [genreCounts]);

  const filteredDisplayRows = useMemo(() => {
    if (activeGenre === "all") return displayRows;
    return displayRows.filter((row) => normalizeGenre(row.genre || row.note) === activeGenre);
  }, [activeGenre, displayRows]);

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

  const topRow = filteredDisplayRows[0] ?? null;
  const activeBadge = active === "bar" ? "HOT" : "WIN";

  return (
    <main
      className={`${fontGlowSans.className} relative min-h-screen overflow-hidden bg-[#050505] px-4 py-6 text-white sm:px-6 lg:px-8`}
    >
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_15%,rgba(255,106,0,0.22),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(0,202,255,0.16),transparent_28%),linear-gradient(180deg,#050505,#0b0704_54%,#050505)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
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
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-zinc-300 transition hover:border-orange-300/55 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <section className="grid gap-5 py-8 lg:grid-cols-[1fr_24rem] lg:items-stretch">
          <div>
            <p className={`${fontRighteous.className} text-sm uppercase text-orange-300/85`}>
              AIPOGER HONOR
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.08] text-white sm:text-5xl">
              {isZh ? "AIPOGER 榮譽榜" : "AIPOGER Honor Board"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-zinc-400">
              {isZh
                ? "只顯示真實勝利、真實封存與傷心酒吧真實熱播。這裡記錄作品被看見的時刻，不用名次定義創作者。"
                : "Only real victories, archived results, and Bar Heartbreak hot tracks are shown. This is a recognition record, not a numbered chart."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ShareButton
                title={isZh ? "AIPOGER 榮譽榜" : "AIPOGER Honor Board"}
                text={
                  isZh
                    ? "來看 AIPOGER 真實 Drop 勝利與傷心酒吧熱播紀錄。"
                    : "Check real AIPOGER Drop victories and Bar Heartbreak hot tracks."
                }
                label={isZh ? "分享榮譽榜" : "Share Board"}
                copiedLabel={isZh ? "榮譽榜連結已複製" : "Board Link Copied"}
                className="border-yellow-200/45 bg-yellow-300/12 px-5 py-2.5 text-yellow-100 hover:bg-yellow-300/18"
              />
              <Link
                href={`/battle/setup${navSuffix}`}
                className="inline-flex items-center justify-center rounded-full bg-orange-500 px-5 py-2.5 text-sm font-black text-black transition hover:bg-orange-300"
              >
                {isZh ? "我要參戰" : "Join Battle"}
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {topRow ? (
              <div className="overflow-hidden rounded-[1.25rem] border border-yellow-300/25 bg-yellow-400/[0.06] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.34)] lg:h-full">
                <div className="grid gap-4 sm:grid-cols-[7rem_1fr] sm:items-center lg:grid-cols-1">
                  <div className="relative aspect-square overflow-hidden rounded-[1rem] border border-yellow-200/35 bg-black shadow-[0_0_42px_rgba(250,204,21,0.14)] lg:mx-auto lg:w-full lg:max-w-[11rem]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaSrc(topRow.coverUrl)}
                      alt={displaySongTitle(topRow.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 h-12 w-12 overflow-hidden rounded-full border-2 border-orange-300/80 bg-black shadow-[0_0_24px_rgba(255,106,0,0.35)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaSrc(topRow.avatarUrl)} alt={topRow.name} className="h-full w-full object-cover" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-yellow-200/75">
                      {isZh ? "榮譽焦點" : "Spotlight"}
                    </p>
                    <p className="mt-2 text-2xl font-black text-white">{topRow.name}</p>
                    <p className="mt-1 text-sm font-bold text-yellow-100">
                      {localizedRankLabel(topRow.rank, isZh)} / {displayText(topRow.aiTool, isZh ? "工具未封存" : "Tool Missing")}
                    </p>
                    <p className="mt-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm leading-7 text-zinc-300">
                      {displaySongTitle(topRow.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                      {topRow.kind === "battle" && topRow.opponentName
                        ? ` / VS ${topRow.opponentName}`
                        : ""}
                    </p>
                    {topRow.kind === "battle" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={resultHref(topRow, lang)}
                          className="rounded-full border border-orange-200/35 bg-orange-500/12 px-4 py-2 text-xs font-black text-orange-100 transition hover:border-orange-200 hover:text-white"
                        >
                          {isZh ? "看成果卡" : "Result Card"}
                        </Link>
                        <ShareButton
                          title={`${topRow.name} / ${displaySongTitle(topRow.hook, isZh ? "歌名未封存" : "Song Not Archived")}`}
                          text={
                            isZh
                              ? `AIPOGER 榮譽榜焦點：${topRow.name} VS ${topRow.opponentName || "對手"}`
                              : `AIPOGER spotlight: ${topRow.name} VS ${topRow.opponentName || "Opponent"}`
                          }
                          url={resultHref(topRow, lang)}
                          label={isZh ? "分享成果卡" : "Share Result"}
                          copiedLabel={isZh ? "成果卡已複製" : "Result Copied"}
                          className="px-4 py-2 text-xs"
                        />
                        <ReportButton
                          targetType="battle_result"
                          targetId={topRow.battleCode || topRow.id}
                          targetTitle={`${topRow.name} VS ${topRow.opponentName || "Opponent"}`}
                          targetUrl={resultHref(topRow, lang)}
                          context="Honor board spotlight battle result"
                          lang={lang}
                          className="px-4 py-2"
                        />
                      </div>
                    ) : topRow.audioUrl ? (
                      <div className="mt-3 grid gap-2">
                      <audio
                        className="w-full accent-orange-500"
                        controls
                        controlsList="nodownload"
                        onContextMenu={(event) => event.preventDefault()}
                        preload="metadata"
                        src={topRow.audioUrl}
                      >
                        {isZh ? "你的瀏覽器暫時不支援播放。" : "Your browser does not support audio playback."}
                      </audio>
                        <ReportButton
                          targetType="listen_bar_track"
                          targetId={topRow.id}
                          targetTitle={`${topRow.name} / ${displaySongTitle(topRow.hook, isZh ? "歌名未封存" : "Song Not Archived")}`}
                          targetUrl={`/rank?lang=${lang}`}
                          context="Honor board spotlight Bar Heartbreak track"
                          lang={lang}
                          className="w-fit px-4 py-2"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.6rem] border border-yellow-300/20 bg-yellow-400/[0.05] p-5 text-center shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
                <Image
                  src={AIPOGER_BRAND_LOGO}
                  alt="AIPOGER"
                  width={72}
                  height={72}
                  className="mx-auto h-[4.5rem] w-[4.5rem] rounded-2xl object-cover"
                />
                <p className="mt-4 text-2xl font-black text-white">
                  {isZh ? "目前沒有可封存紀錄" : "No Archived Records Yet"}
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-zinc-400">
                  {isZh
                    ? "榮譽榜只顯示真實資料，不再塞入模擬內容。"
                    : "The honor board now shows real data only."}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[17rem_1fr]">
          <aside className="rounded-[1.4rem] border border-white/10 bg-black/52 p-3 backdrop-blur lg:sticky lg:top-5 lg:self-start">
            <div className="grid gap-2">
              {BOARD_KEYS.map((key) => {
                const selected = active === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActive(key)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                      selected
                        ? "border border-orange-300/45 bg-orange-500 text-black shadow-[0_0_28px_rgba(255,106,0,0.22)]"
                        : "border border-white/10 bg-white/[0.035] text-zinc-300 hover:border-orange-300/35 hover:text-white"
                    }`}
                  >
                    {isZh ? BOARD_META[key].zh : BOARD_META[key].en}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className={`${fontRighteous.className} px-2 text-xs uppercase tracking-[0.16em] text-zinc-500`}>
                {isZh ? "音樂風格" : "Music Style"}
              </p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => setActiveGenre("all")}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-black transition ${
                    activeGenre === "all"
                      ? "border-yellow-200/55 bg-yellow-300 text-black"
                      : "border-white/10 bg-white/[0.035] text-zinc-300 hover:border-yellow-200/35 hover:text-white"
                  }`}
                >
                  <span>{isZh ? "全部風格" : "All Styles"}</span>
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
                      className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-left text-xs font-black transition ${
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
          </aside>

          <section className="rounded-[1.4rem] border border-white/10 bg-black/54 p-4 backdrop-blur md:p-5">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={`${fontRighteous.className} text-xs uppercase text-orange-300/70`}>
                  HONOR BOARD
                </p>
                <h2 className="mt-1 text-3xl font-black text-white">{boardTitle}</h2>
              </div>
              <ShareButton
                title={isZh ? `${boardTitle} / AIPOGER 榮譽榜` : `${boardTitle} / AIPOGER Honor Board`}
                text={
                  isZh
                    ? `來看 AIPOGER ${boardTitle}，只顯示真實紀錄。`
                    : `Check the AIPOGER ${boardTitle} with real records only.`
                }
                label={isZh ? "分享這個榮譽榜" : "Share This Board"}
                copiedLabel={isZh ? "榮譽榜連結已複製" : "Board Copied"}
                className="px-4 py-2"
              />
            </div>

            <div className="max-h-[980px] space-y-5 overflow-y-auto pr-1">
              {filteredDisplayRows.length === 0 ? (
                <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.035] px-5 py-8 text-center">
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
                displayGroups.map(([genreLabel, rows]) => (
                  <div key={`${active}-${genreLabel}`} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                      <div>
                        <p className={`${fontRighteous.className} text-xs uppercase tracking-[0.16em] text-cyan-100/55`}>
                          {active === "bar" ? "BAR HEARTBREAK" : "DROP BATTLE"}
                        </p>
                        <h3 className="mt-1 text-xl font-black text-white">{genreLabel}</h3>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-xs font-black text-zinc-300">
                        {rows.length} {isZh ? "首" : "tracks"}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {rows.map((row, index) => {
                        const rowResultHref = resultHref(row, lang);
                        return (
                    <article
                      key={`${active}-${genreLabel}-${row.id}-${index}`}
                      className={`relative overflow-hidden rounded-[1.05rem] border px-3 py-3 ${accentClasses(row.accent)}`}
                    >
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-current opacity-60" />
                      <div className="grid gap-3 lg:grid-cols-[2.8rem_4.75rem_minmax(0,1fr)_15rem] lg:items-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-[11px] font-black tracking-[0.12em] text-white">
                          {activeBadge}
                        </div>
                        <div className="relative h-24 w-full max-w-[7rem] overflow-hidden rounded-[0.95rem] border border-white/15 bg-black shadow-[0_18px_50px_rgba(0,0,0,0.28)] lg:h-[4.75rem] lg:w-[4.75rem]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaSrc(row.coverUrl)}
                            alt={displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute bottom-1.5 left-1.5 h-9 w-9 overflow-hidden rounded-full border-2 border-white/65 bg-black">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={mediaSrc(row.avatarUrl)} alt={row.name} className="h-full w-full object-cover" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="min-w-0 truncate text-xl font-black text-white lg:text-lg">
                              {displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                            </h3>
                            <span className="rounded-full border border-white/15 bg-black/28 px-2.5 py-1 text-[11px] font-bold text-zinc-100">
                              {displayGenre(row.genre || row.note, isZh)}
                            </span>
                            <span className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black text-cyan-100">
                              {displayText(row.aiTool, isZh ? "未封存工具" : "Tool Missing")}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-bold text-zinc-200">
                            {row.name}
                            <span className="mx-2 text-zinc-600">/</span>
                            {localizedRankLabel(row.rank, isZh)}
                          </p>
                          {row.kind === "battle" ? (
                            <>
                              <p className="mt-1 truncate text-sm leading-6 text-zinc-400">
                                VS {displayText(row.opponentName || "", isZh ? "對手未封存" : "Opponent Missing")}
                                <span className="mx-2 text-zinc-700">/</span>
                                {isZh ? "決鬥編號" : "Battle"} {displayText(row.battleCode || "", "N/A")}
                              </p>
                            </>
                          ) : (
                            <p className="mt-1 truncate text-sm leading-6 text-zinc-400">
                              {row.note || (isZh ? "傷心酒吧熱播紀錄" : "Bar Heartbreak heat record")}
                            </p>
                          )}
                          {row.kind === "battle" ? (
                            <div className="mt-2 grid gap-2 lg:hidden">
                              <p className="rounded-2xl border border-orange-200/16 bg-black/26 px-3 py-2 text-xs font-bold leading-5 text-zinc-300">
                                <span className="text-orange-100">{isZh ? "AI 評價" : "AI Review"}：</span>
                                {displayText(row.aiReview || "", isZh ? "無" : "None")}
                              </p>
                              <p className="rounded-2xl border border-cyan-200/16 bg-black/26 px-3 py-2 text-xs font-bold leading-5 text-zinc-300">
                                <span className="text-cyan-100">{isZh ? "觀眾評價" : "Listener Signal"}：</span>
                                {displayText(row.audienceReview || "", isZh ? "無" : "None")}
                              </p>
                            </div>
                          ) : null}
                        </div>
                        <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/34 px-3 py-2">
                          {row.kind === "battle" ? (
                            <div>
                              <p className="text-sm font-black text-white">
                                {displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}
                              </p>
                              <p className="mt-1 text-xs font-bold text-zinc-400">
                                {row.votesTotal && row.votesTotal > 0
                                  ? `${row.votesTotal.toLocaleString()} ${isZh ? "票" : "votes"} / A SIDE ${row.aSideVotes || 0} ${isZh ? "票" : ""} B SIDE ${row.bSideVotes || 0} ${isZh ? "票" : ""}`
                                  : isZh
                                    ? "尚無投票"
                                    : "No Votes Yet"}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm font-black text-white">{displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}</p>
                              <p className="mt-1 text-xs font-bold text-zinc-400">
                                {isZh
                                  ? `正向反應 ${(row.positiveReactions || 0).toLocaleString()}`
                                  : `Positive ${(row.positiveReactions || 0).toLocaleString()}`}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {row.kind === "battle" ? (
                              <>
                                <Link
                                  href={rowResultHref}
                                  className="inline-flex items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-100 hover:text-white"
                                >
                                  {isZh ? "成果卡" : "Result"}
                                </Link>
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
                                  className="px-3 py-2 text-xs"
                                />
                              </>
                            ) : null}
                            <ReportButton
                              targetType={row.kind === "battle" ? "battle_result" : "listen_bar_track"}
                              targetId={row.kind === "battle" ? row.battleCode || row.id : row.id}
                              targetTitle={`${row.name} / ${displaySongTitle(row.hook, isZh ? "歌名未封存" : "Song Not Archived")}`}
                              targetUrl={row.kind === "battle" ? rowResultHref : `/rank?lang=${lang}`}
                              context={`Honor board row kind=${row.kind}`}
                              lang={lang}
                              className="px-3 py-2"
                            />
                          </div>
                          {row.audioUrl ? (
                            <audio
                              className="w-full accent-orange-500"
                              controls
                              controlsList="nodownload"
                              onContextMenu={(event) => event.preventDefault()}
                              preload="metadata"
                              src={row.audioUrl}
                            >
                              {isZh ? "你的瀏覽器暫時不支援播放。" : "Your browser does not support audio playback."}
                            </audio>
                          ) : null}
                        </div>
                      </div>
                    </article>
                          );
                        })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>

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
