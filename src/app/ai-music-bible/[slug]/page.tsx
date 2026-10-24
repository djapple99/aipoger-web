import BibleCreationCta from "@/components/bible-creation-cta";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditorialHeader from "@/components/editorial-header";
import ShareButton from "@/components/share-button";
import SeoJsonLd from "@/components/seo-json-ld";
import { biblePublicCopy, publicBibleArticle, BIBLE_PUBLIC_SLUGS } from "@/lib/bible-public-articles";
import { requestLang } from "@/lib/server-public-locale";
import { publicMetadata, publicUrl } from "@/lib/public-seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };
export function generateStaticParams() { return BIBLE_PUBLIC_SLUGS.map(slug => ({ slug })); }
export async function generateMetadata({ params, searchParams }: Props) {
  const { slug } = await params; const lang = await requestLang((await searchParams).lang); const article = publicBibleArticle(slug, lang);
  if (!article) return { robots: { index: false } };
  return publicMetadata({ path: `/ai-music-bible/${slug}`, lang, type: "article", title: `${article.title}｜AIPOGER`, description: article.summary,
    image: { url: `/ai-music-bible/${slug}/opengraph-image?lang=${lang}`, width: 1200, height: 630, alt: article.title } });
}
export default async function BibleArticlePage({ params, searchParams }: Props) {
  const { slug } = await params; const lang = await requestLang((await searchParams).lang); const article = publicBibleArticle(slug, lang);
  if (!article) notFound(); const copy = biblePublicCopy[lang]; const path = `/ai-music-bible/${slug}`;
  return <main className="min-h-screen bg-[#050505] px-4 pb-28 pt-28 text-zinc-100"><EditorialHeader active="bible" />
    <article className="mx-auto max-w-3xl space-y-7">
      <Link className="inline-flex min-h-11 items-center text-orange-200" href={`/ai-music-bible?lang=${lang}#bible-public-guides`}>← {copy.back}</Link>
      <header><p className="mb-4 text-xs tracking-[.2em] text-orange-300">AIPOGER · CREATION BIBLE</p><h1 className="text-3xl font-bold leading-snug md:text-5xl">{article.title}</h1></header>
      <ShareButton title={article.title} text={article.summary} url={`${path}?lang=${lang}`} />
      <div className="border-y border-white/15 py-8 text-lg leading-9 text-zinc-200"><p>{article.summary}</p></div>
      <p className="text-sm leading-7 text-zinc-400">{copy.note}</p>
      <Link className="inline-flex min-h-12 items-center rounded-full border border-orange-300/40 px-5 font-bold text-orange-200" href={`/ai-music-bible?lang=${lang}`}>{copy.member} ↗</Link>
      <BibleCreationCta lang={lang} />
      <SeoJsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: article.title, description: article.summary,
        inLanguage: lang === "zh" ? "zh-Hant" : lang, mainEntityOfPage: publicUrl(path, lang),
        author: { "@type": "Organization", name: "AIPOGER" }, publisher: { "@id": "https://aipoger.com/#organization" } }} />
    </article></main>;
}
