export const preferredRegion = "hnd1";
import { readPublicMusic } from "@/lib/server-public-music";
import type { Metadata } from "next";
import { readPublicAlbums } from "@/lib/server-albums";
import { notFound } from "next/navigation";
import { homeCopy } from "@/lib/home-copy";
import { requestLang } from "@/lib/server-public-locale";
import { publicMetadata } from "@/lib/public-seo";
import { readPublicWorkDetail } from "@/lib/server-home-discovery";
import { workMetadata } from "@/lib/server-work-seo";
import { albumCopy } from "@/lib/album-copy";
import AiMusicClient from "./ai-music-client";

type PageProps = { searchParams: Promise<{ lang?: string; album?: string; view?: string; track?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams; const lang = await requestLang(query.lang); const id = query.track || query.album;
  if (id) {
    const detail = await readPublicWorkDetail(id);
    if (!detail) return { robots: { index: false } };
    return workMetadata(detail.work, lang);
  }
  const title = { zh: "探索音樂｜AIPOGER", en: "Explore Music | AIPOGER", ja: "音楽を探す｜AIPOGER", ko: "음악 탐색 | AIPOGER" }[lang];
  return publicMetadata({ path: "/ai-music", lang, title: query.view === "albums" ? `${albumCopy(lang).albums}｜AIPOGER` : title,
    description: query.view === "albums" ? albumCopy(lang).intro : homeCopy(lang).metaDescription,
    params: query.view === "albums" ? { view: "albums" } : undefined });
}

export default async function AiMusicPage({ searchParams }: PageProps) {
  const query = await searchParams; const lang = await requestLang(query.lang); const id = query.track || query.album;
  const detail = id ? await readPublicWorkDetail(id) : null;
  if (id && !detail) notFound();
  const album = query.album || (detail?.work.workKind === "album" ? id : null);
  const view = album || query.view === "albums" ? "albums" : "genre";
  const [rows, allAlbums] = await Promise.all([readPublicMusic(), view === "albums" ? readPublicAlbums() : Promise.resolve(undefined)]);
  if (album && allAlbums && !allAlbums.some(item => item.id === album)) allAlbums.unshift(...await readPublicAlbums(album));
  return <AiMusicClient initialAlbums={allAlbums} initialRows={rows} initialLang={lang} initialView={view} initialAlbumId={album ?? null} />;
}
