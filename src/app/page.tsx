export const preferredRegion = "hnd1";
import { publicMetadata } from "@/lib/public-seo";
import { readHomeDiscovery } from "@/lib/server-home-discovery";
import type { Metadata } from "next";
import { headers } from "next/headers";
import HomeEditorial from "@/components/home-editorial";
import { homeCopy } from "@/lib/home-copy";
import { isSupportedLang } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const requested = (await headers()).get("x-aipoger-lang");
  const lang = isSupportedLang(requested) ? requested : "zh";
  const copy = homeCopy(lang);
  const title = copy.metaTitle;
  const description = copy.metaDescription;
  return publicMetadata({ path: "/", lang, title, description });
}

export default async function HomePage() {
  const data = await readHomeDiscovery();
  return <HomeEditorial initialData={data} />;
}
