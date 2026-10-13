export type ExternalMusic = {
  provider: "youtube" | "suno" | "spotify";
  mediaId: string;
  url: string;
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseExternalMusic(value: unknown): ExternalMusic | null {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" || u.username || u.password || u.port)
      return null;
    const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
    const p = u.pathname.split("/").filter(Boolean);
    if (["youtube.com", "music.youtube.com", "youtu.be"].includes(host)) {
      const id =
        host === "youtu.be"
          ? p[0]
          : p[0] === "watch"
            ? u.searchParams.get("v")
            : ["shorts", "embed", "live"].includes(p[0])
              ? p[1]
              : null;
      return id && /^[\w-]{11}$/.test(id)
        ? {
            provider: "youtube",
            mediaId: id,
            url: `https://www.youtube.com/watch?v=${id}`,
          }
        : null;
    }
    if (host === "suno.com" && p[0] === "song" && uuid.test(p[1] ?? "")) {
      const id = p[1].toLowerCase();
      return {
        provider: "suno",
        mediaId: id,
        url: `https://suno.com/song/${id}`,
      };
    }
    const parts = p[0]?.startsWith("intl-") ? p.slice(1) : p;
    if (
      host === "open.spotify.com" &&
      parts[0] === "track" &&
      /^[A-Za-z0-9]{22}$/.test(parts[1] ?? "")
    ) {
      return {
        provider: "spotify",
        mediaId: parts[1],
        url: `https://open.spotify.com/track/${parts[1]}`,
      };
    }
  } catch {
    /* invalid URL */
  }
  return null;
}
export function externalMusicFromRow(row: {
  external_url?: string | null;
}): ExternalMusic | null {
  return parseExternalMusic(row.external_url);
}
export function externalEmbedUrl(media: ExternalMusic) {
  return media.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${media.mediaId}?enablejsapi=1&rel=0`
    : media.provider === "suno"
      ? `https://suno.com/embed/${media.mediaId}`
      : `https://open.spotify.com/embed/track/${media.mediaId}`;
}
