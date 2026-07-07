const ACCEPTED_YOUTUBE_HOSTS = new Set(["youtube.com", "music.youtube.com", "youtu.be"]);

export function normalizeYouTubeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 300) throw new Error("YouTube MV 連結太長。");

  const urlText = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    throw new Error("請貼上有效的 YouTube MV 連結。");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("YouTube MV 連結必須是 http 或 https。");
  }
  if (!ACCEPTED_YOUTUBE_HOSTS.has(host)) {
    throw new Error("目前只接受 YouTube MV 連結。");
  }
  if (host === "music.youtube.com") {
    url.hostname = "youtube.com";
  }

  return url.toString();
}
