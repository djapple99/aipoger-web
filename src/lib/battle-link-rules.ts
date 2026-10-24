import { parseExternalMusic } from "./external-music.ts";

export type DropPlaybackMode = "60" | "90" | "full" | "legacy45";
export type BattleLinkPlayback = { type: "suno" | "youtube" | "upload"; url: string; start: number; seconds: number; sourceSeconds?: number; durationOrigin?: "server" | "embedded_player" };
export function dropPlaybackMode(value: unknown): DropPlaybackMode | null {
  return value === "60" || value === "90" || value === "full" || value === "legacy45" ? value : null;
}
export function dropModeLabel(mode: unknown, lang = "zh") {
  return mode === "full" ? ({ zh: "整首 Battle", en: "Full song", ja: "フル楽曲", ko: "전체 곡" }[lang] ?? "Full song")
    : `${mode === "90" ? 90 : mode === "legacy45" ? 45 : 60}${lang === "zh" ? " 秒" : lang === "ja" ? " 秒" : lang === "ko" ? "초" : "s"}`;
}
export function battleClip(mode: DropPlaybackMode, duration: number, startValue: unknown) {
  const start = Number(startValue ?? 0);
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(start) || start < 0) return null;
  if (mode === "full") return { start: 0, seconds: duration };
  const seconds = mode === "legacy45" ? Math.min(45, duration) : Number(mode);
  if (duration + 0.1 < seconds || start + seconds > duration + 0.1) return null;
  return { start: Math.round(start * 1000) / 1000, seconds };
}
export function playbackAudioUrl(playback?: BattleLinkPlayback | null) {
  if (!playback) return null;
  if (playback.type === "suno") return `/api/q-crash/suno-playback?source=${encodeURIComponent(playback.url)}`;
  return playback.type === "upload" ? playback.url : null;
}
export function playbackYouTubeId(playback?: BattleLinkPlayback | null) {
  const media = playback?.type === "youtube" ? parseExternalMusic(playback.url) : null;
  return media?.provider === "youtube" ? media.mediaId : null;
}
export function battlePlaybackSeconds(battle: { playback_a?: BattleLinkPlayback | null; playback_b?: BattleLinkPlayback | null }) {
  const a = Number(battle.playback_a?.seconds), b = Number(battle.playback_b?.seconds);
  return a > 0 && b > 0 ? a + b + 3 : 93;
}
export function publicWorkIdFromLink(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || !["aipoger.com", "www.aipoger.com"].includes(u.hostname) || u.username || u.password || u.port) return null;
    const id = u.pathname.match(/^\/works\/([0-9a-f-]{36})\/?$/i)?.[1] ?? (["/ai-music", "/mv"].includes(u.pathname) ? u.searchParams.get("track") : null);
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id.toLowerCase() : null;
  } catch { return null; }
}
