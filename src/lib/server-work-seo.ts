import "server-only";
import type { HomeWork } from "@/lib/home-discovery";
import type { Lang } from "@/lib/locale";
import { publicMetadata, publicUrl } from "@/lib/public-seo";
import { choiceCoverVersion } from "@/lib/choice-share";
import { canRenderShareCover } from "@/lib/share-cover-source";
export function workMetadata(work: HomeWork, lang: Lang) {
  const rawImage = work.coverUrl || publicUrl("/aipoger-og-card-20260522.png", lang);
  const render = Boolean(work.videoId) || canRenderShareCover(rawImage);
  return publicMetadata({ path: `/works/${work.id}`, lang, title: `${work.title} — ${work.artist}｜AIPOGER`,
    description: work.description || `${work.title} · ${work.artist} · ${work.genre}`,
    image: render ? { url: `/works/${work.id}/opengraph-image?v=${choiceCoverVersion(`${work.videoId ?? ""}:${rawImage}`)}`, width: 1200, height: 630, type: "image/jpeg", alt: `${work.title} — ${work.artist}` }
      : { url: rawImage, alt: `${work.title} — ${work.artist}` } });
}
