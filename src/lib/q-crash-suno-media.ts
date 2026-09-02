import { normalizeQCrashSunoUrl } from "./q-crash-rules.ts";

const SUNO_TRACK_ID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const SUNO_TRACK_ID_REGEX = new RegExp(`(?:^|/)song/(${SUNO_TRACK_ID_PATTERN})(?:$|[/?#])`, "i");
const SUNO_MP4_REGEX = new RegExp(`https://cdn1\\.suno\\.ai/(${SUNO_TRACK_ID_PATTERN})\\.mp4`, "i");

function directTrackId(value: string) {
  const match = value.match(SUNO_TRACK_ID_REGEX);
  return match?.[1] ?? null;
}

function trackIdFromPublicPage(html: string) {
  const normalizedHtml = html
    .replaceAll("\\/", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\u002f", "/");
  const match = normalizedHtml.match(SUNO_MP4_REGEX);
  return match?.[1] ?? null;
}

export function qCrashSunoPlaybackUrl(trackId: string | null | undefined) {
  if (!trackId || !new RegExp(`^${SUNO_TRACK_ID_PATTERN}$`, "i").test(trackId)) return null;
  return `https://cdn1.suno.ai/${trackId}.mp4`;
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
