import { normalizeQCrashSunoUrl } from "./q-crash-rules.ts";

const SUNO_TRACK_ID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const SUNO_TRACK_ID_REGEX = new RegExp(`(?:^|/)song/(${SUNO_TRACK_ID_PATTERN})(?:$|[/?#])`, "i");
const SUNO_MP4_REGEX = new RegExp(`https://cdn1\\.suno\\.ai/(${SUNO_TRACK_ID_PATTERN})\\.mp4`, "i");
const SUNO_MEDIA_REGEX = /https?:\/\/[^"'<>\\\s]+\.(?:m4a|mp4|mp3|webm)(?:\?[^"'<>\\\s]*)?/gi;
const SUNO_MEDIA_HOSTS = new Set([
  "cdn1.suno.ai",
  "cdn-o.suno.com",
  "d2lwuy8qc234o3.cloudfront.net",
]);

export type QCrashSunoMediaSource = {
  trackId: string;
  url: string;
  encrypted: boolean;
};

function directTrackId(value: string) {
  const match = value.match(SUNO_TRACK_ID_REGEX);
  return match?.[1] ?? null;
}

function trackIdFromPublicPage(html: string) {
  const normalizedHtml = normalizePublicPageHtml(html);
  const match = normalizedHtml.match(SUNO_MP4_REGEX);
  return match?.[1] ?? null;
}

function normalizePublicPageHtml(html: string) {
  return html
    .replaceAll("\\/", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\u002f", "/")
    .replaceAll("\\u0026", "&");
}

function safeSunoMediaUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !SUNO_MEDIA_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function mediaSourcesFromPublicPage(html: string, fallbackTrackId: string | null) {
  const normalizedHtml = normalizePublicPageHtml(html);
  const candidates = Array.from(normalizedHtml.matchAll(SUNO_MEDIA_REGEX), (match) => safeSunoMediaUrl(match[0]))
    .filter((value): value is string => Boolean(value));
  const uniqueCandidates = Array.from(new Set(candidates));
  const trackId = directTrackId(normalizedHtml) ?? fallbackTrackId;
  const orderedCandidates = [
    ...uniqueCandidates.filter((url) => trackId && url.toLowerCase().includes(trackId.toLowerCase())),
    ...uniqueCandidates.filter((url) => !trackId || !url.toLowerCase().includes(trackId.toLowerCase())),
  ].filter((url) => !/\/sil-100\.mp3(?:$|[?#])/i.test(url));
  return {
    trackId,
    sources: orderedCandidates.map((url) => ({
      trackId: trackId ?? "",
      url,
      encrypted: new URL(url).hostname === "d2lwuy8qc234o3.cloudfront.net" && /\.m4a(?:$|[?#])/i.test(new URL(url).pathname),
    })),
  };
}

export function qCrashSunoPlaybackUrl(trackId: string | null | undefined) {
  if (!trackId || !new RegExp(`^${SUNO_TRACK_ID_PATTERN}$`, "i").test(trackId)) return null;
  return `https://cdn1.suno.ai/${trackId}.mp4`;
}

export function qCrashSunoInAppPlaybackUrl(sourceUrl: unknown) {
  const normalized = normalizeQCrashSunoUrl(sourceUrl);
  return normalized ? `/api/q-crash/suno-playback?source=${encodeURIComponent(normalized)}` : null;
}

/**
 * Resolve the media source exposed to Suno's public web player.
 * Newer public songs expose an encrypted m4a and must be decrypted just in time
 * by the in-app playback route; older songs may still expose a direct MP4.
 */
export async function resolveQCrashSunoMediaSource(value: unknown): Promise<QCrashSunoMediaSource | null> {
  const sourceUrl = normalizeQCrashSunoUrl(value);
  if (!sourceUrl) return null;

  const inlineTrackId = directTrackId(sourceUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "AIPOGER Q Crash media resolver" },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    const redirectedTrackId = directTrackId(response.url) ?? inlineTrackId;
    if (!response.ok) return null;

    const page = mediaSourcesFromPublicPage(await response.text(), redirectedTrackId);
    const source = page.sources[0];
    if (source && page.trackId) return { ...source, trackId: page.trackId };
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolve the public media URL currently exposed by a Suno song page.
 * This reads page metadata for short links; it never downloads or stores audio.
 */
export async function resolveQCrashSunoPlaybackUrl(value: unknown): Promise<string | null> {
  const sourceUrl = normalizeQCrashSunoUrl(value);
  if (!sourceUrl) return null;

  const inlineTrackId = directTrackId(sourceUrl);
  const inlineUrl = qCrashSunoPlaybackUrl(inlineTrackId);
  if (inlineUrl) return inlineUrl;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(sourceUrl, {
      headers: { "User-Agent": "AIPOGER Q Crash media resolver" },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    // Suno short links normally redirect to /song/<uuid>. The final URL is
    // the reliable source of the track ID even when the public page is
    // returned with a bot-check or omits its JSON metadata.
    const redirectedTrackId = directTrackId(response.url);
    const redirectedUrl = qCrashSunoPlaybackUrl(redirectedTrackId);
    if (redirectedUrl) return redirectedUrl;
    if (!response.ok) return null;
    const html = await response.text();
    return qCrashSunoPlaybackUrl(trackIdFromPublicPage(html));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
