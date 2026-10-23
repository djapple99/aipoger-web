import "server-only";
import { readMvDiscovery } from "./server-home-discovery";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function loadMvShareMetadata(trackId: string) {
  if (!UUID.test(trackId)) return null;
  // Use the same public catalog as the gallery; hidden or removed works never leak.
  const { works } = await readMvDiscovery();
  const work = works.find(item => item.id === trackId);
  if (!work?.videoId || !/^[a-zA-Z0-9_-]{11}$/.test(work.videoId)) return null;

  const base = `https://i.ytimg.com/vi/${work.videoId}`;
  const candidates = [
    { url: `${base}/maxresdefault.jpg`, width: 1280, height: 720 },
    { url: `${base}/sddefault.jpg`, width: 640, height: 480 },
  ];
  // A missing high-resolution thumbnail is a 404 image. Social crawlers cannot
  // run WorkImage's browser fallback, so select an available cover on the server.
  for (const image of candidates) {
    try {
      const response = await fetch(image.url, {
        method: "HEAD", redirect: "error", signal: AbortSignal.timeout(2000),
      });
      if (response.ok && response.headers.get("content-type")?.startsWith("image/")) {
        return { id: work.id, title: work.title, artist: work.artist, description: work.description, image };
      }
    } catch { /* Try the next thumbnail; keep sharing available during an outage. */ }
  }
  return {
    id: work.id, title: work.title, artist: work.artist, description: work.description,
    image: { url: `${base}/hqdefault.jpg`, width: 480, height: 360 },
  };
}
