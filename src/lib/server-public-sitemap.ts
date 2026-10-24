import "server-only";
import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { readAllHomePages } from "@/lib/home-discovery";
import { readPublicWorkIndex } from "@/lib/server-home-discovery";
import { readPublicAlbums } from "@/lib/server-albums";
import { readPublicBattles } from "@/lib/server-public-battles";
import { BIBLE_PUBLIC_SLUGS } from "@/lib/bible-public-articles";
import { PUBLIC_LANGS, publicUrl, publicAlternates } from "@/lib/public-seo";

// Runtime generation avoids freezing the catalog at build time. Only the public
// URL index is cached; page HTML still checks current publication/moderation.
function localized(path: string, params: Record<string, string> = {}): MetadataRoute.Sitemap {
  return PUBLIC_LANGS.map(lang => ({ url: publicUrl(path, lang, params), alternates: { languages: publicAlternates(path, lang, params)?.languages as Record<string, string> } }));
}
const buildSitemap = unstable_cache(async (): Promise<MetadataRoute.Sitemap> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("Public index configuration unavailable");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [works, official, creators, battles] = await Promise.all([
    readPublicWorkIndex(),
    readAllHomePages<{ id: string; updated_at?: string }>((from, to) => admin.from("aipoger_choice_collections").select("id,updated_at").eq("is_published", true).order("id").range(from, to)),
    readAllHomePages<{ id: string; updated_at?: string }>((from, to) => admin.from("aipoger_creator_choice_collections").select("id,updated_at").eq("is_published", true).order("id").range(from, to)),
    readPublicBattles(),
  ]);
  const validWorks = await Promise.all(works.map(async work => work.workKind !== "album" || (await readPublicAlbums(work.id)).length ? work : null));
  const entries: MetadataRoute.Sitemap = [
    ...["/", "/mv", "/ai-music", "/rank", "/battle", "/ai-music-bible", "/about", "/partners", "/music-analysis"].flatMap(path => localized(path)),
    ...localized("/ai-music", { view: "albums" }),
    ...PUBLIC_LANGS.map(lang => ({ url: publicUrl("/drop-guide", lang) })),
    { url: publicUrl("/earworm", "zh") },
    ...validWorks.flatMap(work => work ? localized(`/works/${work.id}`) : []),
    ...official.flatMap(choice => localized(`/choice/${choice.id}`, { kind: "official" }).map(entry => ({ ...entry, ...(choice.updated_at && Number.isFinite(Date.parse(choice.updated_at)) ? { lastModified: new Date(choice.updated_at) } : {}) }))),
    ...creators.flatMap(choice => localized(`/choice/${choice.id}`, { kind: "creator" }).map(entry => ({ ...entry, ...(choice.updated_at && Number.isFinite(Date.parse(choice.updated_at)) ? { lastModified: new Date(choice.updated_at) } : {}) }))),
    ...BIBLE_PUBLIC_SLUGS.flatMap(slug => localized(`/ai-music-bible/${slug}`)),
    ...[...battles.live.map(row => row.id), ...battles.pool.map(row => row.id)].flatMap(id => localized(`/battle/${id}`)),
    ...battles.qCrash.flatMap(card => ["zh", "en"].map(lang => ({ url: publicUrl(`/battle/q-crash/${card.cardId}`, lang as "zh" | "en"), alternates: { languages: {
      "zh-Hant": publicUrl(`/battle/q-crash/${card.cardId}`, "zh"), en: publicUrl(`/battle/q-crash/${card.cardId}`, "en"),
    } } }))),
  ];
  return [...new Map(entries.map(entry => [entry.url, entry])).values()];
}, ["aipoger-public-sitemap-v1"], { revalidate: 300 });
export async function readPublicSitemap() { return buildSitemap(); }
