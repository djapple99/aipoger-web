import { AIPOGER_BRAND_LOGO } from "@/lib/brand";
import { AIPOGER_PERSONAL_RANK, isAipogerIdentity } from "@/lib/battle-pool-rules";
import { supabase } from "@/lib/supabase";

export const LISTEN_BAR_AUDIO_BUCKET = "listen-bar-audio";
export const LISTEN_BAR_COVER_BUCKET = "listen-bar-covers";
export const AIPOGER_CURATOR_RANK = "";
export const LISTEN_BAR_CHALLENGER_SLOT_LIMIT = 3;
export const LISTEN_BAR_PUBLIC_REACTION_THRESHOLD = 1;
export const LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD = 30;
export const LISTEN_BAR_PUBLIC_ROTATION_LIMIT = 88;
export const LISTEN_BAR_TOTAL_ROTATION_LIMIT = 100;
export const LISTEN_BAR_CHALLENGER_HOURLY_LIMIT = 8;
export const LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS = 24;
export const LISTEN_BAR_JUDGMENT_INTERVAL_HOURS = 8;
export const LISTEN_BAR_JUDGMENT_PROMOTION_LIMIT = 8;
export const LISTEN_BAR_PUBLIC_EVICTION_LIMIT = 3;
export const DEFAULT_LISTEN_BAR_COVER = AIPOGER_BRAND_LOGO;

export type ListenBarTrack = {
  id: string;
  title: string;
  artist: string;
  tool: string;
  mood: string;
  duration: number;
  audioUrl?: string;
  coverUrl?: string;
  lyrics?: string;
  queuedBy: string;
  queuedByRank?: string;
  source: "official" | "community";
  barPhase?: "challenger" | "public";
  positiveReactionCount?: number;
  createdAt?: string;
  promotedAt?: string;
};

export type ListenBarTrackRow = {
  id: string;
  title: string;
  artist: string;
  ai_tool: string | null;
  genre: string | null;
  mood: string | null;
  bpm: number | null;
  duration_seconds: number | null;
  audio_path: string | null;
  cover_path: string | null;
  audio_sha256?: string | null;
  lyrics: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  source?: "official" | "community" | null;
  is_featured_official?: boolean | null;
  bar_phase?: "challenger" | "public" | null;
  positive_reaction_count?: number | null;
  heart_count?: number | null;
  star_count?: number | null;
  thumb_count?: number | null;
  happy_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  promoted_at?: string | null;
};

export const fallbackOfficialPlaylist: ListenBarTrack[] = [
  {
    id: "official-home-bgm",
    title: "我整天都想起肖",
    artist: "AIPOGER",
    tool: "Suno",
    mood: "官方輪播",
    duration: 52,
    audioUrl: "/music/home-bgm.mp3",
    queuedBy: "AIPOGER",
    queuedByRank: AIPOGER_CURATOR_RANK,
    coverUrl: DEFAULT_LISTEN_BAR_COVER,
    source: "official",
  },
];

function publicStorageUrl(bucket: string, path: string | null | undefined): string | undefined {
  const value = path?.trim();
  if (!value) return undefined;
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  return supabase.storage.from(bucket).getPublicUrl(value).data.publicUrl;
}

function displayAlbumOrMood(value: string | null | undefined) {
  const cleanValue = value
    ?.replace(/^官方公播\s*\/\s*/i, "")
    .replace(/^AIPOGER\s*官方公播\s*\/\s*/i, "")
    .trim();
  if (!cleanValue || cleanValue === "創作者投稿" || cleanValue === "Creator submission") return cleanValue || "";
  return cleanValue ? `專輯名稱 / ${cleanValue}` : "";
}

export function listenBarRowToTrack(row: ListenBarTrackRow): ListenBarTrack | null {
  const audioUrl = publicStorageUrl(LISTEN_BAR_AUDIO_BUCKET, row.audio_path);
  if (!audioUrl) return null;

  const tags = [row.genre, displayAlbumOrMood(row.mood)].filter(Boolean);
  if (typeof row.bpm === "number" && row.bpm > 0) tags.push(`${row.bpm} BPM`);
  const source = row.is_featured_official || row.source === "official" ? "official" : "community";
  const queuedBy = row.artist?.trim() || (source === "official" ? "AIPOGER" : "創作者");
  const queuedByRank = source === "official" ? undefined : isAipogerIdentity(queuedBy) ? AIPOGER_PERSONAL_RANK : "創作者投稿";
  const barPhase = row.bar_phase === "public" ? "public" : "challenger";

  return {
    id: row.id,
    title: row.title?.trim() || "AIPOGER Rotation",
    artist: row.artist?.trim() || "AIPOGER",
    tool: row.ai_tool?.trim() || "AI Music",
    mood: tags.join(" / ") || "官方輪播",
    duration: Math.max(1, Math.round(row.duration_seconds ?? 45)),
    audioUrl,
    coverUrl: publicStorageUrl(LISTEN_BAR_COVER_BUCKET, row.cover_path) ?? DEFAULT_LISTEN_BAR_COVER,
    lyrics: row.lyrics?.trim() || undefined,
    queuedBy,
    queuedByRank,
    source,
    barPhase: source === "community" ? barPhase : undefined,
    positiveReactionCount: Math.max(0, Math.round(row.positive_reaction_count ?? 0)),
    createdAt: row.created_at ?? undefined,
    promotedAt: row.promoted_at ?? undefined,
  };
}
