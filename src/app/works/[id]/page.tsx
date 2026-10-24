import { notFound } from "next/navigation";
import Link from "next/link";
import EditorialHeader from "@/components/editorial-header";
import SeoJsonLd from "@/components/seo-json-ld";
import { readPublicWorkDetail } from "@/lib/server-home-discovery";
import { requestLang } from "@/lib/server-public-locale";
import { workMetadata } from "@/lib/server-work-seo";
import { publicUrl } from "@/lib/public-seo";
import { homeCopy } from "@/lib/home-copy";
import { albumCopy } from "@/lib/album-copy";
import { readPublicAlbums } from "@/lib/server-albums";
import AlbumView from "@/components/album-view";
import WorkClient from "./work-client";

export const preferredRegion = "hnd1";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> };
export async function generateMetadata({ params, searchParams }: Props) {
  const { id } = await params; const lang = await requestLang((await searchParams).lang);
  const detail = await readPublicWorkDetail(id);
  if (!detail) return { title: "AIPOGER", robots: { index: false } };
  const { work } = detail;
  return workMetadata(work, lang);
}
export default async function WorkPage({ params, searchParams }: Props) {
  const { id } = await params; const lang = await requestLang((await searchParams).lang);
  const detail = await readPublicWorkDetail(id); if (!detail) notFound();
  const { work, externalMedia } = detail;
  const albums = work.workKind === "album" ? await readPublicAlbums(id) : null;
  if (albums && !albums.length) notFound();
  return <main className="min-h-screen bg-[#050505] pb-28 text-zinc-100"><EditorialHeader active={work.videoId ? "mv" : "explore"} returnPath={`/works/${id}`} />
    <article className="mx-auto w-full max-w-[880px] space-y-5 px-4 pt-8">
      <Link className="inline-block min-h-11 text-sm text-orange-200" href={work.videoId ? `/mv?lang=${lang}` : `/ai-music?lang=${lang}`}>← {work.videoId ? "MV" : homeCopy(lang).allMusic}</Link>
      <header className="space-y-3"><p className="text-xs uppercase tracking-widest text-orange-300">{work.workKind === "album" ? albumCopy(lang).label : work.genre}</p>
        <h1 id="public-work-title" className="break-words text-3xl font-bold leading-snug md:text-5xl">{work.title}</h1><p className="text-lg text-zinc-300">{work.artist}</p>
        {work.description ? <p className="max-w-3xl whitespace-pre-line text-base leading-8 text-zinc-400">{work.description}</p> : null}</header>
      {albums ? <AlbumView initialId={id} initialAlbums={albums} /> : <WorkClient work={work} externalMedia={externalMedia} />}
      <SeoJsonLd data={{ "@context": "https://schema.org", "@type": work.workKind === "album" ? "MusicAlbum" : "MusicRecording",
        name: work.title, byArtist: { name: work.artist }, description: work.description,
        url: publicUrl(`/works/${id}`, lang), genre: work.genre, ...(work.coverUrl ? { image: work.coverUrl } : {}) }} />
    </article></main>;
}
