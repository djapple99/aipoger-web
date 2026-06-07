// src/app/battle/[id]/battle-room-client.tsx
"use client";

import NextImage from "next/image";
import LangToggle from "@/components/lang-toggle";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthBypassEnabled, mockUserId } from "@/lib/auth-bypass";
import { useI18n } from "@/lib/i18n";
import { fontGlowSansBattle } from "@/lib/fonts";
import { supabase } from "@/lib/supabase";
import ShareButton from "@/components/share-button";
import ReportButton from "@/components/report-button";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { rankLabelForLevel } from "@/lib/battle-pool-rules";
import {
  cancelCurrentBattleIntent,
  claimDropRematchIntent,
  completeBattleCardIntent,
  isDropChallengeAcceptable,
  openDropRematchWindowIntent,
  resolveDropBattleScheduledStart,
  type DropRematchClaimPayload,
} from "@/lib/battle-pool-client";
import { battleSeedForId, pick90sBattleWinner } from "@/lib/battle-90s-system";
import { rematchDeadlineSecondsLeft } from "@/lib/drop-battle-rematch";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { battleGuestDisplayName, getBattleGuestId } from "@/lib/battle-guest";
import type { User } from "@supabase/supabase-js";

type SenderType = "audience" | "fighter_a" | "fighter_b";

type ChatMessage = {
  id: string;
  battle_id: string;
  user_id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
};

type BattleData = {
  id: string;
  arena_kind?: "battle" | "queue";
  match_group_id?: string | null;
  queue_status?: string | null;
  fighter_a_user_id: string;
  fighter_b_user_id: string | null;
  fighter_a_name: string;
  fighter_b_name: string;
  song_a_name: string;
  song_b_name: string;
  audio_a_path: string | null;
  audio_b_path: string | null;
  fighter_a_avatar: string | null;
  fighter_b_avatar: string | null;
  fighter_a_rank: string | null;
  fighter_b_rank: string | null;
  song_a_cover: string | null;
  song_b_cover: string | null;
  ai_tool_a: string | null;
  ai_tool_b: string | null;
  lyrics_a: string | null;
  lyrics_b: string | null;
  genre: string;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  battle_started_at?: string | null;
  started_at?: string | null;
  cancellation_reason?: "no_challenger" | "founder_manual" | null;
  status: "pending" | "matched" | "active" | "live" | "finished" | "expired" | "cancelled" | "cancelled_no_challenger" | "cancelled_founder";
};

type QueueArenaRow = {
  id: string;
  user_id: string | null;
  fighter_name: string | null;
  original_file_name: string | null;
  genre: string | null;
  ai_tool: string | null;
  lyrics?: string | null;
  audio_path: string | null;
  status: string | null;
  match_group_id: string | null;
  expires_at: string | null;
  scheduled_start_at?: string | null;
  cancellation_evaluation_at?: string | null;
  created_at: string | null;
};

type BattleLinkResolutionPayload =
  | { action: "stay"; reason?: string }
  | { action: "redirect"; href: string; reason?: string };
type BattleArenaEntryPayload =
  | { action: "redirect"; href: string; reason?: string }
  | { action: "battle"; battle: BattleData };

type VoteCount = { fighter_a: number; fighter_b: number };
type DeckKey = "A" | "B";
type BattlePlaybackPhase = "rps" | "ready" | "playing" | "paused" | "transition" | "final";
type FeedbackKey = "rhyme" | "impact" | "melody" | "emotion" | "structure";
type FeedbackCounts = Record<DeckKey, Record<FeedbackKey, number>>;
type ReactionBurst = {
  id: string;
  symbol: string;
  x: number;
  y: number;
  size: number;
};

type DanmakuItem = {
  id: string;
  text: string;
  lane: number;
  sizeRem: number;
  durationMs: number;
  colorClass: string;
};

const VINYL_COVER_PLACEHOLDER = AIPOGER_BRAND_LOGO;
const DEMO_BATTLE_AUDIO_SRC = "/music/home-bgm.mp3";
const HOOK_BATTLE_SECONDS = 45;
const PRE_BATTLE_TEASER_SECONDS = 5;
const FINAL_PRESTART_HYPE_SECONDS = 5;
const PRE_BATTLE_AD_FADE_OUT_SECONDS = 6;
const FINAL_PRESTART_HYPE_TEXT = "Ladies and gentlemen, fighters!";
const FINAL_PRESTART_HYPE_SFX_SRC = "/sfx/drop-battle-announcer.wav";
const PRE_BATTLE_AD_VIDEO_SRC = "/music/AIPOGER%20AD1.mp4";
const MAX_PAUSE_MS = 1000;
const SCRATCH_TRANSITION_SECONDS = 2;
const SCRATCH_TRANSITION_MS = SCRATCH_TRANSITION_SECONDS * 1000;
const SCRATCH_TRANSITION_SRC = "/sfx/scratch-sample-a.mp3";
const WINNER_COUNTDOWN_SFX_SRC = "/sfx/you-win.wav";
const WINNER_REVEAL_SFX_SRC = "/sfx/audience-shouts-1.mp3";
const SECOND_DECK_START_SECONDS = HOOK_BATTLE_SECONDS + SCRATCH_TRANSITION_SECONDS;
const BATTLE_PLAYBACK_SECONDS = HOOK_BATTLE_SECONDS * 2 + SCRATCH_TRANSITION_SECONDS;
const FINAL_RESULT_CUE_DELAY_MS = 1000;
const FINAL_VOTE_SECONDS = 5;
const WINNER_COUNTDOWN_FALLBACK_MS = 8200;
const WINNER_REVEAL_MS = 3000;
const RPS_CYCLE_MS = 240;
const ARENA_ECHO_LEAD_SECONDS = 1;
const ARENA_ECHO_TAPS = [
  { delayMs: 120, offsetBackSeconds: 0.22, volume: 0.22 },
  { delayMs: 290, offsetBackSeconds: 0.34, volume: 0.14 },
  { delayMs: 520, offsetBackSeconds: 0.48, volume: 0.08 },
] as const;
const DANMAKU_FONT_SIZES_REM = [1.18, 1.32, 1.48, 1.66, 1.9, 2.18, 2.5] as const;
const DANMAKU_COLOR_CLASSES = [
  "border-orange-200/35 bg-orange-500/20 text-orange-50 shadow-[0_0_22px_rgba(255,106,0,0.3)]",
  "border-yellow-200/35 bg-yellow-300/16 text-yellow-50 shadow-[0_0_22px_rgba(250,204,21,0.25)]",
  "border-cyan-100/35 bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(103,232,249,0.24)]",
  "border-fuchsia-200/30 bg-fuchsia-400/14 text-fuchsia-50 shadow-[0_0_22px_rgba(217,70,239,0.22)]",
  "border-white/16 bg-black/48 text-white shadow-[0_0_18px_rgba(0,0,0,0.45),0_0_20px_rgba(255,106,0,0.14)]",
] as const;
const QUICK_DANMAKU_EMOJIS = ["🔥", "💔", "⚡", "🙌", "💥", "👑", "🚀", "😭"] as const;
const rpsCycle = ["✊", "✌️", "✋"] as const;
const hypeReactions = ["❤️", "👍"] as const;
const feedbackButtons: Array<{ key: FeedbackKey; zh: string; en: string }> = [
  { key: "rhyme", zh: "押韻", en: "Rhyme" },
  { key: "impact", zh: "爆點", en: "Impact" },
  { key: "melody", zh: "旋律", en: "Melody" },
  { key: "emotion", zh: "情緒", en: "Emotion" },
  { key: "structure", zh: "結構", en: "Structure" },
];

function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}
const emptyFeedbackCounts = (): FeedbackCounts => ({
  A: { rhyme: 0, impact: 0, melody: 0, emotion: 0, structure: 0 },
  B: { rhyme: 0, impact: 0, melody: 0, emotion: 0, structure: 0 },
});
const rpsWinPairs = [
  { winner: "✊", loser: "✌️" },
  { winner: "✌️", loser: "✋" },
  { winner: "✋", loser: "✊" },
] as const;
/** `public/aipoger vinlyarm.png` — 唱臂單圖 */
const VINYL_ARM_IMAGE_SRC = encodeURI("/aipoger vinlyarm.png");

/** 擂台 CSS 變數（可透過 debug panel 即時調整） */
const vinylVars = {
  "--vinyl-size": "220px",
  "--vinyl-size-md": "280px",
  "--avatar-size": "3.5rem",
  "--avatar-size-md": "4rem",
  "--avatar-top": "4px",
  "--avatar-left": "4px",
  "--tonearm-right": "-52px",
  "--tonearm-top": "5%",
  "--tonearm-h": "70%",
  "--tonearm-right-md": "-60px",
  "--tonearm-top-md": "8%",
  "--card-px": "20px",
  "--card-py": "24px",
  "--name-gap": "4px",
  "--ai-tool-top": "12px",
  "--play-btn-top": "8px",
};

function isHttpOrDataImageUrl(s: string): boolean {
  const t = s.trim();
  return /^https?:\/\//i.test(t) || /^data:image\//i.test(t) || /^blob:/i.test(t) || t.startsWith("/");
}

function rpsResultForBattle(battleId: string): { firstDeck: DeckKey; choiceA: string; choiceB: string } {
  const seed = battleSeedForId(battleId || "aipoger");
  const firstDeck: DeckKey = seed % 2 === 0 ? "A" : "B";
  const pair = rpsWinPairs[seed % rpsWinPairs.length];
  return firstDeck === "A"
    ? { firstDeck, choiceA: pair.winner, choiceB: pair.loser }
    : { firstDeck, choiceA: pair.loser, choiceB: pair.winner };
}

function timestampParamMs(value: string | null | undefined): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber > 10_000_000_000 ? asNumber : asNumber * 1000;
  const asDate = Date.parse(raw);
  return Number.isFinite(asDate) ? asDate : null;
}

function scheduledStartMsForBattle(battle: Pick<BattleData, "scheduled_start_at" | "started_at">): number | null {
  return timestampParamMs(battle.scheduled_start_at) ?? timestampParamMs(battle.started_at);
}

function deckParam(value: string | null | undefined): DeckKey | null {
  const raw = value?.trim().toUpperCase();
  return raw === "A" || raw === "B" ? raw : null;
}

/** 本站個人頭像優先於 fighter_profiles（內為 OAuth／擂台設定同步） */
function firstAvatarUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const raw of candidates) {
    const t = raw?.trim();
    if (t) return t;
  }
  return null;
}

function readBattleAssetSession(assetKey: string | null): { avatarUrl: string | null; coverUrl: string | null } {
  if (!assetKey || typeof window === "undefined") return { avatarUrl: null, coverUrl: null };
  try {
    const raw = window.sessionStorage.getItem(`aipoger:battle-assets:${assetKey}`);
    if (!raw) return { avatarUrl: null, coverUrl: null };
    const parsed = JSON.parse(raw) as { avatarUrl?: unknown; coverUrl?: unknown };
    return {
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
      coverUrl: typeof parsed.coverUrl === "string" ? parsed.coverUrl : null,
    };
  } catch {
    return { avatarUrl: null, coverUrl: null };
  }
}

/** OAuth／登入供應商頭像（與首頁 userAvatarUrl 一致） */
function oauthProviderAvatar(user: User | null | undefined): string | null {
  const m = user?.user_metadata as Record<string, unknown> | undefined;
  if (!m) return null;
  const a = m.avatar_url;
  const p = m.picture;
  if (typeof a === "string" && a.trim().length > 0) return a.trim();
  if (typeof p === "string" && p.trim().length > 0) return p.trim();
  return null;
}

function authDisplayName(user: User | null | undefined): string | null {
  const m = user?.user_metadata as Record<string, unknown> | undefined;
  const candidates = [
    m?.full_name,
    m?.name,
    m?.user_name,
    m?.preferred_username,
    user?.email?.split("@")[0],
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function currentReturnPath() {
  if (typeof window === "undefined") return "/battle";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

async function resolveMediaUrl(raw: string | null | undefined): Promise<string | null> {
  const t = raw?.trim();
  if (!t) return null;
  if (isHttpOrDataImageUrl(t)) return t;

  const tryBucket = async (bucket: "battle-audio" | "avatars") => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(t, 60 * 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  };

  const fromAvatars = await tryBucket("avatars");
  if (fromAvatars) return fromAvatars;
  const fromAudio = await tryBucket("battle-audio");
  if (fromAudio) return fromAudio;

  console.warn("[battle media] signed url failed", t);
  return null;
}

/** VinylDisc 版面數值 → 對應 CSS custom properties（皆掛在元件 root，子元素用 var(...)） */
type VinylLayoutNumbers = {
  vinylSize: number;
  vinylSizeMd: number;
  avatarSize: number;
  avatarBorderWidth: number;
  avatarTop: number;
  avatarLeft: number;
  coverHubPercent: number;
  tonearmOffset: number;
  tonearmTopPercent: number;
  tonearmHeightPercent: number;
  avatarRightTxPercent: number;
  avatarRightTyPercent: number;
  namesBlockMarginBottom: number;
  aiBlockMarginTop: number;
  playButtonMarginTop: number;
};

const VINYL_LAYOUT_DEFAULTS: VinylLayoutNumbers = {
  vinylSize: 260,
  vinylSizeMd: 370,
  avatarSize: 82,
  avatarBorderWidth: 4,
  avatarTop: 4,
  avatarLeft: -14,
  coverHubPercent: 58,
  tonearmOffset: 34,
  tonearmTopPercent: 26,
  tonearmHeightPercent: 62,
  avatarRightTxPercent: 22,
  avatarRightTyPercent: 4,
  namesBlockMarginBottom: 0,
  aiBlockMarginTop: 6,
  playButtonMarginTop: 0,
};

const VINYL_LAYOUT_SLIDER_META: {
  key: keyof VinylLayoutNumbers;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: "px" | "%";
}[] = [
  { key: "vinylSize", label: "--vinyl-size（寬高，基準）", min: 160, max: 360, step: 1, unit: "px" },
  { key: "vinylSizeMd", label: "--vinyl-size-md（md 覆寫）", min: 200, max: 400, step: 1, unit: "px" },
  { key: "avatarSize", label: "--avatar-size", min: 28, max: 96, step: 1, unit: "px" },
  { key: "avatarBorderWidth", label: "--avatar-border-width", min: 1, max: 8, step: 1, unit: "px" },
  { key: "avatarTop", label: "--avatar-top（左頭像）", min: -80, max: 80, step: 1, unit: "px" },
  { key: "avatarLeft", label: "--avatar-left（左頭像）", min: -40, max: 120, step: 1, unit: "px" },
  { key: "coverHubPercent", label: "--vinyl-cover-hub-pct（中心貼紙）", min: 40, max: 78, step: 1, unit: "%" },
  { key: "tonearmOffset", label: "--tonearm-offset", min: 20, max: 120, step: 1, unit: "px" },
  { key: "tonearmTopPercent", label: "--tonearm-top-pct", min: 0, max: 40, step: 1, unit: "%" },
  { key: "tonearmHeightPercent", label: "--tonearm-height-pct", min: 40, max: 95, step: 1, unit: "%" },
  { key: "avatarRightTxPercent", label: "--avatar-right-tx（右頭像 translate X）", min: -80, max: 80, step: 1, unit: "%" },
  { key: "avatarRightTyPercent", label: "--avatar-right-ty（右頭像 translate Y）", min: -80, max: 80, step: 1, unit: "%" },
  { key: "namesBlockMarginBottom", label: "--vinyl-names-mb", min: 0, max: 48, step: 1, unit: "px" },
  { key: "aiBlockMarginTop", label: "--vinyl-ai-mt", min: 0, max: 48, step: 1, unit: "px" },
  { key: "playButtonMarginTop", label: "--vinyl-play-mt", min: 0, max: 48, step: 1, unit: "px" },
];

function vinylLayoutToCss(vars: VinylLayoutNumbers): CSSProperties {
  return {
    "--vinyl-size": `clamp(${vars.vinylSize}px, 28vw, ${vars.vinylSizeMd}px)`,
    "--vinyl-size-md": `${vars.vinylSizeMd}px`,
    "--avatar-size": `${vars.avatarSize}px`,
    "--avatar-border-width": `${vars.avatarBorderWidth}px`,
    "--avatar-top": `${vars.avatarTop}px`,
    "--avatar-left": `${vars.avatarLeft}px`,
    "--vinyl-cover-hub-pct": `${vars.coverHubPercent}%`,
    "--tonearm-offset": `${vars.tonearmOffset}px`,
    "--tonearm-top-pct": `${vars.tonearmTopPercent}%`,
    "--tonearm-height-pct": `${vars.tonearmHeightPercent}%`,
    "--avatar-right-tx": `${vars.avatarRightTxPercent}%`,
    "--avatar-right-ty": `${vars.avatarRightTyPercent}%`,
    "--vinyl-names-mb": `${vars.namesBlockMarginBottom}px`,
    "--vinyl-ai-mt": `${vars.aiBlockMarginTop}px`,
    "--vinyl-play-mt": `${vars.playButtonMarginTop}px`,
  } as CSSProperties;
}

function VinylTonearmImage({ side }: { side: "left" | "right" }) {
  const edge =
    side === "left"
      ? { left: "calc(-1 * var(--tonearm-offset))" }
      : { right: "calc(-1 * var(--tonearm-offset))" };

  return (
    <NextImage
      src={VINYL_ARM_IMAGE_SRC}
      alt=""
      width={200}
      height={300}
      className={`pointer-events-none absolute z-20 w-auto select-none object-contain object-top ${
        side === "right" ? "scale-x-[-1]" : ""
      }`}
      style={{
        top: "var(--tonearm-top-pct)",
        height: "var(--tonearm-height-pct)",
        maxWidth: "min(42%, 136px)",
        ...edge,
      }}
      aria-hidden
    />
  );
}

// ─── 旋轉唱片元件 ──────────────────────────────────────────
function VinylDisc({
  side,
  fighterName,
  rankLabel,
  songName,
  coverUrl,
  avatarUrl,
  isPlaying,
  onToggle,
  playDisabled,
  playLabel,
  turnLabel,
  onAvatarReact,
  color,
  aiTool,
  accent,
  layoutNumbers,
}: {
  side: "left" | "right";
  fighterName: string;
  rankLabel: string | null;
  songName: string;
  coverUrl: string | null;
  avatarUrl: string | null;
  isPlaying: boolean;
  onToggle: () => void;
  playDisabled?: boolean;
  playLabel?: string;
  turnLabel?: string;
  onAvatarReact?: () => void;
  color: string;
  aiTool: string | null;
  accent: "orange" | "blue";
  /** 未傳則用 VINYL_LAYOUT_DEFAULTS */
  layoutNumbers?: Partial<VinylLayoutNumbers>;
}) {
  const { t } = useI18n();

  const resolvedLayout = useMemo(
    () => ({ ...VINYL_LAYOUT_DEFAULTS, ...layoutNumbers }),
    [layoutNumbers],
  );
  const rootCssVars = useMemo(() => vinylLayoutToCss(resolvedLayout), [resolvedLayout]);

  const [coverBroken, setCoverBroken] = useState(false);
  const trimmedCover = coverUrl?.trim() ?? "";
  const hasCover = Boolean(trimmedCover) && !coverBroken;
  const trimmedAvatar = avatarUrl?.trim() ?? "";
  const [avatarBroken, setAvatarBroken] = useState(false);
  const showAvatarImg = Boolean(trimmedAvatar) && !avatarBroken;

  const avatarRing =
    accent === "orange"
      ? "border-orange-500/90"
      : "border-blue-400/90";

  const avatarBubbleBase = `box-border overflow-hidden rounded-full bg-black ring-2 ring-black/90 md:ring-[2.5px] ${avatarRing}`;

  const playAura =
    accent === "orange"
      ? "shadow-[0_0_42px_rgba(255,106,0,0.42)]"
      : "shadow-[0_0_42px_rgba(59,130,246,0.4)]";

  const playClasses =
    accent === "orange"
      ? isPlaying
        ? "border-orange-400/80 bg-orange-500/20 text-orange-200 shadow-[0_0_20px_rgba(255,106,0,0.24)]"
        : "border-white/20 bg-zinc-800/90 text-white hover:border-orange-400/70 hover:bg-zinc-700/95"
      : isPlaying
        ? "border-blue-300/80 bg-blue-500/20 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.24)]"
        : "border-white/20 bg-zinc-800/90 text-white hover:border-blue-400/70 hover:bg-zinc-700/95";
  const dividerClass =
    accent === "orange"
      ? "from-transparent via-orange-300/85 to-transparent shadow-[0_0_12px_rgba(251,146,60,0.5)]"
      : "from-transparent via-blue-300/85 to-transparent shadow-[0_0_12px_rgba(96,165,250,0.5)]";
  const titleBlockClass =
    side === "left"
      ? "left-[58%] w-[56%]"
      : "left-[42%] w-[56%]";

  useEffect(() => {
    setCoverBroken(false);
  }, [trimmedCover]);

  useEffect(() => {
    setAvatarBroken(false);
  }, [trimmedAvatar]);

  useEffect(() => {
    if (!trimmedCover) return;
    const img = new window.Image();
    img.onload = () => setCoverBroken(false);
    img.onerror = () => setCoverBroken(true);
    img.src = trimmedCover;
  }, [trimmedCover]);

  return (
    <div
      className={`vinyl-disc-root flex w-full flex-col items-center transition-opacity md:[--vinyl-size:var(--vinyl-size-md)] ${playDisabled && !isPlaying ? "opacity-62" : ""}`}
      style={rootCssVars}
    >
      <div className="relative inline-block">
        {turnLabel && (
          <div className={`absolute left-1/2 top-[-0.35rem] z-40 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.18em] ${
            accent === "orange"
              ? "border-orange-300/60 bg-orange-500/20 text-orange-100"
              : "border-cyan-200/60 bg-cyan-500/18 text-cyan-100"
          }`}>
            {turnLabel}
          </div>
        )}
        {/* 鬥士名 + 歌名：保留唱片壓字感，但避開頭像與狀態標籤 */}
        <div className={`pointer-events-none absolute top-[5%] z-30 -translate-x-1/2 space-y-1 text-center ${titleBlockClass}`}>
          <div className="flex min-w-0 flex-col items-center justify-center gap-1">
            <p className="max-w-full truncate text-[clamp(1.02rem,1.72vw,1.42rem)] font-black leading-none text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.86)]">
              {fighterName}
            </p>
            {rankLabel && (
              <span className={`max-w-full truncate rounded-full border px-2 py-0.5 text-[clamp(0.5rem,0.62vw,0.62rem)] font-black leading-none ${accent === "orange" ? "border-orange-300/55 bg-orange-500/16 text-orange-100" : "border-cyan-200/55 bg-cyan-500/14 text-cyan-100"}`}>
                {rankLabel}
              </span>
            )}
          </div>
          <div className={`mx-auto h-px w-[52%] bg-gradient-to-r ${dividerClass}`} />
          <p className="truncate text-[clamp(1.18rem,2vw,1.68rem)] font-black leading-none text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.82)]">
            {songName}
          </p>
        </div>

        {side === "left" && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAvatarReact?.();
            }}
            className={`absolute z-30 transition hover:scale-105 ${avatarBubbleBase}`}
            style={{
              top: "var(--avatar-top)",
              left: "var(--avatar-left)",
              width: "var(--avatar-size)",
              height: "var(--avatar-size)",
              borderWidth: "var(--avatar-border-width)",
              borderStyle: "solid",
            }}
            aria-label={`Hype ${fighterName}`}
          >
            {showAvatarImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trimmedAvatar}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={AIPOGER_BRAND_LOGO} alt="" className="h-full w-full object-cover" />
            )}
          </button>
        )}

        <VinylTonearmImage side={side} />

        <div
          className={`relative flex items-center justify-center rounded-full ${isPlaying ? playAura + " p-px" : ""}`}
          style={{ width: "var(--vinyl-size)", height: "var(--vinyl-size)" }}
          onClick={() => {
            if (!playDisabled) onToggle();
          }}
          onKeyDown={(e) => {
            if (!playDisabled && (e.key === " " || e.key === "Enter")) onToggle();
          }}
          role="button"
          tabIndex={playDisabled ? -1 : 0}
          aria-disabled={playDisabled}
          aria-label={isPlaying ? t("deck_pause_aria") : t("deck_play_aria")}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: hasCover
                ? `linear-gradient(135deg, #0a0a0a 0%, #141414 100%)`
                : `linear-gradient(135deg, #080808 0%, #161616 50%, #0b0b0b 100%)`,
            }}
          >
            {[8, 16, 24, 32, 40, 48].map((r) => (
              <div key={r} className="absolute rounded-full border border-zinc-800/40" style={{ inset: `${r}%` }} />
            ))}
            <div className="absolute inset-0 rounded-full border border-zinc-600/35" />
          </div>

          {hasCover ? (
            <div
              className={`relative z-10 flex items-center justify-center overflow-hidden rounded-full ${isPlaying ? "animate-spin" : ""}`}
              style={{
                width: "var(--vinyl-cover-hub-pct)",
                height: "var(--vinyl-cover-hub-pct)",
                animationDuration: isPlaying ? "3.2s" : undefined,
                animationTimingFunction: "linear",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={trimmedCover} alt={songName} className="h-full w-full object-cover" onError={() => setCoverBroken(true)} />
              <div className="absolute inset-[46%] rounded-full bg-neutral-950 ring-[1px] ring-zinc-700/85" />
              <div className="absolute inset-[49%] rounded-full bg-black" />
            </div>
          ) : (
            <div
              className={`relative z-10 flex items-center justify-center overflow-hidden rounded-full ${isPlaying ? "animate-spin" : ""}`}
              style={{
                width: "var(--vinyl-cover-hub-pct)",
                height: "var(--vinyl-cover-hub-pct)",
                background: `linear-gradient(145deg, ${color}22 0%, ${color}55 52%, ${color}18 100%)`,
                animationDuration: isPlaying ? "3.2s" : undefined,
                animationTimingFunction: "linear",
              }}
            >
              <div className="absolute inset-[42%] rounded-full border border-zinc-800 bg-zinc-950" />
              <div className="absolute inset-[46%] rounded-full bg-black" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!playDisabled) onToggle();
          }}
          disabled={playDisabled}
          className={`absolute bottom-[5%] z-40 flex items-center gap-2 rounded-full border-2 px-4 py-2 text-[12px] font-black tracking-widest transition-all md:px-5 ${
            side === "left" ? "left-0 -translate-x-[18%]" : "right-0 translate-x-[18%]"
          } ${playClasses} disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-zinc-900/70 disabled:text-zinc-600`}
        >
          <span>{isPlaying ? "⏸" : "▶"}</span>
          <span>{isPlaying ? "PAUSE" : playLabel ?? "PLAY"}</span>
        </button>

        <div className="pointer-events-none absolute bottom-[14%] left-1/2 z-30 w-[70%] -translate-x-1/2 text-center">
          <p className="text-[clamp(1rem,1.75vw,1.35rem)] font-black leading-none text-orange-400 drop-shadow-[0_3px_14px_rgba(0,0,0,0.86)]">
            {aiTool?.trim() || "AI工具名稱"}
          </p>
        </div>

        {side === "right" && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAvatarReact?.();
            }}
            className={`absolute right-0 top-0 z-30 transition hover:scale-105 ${avatarBubbleBase}`}
            style={{
              width: "var(--avatar-size)",
              height: "var(--avatar-size)",
              borderWidth: "var(--avatar-border-width)",
              borderStyle: "solid",
              transform: "translate(var(--avatar-right-tx), var(--avatar-right-ty))",
            }}
            aria-label={`Hype ${fighterName}`}
          >
            {showAvatarImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trimmedAvatar}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={AIPOGER_BRAND_LOGO} alt="" className="h-full w-full object-cover" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function VinylDebugPanel({
  open,
  onToggleOpen,
  values,
  onChange,
}: {
  open: boolean;
  onToggleOpen: () => void;
  values: VinylLayoutNumbers;
  onChange: (next: VinylLayoutNumbers) => void;
}) {
  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[100] border-t border-orange-500/30 bg-zinc-950/95 text-zinc-200 shadow-[0_-8px_32px_rgba(0,0,0,0.55)] backdrop-blur-md">
      <button
        type="button"
        onClick={onToggleOpen}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-orange-400 hover:bg-zinc-900/80"
      >
        <span>Vinyl layout debug（CSS variables）</span>
        <span className="text-zinc-500">{open ? "▼ 收合" : "▲ 展開"}</span>
      </button>
      {open ? (
        <div className="max-h-[42vh] overflow-y-auto border-t border-white/10 px-4 pb-4 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {VINYL_LAYOUT_SLIDER_META.map(({ key, label, min, max, step, unit }) => (
              <label key={key} className="flex flex-col gap-1 text-[11px]">
                <span className="flex justify-between gap-2 text-zinc-400">
                  <span className="font-mono leading-snug">{label}</span>
                  <span className="shrink-0 tabular-nums text-orange-400/90">
                    {values[key]}
                    {unit === "%" ? "%" : "px"}
                  </span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={values[key]}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    onChange({ ...values, [key]: Number.isFinite(n) ? n : values[key] });
                  }}
                  className="h-2 w-full cursor-pointer accent-orange-500"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-lg border border-zinc-600 py-2 text-xs font-medium text-zinc-300 hover:border-orange-500/60 hover:text-white"
            onClick={() => onChange({ ...VINYL_LAYOUT_DEFAULTS })}
          >
            重置為預設值
          </button>
        </div>
      ) : null}
    </div>
  );
}

function VoteHeartButton({
  selected,
  voteLocked,
  onVote,
}: {
  selected: boolean;
  voteLocked: boolean;
  onVote: () => void;
}) {
  const { t } = useI18n();
  const notChosenOther = voteLocked && !selected;

  return (
    <button
      type="button"
      onClick={() => void onVote()}
      disabled={voteLocked}
      title={t("battle_vote_heart_aria")}
      aria-label={t("battle_vote_heart_aria")}
      aria-pressed={selected}
      className={`p-1 transition drop-shadow-[0_0_14px_rgba(255,255,255,0.22)] ${
        voteLocked && !selected ? "opacity-40" : ""
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-10 w-10 md:h-12 md:w-12">
        <path
          fill={selected ? "#ef4444" : "none"}
          stroke={selected ? "#ef4444" : notChosenOther ? "#52525b" : "#e5e5e5"}
          strokeWidth={1.5}
          d="M12 21.35l-1.05-.96C6.96 17.06 4 13.92 4 10.94 4 8.73 5.71 7 8.02 7c1.53 0 3.04.93 4 2.43.96-1.5 2.47-2.43 4-2.43C18.29 7 20 8.73 20 10.94c0 3-2.97 6.17-7.94 11.43L12 21.35z"
        />
      </svg>
    </button>
  );
}

// ─── 聊天泡泡 ──────────────────────────────────────────────
// ─── 主內容（useParams 需在 Suspense 內）───────────────────

function BattleArenaContent() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const battleId = (params?.id as string) ?? "";

  // 狀態
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [votes, setVotes] = useState<VoteCount>({ fighter_a: 0, fighter_b: 0 });
  const [hasVoted, setHasVoted] = useState<"fighter_a" | "fighter_b" | null>(null);
  const [activeDeck, setActiveDeck] = useState<"A" | "B" | null>(null);
  const [playedDecks, setPlayedDecks] = useState<{ A: boolean; B: boolean }>({ A: false, B: false });
  const [voteOpen, setVoteOpen] = useState(false);
  const [voteCountdown, setVoteCountdown] = useState<number | null>(null);
  const [firstDeck, setFirstDeck] = useState<DeckKey | null>(null);
  const [currentDeck, setCurrentDeck] = useState<DeckKey | null>(null);
  const [battlePhase, setBattlePhase] = useState<BattlePlaybackPhase>("rps");
  const [rpsChoices, setRpsChoices] = useState<{ A: string; B: string }>({ A: "✊", B: "✌️" });
  const [rpsPressed, setRpsPressed] = useState<{ A: boolean; B: boolean }>({ A: false, B: false });
  const [reactionBursts, setReactionBursts] = useState<ReactionBurst[]>([]);
  const [feedbackCounts, setFeedbackCounts] = useState<FeedbackCounts>(() => emptyFeedbackCounts());
  const [danmakuItems, setDanmakuItems] = useState<DanmakuItem[]>([]);
  const [audioGlowLevel, setAudioGlowLevel] = useState(0);
  const [battleStartedAtMs, setBattleStartedAtMs] = useState<number | null>(null);
  const [preStartSecondsLeft, setPreStartSecondsLeft] = useState<number | null>(null);
  const [teaserDeck, setTeaserDeck] = useState<DeckKey | null>(null);
  const [teaserSecondsLeft, setTeaserSecondsLeft] = useState(PRE_BATTLE_TEASER_SECONDS);
  const [adVideoMuted, setAdVideoMuted] = useState(false);
  const [adVideoPosition, setAdVideoPosition] = useState<{ x: number; y: number } | null>(null);
  const [transitionDeck, setTransitionDeck] = useState<DeckKey | null>(null);
  const [transitionSecondsLeft, setTransitionSecondsLeft] = useState(SCRATCH_TRANSITION_SECONDS);
  const [transitionEndsAtMs, setTransitionEndsAtMs] = useState<number | null>(null);
  const [winnerRevealOpen, setWinnerRevealOpen] = useState(false);
  const [noContestOpen, setNoContestOpen] = useState(false);
  const [rematchClaim, setRematchClaim] = useState<DropRematchClaimPayload | null>(null);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);
  const [rematchNowMs, setRematchNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [founderCancelBusy, setFounderCancelBusy] = useState(false);
  const [founderCancelError, setFounderCancelError] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string>("");
  const [myDisplayName, setMyDisplayName] = useState<string>("我");
  const [battleGuestId, setBattleGuestId] = useState("");
  const [audioUrls, setAudioUrls] = useState<{ A: string | null; B: string | null }>({ A: null, B: null });
  const [coverDisplayA, setCoverDisplayA] = useState<string | null>(null);
  const [coverDisplayB, setCoverDisplayB] = useState<string | null>(null);
  const [avatarDisplayA, setAvatarDisplayA] = useState<string | null>(null);
  const [avatarDisplayB, setAvatarDisplayB] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(1);
  const vinylDebugMode = searchParams.get("debug") === "1";
  const [vinylDebugOpen, setVinylDebugOpen] = useState(false);
  const [vinylLayout, setVinylLayout] = useState<VinylLayoutNumbers>(() => ({ ...VINYL_LAYOUT_DEFAULTS }));

  // Refs
  const audioARef = useRef<HTMLAudioElement>(null);
  const audioBRef = useRef<HTMLAudioElement>(null);
  const completedDecksRef = useRef<{ A: boolean; B: boolean }>({ A: false, B: false });
  const autoStartedDecksRef = useRef<{ A: boolean; B: boolean }>({ A: false, B: false });
  const pauseResumeTimerRef = useRef<number | null>(null);
  const arenaEchoTimersRef = useRef<number[]>([]);
  const arenaEchoAudioRefs = useRef<HTMLAudioElement[]>([]);
  const arenaEchoTriggeredRef = useRef<{ A: boolean; B: boolean }>({ A: false, B: false });
  const teaserAudioRef = useRef<HTMLAudioElement | null>(null);
  const teaserStopTimerRef = useRef<number | null>(null);
  const teaserTickTimerRef = useRef<number | null>(null);
  const scratchAudioRef = useRef<HTMLAudioElement | null>(null);
  const winnerCountdownAudioRef = useRef<HTMLAudioElement | null>(null);
  const winnerCountdownPromiseRef = useRef<Promise<void> | null>(null);
  const winnerCountdownResolveRef = useRef<(() => void) | null>(null);
  const winnerCountdownTimerRef = useRef<number | null>(null);
  const winnerRevealAudioRef = useRef<HTMLAudioElement | null>(null);
  const adVideoRef = useRef<HTMLVideoElement | null>(null);
  const adVideoDragRef = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);
  const scratchTransitionTimerRef = useRef<number | null>(null);
  const scratchTransitionTickTimerRef = useRef<number | null>(null);
  const preBattleStartedRef = useRef<string | null>(null);
  const resumeDeckOffsetRef = useRef<{ deck: DeckKey; seconds: number } | null>(null);
  const sharedClockAppliedRef = useRef<string | null>(null);
  const finalCountdownSeedRef = useRef(FINAL_VOTE_SECONDS);
  const finalCountdownActiveRef = useRef(false);
  const finalPreStartHypeRef = useRef<string | null>(null);
  const resultRedirectArmedRef = useRef(false);
  const resultRedirectTimerRef = useRef<number | null>(null);
  const resultSequenceRef = useRef(0);
  const battleResultHrefRef = useRef<string | null>(null);
  const rematchResultRedirectRef = useRef<string | null>(null);
  const rematchOpenedBattleRef = useRef<string | null>(null);
  const mockSyncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const shownDanmakuMessageIdsRef = useRef<Set<string>>(new Set());
  const shownDanmakuFingerprintsRef = useRef<Map<string, number>>(new Map());

  const isPreBattle = (preStartSecondsLeft ?? 0) > 0;
  const isQueueArena = battle?.arena_kind === "queue";
  const isQueueChallengeOpen = isQueueArena && isDropChallengeAcceptable({
    status: battle?.queue_status,
    scheduled_start_at: battle?.scheduled_start_at,
    cancellation_evaluation_at: battle?.cancellation_evaluation_at,
  });
  const isArenaWarmup = isPreBattle || isQueueChallengeOpen;
  const isFinalPreStartCountdown =
    !isQueueArena &&
    (preStartSecondsLeft ?? 0) > 0 &&
    (preStartSecondsLeft ?? 0) <= FINAL_PRESTART_HYPE_SECONDS;
  const renderPreBattleAd = isArenaWarmup && (isQueueArena || (preStartSecondsLeft ?? 0) > 0);
  const showPreBattleAd = isArenaWarmup && (isQueueArena || (preStartSecondsLeft ?? 0) > PRE_BATTLE_AD_FADE_OUT_SECONDS);

  useEffect(() => {
    setBattleGuestId(getBattleGuestId());
  }, []);

  const clampAdVideoPosition = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const panelWidth = Math.min(window.innerWidth - 32, window.innerWidth < 640 ? 300 : window.innerWidth < 1280 ? 300 : 340);
    const panelHeight = panelWidth * 0.5625 + 44;
    const bottomReserve = window.innerWidth < 768 ? 124 : 86;
    const maxX = Math.max(12, window.innerWidth - panelWidth - 12);
    const maxY = Math.max(84, window.innerHeight - panelHeight - bottomReserve);
    return {
      x: Math.min(maxX, Math.max(12, x)),
      y: Math.min(maxY, Math.max(84, y)),
    };
  }, []);

  useEffect(() => {
    if (!renderPreBattleAd || adVideoPosition || typeof window === "undefined") return;
    const panelWidth = Math.min(window.innerWidth - 32, window.innerWidth < 640 ? 300 : window.innerWidth < 1280 ? 300 : 340);
    const defaultX = window.innerWidth < 900 ? (window.innerWidth - panelWidth) / 2 : window.innerWidth - panelWidth - 24;
    const defaultY = window.innerWidth < 900 ? 104 : 116;
    setAdVideoPosition(clampAdVideoPosition(defaultX, defaultY));
  }, [adVideoPosition, clampAdVideoPosition, renderPreBattleAd]);

  const handleAdVideoDragStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!adVideoPosition) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    adVideoDragRef.current = {
      pointerId: event.pointerId,
      dx: event.clientX - adVideoPosition.x,
      dy: event.clientY - adVideoPosition.y,
    };
  }, [adVideoPosition]);

  const handleAdVideoDragMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = adVideoDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setAdVideoPosition(clampAdVideoPosition(event.clientX - drag.dx, event.clientY - drag.dy));
  }, [clampAdVideoPosition]);

  const handleAdVideoDragEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (adVideoDragRef.current?.pointerId === event.pointerId) {
      adVideoDragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const stopTeaser = useCallback(() => {
    teaserAudioRef.current?.pause();
    teaserAudioRef.current = null;
    if (teaserStopTimerRef.current != null) {
      window.clearTimeout(teaserStopTimerRef.current);
      teaserStopTimerRef.current = null;
    }
    if (teaserTickTimerRef.current != null) {
      window.clearInterval(teaserTickTimerRef.current);
      teaserTickTimerRef.current = null;
    }
    setTeaserDeck(null);
    setTeaserSecondsLeft(PRE_BATTLE_TEASER_SECONDS);
  }, []);

  const playTeaser = useCallback(
    (deck: DeckKey) => {
      const url = audioUrls[deck];
      if (!url || !isArenaWarmup) return;
      stopTeaser();
      const teaser = new Audio(url);
      teaser.preload = "auto";
      teaser.currentTime = 0;
      teaserAudioRef.current = teaser;
      setTeaserDeck(deck);
      setTeaserSecondsLeft(PRE_BATTLE_TEASER_SECONDS);
      const startedAt = Date.now();
      teaserTickTimerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setTeaserSecondsLeft(Math.max(0, PRE_BATTLE_TEASER_SECONDS - elapsed));
      }, 200);
      teaserStopTimerRef.current = window.setTimeout(() => {
        stopTeaser();
      }, PRE_BATTLE_TEASER_SECONDS * 1000);
      void teaser.play().catch(() => stopTeaser());
    },
    [audioUrls, isArenaWarmup, stopTeaser],
  );

  useEffect(() => {
    const video = adVideoRef.current;
    if (!video) return;
    if (!showPreBattleAd) {
      video.pause();
      return;
    }

    video.loop = true;
    video.volume = 0.78;
    video.muted = adVideoMuted;
    const startPlayback = async () => {
      try {
        await video.play();
      } catch {
        video.muted = true;
        setAdVideoMuted(true);
        await video.play().catch(() => undefined);
      }
    };
    void startPlayback();
  }, [adVideoMuted, showPreBattleAd]);

  const handleAdVideoEnded = useCallback(() => {
    const video = adVideoRef.current;
    if (!video || !showPreBattleAd) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [showPreBattleAd]);

  const clearScratchTransitionMedia = useCallback(() => {
    scratchAudioRef.current?.pause();
    scratchAudioRef.current = null;
    if (scratchTransitionTimerRef.current != null) {
      window.clearTimeout(scratchTransitionTimerRef.current);
      scratchTransitionTimerRef.current = null;
    }
    if (scratchTransitionTickTimerRef.current != null) {
      window.clearInterval(scratchTransitionTickTimerRef.current);
      scratchTransitionTickTimerRef.current = null;
    }
  }, []);

  const stopScratchTransition = useCallback(() => {
    clearScratchTransitionMedia();
    setTransitionDeck(null);
    setTransitionSecondsLeft(SCRATCH_TRANSITION_SECONDS);
    setTransitionEndsAtMs(null);
  }, [clearScratchTransitionMedia]);

  const queueScratchTransition = useCallback(
    (nextDeck: DeckKey, remainingMs = SCRATCH_TRANSITION_MS) => {
      stopScratchTransition();
      setCurrentDeck(nextDeck);
      setActiveDeck(null);
      setTransitionDeck(nextDeck);
      setTransitionSecondsLeft(Math.max(1, Math.ceil(remainingMs / 1000)));
      setTransitionEndsAtMs(Date.now() + remainingMs);
      setBattlePhase("transition");
    },
    [stopScratchTransition],
  );

  const stopWinnerRevealSfx = useCallback(() => {
    winnerRevealAudioRef.current?.pause();
    winnerRevealAudioRef.current = null;
  }, []);

  const stopWinnerCountdownSfx = useCallback(() => {
    if (winnerCountdownTimerRef.current != null) {
      window.clearTimeout(winnerCountdownTimerRef.current);
      winnerCountdownTimerRef.current = null;
    }
    winnerCountdownAudioRef.current?.pause();
    winnerCountdownAudioRef.current = null;
    const resolve = winnerCountdownResolveRef.current;
    winnerCountdownResolveRef.current = null;
    winnerCountdownPromiseRef.current = null;
    resolve?.();
  }, []);

  const playWinnerCountdownSfx = useCallback(() => {
    stopWinnerCountdownSfx();
    const audio = new Audio(WINNER_COUNTDOWN_SFX_SRC);
    audio.preload = "auto";
    audio.volume = 0.94;
    winnerCountdownAudioRef.current = audio;

    let settle: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
      let settled = false;
      settle = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener("ended", settle);
        audio.removeEventListener("error", settle);
        if (winnerCountdownTimerRef.current != null) {
          window.clearTimeout(winnerCountdownTimerRef.current);
          winnerCountdownTimerRef.current = null;
        }
        if (winnerCountdownAudioRef.current === audio) {
          winnerCountdownAudioRef.current = null;
        }
        if (winnerCountdownResolveRef.current === settle) {
          winnerCountdownResolveRef.current = null;
        }
        if (winnerCountdownPromiseRef.current === promise) {
          winnerCountdownPromiseRef.current = null;
        }
        resolve();
      };

      winnerCountdownResolveRef.current = settle;
      audio.addEventListener("ended", settle, { once: true });
      audio.addEventListener("error", settle, { once: true });
      winnerCountdownTimerRef.current = window.setTimeout(settle, WINNER_COUNTDOWN_FALLBACK_MS);
    });

    winnerCountdownPromiseRef.current = promise;
    void audio.play().catch(() => {
      settle();
    });
    return promise;
  }, [stopWinnerCountdownSfx]);

  const waitForWinnerCountdownSfx = useCallback(
    () => winnerCountdownPromiseRef.current ?? Promise.resolve(),
    [],
  );

  const playWinnerRevealSfx = useCallback(() => {
    stopWinnerRevealSfx();
    const audio = new Audio(WINNER_REVEAL_SFX_SRC);
    audio.preload = "auto";
    audio.volume = 0.88;
    winnerRevealAudioRef.current = audio;
    void audio.play().catch(() => undefined);
  }, [stopWinnerRevealSfx]);

  const playFinalPreStartHype = useCallback(() => {
    const announcer = new Audio(FINAL_PRESTART_HYPE_SFX_SRC);
    announcer.preload = "auto";
    announcer.volume = 0.94;
    void announcer.play().catch(() => {
      try {
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(FINAL_PRESTART_HYPE_TEXT);
          utterance.lang = "en-US";
          utterance.rate = 0.94;
          utterance.pitch = 0.72;
          utterance.volume = 1;
          window.speechSynthesis.speak(utterance);
          return;
        }
      } catch {
        // Fall through to the crowd sample when speech synthesis is unavailable.
      }

      const audio = new Audio(WINNER_REVEAL_SFX_SRC);
      audio.preload = "auto";
      audio.volume = 0.82;
      void audio.play().catch(() => undefined);
    });
  }, []);

  const closeBattleCardAfterResult = useCallback(
    async (outcome: "completed" | "expired" = "completed") => {
      if (!isUuid(battleId) || isAuthBypassEnabled) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      await completeBattleCardIntent({ accessToken, battleId, outcome });
    },
    [battleId],
  );

  const beginBattleWithFirstDeck = useCallback((deck: DeckKey, startedAtMs = Date.now(), delayMs = 0) => {
    resultRedirectArmedRef.current = false;
    resultSequenceRef.current += 1;
    stopWinnerCountdownSfx();
    stopWinnerRevealSfx();
    setBattleStartedAtMs(startedAtMs);
    setFirstDeck(deck);
    setCurrentDeck(deck);
    setVoteOpen(true);
    setVoteCountdown(null);
    setWinnerRevealOpen(false);
    setNoContestOpen(false);
    setActiveDeck(null);
    setRpsPressed({ A: true, B: true });
    setBattlePhase("ready");
    resumeDeckOffsetRef.current = null;
    completedDecksRef.current = { A: false, B: false };
    autoStartedDecksRef.current = { A: false, B: false };
    setPlayedDecks({ A: false, B: false });
    if (delayMs > 0) {
      window.setTimeout(() => {
        setBattlePhase("ready");
      }, delayMs);
    }
  }, [stopWinnerCountdownSfx, stopWinnerRevealSfx]);

  const pushResultForEveryone = useCallback((delayMs = 0, broadcast = true, hrefOverride?: string) => {
    if (resultRedirectArmedRef.current) return;
    resultRedirectArmedRef.current = true;
    const resultSequence = resultSequenceRef.current + 1;
    resultSequenceRef.current = resultSequence;
    if (resultRedirectTimerRef.current != null) {
      window.clearTimeout(resultRedirectTimerRef.current);
      resultRedirectTimerRef.current = null;
    }
    setVoteOpen(false);

    const href = hrefOverride || battleResultHrefRef.current;
    if (!href) {
      void waitForWinnerCountdownSfx().then(() => {
        if (resultSequenceRef.current !== resultSequence) return;
        void closeBattleCardAfterResult("expired").catch((err) => {
          console.warn("[battle cleanup no contest]", err);
        });
        setWinnerRevealOpen(false);
        setNoContestOpen(true);
      });
      return;
    }

    if (broadcast && href) {
      void mockSyncChannelRef.current?.send({
        type: "broadcast",
        event: "result-ready",
        payload: { href },
      });
    }

    void waitForWinnerCountdownSfx().then(() => {
      if (resultSequenceRef.current !== resultSequence) return;
      setWinnerRevealOpen(true);
      setNoContestOpen(false);
      playWinnerRevealSfx();

      resultRedirectTimerRef.current = window.setTimeout(() => {
        resultRedirectTimerRef.current = null;
        if (resultSequenceRef.current !== resultSequence) return;
        setWinnerRevealOpen(false);
      }, Math.max(delayMs, WINNER_REVEAL_MS));
    });
  }, [closeBattleCardAfterResult, playWinnerRevealSfx, waitForWinnerCountdownSfx]);

  const markDeckPlayed = useCallback((deck: "A" | "B") => {
    setPlayedDecks((prev) => (prev[deck] ? prev : { ...prev, [deck]: true }));
  }, []);

  const clearArenaEcho = useCallback(() => {
    arenaEchoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    arenaEchoTimersRef.current = [];
    arenaEchoAudioRefs.current.forEach((audio) => {
      audio.pause();
      audio.src = "";
    });
    arenaEchoAudioRefs.current = [];
  }, []);

  const triggerArenaEcho = useCallback((deck: DeckKey) => {
    if (arenaEchoTriggeredRef.current[deck]) return;
    const source = deck === "A" ? audioARef.current : audioBRef.current;
    if (!source?.src) return;

    arenaEchoTriggeredRef.current[deck] = true;
    const sampleAt = Math.max(0, Math.min(source.currentTime, HOOK_BATTLE_SECONDS) - 0.08);

    ARENA_ECHO_TAPS.forEach((tap) => {
      const timer = window.setTimeout(() => {
        const echo = new Audio(source.currentSrc || source.src);
        echo.preload = "auto";
        echo.volume = tap.volume;
        echo.currentTime = Math.max(0, sampleAt - tap.offsetBackSeconds);
        arenaEchoAudioRefs.current.push(echo);
        void echo.play().catch(() => {
          echo.pause();
        });
        window.setTimeout(() => {
          echo.pause();
          echo.src = "";
          arenaEchoAudioRefs.current = arenaEchoAudioRefs.current.filter((item) => item !== echo);
        }, 1400);
      }, tap.delayMs);
      arenaEchoTimersRef.current.push(timer);
    });
  }, []);

  // ── 取得目前用戶 ──────────────────────────────────────
  useEffect(() => {
    const getUser = async () => {
      if (battleId.startsWith("mock-")) {
        setMyUserId("mock-audience");
        setMyDisplayName(searchParams.get("viewerName")?.trim() || searchParams.get("displayName")?.trim() || "AIPOGER 觀眾");
        return;
      }
      if (isAuthBypassEnabled) {
        setMyUserId(mockUserId);
        setMyDisplayName(searchParams.get("fighterName")?.trim() || "我");
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setMyUserId("");
        setMyDisplayName(searchParams.get("viewerName")?.trim() || searchParams.get("displayName")?.trim() || "AIPOGER 觀眾");
        return;
      }
      setMyUserId(session.user.id);
      const metadataName = authDisplayName(session.user);
      const [{ data: fighterProfile }, { data: userProfile }] = await Promise.all([
        supabase.from("fighter_profiles").select("display_name").eq("id", session.user.id).maybeSingle(),
        supabase.from("user_profiles").select("display_name, fighter_name").eq("id", session.user.id).maybeSingle(),
      ]);
      setMyDisplayName(
        (typeof fighterProfile?.display_name === "string" && fighterProfile.display_name.trim()) ||
          (typeof userProfile?.fighter_name === "string" && userProfile.fighter_name.trim()) ||
          (typeof userProfile?.display_name === "string" && userProfile.display_name.trim()) ||
          metadataName ||
          "我",
      );
    };
    void getUser();
  }, [battleId, lang, router, searchParams]);

  // ── 載入 Battle 資料（查詢前先 await getSession，避免 JWT 未就緒被 RLS 擋）────
  useEffect(() => {
    if (!battleId) return;

    let mounted = true;

    const loadBattle = async () => {
      if (battleId.startsWith("mock-") || isAuthBypassEnabled) {
        const qFighter = searchParams.get("fighterName")?.trim() ?? "";
        const qSong = searchParams.get("songName")?.trim() ?? "";
        const qCover = searchParams.get("coverUrl")?.trim() ?? "";
        const qAvatar = searchParams.get("avatarUrl")?.trim() ?? "";
        const qAssetKey = searchParams.get("assetKey")?.trim() ?? "";
        const sessionAssets = readBattleAssetSession(qAssetKey);
        const qAudio = searchParams.get("audioPath")?.trim() ?? "";
        const qAi = searchParams.get("aiTool")?.trim() ?? "";
        const qGenre = searchParams.get("genre")?.trim() ?? "";
        const qLyrics = searchParams.get("lyrics")?.trim() ?? "";
        const qBattleStartedAt = searchParams.get("battleStartedAtMs")?.trim() || searchParams.get("battleStartedAt")?.trim() || "";
        const qScheduledStartAt = searchParams.get("scheduledStartAtMs")?.trim() || searchParams.get("scheduledStartAt")?.trim() || "";
        const testFlag = searchParams.get("test") === "1";

        let profileAvatar: string | null = null;
        let fighterProfileAvatar: string | null = null;
        let fighterProfileCover: string | null = null;
        let oauthAv: string | null = null;
        if (!isAuthBypassEnabled) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          oauthAv = oauthProviderAvatar(session?.user);
          const uid = session?.user?.id;
          if (uid) {
            const [{ data: prof }, { data: fighterProfile }] = await Promise.all([
              supabase
                .from("user_profiles")
                .select("avatar_url")
                .eq("id", uid)
                .maybeSingle(),
              supabase
                .from("fighter_profiles")
                .select("avatar_url, song_cover_url")
                .eq("id", uid)
                .maybeSingle(),
            ]);
            if (typeof prof?.avatar_url === "string" && prof.avatar_url.length > 0) {
              profileAvatar = prof.avatar_url;
            }
            if (typeof fighterProfile?.avatar_url === "string" && fighterProfile.avatar_url.length > 0) {
              fighterProfileAvatar = fighterProfile.avatar_url;
            }
            if (typeof fighterProfile?.song_cover_url === "string" && fighterProfile.song_cover_url.length > 0) {
              fighterProfileCover = fighterProfile.song_cover_url;
            }
          }
        }

        setBattle({
          id: battleId,
          fighter_a_user_id: "mock-fighter-a",
          fighter_b_user_id: "mock-fighter-b",
          fighter_a_name: qFighter || (testFlag ? "測試鬥士" : "夜色迴響"),
          fighter_b_name: testFlag ? "測試對手" : "蒼藍頻段",
          song_a_name: qSong || (testFlag ? "測試歌曲" : "Neon Dust"),
          song_b_name: testFlag ? "測試歌曲B" : "Cold Pulse",
          audio_a_path: qAudio || DEMO_BATTLE_AUDIO_SRC,
          audio_b_path: DEMO_BATTLE_AUDIO_SRC,
          fighter_a_avatar: firstAvatarUrl(qAvatar, sessionAssets.avatarUrl, profileAvatar, fighterProfileAvatar, oauthAv),
          fighter_b_avatar: null,
          fighter_a_rank: rankLabelForLevel(0, qFighter || "愛波哥"),
          fighter_b_rank: rankLabelForLevel(1, "測試對手"),
          song_a_cover: qCover || sessionAssets.coverUrl || fighterProfileCover || null,
          song_b_cover: null,
          ai_tool_a: qAi || "Suno",
          ai_tool_b: testFlag ? "Udio" : "Udio",
          lyrics_a: qLyrics || null,
          lyrics_b: null,
          genre: qGenre || "AI Music",
          scheduled_start_at: qScheduledStartAt ? new Date(timestampParamMs(qScheduledStartAt) ?? Date.now()).toISOString() : null,
          battle_started_at: qBattleStartedAt ? new Date(timestampParamMs(qBattleStartedAt) ?? Date.now()).toISOString() : null,
          started_at: null,
          status: "live",
        });
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      // 還原 session 可能略晚於首次 render，短重試避免 RLS 擋讀
      let authed = session;
      for (let i = 0; i < 6 && !authed?.user && !isAuthBypassEnabled; i++) {
        await new Promise((r) => setTimeout(r, 80));
        const { data: d2 } = await supabase.auth.getSession();
        authed = d2.session;
      }

      const arenaEntryResponse = await fetch(
        `/api/battle-pool/arena-entry?id=${encodeURIComponent(battleId)}&lang=${lang}`,
        { cache: "no-store" },
      ).catch(() => null);
      if (!mounted) return;
      if (arenaEntryResponse?.ok) {
        const payload = (await arenaEntryResponse.json().catch(() => null)) as BattleArenaEntryPayload | null;
        if (payload?.action === "redirect" && payload.href) {
          router.replace(payload.href);
          return;
        }
        if (payload?.action === "battle" && payload.battle?.id) {
          setBattle(payload.battle);
          setLoading(false);
          return;
        }
      }

      const { data, error: battleError } = await supabase
        .from("battles")
        .select("*")
        .eq("id", battleId)
        .single();

      if (!mounted) return;
      if (battleError || !data) {
        let { data: queueRow, error: queueError } = await supabase
          .from("battle_queue")
          .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,lyrics,audio_path,status,match_group_id,expires_at,scheduled_start_at,cancellation_evaluation_at,created_at")
          .eq("id", battleId)
          .maybeSingle<QueueArenaRow>();

        if (queueError) {
          const msg = `${queueError.message ?? ""} ${queueError.details ?? ""} ${queueError.hint ?? ""}`;
          const missingScheduleColumn = /scheduled_start_at|cancellation_evaluation_at|schema cache|column.*does not exist|PGRST204/i.test(msg);
          if (missingScheduleColumn) {
            const legacyRead = await supabase
              .from("battle_queue")
              .select("id,user_id,fighter_name,original_file_name,genre,ai_tool,lyrics,audio_path,status,match_group_id,expires_at,created_at")
              .eq("id", battleId)
              .maybeSingle<QueueArenaRow>();
            queueRow = legacyRead.data;
            queueError = legacyRead.error;
          }
        }

        if (!mounted) return;
        if (queueRow?.match_group_id) {
          router.replace(`/battle/${encodeURIComponent(queueRow.match_group_id)}?lang=${lang}`);
          return;
        }

        if (queueRow?.id) {
          if (!isDropChallengeAcceptable({
            status: queueRow.status,
            scheduled_start_at: queueRow.scheduled_start_at,
            cancellation_evaluation_at: queueRow.cancellation_evaluation_at,
            expires_at: queueRow.expires_at,
          })) {
            router.replace(`/listen-bar?lang=${lang}`);
            return;
          }

          const [{ data: fighterProfile }, { data: userProfile }] = queueRow.user_id
            ? await Promise.all([
                supabase.from("fighter_profiles").select("avatar_url, song_cover_url").eq("id", queueRow.user_id).maybeSingle(),
                supabase.from("user_profiles").select("avatar_url, level").eq("id", queueRow.user_id).maybeSingle(),
              ])
            : [{ data: null }, { data: null }];
          const queueStatus = queueRow.status ?? "waiting_challenge";
          setBattle({
            id: queueRow.id,
            arena_kind: "queue",
            match_group_id: queueRow.match_group_id,
            queue_status: queueStatus,
            fighter_a_user_id: queueRow.user_id ?? "",
            fighter_b_user_id: null,
            fighter_a_name: queueRow.fighter_name || "AIPOGER",
            fighter_b_name: lang === "zh" ? "等待挑戰者" : "Waiting Rival",
            song_a_name: queueRow.original_file_name || "45s Drop",
            song_b_name: lang === "zh" ? "挑戰者 Drop" : "Rival Drop",
            audio_a_path: queueRow.audio_path,
            audio_b_path: null,
            fighter_a_avatar: firstAvatarUrl(userProfile?.avatar_url, fighterProfile?.avatar_url),
            fighter_b_avatar: null,
            fighter_a_rank: rankLabelForLevel(typeof userProfile?.level === "number" ? userProfile.level : 1, queueRow.fighter_name || "AIPOGER"),
            fighter_b_rank: null,
            song_a_cover: fighterProfile?.song_cover_url ?? null,
            song_b_cover: null,
            ai_tool_a: queueRow.ai_tool?.trim() || "AI Music",
            ai_tool_b: lang === "zh" ? "挑戰者進場後顯示" : "Shows after rival enters",
            lyrics_a: typeof queueRow.lyrics === "string" && queueRow.lyrics.trim() ? queueRow.lyrics : null,
            lyrics_b: null,
            genre: queueRow.genre || "AI Music",
            scheduled_start_at: resolveDropBattleScheduledStart(queueRow),
            cancellation_evaluation_at: queueRow.cancellation_evaluation_at ?? null,
            battle_started_at: null,
            started_at: null,
            status:
              queueStatus === "expired"
                ? "cancelled_no_challenger"
                : queueStatus === "cancelled"
                  ? "cancelled"
                  : "pending",
          });
          setLoading(false);
          return;
        }

        console.error("[battle load]", battleError ?? queueError);
        if (!data || battleError?.code === "PGRST116") {
          setError("i18n:battle_not_found");
        } else {
          setError(battleError?.message ?? "i18n:battle_load_failed");
        }
        setLoading(false);
        return;
      }

      const bdata = data as BattleData;
      if (!battleId.startsWith("mock-") && !isAuthBypassEnabled) {
        const resolutionResponse = await fetch(
          `/api/battle-pool/resolve-battle-link?battleId=${encodeURIComponent(battleId)}&lang=${lang}`,
          { cache: "no-store" },
        ).catch(() => null);
        if (resolutionResponse?.ok) {
          const resolution = (await resolutionResponse.json().catch(() => null)) as BattleLinkResolutionPayload | null;
          if (resolution?.action === "redirect" && resolution.href) {
            router.replace(resolution.href);
            return;
          }
        }
      }

      // 同步載入兩邊的 fighter_profiles（頭像 + 封面；必須取 .data）
      const [{ data: rowA }, { data: rowB }, { data: profA }, { data: profB }] = await Promise.all([
        supabase.from("fighter_profiles").select("avatar_url, song_cover_url").eq("id", bdata.fighter_a_user_id).maybeSingle(),
        bdata.fighter_b_user_id
          ? supabase.from("fighter_profiles").select("avatar_url, song_cover_url").eq("id", bdata.fighter_b_user_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("user_profiles").select("avatar_url, level").eq("id", bdata.fighter_a_user_id).maybeSingle(),
        bdata.fighter_b_user_id
          ? supabase.from("user_profiles").select("avatar_url, level").eq("id", bdata.fighter_b_user_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setBattle({
        ...(data as BattleData),
        arena_kind: "battle",
        fighter_a_user_id: bdata.fighter_a_user_id,
        fighter_b_user_id: bdata.fighter_b_user_id,
        fighter_a_avatar: firstAvatarUrl(profA?.avatar_url, rowA?.avatar_url),
        fighter_b_avatar: firstAvatarUrl(profB?.avatar_url, rowB?.avatar_url),
        fighter_a_rank: rankLabelForLevel(typeof profA?.level === "number" ? profA.level : 1, bdata.fighter_a_name),
        fighter_b_rank: rankLabelForLevel(typeof profB?.level === "number" ? profB.level : 1, bdata.fighter_b_name),
        song_a_cover: rowA?.song_cover_url ?? (bdata.song_a_cover as string | null | undefined) ?? null,
        song_b_cover: rowB?.song_cover_url ?? (bdata.song_b_cover as string | null | undefined) ?? null,
        ai_tool_a: (bdata.ai_tool_a as string | null | undefined) ?? null,
        ai_tool_b: (bdata.ai_tool_b as string | null | undefined) ?? null,
        lyrics_a: typeof bdata.lyrics_a === "string" && bdata.lyrics_a.length > 0 ? bdata.lyrics_a : null,
        lyrics_b: typeof bdata.lyrics_b === "string" && bdata.lyrics_b.length > 0 ? bdata.lyrics_b : null,
        genre: typeof bdata.genre === "string" && bdata.genre.trim() ? bdata.genre : "AI Music",
        scheduled_start_at: (bdata.scheduled_start_at as string | null | undefined) ?? null,
        battle_started_at: (bdata.battle_started_at as string | null | undefined) ?? null,
        started_at: (bdata.started_at as string | null | undefined) ?? null,
      });
      setLoading(false);
    };

    void loadBattle();
    return () => {
      mounted = false;
    };
  }, [battleId, lang, router, searchParams, t]);

  useEffect(() => {
    if (!battleId || loading || battle?.arena_kind !== "queue") return;

    const channel = supabase
      .channel(`battle-queue-arena-${battleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_queue", filter: `id=eq.${battleId}` },
        (payload) => {
          const next = payload.new as QueueArenaRow;
          if (next?.match_group_id) {
            router.replace(`/battle/${encodeURIComponent(next.match_group_id)}?lang=${lang}`);
            return;
          }
          if (next?.id) {
            setBattle((current) =>
              current?.id === next.id && current.arena_kind === "queue"
                ? {
                    ...current,
                    queue_status: next.status,
                    status:
                      next.status === "expired"
                        ? "cancelled_no_challenger"
                        : next.status === "cancelled"
                          ? "cancelled"
                          : "pending",
                    scheduled_start_at: resolveDropBattleScheduledStart(next) ?? current.scheduled_start_at,
                    cancellation_evaluation_at: next.cancellation_evaluation_at ?? current.cancellation_evaluation_at,
                  }
                : current,
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [battle?.arena_kind, battleId, lang, loading, router]);

  // ── 封面（中心唱片貼紙）與頭像（左上角）分開解析 ────
  useEffect(() => {
    if (!battle) {
      setCoverDisplayA(null);
      setCoverDisplayB(null);
      setAvatarDisplayA(null);
      setAvatarDisplayB(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [coverA, coverB, avA, avB] = await Promise.all([
        resolveMediaUrl(battle.song_a_cover),
        resolveMediaUrl(battle.song_b_cover),
        resolveMediaUrl(battle.fighter_a_avatar),
        resolveMediaUrl(battle.fighter_b_avatar),
      ]);
      if (!cancelled) {
        setCoverDisplayA(coverA);
        setCoverDisplayB(coverB);
        setAvatarDisplayA(avA);
        setAvatarDisplayB(avB);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [battle]);

  // ── Storage signed URL（雙方音檔；RLS 需允許讀取 battle 引用路徑）────
  useEffect(() => {
    if (!battle) return;

    const queryAudio = searchParams.get("audioPath")?.trim() ?? "";
    const mockOrBypass = battleId.startsWith("mock-") || isAuthBypassEnabled;
    const testFlag = searchParams.get("test") === "1";
    const signAudioFromQuery = Boolean(queryAudio && (testFlag || mockOrBypass));

    if (signAudioFromQuery) {
      if (isHttpOrDataImageUrl(queryAudio)) {
        setAudioUrls({ A: queryAudio, B: DEMO_BATTLE_AUDIO_SRC });
        return;
      }

      let cancelled = false;
      void (async () => {
        const { data: signed, error } = await supabase.storage
          .from("battle-audio")
          .createSignedUrl(queryAudio, 60 * 60);
        if (!cancelled) {
          if (error) console.error("[battle audio test]", error);
          setAudioUrls({ A: signed?.signedUrl ?? DEMO_BATTLE_AUDIO_SRC, B: DEMO_BATTLE_AUDIO_SRC });
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (mockOrBypass && !queryAudio) {
      setAudioUrls({ A: DEMO_BATTLE_AUDIO_SRC, B: DEMO_BATTLE_AUDIO_SRC });
      return;
    }

    let cancelled = false;

    const resolveUrls = async () => {
      const next: { A: string | null; B: string | null } = { A: null, B: null };
      const paths: Array<["A" | "B", string | null]> = [
        ["A", battle.audio_a_path],
        ["B", battle.audio_b_path],
      ];

      for (const [deck, path] of paths) {
        if (!path || path.startsWith("mock-")) continue;
        if (/^(https?:|data:|\/)/i.test(path)) {
          next[deck] = path;
          continue;
        }
        const { data: signed, error: signErr } = await supabase.storage
          .from("battle-audio")
          .createSignedUrl(path, 60 * 60);
        if (signErr) {
          console.error(`[battle audio ${deck}]`, signErr, path);
          continue;
        }
        next[deck] = signed?.signedUrl ?? null;
      }

      if (!cancelled) setAudioUrls(next);
    };

    void resolveUrls();
    return () => {
      cancelled = true;
    };
  }, [battle, battleId, searchParams]);

  // ── 即時觀戰人數（Presence）────────────────────────────
  useEffect(() => {
    if (!battleId || loading || isAuthBypassEnabled || !myUserId || battleId.startsWith("mock-")) return;

    const channel = supabase.channel(`presence-battle-${battleId}`, {
      config: { presence: { key: myUserId } },
    });

    const countFromState = () => {
      const state = channel.presenceState();
      const users = new Set<string>();
      for (const presences of Object.values(state)) {
        for (const p of presences as { user_id?: string }[]) {
          if (p?.user_id) users.add(p.user_id);
        }
      }
      setViewerCount(Math.max(1, users.size));
    };

    channel.on("presence", { event: "sync" }, countFromState);

    void channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: myUserId, at: Date.now() });
        countFromState();
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [battleId, loading, myUserId]);

  const fireDanmaku = useCallback((message: ChatMessage | string) => {
    if (typeof message !== "string") {
      const stableMessageId = message.id?.trim();
      if (stableMessageId) {
        if (shownDanmakuMessageIdsRef.current.has(stableMessageId)) return;
        shownDanmakuMessageIdsRef.current.add(stableMessageId);
        if (shownDanmakuMessageIdsRef.current.size > 120) {
          shownDanmakuMessageIdsRef.current = new Set(Array.from(shownDanmakuMessageIdsRef.current).slice(-80));
        }
      }
      const fingerprint = `${message.user_id || ""}:${message.sender_type}:${message.content.trim()}`;
      const now = Date.now();
      const lastShownAt = shownDanmakuFingerprintsRef.current.get(fingerprint) ?? 0;
      if (now - lastShownAt < 3500) return;
      shownDanmakuFingerprintsRef.current.set(fingerprint, now);
      if (shownDanmakuFingerprintsRef.current.size > 120) {
        shownDanmakuFingerprintsRef.current = new Map(Array.from(shownDanmakuFingerprintsRef.current.entries()).slice(-80));
      }
    }
    const fallbackSender =
      typeof message === "string"
        ? ""
        : message.sender_type === "fighter_a"
          ? battle?.fighter_a_name
          : message.sender_type === "fighter_b"
            ? battle?.fighter_b_name
            : message.user_id === myUserId
              ? myDisplayName
              : `AIPO-${(message.user_id || "LIVE").slice(0, 4).toUpperCase()}`;
    const rawText =
      typeof message === "string"
        ? message
        : `${message.display_name?.trim() || fallbackSender}：${message.content}`;
    const text = rawText.trim();
    if (!text) return;
    const id = `danmaku-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sizeRem = DANMAKU_FONT_SIZES_REM[Math.floor(Math.random() * DANMAKU_FONT_SIZES_REM.length)];
    const colorClass = DANMAKU_COLOR_CLASSES[Math.floor(Math.random() * DANMAKU_COLOR_CLASSES.length)];
    const durationMs = 13000 + Math.floor(Math.random() * 5200);
    setDanmakuItems((prev) => [
      ...prev.slice(-14),
      {
        id,
        text,
        lane: Math.floor(Math.random() * 7),
        sizeRem,
        durationMs,
        colorClass,
      },
    ]);
    window.setTimeout(() => {
      setDanmakuItems((prev) => prev.filter((item) => item.id !== id));
    }, durationMs + 900);
  }, [battle?.fighter_a_name, battle?.fighter_b_name, myDisplayName, myUserId]);

  useEffect(() => {
    if (!battleId || loading) return;

    const channel = supabase
      .channel(`battle-chat-${battleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `battle_id=eq.${battleId}` },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          // 取 display_name
          if (msg.user_id) {
            const [{ data: fighterProfile }, { data: userProfile }] = await Promise.all([
              supabase.from("fighter_profiles").select("display_name, avatar_url").eq("id", msg.user_id).maybeSingle(),
              supabase.from("user_profiles").select("display_name, fighter_name, avatar_url").eq("id", msg.user_id).maybeSingle(),
            ]);
            msg.display_name =
              (typeof fighterProfile?.display_name === "string" && fighterProfile.display_name.trim()) ||
              (typeof userProfile?.fighter_name === "string" && userProfile.fighter_name.trim()) ||
              (typeof userProfile?.display_name === "string" && userProfile.display_name.trim()) ||
              (msg.user_id === myUserId ? myDisplayName : undefined);
            msg.avatar_url =
              (typeof fighterProfile?.avatar_url === "string" && fighterProfile.avatar_url.trim()) ||
              (typeof userProfile?.avatar_url === "string" && userProfile.avatar_url.trim()) ||
              undefined;
          }
          fireDanmaku(msg);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [battleId, fireDanmaku, loading, myDisplayName, myUserId]);

  // ── 投票訂閱 ──────────────────────────────────────────
  useEffect(() => {
    if (!battleId || loading) return;

    const loadVotes = async () => {
      const { data: voteData } = await supabase
        .from("battle_votes")
        .select("voted_for, user_id")
        .eq("battle_id", battleId);

      let guestCounts = { fighter_a: 0, fighter_b: 0 };
      let guestVote: "fighter_a" | "fighter_b" | null = null;
      if (battleGuestId) {
        const guestState = await fetch(
          `/api/battle-pool/guest-vote?battleId=${encodeURIComponent(battleId)}&guestId=${encodeURIComponent(battleGuestId)}`,
          { cache: "no-store" },
        )
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null) as
          | { counts?: { fighter_a?: number; fighter_b?: number }; guestVote?: "fighter_a" | "fighter_b" | null }
          | null;
        guestCounts = {
          fighter_a: Math.max(0, Number(guestState?.counts?.fighter_a) || 0),
          fighter_b: Math.max(0, Number(guestState?.counts?.fighter_b) || 0),
        };
        guestVote = guestState?.guestVote ?? null;
      }

      const signedRows = voteData ?? [];
      const signedCounts = {
        fighter_a: signedRows.filter((v) => v.voted_for === "fighter_a").length,
        fighter_b: signedRows.filter((v) => v.voted_for === "fighter_b").length,
      };
      setVotes({
        fighter_a: signedCounts.fighter_a + guestCounts.fighter_a,
        fighter_b: signedCounts.fighter_b + guestCounts.fighter_b,
      });
      const myVote = signedRows.find((v) => v.user_id === myUserId);
      if (myVote) setHasVoted(myVote.voted_for as "fighter_a" | "fighter_b");
      else if (!myUserId && guestVote) setHasVoted(guestVote);
    };

    void loadVotes();

    const channel = supabase
      .channel(`battle-votes-${battleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_votes", filter: `battle_id=eq.${battleId}` },
        () => {
          void loadVotes();
        },
      )
      .subscribe();
    const guestChannel = supabase
      .channel(`battle-guest-votes-${battleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_guest_votes", filter: `battle_id=eq.${battleId}` },
        () => {
          void loadVotes();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(guestChannel);
    };
  }, [battleGuestId, battleId, loading, myUserId]);

  useEffect(() => {
    setPlayedDecks({ A: false, B: false });
    completedDecksRef.current = { A: false, B: false };
    autoStartedDecksRef.current = { A: false, B: false };
    arenaEchoTriggeredRef.current = { A: false, B: false };
    clearArenaEcho();
    setVoteOpen(false);
    setVoteCountdown(null);
    setWinnerRevealOpen(false);
    setNoContestOpen(false);
    setRematchClaim(null);
    setRematchBusy(false);
    setRematchError(null);
    setHasVoted(null);
    setActiveDeck(null);
    setFirstDeck(null);
    setCurrentDeck(null);
    setBattlePhase("rps");
    setBattleStartedAtMs(null);
    setRpsChoices({ A: "✊", B: "✌️" });
    setRpsPressed({ A: false, B: false });
    setReactionBursts([]);
    setFeedbackCounts(emptyFeedbackCounts());
    resumeDeckOffsetRef.current = null;
    sharedClockAppliedRef.current = null;
    finalCountdownSeedRef.current = FINAL_VOTE_SECONDS;
    finalCountdownActiveRef.current = false;
    resultRedirectArmedRef.current = false;
    resultSequenceRef.current += 1;
    battleResultHrefRef.current = null;
    rematchOpenedBattleRef.current = null;
    shownDanmakuMessageIdsRef.current.clear();
    shownDanmakuFingerprintsRef.current.clear();
    if (resultRedirectTimerRef.current != null) {
      window.clearTimeout(resultRedirectTimerRef.current);
      resultRedirectTimerRef.current = null;
    }
    if (pauseResumeTimerRef.current != null) {
      window.clearTimeout(pauseResumeTimerRef.current);
      pauseResumeTimerRef.current = null;
    }
    audioARef.current?.pause();
    audioBRef.current?.pause();
    stopTeaser();
    stopScratchTransition();
    stopWinnerCountdownSfx();
    stopWinnerRevealSfx();
    setPreStartSecondsLeft(null);
    preBattleStartedRef.current = null;
  }, [battleId, clearArenaEcho, stopScratchTransition, stopTeaser, stopWinnerCountdownSfx, stopWinnerRevealSfx]);

  useEffect(() => {
    if (loading || !battle || !battleId) return;
    setBattlePhase("rps");
    setFirstDeck(null);
    setCurrentDeck(null);
    setVoteOpen(false);
    setRpsPressed({ A: false, B: false });
    if (!searchParams.get("battleStartedAtMs") && !searchParams.get("battleStartedAt") && !battle.battle_started_at) {
      setBattleStartedAtMs(null);
    }
  }, [battle, battleId, loading, searchParams]);

  useEffect(() => {
    if (loading || !battle || !battleId) return undefined;

    const scheduledStartMs = scheduledStartMsForBattle(battle);
    const alreadyStartedMs =
      timestampParamMs(searchParams.get("battleStartedAtMs")) ??
      timestampParamMs(searchParams.get("battleStartedAt")) ??
      timestampParamMs(battle.battle_started_at);

    if (!scheduledStartMs || alreadyStartedMs) {
      setPreStartSecondsLeft(null);
      return undefined;
    }

    const startKey = `${battleId}:${scheduledStartMs}`;
    const tick = () => {
      const secondsUntilStart = Math.floor((scheduledStartMs - Date.now()) / 1000);
      const remaining = Math.max(0, secondsUntilStart);
      setPreStartSecondsLeft(remaining);
      if (secondsUntilStart > 0) {
        return;
      }

      if (battle.arena_kind === "queue") {
        return;
      }

      stopTeaser();
      if (preBattleStartedRef.current === startKey) return;
      preBattleStartedRef.current = startKey;

      const result = rpsResultForBattle(battleId);
      setRpsChoices({ A: result.choiceA, B: result.choiceB });
      if (!battleId.startsWith("mock-") && !isAuthBypassEnabled) {
        void supabase.rpc("start_90s_battle", { p_battle_id: battleId });
      }
      beginBattleWithFirstDeck(result.firstDeck, scheduledStartMs);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [battle, battleId, beginBattleWithFirstDeck, loading, searchParams, stopTeaser]);

  useEffect(() => {
    return () => clearArenaEcho();
  }, [clearArenaEcho]);

  useEffect(() => {
    if (loading || !battle || !battleId || battle.arena_kind === "queue") return;

    const sharedStartedAtMs =
      timestampParamMs(searchParams.get("battleStartedAtMs")) ??
      timestampParamMs(searchParams.get("battleStartedAt")) ??
      timestampParamMs(battle.battle_started_at) ??
      (() => {
        const scheduledStartMs = scheduledStartMsForBattle(battle);
        return scheduledStartMs && scheduledStartMs <= Date.now() ? scheduledStartMs : null;
      })();
    if (!sharedStartedAtMs) return;

    const applyKey = `${battleId}:${sharedStartedAtMs}`;
    if (sharedClockAppliedRef.current === applyKey) return;
    sharedClockAppliedRef.current = applyKey;

    const elapsedMs = Math.max(0, Date.now() - sharedStartedAtMs);
    const elapsed = Math.floor(elapsedMs / 1000);
    const result = rpsResultForBattle(battleId);
    const sharedFirstDeck = deckParam(searchParams.get("firstDeck")) ?? result.firstDeck;
    const secondDeck: DeckKey = sharedFirstDeck === "A" ? "B" : "A";

    setBattleStartedAtMs(sharedStartedAtMs);
    setRpsChoices({ A: result.choiceA, B: result.choiceB });
    setRpsPressed({ A: true, B: true });
    setFirstDeck(sharedFirstDeck);
    resultRedirectArmedRef.current = false;
    setNoContestOpen(false);

    if (elapsed < HOOK_BATTLE_SECONDS) {
      completedDecksRef.current = { A: false, B: false };
      setPlayedDecks({ A: false, B: false });
      setCurrentDeck(sharedFirstDeck);
      setActiveDeck(null);
      setVoteOpen(true);
      setVoteCountdown(null);
      setBattlePhase("ready");
      resumeDeckOffsetRef.current = { deck: sharedFirstDeck, seconds: elapsed };
      autoStartedDecksRef.current = { A: false, B: false };
      return;
    }

    if (elapsed < SECOND_DECK_START_SECONDS) {
      completedDecksRef.current = {
        A: sharedFirstDeck === "A",
        B: sharedFirstDeck === "B",
      };
      setPlayedDecks({
        A: sharedFirstDeck === "A",
        B: sharedFirstDeck === "B",
      });
      setCurrentDeck(secondDeck);
      setActiveDeck(null);
      setVoteOpen(true);
      setVoteCountdown(null);
      queueScratchTransition(secondDeck, Math.max(0, SECOND_DECK_START_SECONDS * 1000 - elapsedMs));
      resumeDeckOffsetRef.current = null;
      autoStartedDecksRef.current = { A: false, B: false };
      return;
    }

    if (elapsed < BATTLE_PLAYBACK_SECONDS) {
      const offset = (elapsedMs - SECOND_DECK_START_SECONDS * 1000) / 1000;
      completedDecksRef.current = {
        A: sharedFirstDeck === "A",
        B: sharedFirstDeck === "B",
      };
      setPlayedDecks({
        A: sharedFirstDeck === "A",
        B: sharedFirstDeck === "B",
      });
      setCurrentDeck(secondDeck);
      setActiveDeck(null);
      setVoteOpen(true);
      setVoteCountdown(null);
      setBattlePhase("ready");
      resumeDeckOffsetRef.current = { deck: secondDeck, seconds: Math.max(0, offset) };
      autoStartedDecksRef.current = { A: false, B: false };
      return;
    }

    const finalVoteStartsAtMs = BATTLE_PLAYBACK_SECONDS * 1000 + FINAL_RESULT_CUE_DELAY_MS;
    completedDecksRef.current = { A: true, B: true };
    setPlayedDecks({ A: true, B: true });
    setCurrentDeck(null);
    setActiveDeck(null);
    setBattlePhase("final");

    if (elapsedMs < finalVoteStartsAtMs) {
      finalCountdownSeedRef.current = FINAL_VOTE_SECONDS;
      finalCountdownActiveRef.current = false;
      setVoteOpen(false);
      setVoteCountdown(null);
      return;
    }

    const remainingVoteSeconds = Math.max(
      0,
      Math.ceil((finalVoteStartsAtMs + FINAL_VOTE_SECONDS * 1000 - elapsedMs) / 1000),
    );
    if (remainingVoteSeconds > 0) {
      finalCountdownSeedRef.current = remainingVoteSeconds;
      finalCountdownActiveRef.current = false;
      setVoteOpen(true);
      setVoteCountdown(remainingVoteSeconds);
    } else {
      finalCountdownActiveRef.current = true;
      setVoteOpen(false);
      setVoteCountdown(0);
      pushResultForEveryone(950);
    }
  }, [battle, battleId, loading, pushResultForEveryone, queueScratchTransition, searchParams]);

  useEffect(() => {
    if (loading || !battle || !battleId || battle.arena_kind === "queue" || battlePhase !== "rps" || (rpsPressed.A && rpsPressed.B)) return;
    const cycle = window.setInterval(() => {
      setRpsChoices((prev) => ({
        A: rpsCycle[(rpsCycle.indexOf(prev.A as (typeof rpsCycle)[number]) + 1) % rpsCycle.length],
        B: rpsCycle[(rpsCycle.indexOf(prev.B as (typeof rpsCycle)[number]) + 2) % rpsCycle.length],
      }));
    }, RPS_CYCLE_MS);
    return () => window.clearInterval(cycle);
  }, [battle, battleId, battlePhase, loading, rpsPressed.A, rpsPressed.B]);

  useEffect(() => {
    if (loading || !battle || !battleId || battle.arena_kind === "queue" || battlePhase !== "rps" || !rpsPressed.A || !rpsPressed.B) return;
    const result = rpsResultForBattle(battleId);
    setRpsChoices({ A: result.choiceA, B: result.choiceB });
    const reveal = window.setTimeout(() => {
      beginBattleWithFirstDeck(result.firstDeck);
    }, 520);
    return () => window.clearTimeout(reveal);
  }, [battle, battleId, battlePhase, beginBattleWithFirstDeck, loading, rpsPressed.A, rpsPressed.B]);

  useEffect(() => {
    if (loading || !battle || !battleId || battle.arena_kind === "queue" || battlePhase !== "rps") return;
    if (rpsPressed.A === rpsPressed.B) return;
    const fallbackFirstDeck: DeckKey = rpsPressed.A ? "B" : "A";
    const timeout = window.setTimeout(() => {
      setRpsChoices((prev) => ({
        ...prev,
        [fallbackFirstDeck]: "⏱️",
      }));
      beginBattleWithFirstDeck(fallbackFirstDeck);
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [battle, battleId, battlePhase, beginBattleWithFirstDeck, loading, rpsPressed.A, rpsPressed.B]);

  useEffect(() => {
    if (!playedDecks.A || !playedDecks.B) return;
    if (finalCountdownActiveRef.current) return;

    finalCountdownActiveRef.current = true;
    const initialSeconds = Math.max(1, Math.min(FINAL_VOTE_SECONDS, Math.ceil(finalCountdownSeedRef.current)));
    finalCountdownSeedRef.current = FINAL_VOTE_SECONDS;
    setBattlePhase("final");
    setCurrentDeck(null);
    setActiveDeck(null);
    setVoteOpen(false);
    setVoteCountdown(null);

    let interval: number | null = null;
    const startCountdownTimer = window.setTimeout(() => {
      playWinnerCountdownSfx();
      setVoteOpen(true);
      setVoteCountdown(initialSeconds);

      interval = window.setInterval(() => {
        setVoteCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            if (interval != null) {
              window.clearInterval(interval);
              interval = null;
            }
            setVoteOpen(false);
            pushResultForEveryone(850);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, FINAL_RESULT_CUE_DELAY_MS);

    return () => {
      window.clearTimeout(startCountdownTimer);
      if (interval != null) window.clearInterval(interval);
    };
  }, [playedDecks.A, playedDecks.B, playWinnerCountdownSfx, pushResultForEveryone]);

  // ── 播放控制 ──────────────────────────────────────────
  const playDeck = useCallback((deck: DeckKey, restart: boolean, startAtSeconds = 0) => {
    const target = deck === "A" ? audioARef.current : audioBRef.current;
    const other = deck === "A" ? audioBRef.current : audioARef.current;
    other?.pause();
    if (pauseResumeTimerRef.current != null) {
      window.clearTimeout(pauseResumeTimerRef.current);
      pauseResumeTimerRef.current = null;
    }
    if (!target?.src) {
      completedDecksRef.current[deck] = true;
      markDeckPlayed(deck);
      setActiveDeck(null);
      return;
    }
    if (restart) {
      arenaEchoTriggeredRef.current[deck] = false;
      target.currentTime = Math.max(0, Math.min(HOOK_BATTLE_SECONDS - 0.25, startAtSeconds));
    }
    void target
      .play()
      .then(() => {
        setCurrentDeck(deck);
        setActiveDeck(deck);
        setBattlePhase("playing");
      })
      .catch(() => {
        setCurrentDeck(deck);
        setActiveDeck(null);
        setBattlePhase("ready");
      });
  }, [markDeckPlayed]);

  useEffect(() => {
    if (battlePhase !== "transition" || !transitionDeck || !transitionEndsAtMs) return;

    clearScratchTransitionMedia();
    const remainingMs = Math.max(0, transitionEndsAtMs - Date.now());
    const scratch = new Audio(SCRATCH_TRANSITION_SRC);
    scratch.preload = "auto";
    scratch.volume = 0.86;
    try {
      scratch.currentTime = Math.max(0, SCRATCH_TRANSITION_SECONDS - remainingMs / 1000);
    } catch {
      // Some browsers block seeking before metadata; timing still drives the deck swap.
    }
    scratchAudioRef.current = scratch;

    const updateCountdown = () => {
      const nextRemainingMs = Math.max(0, transitionEndsAtMs - Date.now());
      setTransitionSecondsLeft(Math.max(0, Math.ceil(nextRemainingMs / 1000)));
    };

    updateCountdown();
    scratchTransitionTickTimerRef.current = window.setInterval(updateCountdown, 120);
    scratchTransitionTimerRef.current = window.setTimeout(() => {
      clearScratchTransitionMedia();
      if (completedDecksRef.current[transitionDeck]) return;
      setTransitionDeck(null);
      setTransitionEndsAtMs(null);
      setTransitionSecondsLeft(SCRATCH_TRANSITION_SECONDS);
      setCurrentDeck(transitionDeck);
      autoStartedDecksRef.current[transitionDeck] = true;
      setBattlePhase("ready");
      playDeck(transitionDeck, true);
    }, remainingMs);

    void scratch.play().catch(() => undefined);

    return () => clearScratchTransitionMedia();
  }, [battlePhase, clearScratchTransitionMedia, playDeck, transitionDeck, transitionEndsAtMs]);

  const completeDeck = useCallback(
    (deck: DeckKey) => {
      if (completedDecksRef.current[deck]) return;
      completedDecksRef.current[deck] = true;
      const target = deck === "A" ? audioARef.current : audioBRef.current;
      triggerArenaEcho(deck);
      target?.pause();
      markDeckPlayed(deck);
      setActiveDeck((prev) => (prev === deck ? null : prev));

      const otherDeck: DeckKey = deck === "A" ? "B" : "A";
      if (!completedDecksRef.current[otherDeck]) {
        queueScratchTransition(otherDeck);
      } else {
        setCurrentDeck(null);
        setBattlePhase("final");
      }
    },
    [markDeckPlayed, queueScratchTransition, triggerArenaEcho],
  );

  const handleToggleDeck = useCallback(
    (deck: DeckKey) => {
      if (
        battlePhase === "rps" ||
        battlePhase === "transition" ||
        battlePhase === "final" ||
        deck !== currentDeck ||
        completedDecksRef.current[deck]
      ) {
        return;
      }
      const current = deck === "A" ? audioARef.current : audioBRef.current;
      if (!current?.src) {
        completeDeck(deck);
        return;
      }

      if (activeDeck === deck && battlePhase === "playing") {
        current.pause();
        setActiveDeck(null);
        setBattlePhase("paused");
        if (pauseResumeTimerRef.current != null) window.clearTimeout(pauseResumeTimerRef.current);
        pauseResumeTimerRef.current = window.setTimeout(() => {
          pauseResumeTimerRef.current = null;
          playDeck(deck, false);
        }, MAX_PAUSE_MS);
        return;
      }

      playDeck(deck, current.currentTime <= 0.05);
    },
    [activeDeck, battlePhase, completeDeck, currentDeck, playDeck],
  );

  const handleDeckTimeUpdate = useCallback(
    (deck: DeckKey) => {
      const current = deck === "A" ? audioARef.current : audioBRef.current;
      if (!current || completedDecksRef.current[deck]) return;
      const naturalDuration = Number.isFinite(current.duration) && current.duration > 0 ? current.duration : HOOK_BATTLE_SECONDS;
      const deckEndAt = Math.min(HOOK_BATTLE_SECONDS, naturalDuration);
      if (current.currentTime >= Math.max(0, deckEndAt - ARENA_ECHO_LEAD_SECONDS)) {
        triggerArenaEcho(deck);
      }
      if (current.currentTime >= deckEndAt) {
        current.currentTime = deckEndAt;
        completeDeck(deck);
      }
    },
    [completeDeck, triggerArenaEcho],
  );

  useEffect(() => {
    if (battlePhase !== "ready" || !currentDeck || completedDecksRef.current[currentDeck] || autoStartedDecksRef.current[currentDeck]) return;
    if (!audioUrls[currentDeck]) return;
    autoStartedDecksRef.current[currentDeck] = true;
    const resume = resumeDeckOffsetRef.current?.deck === currentDeck ? resumeDeckOffsetRef.current.seconds : 0;
    resumeDeckOffsetRef.current = null;
    const timer = window.setTimeout(() => playDeck(currentDeck, true, resume), 220);
    return () => window.clearTimeout(timer);
  }, [audioUrls, battlePhase, currentDeck, playDeck]);

  useEffect(() => {
    if (battlePhase !== "playing" || !activeDeck) {
      setAudioGlowLevel(0);
      return;
    }
    let frame = 0;
    const tick = () => {
      const audio = activeDeck === "A" ? audioARef.current : audioBRef.current;
      const t = audio?.currentTime ?? 0;
      const pulse = 0.32 + Math.abs(Math.sin(t * 8.5)) * 0.46 + Math.abs(Math.sin(t * 17.2)) * 0.22;
      setAudioGlowLevel(Math.min(1, pulse));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [activeDeck, battlePhase]);

  useEffect(() => {
    if (!isFinalPreStartCountdown || !battleId) return;
    const hypeKey = `${battleId}:${battle?.scheduled_start_at ?? battle?.started_at ?? battleStartedAtMs ?? "warmup"}`;
    if (finalPreStartHypeRef.current === hypeKey) return;
    finalPreStartHypeRef.current = hypeKey;
    playFinalPreStartHype();
  }, [
    battle?.scheduled_start_at,
    battle?.started_at,
    battleId,
    battleStartedAtMs,
    isFinalPreStartCountdown,
    playFinalPreStartHype,
  ]);

  const handleRpsPress = useCallback((deck: DeckKey) => {
    if (battlePhase !== "rps") return;
    setRpsPressed((prev) => ({ ...prev, [deck]: true }));
  }, [battlePhase]);

  const fireHypeReaction = useCallback((symbol: string, anchor: "left" | "center" | "right" = "center", broadcast = true) => {
    const id = `${symbol}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const baseX = anchor === "left" ? 24 : anchor === "right" ? 76 : 50;
    setReactionBursts((prev) => [
      ...prev.slice(-22),
      {
        id,
        symbol,
        x: Math.max(8, Math.min(92, baseX + Math.round((Math.random() - 0.5) * 18))),
        y: 18 + Math.round(Math.random() * 36),
        size: 26 + Math.round(Math.random() * 14),
      },
    ]);
    window.setTimeout(() => {
      setReactionBursts((prev) => prev.filter((reaction) => reaction.id !== id));
    }, 1850);
    if (broadcast) {
      void mockSyncChannelRef.current?.send({
        type: "broadcast",
        event: "reaction",
        payload: { symbol, anchor },
      });
    }
  }, []);

  const handleFeedbackTap = useCallback((deck: DeckKey, key: FeedbackKey, broadcast = true) => {
    if (!broadcast) {
      const meta = feedbackButtons.find((item) => item.key === key);
      const label = lang === "zh" ? meta?.zh : meta?.en;
      if (!label) return;
      setFeedbackCounts((prev) => ({
        ...prev,
        [deck]: {
          ...prev[deck],
          [key]: prev[deck][key] + 1,
        },
      }));
      fireDanmaku(label);
      fireHypeReaction(deck === "A" ? "❤️" : "👍", deck === "A" ? "left" : "right", false);
      return;
    }

    const isCurrentUserFighter = Boolean(
      myUserId && battle && (myUserId === battle.fighter_a_user_id || myUserId === battle.fighter_b_user_id),
    );
    const canTapFeedback = !isCurrentUserFighter && ["warmup", "rps", "playing", "transition", "vote", "ended"].includes(battlePhase);
    if (!canTapFeedback) return;

    const meta = feedbackButtons.find((item) => item.key === key);
    const label = lang === "zh" ? meta?.zh : meta?.en;
    if (!label) return;
    setFeedbackCounts((prev) => ({
      ...prev,
      [deck]: {
        ...prev[deck],
        [key]: prev[deck][key] + 1,
      },
    }));
    fireDanmaku(label);
    fireHypeReaction(deck === "A" ? "❤️" : "👍", deck === "A" ? "left" : "right", false);
    if (broadcast) {
      void mockSyncChannelRef.current?.send({
        type: "broadcast",
        event: "feedback",
        payload: { deck, key },
      });
    }
  }, [battle, battlePhase, fireDanmaku, fireHypeReaction, lang, myUserId]);

  function FeedbackBar({ deck, tone }: { deck: DeckKey; tone: "orange" | "blue" }) {
    const isCurrentUserFighter = Boolean(
      myUserId && battle && (myUserId === battle.fighter_a_user_id || myUserId === battle.fighter_b_user_id),
    );
    const activeForFeedback = !isCurrentUserFighter && ["warmup", "rps", "playing", "transition", "vote", "ended"].includes(battlePhase);
    const disabledReason = isCurrentUserFighter
      ? lang === "zh"
        ? "鬥歌者只能投最終票，不能按反應鈕"
        : "Fighters can only vote, not tap feedback"
      : !activeForFeedback
        ? lang === "zh"
          ? "觀眾進場後就可以按反應鈕"
          : "Listener Signal Is Live in the Arena"
        : "";
    const toneClass =
      tone === "orange"
        ? activeForFeedback
          ? "border-orange-300/45 bg-orange-500/[0.12] text-orange-100 hover:border-orange-200/80 hover:bg-orange-500/22"
          : "border-orange-300/12 bg-orange-500/[0.035] text-orange-100/45"
        : activeForFeedback
          ? "border-cyan-200/45 bg-cyan-400/[0.12] text-cyan-100 hover:border-cyan-100/80 hover:bg-cyan-400/22"
          : "border-cyan-200/12 bg-cyan-400/[0.035] text-cyan-100/45";
    const countClass = tone === "orange" ? "text-orange-200" : "text-cyan-100";
    return (
      <div className="mt-1 grid grid-cols-5 gap-1.5">
        {feedbackButtons.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={!activeForFeedback}
            onClick={() => handleFeedbackTap(deck, item.key)}
            aria-label={`${deck === "A" ? "A SIDE" : "B SIDE"} ${lang === "zh" ? item.zh : item.en}`}
            className={`min-h-9 rounded-xl border px-1.5 py-1.5 text-center text-[11px] font-black leading-tight transition active:scale-[0.96] disabled:cursor-not-allowed ${toneClass}`}
            title={activeForFeedback ? (lang === "zh" ? `送出${item.zh}彈幕` : `Send ${item.en} feedback`) : disabledReason}
          >
            <span className="block truncate">{lang === "zh" ? item.zh : item.en}</span>
            <span className={`mt-0.5 block font-mono text-[10px] ${countClass}`}>{feedbackCounts[deck][item.key]}</span>
          </button>
        ))}
      </div>
    );
  }

  useEffect(() => {
    if (!battleId) return;
    const channel = supabase
      .channel(`aipoger-battle-sync-${battleId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "chat" }, (payload) => {
        const message = (payload.payload as { message?: ChatMessage }).message;
        if (!message?.id || !message.content) return;
        fireDanmaku(message);
      })
      .on("broadcast", { event: "reaction" }, (payload) => {
        const data = payload.payload as { symbol?: string; anchor?: "left" | "center" | "right" };
        if (typeof data.symbol !== "string" || !hypeReactions.includes(data.symbol as (typeof hypeReactions)[number])) return;
        fireHypeReaction(data.symbol, data.anchor ?? "center", false);
      })
      .on("broadcast", { event: "feedback" }, (payload) => {
        const data = payload.payload as { deck?: DeckKey; key?: FeedbackKey };
        const feedbackKey = feedbackButtons.find((item) => item.key === data.key)?.key;
        if ((data.deck === "A" || data.deck === "B") && feedbackKey) {
          handleFeedbackTap(data.deck, feedbackKey, false);
        }
      })
      .on("broadcast", { event: "result-ready" }, (payload) => {
        const href = (payload.payload as { href?: unknown }).href;
        if (typeof href !== "string" || !href.startsWith("/battle/result")) return;
        pushResultForEveryone(120, false, href);
      })
      .subscribe();
    mockSyncChannelRef.current = channel;
    return () => {
      mockSyncChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [battleId, fireDanmaku, fireHypeReaction, handleFeedbackTap, pushResultForEveryone]);

  const readCurrentSessionUser = useCallback(async () => {
    if (battleId.startsWith("mock-") || isAuthBypassEnabled) return { id: myUserId || "mock-audience" };
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      if (!myUserId) setMyUserId(session.user.id);
      return { id: session.user.id };
    }
    return null;
  }, [battleId, myUserId]);

  const sendChatContent = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || !battleId) return;
    const actor = await readCurrentSessionUser();
    const actorUserId = actor?.id ?? (battleGuestId || getBattleGuestId());
    if (!battleGuestId && actorUserId.startsWith("guest-")) setBattleGuestId(actorUserId);

    const senderType: SenderType =
      actorUserId === battle?.fighter_a_user_id
        ? "fighter_a"
        : actorUserId === battle?.fighter_b_user_id
          ? "fighter_b"
          : "audience";
    const senderName =
      senderType === "fighter_a"
        ? battle?.fighter_a_name || myDisplayName
        : senderType === "fighter_b"
          ? battle?.fighter_b_name || myDisplayName
          : actorUserId.startsWith("guest-")
            ? battleGuestDisplayName(actorUserId)
            : myDisplayName;

    const localMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      battle_id: battleId,
      user_id: actorUserId,
      sender_type: senderType,
      content: trimmed,
      created_at: new Date().toISOString(),
      display_name: senderName || "AIPOGER 觀眾",
    };
    fireDanmaku(localMessage);

    if (battleId.startsWith("mock-") || isAuthBypassEnabled || battle?.arena_kind === "queue" || actorUserId.startsWith("guest-")) {
      void mockSyncChannelRef.current?.send({
        type: "broadcast",
        event: "chat",
        payload: { message: localMessage },
      });
      return;
    }

    await supabase.from("chat_messages").insert({
      battle_id: battleId,
      user_id: actorUserId,
      sender_type: senderType,
      content: trimmed,
    });
  }, [battle, battleGuestId, battleId, fireDanmaku, myDisplayName, readCurrentSessionUser]);

  // ── 發送訊息 ──────────────────────────────────────────
  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setChatInput("");
    await sendChatContent(trimmed);
  };

  // ── 投票 ──────────────────────────────────────────────
  const handleVote = async (target: "fighter_a" | "fighter_b") => {
    if (!voteOpen || !battleId) return;
    if (hasVoted === target) {
      return;
    }
    const actor = await readCurrentSessionUser();
    const previousVote = hasVoted;

    if (battleId.startsWith("mock-") || isAuthBypassEnabled) {
      setVotes((prev) => {
        const next = { ...prev };
        if (previousVote) next[previousVote] = Math.max(0, next[previousVote] - 1);
        next[target] += 1;
        return next;
      });
      setHasVoted(target);
      return;
    }

    if (!actor?.id) {
      const guestId = battleGuestId || getBattleGuestId();
      if (!battleGuestId) setBattleGuestId(guestId);
      const response = await fetch("/api/battle-pool/guest-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId, guestId, votedFor: target }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; counts?: { fighter_a: number; fighter_b: number } }
        | null;
      if (!response.ok) {
        alert(payload?.error ?? (lang === "zh" ? "投票失敗，請稍後再試。" : "Vote failed. Try again."));
        return;
      }
      if (payload?.counts) setVotes(payload.counts);
      setHasVoted(target);
      return;
    }

    const { error: voteError } = await supabase.rpc("cast_vote", {
      p_battle_id: battleId,
      p_voted_for: target,
    });

    if (voteError) {
      alert(voteError.message.includes("Not authenticated") ? "請先登入再投票" : voteError.message);
      return;
    }
    setHasVoted(target);
  };

  const handleFounderCancelChallenge = useCallback(async () => {
    if (!battle || !battleId || founderCancelBusy) return;
    setFounderCancelError(null);

    if (battle.fighter_a_user_id !== myUserId) return;
    if (battle.fighter_b_user_id) {
      const msg = lang === "zh" ? "已有人接受挑戰，無法取消" : "A challenger has already accepted this battle.";
      setFounderCancelError(msg);
      return;
    }
    if (battle.status === "cancelled_founder") return;

    const confirmed = window.confirm(lang === "zh" ? "確定要取消這場挑戰？取消後無法恢復。" : "Cancel this challenge? This cannot be undone.");
    if (!confirmed) return;

    setFounderCancelBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error(lang === "zh" ? "請先登入再取消挑戰。" : "Sign in before cancelling the challenge.");
      }

      if (battle.arena_kind === "queue") {
        await cancelCurrentBattleIntent({ accessToken: token, queueId: battle.id });
        setBattle((current) =>
          current?.id === battleId
            ? { ...current, status: "cancelled_founder", queue_status: "cancelled", cancellation_reason: "founder_manual" }
            : current,
        );
        return;
      }

      const response = await fetch("/api/battle-pool/cancel-founder-challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ battleId }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; notificationError?: string | null } | null;
      if (!response.ok) {
        throw new Error(payload?.error || (lang === "zh" ? "取消挑戰失敗。" : "Failed to cancel the challenge."));
      }

      if (payload?.notificationError) {
        console.warn("[battle founder cancel notification]", payload.notificationError);
      }
      setBattle((current) =>
        current?.id === battleId
          ? { ...current, status: "cancelled_founder", cancellation_reason: "founder_manual" }
          : current,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : lang === "zh" ? "取消挑戰失敗。" : "Failed to cancel the challenge.";
      setFounderCancelError(msg);
      alert(msg);
    } finally {
      setFounderCancelBusy(false);
    }
  }, [battle, battleId, founderCancelBusy, lang, myUserId]);

  useEffect(() => {
    const timer = window.setInterval(() => setRematchNowMs(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const href = battleResultHrefRef.current;
    const expiredClaim =
      rematchClaim?.status === "expired" ||
      (rematchClaim?.status === "open" &&
        rematchDeadlineSecondsLeft(rematchClaim.claimWindowEndsAt, rematchNowMs) <= 0);
    if (!href || !expiredClaim) return;
    const redirectKey = `${rematchClaim.claimId}:${href}`;
    if (rematchResultRedirectRef.current === redirectKey) return;
    rematchResultRedirectRef.current = redirectKey;
    router.push(href);
  }, [rematchClaim?.claimId, rematchClaim?.claimWindowEndsAt, rematchClaim?.status, rematchNowMs, router]);

  useEffect(() => {
    if (loading || !battle || battle.arena_kind === "queue" || !playedDecks.A || !playedDecks.B || voteOpen) return;
    if (battleId.startsWith("mock-") || isAuthBypassEnabled) return;
    const winnerSideForWindow = pick90sBattleWinner(votes, battleId, firstDeck);
    if (!winnerSideForWindow || votes.fighter_a + votes.fighter_b <= 0) return;
    const key = `${battleId}:${winnerSideForWindow}`;
    if (rematchOpenedBattleRef.current === key) return;
    rematchOpenedBattleRef.current = key;
    setRematchError(null);
    void openDropRematchWindowIntent({ battleId, winnerSide: winnerSideForWindow })
      .then((claim) => {
        setRematchClaim(claim);
        if (claim.nextBattleId) router.push(`/battle/${claim.nextBattleId}?lang=${lang}`);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        if (!/No valid rematch window|not found/i.test(message)) setRematchError(message);
      });
  }, [battle, battleId, firstDeck, lang, loading, playedDecks.A, playedDecks.B, router, voteOpen, votes]);

  useEffect(() => {
    if (!rematchClaim || !["open", "claimed"].includes(rematchClaim.status)) return;
    if (battleId.startsWith("mock-") || isAuthBypassEnabled) return;
    const timer = window.setInterval(() => {
      void openDropRematchWindowIntent({ battleId: rematchClaim.sourceBattleId, winnerSide: rematchClaim.winnerSide })
        .then((claim) => {
          setRematchClaim(claim);
          if (claim.nextBattleId) router.push(`/battle/${claim.nextBattleId}?lang=${lang}`);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          if (!/No valid rematch window|not found/i.test(message)) setRematchError(message);
        });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [battleId, lang, rematchClaim, router]);

  const handleClaimRematch = useCallback(async () => {
    if (!rematchClaim || rematchBusy) return;
    if (rematchClaim.winnerUserId === myUserId) {
      setRematchError(lang === "zh" ? "擂主不能挑戰自己。" : "The defender cannot challenge themself.");
      return;
    }
    setRematchBusy(true);
    setRematchError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        rememberAuthNextPath(currentReturnPath());
        router.push(`/auth?next=${encodeURIComponent(currentReturnPath())}`);
        return;
      }
      const result = await claimDropRematchIntent({
        accessToken,
        sourceBattleId: rematchClaim.sourceBattleId,
        lang,
      });
      setRematchClaim(result.claim);
      router.push(result.uploadUrl);
    } catch (err) {
      setRematchError(err instanceof Error ? err.message : String(err));
    } finally {
      setRematchBusy(false);
    }
  }, [lang, myUserId, rematchBusy, rematchClaim, router]);

  const totalVotes = votes.fighter_a + votes.fighter_b;
  const pctA = totalVotes > 0 ? Math.round((votes.fighter_a / totalVotes) * 100) : 50;
  const pctB = 100 - pctA;
  const battlePlaybackComplete = playedDecks.A && playedDecks.B;
  const showFinalVoteStats = battlePlaybackComplete && !voteOpen && !winnerRevealOpen;

  const vinylCoverA = useMemo(() => {
    if (!battle) return null;
    if (coverDisplayA) return coverDisplayA;
    const raw = battle.song_a_cover ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle, coverDisplayA]);

  const vinylCoverB = useMemo(() => {
    if (!battle) return null;
    if (coverDisplayB) return coverDisplayB;
    const raw = battle.song_b_cover ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle, coverDisplayB]);

  const vinylAvatarA = useMemo(() => {
    if (avatarDisplayA) return avatarDisplayA;
    const raw = battle?.fighter_a_avatar ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle?.fighter_a_avatar, avatarDisplayA]);

  const vinylAvatarB = useMemo(() => {
    if (avatarDisplayB) return avatarDisplayB;
    const raw = battle?.fighter_b_avatar ?? "";
    return raw && isHttpOrDataImageUrl(raw) ? raw : null;
  }, [battle?.fighter_b_avatar, avatarDisplayB]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-orange-400">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="mt-4 text-sm tracking-widest">{t("battle_loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !battle) {
    const errText = error?.startsWith("i18n:") ? t(error.slice(6)) : (error ?? t("battle_load_failed"));
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-400">
        <div className="text-center">
          <p className="text-2xl">⚠️ {errText}</p>
          <Link href="/" className="mt-6 inline-block rounded-xl border border-zinc-700 px-6 py-3 text-sm hover:border-orange-500">
            {t("battle_back_home_link")}
          </Link>
        </div>
      </div>
    );
  }

  if (isQueueArena && !isQueueChallengeOpen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-zinc-200">
        <div className="w-full max-w-xl rounded-[2rem] border border-orange-300/28 bg-black/72 p-7 text-center shadow-[0_0_70px_rgba(255,106,0,0.16)]">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-200/80">DROP BATTLE ARENA</p>
          <h1 className="mt-4 text-3xl font-black text-white">
            {lang === "zh" ? "這張戰帖已結束" : "This arena has ended"}
          </h1>
          <p className="mt-3 text-sm font-bold leading-7 text-zinc-400">
            {lang === "zh"
              ? "這個 Drop Battle 戰場已取消或過期。可以回鬥歌場開新戰帖。"
              : "This Drop Battle arena was cancelled or expired. Open a new card from the Battle page."}
          </p>
          <Link
            href={`/battle?lang=${lang}`}
            className="mt-6 inline-flex rounded-full bg-orange-500 px-6 py-3 text-sm font-black text-black transition hover:bg-orange-300"
          >
            {lang === "zh" ? "回鬥歌場" : "Back to Battle"}
          </Link>
        </div>
      </div>
    );
  }

  const lyricA = battle.lyrics_a?.trim() ?? "";
  const lyricB = battle.lyrics_b?.trim() ?? "";
  const currentUserSide: DeckKey | null =
    myUserId === battle.fighter_a_user_id ? "A" : myUserId === battle.fighter_b_user_id ? "B" : null;
  const isBattleFounder = Boolean(myUserId && myUserId === battle.fighter_a_user_id);
  const hasChallengerAccepted = Boolean(battle.fighter_b_user_id);
  const founderCancelDisabled =
    founderCancelBusy ||
    hasChallengerAccepted ||
    battle.status === "cancelled_founder" ||
    battle.status === "cancelled_no_challenger" ||
    battle.status === "finished" ||
    battle.status === "cancelled";
  const founderCancelTitle = hasChallengerAccepted
    ? lang === "zh"
      ? "已有人接受挑戰，無法取消"
      : "A challenger has already accepted this battle."
    : battle.status === "cancelled_founder"
      ? lang === "zh"
        ? "已取消"
        : "Cancelled"
      : undefined;
  const founderCancelLabel =
    battle.status === "cancelled_founder"
      ? lang === "zh"
        ? "已取消"
        : "Cancelled"
      : founderCancelBusy
        ? lang === "zh"
          ? "取消中..."
          : "Cancelling..."
        : lang === "zh"
          ? "取消挑戰"
          : "Cancel Challenge";
  const isMockBattle = battleId.startsWith("mock-");
  const canControlDeck = (deck: DeckKey) => isMockBattle || currentUserSide === deck;
  const currentFighterName = currentDeck === "A" ? battle.fighter_a_name : currentDeck === "B" ? battle.fighter_b_name : "";
  const firstFighterName = firstDeck === "A" ? battle.fighter_a_name : firstDeck === "B" ? battle.fighter_b_name : "";
  const preStartClock = (() => {
    const total = Math.max(0, preStartSecondsLeft ?? 0);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  })();
  const preStartTimeLabel = (() => {
    const scheduledStartMs = scheduledStartMsForBattle(battle);
    if (!scheduledStartMs) return "";
    return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : "en", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(scheduledStartMs));
  })();
  const voteStatusText = voteOpen
    ? battlePlaybackComplete
      ? `截止倒數 ${voteCountdown ?? FINAL_VOTE_SECONDS}`
      : "投票開放"
    : battlePlaybackComplete
      ? "投票截止"
      : lang === "zh"
        ? "投票尚未開放"
        : "Voting Not Open";
  const ritualStatusText =
    isArenaWarmup
      ? lang === "zh"
        ? isQueueArena
          ? `${preStartSecondsLeft && preStartSecondsLeft > 0 ? `開戰倒數 ${preStartClock}` : "鬥場暖場中"} · 可離開再回來`
          : `開戰倒數 ${preStartClock} · 先聽 5 秒預播`
        : isQueueArena
          ? `${preStartSecondsLeft && preStartSecondsLeft > 0 ? `Starts in ${preStartClock}` : "Arena Warmup"} · Re-Enter Anytime`
          : `Starts in ${preStartClock} · 5s previews open`
      : battlePhase === "rps"
      ? lang === "zh"
        ? rpsPressed.A || rpsPressed.B
          ? "等待另一位參賽者按下猜拳"
          : "請兩位參賽者同時按下猜拳"
        : rpsPressed.A || rpsPressed.B
          ? "Waiting for the Other Fighter"
          : "Both Fighters Press to Throw"
      : battlePhase === "ready"
        ? lang === "zh"
          ? `${currentFighterName || firstFighterName} 先攻 · 請按 PLAY`
          : `${currentFighterName || firstFighterName} starts · Tap PLAY`
        : battlePhase === "playing"
          ? lang === "zh"
            ? `${currentFighterName} Drop 播放中 · 最多 ${HOOK_BATTLE_SECONDS} 秒`
            : `${currentFighterName} Drop playing · max ${HOOK_BATTLE_SECONDS}s`
          : battlePhase === "paused"
            ? lang === "zh"
              ? "暫停最多 1 秒，馬上續播"
              : "Pause max 1s, resuming"
            : battlePhase === "transition"
              ? lang === "zh"
                ? `Scratch 過場 · ${transitionDeck === "A" ? battle.fighter_a_name : battle.fighter_b_name} 準備進場`
                : `Scratch transition · ${transitionDeck === "A" ? battle.fighter_a_name : battle.fighter_b_name} entering`
            : voteOpen
              ? lang === "zh"
                ? `剩最後 ${voteCountdown ?? FINAL_VOTE_SECONDS} 秒投票`
                : `${voteCountdown ?? FINAL_VOTE_SECONDS}s left to vote`
              : voteStatusText;
  const voteCenterText =
    showFinalVoteStats && totalVotes > 0
      ? `${voteStatusText} · ${t("battle_vote_total", { count: totalVotes })}`
      : `${ritualStatusText} · ${lang === "zh" ? "請依照音樂感動去最終投票支持" : "Final support should follow the feeling of the music."}`;
  const viewerBadge = (() => {
    if (viewerCount <= 1) {
      return (
        <span className="inline-flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.72)]" />
          {lang === "zh" ? "等待聽眾進場 · Bar 推播中" : "Waiting for Listeners · Bar Push Active"}
        </span>
      );
    }
    const parts = t("arena_viewers").split("{{n}}");
    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <span className="mx-0.5 font-semibold text-orange-300">{viewerCount}</span>
          {parts[1]}
        </>
      );
    }
    return t("arena_viewers", { n: viewerCount });
  })();
  const winnerRpcSide = pick90sBattleWinner(votes, battleId, firstDeck);
  const hasResultWinner = Boolean(winnerRpcSide);
  const winnerIsB = winnerRpcSide === "fighter_b";
  const winnerSide: DeckKey = winnerIsB ? "B" : "A";
  const winnerName = winnerIsB ? battle.fighter_b_name : battle.fighter_a_name;
  const winnerSong = winnerIsB ? battle.song_b_name : battle.song_a_name;
  const winnerRank = winnerIsB ? battle.fighter_b_rank : battle.fighter_a_rank;
  const winnerTool = winnerIsB ? battle.ai_tool_b : battle.ai_tool_a;
  const winnerCover = winnerIsB ? vinylCoverB : vinylCoverA;
  const winnerAvatar = winnerIsB ? vinylAvatarB : vinylAvatarA;
  const opponentName = winnerIsB ? battle.fighter_a_name : battle.fighter_b_name;
  const opponentSong = winnerIsB ? battle.song_a_name : battle.song_b_name;
  const opponentCover = winnerIsB ? vinylCoverA : vinylCoverB;
  const opponentAvatar = winnerIsB ? vinylAvatarA : vinylAvatarB;
  const battleResultHref = (() => {
    if (!winnerRpcSide) return "";
    const params = new URLSearchParams({
      winner: winnerName,
      song: winnerSong,
      opponent: opponentName,
      opponentSong,
      rank: winnerRank ?? "",
      tool: winnerTool ?? "AI Music",
      genre: battle.genre,
      battle: battleId.slice(0, 8).toUpperCase(),
      supportLeft: "72",
      supportRight: "28",
      finalVoteLeft: String(pctA),
      finalVoteRight: String(pctB),
      votesTotal: String(totalVotes),
      accuracy: String(Math.max(pctA, pctB)),
      feedbackA: JSON.stringify(feedbackCounts.A),
      feedbackB: JSON.stringify(feedbackCounts.B),
      battleId,
      winnerSide: winnerRpcSide,
    });
    if (winnerCover) params.set("coverUrl", winnerCover);
    if (winnerAvatar) params.set("avatarUrl", winnerAvatar);
    if (opponentCover) params.set("opponentCoverUrl", opponentCover);
    if (opponentAvatar) params.set("opponentAvatarUrl", opponentAvatar);
    return `/battle/result?${params.toString()}`;
  })();
  battleResultHrefRef.current = battleResultHref || null;

  const rematchClaimSecondsLeft = rematchDeadlineSecondsLeft(rematchClaim?.claimWindowEndsAt, rematchNowMs);
  const rematchUploadSecondsLeft = rematchDeadlineSecondsLeft(rematchClaim?.uploadDeadlineAt, rematchNowMs);
  const rematchOpenForClaim = rematchClaim?.status === "open" && rematchClaimSecondsLeft > 0;
  const rematchClaimed = rematchClaim?.status === "claimed" && rematchUploadSecondsLeft > 0;
  const rematchExpired = rematchClaim?.status === "expired" || (rematchClaim?.status === "open" && rematchClaimSecondsLeft <= 0);
  const rematchStatusTitle =
    rematchClaimed
      ? lang === "zh"
        ? "挑戰者準備中"
        : "Challenger Preparing"
      : rematchExpired
        ? lang === "zh"
          ? "守擂挑戰已截止"
          : "Rematch Closed"
        : lang === "zh"
          ? "有人要挑戰擂主嗎？"
          : "Who Wants the Defender?";
  const rematchStatusDesc =
    rematchClaimed
      ? lang === "zh"
        ? `擂主守擂中，挑戰者還有 ${rematchUploadSecondsLeft} 秒上傳 Drop。`
        : `The defender is holding the stage. Challenger has ${rematchUploadSecondsLeft}s to upload.`
      : rematchExpired
        ? lang === "zh"
          ? "沒有人接戰，這場 Battle 已結束。"
          : "No challenger claimed the slot. This Battle is complete."
        : lang === "zh"
          ? "第一個按下的人取得挑戰席，接著有 120 秒上傳 Drop。"
          : "First tap gets the slot, then 120 seconds to upload a Drop.";
  const rematchClaimDisabled =
    rematchBusy ||
    !rematchOpenForClaim ||
    (Boolean(myUserId) && myUserId === rematchClaim?.winnerUserId);

  const battleShareUrl = (() => {
    const params = new URLSearchParams({ lang });
    if (isQueueArena) {
      return `/battle/${encodeURIComponent(battleId)}?${params.toString()}`;
    }
    if (!isMockBattle && !isAuthBypassEnabled) {
      return `/battle/${encodeURIComponent(battleId)}?lang=${encodeURIComponent(lang)}`;
    }
    params.set("l", battle.fighter_a_name);
    params.set("r", battle.fighter_b_name);
    params.set("ls", battle.song_a_name);
    params.set("rs", battle.song_b_name);
    params.set("g", battle.genre);
    params.set("bt", "90s Drop Battle");
    if (battle.ai_tool_a) params.set("ta", battle.ai_tool_a);
    if (battle.ai_tool_b) params.set("tb", battle.ai_tool_b);
    if (battleStartedAtMs) params.set("s", String(battleStartedAtMs));
    if (firstDeck) params.set("fd", firstDeck);
    if (isMockBattle || isAuthBypassEnabled) {
      params.set("tool", battle.ai_tool_a || "AI Music");
    }
    return `/battle/invite/${encodeURIComponent(battleId)}?${params.toString()}`;
  })();
  const battleShareTitle = isQueueArena
    ? `${battle.fighter_a_name} 的 AIPOGER Drop Battle 戰場`
    : `${battle.fighter_a_name} VS ${battle.fighter_b_name} | AIPOGER Drop Battle`;
  const battleStartShareLine = preStartTimeLabel
    ? lang === "zh"
      ? `開戰時間: ${preStartTimeLabel}（台灣時間）。請大家提前進場。`
      : `Starts: ${preStartTimeLabel} Taiwan time. Please enter 1 minute early.`
    : lang === "zh"
      ? "請大家提前進場。"
      : "Please enter 1 minute early.";
  const battleShareText =
    lang === "zh"
      ? isQueueArena
        ? `${battle.fighter_a_name}的《${battle.song_a_name}》AIPOGER Drop Battle 戰帖已開。${battleStartShareLine}進來聊天預測支持誰的歌最熱血最動人，或是你來挑戰？Show me what you got!!!`
        : isPreBattle
        ? `${battle.fighter_a_name} 對上 ${battle.fighter_b_name}，已進 AIPOGER 鬥歌場倒數。${battleStartShareLine}進來先聽 5 秒預播，時間到開打！`
        : `${battle.fighter_a_name} 對上 ${battle.fighter_b_name}，正在 AIPOGER 鬥歌場開打。進來聽 Drop、投票、丟彈幕！`
      : isQueueArena
        ? `${battle.fighter_a_name}'s AIPOGER Drop Battle card is open. ${battleStartShareLine} Back the hottest, most moving Drop in chat, or step in and challenge. Show me what you got!!!`
        : isPreBattle
        ? `${battle.fighter_a_name} vs ${battle.fighter_b_name} is counting down on AIPOGER. ${battleStartShareLine} Hear the 5s previews before it starts.`
        : `${battle.fighter_a_name} vs ${battle.fighter_b_name} is LIVE on AIPOGER. Listen, vote, and make some noise.`;

  return (
    <div
      className={`${fontGlowSansBattle.className} relative flex h-screen min-h-screen flex-col overflow-hidden bg-black text-zinc-100 antialiased ${vinylDebugMode ? "pb-24" : ""}`}
    >
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_18%_16%,rgba(255,106,0,0.18),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(59,130,246,0.18),transparent_32%),linear-gradient(180deg,#020202_0%,#050505_44%,#0d0806_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div className="pointer-events-none absolute left-1/2 top-[6.5rem] h-px w-[70vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-400/70 to-transparent shadow-[0_0_48px_rgba(255,106,0,0.6)]" />
      {battlePhase === "transition" && (
        <div className="pointer-events-none absolute inset-0 z-[42] overflow-hidden bg-black/18">
          <div className="absolute top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/18 to-transparent blur-xl [animation:aipogerDeckSwapSweep_2s_ease-in-out_forwards]" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-100/60 to-transparent shadow-[0_0_42px_rgba(103,232,249,0.48)]" />
        </div>
      )}
      {renderPreBattleAd && adVideoPosition ? (
        <div className="pointer-events-none fixed inset-0 z-[44]">
          <div
            className={`pointer-events-auto overflow-hidden rounded-[1.15rem] border border-orange-100/24 bg-black/54 shadow-[0_24px_74px_rgba(0,0,0,0.52),0_0_42px_rgba(255,106,0,0.2)] backdrop-blur-xl transition-opacity duration-1000 ${
              showPreBattleAd ? "opacity-[0.82]" : "opacity-0"
            }`}
            style={{
              width: "min(calc(100vw - 2rem), 340px)",
              transform: `translate3d(${adVideoPosition.x}px, ${adVideoPosition.y}px, 0)`,
            }}
            onPointerMove={handleAdVideoDragMove}
            onPointerUp={handleAdVideoDragEnd}
            onPointerCancel={handleAdVideoDragEnd}
          >
            <div
              className="flex cursor-grab touch-none items-center justify-between gap-2 border-b border-white/10 bg-black/58 px-3 py-2 active:cursor-grabbing"
              onPointerDown={handleAdVideoDragStart}
            >
              <span className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-orange-100/84">
                {lang === "zh" ? "AIPOGER 浮空暖場" : "AIPOGER Warmup"}
              </span>
              <span className="rounded-full border border-white/14 bg-white/[0.06] px-2 py-0.5 text-[10px] font-black text-zinc-200">
                {lang === "zh" ? "拖動" : "Drag"}
              </span>
            </div>
            <div className="relative aspect-video bg-black">
              <video
                ref={adVideoRef}
                src={PRE_BATTLE_AD_VIDEO_SRC}
                autoPlay
                playsInline
                loop
                preload="auto"
                muted={adVideoMuted}
                onEnded={handleAdVideoEnded}
                className="h-full w-full object-contain opacity-[0.86]"
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,transparent,rgba(0,0,0,0.28)_76%)]" />
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setAdVideoMuted((value) => !value)}
                className="absolute bottom-2 right-2 rounded-full border border-white/16 bg-black/68 px-3 py-1 text-[10px] font-black text-white/86 backdrop-blur transition hover:border-orange-100 hover:text-white"
              >
                {adVideoMuted ? (lang === "zh" ? "開聲" : "Sound") : (lang === "zh" ? "靜音" : "Mute")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {battlePlaybackComplete && voteOpen && (
        <div className="pointer-events-none absolute inset-0 z-[95] flex items-center justify-center bg-black/28 backdrop-blur-[1px]">
          <div className="relative flex h-[min(54vw,430px)] w-[min(54vw,430px)] flex-col items-center justify-center rounded-full border border-yellow-200/40 bg-[radial-gradient(circle,rgba(255,191,74,0.18),rgba(0,0,0,0.72)_58%,rgba(0,0,0,0.08)_76%)] shadow-[0_0_90px_rgba(255,106,0,0.46),inset_0_0_80px_rgba(255,255,255,0.06)] [animation:aipogerVotePulse_1s_ease-in-out_infinite]">
            <div className="absolute inset-5 rounded-full border border-orange-300/20" />
            <div className="absolute inset-12 rounded-full border border-cyan-200/14" />
            <p className="text-[clamp(1rem,2.6vw,1.5rem)] font-black tracking-[0.32em] text-yellow-100 drop-shadow-[0_0_24px_rgba(255,214,120,0.56)]">
              {lang === "zh" ? "最後五秒鎖票" : "LAST 5 SECONDS"}
            </p>
            <p className="mt-1 bg-gradient-to-b from-white via-yellow-200 to-orange-500 bg-clip-text text-[clamp(7rem,18vw,12rem)] font-black leading-[0.86] text-transparent drop-shadow-[0_0_44px_rgba(255,106,0,0.82)]">
              {voteCountdown ?? FINAL_VOTE_SECONDS}
            </p>
            <p className="mt-3 rounded-full border border-yellow-200/40 bg-black/60 px-5 py-2 text-[clamp(0.95rem,2vw,1.25rem)] font-black tracking-[0.18em] text-yellow-100 shadow-[0_0_24px_rgba(255,214,120,0.22)]">
              {lang === "zh" ? "倒數結束就鎖票，依照音樂感動決定勝負" : "Voting locks when the countdown ends."}
            </p>
          </div>
        </div>
      )}
      {winnerRevealOpen && (
        <div className="pointer-events-none absolute inset-0 z-[98] flex items-center justify-center overflow-hidden bg-black/72 backdrop-blur-[2px]">
          <div className="absolute h-[min(98vw,760px)] w-[min(98vw,760px)] rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(255,214,120,0.34),transparent,rgba(103,232,249,0.22),transparent)] blur-sm [animation:aipogerWinnerRays_3s_linear_infinite]" />
          <div className="absolute h-[min(72vw,560px)] w-[min(72vw,560px)] rounded-full bg-[radial-gradient(circle,rgba(255,191,74,0.3),rgba(255,106,0,0.14)_38%,transparent_70%)] blur-xl" />
          <div className="relative flex w-[min(92vw,620px)] flex-col items-center px-5 py-6 text-center [animation:aipogerWinnerReveal_3s_ease-out_forwards]">
            <p className="rounded-full border border-yellow-200/50 bg-black/68 px-5 py-2 text-[clamp(0.78rem,2.2vw,1rem)] font-black uppercase tracking-[0.28em] text-yellow-100 shadow-[0_0_28px_rgba(250,204,21,0.24)]">
              {lang === "zh" ? "勝者揭曉" : "Winner Reveal"}
            </p>
            <div
              className={`relative mt-5 aspect-square w-[clamp(210px,42vw,360px)] overflow-hidden rounded-[1.8rem] border-2 shadow-[0_0_90px_rgba(255,106,0,0.42),0_0_130px_rgba(250,204,21,0.24)] [animation:aipogerWinnerCoverPulse_1.4s_ease-in-out_infinite] ${
                winnerSide === "B" ? "border-cyan-100/75" : "border-orange-200/75"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={winnerCover ?? VINYL_COVER_PLACEHOLDER}
                alt={winnerSong}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.24),transparent_34%),linear-gradient(180deg,transparent_42%,rgba(0,0,0,0.68)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-left">
                <p className="truncate text-[clamp(1rem,3.2vw,1.38rem)] font-black text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)]">
                  {winnerSong}
                </p>
                <p className="mt-1 text-[clamp(0.78rem,2vw,0.95rem)] font-bold text-yellow-100/86">
                  {winnerTool || "AI Music"}
                </p>
              </div>
            </div>
            <p className="mt-5 bg-gradient-to-b from-white via-yellow-100 to-orange-400 bg-clip-text text-[clamp(2.25rem,8vw,5.2rem)] font-black leading-none text-transparent drop-shadow-[0_0_42px_rgba(255,191,74,0.7)]">
              {winnerName}
            </p>
            <p className="mt-3 rounded-full border border-white/14 bg-black/60 px-5 py-2 text-[clamp(0.92rem,2.5vw,1.12rem)] font-black text-white/86">
              {lang === "zh" ? "成果卡產生中" : "Creating Result Card"}
            </p>
          </div>
        </div>
      )}
      {rematchClaim && battlePlaybackComplete && hasResultWinner && !winnerRevealOpen && !noContestOpen && (
        <div className="absolute inset-x-0 bottom-20 z-[97] flex justify-center px-4 md:bottom-8">
          <div className="w-[min(94vw,640px)] rounded-[1.4rem] border border-orange-200/28 bg-black/82 px-5 py-4 text-center shadow-[0_0_70px_rgba(255,106,0,0.22)] backdrop-blur-xl">
            <div className="flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-between md:text-left">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-orange-200/75">
                  {lang === "zh" ? "擂台熱鬥中" : "King of the Hill"}
                </p>
                <h2 className="mt-1 text-xl font-black text-white">{rematchStatusTitle}</h2>
                <p className="mt-1 text-sm font-bold leading-6 text-zinc-300">{rematchStatusDesc}</p>
                {rematchOpenForClaim && (
                  <p className="mt-1 text-xs font-black text-yellow-100">
                    {lang === "zh" ? `${rematchClaimSecondsLeft} 秒內搶挑戰席` : `${rematchClaimSecondsLeft}s to claim the slot`}
                  </p>
                )}
                {rematchError && <p className="mt-1 text-xs font-bold text-red-300">{rematchError}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleClaimRematch()}
                  disabled={rematchClaimDisabled}
                  className="rounded-full border border-orange-200/50 bg-orange-500 px-4 py-2 text-xs font-black text-black shadow-[0_0_24px_rgba(255,106,0,0.28)] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {rematchBusy
                    ? lang === "zh"
                      ? "搶席中"
                      : "Claiming"
                    : lang === "zh"
                      ? "我要挑戰擂主"
                      : "Challenge Defender"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {noContestOpen && (
        <div className="absolute inset-0 z-[98] flex items-center justify-center bg-black/76 px-5 text-center backdrop-blur-[2px]">
          <div className="w-[min(92vw,560px)] rounded-[1.8rem] border border-white/12 bg-black/72 px-6 py-7 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-400">NO CONTEST</p>
            <h2 className="mt-3 text-3xl font-black text-white">
              {lang === "zh" ? "本場沒有觀眾投票" : "No Audience Votes"}
            </h2>
            <p className="mt-3 text-sm font-bold leading-6 text-zinc-300">
              {lang === "zh"
                ? "0:0 不產生成果卡，也不進榮譽榜。請重新開戰帖或分享給觀眾進場投票。"
                : "A 0:0 battle does not create a result card or enter the honor board. Open another card or share the arena with listeners."}
            </p>
            <Link
              href={`/battle?lang=${lang}`}
              className="mt-5 inline-flex rounded-full border border-orange-300/45 bg-orange-500 px-5 py-3 text-sm font-black text-black transition hover:bg-orange-300"
            >
              {lang === "zh" ? "回鬥歌場" : "Back to Battle"}
            </Link>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-[4.8rem] z-[45] h-[54vh] overflow-hidden">
        {danmakuItems.map((item) => (
          <span
            key={item.id}
            className={`absolute whitespace-nowrap rounded-full border px-4 py-1.5 font-black backdrop-blur-sm ${item.colorClass}`}
            style={{
              top: `${item.lane * 13 + 4}%`,
              fontSize: `${item.sizeRem}rem`,
              animation: `aipogerDanmaku ${item.durationMs}ms linear forwards`,
            }}
          >
            {item.text}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
        {reactionBursts.map((reaction) => (
          <span
            key={reaction.id}
            className="absolute rounded-full border border-white/15 bg-black/68 px-3 py-2 shadow-[0_0_30px_rgba(255,106,0,0.32)]"
            style={{
              left: `${reaction.x}%`,
              bottom: `${reaction.y}%`,
              fontSize: `${reaction.size}px`,
              animation: "aipogerArenaReaction 1.85s ease-out forwards",
            }}
          >
            {reaction.symbol}
          </span>
        ))}
      </div>

      {/* 頂部：歌擂台｜Drop Battle 招牌｜語言 */}
      <header className="sticky top-0 z-30 grid grid-cols-3 items-center border-b border-white/10 bg-black/70 px-4 py-2.5 backdrop-blur-xl">
        <div className="min-w-0" />
        <div className="flex justify-center">
          <NextImage
            src="/hook-warfare-sign.svg"
            alt="Drop Battle"
            width={380}
            height={85}
            className="h-[clamp(36px,5.8vw,58px)] w-auto select-none drop-shadow-[0_0_24px_rgba(255,106,0,0.28)]"
            priority
          />
        </div>
        <div className="flex justify-end">
          <div className="flex items-center gap-2">
            <ShareButton
              title={battleShareTitle}
              text={battleShareText}
              url={battleShareUrl}
              label="分享"
              copiedLabel="已複製"
              className="hidden sm:inline-flex"
            />
            <ReportButton
              targetType="battle"
              targetId={battleId}
              targetTitle={`${battle.fighter_a_name} VS ${battle.fighter_b_name}`}
              targetUrl={battleShareUrl}
              context={`Battle arena status=${battle.status}; phase=${battlePhase}; A=${battle.song_a_name}; B=${battle.song_b_name}`}
              lang={lang}
              className="hidden sm:inline-flex"
            />
            <LangToggle variant="inline" />
          </div>
        </div>
      </header>

      {/* 擂台主體 */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-2 md:px-7">
        <section className="mx-auto grid w-full max-w-[1540px] shrink-0 items-start gap-y-3 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-7 lg:gap-y-0">
          {/* 左欄 */}
          <div className="order-2 flex flex-col self-start overflow-hidden rounded-[2rem] border border-orange-400/18 bg-black/45 px-4 pb-2 pt-3 shadow-[0_24px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:px-6 lg:order-none">
            <div className="-mx-4 -mt-3 mb-2 h-1 bg-gradient-to-r from-orange-500 via-orange-300 to-transparent md:-mx-6" />
            <VinylDisc
              side="left"
              fighterName={battle.fighter_a_name}
              rankLabel={battle.fighter_a_rank}
              songName={battle.song_a_name}
              coverUrl={vinylCoverA ?? VINYL_COVER_PLACEHOLDER}
              avatarUrl={vinylAvatarA}
              isPlaying={activeDeck === "A"}
              onToggle={() => handleToggleDeck("A")}
              onAvatarReact={() => fireHypeReaction("❤️", "left")}
              playDisabled={
                isArenaWarmup ||
                !canControlDeck("A") ||
                battlePhase === "rps" ||
                battlePhase === "transition" ||
                battlePhase === "final" ||
                currentDeck !== "A" ||
                playedDecks.A
              }
              playLabel={currentDeck === "A" && battlePhase === "paused" ? "RESUME" : currentDeck === "A" && firstDeck === "A" ? "START" : currentDeck === "A" ? "PLAY" : "WAIT"}
              color="#ff6a00"
              accent="orange"
              aiTool={battle.ai_tool_a}
              layoutNumbers={vinylLayout}
            />
            <FeedbackBar deck="A" tone="orange" />
            <div className="lyric-pitch-scroll lyric-pitch-scroll-orange mt-1.5 flex min-h-[58px] max-h-[78px] items-start justify-center overflow-y-auto whitespace-pre-wrap rounded-[1.05rem] bg-black/25 px-4 py-2 text-center text-[clamp(0.66rem,0.82vw,0.78rem)] font-semibold leading-[1.08] text-white/80 shadow-[inset_0_0_44px_rgba(255,255,255,0.022)] md:min-h-[66px] md:max-h-[88px]">
              {lyricA || t("battle_lyrics_empty")}
            </div>
            <div className="mt-1 flex flex-col gap-1 pb-0.5 pt-0.5">
              <div className="flex w-full justify-start pr-8">
                <VoteHeartButton
                  selected={hasVoted === "fighter_a"}
                  voteLocked={!voteOpen}
                  onVote={() => handleVote("fighter_a")}
                />
              </div>
              <p className="w-full text-[11px] font-black text-zinc-500">
                {showFinalVoteStats
                  ? t("battle_deck_vote_line", { n: votes.fighter_a })
                  : lang === "zh"
                    ? "投票請按愛心"
                    : "Vote With the Heart"}
              </p>
            </div>
          </div>

          {/* 中：LOGO + VS */}
          <div className="order-1 flex flex-col items-center justify-center gap-3 lg:order-none lg:w-[min(330px,23vw)]">
            <div className="relative flex min-h-[270px] w-full max-w-[320px] flex-col items-center justify-center overflow-visible px-4 py-4">
              <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_28%,rgba(255,106,0,0.2),transparent_36%)]" />
              <div
                className="pointer-events-none absolute top-6 h-[clamp(165px,18vw,250px)] w-[clamp(165px,18vw,250px)] rounded-full blur-2xl transition-[opacity,transform,box-shadow] duration-100"
                style={{
                  opacity: activeDeck ? 0.24 + audioGlowLevel * 0.55 : 0.12,
                  transform: `scale(${1 + audioGlowLevel * 0.16})`,
                  background:
                    activeDeck === "B"
                      ? "radial-gradient(circle, rgba(56,189,248,0.72), rgba(37,99,235,0.32) 42%, transparent 72%)"
                      : "radial-gradient(circle, rgba(251,191,36,0.78), rgba(249,115,22,0.32) 42%, transparent 72%)",
                }}
              />
              <div
                className="pointer-events-none absolute top-10 h-[clamp(135px,15vw,210px)] w-[clamp(135px,15vw,210px)] rounded-full border border-white/10 transition-opacity duration-100"
                style={{
                  opacity: activeDeck ? 0.25 + audioGlowLevel * 0.5 : 0,
                  boxShadow: activeDeck
                    ? `0 0 ${32 + audioGlowLevel * 60}px ${8 + audioGlowLevel * 18}px ${
                        activeDeck === "B" ? "rgba(56,189,248,0.34)" : "rgba(251,146,60,0.36)"
                      }`
                    : undefined,
                }}
              />
              <NextImage
                src={AIPOGER_BRAND_LOGO}
                alt="AIPOGER"
                width={320}
                height={320}
                className="relative h-[clamp(160px,18vw,240px)] w-[clamp(160px,18vw,240px)] select-none object-contain drop-shadow-[0_0_38px_rgba(255,255,255,0.22)]"
                priority
              />
              {isArenaWarmup ? (
                <div className="relative -mt-1 w-full rounded-[1.4rem] border border-orange-300/30 bg-black/62 px-4 py-4 text-center shadow-[0_0_44px_rgba(255,106,0,0.18)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-200/80">
                    {isQueueArena
                      ? lang === "zh"
                        ? "鬥場已開 · 可離開再回來"
                        : "Arena Open · Re-enter Anytime"
                      : lang === "zh"
                        ? "已進鬥場 · 等時間開打"
                        : "Arena Open · Battle Starts Soon"}
                  </p>
                  <p className="mt-2 bg-gradient-to-b from-white via-orange-200 to-orange-500 bg-clip-text text-[clamp(3.2rem,9vw,5.4rem)] font-black leading-none text-transparent drop-shadow-[0_0_34px_rgba(255,106,0,0.55)]">
                    {preStartClock}
                  </p>
                  {isFinalPreStartCountdown ? (
                    <div className="mx-auto mt-3 max-w-[17rem] rounded-2xl border border-red-100/70 bg-red-600 px-3 py-2 text-white shadow-[0_0_28px_rgba(220,38,38,0.34)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                        {lang === "zh" ? "最後倒數" : "Final Countdown"}
                      </p>
                      <p className="mt-1 text-3xl font-black leading-none">{preStartSecondsLeft}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                        Ladies & Gentlemen, Fighters!
                      </p>
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs font-bold leading-5 text-zinc-300">
                    {isQueueArena
                      ? lang === "zh"
                        ? `${preStartTimeLabel ? `${preStartTimeLabel} 開戰。` : ""}你可以在時間內出去再進來；挑戰者進場後會自動切入正式猜拳開打。`
                        : `${preStartTimeLabel ? `${preStartTimeLabel} start. ` : ""}Leave and re-enter before the time. When a rival joins, this arena switches into the formal throw.`
                      : lang === "zh"
                        ? `${preStartTimeLabel ? `${preStartTimeLabel} ` : ""}時間到自動開打。先分享戰帖，觀眾可進場聽雙方 5 秒預播。`
                        : `${preStartTimeLabel ? `${preStartTimeLabel} ` : ""}Auto-starts on time. Share the card and let listeners hear both 5s previews.`}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => playTeaser("A")}
                      disabled={!audioUrls.A}
                      className="rounded-2xl border border-red-200/70 bg-red-600 px-3 py-3 text-left text-white shadow-[0_0_24px_rgba(220,38,38,0.22)] transition hover:border-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <p className="truncate text-[11px] font-black text-white/82">{battle.fighter_a_name}</p>
                      <p className="mt-1 text-sm font-black tracking-[0.06em] text-white">
                        {teaserDeck === "A"
                          ? lang === "zh"
                            ? `預播中 ${teaserSecondsLeft}秒`
                            : `PREVIEW ${teaserSecondsLeft}s`
                          : lang === "zh"
                            ? "預播 5 秒"
                            : "PREVIEW 5S"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isQueueChallengeOpen && !isBattleFounder) {
                          router.push(`/battle/accept/${encodeURIComponent(battleId)}?lang=${lang}`);
                          return;
                        }
                        playTeaser("B");
                      }}
                      disabled={!isQueueChallengeOpen && !audioUrls.B}
                      className={`rounded-2xl border px-3 py-3 text-left text-white transition ${
                        isQueueChallengeOpen
                          ? "border-cyan-100/85 bg-cyan-400/22 shadow-[0_0_34px_rgba(103,232,249,0.38)] hover:border-white hover:bg-cyan-300/28"
                          : "border-red-200/70 bg-red-600 shadow-[0_0_24px_rgba(220,38,38,0.22)] hover:border-white hover:bg-red-500 disabled:cursor-not-allowed disabled:border-cyan-200/25 disabled:bg-cyan-400/10 disabled:text-cyan-50 disabled:opacity-55"
                      }`}
                    >
                      <p className="truncate text-[11px] font-black text-white/82">{battle.fighter_b_name}</p>
                      <p className="mt-1 text-sm font-black tracking-[0.06em] text-white">
                        {isQueueArena
                          ? lang === "zh"
                            ? isQueueChallengeOpen && !isBattleFounder
                              ? "點我挑戰"
                              : "等待挑戰者"
                            : isQueueChallengeOpen && !isBattleFounder
                              ? "CHALLENGE"
                              : "WAITING"
                          : teaserDeck === "B"
                            ? lang === "zh"
                              ? `預播中 ${teaserSecondsLeft}秒`
                              : `PREVIEW ${teaserSecondsLeft}s`
                            : lang === "zh"
                              ? "預播 5 秒"
                              : "PREVIEW 5S"}
                      </p>
                    </button>
                  </div>
                  <div className={`mt-3 grid gap-2 ${isBattleFounder || isQueueArena ? "sm:grid-cols-2" : ""}`}>
                    <ShareButton
                      title={battleShareTitle}
                      text={battleShareText}
                      url={battleShareUrl}
                      label={lang === "zh" ? "分享約人進場" : "Share Arena"}
                      copiedLabel={lang === "zh" ? "鬥場連結已複製" : "Arena Copied"}
                      className="w-full justify-center px-4 py-2.5 text-xs"
                    />
                    {isQueueChallengeOpen && !isBattleFounder ? (
                      <Link
                        href={`/battle/accept/${encodeURIComponent(battleId)}?lang=${lang}`}
                        className="rounded-full border border-orange-300/65 bg-orange-500 px-4 py-2.5 text-center text-xs font-black text-black shadow-[0_0_22px_rgba(255,106,0,0.22)] transition hover:bg-orange-300"
                      >
                        {lang === "zh" ? "我要接戰" : "Answer Battle"}
                      </Link>
                    ) : null}
                    {isBattleFounder ? (
                      <button
                        type="button"
                        onClick={() => void handleFounderCancelChallenge()}
                        disabled={founderCancelDisabled}
                        title={founderCancelTitle}
                        className={`rounded-full border px-4 py-2.5 text-xs font-black transition ${
                          battle.status === "cancelled_founder"
                            ? "cursor-not-allowed border-zinc-500/35 bg-zinc-600/10 text-zinc-400"
                            : "border-red-300/55 bg-red-500/10 text-red-100 hover:border-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:border-zinc-600/40 disabled:bg-zinc-700/12 disabled:text-zinc-500"
                        }`}
                      >
                        {founderCancelLabel}
                      </button>
                    ) : null}
                  </div>
                  {founderCancelError ? (
                    <p className="mt-2 rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-bold leading-5 text-red-100">
                      {founderCancelError}
                    </p>
                  ) : null}
                </div>
              ) : battlePhase === "rps" ? (
                <div className="relative -mt-1 w-full rounded-[1.4rem] border border-orange-300/25 bg-black/58 px-4 py-4 text-center shadow-[0_0_44px_rgba(255,106,0,0.16)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-200/80">
                    {lang === "zh" ? "猜拳決定先攻" : "First Play Ritual"}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-zinc-400">
                    {lang === "zh" ? "請兩位參賽者同時按，兩邊都出拳才揭曉。" : "Both fighters press. Result reveals after both throw."}
                  </p>
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRpsPress("A")}
                      disabled={rpsPressed.A || (!isMockBattle && currentUserSide !== "A")}
                      className="rounded-2xl border border-orange-300/25 bg-orange-500/10 px-2 py-3 transition hover:border-orange-200/70 hover:bg-orange-500/18 disabled:cursor-default disabled:opacity-75"
                    >
                      <p className="truncate text-[11px] font-black text-orange-100">{battle.fighter_a_name}</p>
                      <p className="mt-1 text-4xl leading-none">{rpsChoices.A}</p>
                      <p className="mt-2 text-[10px] font-black tracking-[0.16em] text-orange-200/80">
                        {rpsPressed.A ? (lang === "zh" ? "已出拳" : "LOCKED") : (lang === "zh" ? "按下出拳" : "PRESS")}
                      </p>
                    </button>
                    <span className="text-xl font-black text-zinc-500">VS</span>
                    <button
                      type="button"
                      onClick={() => handleRpsPress("B")}
                      disabled={rpsPressed.B || (!isMockBattle && currentUserSide !== "B")}
                      className="rounded-2xl border border-cyan-200/25 bg-cyan-500/10 px-2 py-3 transition hover:border-cyan-100/70 hover:bg-cyan-500/18 disabled:cursor-default disabled:opacity-75"
                    >
                      <p className="truncate text-[11px] font-black text-cyan-100">{battle.fighter_b_name}</p>
                      <p className="mt-1 text-4xl leading-none">{rpsChoices.B}</p>
                      <p className="mt-2 text-[10px] font-black tracking-[0.16em] text-cyan-100/80">
                        {rpsPressed.B ? (lang === "zh" ? "已出拳" : "LOCKED") : (lang === "zh" ? "按下出拳" : "PRESS")}
                      </p>
                    </button>
                  </div>
                </div>
              ) : battlePhase === "transition" ? (
                <div className="relative -mt-1 flex w-full flex-col items-center rounded-[1.4rem] border border-white/15 bg-black/64 px-4 py-4 text-center shadow-[0_0_48px_rgba(255,106,0,0.2),inset_0_0_44px_rgba(103,232,249,0.06)]">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.4rem]">
                    <div className="absolute inset-x-[-45%] top-1/2 h-7 -translate-y-1/2 rotate-[-10deg] bg-gradient-to-r from-transparent via-white/30 to-transparent blur-sm [animation:aipogerScratchFlash_0.42s_linear_infinite]" />
                  </div>
                  <p className="relative text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100/80">SCRATCH TRANSITION</p>
                  <p className="relative mt-2 bg-gradient-to-b from-white via-cyan-100 to-orange-400 bg-clip-text text-[clamp(2.4rem,6vw,4rem)] font-black leading-none text-transparent drop-shadow-[0_0_28px_rgba(103,232,249,0.38)]">
                    {transitionSecondsLeft || 1}
                  </p>
                  <p className="relative mt-2 text-sm font-black text-white">
                    {lang === "zh"
                      ? `${transitionDeck === "A" ? battle.fighter_a_name : battle.fighter_b_name} 下一首進場`
                      : `${transitionDeck === "A" ? battle.fighter_a_name : battle.fighter_b_name} enters next`}
                  </p>
                </div>
              ) : (
                <p
                  className="relative -mt-1 bg-gradient-to-b from-orange-100 via-orange-500 to-red-700 bg-clip-text text-[clamp(4.5rem,11.5vw,7rem)] font-black leading-none tracking-tight text-transparent drop-shadow-[0_0_34px_rgba(255,106,0,0.55)]"
                  style={{ WebkitTextStroke: "1px rgba(255,190,120,0.18)" }}
                >
                  VS
                </p>
              )}
              <p className="relative mt-2 rounded-full border border-orange-400/20 bg-black/40 px-3 py-1.5 text-[12px] text-orange-300">
                {voteCenterText}
              </p>
              <p className="relative mt-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-center text-[11px] text-zinc-300 shadow-[0_0_22px_rgba(255,106,0,0.08)]">
                {viewerBadge}
              </p>
              <div className="relative mt-2 flex items-center justify-center gap-2">
                {hypeReactions.map((reaction) => (
                  <button
                    key={reaction}
                    type="button"
                    onClick={() => fireHypeReaction(reaction)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] transition hover:border-orange-200/55 hover:bg-orange-400/15"
                    aria-label={lang === "zh" ? `送出 ${reaction}` : `Send ${reaction}`}
                  >
                    {reaction}
                  </button>
                ))}
              </div>
              {battlePlaybackComplete && !voteOpen && hasResultWinner && battleResultHref && (
                <Link
                  href={battleResultHref}
                  className="relative mt-3 inline-flex items-center justify-center rounded-full border border-orange-300/45 bg-orange-500 px-4 py-2 text-[12px] font-black tracking-[0.12em] text-black shadow-[0_0_24px_rgba(255,106,0,0.24)] transition hover:bg-orange-300"
                >
                  生成成果卡
                </Link>
              )}
            </div>
          </div>

          {/* 右欄 */}
          <div className="order-3 flex flex-col self-start overflow-hidden rounded-[2rem] border border-blue-400/18 bg-black/45 px-4 pb-2 pt-3 shadow-[0_24px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:px-6">
            <div className="-mx-4 -mt-3 mb-2 h-1 bg-gradient-to-l from-blue-500 via-cyan-300 to-transparent md:-mx-6" />
            <VinylDisc
              side="right"
              fighterName={battle.fighter_b_name}
              rankLabel={battle.fighter_b_rank}
              songName={battle.song_b_name}
              coverUrl={vinylCoverB ?? VINYL_COVER_PLACEHOLDER}
              avatarUrl={vinylAvatarB}
              isPlaying={activeDeck === "B"}
              onToggle={() => handleToggleDeck("B")}
              onAvatarReact={() => fireHypeReaction("👍", "right")}
              playDisabled={
                isArenaWarmup ||
                !canControlDeck("B") ||
                battlePhase === "rps" ||
                battlePhase === "transition" ||
                battlePhase === "final" ||
                currentDeck !== "B" ||
                playedDecks.B
              }
              playLabel={currentDeck === "B" && battlePhase === "paused" ? "RESUME" : currentDeck === "B" && firstDeck === "B" ? "START" : currentDeck === "B" ? "PLAY" : "WAIT"}
              color="#3b82f6"
              accent="blue"
              aiTool={battle.ai_tool_b}
              layoutNumbers={vinylLayout}
            />
            <FeedbackBar deck="B" tone="blue" />
            <div className="lyric-pitch-scroll lyric-pitch-scroll-blue mt-1.5 flex min-h-[58px] max-h-[78px] items-start justify-center overflow-y-auto whitespace-pre-wrap rounded-[1.05rem] bg-black/25 px-4 py-2 text-center text-[clamp(0.66rem,0.82vw,0.78rem)] font-semibold leading-[1.08] text-white/80 shadow-[inset_0_0_44px_rgba(255,255,255,0.022)] md:min-h-[66px] md:max-h-[88px]">
              {lyricB || t("battle_lyrics_empty")}
            </div>
            <div className="mt-1 flex flex-col gap-1 pb-0.5 pt-0.5">
              <div className="flex w-full justify-end pl-8">
                <VoteHeartButton
                  selected={hasVoted === "fighter_b"}
                  voteLocked={!voteOpen}
                  onVote={() => handleVote("fighter_b")}
                />
              </div>
              <p className="w-full text-right text-[11px] font-black text-zinc-500">
                {showFinalVoteStats
                  ? t("battle_deck_vote_line", { n: votes.fighter_b })
                  : lang === "zh"
                    ? "投票請按愛心"
                    : "Vote With the Heart"}
              </p>
            </div>
          </div>
        </section>

        {/* 彈幕輸入：留言送出後會橫向跑過整個 Battle 畫面 */}
        <section className="fixed bottom-3 left-3 right-3 z-[120] mx-auto w-[calc(100%-1.5rem)] max-w-[1120px] rounded-full border-2 border-yellow-300/75 bg-black/84 px-2 py-2 shadow-[0_16px_64px_rgba(0,0,0,0.52),0_0_32px_rgba(250,204,21,0.2)] backdrop-blur-xl md:bottom-4">
          <div className="flex items-center gap-2">
            <span className="hidden shrink-0 pl-3 text-[10px] font-black tracking-[0.18em] text-yellow-200/80 sm:inline">
              {lang === "zh" ? "全場彈幕" : "Arena Danmaku"}
            </span>
            <span className="rounded-full border border-yellow-200/30 bg-yellow-300/10 px-2 py-1 text-[10px] font-black text-yellow-100">
              {lang === "zh" ? "彈幕開啟" : "Danmaku On"}
            </span>
            <div className="flex max-w-[9.6rem] shrink-0 items-center gap-1 overflow-x-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:max-w-none">
              {QUICK_DANMAKU_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => void sendChatContent(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-lg transition hover:border-yellow-200/70 hover:bg-yellow-300/15"
                  aria-label={`${lang === "zh" ? "送出" : "Send"} ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <form className="flex min-w-0 flex-1 gap-2" onSubmit={handleSend}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t("chat_placeholder")}
                maxLength={200}
                className="min-w-0 flex-1 rounded-full border border-yellow-300/45 bg-black/72 px-4 py-3 text-sm font-bold text-zinc-100 placeholder:text-zinc-500 focus:border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-300/30"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-40 sm:px-6"
              >
                {t("chat_send")}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* 隱藏音檔 */}
      <audio
        ref={audioARef}
        src={audioUrls.A ?? undefined}
        onTimeUpdate={() => handleDeckTimeUpdate("A")}
        onEnded={() => completeDeck("A")}
      />
      <audio
        ref={audioBRef}
        src={audioUrls.B ?? undefined}
        onTimeUpdate={() => handleDeckTimeUpdate("B")}
        onEnded={() => completeDeck("B")}
      />

      <style>{`
        @keyframes aipogerDanmaku {
          0% { transform: translateX(104vw); }
          100% { transform: translateX(-120vw); }
        }
        @keyframes aipogerArenaReaction {
          0% { opacity: 0; transform: translate3d(-50%, 22px, 0) scale(0.82); }
          12% { opacity: 1; }
          100% { opacity: 0; transform: translate3d(-50%, -170px, 0) scale(1.28); }
        }
        @keyframes aipogerDeckSwapSweep {
          0% { opacity: 0; transform: translateX(-80vw) skewX(-14deg); }
          18% { opacity: 1; }
          100% { opacity: 0; transform: translateX(130vw) skewX(-14deg); }
        }
        @keyframes aipogerScratchFlash {
          0% { opacity: 0.18; transform: translateX(-18%) rotate(-10deg) scaleX(0.82); }
          45% { opacity: 0.92; transform: translateX(8%) rotate(-10deg) scaleX(1.08); }
          100% { opacity: 0.22; transform: translateX(24%) rotate(-10deg) scaleX(0.88); }
        }
        @keyframes aipogerVotePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }
        @keyframes aipogerWinnerReveal {
          0% { opacity: 0; transform: translateY(26px) scale(0.88); filter: blur(10px); }
          18% { opacity: 1; transform: translateY(0) scale(1.02); filter: blur(0); }
          78% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-18px) scale(1.04); filter: blur(4px); }
        }
        @keyframes aipogerWinnerRays {
          0% { transform: rotate(0deg) scale(0.92); opacity: 0.35; }
          50% { transform: rotate(180deg) scale(1.05); opacity: 0.78; }
          100% { transform: rotate(360deg) scale(0.96); opacity: 0.35; }
        }
        @keyframes aipogerWinnerCoverPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.035); }
        }
        .lyric-pitch-scroll {
          scrollbar-width: thin;
        }
        .lyric-pitch-scroll-orange {
          scrollbar-color: rgba(249,115,22,0.92) rgba(255,255,255,0.06);
        }
        .lyric-pitch-scroll-blue {
          scrollbar-color: rgba(56,189,248,0.92) rgba(255,255,255,0.06);
        }
        .lyric-pitch-scroll::-webkit-scrollbar {
          width: 18px;
        }
        .lyric-pitch-scroll::-webkit-scrollbar-track {
          border-radius: 999px;
          background:
            linear-gradient(90deg, transparent 0 7px, rgba(255,255,255,0.18) 7px 8px, transparent 8px),
            rgba(255,255,255,0.04);
        }
        .lyric-pitch-scroll::-webkit-scrollbar-thumb {
          border: 5px solid transparent;
          border-radius: 999px;
          background-clip: content-box;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22);
        }
        .lyric-pitch-scroll-orange::-webkit-scrollbar-thumb {
          background-color: rgba(249,115,22,0.94);
        }
        .lyric-pitch-scroll-blue::-webkit-scrollbar-thumb {
          background-color: rgba(56,189,248,0.94);
        }
      `}</style>

      {vinylDebugMode ? (
        <VinylDebugPanel
          open={vinylDebugOpen}
          onToggleOpen={() => setVinylDebugOpen((o) => !o)}
          values={vinylLayout}
          onChange={setVinylLayout}
        />
      ) : null}
    </div>
  );
}

// ─── Page export（只負責 Suspense 包裝）───────────────────

function BattleArenaSuspenseFallback() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-orange-400 text-sm tracking-widest">
      {t("common_loading")}
    </div>
  );
}

export default function BattleArenaPage() {
  return (
    <>
      <Suspense fallback={<BattleArenaSuspenseFallback />}>
        <BattleArenaContent />
      </Suspense>
      <DebugPanel vars={vinylVars} />
    </>
  );
}

// ─── Debug Panel ────────────────────────────────────────────
function DebugPanel({ vars }: { vars: Record<string, string> }) {
  const [isDebug, setIsDebug] = useState(false);
  const [vals, setVals] = useState(vars);

  useEffect(() => {
    setIsDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  if (!isDebug) return null;

  const cssVars = Object.entries(vals)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");

  return (
    <div
      style={{ all: "initial" } as React.CSSProperties}
      className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 border-t border-orange-500 p-4 font-mono text-white"
    >
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-xs text-orange-400">🎛 ARENA DEBUG — 調整完告訴 Mavis 固化</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(vars).map(([key]) => (
            <label key={key} className="flex flex-col text-[11px]">
              <span className="text-zinc-400">{key.replace("--", "")}</span>
              <input
                type="range"
                min={key.includes("size") || key.includes("-size") ? 80 : 0}
                max={key.includes("size") || key.includes("-size") ? 350 : 200}
                value={parseInt(vals[key]) || 0}
                onChange={(e) => setVals((v) => ({ ...v, [key]: e.target.value + "px" }))}
                className="w-full accent-orange-500"
              />
              <span className="text-zinc-600">{vals[key]}</span>
            </label>
          ))}
        </div>
        <p className="mt-3 break-all text-[10px] text-zinc-500">{cssVars}</p>
      </div>
    </div>
  );
}
