"use client";
import ParticipationGuide from "@/components/participation-guide";
import ExternalMusicPlayer from "@/components/external-music-player";
import type { ExternalMusic } from "@/lib/external-music";

import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import Link from "next/link";
import { ArrowRight, AudioLines, Headphones, Heart, MessageCircleMore, Pause, Play, Search, Share2, Swords, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { fontRighteous } from "@/lib/fonts";
import EditorialHeader from "@/components/editorial-header";
import { filterAiMusicTracks } from "@/lib/ai-music-filter";
import LyricsPopover from "@/components/lyrics-popover";
import ExploreRadio from "@/components/explore-radio";
import MusicPoolChart from "@/components/music-pool-chart";
import HomeWorkFeedback from "@/components/home-work-feedback";
import { isInDiscoveryMusicPool, rankMusicPool } from "@/lib/music-pool";
import type { HomeWork } from "@/lib/home-discovery";
import styles from "./ai-music.module.css";
import { useI18n } from "@/lib/i18n";
import {
  canonicalMusicGenre,
  isCurrentMusicGenre,
  MUSIC_GENRE_OPTIONS,
} from "@/lib/music-genres";
import { supabase } from "@/lib/supabase";
import { listenBarRowToTrack, type ListenBarTrackRow } from "@/lib/listen-bar";
import {
  aiMusicChallengeStatusLabel,
  hasPreparedAiMusicDefenderDrop,
  isAiMusicTrackChallengeableOnExplore,
  normalizeAiMusicChallengeStatus,
  shouldRetireAiMusicTrackFromExplore,
  type AiMusicChallengeStatus,
} from "@/lib/ai-music-challenge-rules";
import { buildAiMusicExploreGenreLanes, type AiMusicExploreOrderTrack } from "@/lib/ai-music-explore-order";
import { buildAiMusicHeatList, type AiMusicHeatTrack } from "@/lib/ai-music-heat";
import { isNewlyPublishedMusic } from "@/lib/music-newness";
import AuthRequiredDialog from "@/components/auth-required-dialog";
import NewMusicBadge from "@/components/new-music-badge";
import {
  markEarwormPromptSkipped,
  readEarwormLocalProfile,
  shouldPromptForEarwormFromBrowser,
  type EarwormLocalProfile,
} from "@/lib/earworm-profile";

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
  external?: ExternalMusic | null;
  lyrics: string | null;
  createdAt: string;
  heartCount: number;
  poolSupporterCount: number;
  blindSampleCount?: number;
  blindPreferencePoints?: number;
  popularityScore?: number;
  ratingAverage?: number | null;
  ratingCount?: number;
  ratingTotal?: number;
  earwormAffinitySampleCount: number;
  earwormAffinityPercent: number | null;
  positiveReactionCount: number;
  challengeCount: number;
  defenseSuccesses: number;
  wins: number;
  losses: number;
  audienceVotes: number;
  winRate: number;
  openForChallenge: boolean;
  hasDefenderDrop: boolean;
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
  heartedToday?: boolean;
  heartCancelled?: boolean;
  error?: string;
};

type LoadState = "loading" | "ready" | "error";
type HeartState = Record<string, boolean>;
type AiMusicApiTrackRow = ListenBarTrackRow & {
  ai_music_pool_supporter_count?: number | null;
  ai_music_blind_sample_count?: number | null;
  ai_music_blind_preference_points?: number | null;
  ai_music_popularity_score?: number | null;
  ai_music_rating_average?: number | null;
  ai_music_rating_count?: number | null;
  ai_music_rating_total?: number | null;
  ai_music_legacy_retirement_exempt?: boolean | null;
  ai_music_explore_retired?: boolean | null;
  ai_music_official_challenge_count?: number | null;
  ai_music_official_defense_successes?: number | null;
  ai_music_official_wins?: number | null;
  ai_music_official_losses?: number | null;
  ai_music_official_audience_votes?: number | null;
  ai_music_recent_heart_supporter_count?: number | null;
  ai_music_recent_official_audience_votes?: number | null;
  ai_music_recent_interaction_at?: string | null;
};

function localeText(lang: string, zh: string, en: string, ja: string, ko: string) {
  if (lang === "ja") return ja;
  if (lang === "ko") return ko;
  if (lang === "en") return en;
  return zh;
}

function exploreCopy(lang: string) {
  return {
    catalog: localeText(lang, "作品庫", "Catalog", "作品カタログ", "작품 카탈로그"),
    works: localeText(lang, "音樂作品", "Music Works", "音楽作品", "음악 작품"),
    subtitle: localeText(
      lang,
      "找到對味的歌，讓好作品被聽見。",
      "Find your sound. Give great music a place to be heard.",
      "好きな音楽を見つけ、素敵な作品に出会おう。",
      "취향에 맞는 노래를 찾고 좋은 음악을 함께 발견해요.",
    ),
    uploadPrefix: localeText(lang, "上傳音樂讓大家看到你的作品，請從 ", "Upload your music so listeners can find it here. Submit through ", "作品を公開するには、", "내 음악을 공개하려면 "),
    uploadLink: localeText(lang, "傷心酒吧投稿", "Bar Heartbreak", "Bar Heartbreakから投稿", "Bar Heartbreak에서 업로드"),
    uploadSuffix: localeText(lang, "。", ".", "してください。", "하세요."),
    navigation: localeText(lang, "探索 AI 音樂導覽", "Explore AI Music navigation", "AI音楽探索ナビゲーション", "AI 음악 탐색 내비게이션"),
    browseWorks: localeText(lang, "作品瀏覽", "Works", "作品を見る", "작품 보기"),
    bar: localeText(lang, "傷心酒吧", "Bar Heartbreak", "Bar Heartbreak", "Bar Heartbreak"),
    browseMode: localeText(lang, "作品瀏覽方式", "Works browsing mode", "作品の表示方法", "작품 탐색 방식"),
    byStyle: localeText(lang, "依曲風", "By Style", "ジャンル別", "장르별"),
    hotNow: localeText(lang, "正在升溫", "Hot Now", "注目上昇中", "인기 상승 중"),
    uploadAction: localeText(lang, "我要上傳我的音樂", "Upload My Music", "音楽を投稿", "내 음악 업로드"),
    loading: localeText(lang, "正在載入 AI 音樂作品...", "Loading AI music works...", "AI音楽作品を読み込んでいます…", "AI 음악 작품을 불러오는 중…"),
    loadError: localeText(lang, "作品載入失敗：", "Could not load works: ", "作品を読み込めませんでした：", "작품을 불러오지 못했습니다: "),
    less: localeText(lang, "收合", "Show Less", "閉じる", "접기"),
    more: localeText(lang, "看更多", "See More", "もっと見る", "더 보기"),
    empty: localeText(lang, "這個類型目前還沒有可展示作品。", "No public works in this style yet.", "このジャンルには公開作品がまだありません。", "이 장르에는 아직 공개 작품이 없습니다."),
    styleLane: localeText(lang, "風格分類", "Style Lane", "ジャンルレーン", "장르 레인"),
    close: localeText(lang, "關閉", "Close", "閉じる", "닫기"),
  };
}

function earwormExploreCopy(lang: string) {
  return {
    promptEyebrow: localeText(lang, "先讓耳朵帶路", "LET YOUR EARS LEAD", "まず耳で選ぶ", "먼저 귀로 골라요"),
    promptTitle: localeText(lang, "先測一下，你會更快遇到對味的歌。", "Take a quick test to find tracks that fit you faster.", "先にテストすると、好みの曲に早く出会えます。", "먼저 테스트하면 취향에 맞는 곡을 더 빨리 만나요."),
    promptBody: localeText(lang, "盲聽 10 首，每首會自動播放；第一耳就能選，選完立刻接下一首。完成後揭曉你的音樂主場，並把推薦帶回探索。", "Blind-listen to 10 tracks with automatic playback. React on first impression and the next track starts right away. Your result and recommendations return here.", "10曲を自動再生でブラインド試聴。第一印象で選ぶと、すぐ次の曲が流れます。結果とおすすめはExploreに戻ります。", "10곡을 자동 재생으로 블라인드 청취해요. 첫인상으로 고르면 바로 다음 곡이 재생되고, 결과와 추천은 Explore로 돌아옵니다."),
    start: localeText(lang, "開始耳朵測驗｜約 1 分鐘", "Start Ear Test · about 1 min", "耳テストを始める・約1分", "귀 테스트 시작 · 약 1분"),
    skip: localeText(lang, "先逛逛", "Browse first", "先に見てみる", "먼저 둘러보기"),
    reopen: localeText(lang, "測測你的耳朵", "Test your ears", "耳をテスト", "귀 테스트"),
    profileEyebrow: localeText(lang, "EARWORM FOR YOU", "EARWORM FOR YOU", "EARWORM FOR YOU", "EARWORM FOR YOU"),
    profileTitle: localeText(lang, "你的耳朵主場", "Your music home", "あなたの音楽ホーム", "당신의 음악 홈"),
    recommendedTitle: localeText(lang, "依你的耳朵推薦", "Picked for your ears", "あなたの耳におすすめ", "당신의 귀를 위한 추천"),
    recommendedBody: localeText(lang, "以你的主場與靠近方向為主，也留一點位置給意外驚喜。", "Mostly your strongest and nearby styles, with a little room for discovery.", "得意ジャンルを中心に、少しだけ新しい発見も混ぜています。", "주 취향과 가까운 장르를 중심으로 새로운 발견도 조금 섞었어요."),
  };
}

function numberValue(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number));
}



function canonicalGenreBucket(value: string | null | undefined) {
  const genre = canonicalMusicGenre(value);
  return isCurrentMusicGenre(genre) ? genre : "Original 自我風格";
}

function safeDate(value: string | null | undefined) {
  const parsed = new Date(value || "");
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date(0).toISOString();
}

function taipeiVoteDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : now.toISOString().slice(0, 10);
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

function listenBarAudioPlaybackUrl(path: string | null | undefined) {
  const clean = path?.trim();
  if (!clean) return null;
  if (/^(https?:|blob:|data:)/i.test(clean)) return clean;
  return `/api/listen-bar/audio/${clean.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

async function tracksFromListenBar(lang: string) {
  const response = await fetch(`/api/ai-music/tracks?lang=${encodeURIComponent(lang)}`, {
    cache: "default",
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
      const officialWins = numberValue(lifecycleRow.ai_music_official_wins);
      const officialLosses = numberValue(lifecycleRow.ai_music_official_losses);
      const officialAudienceVotes = numberValue(lifecycleRow.ai_music_official_audience_votes);
      const recentHeartSupporters = numberValue(lifecycleRow.ai_music_recent_heart_supporter_count);
      const recentOfficialAudienceVotes = numberValue(lifecycleRow.ai_music_recent_official_audience_votes);
      const isShowtimeCertified = Boolean(lifecycleRow.ai_music_legacy_retirement_exempt);
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
        statusLabel = localeText(lang, "尚未準備守擂 Drop", "Defender Drop missing", "防衛Dropが未準備", "방어 Drop 미준비");
      }
      if (retiredFromExplore) {
        statusLabel = localeText(lang, "8 場正式敗績退場", "Retired after 8 official losses", "公式戦8敗で退出", "공식 8패로 퇴장");
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
        audioUrl: listenBarAudioPlaybackUrl(row.audio_path) || track.audioUrl || storagePublicUrl("listen-bar-audio", row.audio_path), external: track.external,
        lyrics: row.lyrics?.trim() || track.lyrics?.trim() || null,
        createdAt: safeDate(track.createdAt),
        heartCount: numberValue(row.heart_count ?? track.positiveReactionCount),
        poolSupporterCount: numberValue(lifecycleRow.ai_music_pool_supporter_count),
        blindSampleCount: lifecycleRow.ai_music_blind_sample_count ?? undefined,
        blindPreferencePoints: lifecycleRow.ai_music_blind_preference_points ?? undefined,
        popularityScore: lifecycleRow.ai_music_popularity_score ?? undefined,
        ratingAverage: lifecycleRow.ai_music_rating_average ?? null,
        ratingCount: lifecycleRow.ai_music_rating_count ?? 0,
        ratingTotal: lifecycleRow.ai_music_rating_total ?? 0,
        positiveReactionCount: numberValue(row.positive_reaction_count ?? track.positiveReactionCount),
        earwormAffinitySampleCount: numberValue(row.earworm_affinity_sample_count),
        earwormAffinityPercent: typeof row.earworm_affinity_percent === "number"
          ? Math.min(100, Math.max(0, Math.round(row.earworm_affinity_percent)))
          : null,
        recentHeartSupporters,
        recentOfficialAudienceVotes,
        recentQualifiedInteractionAt: lifecycleRow.ai_music_recent_interaction_at ?? null,
        challengeCount: officialChallengeCount,
        defenseSuccesses: officialDefenseSuccesses,
        wins: officialWins,
        losses: officialLosses,
        audienceVotes: officialAudienceVotes,
        winRate,
        openForChallenge,
        hasDefenderDrop,
        retiredFromExplore,
        challengeStatus,
        statusLabel,
        href: aiMusicTrackHref(track.id, lang),
      };
    })
    .filter((track) => !track.retiredFromExplore);
}

function mergeDuplicateTracks(rows: AiMusicTrack[]) {
  // Different versions can share a title/creator; original work IDs are authoritative.
  return Array.from(new Map(rows.map(row => [row.id, row])).values());
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

function ChallengeReadyBadge({ lang }: { lang: string }) {
  const label = localeText(lang, "接戰", "OPEN", "挑戦可", "도전 가능");
  const title = localeText(
    lang,
    "原作者已準備 60s Drop，可接受攻擂。",
    "The creator has a defender 60s Drop ready.",
    "原作者が60秒のDropを用意し、挑戦を受け付けています。",
    "원작자가 60초 Drop을 준비해 도전을 받고 있습니다.",
  );
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

function EarwormAffinityStatus({
  track,
  lang,
}: {
  track: AiMusicTrack;
  lang: string;
}) {
  const showPublicSignal = track.earwormAffinityPercent !== null || track.earwormAffinitySampleCount > 0;
  if (!showPublicSignal) return null;
  const publicLabel = track.earwormAffinityPercent !== null
    ? localeText(lang, `好感度 ${track.earwormAffinityPercent}%`, `Affinity ${track.earwormAffinityPercent}%`, `好感度 ${track.earwormAffinityPercent}%`, `호감도 ${track.earwormAffinityPercent}%`)
    : localeText(lang, "好感度累積中", "Building affinity", "好感度を集計中", "호감도 집계 중");
  return (
    <div className={styles.affinity}>
      <span title={track.earwormAffinitySampleCount > 0 ? `${track.earwormAffinitySampleCount} responses` : undefined}>
        <AudioLines aria-hidden="true" />{publicLabel}
      </span>
    </div>
  );
}

function TrackCard({
  track,
  isPlaying,
  heartBusy,
  heartedToday,
  lang,
  catalogLabel,
  catalogNote,
  highlighted = false,
  onPrepare,
  onPlay,
  onHeart,
  onShare,
  onComment,
}: {
  track: AiMusicTrack;
  isPlaying: boolean;
  heartBusy: boolean;
  heartedToday: boolean;
  lang: string;
  catalogLabel?: string;
  catalogNote?: string;
  highlighted?: boolean;
  onPrepare: (track: AiMusicTrack) => void;
  onPlay: (track: AiMusicTrack) => void;
  onHeart: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
  onComment?: (track: AiMusicTrack) => void;
}) {
  const heartCount = Math.max(0, track.heartCount);
  const showNewBadge = isNewlyPublishedMusic(track.createdAt);
  const showChallengeReadyBadge = track.openForChallenge && Boolean(track.audioUrl);
  const heartActionLabel = heartedToday
    ? localeText(lang, "取消愛心與收藏", "Remove Heart and saved track", "Heartと保存を解除", "Heart와 저장 취소")
    : localeText(lang, "送出愛心支持", "Send a heart", "Heartを送る", "Heart 보내기");
  return (
    <article tabIndex={-1} id={`ai-music-work-${track.sourceId}`} className={`group ${styles.card} ${highlighted ? styles.highlighted : ""}`}>
      <div className={styles.cover}>
        <TrackCover track={track} className="h-full w-full" />
        {showNewBadge ? <NewMusicBadge lang={lang} className="absolute left-3 top-3 z-20" /> : null}
        {catalogLabel ? (
          <span className={`absolute left-3 ${showNewBadge ? "top-10" : "top-3"} rounded-sm border border-white/40 bg-black/75 px-2 py-1 text-[11px] font-bold text-white`}>
            {catalogLabel}
          </span>
        ) : null}
        {showChallengeReadyBadge ? <ChallengeReadyBadge lang={lang} /> : null}
        <button type="button" className={styles.play}
          onPointerDown={() => onPrepare(track)} onFocus={() => onPrepare(track)}
          onClick={() => onPlay(track)} disabled={!track.audioUrl && !track.external}
          aria-label={isPlaying ? localeText(lang, "暫停", "Pause", "一時停止", "일시정지") : localeText(lang, `播放 ${track.title}`, `Play ${track.title}`, `${track.title}を再生`, `${track.title} 재생`)}>
          {isPlaying ? <Pause fill="currentColor" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
        </button>
        <div className={styles.coverTools}>
          <LyricsPopover title={track.title} artist={track.creator} lyrics={track.lyrics} lang={lang} />
          <button type="button" onClick={() => onShare(track)} aria-label={localeText(lang, "分享", "Share", "共有", "공유")}>
            <Share2 aria-hidden="true" />
          </button>
        </div>
        <EarwormAffinityStatus track={track} lang={lang} />
      </div>
      <div className={styles.titleRow}>
        <h3><Link href={track.href}>{track.title}</Link></h3>
        <button type="button" className={styles.heart} onClick={() => onHeart(track)} disabled={heartBusy}
          aria-pressed={heartedToday} aria-label={heartActionLabel} title={`${heartActionLabel} · ${heartCount}`}>
          <Heart fill={heartedToday ? "currentColor" : "none"} aria-hidden="true" /><span className="sr-only">{heartCount}</span>
        </button>
        <button type="button" className={styles.comment} onClick={() => onComment?.(track)} aria-label={localeText(lang, `評論 ${track.title}`, `Comment on ${track.title}`, `${track.title}のコメント`, `${track.title} 댓글`)}><MessageCircleMore aria-hidden="true" /></button>
      </div>
      <div className={styles.creatorRow}>
        <p className={styles.creator} title={`${track.creator} · ${track.aiTool}`}>{track.creator}</p>
        {track.ratingCount && track.ratingAverage != null ? <span className={styles.trackRating} title={localeText(lang, `${track.ratingCount} 人評分`, `${track.ratingCount} raters`, `${track.ratingCount}人が評価`, `${track.ratingCount}명 평가`)}>{track.ratingAverage.toFixed(1)} / 10</span> : null}
        {track.openForChallenge ? <Link href={aiMusicChallengeHref(track, lang)} className={styles.challenge}>
          <Swords aria-hidden="true" />{localeText(lang, "攻擂", "Challenge", "挑戦", "도전")}
        </Link> : null}
      </div>
      {catalogNote ? <p className={styles.note}>{catalogNote}</p> : null}
    </article>
  );
}

function heatReason(track: AiMusicTrack, lang: string) {
  const signals: string[] = [];
  if (track.recentHeartSupporters > 0) {
    signals.push(localeText(lang, `近 7 日 ${track.recentHeartSupporters} 人支持`, `${track.recentHeartSupporters} supporters in 7d`, `直近7日で${track.recentHeartSupporters}人が支持`, `최근 7일 ${track.recentHeartSupporters}명 지지`));
  }
  if (track.recentOfficialAudienceVotes > 0) {
    signals.push(localeText(lang, `正式 Battle ${track.recentOfficialAudienceVotes} 有效票`, `${track.recentOfficialAudienceVotes} official votes`, `公式Battle 有効票${track.recentOfficialAudienceVotes}`, `공식 Battle 유효표 ${track.recentOfficialAudienceVotes}`));
  }
  return signals.join(" · ") || localeText(lang, "正在累積近期支持", "Building recent support", "最近の支持を集計中", "최근 지지를 모으는 중");
}

function HeatList({
  tracks,
  query,
  genre,
  currentTrackId,
  isPlaying,
  heartBusy,
  heartStates,
  lang,
  onPrepare,
  onPlay,
  onHeart,
  onShare,
  onComment,
}: {
  tracks: AiMusicTrack[];
  query: string;
  genre: string;
  currentTrackId: string | null;
  isPlaying: boolean;
  heartBusy: Record<string, boolean>;
  heartStates: HeartState;
  lang: string;
  onPrepare: (track: AiMusicTrack) => void;
  onPlay: (track: AiMusicTrack) => void;
  onHeart: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
  onComment?: (track: AiMusicTrack) => void;
}) {
  const matchingIds = new Set(filterAiMusicTracks(tracks, query, genre).map(track => track.id));
  const rows = buildAiMusicHeatList(tracks).filter(row => matchingIds.has(row.track.id));
  return (
    <section className={styles.section} aria-label={localeText(lang, "正在升溫作品", "Hot Now works", "注目上昇中の作品", "인기 상승 작품")}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.2em] text-orange-100/68`}>AIPOGER HEAT</p>
          <h2 >{localeText(lang, "正在升溫", "Hot Now", "注目上昇中", "인기 상승 중")}</h2>
        </div>
        <p className="max-w-sm text-xs font-bold leading-5 text-zinc-500">
          {localeText(lang, "依近 7 日不同帳號支持與已成立正式 Battle 有效票排序。", "Ordered by 7-day distinct supporters and official Battle audience votes.", "直近7日間の異なるアカウントからの支持と、成立した公式Battleの有効票で並びます。", "최근 7일간 서로 다른 계정의 지지와 성립된 공식 Battle 유효표 순으로 정렬합니다.")}
        </p>
      </div>

      <div className={styles.grid}>
        {rows.map(({ track, rank, hasRecentSignal }) => {
          return (
            <TrackCard
              key={track.id}
              track={track}
              isPlaying={currentTrackId === track.id && isPlaying}
              heartBusy={Boolean(heartBusy[track.recordKey])}
              heartedToday={Boolean(heartStates[track.recordKey])}
              lang={lang}
              catalogLabel={rank ? `#${String(rank).padStart(2, "0")}` : localeText(lang, "累積", "BUILDING", "集計中", "집계 중")}
              catalogNote={hasRecentSignal ? heatReason(track, lang) : undefined}
              onPrepare={onPrepare}
              onPlay={onPlay}
              onHeart={onHeart}
              onShare={onShare}
              onComment={onComment}
            />
          );
        })}
      </div>
    </section>
  );
}

export default function AiMusicClient() {
  const { lang, t } = useI18n();
  const copy = exploreCopy(lang);
  const earwormCopy = earwormExploreCopy(lang);
  const [loadVersion, setLoadVersion] = useState(0);
  const loadLanguage = useRef("");
  const [poolNow, setPoolNow] = useState(Date.now());
  const [commentTrack, setCommentTrack] = useState<AiMusicTrack | null>(null);
  const [externalTrack, setExternalTrack] = useState<AiMusicTrack | null>(null);
  const externalDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if(externalTrack) externalDialog.current?.showModal(); else externalDialog.current?.close(); }, [externalTrack]);
  const [locateVersion, setLocateVersion] = useState(0);
  const located = useRef("");
  const preparedLocate = useRef("");
  const heartLocks = useRef(new Set<string>());
  const authIdentity = useRef<string | null>(null);
  const [highlightedId, setHighlightedId] = useState("");
  const [tracks, setTracks] = useState<AiMusicTrack[]>([]);
  const [worksView, setWorksView] = useState<"genre" | "heat">("genre");
  const [query, setQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [earwormPromptOpen, setEarwormPromptOpen] = useState(false);
  const [earwormProfile, setEarwormProfile] = useState<EarwormLocalProfile | null>(null);
  const [sharedTrackSourceId, setSharedTrackSourceId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [expandedGenres, setExpandedGenres] = useState<Record<string, boolean>>({});
  const [heartBusy, setHeartBusy] = useState<Record<string, boolean>>({});
  const [heartStates, setHeartStates] = useState<HeartState>({});
  const [authPromptTrack, setAuthPromptTrack] = useState<AiMusicTrack | null>(null);
  const [notice, setNotice] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const player = useMusicPlayer();
  const activePlayerTrack = player.session?.queue[player.session.index];
  const currentTrack = tracks.find(track => track.sourceId === activePlayerTrack?.heartTrackId || track.id === activePlayerTrack?.id) ?? null;
  const poolTracks = useMemo(() => tracks.filter(track => isInDiscoveryMusicPool(track.createdAt, track.sourceId, poolNow)), [tracks, poolNow]);
  const chartRows = useMemo(() => rankMusicPool(poolTracks, poolNow), [poolTracks, poolNow]);
  const isPlaying = Boolean(currentTrack && player.playing);
  const earwormDialogRef = useRef<HTMLDivElement | null>(null);
  const earwormStartRef = useRef<HTMLAnchorElement | null>(null);


  const closeEarwormPrompt = useCallback(() => {
    markEarwormPromptSkipped();
    setEarwormPromptOpen(false);
  }, []);
  const prepareTrack = () => {};

  useEffect(() => {
    const profile = readEarwormLocalProfile();
    setEarwormProfile(profile);
    if (!shouldPromptForEarwormFromBrowser(profile)) return;
    const frame = window.requestAnimationFrame(() => setEarwormPromptOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!earwormPromptOpen) return;
    const frame = window.requestAnimationFrame(() => earwormStartRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeEarwormPrompt();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = earwormDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeEarwormPrompt, earwormPromptOpen]);

  useEffect(() => {
    const updateSharedTrack = () => {
      const trackId = new URLSearchParams(window.location.search).get("track")?.trim() || null;
      setSharedTrackSourceId(trackId);
      setLocateVersion(version => version + 1);
    };
    updateSharedTrack();
    window.addEventListener("popstate", updateSharedTrack);
    return () => window.removeEventListener("popstate", updateSharedTrack);
  }, []);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) { authIdentity.current = data.session?.user.id ?? null; setUserId(authIdentity.current); }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authIdentity.current = session?.user.id ?? null; setUserId(authIdentity.current);
      setHeartStates({}); setAuthPromptTrack(null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (loadLanguage.current !== lang) { setLoadState("loading"); loadLanguage.current = lang; }
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
  }, [lang, loadVersion]);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") { setPoolNow(Date.now()); setLoadVersion(value => value + 1); } };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("aipoger:mv-rating", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("aipoger:mv-rating", refresh); };
  }, []);

  useEffect(() => {
    if (!sharedTrackSourceId || tracks.length === 0) return;
    const sharedTrack = tracks.find((track) => track.sourceId === sharedTrackSourceId);
    if (!sharedTrack) return;
    const key = `${sharedTrackSourceId}:${locateVersion}`;
    if (preparedLocate.current === key) return;
    preparedLocate.current = key;
    setWorksView("genre");
    setQuery(""); setSelectedGenre("");
    setExpandedGenres((current) => (
      current[sharedTrack.genre] ? current : { ...current, [sharedTrack.genre]: true }
    ));
  }, [sharedTrackSourceId, tracks, locateVersion]);

  useEffect(() => {
    if (!sharedTrackSourceId || worksView !== "genre" || loadState !== "ready") return;
    const sharedTrack = poolTracks.find(track => track.sourceId === sharedTrackSourceId);
    if (!sharedTrack || !expandedGenres[sharedTrack.genre] || query || selectedGenre) return;
    const key = `${sharedTrackSourceId}:${locateVersion}`;
    if (located.current === key) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`ai-music-work-${sharedTrack.sourceId}`);
      if (!element) return;
      located.current = key;
      element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
      element.focus({ preventScroll: true });
      setHighlightedId(sharedTrack.sourceId);
      if (new URLSearchParams(window.location.search).get("comments") === "1") setCommentTrack(sharedTrack);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [expandedGenres, sharedTrackSourceId, poolTracks, worksView, loadState, query, selectedGenre, locateVersion]);
  useEffect(() => {
    if (!highlightedId) return;
    const timer = window.setTimeout(() => setHighlightedId(""), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightedId]);
  const locateTrack = (track: AiMusicTrack) => {
    setWorksView("genre"); setQuery(""); setSelectedGenre("");
    setSharedTrackSourceId(track.sourceId); setLocateVersion(version => version + 1);
    const url = new URL(window.location.href); url.searchParams.set("track", track.sourceId); url.searchParams.delete("comments"); url.hash = "works";
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  };

  useEffect(() => {
    if (!userId || tracks.length === 0) {
      setHeartStates({});
      return;
    }

    let mounted = true;
    const loadHeartStates = async () => {
      const barTracks = tracks.filter((track) => track.source === "bar");
      const sourceIds = Array.from(new Set(barTracks.map((track) => track.sourceId)));
      if (sourceIds.length === 0) {
        if (mounted) setHeartStates({});
        return;
      }
      const recordKeyBySourceId = new Map(barTracks.map((track) => [track.sourceId, track.recordKey]));
      const voteDate = taipeiVoteDate();
      const states: HeartState = {};
      for (let offset = 0; offset < sourceIds.length; offset += 100) {
        const { data, error } = await supabase.from("listen_bar_track_reactions").select("track_id, reaction")
          .eq("user_id", userId).eq("reaction", "heart").eq("vote_date", voteDate).in("track_id", sourceIds.slice(offset, offset + 100));
        if (!mounted) return;
        if (error) { console.warn("[ai-music heart states]", error); return; }
        for (const row of (data ?? []) as Array<{ track_id?: string | null }>) {
          const recordKey = row.track_id ? recordKeyBySourceId.get(row.track_id) : null;
          if (recordKey) states[recordKey] = true;
        }
      }
      setHeartStates(states);
    };

    void loadHeartStates();
    return () => {
      mounted = false;
    };
  }, [tracks, userId]);

  const allGroupedTracks = useMemo(() => {
    return buildAiMusicExploreGenreLanes(poolTracks).map((group) => ({
      ...group,
      label: t(MUSIC_GENRE_OPTIONS.find((option) => option.value === group.genre)?.labelKey ?? ""),
    }));
  }, [poolTracks, t]);

  const earwormRecommendations = useMemo(() => {
    if (!earwormProfile) return [];
    const preferredGenres = [earwormProfile.primaryGenre, ...earwormProfile.secondaryGenres];
    const relevant = poolTracks
      .filter((track) => preferredGenres.includes(track.genre))
      .sort((left, right) => preferredGenres.indexOf(left.genre) - preferredGenres.indexOf(right.genre) || right.heartCount - left.heartCount || left.sourceId.localeCompare(right.sourceId));
    const discovery = poolTracks
      .filter((track) => !preferredGenres.includes(track.genre))
      .sort((left, right) => right.heartCount - left.heartCount || left.sourceId.localeCompare(right.sourceId));
    return [...relevant.slice(0, 3), ...discovery.slice(0, 1), ...relevant.slice(3), ...discovery.slice(1)].slice(0, 4);
  }, [earwormProfile, poolTracks]);

  const filteredTracks = useMemo(() => filterAiMusicTracks(poolTracks, query, selectedGenre), [poolTracks, query, selectedGenre]);
  const visibleRecommendations = useMemo(() => filterAiMusicTracks(earwormRecommendations, query, selectedGenre), [earwormRecommendations, query, selectedGenre]);
  const groupedTracks = useMemo(() => {
    const recommendedIds = new Set(visibleRecommendations.map(track => track.id));
    const genreOrder = new Map(allGroupedTracks.map((group, index) => [group.genre, index]));
    return buildAiMusicExploreGenreLanes(filteredTracks.filter(track => !recommendedIds.has(track.id)))
      .filter(group => group.tracks.length > 0)
      .sort((left, right) => (genreOrder.get(left.genre) ?? 0) - (genreOrder.get(right.genre) ?? 0))
      .map(group => ({ ...group, collapsedTracks: group.collapsedTracks.slice(0,4), label: t(MUSIC_GENRE_OPTIONS.find(option => option.value === group.genre)?.labelKey ?? "") }));
  }, [allGroupedTracks, filteredTracks, visibleRecommendations, t]);

  useEffect(() => {
    if (!earwormProfile || loadState !== "ready") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") !== "for-you" && window.location.hash !== "#earworm-for-you") return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("earworm-for-you")?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [earwormProfile, loadState]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handlePlayTrack = (track: AiMusicTrack) => {
    if(track.external) { setExternalTrack(track); return; }
    if (!track.audioUrl) {
      setNotice(localeText(lang, "這首作品目前沒有可播放音檔。", "This track has no playable audio yet.", "この作品には再生できる音源がまだありません。", "이 작품에는 아직 재생 가능한 음원이 없습니다."));
      return;
    }
    if (currentTrack?.id === track.id) { musicPlayer?.toggle(); return; }
    const sourceTracks = worksView === "heat"
      ? buildAiMusicHeatList(poolTracks).map(row => row.track)
      : allGroupedTracks.find(group => group.genre === track.genre)?.tracks ?? tracks;
    const queue = sourceTracks.filter(item => item.audioUrl).map(item => ({
      id: item.id, heartTrackId: item.source === "bar" ? item.sourceId : undefined, title: item.title, artist: item.creator, coverUrl: item.coverUrl,
      audioUrl: item.audioUrl!, lyrics: item.lyrics ?? undefined, genre: item.genre,
    }));
    void musicPlayer?.start(queue, Math.max(0, queue.findIndex(item => item.id === track.id)),
      localeText(lang, "探索", "Explore", "探索", "탐색") + " · " + (worksView === "heat" ? copy.hotNow : track.genre), { sourceKey: "explore" });
  };

  useEffect(() => {
    const updateHeart = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.trackId || !detail.counts) return;
      setLoadVersion(value => value + 1);
      setTracks(current => current.map(track => track.sourceId === detail.trackId ? { ...track, heartCount: detail.counts.heart } : track));
      setHeartStates(current => ({ ...current, [`bar:${detail.trackId}`]: detail.heartedToday === true }));
    };
    window.addEventListener("aipoger:music-heart", updateHeart);
    return () => window.removeEventListener("aipoger:music-heart", updateHeart);
  }, []);
  const sendHeart = async (track: AiMusicTrack) => {
    if (track.source !== "bar" || heartLocks.current.has(track.recordKey)) return;
    heartLocks.current.add(track.recordKey);
    setHeartBusy(current => ({ ...current, [track.recordKey]: true }));
    setNotice("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setAuthPromptTrack(track); return; }
      const response = await fetch("/api/listen-bar/reaction", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ trackId: track.sourceId, reaction: "heart" }),
      });
      const payload = await response.json().catch(() => null) as ListenBarReactionPayload | null;
      if (!response.ok || !payload?.counts) throw new Error(payload?.error || localeText(lang, "愛心送出失敗，請稍後再試。", "Heart failed. Try again later.", "Heartを送れませんでした。", "Heart 전송에 실패했습니다."));
      setLoadVersion(value => value + 1);
      if (authIdentity.current !== session.user.id) return;
      const heartCount = numberValue(payload.counts.heart);
      setTracks(current => current.map(item => item.recordKey === track.recordKey ? { ...item, heartCount } : item));
      setHeartStates(current => ({ ...current, [track.recordKey]: payload.heartedToday === true }));
      setNotice(payload.heartedToday
        ? localeText(lang, "已送出愛心並加入收藏。", "Heart sent and track saved.", "Heartを送り、保存しました。", "Heart를 보내고 저장했습니다.")
        : localeText(lang, "已取消愛心與收藏。", "Heart and saved track removed.", "Heartと保存を解除しました。", "Heart와 저장을 취소했습니다."));
      window.dispatchEvent(new CustomEvent("aipoger:music-heart", { detail: { trackId: track.sourceId, ...payload } }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : localeText(lang, "愛心送出失敗。", "Heart failed.", "Heartを送れませんでした。", "Heart 전송에 실패했습니다."));
    } finally {
      heartLocks.current.delete(track.recordKey);
      setHeartBusy(current => ({ ...current, [track.recordKey]: false }));
    }
  };

  const shareExplore = async () => {
    const url = `https://aipoger.com/ai-music?lang=${lang}`;
    const title = localeText(lang, "探索音樂｜AIPOGER", "Explore Music | AIPOGER", "音楽を探す｜AIPOGER", "음악 탐색 | AIPOGER");
    const text = localeText(lang, "在 AIPOGER 發現好音樂，一起聽歌、評分。", "Discover music on AIPOGER. Listen and share your ratings.", "AIPOGERで音楽を見つけて、聴いて評価しよう。", "AIPOGER에서 음악을 발견하고 함께 듣고 평가해요.");
    const copied = localeText(lang, "探索音樂連結已複製。", "Explore Music link copied.", "音楽探索のリンクをコピーしました。", "음악 탐색 링크를 복사했습니다.");
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setNotice(copied);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setNotice(copied);
      } catch {
        setNotice(localeText(lang, "分享失敗，請稍後再試。", "Share failed. Try again later.", "共有できませんでした。しばらくしてから再試行してください。", "공유에 실패했습니다. 잠시 후 다시 시도해 주세요."));
      }
    }
  };
  const shareTrack = async (track: AiMusicTrack) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${track.href}` : track.href;
    const text = localeText(lang, `在 AIPOGER 聽 ${track.creator} 的《${track.title}》`, `Listen to "${track.title}" by ${track.creator} on AIPOGER`, `AIPOGERで${track.creator}の「${track.title}」を聴く`, `AIPOGER에서 ${track.creator}의 '${track.title}' 듣기`);
    const fallback = `${text}\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: track.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(fallback);
      setNotice(localeText(lang, "作品連結已複製。", "Track link copied.", "作品リンクをコピーしました。", "작품 링크를 복사했습니다."));
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(fallback);
        setNotice(localeText(lang, "作品連結已複製。", "Track link copied.", "作品リンクをコピーしました。", "작품 링크를 복사했습니다."));
      } catch {
        setNotice(localeText(lang, "分享失敗，請稍後再試。", "Share failed. Try again later.", "共有できませんでした。しばらくしてから再試行してください。", "공유에 실패했습니다. 잠시 후 다시 시도해 주세요."));
      }
    }
  };

  const totalVisibleTracks = allGroupedTracks.reduce((sum, group) => sum + group.tracks.length, 0);
  const catalogMetadata = localeText(lang,
    `${totalVisibleTracks} 首公開作品 · ${MUSIC_GENRE_OPTIONS.length} 種風格`,
    `${totalVisibleTracks} public works · ${MUSIC_GENRE_OPTIONS.length} styles`,
    `公開作品 ${totalVisibleTracks}曲 · ${MUSIC_GENRE_OPTIONS.length}ジャンル`,
    `공개 작품 ${totalVisibleTracks}곡 · ${MUSIC_GENRE_OPTIONS.length}개 장르`);
  const hasFilters = Boolean(query.trim() || selectedGenre);
  const resetFilters = () => { setQuery(""); setSelectedGenre(""); };
  const renderTrack = (track: AiMusicTrack, catalogLabel?: string) => <TrackCard
    key={track.id} track={track} lang={lang} catalogLabel={catalogLabel} highlighted={highlightedId === track.sourceId}
    isPlaying={currentTrack?.id === track.id && isPlaying}
    heartBusy={Boolean(heartBusy[track.recordKey])}
    heartedToday={Boolean(heartStates[track.recordKey])}
    onPrepare={prepareTrack} onPlay={handlePlayTrack}
    onHeart={item => void sendHeart(item)} onShare={item => void shareTrack(item)} onComment={setCommentTrack} />;
  const earTestButton = <button type="button" className={styles.earTest} onClick={() => setEarwormPromptOpen(true)}>
    <Headphones aria-hidden="true" />{earwormCopy.reopen}
  </button>;
  const feedbackWork: HomeWork | null = commentTrack ? { id: commentTrack.sourceId, title: commentTrack.title, artist: commentTrack.creator, genre: commentTrack.genre, description: "", coverUrl: commentTrack.coverUrl, audioUrl: commentTrack.audioUrl ?? "", lyrics: commentTrack.lyrics ?? "", videoId: null, youtubeUrl: null, supporterCount: commentTrack.poolSupporterCount, publishedAt: commentTrack.createdAt } : null;
  const radioTracks = useMemo(() => poolTracks.filter(track => track.audioUrl || track.external?.provider === "youtube").map(track => ({ id: track.sourceId, heartTrackId: track.sourceId, title: track.title, artist: track.creator, coverUrl: track.coverUrl, audioUrl: track.audioUrl ?? "", youtubeId: !track.audioUrl && track.external?.provider === "youtube" ? track.external.mediaId : undefined, genre: track.genre, lyrics: track.lyrics ?? undefined })), [poolTracks]);
  const chartProps = { rows: chartRows, ready: loadState === "ready", error: loadState === "error", heartStates, heartBusy, onPlay: handlePlayTrack, onLocate: locateTrack, onHeart: (track: AiMusicTrack) => void sendHeart(track) };
  const showRecommendations = loadState === "ready" && worksView === "genre" && visibleRecommendations.length > 0;

  return (
    <div className={styles.page}>
      <EditorialHeader active="explore" />
      <dialog ref={externalDialog} className={styles.chartDialog} aria-label={externalTrack?.title} onCancel={() => setExternalTrack(null)} onClick={e=>{if(e.target===e.currentTarget)setExternalTrack(null);}}>
        <button autoFocus className={styles.chartClose} aria-label={copy.close} onClick={()=>setExternalTrack(null)}><X/></button>
        {externalTrack?.external ? <ExternalMusicPlayer media={externalTrack.external} title={externalTrack.title}/> : null}
      </dialog>
      {feedbackWork ? <HomeWorkFeedback key={feedbackWork.id} work={feedbackWork} supportNote={localeText(lang, "愛心、填寫的分數與盲聽支持累積成排行總分；留言文字本身不加分。自己的作品不自評。", "Hearts, numeric ratings and blind preferences contribute to total chart points. Comment text adds no chart points. Creators cannot rate their own work.", "支持・入力した評価・ブラインド試聴の支持を累積して順位を決めます。コメント本文は加点されません。自分の作品には採点できません。", "하트, 입력한 평점, 블라인드 선호를 누적해 순위를 정해요. 댓글 내용 자체는 차트 점수를 더하지 않아요. 내 작품은 평가할 수 없어요.")} returnPath={`/ai-music?track=${feedbackWork.id}#works`} onClose={() => setCommentTrack(null)} onChange={() => setLoadVersion(value => value + 1)} /> : null}
      <main className={styles.main}>
        <ExploreRadio tracks={radioTracks} ready={loadState === "ready"} hearted={Boolean(currentTrack && heartStates[currentTrack.recordKey])} heartBusy={Boolean(currentTrack && heartBusy[currentTrack.recordKey])}
          onHeart={id => { const track = poolTracks.find(track => track.sourceId === id); if (track) void sendHeart(track); }}
          onComment={id => { const track = poolTracks.find(track => track.sourceId === id); if (track) setCommentTrack(track); }} />
        <div className={styles.intro}>
          <div>
            <div className={styles.introTitle}>
              <h1>{localeText(lang, "探索音樂", "Explore Music", "音楽を探す", "음악 탐색")}</h1>
              <button type="button" className={styles.shareExplore} onClick={() => void shareExplore()}
                aria-label={localeText(lang, "分享探索音樂", "Share Explore Music", "音楽探索を共有", "음악 탐색 공유")}
                title={localeText(lang, "分享探索音樂", "Share Explore Music", "音楽探索を共有", "음악 탐색 공유")}>
                <Share2 aria-hidden="true" />
              </button>
            </div>
            <p>{copy.subtitle}</p>
          </div>
          <div className={styles.introActions}>
            <div className={styles.search}>
              <Search aria-hidden="true" />
              <input type="search" value={query} onChange={event => setQuery(event.target.value)}
                aria-label={localeText(lang, "搜尋作品或創作者", "Search tracks or creators", "曲やクリエイターを検索", "곡 또는 크리에이터 검색")}
                placeholder={localeText(lang, "搜尋作品或創作者", "Search tracks or creators", "曲やクリエイターを検索", "곡 또는 크리에이터 검색")} />
              {query ? <button type="button" onClick={() => setQuery("")} aria-label={localeText(lang, "清除搜尋", "Clear search", "検索をクリア", "검색 지우기")}><X aria-hidden="true" /></button> : null}
            </div>
            <div className={styles.sectionActions}>{earTestButton}</div>
          </div>
        </div>
        <section id="works">
          <div className={styles.controls}>
            <div className={styles.modes} role="group" aria-label={copy.browseMode}>
              <button type="button" onClick={() => setWorksView("genre")} aria-pressed={worksView === "genre"}>{copy.byStyle}</button>
              <button type="button" onClick={() => setWorksView("heat")} aria-pressed={worksView === "heat"}>{copy.hotNow}</button>
            </div>
            <select value={selectedGenre} onChange={event => setSelectedGenre(event.target.value)} aria-label={localeText(lang, "選擇曲風", "Choose genre", "ジャンルを選ぶ", "장르 선택")}>
              <option value="">{localeText(lang, "全部曲風", "All genres", "すべてのジャンル", "모든 장르")}</option>
              {MUSIC_GENRE_OPTIONS.map(option => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}
            </select>
            <ParticipationGuide surface="explore" lang={lang} className={styles.guide} />
          </div>
          <div className={styles.discovery}>
            <aside className={styles.chartColumn}><MusicPoolChart {...chartProps} /></aside>
          <div className={styles.catalog} data-highlighted-work={highlightedId}>
            {loadState === "loading" ? <p className={styles.state} role="status">{copy.loading}</p> : null}
            {loadState === "error" ? <p className={styles.state} role="alert">{copy.loadError} {loadError}</p> : null}
            {loadState === "ready" && filteredTracks.length === 0 ? <div className={styles.state} role="status">
              {localeText(lang, "沒有找到符合條件的作品。", "No tracks match your search.", "条件に合う作品が見つかりません。", "조건에 맞는 곡이 없습니다.")}
              {hasFilters ? <button type="button" onClick={resetFilters}>{localeText(lang, "清除篩選", "Clear filters", "絞り込みをクリア", "필터 지우기")}</button> : null}
            </div> : null}
            {showRecommendations ? <section id="earworm-for-you" className={styles.section}>
              <div className={styles.sectionHeading}>
                <div className={styles.headingText}>
                  <h2>{localeText(lang, "為你推薦", "For You", "あなたへのおすすめ", "맞춤 추천")}</h2>
                  <span>{t(MUSIC_GENRE_OPTIONS.find(option => option.value === earwormProfile?.primaryGenre)?.labelKey ?? "")}</span>
                </div>
              </div>
              <div className={styles.grid}>{visibleRecommendations.map(track => renderTrack(track))}</div>
            </section> : null}
            {loadState === "ready" && worksView === "heat" ? <>
              <HeatList tracks={poolTracks} query={query} genre={selectedGenre}
                currentTrackId={currentTrack?.id ?? null} isPlaying={isPlaying}
                heartBusy={heartBusy} heartStates={heartStates} lang={lang}
                onPrepare={prepareTrack} onPlay={handlePlayTrack}
                onHeart={item => void sendHeart(item)} onShare={item => void shareTrack(item)} onComment={setCommentTrack} />
            </> : null}
            {loadState === "ready" && worksView === "genre" ? groupedTracks.map((group, index) => {
              const expanded = Boolean(expandedGenres[group.genre]);
              const visible = query.trim() || expanded ? group.tracks : group.collapsedTracks;
              return <section key={group.genre} className={styles.section}>
                <div className={styles.sectionHeading}>
                  <div className={styles.headingText}>
                    <h2>{index === 0 ? localeText(lang, "更多音樂", "More Music", "もっと音楽を", "더 많은 음악") : group.label}</h2>
                    {index === 0 ? <span>{group.label}</span> : null}
                  </div>
                  <div className={styles.sectionActions}>
                    <span>{group.tracks.length}</span>
                    {group.tracks.length > group.collapsedTracks.length && !query.trim() ? <button type="button" onClick={() => setExpandedGenres(current => ({ ...current, [group.genre]: !expanded }))} aria-expanded={expanded}>
                      {expanded ? copy.less : copy.more}
                    </button> : null}
                  </div>
                </div>
                <div className={styles.grid}>{visible.map(track => renderTrack(track))}</div>
              </section>;
            }) : null}
          </div>
          </div>
          {loadState === "ready" ? <p className={styles.count}>{catalogMetadata}</p> : null}
        </section>
      </main>

      {notice ? (
        <div className="fixed bottom-24 left-1/2 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-md border border-orange-200/28 bg-black/92 px-4 py-3 text-center text-sm font-bold text-orange-50 shadow-[0_18px_50px_rgba(0,0,0,0.52)]">
          {notice}
        </div>
      ) : null}

      {earwormPromptOpen ? (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/82 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-5 sm:py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEarwormPrompt();
          }}
        >
          <div
            ref={earwormDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="earworm-explore-prompt-title"
            className="relative w-full max-w-2xl overflow-hidden rounded-t-[1.65rem] border border-orange-200/35 bg-[#090807] shadow-[0_30px_110px_rgba(0,0,0,0.78),0_0_50px_rgba(255,106,0,0.12)] sm:rounded-[1.4rem]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,106,0,0.24),transparent_36%),radial-gradient(circle_at_92%_12%,rgba(0,202,255,0.12),transparent_32%)]" aria-hidden="true" />
            <div className="relative grid gap-5 px-5 py-6 sm:grid-cols-[auto_1fr] sm:gap-6 sm:px-7 sm:py-7">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-orange-200/42 bg-orange-500/12 text-orange-100 shadow-[0_0_35px_rgba(255,106,0,0.2)] sm:h-20 sm:w-20">
                <Headphones className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className={`${fontRighteous.className} text-[10px] tracking-[0.22em] text-orange-200/72`}>{earwormCopy.promptEyebrow}</p>
                <h2 id="earworm-explore-prompt-title" className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                  {earwormCopy.promptTitle}
                </h2>
                <p className="mt-3 text-sm font-bold leading-6 text-zinc-300">{earwormCopy.promptBody}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Link
                    ref={earwormStartRef}
                    href={`/earworm?return=${encodeURIComponent(`/ai-music?view=for-you&lang=${lang}#earworm-for-you`)}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-orange-100/70 bg-orange-500 px-4 text-sm font-black text-black shadow-[0_0_26px_rgba(255,106,0,0.24)] transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100"
                  >
                    {earwormCopy.start}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={closeEarwormPrompt}
                    className="min-h-12 rounded-md border border-white/12 bg-white/[0.04] px-5 text-sm font-black text-zinc-300 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100"
                  >
                    {earwormCopy.skip}
                  </button>
                </div>
                <p className="mt-3 text-[10px] font-bold leading-4 text-zinc-500">
                  {localeText(lang, "訪客也能得到個人結果；公開好感只統計登入帳號，滿 20 人才顯示百分比。", "Guests still get a personal result; public affinity appears after 20 signed-in responses.", "ゲストも個人結果を取得でき、公開好感はログイン回答20件から表示します。", "게스트도 개인 결과를 받고, 공개 호감도는 로그인 응답 20명부터 표시돼요.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AuthRequiredDialog
        open={Boolean(authPromptTrack)}
        kind="heart"
        lang={lang}
        nextPath={authPromptTrack ? aiMusicTrackHref(authPromptTrack.sourceId, lang) : `/ai-music?lang=${lang}`}
        onClose={() => setAuthPromptTrack(null)}
      />

    </div>
  );
}
