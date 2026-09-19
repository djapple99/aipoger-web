import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { choicePublicPath } from "@/lib/aipoger-choice";
import { creatorChoicePublicPath } from "@/lib/creator-choice";
import { publicSiteUrl } from "@/lib/site-url";

const siteUrl = publicSiteUrl();
const SUPPORTED_LANGS = ["zh", "en", "ja", "ko"] as const;
const INFO_LANGS = ["zh", "en"] as const;

type PublicChoiceRow = {
  id: string;
  week_start: string | null;
};

function localizedRoutes(path: string, langs: readonly string[], priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]): MetadataRoute.Sitemap {
  return langs.map((lang) => ({
    url: `${siteUrl}${path}?lang=${lang}`,
    changeFrequency,
    priority,
  }));
}

async function loadPublishedChoiceUrls(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [officialResult, creatorResult] = await Promise.all([
    admin
      .from("aipoger_choice_collections")
      .select("id,week_start")
      .eq("is_published", true)
      .order("week_start", { ascending: false })
      .limit(500),
    admin
      .from("aipoger_creator_choice_collections")
      .select("id,week_start")
      .eq("is_published", true)
      .order("week_start", { ascending: false })
      .limit(500),
  ]);

  if (officialResult.error) throw officialResult.error;
  if (creatorResult.error) throw creatorResult.error;

  const officialUrls = ((officialResult.data ?? []) as PublicChoiceRow[]).map((row) => ({
    url: `${siteUrl}${choicePublicPath(row.id, "official")}&lang=zh`,
    lastModified: parseDate(row.week_start),
    changeFrequency: "weekly" as const,
    priority: 0.78,
  }));
  const creatorUrls = ((creatorResult.data ?? []) as PublicChoiceRow[]).map((row) => ({
    url: `${siteUrl}${creatorChoicePublicPath(row.id)}?lang=zh`,
    lastModified: parseDate(row.week_start),
    changeFrequency: "weekly" as const,
    priority: 0.72,
  }));

  return [...officialUrls, ...creatorUrls].filter((entry) => entry.url);
}

function parseDate(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, priority: 1, changeFrequency: "daily" },
    ...localizedRoutes("/ai-music", SUPPORTED_LANGS, 0.95, "hourly"),
    ...localizedRoutes("/listen-bar", SUPPORTED_LANGS, 0.9, "hourly"),
    ...localizedRoutes("/battle", SUPPORTED_LANGS, 0.82, "daily"),
    ...localizedRoutes("/rank", SUPPORTED_LANGS, 0.8, "daily"),
    ...localizedRoutes("/ai-music-bible", SUPPORTED_LANGS, 0.78, "weekly"),
    ...localizedRoutes("/drop-guide", INFO_LANGS, 0.76, "weekly"),
    ...localizedRoutes("/about", INFO_LANGS, 0.55, "monthly"),
    ...localizedRoutes("/partners", INFO_LANGS, 0.5, "monthly"),
    { url: `${siteUrl}/earworm`, priority: 0.62, changeFrequency: "weekly" },
  ];

  try {
    return [...routes, ...(await loadPublishedChoiceUrls())];
  } catch (error) {
    console.error("[sitemap] Failed to load published Choice URLs", error);
    return routes;
  }
}
