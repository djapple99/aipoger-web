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
} from "@/lib/music-genres";
import { supabase } from "@/lib/supabase";
import { listenBarRowToTrack, type ListenBarTrackRow } from "@/lib/listen-bar";
import {
  AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET,
  aiMusicShowtimeDefenseRemaining,
  aiMusicChallengeStatusLabel,
  hasPreparedAiMusicDefenderDrop,
  isAiMusicTrackChallengeableOnExplore,
  normalizeAiMusicChallengeStatus,
  shouldRetireAiMusicTrackFromExplore,
  type AiMusicChallengeStatus,
} from "@/lib/ai-music-challenge-rules";
import { buildAiMusicExploreGenreLanes, type AiMusicExploreOrderTrack } from "@/lib/ai-music-explore-order";
import { buildAiMusicHeatList, type AiMusicHeatTrack } from "@/lib/ai-music-heat";

type TrackSource = "battle" | "bar";

type AiMusicTrack = AiMusicExploreOrderTrack & AiMusicHeatTrack & {
  id: string;
  source: TrackSource;
  sourceId: string;
  recordKey: string;
  title: string;
  creator: string;
  aiTool: string;
  coverUrl: string;
  audioUrl: string | null;
  lyrics: string | null;
  createdAt: string;
  heartCount: number;
  positiveReactionCount: number;
  challengeCount: number;
  defenseSuccesses: number;
  defenseTarget: number;
  defenseRemaining: number;
  wins: number;
  losses: number;
  audienceVotes: number;
  winRate: number;
  openForChallenge: boolean;
  hasDefenderDrop: boolean;
  isShowtimeCertified: boolean;
  retiredFromExplore: boolean;
  challengeStatus: AiMusicChallengeStatus;
  statusLabel: string;
  href: string;
};

type ListenBarReactionPayload = {
  counts?: {
    heart?: number;
  };
  positiveReactionCount?: number;
  favoriteSynced?: boolean;
  alreadyReacted?: boolean;
  heartedToday?: boolean;
  heartCooldownUntil?: string | null;
  error?: string;
};

type LoadState = "loading" | "ready" | "error";
type HeartCooldownState = Record<string, string>;
type AiMusicApiTrackRow = ListenBarTrackRow & {
  ai_music_showtime_certified?: boolean | null;
  ai_music_explore_retired?: boolean | null;
  ai_music_official_challenge_count?: number | null;
  ai_music_official_defense_successes?: number | null;
  ai_music_showtime_defense_target?: number | null;
  ai_music_showtime_defense_remaining?: number | null;
  ai_music_official_wins?: number | null;
  ai_music_official_losses?: number | null;
  ai_music_official_audience_votes?: number | null;
  ai_music_recent_heart_supporter_count?: number | null;
  ai_music_recent_official_audience_votes?: number | null;
  ai_music_recent_interaction_at?: string | null;
};

const HEART_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function numberValue(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
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
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date(0).toISOString();
}

function heartCooldownUntil(createdAt: string | null | undefined) {
  const time = new Date(createdAt || "").getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time + HEART_COOLDOWN_MS).toISOString();
}

function isHeartCoolingDown(cooldownUntil: string | null | undefined) {
  if (!cooldownUntil) return false;
  const time = new Date(cooldownUntil).getTime();
  return Number.isFinite(time) && time > Date.now();
}

function formatPlayerTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
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

function aiMusicTrackHref(id: string, lang: string) {
  const params = new URLSearchParams({ lang, track: id });
  return `/ai-music?${params.toString()}#works`;
}

function storagePublicUrl(bucket: string, path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^(https?:|blob:|data:)/i.test(clean)) return clean;
  return supabase.storage.from(bucket).getPublicUrl(clean).data.publicUrl;
}

async function tracksFromListenBar(lang: string) {
  const response = await fetch(`/api/ai-music/tracks?lang=${encodeURIComponent(lang)}`, {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { tracks?: AiMusicApiTrackRow[]; error?: string } | null;
  if (!response.ok || !payload?.tracks) {
    throw new Error(payload?.error || "Could not load AI music tracks.");
  }

  return payload.tracks
    .map((row) => ({ row, track: listenBarRowToTrack(row) }))
    .filter((item): item is { row: ListenBarTrackRow; track: NonNullable<ReturnType<typeof listenBarRowToTrack>> } => {
      return Boolean(item.track && item.track.source !== "official");
    })
    .map<AiMusicTrack>(({ row, track }) => {
      const lifecycleRow = row as AiMusicApiTrackRow;
      const genre = canonicalGenreBucket(row.genre ?? track.genre);
      const challengeStatus = normalizeAiMusicChallengeStatus((row as ListenBarTrackRow & { ai_music_challenge_status?: string | null }).ai_music_challenge_status);
      const defenderDropAudioPath = (row as ListenBarTrackRow & { ai_music_defender_drop_audio_path?: string | null }).ai_music_defender_drop_audio_path;
      const hasDefenderDrop = hasPreparedAiMusicDefenderDrop(defenderDropAudioPath);
      const officialChallengeCount = numberValue(lifecycleRow.ai_music_official_challenge_count);
      const officialDefenseSuccesses = numberValue(lifecycleRow.ai_music_official_defense_successes);
      const defenseTarget = numberValue(lifecycleRow.ai_music_showtime_defense_target) || AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET;
      const defenseRemaining = Math.max(
        0,
        numberValue(lifecycleRow.ai_music_showtime_defense_remaining ?? aiMusicShowtimeDefenseRemaining(officialDefenseSuccesses)),
      );
      const officialWins = numberValue(lifecycleRow.ai_music_official_wins);
      const officialLosses = numberValue(lifecycleRow.ai_music_official_losses);
      const officialAudienceVotes = numberValue(lifecycleRow.ai_music_official_audience_votes);
      const recentHeartSupporters = numberValue(lifecycleRow.ai_music_recent_heart_supporter_count);
      const recentOfficialAudienceVotes = numberValue(lifecycleRow.ai_music_recent_official_audience_votes);
      const isShowtimeCertified = Boolean(lifecycleRow.ai_music_showtime_certified);
      const retiredFromExplore = Boolean(lifecycleRow.ai_music_explore_retired) || shouldRetireAiMusicTrackFromExplore({
        officialLosses,
        isShowtimeCertified,
      });
      const openForChallenge = isAiMusicTrackChallengeableOnExplore(challengeStatus, defenderDropAudioPath, {
        officialLosses,
        isShowtimeCertified,
      });
      let statusLabel = aiMusicChallengeStatusLabel(challengeStatus, lang);
      if (challengeStatus === "open" && !hasDefenderDrop) {
        statusLabel = lang === "zh" ? "尚未準備守擂 Drop" : "Defender Drop missing";
      }
      if (retiredFromExplore) {
        statusLabel = lang === "zh" ? "8 場正式敗績退場" : "Retired after 8 official losses";
      }
      if (isShowtimeCertified) {
        statusLabel = lang === "zh" ? "Showtime 認證" : "Showtime certified";
      }
      const winRate = officialChallengeCount > 0 ? Math.round((officialWins / officialChallengeCount) * 100) : 0;
      return {
        id: `bar-${track.id}`,
        source: "bar",
        sourceId: track.id,
        recordKey: `bar:${track.id}`,
        title: track.title,
        creator: track.artist,
        aiTool: track.tool || "AI Music",
        genre,
        coverUrl: track.coverUrl || storagePublicUrl("listen-bar-covers", row.cover_path) || AIPOGER_BRAND_LOGO,
        audioUrl: track.audioUrl || storagePublicUrl("listen-bar-audio", row.audio_path),
        lyrics: row.lyrics?.trim() || track.lyrics?.trim() || null,
        createdAt: safeDate(track.createdAt),
        heartCount: numberValue(row.heart_count ?? track.positiveReactionCount),
        positiveReactionCount: numberValue(row.positive_reaction_count ?? track.positiveReactionCount),
        recentHeartSupporters,
        recentOfficialAudienceVotes,
        recentQualifiedInteractionAt: lifecycleRow.ai_music_recent_interaction_at ?? null,
        challengeCount: officialChallengeCount,
        defenseSuccesses: officialDefenseSuccesses,
        defenseTarget,
        defenseRemaining,
        wins: officialWins,
        losses: officialLosses,
        audienceVotes: officialAudienceVotes,
        winRate,
        openForChallenge,
        hasDefenderDrop,
        isShowtimeCertified,
        retiredFromExplore,
        challengeStatus,
        statusLabel,
        href: aiMusicTrackHref(track.id, lang),
      };
    })
    .filter((track) => !track.retiredFromExplore);
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
    const currentCreatedAt = new Date(current.createdAt).getTime();
    const nextCreatedAt = new Date(row.createdAt).getTime();
    if (nextCreatedAt > currentCreatedAt || (nextCreatedAt === currentCreatedAt && row.id.localeCompare(current.id) > 0)) {
      bySignature.set(signature, {
        ...row,
        heartCount: Math.max(row.heartCount, current.heartCount),
        positiveReactionCount: Math.max(row.positiveReactionCount, current.positiveReactionCount),
        recentHeartSupporters: Math.max(row.recentHeartSupporters, current.recentHeartSupporters),
        recentOfficialAudienceVotes: Math.max(row.recentOfficialAudienceVotes, current.recentOfficialAudienceVotes),
        recentQualifiedInteractionAt: new Date(row.recentQualifiedInteractionAt ?? 0).getTime() >= new Date(current.recentQualifiedInteractionAt ?? 0).getTime()
          ? row.recentQualifiedInteractionAt
          : current.recentQualifiedInteractionAt,
        challengeCount: Math.max(row.challengeCount, current.challengeCount),
        defenseSuccesses: Math.max(row.defenseSuccesses, current.defenseSuccesses),
        defenseTarget: Math.max(row.defenseTarget, current.defenseTarget),
        defenseRemaining: Math.max(0, Math.max(row.defenseTarget, current.defenseTarget) - Math.max(row.defenseSuccesses, current.defenseSuccesses)),
        wins: Math.max(row.wins, current.wins),
        losses: Math.max(row.losses, current.losses),
        audienceVotes: Math.max(row.audienceVotes, current.audienceVotes),
      });
    } else {
      bySignature.set(signature, {
        ...current,
        heartCount: Math.max(row.heartCount, current.heartCount),
        positiveReactionCount: Math.max(row.positiveReactionCount, current.positiveReactionCount),
        recentHeartSupporters: Math.max(row.recentHeartSupporters, current.recentHeartSupporters),
        recentOfficialAudienceVotes: Math.max(row.recentOfficialAudienceVotes, current.recentOfficialAudienceVotes),
        recentQualifiedInteractionAt: new Date(row.recentQualifiedInteractionAt ?? 0).getTime() >= new Date(current.recentQualifiedInteractionAt ?? 0).getTime()
          ? row.recentQualifiedInteractionAt
          : current.recentQualifiedInteractionAt,
        challengeCount: Math.max(row.challengeCount, current.challengeCount),
        defenseSuccesses: Math.max(row.defenseSuccesses, current.defenseSuccesses),
        defenseTarget: Math.max(row.defenseTarget, current.defenseTarget),
        defenseRemaining: Math.max(0, Math.max(row.defenseTarget, current.defenseTarget) - Math.max(row.defenseSuccesses, current.defenseSuccesses)),
        wins: Math.max(row.wins, current.wins),
        losses: Math.max(row.losses, current.losses),
        audienceVotes: Math.max(row.audienceVotes, current.audienceVotes),
      });
    }
  }
  return Array.from(bySignature.values());
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

function LyricsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M7 5.5h10M7 10h8M7 14.5h10M7 19h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.8 4.8v14.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
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

function ChallengeReadyBadge({ isZh }: { isZh: boolean }) {
  const label = isZh ? "接戰" : "OPEN";
  const title = isZh ? "原作者已準備 60s Drop，可接受攻擂。" : "The creator has a defender 60s Drop ready.";
  return (
    <span
      className="pointer-events-none absolute right-0 top-0 z-20 block h-14 w-14 overflow-hidden text-white"
      aria-label={title}
      title={title}
    >
      <span className={`${fontRighteous.className} absolute right-[-1.95rem] top-2.5 w-24 rotate-45 bg-red-600 py-1 text-center text-[10px] font-black uppercase leading-none tracking-[0.16em] text-white shadow-[0_0_22px_rgba(220,38,38,0.5)] ring-1 ring-white/[0.22]`}>
        {label}
      </span>
    </span>
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

function defenseProgressValues(track: AiMusicTrack) {
  const target = Math.max(1, track.defenseTarget || AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET);
  const successes = Math.min(target, Math.max(0, track.defenseSuccesses));
  const remaining = Math.max(0, target - successes);
  return { successes, target, remaining };
}

function defenseProgressText(track: AiMusicTrack, isZh: boolean) {
  if (track.isShowtimeCertified) {
    return isZh ? "已進入 Showtime，不再接受挑戰。" : "Certified in Showtime. Challenges are closed.";
  }
  const { successes, target, remaining } = defenseProgressValues(track);
  return isZh
    ? `守擂進度 ${successes} / ${target}，再守下 ${remaining} 場正式挑戰，進入 Showtime`
    : `Defense progress ${successes} / ${target}. ${remaining} official defense wins to enter Showtime.`;
}

function defenseProgressShortText(track: AiMusicTrack, isZh: boolean) {
  if (track.isShowtimeCertified) return isZh ? "Showtime 認證 · 不再接戰" : "Showtime certified · Closed";
  const { successes, target, remaining } = defenseProgressValues(track);
  return isZh
    ? `守擂 ${successes}/${target} · 再 ${remaining} 場進 Showtime`
    : `Defense ${successes}/${target} · ${remaining} to Showtime`;
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
      <p className="rounded-sm border border-yellow-200/18 bg-yellow-300/[0.08] px-2.5 py-2 text-[11px] font-black leading-5 text-yellow-100">
        {defenseProgressText(track, isZh)}
      </p>
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
  heartBusy,
  heartedToday,
  lang,
  onPlay,
  onToggleExpand,
  onHeart,
  onShare,
}: {
  track: AiMusicTrack;
  isZh: boolean;
  isPlaying: boolean;
  isExpanded: boolean;
  heartBusy: boolean;
  heartedToday: boolean;
  lang: string;
  onPlay: (track: AiMusicTrack) => void;
  onToggleExpand: (track: AiMusicTrack) => void;
  onHeart: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
}) {
  const heartCount = Math.max(0, track.heartCount);
  const showChallengeReadyBadge = track.openForChallenge && Boolean(track.audioUrl);
  const heartActionLabel = heartedToday
    ? isZh
      ? "今日已送出愛心"
      : "Heart sent today"
    : isZh
      ? "送出愛心支持"
      : "Send a heart";
  return (
    <article id={`ai-music-work-${track.sourceId}`} className="group relative w-[12.5rem] shrink-0 snap-start overflow-hidden rounded-md border border-white/10 bg-black/54 shadow-[0_18px_54px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-orange-200/45 hover:bg-orange-500/[0.055] sm:w-full">
      <div className="relative aspect-square">
        <TrackCover track={track} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/12 to-transparent" />
        {showChallengeReadyBadge ? <ChallengeReadyBadge isZh={isZh} /> : null}
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
        <p className={`rounded-sm border px-2 py-1.5 text-[10px] font-black leading-4 ${
          track.isShowtimeCertified
            ? "border-cyan-100/28 bg-cyan-300/[0.08] text-cyan-50"
            : "border-yellow-200/18 bg-yellow-300/[0.08] text-yellow-100"
        }`}>
          {defenseProgressShortText(track, isZh)}
        </p>
        {isExpanded ? (
          <div className="md:hidden">
            <TrackHud track={track} isZh={isZh} />
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onHeart(track)}
            disabled={heartBusy}
            className={`inline-flex min-h-9 items-center justify-center rounded-md border px-2 text-[11px] font-black transition disabled:cursor-wait disabled:opacity-55 ${
              heartedToday
                ? "border-rose-200/55 bg-rose-500/18 text-rose-50 shadow-[0_0_18px_rgba(244,63,94,0.2)] hover:border-rose-100/70"
                : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-rose-200/40 hover:text-rose-100"
            }`}
            aria-label={heartActionLabel}
            title={heartActionLabel}
          >
            <HeartIcon filled={heartedToday} />
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

function heatReason(track: AiMusicTrack, isZh: boolean) {
  const signals: string[] = [];
  if (track.recentHeartSupporters > 0) {
    signals.push(isZh ? `近 7 日 ${track.recentHeartSupporters} 人支持` : `${track.recentHeartSupporters} supporters in 7d`);
  }
  if (track.recentOfficialAudienceVotes > 0) {
    signals.push(isZh ? `正式 Battle ${track.recentOfficialAudienceVotes} 有效票` : `${track.recentOfficialAudienceVotes} official votes`);
  }
  return signals.join(" · ") || (isZh ? "正在累積近期支持" : "Building recent support");
}

function HeatList({
  tracks,
  isZh,
  currentTrackId,
  isPlaying,
  heartBusy,
  heartCooldowns,
  lang,
  onPlay,
  onHeart,
  onShare,
}: {
  tracks: AiMusicTrack[];
  isZh: boolean;
  currentTrackId: string | null;
  isPlaying: boolean;
  heartBusy: Record<string, boolean>;
  heartCooldowns: HeartCooldownState;
  lang: string;
  onPlay: (track: AiMusicTrack) => void;
  onHeart: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
}) {
  const rows = buildAiMusicHeatList(tracks);
  return (
    <section className="grid gap-3" aria-label={isZh ? "正在升溫作品" : "Hot Now works"}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-orange-200/18 pb-3">
        <div>
          <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.2em] text-orange-100/68`}>AIPOGER HEAT</p>
          <h2 className="mt-1 text-xl font-black text-white">{isZh ? "正在升溫" : "Hot Now"}</h2>
        </div>
        <p className="max-w-sm text-xs font-bold leading-5 text-zinc-500">
          {isZh ? "依近 7 日不同帳號支持與已成立正式 Battle 有效票排序。" : "Ordered by 7-day distinct supporters and official Battle audience votes."}
        </p>
      </div>

      <div className="overflow-hidden border-y border-white/10">
        {rows.map(({ track, rank, hasRecentSignal }) => {
          const heartedToday = isHeartCoolingDown(heartCooldowns[track.recordKey]);
          const heartActionLabel = heartedToday
            ? isZh ? "今日已送出愛心" : "Heart sent today"
            : isZh ? "送出愛心支持" : "Send a heart";
          return (
            <article
              key={track.id}
              className="grid grid-cols-[2.15rem_4.5rem_minmax(0,1fr)] gap-x-3 border-b border-white/8 px-1 py-3 last:border-b-0 sm:grid-cols-[2.6rem_5.5rem_minmax(0,1fr)_minmax(12rem,0.7fr)_auto] sm:items-center sm:gap-x-4 sm:px-2"
            >
              <div className={`${fontRighteous.className} flex h-9 items-center justify-center text-xs font-black ${hasRecentSignal ? "text-orange-100" : "text-zinc-600"}`}>
                {rank ? `#${String(rank).padStart(2, "0")}` : isZh ? "累積" : "New"}
              </div>
              <div className="relative aspect-square overflow-hidden border border-white/10 bg-black">
                <TrackCover track={track} className="h-full w-full" />
                {track.openForChallenge ? <ChallengeReadyBadge isZh={isZh} /> : null}
                <button
                  type="button"
                  onClick={() => onPlay(track)}
                  disabled={!track.audioUrl}
                  className="absolute inset-0 flex items-center justify-center bg-black/22 text-orange-200 transition hover:bg-black/44 hover:text-orange-100 disabled:cursor-not-allowed disabled:text-zinc-600"
                  aria-label={currentTrackId === track.id && isPlaying ? (isZh ? "暫停" : "Pause") : isZh ? `播放 ${track.title}` : `Play ${track.title}`}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_0_18px_rgba(255,106,0,0.34)]">
                    <PlayIcon playing={currentTrackId === track.id && isPlaying} />
                  </span>
                </button>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="line-clamp-1 text-sm font-black text-white sm:text-base">{track.title}</h3>
                  {track.isShowtimeCertified ? (
                    <span className={`${fontRighteous.className} rounded-sm border border-yellow-200/45 bg-yellow-300/14 px-1.5 py-0.5 text-[9px] uppercase text-yellow-100`}>SHOWTIME</span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-[11px] font-bold text-zinc-400">by {track.creator} · {track.aiTool} · {track.genre}</p>
                <p className={`mt-1 text-[11px] font-black leading-5 ${hasRecentSignal ? "text-orange-100" : "text-zinc-500"}`}>{heatReason(track, isZh)}</p>
              </div>
              <div className="col-span-2 col-start-2 mt-2 flex min-w-0 items-center gap-2 text-[11px] font-bold text-zinc-500 sm:col-auto sm:mt-0 sm:block">
                <span className="text-rose-100">{track.heartCount} {isZh ? "愛心" : "Hearts"}</span>
                <span className="sm:mt-1 sm:block">{track.challengeCount > 0 ? formatRecord(track, isZh) : isZh ? "尚未形成正式戰績" : "No official record yet"}</span>
              </div>
              <div className="col-span-3 mt-2 flex items-center gap-1.5 sm:col-auto sm:mt-0">
                <button
                  type="button"
                  onClick={() => onHeart(track)}
                  disabled={Boolean(heartBusy[track.recordKey])}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition disabled:cursor-wait disabled:opacity-55 ${heartedToday ? "border-rose-200/55 bg-rose-500/18 text-rose-50" : "border-white/10 bg-white/[0.035] text-zinc-300 hover:border-rose-200/40 hover:text-rose-100"}`}
                  aria-label={heartActionLabel}
                  title={heartActionLabel}
                >
                  <HeartIcon filled={heartedToday} />
                </button>
                <button
                  type="button"
                  onClick={() => onShare(track)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.035] text-zinc-300 transition hover:border-cyan-100/40 hover:text-white"
                  aria-label={isZh ? "分享" : "Share"}
                  title={isZh ? "分享" : "Share"}
                >
                  <ShareIcon />
                </button>
                {track.openForChallenge ? (
                  <Link
                    href={aiMusicChallengeHref(track, lang)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-orange-200/35 bg-orange-500/12 px-2.5 text-[11px] font-black text-orange-50 transition hover:border-orange-100/65 hover:bg-orange-500/20"
                  >
                    {isZh ? "攻擂" : "Challenge"}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MiniPlayer({
  track,
  isZh,
  isPlaying,
  heartBusy,
  heartedToday,
  lang,
  onTogglePlay,
  onHeart,
  onShare,
  audioRef,
  onEnded,
  onPause,
  onPlay,
}: {
  track: AiMusicTrack | null;
  isZh: boolean;
  isPlaying: boolean;
  heartBusy: boolean;
  heartedToday: boolean;
  lang: string;
  onTogglePlay: () => void;
  onHeart: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
  onEnded: () => void;
  onPause: () => void;
  onPlay: () => void;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsScrollPercent, setLyricsScrollPercent] = useState(0);
  const lyricsPanelRef = useRef<HTMLDivElement | null>(null);
  const lyrics = track?.lyrics?.trim() ?? "";
  const lyricsLines = useMemo(() => (lyrics ? lyrics.split(/\r?\n/) : []), [lyrics]);
  const progressValue = duration > 0 ? Math.min(currentTime, duration) : 0;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (progressValue / duration) * 100)) : 0;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setLyricsOpen(false);
    setLyricsScrollPercent(0);
  }, [track?.id]);

  const syncLyricsScroll = () => {
    const panel = lyricsPanelRef.current;
    if (!panel) return;
    const maxScroll = panel.scrollHeight - panel.clientHeight;
    setLyricsScrollPercent(maxScroll > 0 ? Math.round((panel.scrollTop / maxScroll) * 100) : 0);
  };

  const handleLyricsSlider = (value: number) => {
    const next = Math.min(100, Math.max(0, value));
    setLyricsScrollPercent(next);
    const panel = lyricsPanelRef.current;
    if (!panel) return;
    const maxScroll = panel.scrollHeight - panel.clientHeight;
    panel.scrollTop = maxScroll > 0 ? (maxScroll * next) / 100 : 0;
  };

  const handleSeek = (value: number) => {
    const next = Math.min(duration || 0, Math.max(0, value));
    setCurrentTime(next);
    if (audioRef.current && Number.isFinite(next)) {
      audioRef.current.currentTime = next;
    }
  };

  if (!track) return null;
  const heartActionLabel = heartedToday
    ? isZh
      ? "今日已送出愛心"
      : "Heart sent today"
    : isZh
      ? "送出愛心支持"
      : "Send a heart";

  return (
    <>
      {lyricsOpen ? (
        <div className="fixed inset-x-3 bottom-[7.1rem] z-[55] mx-auto max-w-2xl rounded-md border border-orange-200/24 bg-black/94 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:bottom-[6.35rem] sm:max-w-lg sm:p-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.18em] text-orange-100/72`}>
                Lyrics HUD
              </p>
              <h2 className="mt-1 truncate text-base font-black text-white sm:text-sm">{track.title}</h2>
              <p className="truncate text-[11px] font-bold text-zinc-500">{track.creator}</p>
            </div>
            <button
              type="button"
              onClick={() => setLyricsOpen(false)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-white/12 bg-white/[0.045] px-3 text-xs font-black text-zinc-300 transition hover:border-orange-100/45 hover:text-white"
            >
              {isZh ? "關閉" : "Close"}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_1.45rem] gap-3">
            <div
              ref={lyricsPanelRef}
              onScroll={syncLyricsScroll}
              className="max-h-[min(58vh,26rem)] overflow-y-auto rounded-md border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-bold leading-7 text-zinc-200 [scrollbar-width:thin] sm:max-h-[min(48vh,20rem)] sm:px-3.5 sm:py-2.5 sm:text-[13px] sm:leading-6"
            >
              {lyricsLines.length > 0 ? (
                lyricsLines.map((line, index) => (
                  <p key={`${index}-${line}`} className="min-h-4 whitespace-pre-wrap">
                    {line || " "}
                  </p>
                ))
              ) : (
                <p className="text-zinc-500">{isZh ? "歌詞未提供。" : "Lyrics not provided."}</p>
              )}
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={lyricsScrollPercent}
              onChange={(event) => handleLyricsSlider(Number(event.currentTarget.value))}
              disabled={lyricsLines.length === 0}
              className="h-full min-h-52 w-5 cursor-pointer accent-orange-400 disabled:cursor-not-allowed disabled:opacity-35"
              style={{ writingMode: "vertical-lr", direction: "rtl" }}
              aria-label={isZh ? "拖曳瀏覽歌詞" : "Scroll lyrics"}
            />
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-orange-200/20 bg-black/92 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-22px_70px_rgba(0,0,0,0.66)] backdrop-blur sm:pb-[calc(0.45rem+env(safe-area-inset-bottom))] sm:pt-1.5">
        <div className="mx-auto grid max-w-7xl gap-2">
          <div className="grid grid-cols-[3.4rem_minmax(0,1fr)_auto] items-center gap-3">
            <TrackCover track={track} className="h-14 w-14 rounded-md border border-white/10 sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white sm:text-[13px]">{track.title}</p>
              <p className="truncate text-[11px] font-bold text-zinc-400">
                {track.creator} · {track.aiTool}
              </p>
              <div className="mt-2 grid grid-cols-[2.6rem_minmax(0,1fr)_2.6rem] items-center gap-2 sm:mt-1.5">
                <span className="text-[10px] font-black tabular-nums text-zinc-500">{formatPlayerTime(progressValue)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration > 0 ? duration : 0}
                  step="0.1"
                  value={progressValue}
                  onChange={(event) => handleSeek(Number(event.currentTarget.value))}
                  disabled={!track.audioUrl || duration <= 0}
                  className="h-2 w-full cursor-pointer accent-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: `linear-gradient(to right, rgba(255,106,0,0.92) 0%, rgba(255,106,0,0.92) ${progressPercent}%, rgba(255,255,255,0.16) ${progressPercent}%, rgba(255,255,255,0.16) 100%)` }}
                  aria-label={isZh ? "拖曳播放進度" : "Seek playback"}
                />
                <span className="text-right text-[10px] font-black tabular-nums text-zinc-500">{formatPlayerTime(duration)}</span>
              </div>
              <audio
                ref={audioRef}
                src={track.audioUrl ?? undefined}
                preload="metadata"
                onLoadedMetadata={(event) => {
                  setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
                  setCurrentTime(event.currentTarget.currentTime || 0);
                }}
                onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
                onEnded={() => {
                  setCurrentTime(0);
                  onEnded();
                }}
                onPause={onPause}
                onPlay={onPlay}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onTogglePlay}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 sm:h-9 sm:w-9"
                aria-label={isPlaying ? (isZh ? "暫停" : "Pause") : isZh ? "播放" : "Play"}
              >
                <PlayIcon playing={isPlaying} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLyricsOpen((current) => !current);
                  window.requestAnimationFrame(syncLyricsScroll);
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.045] px-3 text-xs font-black text-zinc-300 transition hover:border-orange-100/42 hover:text-white sm:h-9 sm:px-2.5"
                aria-expanded={lyricsOpen}
                aria-label={isZh ? "看歌詞" : "View lyrics"}
              >
                <LyricsIcon />
                <span>{isZh ? "歌詞" : "Lyrics"}</span>
              </button>
              <button
                type="button"
                onClick={() => onHeart(track)}
                disabled={heartBusy}
                className={`hidden h-10 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-black transition disabled:cursor-wait disabled:opacity-55 sm:inline-flex sm:h-9 sm:px-2.5 ${
                  heartedToday
                    ? "border-rose-200/55 bg-rose-500/18 text-rose-50 shadow-[0_0_18px_rgba(244,63,94,0.2)] hover:border-rose-100/70"
                    : "border-white/12 bg-white/[0.045] text-zinc-300 hover:border-rose-200/42 hover:text-rose-100"
                }`}
                aria-label={heartActionLabel}
                title={heartActionLabel}
              >
                <HeartIcon filled={heartedToday} />
                <span className="tabular-nums">{Math.max(0, track.heartCount)}</span>
              </button>
              <button
                type="button"
                onClick={() => onShare(track)}
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.045] text-zinc-300 transition hover:border-cyan-100/42 hover:text-white sm:inline-flex sm:h-9 sm:w-9"
                aria-label={isZh ? "分享" : "Share"}
              >
                <ShareIcon />
              </button>
              {track.openForChallenge ? (
                <Link
                  href={aiMusicChallengeHref(track, lang)}
                  className="hidden min-h-10 items-center justify-center rounded-full border border-orange-200/38 bg-orange-500/15 px-3 text-xs font-black text-orange-50 transition hover:border-orange-100/65 hover:bg-orange-500/22 md:inline-flex sm:min-h-9 sm:px-2.5"
                >
                  {isZh ? "攻擂這首" : "Challenge"}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AiMusicClient() {
  const { lang, t } = useI18n();
  const isZh = lang === "zh";
  const [tracks, setTracks] = useState<AiMusicTrack[]>([]);
  const [worksView, setWorksView] = useState<"genre" | "heat">("genre");
  const [guideOpen, setGuideOpen] = useState(false);
  const [sharedTrackSourceId, setSharedTrackSourceId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [expandedGenres, setExpandedGenres] = useState<Record<string, boolean>>({});
  const [expandedHud, setExpandedHud] = useState<Record<string, boolean>>({});
  const [heartBusy, setHeartBusy] = useState<Record<string, boolean>>({});
  const [heartCooldowns, setHeartCooldowns] = useState<HeartCooldownState>({});
  const [notice, setNotice] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<AiMusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const guideButtonRef = useRef<HTMLButtonElement | null>(null);
  const guideDialogRef = useRef<HTMLDivElement | null>(null);
  const guideCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const guideReturnFocusRef = useRef(false);

  const withLang = useCallback((href: string) => `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`, [lang]);
  const closeGuide = useCallback(() => {
    guideReturnFocusRef.current = true;
    setGuideOpen(false);
  }, []);

  useEffect(() => {
    if (guideOpen) {
      const frame = window.requestAnimationFrame(() => guideCloseButtonRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    if (!guideReturnFocusRef.current) return;
    guideReturnFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => guideButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [guideOpen]);

  useEffect(() => {
    if (!guideOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGuide();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = guideDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeGuide, guideOpen]);

  useEffect(() => {
    const updateSharedTrack = () => {
      const trackId = new URLSearchParams(window.location.search).get("track")?.trim() || null;
      setSharedTrackSourceId(trackId);
    };
    updateSharedTrack();
    window.addEventListener("popstate", updateSharedTrack);
    return () => window.removeEventListener("popstate", updateSharedTrack);
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadState("loading");
      setLoadError("");
      try {
        const barTracks = await tracksFromListenBar(lang);
        if (!cancelled) {
          setTracks(mergeDuplicateTracks(barTracks));
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

  useEffect(() => {
    if (!sharedTrackSourceId || tracks.length === 0) return;
    const sharedTrack = tracks.find((track) => track.sourceId === sharedTrackSourceId);
    if (!sharedTrack) return;
    setWorksView("genre");
    setExpandedGenres((current) => (
      current[sharedTrack.genre] ? current : { ...current, [sharedTrack.genre]: true }
    ));
  }, [sharedTrackSourceId, tracks]);

  useEffect(() => {
    if (!sharedTrackSourceId || worksView !== "genre") return;
    const sharedTrack = tracks.find((track) => track.sourceId === sharedTrackSourceId);
    if (!sharedTrack || !expandedGenres[sharedTrack.genre]) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`ai-music-work-${sharedTrack.sourceId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedGenres, sharedTrackSourceId, tracks, worksView]);

  useEffect(() => {
    if (!userId || tracks.length === 0) {
      setHeartCooldowns({});
      return;
    }

    let mounted = true;
    const loadHeartCooldowns = async () => {
      const barTracks = tracks.filter((track) => track.source === "bar");
      const sourceIds = Array.from(new Set(barTracks.map((track) => track.sourceId))).slice(0, 240);
      if (sourceIds.length === 0) {
        if (mounted) setHeartCooldowns({});
        return;
      }
      const recordKeyBySourceId = new Map(barTracks.map((track) => [track.sourceId, track.recordKey]));
      const since = new Date(Date.now() - HEART_COOLDOWN_MS).toISOString();
      const { data, error } = await supabase
        .from("listen_bar_track_reactions")
        .select("track_id, reaction, created_at")
        .eq("user_id", userId)
        .eq("reaction", "heart")
        .gte("created_at", since)
        .in("track_id", sourceIds);

      if (!mounted) return;
      if (error) {
        console.warn("[ai-music heart cooldowns]", error);
        return;
      }

      const cooldowns: HeartCooldownState = {};
      for (const row of (data ?? []) as Array<{ track_id?: string | null; created_at?: string | null }>) {
        const recordKey = row.track_id ? recordKeyBySourceId.get(row.track_id) : null;
        const cooldownUntil = heartCooldownUntil(row.created_at);
        if (recordKey && cooldownUntil && isHeartCoolingDown(cooldownUntil)) {
          cooldowns[recordKey] = cooldownUntil;
        }
      }
      setHeartCooldowns(cooldowns);
    };

    void loadHeartCooldowns();
    return () => {
      mounted = false;
    };
  }, [tracks, userId]);

  const groupedTracks = useMemo(() => {
    return buildAiMusicExploreGenreLanes(tracks).map((group) => ({
      ...group,
      label: t(MUSIC_GENRE_OPTIONS.find((option) => option.value === group.genre)?.labelKey ?? ""),
    }));
  }, [tracks, t]);

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

  const sendHeart = async (track: AiMusicTrack) => {
    setNotice("");
    if (track.source !== "bar") {
      setNotice(isZh ? "這筆展示紀錄目前沒有公播愛心資料。" : "This showcase record has no public-airplay heart data yet.");
      return;
    }
    if (isHeartCoolingDown(heartCooldowns[track.recordKey])) {
      setNotice(isZh ? "你已送過這首歌的愛心，24H 後可以再送一次。" : "You already sent a heart for this track. Try again after 24 hours.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setNotice(isZh ? "請先登入，每首歌 24H 內可以送 1 顆愛心。" : "Sign in to send one heart per track every 24 hours.");
      return;
    }

    setHeartBusy((current) => ({ ...current, [track.recordKey]: true }));
    try {
      const response = await fetch("/api/listen-bar/reaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trackId: track.sourceId,
          reaction: "heart",
        }),
      });
      const payload = (await response.json().catch(() => null)) as ListenBarReactionPayload | null;
      if (!response.ok || !payload?.counts) {
        setNotice(payload?.error || (isZh ? "愛心送出失敗，請稍後再試。" : "Heart failed. Try again later."));
        return;
      }
      const heartCount = Math.max(0, numberValue(payload.counts.heart));
      setTracks((current) =>
        current.map((item) => (item.recordKey === track.recordKey ? { ...item, heartCount } : item)),
      );
      setCurrentTrack((current) => (current?.recordKey === track.recordKey ? { ...current, heartCount } : current));
      const cooldownUntil = payload.heartCooldownUntil || new Date(Date.now() + HEART_COOLDOWN_MS).toISOString();
      setHeartCooldowns((current) => ({ ...current, [track.recordKey]: cooldownUntil }));
      setNotice(payload.alreadyReacted
        ? isZh
          ? "你已送過這首歌的愛心，24H 後可以再送一次。"
          : "You already sent a heart for this track. Try again after 24 hours."
        : isZh
          ? "今天的愛心已送出，歌曲已同步收藏到你的後台。"
          : "Heart sent. The track is saved in your profile.");
    } catch {
      setNotice(isZh ? "愛心送出失敗，請稍後再試。" : "Heart failed. Try again later.");
    } finally {
      setHeartBusy((current) => ({ ...current, [track.recordKey]: false }));
    }
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
  const navItems = [
    { href: "#works", label: isZh ? "作品瀏覽" : "Works" },
    { href: withLang("/listen-bar"), label: isZh ? "傷心酒吧" : "Bar Heartbreak" },
    { href: withLang("/battle"), label: "Drop Battle" },
    { href: withLang("/rank"), label: "Showtime" },
    { href: `/rank?lang=${lang}#choice-weekly`, label: "Choice" },
  ];
  const catalogMetadata = isZh
    ? `${totalVisibleTracks} 首公開作品 · ${MUSIC_GENRE_OPTIONS.length} 種風格`
    : `${totalVisibleTracks} public works · ${MUSIC_GENRE_OPTIONS.length} styles`;

  return (
    <main className={`${fontGlowSans.className} aipo-stage-bg relative min-h-screen overflow-hidden px-4 pb-28 pt-20 text-white sm:px-6 lg:px-8`}>
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="mb-4 border-b border-orange-200/18 pb-3 text-center">
          <div className="flex flex-col items-center gap-2.5 py-3 sm:py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
              <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.18em] text-orange-100/72`}>Explore AI Music</p>
            </div>
            <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 border-y border-orange-200/14 py-1.5 text-[11px] font-black text-orange-100/82">
              <span className={`${fontRighteous.className} uppercase tracking-[0.12em] text-orange-200`}>{isZh ? "作品庫" : "Catalog"}</span>
              <span className="text-zinc-500" aria-hidden="true">/</span>
              <span className="text-zinc-300">{catalogMetadata}</span>
            </div>
            <h1 className="ai-music-hero-title text-4xl font-black leading-none text-white sm:text-5xl">{isZh ? "AI 音樂作品" : "AI Music Works"}</h1>
            <p className="max-w-3xl text-sm font-black leading-6 text-yellow-200 sm:text-base">
              {isZh
                ? "依照風格快速瀏覽作品，聽歌、送愛心，或向你喜歡的作品發起挑戰。"
                : "Browse tracks by style, listen, send hearts, or start a challenge from music you like."}
            </p>
            <p className="text-xs font-bold leading-6 text-yellow-100 sm:text-sm">
              {isZh ? "上傳音樂讓大家看到你的作品，請從 " : "Upload your music so listeners can find it here. Submit through "}
              <Link href={`${withLang("/listen-bar")}#play-request`} className="font-black underline decoration-yellow-200/55 underline-offset-4 transition hover:text-white">
                {isZh ? "傷心酒吧投稿" : "Bar Heartbreak"}
              </Link>
              {isZh ? "。" : "."}
            </p>
          </div>
          <nav className="flex justify-center overflow-x-auto border-t border-white/8 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={isZh ? "探索 AI 音樂導覽" : "Explore AI Music navigation"}>
            <div className="flex min-w-max gap-0.5 px-2 sm:mx-auto sm:gap-1 sm:px-4">
              {navItems.map((item, index) => (
                <Link key={item.href} href={item.href} className={`inline-flex min-h-9 shrink-0 items-center border-b-2 px-2 text-[11px] font-black transition sm:px-3 sm:text-xs ${index === 0 ? "border-orange-300 text-white" : "border-transparent text-zinc-500 hover:border-cyan-100/55 hover:text-zinc-100"}`}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <section id="works" className="grid gap-5 scroll-mt-24">
          <div className="flex justify-center border-y border-white/10 py-3">
            <div className="flex items-center justify-center gap-2">
              <div className="inline-flex rounded-md border border-white/12 bg-black/54 p-1" role="group" aria-label={isZh ? "作品瀏覽方式" : "Works browsing mode"}>
              <button
                type="button"
                onClick={() => setWorksView("genre")}
                aria-pressed={worksView === "genre"}
                className={`min-h-9 rounded-sm px-3 text-xs font-black transition ${worksView === "genre" ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-white"}`}
              >
                {isZh ? "依類型" : "By Style"}
              </button>
              <button
                type="button"
                onClick={() => setWorksView("heat")}
                aria-pressed={worksView === "heat"}
                className={`min-h-9 rounded-sm px-3 text-xs font-black transition ${worksView === "heat" ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-white"}`}
              >
                {isZh ? "正在升溫" : "Hot Now"}
              </button>
              </div>
              <button
                ref={guideButtonRef}
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-md border border-orange-200/28 bg-black/54 p-1.5 transition hover:border-orange-100/70 hover:bg-orange-500/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100"
                aria-label={isZh ? "這裡怎麼玩？" : "How this works"}
                title={isZh ? "這裡怎麼玩？" : "How this works"}
              >
                <img src="/guide.png" alt="" className="h-full w-full object-contain" />
              </button>
            </div>
          </div>
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
          {loadState === "ready" && worksView === "heat" ? (
            <HeatList
              tracks={tracks}
              isZh={isZh}
              currentTrackId={currentTrack?.id ?? null}
              isPlaying={isPlaying}
              heartBusy={heartBusy}
              heartCooldowns={heartCooldowns}
              lang={lang}
              onPlay={handlePlayTrack}
              onHeart={(track) => void sendHeart(track)}
              onShare={(track) => void shareTrack(track)}
            />
          ) : null}
          {loadState === "ready" && worksView === "genre"
            ? groupedTracks.map((group) => {
                const expanded = Boolean(expandedGenres[group.genre]);
                const visible = expanded ? group.tracks : group.collapsedTracks;
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
                            heartBusy={Boolean(heartBusy[track.recordKey])}
                            heartedToday={isHeartCoolingDown(heartCooldowns[track.recordKey])}
                            lang={lang}
                            onPlay={handlePlayTrack}
                            onToggleExpand={(item) => setExpandedHud((current) => ({ ...current, [item.id]: !current[item.id] }))}
                            onHeart={(item) => void sendHeart(item)}
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

      {guideOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/78 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeGuide();
          }}
        >
          <div
            ref={guideDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-music-guide-title"
            className="max-h-[min(42rem,calc(100svh-3rem))] w-full max-w-xl overflow-y-auto border border-orange-200/40 bg-[#090807] shadow-[0_28px_90px_rgba(0,0,0,0.72)]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-orange-200/22 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <img src="/guide.png" alt="" className="h-8 w-11 shrink-0 object-contain" />
                <p className={`${fontRighteous.className} text-[11px] uppercase tracking-[0.18em] text-orange-100/72`}>Guide</p>
              </div>
              <button
                ref={guideCloseButtonRef}
                type="button"
                onClick={closeGuide}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-white/12 text-xl leading-none text-zinc-300 transition hover:border-orange-100/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100"
                aria-label={isZh ? "關閉說明" : "Close guide"}
                title={isZh ? "關閉" : "Close"}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <h2 id="ai-music-guide-title" className="text-2xl font-black text-white">{isZh ? "探索怎麼玩？" : "How Explore Works"}</h2>
              <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
                <div className="py-4 first:pt-0">
                  <h3 className="text-sm font-black text-orange-100">{isZh ? "逛作品" : "Browse works"}</h3>
                  <p className="mt-1.5 text-sm font-bold leading-6 text-zinc-300">
                    {isZh ? "依風格播放作品，喜歡就送愛心。" : "Play works by style and send a Heart when a track lands."}
                  </p>
                </div>
                <div className="py-4">
                  <h3 className="text-sm font-black text-orange-100">{isZh ? "收藏歌曲" : "Save tracks"}</h3>
                  <p className="mt-1.5 text-sm font-bold leading-6 text-zinc-300">
                    {isZh ? "愛心會同步加入收藏；從右上角頭像進入 Profile 可整理收藏歌曲。" : "A Heart also saves the track. Manage saved tracks from Profile through the avatar at the top right."}
                  </p>
                </div>
                <div className="py-4">
                  <h3 className="text-sm font-black text-orange-100">{isZh ? "發起攻擂" : "Start a challenge"}</h3>
                  <p className="mt-1.5 text-sm font-bold leading-6 text-zinc-300">
                    {isZh ? "看到作品封面右上紅色「接戰」角標，表示原作者已準備 60s Drop 並開放攻擂。" : "A red 接戰 badge at a cover's top right means the creator has prepared a 60s Drop and opened the work to challenges."}
                  </p>
                </div>
                <div className="py-4 last:pb-0">
                  <h3 className="text-sm font-black text-orange-100">{isZh ? "正式戰績" : "Official results"}</h3>
                  <p className="mt-1.5 text-sm font-bold leading-6 text-zinc-300">
                    {isZh ? "至少 3 位非參賽者完成投票才成立。進入 Showtime 的作品只供播放、收藏與分享，不再接戰。" : "A result needs at least three non-participant votes. Showtime works remain available to play, save, and share, but no longer accept challenges."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <MiniPlayer
        track={currentTrack}
        isZh={isZh}
        isPlaying={isPlaying}
        heartBusy={currentTrack ? Boolean(heartBusy[currentTrack.recordKey]) : false}
        heartedToday={currentTrack ? isHeartCoolingDown(heartCooldowns[currentTrack.recordKey]) : false}
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
        onHeart={(track) => void sendHeart(track)}
        onShare={(track) => void shareTrack(track)}
        audioRef={audioRef}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </main>
  );
}
