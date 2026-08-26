"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, AudioLines, Headphones, Upload, Volume2 } from "lucide-react";
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { fontGlowSans, fontRighteous, fontSourceSerifTC } from "@/lib/fonts";
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
  lyrics: string | null;
  createdAt: string;
  heartCount: number;
  earwormAffinitySampleCount: number;
  earwormAffinityPercent: number | null;
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
  heartedToday?: boolean;
  heartCancelled?: boolean;
  error?: string;
};

type LoadState = "loading" | "ready" | "error";
type HeartState = Record<string, boolean>;
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
      "依照風格快速瀏覽作品，聽歌、送愛心，或向你喜歡的作品發起挑戰。",
      "Browse tracks by style, listen, send hearts, or start a challenge from music you like.",
      "ジャンルから作品を探して聴き、Heartを送り、気になる曲へ挑戦できます。",
      "장르별로 작품을 듣고 Heart를 보내거나 마음에 드는 곡에 도전해 보세요.",
    ),
    uploadPrefix: localeText(lang, "上傳音樂讓大家看到你的作品，請從 ", "Upload your music so listeners can find it here. Submit through ", "作品を公開するには、", "내 음악을 공개하려면 "),
    uploadLink: localeText(lang, "傷心酒吧投稿", "Bar Heartbreak", "Bar Heartbreakから投稿", "Bar Heartbreak에서 업로드"),
    uploadSuffix: localeText(lang, "。", ".", "してください。", "하세요."),
    navigation: localeText(lang, "探索 AI 音樂導覽", "Explore AI Music navigation", "AI音楽探索ナビゲーション", "AI 음악 탐색 내비게이션"),
    browseWorks: localeText(lang, "作品瀏覽", "Works", "作品を見る", "작품 보기"),
    bar: localeText(lang, "傷心酒吧", "Bar Heartbreak", "Bar Heartbreak", "Bar Heartbreak"),
    browseMode: localeText(lang, "作品瀏覽方式", "Works browsing mode", "作品の表示方法", "작품 탐색 방식"),
    byStyle: localeText(lang, "依類型", "By Style", "ジャンル別", "장르별"),
    hotNow: localeText(lang, "正在升溫", "Hot Now", "注目上昇中", "인기 상승 중"),
    uploadAction: localeText(lang, "我要上傳我的音樂", "Upload My Music", "音楽を投稿", "내 음악 업로드"),
    guideLabel: localeText(lang, "這裡怎麼玩？", "How this works", "使い方を見る", "이용 방법"),
    loading: localeText(lang, "正在載入 AI 音樂作品...", "Loading AI music works...", "AI音楽作品を読み込んでいます…", "AI 음악 작품을 불러오는 중…"),
    loadError: localeText(lang, "作品載入失敗：", "Could not load works: ", "作品を読み込めませんでした：", "작품을 불러오지 못했습니다: "),
    less: localeText(lang, "收合", "Show Less", "閉じる", "접기"),
    more: localeText(lang, "看更多", "See More", "もっと見る", "더 보기"),
    empty: localeText(lang, "這個類型目前還沒有可展示作品。", "No public works in this style yet.", "このジャンルには公開作品がまだありません。", "이 장르에는 아직 공개 작품이 없습니다."),
    styleLane: localeText(lang, "風格分類", "Style Lane", "ジャンルレーン", "장르 레인"),
    closeGuide: localeText(lang, "關閉說明", "Close guide", "ガイドを閉じる", "가이드 닫기"),
    close: localeText(lang, "關閉", "Close", "閉じる", "닫기"),
    guideTitle: localeText(lang, "探索怎麼玩？", "How Explore Works", "Exploreの使い方", "Explore 이용 방법"),
    guideBrowseTitle: localeText(lang, "逛作品", "Browse works", "作品を探す", "작품 둘러보기"),
    guideBrowseBody: localeText(lang, "依風格播放作品，喜歡就送愛心。", "Play works by style and send a Heart when a track lands.", "ジャンル別に再生し、気に入ったらHeartを送れます。", "장르별로 재생하고 마음에 들면 Heart를 보낼 수 있습니다."),
    guideSaveTitle: localeText(lang, "收藏歌曲", "Save tracks", "曲を保存", "곡 저장"),
    guideSaveBody: localeText(lang, "愛心會同步加入收藏；再按一次會取消。從右上角頭像進入 Profile 可整理收藏歌曲。", "A Heart also saves the track. Tap it again to remove it, or manage saved tracks from Profile through the avatar at the top right.", "Heartを送ると曲も保存されます。もう一度押すと解除でき、右上のアバターからProfileで整理できます。", "Heart를 보내면 곡도 저장됩니다. 다시 누르면 취소되며, 오른쪽 위 아바타의 Profile에서 정리할 수 있습니다."),
    guideChallengeTitle: localeText(lang, "發起攻擂", "Start a challenge", "挑戦を始める", "도전 시작"),
    guideChallengeBody: localeText(lang, "看到作品封面右上紅色「接戰」角標，表示原作者已準備 60s Drop 並開放攻擂。", "A red OPEN badge at a cover's top right means the creator has prepared a 60s Drop and opened the work to challenges.", "カバー右上の赤い「挑戦可」は、原作者が60秒のDropを用意して挑戦を受け付けている印です。", "커버 오른쪽 위의 빨간 ‘도전 가능’ 표시는 원작자가 60초 Drop을 준비해 도전을 받고 있다는 뜻입니다."),
    guideRecordTitle: localeText(lang, "正式戰績", "Official results", "公式戦績", "공식 전적"),
    guideRecordBody: localeText(lang, "至少 3 位非參賽者完成投票才成立。進入 Showtime 的作品只供播放、收藏與分享，不再接戰。", "A result needs at least three non-participant votes. Showtime works remain available to play, save, and share, but no longer accept challenges.", "参加者以外の投票が3票以上で公式戦績になります。Showtime入りした作品は再生・保存・共有のみで、挑戦受付は終了します。", "참가자가 아닌 사용자 3명 이상이 투표해야 공식 전적이 됩니다. Showtime 진출 곡은 재생·저장·공유만 가능하며 더 이상 도전을 받지 않습니다."),
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
        statusLabel = localeText(lang, "尚未準備守擂 Drop", "Defender Drop missing", "防衛Dropが未準備", "방어 Drop 미준비");
      }
      if (retiredFromExplore) {
        statusLabel = localeText(lang, "8 場正式敗績退場", "Retired after 8 official losses", "公式戦8敗で退出", "공식 8패로 퇴장");
      }
      if (isShowtimeCertified) {
        statusLabel = localeText(lang, "Showtime 認證", "Showtime certified", "Showtime認定", "Showtime 인증");
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
        audioUrl: listenBarAudioPlaybackUrl(row.audio_path) || track.audioUrl || storagePublicUrl("listen-bar-audio", row.audio_path),
        lyrics: row.lyrics?.trim() || track.lyrics?.trim() || null,
        createdAt: safeDate(track.createdAt),
        heartCount: numberValue(row.heart_count ?? track.positiveReactionCount),
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

function PlayIcon({ playing = false, loading = false }: { playing?: boolean; loading?: boolean }) {
  if (loading) {
    return <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
  }
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

function formatRecord(track: AiMusicTrack, lang: string) {
  if (track.challengeCount <= 0) {
    return localeText(lang, "尚未形成正式戰績", "No official record yet", "公式戦績はまだありません", "아직 공식 전적이 없습니다");
  }
  return `${track.wins}W / ${track.losses}L · ${track.winRate}%`;
}

function defenseProgressValues(track: AiMusicTrack) {
  const target = Math.max(1, track.defenseTarget || AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET);
  const successes = Math.min(target, Math.max(0, track.defenseSuccesses));
  const remaining = Math.max(0, target - successes);
  return { successes, target, remaining };
}

function defenseProgressText(track: AiMusicTrack, lang: string) {
  if (track.isShowtimeCertified) {
    return localeText(lang, "已進入 Showtime，不再接受挑戰。", "Certified in Showtime. Challenges are closed.", "Showtime認定済み。挑戦受付は終了しました。", "Showtime 인증 완료. 더 이상 도전을 받지 않습니다.");
  }
  const { successes, target, remaining } = defenseProgressValues(track);
  return localeText(
    lang,
    `守擂進度 ${successes} / ${target}，再守下 ${remaining} 場正式挑戰，進入 Showtime`,
    `Defense progress ${successes} / ${target}. ${remaining} official defense wins to enter Showtime.`,
    `防衛進捗 ${successes} / ${target}。あと${remaining}勝でShowtimeへ。`,
    `방어 진행 ${successes} / ${target}. ${remaining}승을 더하면 Showtime에 진출합니다.`,
  );
}

function defenseProgressShortText(track: AiMusicTrack, lang: string) {
  if (track.isShowtimeCertified) return localeText(lang, "Showtime 認證 · 不再接戰", "Showtime certified · Closed", "Showtime認定 · 挑戦終了", "Showtime 인증 · 도전 종료");
  const { successes, target, remaining } = defenseProgressValues(track);
  return localeText(lang, `守擂 ${successes}/${target} · 再 ${remaining} 場進 Showtime`, `Defense ${successes}/${target} · ${remaining} to Showtime`, `防衛 ${successes}/${target} · あと${remaining}勝`, `방어 ${successes}/${target} · ${remaining}승 남음`);
}

function TrackHud({ track, lang }: { track: AiMusicTrack; lang: string }) {
  const hasOfficialRecord = track.challengeCount > 0;
  return (
    <div className="grid gap-2 rounded-md border border-white/14 bg-black/76 p-3 text-left shadow-[0_18px_44px_rgba(0,0,0,0.46)] backdrop-blur">
      <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.18em] text-cyan-100/75`}>
        Battle Record
      </p>
      <p className="text-sm font-black text-white">
        {formatRecord(track, lang)}
      </p>
      <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-zinc-300">
        <span>{localeText(lang, "有效投票", "Valid votes", "有効投票", "유효 투표")} {track.audienceVotes}</span>
        <span>{localeText(lang, "挑戰", "Battles", "挑戦", "도전")} {track.challengeCount}</span>
        <span>{localeText(lang, "同類型勝率", "Style win rate", "同ジャンル勝率", "동일 장르 승률")} {track.winRate}%</span>
        <span>{track.statusLabel}</span>
      </div>
      <p className="rounded-sm border border-yellow-200/18 bg-yellow-300/[0.08] px-2.5 py-2 text-[11px] font-black leading-5 text-yellow-100">
        {defenseProgressText(track, lang)}
      </p>
      {!hasOfficialRecord ? (
        <p className="text-[11px] font-bold leading-5 text-zinc-500">
          {localeText(lang, "正式戰績需要至少 3 位非參賽者投票。", "Official records need at least 3 non-fighter votes.", "公式戦績には参加者以外の投票が3票以上必要です。", "공식 전적은 참가자가 아닌 사용자의 투표가 3표 이상 필요합니다.")}
        </p>
      ) : null}
    </div>
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
    <div className="pointer-events-none absolute inset-x-2 bottom-0 z-30 flex translate-y-1/2 justify-center">
      <span
        className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full border border-orange-100/80 bg-[linear-gradient(100deg,#f97316_0%,#fb4f73_56%,#ff8a3d_100%)] px-2.5 py-1 text-[10px] font-black leading-4 text-white shadow-[0_0_24px_rgba(251,79,115,0.56),0_7px_20px_rgba(0,0,0,0.6)]"
        title={track.earwormAffinitySampleCount > 0 ? `${track.earwormAffinitySampleCount} responses` : undefined}
      >
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/22 ring-1 ring-white/20">
          <AudioLines className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
        </span>
        <span className="truncate">{publicLabel}</span>
      </span>
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
  catalogLabel,
  catalogNote,
  onPrepare,
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
  catalogLabel?: string;
  catalogNote?: string;
  onPrepare: (track: AiMusicTrack) => void;
  onPlay: (track: AiMusicTrack) => void;
  onToggleExpand: (track: AiMusicTrack) => void;
  onHeart: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
}) {
  const heartCount = Math.max(0, track.heartCount);
  const showNewBadge = isNewlyPublishedMusic(track.createdAt);
  const showChallengeReadyBadge = track.openForChallenge && Boolean(track.audioUrl);
  const showEarwormAffinity = track.earwormAffinityPercent !== null || track.earwormAffinitySampleCount > 0;
  const heartActionLabel = heartedToday
    ? localeText(lang, "取消愛心與收藏", "Remove Heart and saved track", "Heartと保存を解除", "Heart와 저장 취소")
    : localeText(lang, "送出愛心支持", "Send a heart", "Heartを送る", "Heart 보내기");
  return (
    <article id={`ai-music-work-${track.sourceId}`} className="group relative w-[12.5rem] shrink-0 snap-start overflow-hidden rounded-md border border-white/10 bg-black/54 shadow-[0_18px_54px_rgba(0,0,0,0.34)] backdrop-blur transition hover:border-orange-200/45 hover:bg-orange-500/[0.055] sm:w-full">
      <div className="relative aspect-square">
        <TrackCover track={track} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/12 to-transparent" />
        {showNewBadge ? (
          <NewMusicBadge
            lang={lang}
            className="absolute left-3 top-3 z-20 transition-opacity md:group-hover:opacity-0"
          />
        ) : null}
        {catalogLabel ? (
          <span className={`${fontRighteous.className} absolute left-3 ${showNewBadge ? "top-10" : "top-3"} rounded-sm border border-orange-100/40 bg-black/72 px-2 py-1 text-[10px] font-black tracking-[0.12em] text-orange-50 shadow-[0_0_18px_rgba(255,106,0,0.16)] backdrop-blur`}>
            {catalogLabel}
          </span>
        ) : null}
        {showChallengeReadyBadge ? <ChallengeReadyBadge lang={lang} /> : null}
        <button
          type="button"
          onPointerDown={() => onPrepare(track)}
          onFocus={() => onPrepare(track)}
          onClick={() => onPlay(track)}
          disabled={!track.audioUrl}
          className="absolute bottom-5 left-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_0_26px_rgba(255,106,0,0.36)] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          aria-label={isPlaying ? localeText(lang, "暫停", "Pause", "一時停止", "일시정지") : localeText(lang, `播放 ${track.title}`, `Play ${track.title}`, `${track.title}を再生`, `${track.title} 재생`)}
        >
          <PlayIcon playing={isPlaying} />
        </button>
        <button
          type="button"
          onClick={() => onToggleExpand(track)}
          className="absolute bottom-5 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/62 text-xs font-black text-white backdrop-blur transition hover:border-cyan-100/50 md:hidden"
          aria-expanded={isExpanded}
          aria-label={localeText(lang, "顯示戰績資訊", "Show record info", "戦績情報を表示", "전적 정보 보기")}
        >
          i
        </button>
        <div className="pointer-events-none absolute inset-x-3 top-3 hidden translate-y-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:block">
          <TrackHud track={track} lang={lang} />
        </div>
        <EarwormAffinityStatus track={track} lang={lang} />
      </div>

      <div className={`grid gap-2 px-3 pb-3 ${showEarwormAffinity ? "pt-6" : "pt-3"}`}>
        <div className="min-w-0">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-black leading-5 text-white">{track.title}</h3>
          <p className="mt-1 truncate text-[11px] font-bold text-zinc-400">
            {isZh ? "by" : "by"} {track.creator} · {track.aiTool}
          </p>
          {catalogNote ? <p className="mt-1 line-clamp-2 text-[10px] font-black leading-4 text-orange-100/82">{catalogNote}</p> : null}
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
          {defenseProgressShortText(track, lang)}
        </p>
        {isExpanded ? (
          <div className="md:hidden">
            <TrackHud track={track} lang={lang} />
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
            aria-label={localeText(lang, "分享", "Share", "共有", "공유")}
          >
            <ShareIcon />
          </button>
          {track.openForChallenge ? (
            <Link
              href={aiMusicChallengeHref(track, lang)}
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-orange-200/38 bg-orange-500/15 px-2 text-[11px] font-black text-orange-50 transition hover:border-orange-100/65 hover:bg-orange-500/22"
            >
              {localeText(lang, "攻擂", "Challenge", "挑戦", "도전")}
            </Link>
          ) : (
            <span className="inline-flex min-h-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] px-2 text-[11px] font-black text-zinc-600">
              {track.challengeStatus === "open" && !track.hasDefenderDrop
                  ? localeText(lang, "未備 Drop", "No Drop", "Drop未準備", "Drop 미준비")
                  : localeText(lang, "暫不接戰", "Closed", "受付終了", "도전 종료")}
            </span>
          )}
        </div>
      </div>
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
  isZh,
  currentTrackId,
  isPlaying,
  expandedHud,
  heartBusy,
  heartStates,
  lang,
  onPrepare,
  onPlay,
  onToggleExpand,
  onHeart,
  onShare,
}: {
  tracks: AiMusicTrack[];
  isZh: boolean;
  currentTrackId: string | null;
  isPlaying: boolean;
  expandedHud: Record<string, boolean>;
  heartBusy: Record<string, boolean>;
  heartStates: HeartState;
  lang: string;
  onPrepare: (track: AiMusicTrack) => void;
  onPlay: (track: AiMusicTrack) => void;
  onToggleExpand: (track: AiMusicTrack) => void;
  onHeart: (track: AiMusicTrack) => void;
  onShare: (track: AiMusicTrack) => void;
}) {
  const rows = buildAiMusicHeatList(tracks);
  return (
    <section className="grid gap-3" aria-label={localeText(lang, "正在升溫作品", "Hot Now works", "注目上昇中の作品", "인기 상승 작품")}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-orange-200/18 pb-3">
        <div>
          <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.2em] text-orange-100/68`}>AIPOGER HEAT</p>
          <h2 className="mt-1 text-xl font-black text-white">{localeText(lang, "正在升溫", "Hot Now", "注目上昇中", "인기 상승 중")}</h2>
        </div>
        <p className="max-w-sm text-xs font-bold leading-5 text-zinc-500">
          {localeText(lang, "依近 7 日不同帳號支持與已成立正式 Battle 有效票排序。", "Ordered by 7-day distinct supporters and official Battle audience votes.", "直近7日間の異なるアカウントからの支持と、成立した公式Battleの有効票で並びます。", "최근 7일간 서로 다른 계정의 지지와 성립된 공식 Battle 유효표 순으로 정렬합니다.")}
        </p>
      </div>

      <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 xl:grid-cols-6">
        {rows.map(({ track, rank, hasRecentSignal }) => {
          return (
            <TrackCard
              key={track.id}
              track={track}
              isZh={isZh}
              isPlaying={currentTrackId === track.id && isPlaying}
              isExpanded={Boolean(expandedHud[track.id])}
              heartBusy={Boolean(heartBusy[track.recordKey])}
              heartedToday={Boolean(heartStates[track.recordKey])}
              lang={lang}
              catalogLabel={rank ? `#${String(rank).padStart(2, "0")}` : localeText(lang, "累積", "BUILDING", "集計中", "집계 중")}
              catalogNote={hasRecentSignal ? heatReason(track, lang) : undefined}
              onPrepare={onPrepare}
              onPlay={onPlay}
              onToggleExpand={onToggleExpand}
              onHeart={onHeart}
              onShare={onShare}
            />
          );
        })}
      </div>
    </section>
  );
}

function MiniPlayer({
  track,
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
  onError,
}: {
  track: AiMusicTrack | null;
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
  onError: () => void;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isBuffering, setIsBuffering] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [lyricsScrollPercent, setLyricsScrollPercent] = useState(0);
  const lyricsPanelRef = useRef<HTMLDivElement | null>(null);
  const lyricsCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const lyrics = track?.lyrics?.trim() ?? "";
  const lyricsLines = useMemo(() => (lyrics ? lyrics.split(/\r?\n/) : []), [lyrics]);
  const progressValue = duration > 0 ? Math.min(currentTime, duration) : 0;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (progressValue / duration) * 100)) : 0;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(Boolean(track?.audioUrl && isPlaying));
    setLyricsOpen(false);
    setLyricsScrollPercent(0);
  }, [isPlaying, track?.audioUrl, track?.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [audioRef, volume]);

  useEffect(() => {
    if (!lyricsOpen) return;
    const frame = window.requestAnimationFrame(() => lyricsCloseButtonRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setLyricsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [lyricsOpen]);

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

  const audioElement = (
    <audio
      ref={audioRef}
      src={track?.audioUrl ?? undefined}
      preload="metadata"
      playsInline
      className="hidden"
      aria-hidden="true"
      onLoadedMetadata={(event) => {
        event.currentTarget.volume = volume;
        setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
        setCurrentTime(event.currentTarget.currentTime || 0);
        setIsBuffering(false);
      }}
      onDurationChange={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
      onWaiting={() => setIsBuffering(true)}
      onCanPlay={() => setIsBuffering(false)}
      onPlaying={() => {
        setIsBuffering(false);
        onPlay();
      }}
      onEnded={() => {
        setCurrentTime(0);
        onEnded();
      }}
      onPause={onPause}
      onPlay={onPlay}
      onError={() => {
        setIsBuffering(false);
        onError();
      }}
    />
  );

  const heartActionLabel = heartedToday
    ? localeText(lang, "取消愛心與收藏", "Remove Heart and saved track", "Heartと保存を解除", "Heart와 저장 취소")
    : localeText(lang, "送出愛心支持", "Send a heart", "Heartを送る", "Heart 보내기");

  return (
    <>
      {audioElement}
      {!track ? null : (
        <>
      {lyricsOpen ? (
        <div
          className="fixed inset-x-3 bottom-[8.6rem] z-[55] mx-auto max-w-2xl rounded-md border border-orange-200/24 bg-black/94 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-xl sm:bottom-[6.35rem] sm:max-w-lg sm:p-3.5"
          role="dialog"
          aria-modal="true"
          aria-label={localeText(lang, `${track.title} 歌詞`, `${track.title} lyrics`, `${track.title}の歌詞`, `${track.title} 가사`)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`${fontRighteous.className} text-[10px] uppercase tracking-[0.18em] text-orange-100/72`}>
                Lyrics HUD
              </p>
              <h2 className="mt-1 truncate text-base font-black text-white sm:text-sm">{track.title}</h2>
              <p className="truncate text-[11px] font-bold text-zinc-500">{track.creator}</p>
            </div>
            <button
              ref={lyricsCloseButtonRef}
              type="button"
              onClick={() => setLyricsOpen(false)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-white/12 bg-white/[0.045] px-3 text-xs font-black text-zinc-300 transition hover:border-orange-100/45 hover:text-white"
              aria-label={localeText(lang, "關閉歌詞", "Close lyrics", "歌詞を閉じる", "가사 닫기")}
            >
              {localeText(lang, "關閉", "Close", "閉じる", "닫기")}
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
                <p className="text-zinc-500">{localeText(lang, "歌詞未提供。", "Lyrics not provided.", "歌詞は提供されていません。", "가사가 제공되지 않았습니다.")}</p>
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
              aria-label={localeText(lang, "拖曳瀏覽歌詞", "Scroll lyrics", "歌詞をスクロール", "가사 스크롤")}
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
                  aria-label={localeText(lang, "拖曳播放進度", "Seek playback", "再生位置を移動", "재생 위치 이동")}
                />
                <span className="text-right text-[10px] font-black tabular-nums text-zinc-500">{formatPlayerTime(duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onTogglePlay}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 sm:h-9 sm:w-9"
                aria-label={isBuffering ? localeText(lang, "載入中", "Loading", "読み込み中", "로드 중") : isPlaying ? localeText(lang, "暫停", "Pause", "一時停止", "일시정지") : localeText(lang, "播放", "Play", "再生", "재생")}
              >
                <PlayIcon playing={isPlaying} loading={isBuffering} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLyricsOpen((current) => !current);
                  window.requestAnimationFrame(syncLyricsScroll);
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-white/12 bg-white/[0.045] px-3 text-xs font-black text-zinc-300 transition hover:border-orange-100/42 hover:text-white sm:h-9 sm:px-2.5"
                aria-expanded={lyricsOpen}
                aria-label={localeText(lang, "看歌詞", "View lyrics", "歌詞を見る", "가사 보기")}
              >
                <LyricsIcon />
                <span>{localeText(lang, "歌詞", "Lyrics", "歌詞", "가사")}</span>
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
                aria-label={localeText(lang, "分享", "Share", "共有", "공유")}
              >
                <ShareIcon />
              </button>
              {track.openForChallenge ? (
                <Link
                  href={aiMusicChallengeHref(track, lang)}
                  className="hidden min-h-10 items-center justify-center rounded-full border border-orange-200/38 bg-orange-500/15 px-3 text-xs font-black text-orange-50 transition hover:border-orange-100/65 hover:bg-orange-500/22 md:inline-flex sm:min-h-9 sm:px-2.5"
                >
                  {localeText(lang, "攻擂這首", "Challenge", "この曲に挑戦", "이 곡에 도전")}
                </Link>
              ) : null}
            </div>
          </div>
          <label className="flex items-center gap-2 text-zinc-400 sm:hidden">
            <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Math.min(1, Math.max(0, Number(event.currentTarget.value))))}
              className="h-2 w-full cursor-pointer accent-orange-400"
              aria-label={localeText(lang, "調整音量", "Adjust volume", "音量を調整", "볼륨 조절")}
            />
          </label>
        </div>
      </div>
        </>
      )}
    </>
  );
}

export default function AiMusicClient() {
  const { lang, t } = useI18n();
  const isZh = lang === "zh";
  const copy = exploreCopy(lang);
  const earwormCopy = earwormExploreCopy(lang);
  const [tracks, setTracks] = useState<AiMusicTrack[]>([]);
  const [worksView, setWorksView] = useState<"genre" | "heat">("genre");
  const [guideOpen, setGuideOpen] = useState(false);
  const [earwormPromptOpen, setEarwormPromptOpen] = useState(false);
  const [earwormProfile, setEarwormProfile] = useState<EarwormLocalProfile | null>(null);
  const [sharedTrackSourceId, setSharedTrackSourceId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [expandedGenres, setExpandedGenres] = useState<Record<string, boolean>>({});
  const [expandedHud, setExpandedHud] = useState<Record<string, boolean>>({});
  const [heartBusy, setHeartBusy] = useState<Record<string, boolean>>({});
  const [heartStates, setHeartStates] = useState<HeartState>({});
  const [authPromptTrack, setAuthPromptTrack] = useState<AiMusicTrack | null>(null);
  const [notice, setNotice] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<AiMusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const guideButtonRef = useRef<HTMLButtonElement | null>(null);
  const guideDialogRef = useRef<HTMLDivElement | null>(null);
  const guideCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const guideReturnFocusRef = useRef(false);
  const earwormDialogRef = useRef<HTMLDivElement | null>(null);
  const earwormStartRef = useRef<HTMLAnchorElement | null>(null);

  const withLang = useCallback((href: string) => `${href}${href.includes("?") ? "&" : "?"}lang=${lang}`, [lang]);
  const closeGuide = useCallback(() => {
    guideReturnFocusRef.current = true;
    setGuideOpen(false);
  }, []);
  const closeEarwormPrompt = useCallback(() => {
    markEarwormPromptSkipped();
    setEarwormPromptOpen(false);
  }, []);
  const prepareTrack = useCallback((track: AiMusicTrack) => {
    const audio = audioRef.current;
    const url = track.audioUrl;
    if (!audio || !url) return;
    const absoluteUrl = new URL(url, window.location.href).href;
    if (audio.currentSrc === absoluteUrl || audio.src === absoluteUrl) return;
    audio.preload = "metadata";
    audio.src = url;
    audio.load();
  }, []);

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
      setHeartStates({});
      return;
    }

    let mounted = true;
    const loadHeartStates = async () => {
      const barTracks = tracks.filter((track) => track.source === "bar");
      const sourceIds = Array.from(new Set(barTracks.map((track) => track.sourceId))).slice(0, 240);
      if (sourceIds.length === 0) {
        if (mounted) setHeartStates({});
        return;
      }
      const recordKeyBySourceId = new Map(barTracks.map((track) => [track.sourceId, track.recordKey]));
      const voteDate = taipeiVoteDate();
      const { data, error } = await supabase
        .from("listen_bar_track_reactions")
        .select("track_id, reaction")
        .eq("user_id", userId)
        .eq("reaction", "heart")
        .eq("vote_date", voteDate)
        .in("track_id", sourceIds);

      if (!mounted) return;
      if (error) {
        console.warn("[ai-music heart states]", error);
        return;
      }

      const states: HeartState = {};
      for (const row of (data ?? []) as Array<{ track_id?: string | null }>) {
        const recordKey = row.track_id ? recordKeyBySourceId.get(row.track_id) : null;
        if (recordKey) states[recordKey] = true;
      }
      setHeartStates(states);
    };

    void loadHeartStates();
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

  const earwormRecommendations = useMemo(() => {
    if (!earwormProfile) return [];
    const preferredGenres = [earwormProfile.primaryGenre, ...earwormProfile.secondaryGenres];
    const relevant = tracks
      .filter((track) => preferredGenres.includes(track.genre))
      .sort((left, right) => preferredGenres.indexOf(left.genre) - preferredGenres.indexOf(right.genre) || right.heartCount - left.heartCount || left.sourceId.localeCompare(right.sourceId));
    const discovery = tracks
      .filter((track) => !preferredGenres.includes(track.genre))
      .sort((left, right) => right.heartCount - left.heartCount || left.sourceId.localeCompare(right.sourceId));
    return [...relevant.slice(0, 4), ...discovery.slice(0, 2)].slice(0, 6);
  }, [earwormProfile, tracks]);

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
    if (!currentTrack || !audioRef.current) return;
    if (!isPlaying) return;
    void audioRef.current.play().catch((error) => {
      console.warn("[ai-music player]", error);
      setIsPlaying(false);
      setNotice(localeText(lang, "瀏覽器暫時阻擋播放，請再按一次播放。", "Playback was blocked. Tap play again.", "ブラウザが再生をブロックしました。もう一度再生を押してください。", "브라우저가 재생을 차단했습니다. 재생을 다시 눌러 주세요."));
    });
  }, [currentTrack, isPlaying, lang]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handlePlayTrack = (track: AiMusicTrack) => {
    if (!track.audioUrl) {
      setNotice(localeText(lang, "這首作品目前沒有可播放音檔。", "This track has no playable audio yet.", "この作品には再生できる音源がまだありません。", "이 작품에는 아직 재생 가능한 음원이 없습니다."));
      return;
    }
    prepareTrack(track);
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
      setNotice(localeText(lang, "這筆展示紀錄目前沒有公播愛心資料。", "This showcase record has no public-airplay heart data yet.", "この展示作品には公開放送のHeartデータがまだありません。", "이 쇼케이스 작품에는 아직 공개 방송 Heart 데이터가 없습니다."));
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAuthPromptTrack(track);
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
        setNotice(payload?.error || localeText(lang, "愛心送出失敗，請稍後再試。", "Heart failed. Try again later.", "Heartを送れませんでした。しばらくしてから再試行してください。", "Heart 전송에 실패했습니다. 잠시 후 다시 시도해 주세요."));
        return;
      }
      const heartCount = Math.max(0, numberValue(payload.counts.heart));
      setTracks((current) =>
        current.map((item) => (item.recordKey === track.recordKey ? { ...item, heartCount } : item)),
      );
      setCurrentTrack((current) => (current?.recordKey === track.recordKey ? { ...current, heartCount } : current));
      setHeartStates((current) => ({ ...current, [track.recordKey]: payload.heartedToday === true }));
      setNotice(payload.heartedToday
        ? localeText(lang, "愛心已送出，歌曲已同步收藏到你的後台。", "Heart sent. The track is saved in your profile.", "Heartを送り、この曲をProfileに保存しました。", "Heart를 보냈고 곡이 Profile에 저장되었습니다.")
        : localeText(lang, "已取消愛心與收藏。", "Heart and saved track removed.", "Heartと保存を解除しました。", "Heart와 저장을 취소했습니다."));
    } catch {
      setNotice(localeText(lang, "愛心送出失敗，請稍後再試。", "Heart failed. Try again later.", "Heartを送れませんでした。しばらくしてから再試行してください。", "Heart 전송에 실패했습니다. 잠시 후 다시 시도해 주세요."));
    } finally {
      setHeartBusy((current) => ({ ...current, [track.recordKey]: false }));
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

  const totalVisibleTracks = groupedTracks.reduce((sum, group) => sum + group.tracks.length, 0);
  const navItems = [
    { href: "#works", label: copy.browseWorks },
    { href: withLang("/listen-bar"), label: copy.bar },
    { href: withLang("/battle"), label: "Drop Battle" },
    { href: withLang("/rank"), label: "Showtime" },
    { href: `/rank?lang=${lang}#choice-weekly`, label: "Choice" },
  ];
  const catalogMetadata = localeText(
    lang,
    `${totalVisibleTracks} 首公開作品 · ${MUSIC_GENRE_OPTIONS.length} 種風格`,
    `${totalVisibleTracks} public works · ${MUSIC_GENRE_OPTIONS.length} styles`,
    `公開作品 ${totalVisibleTracks}曲 · ${MUSIC_GENRE_OPTIONS.length}ジャンル`,
    `공개 작품 ${totalVisibleTracks}곡 · ${MUSIC_GENRE_OPTIONS.length}개 장르`,
  );

  return (
    <main className={`${fontGlowSans.className} aipo-stage-bg relative min-h-screen overflow-hidden px-4 pb-28 pt-20 text-white sm:px-6 lg:px-8`}>
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="relative mb-3 overflow-hidden border-y border-orange-200/20 bg-black text-center shadow-[0_26px_80px_rgba(0,0,0,0.38)]">
          <Image
            src="/ai-music/explore-frequency-stage.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-80"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/28" aria-hidden="true" />

          <div className="relative flex flex-col items-center px-3 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
            <div className="flex items-center justify-center gap-2.5 text-[10px] uppercase sm:text-[11px]">
              <span className={`${fontRighteous.className} tracking-[0.3em] text-orange-100/78`}>Explore</span>
              <span className="font-black text-cyan-200" aria-hidden="true">/</span>
              <span className={`${fontRighteous.className} tracking-[0.3em] text-zinc-400`}>AI Music</span>
            </div>

            <div className="mt-2.5 inline-flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 border-y border-orange-100/20 bg-black/48 px-3 py-1.5 text-[10px] font-black text-orange-100/84 backdrop-blur-sm sm:text-[11px]">
              <span className={`${fontRighteous.className} uppercase tracking-[0.14em] text-orange-200`}>
                {copy.catalog}
              </span>
              <span className="text-orange-400/70" aria-hidden="true">/</span>
              <span className="text-zinc-200">{catalogMetadata}</span>
            </div>

            <h1 className="ai-music-hero-title mt-3 flex items-center justify-center gap-3 sm:gap-5">
              <span className={`${fontRighteous.className} text-[2.9rem] leading-[0.78] tracking-[-0.08em] text-orange-50/86 sm:text-[4.4rem] lg:text-[5.25rem]`}>
                AI
              </span>
              <span className="h-12 w-px bg-orange-100/36 sm:h-16" aria-hidden="true" />
              <span className={`${isZh ? fontSourceSerifTC.className : fontRighteous.className} text-[2.45rem] font-black leading-[0.86] tracking-[-0.07em] text-[#fff8e9] drop-shadow-[0_8px_22px_rgba(0,0,0,0.86)] sm:text-[3.9rem] lg:text-[4.65rem]`}>
                {copy.works}
              </span>
            </h1>

            <p className="mt-3 max-w-3xl text-[13px] font-black leading-5 text-yellow-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-base sm:leading-6">
              {copy.subtitle}
            </p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-orange-50/82 sm:text-sm sm:leading-6">
              {copy.uploadPrefix}
              <Link href={`${withLang("/listen-bar")}#play-request`} className="font-black text-cyan-100 underline decoration-cyan-200/55 underline-offset-4 transition hover:text-white">
                {copy.uploadLink}
              </Link>
              {copy.uploadSuffix}
            </p>
          </div>

          <nav className="relative flex justify-center overflow-x-auto border-t border-orange-100/16 bg-black/72 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={copy.navigation}>
            <div className="flex min-w-max gap-0.5 px-2 sm:mx-auto sm:gap-1 sm:px-4">
              {navItems.map((item, index) => (
                <Link key={item.href} href={item.href} className={`inline-flex min-h-11 shrink-0 items-center border-b-2 px-2.5 text-[11px] font-black transition sm:px-4 sm:text-xs ${index === 0 ? "border-orange-400 text-orange-200" : "border-transparent text-zinc-400 hover:border-cyan-100/55 hover:text-white"}`}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <section id="works" className="grid gap-5 scroll-mt-24">
          {earwormProfile ? (
            <section id="earworm-for-you" className="scroll-mt-24 border-y border-orange-200/20 bg-[linear-gradient(115deg,rgba(255,106,0,0.13),rgba(0,202,255,0.045),rgba(0,0,0,0.72))] px-3 py-5 shadow-[0_22px_70px_rgba(0,0,0,0.32)] sm:px-5">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className={`${fontRighteous.className} text-[10px] tracking-[0.2em] text-orange-200/72`}>{earwormCopy.profileEyebrow}</p>
                  <h2 className="mt-1 text-2xl font-black text-white">
                    {earwormCopy.profileTitle}：<span className="text-orange-200">{earwormProfile.primaryGenre}</span>
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {earwormProfile.keywords.map((keyword) => (
                      <span key={keyword} className="rounded-full border border-cyan-100/20 bg-cyan-300/[0.06] px-2.5 py-1 text-[10px] font-black text-cyan-50/78">{keyword}</span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEarwormPromptOpen(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-orange-200/35 bg-orange-500/12 px-3 text-xs font-black text-orange-50 transition hover:border-orange-100/65 hover:bg-orange-500/20"
                >
                  <Headphones className="h-4 w-4" aria-hidden="true" />
                  {earwormCopy.reopen}
                </button>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-white">{earwormCopy.recommendedTitle}</h3>
                    <p className="mt-1 max-w-2xl text-xs font-bold leading-5 text-zinc-400">{earwormCopy.recommendedBody}</p>
                  </div>
                  <span className="text-[10px] font-black tracking-[0.12em] text-orange-100/60">70% MATCH / 30% DISCOVERY</span>
                </div>
                {earwormRecommendations.length > 0 ? (
                  <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 xl:grid-cols-6">
                    {earwormRecommendations.map((track) => {
                      const catalogLabel = track.genre === earwormProfile.primaryGenre
                        ? localeText(lang, "主場", "HOME", "本命", "주 취향")
                        : earwormProfile.secondaryGenres.includes(track.genre)
                          ? localeText(lang, "靠近", "NEARBY", "近い", "가까움")
                          : localeText(lang, "探索", "DISCOVER", "発見", "탐색");
                      return (
                        <TrackCard
                          key={`earworm-pick-${track.id}`}
                          track={track}
                          isZh={isZh}
                          isPlaying={currentTrack?.id === track.id && isPlaying}
                          isExpanded={Boolean(expandedHud[track.id])}
                          heartBusy={Boolean(heartBusy[track.recordKey])}
                          heartedToday={Boolean(heartStates[track.recordKey])}
                          lang={lang}
                          catalogLabel={catalogLabel}
                          onPrepare={prepareTrack}
                          onPlay={handlePlayTrack}
                          onToggleExpand={(item) => setExpandedHud((current) => ({ ...current, [item.id]: !current[item.id] }))}
                          onHeart={(item) => void sendHeart(item)}
                          onShare={(item) => void shareTrack(item)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-md border border-white/10 bg-black/30 px-4 py-4 text-sm font-bold text-zinc-500">
                    {localeText(lang, "符合你耳朵方向的新作品正在補進來。", "More tracks for your profile are on the way.", "あなた向けの新しい曲を準備中です。", "취향에 맞는 새 곡을 준비 중이에요.")}
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <div className="flex justify-center border-b border-white/10 pb-3 pt-1">
            <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-lg border border-orange-100/18 bg-black/76 p-1.5 shadow-[0_16px_42px_rgba(0,0,0,0.36)]">
              <div className="inline-flex" role="group" aria-label={copy.browseMode}>
                <button
                  type="button"
                  onClick={() => setWorksView("genre")}
                  aria-pressed={worksView === "genre"}
                  className={`min-h-10 rounded-md px-4 text-xs font-black transition sm:px-5 ${worksView === "genre" ? "bg-orange-500 text-black shadow-[0_0_22px_rgba(255,106,0,0.24)]" : "text-zinc-300 hover:bg-white/6 hover:text-white"}`}
                >
                  {copy.byStyle}
                </button>
                <button
                  type="button"
                  onClick={() => setWorksView("heat")}
                  aria-pressed={worksView === "heat"}
                  className={`min-h-10 rounded-md px-4 text-xs font-black transition sm:px-5 ${worksView === "heat" ? "bg-orange-500 text-black shadow-[0_0_22px_rgba(255,106,0,0.24)]" : "text-zinc-300 hover:bg-white/6 hover:text-white"}`}
                >
                  {copy.hotNow}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-7 w-px bg-white/12" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setEarwormPromptOpen(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-cyan-100/22 bg-cyan-300/[0.06] px-3 text-[11px] font-black text-cyan-50/82 transition hover:border-cyan-100/50 hover:text-white"
                >
                  <Headphones className="h-4 w-4" aria-hidden="true" />
                  {earwormCopy.reopen}
                </button>
                <span className="h-7 w-px bg-white/12" aria-hidden="true" />
                <button
                  ref={guideButtonRef}
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-orange-200/32 bg-orange-500/8 p-1.5 transition hover:border-orange-100/70 hover:bg-orange-500/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100"
                  aria-label={copy.guideLabel}
                  title={copy.guideLabel}
                >
                  <img src="/guide.png" alt="" className="h-full w-full object-contain" />
                </button>
              </div>
              <Link
                href={`${withLang("/listen-bar")}#play-request`}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border border-orange-100/80 bg-orange-500 px-3 text-[11px] font-black text-black shadow-[0_0_22px_rgba(255,106,0,0.22)] transition hover:border-orange-50 hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-100"
              >
                <Upload className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                {copy.uploadAction}
              </Link>
            </div>
          </div>
          {loadState === "loading" ? (
            <div className="rounded-md border border-white/10 bg-black/46 px-5 py-12 text-center text-sm font-bold text-zinc-400">
              {copy.loading}
            </div>
          ) : null}
          {loadState === "error" ? (
            <div className="rounded-md border border-red-200/25 bg-red-500/10 px-5 py-8 text-sm font-bold text-red-100">
              {copy.loadError} {loadError}
            </div>
          ) : null}
          {loadState === "ready" && worksView === "heat" ? (
            <HeatList
              tracks={tracks}
              isZh={isZh}
              currentTrackId={currentTrack?.id ?? null}
              isPlaying={isPlaying}
              expandedHud={expandedHud}
              heartBusy={heartBusy}
              heartStates={heartStates}
              lang={lang}
              onPrepare={prepareTrack}
              onPlay={handlePlayTrack}
              onToggleExpand={(item) => setExpandedHud((current) => ({ ...current, [item.id]: !current[item.id] }))}
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
                          {copy.styleLane}
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
                            {expanded ? copy.less : copy.more}
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
                            heartedToday={Boolean(heartStates[track.recordKey])}
                            lang={lang}
                            onPrepare={prepareTrack}
                            onPlay={handlePlayTrack}
                            onToggleExpand={(item) => setExpandedHud((current) => ({ ...current, [item.id]: !current[item.id] }))}
                            onHeart={(item) => void sendHeart(item)}
                            onShare={(item) => void shareTrack(item)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md border border-white/10 bg-black/34 px-4 py-6 text-sm font-bold text-zinc-500">
                        {copy.empty}
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
                aria-label={copy.closeGuide}
                title={copy.close}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <h2 id="ai-music-guide-title" className="text-2xl font-black text-white">{copy.guideTitle}</h2>
              <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
                <div className="py-4 first:pt-0">
                  <h3 className="text-sm font-black text-orange-100">{copy.guideBrowseTitle}</h3>
                  <p className="mt-1.5 text-sm font-bold leading-6 text-zinc-300">
                    {copy.guideBrowseBody}
                  </p>
                </div>
                <div className="py-4">
                  <h3 className="text-sm font-black text-orange-100">{copy.guideSaveTitle}</h3>
                  <p className="mt-1.5 text-sm font-bold leading-6 text-zinc-300">
                    {copy.guideSaveBody}
                  </p>
                </div>
                <div className="py-4">
                  <h3 className="text-sm font-black text-orange-100">{copy.guideChallengeTitle}</h3>
                  <p className="mt-1.5 text-sm font-bold leading-6 text-zinc-300">
                    {copy.guideChallengeBody}
                  </p>
                </div>
                <div className="py-4 last:pb-0">
                  <h3 className="text-sm font-black text-orange-100">{copy.guideRecordTitle}</h3>
                  <p className="mt-1.5 text-sm font-bold leading-6 text-zinc-300">
                    {copy.guideRecordBody}
                  </p>
                </div>
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

      <MiniPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        heartBusy={currentTrack ? Boolean(heartBusy[currentTrack.recordKey]) : false}
        heartedToday={currentTrack ? Boolean(heartStates[currentTrack.recordKey]) : false}
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
        onError={() => {
          setIsPlaying(false);
          setNotice(localeText(lang, "音檔載入失敗，請再按一次播放。", "The audio failed to load. Please press play again.", "音源の読み込みに失敗しました。もう一度再生してください。", "오디오를 불러오지 못했습니다. 재생을 다시 눌러 주세요."));
        }}
      />
    </main>
  );
}
