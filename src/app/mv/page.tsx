export const preferredRegion = "hnd1";
import { readMvDiscovery } from "@/lib/server-home-discovery";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requestLang } from "@/lib/server-public-locale";
import { publicMetadata } from "@/lib/public-seo";
import { readPublicWorkDetail } from "@/lib/server-home-discovery";
import { workMetadata } from "@/lib/server-work-seo";
import MvGallery from "@/components/mv-gallery";
import { mvCopy } from "@/lib/mv-copy";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string; track?: string }> }): Promise<Metadata> {
  const query = await searchParams; const lang = await requestLang(query.lang);
  if (query.track) {
    const detail = await readPublicWorkDetail(query.track);
    if (!detail?.work.videoId) return { robots: { index: false } };
    return workMetadata(detail.work, lang);
  }
  const copy = mvCopy(lang);
  return publicMetadata({ path: "/mv", lang, title: copy.metaTitle, description: copy.metaDescription });
}

export default async function MvPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const query = await searchParams;
  if (query.track && !(await readPublicWorkDetail(query.track))?.work.videoId) notFound();
  return <MvGallery initialData={await readMvDiscovery()} />;
}
