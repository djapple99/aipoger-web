import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditorialHeader from "@/components/editorial-header";
import ShareButton from "@/components/share-button";
import SeoJsonLd from "@/components/seo-json-ld";
import YouTubeAiLabelsArticle from "@/components/youtube-ai-labels-article";
import SunoCommercialRightsArticle from "@/components/suno-commercial-rights-article";
import SpotifyBelieveRemixesArticle from "@/components/spotify-believe-remixes-article";
import SbaCreatorBusinessArticle from "@/components/sba-creator-business-article";
import DeezerAiSearchArticle from "@/components/deezer-ai-search-article";
import EasolTeammatesArticle from "@/components/easol-teammates-article";
import MusicNewsDiscussion from "@/components/music-news-discussion";
import { musicNewsArticle, musicNewsCopy, musicNewsHref, publishedMusicNews } from "@/lib/music-news";
import { publicShareCopy } from "@/lib/public-share-copy";
import { requestLang } from "@/lib/server-public-locale";
import { publicMetadata, publicUrl } from "@/lib/public-seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };
const bodies = {
  "youtube-music-ai-labels": YouTubeAiLabelsArticle,
  "suno-reservoir-lawsuit-commercial-rights": SunoCommercialRightsArticle,
  "spotify-believe-licensed-ai-remixes": SpotifyBelieveRemixesArticle,
  "sba-creator-small-business-guidance": SbaCreatorBusinessArticle,
  "deezer-ai-music-search-toggle": DeezerAiSearchArticle,
  "easol-teammates-festival-ai-agents": EasolTeammatesArticle,
};
export function generateStaticParams() { return publishedMusicNews().map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props) {
  const article = musicNewsArticle((await params).slug);
  if (!article) return { robots: { index: false } };
  const canonical = publicUrl(`/news/${article.slug}`, "zh");
  const metadata = publicMetadata({ path: `/news/${article.slug}`, lang: "zh", type: "article", title: `${article.title}｜AIPOGER`, description: article.summary,
    image: { url: article.cover, width: 1200, height: 630, alt: article.coverAlt, type: "image/png" } });
  return { ...metadata, alternates: { canonical, languages: { "zh-Hant": canonical, "x-default": canonical } },
    openGraph: { ...metadata.openGraph, type: "article", publishedTime: article.publishedOn, modifiedTime: article.verifiedOn, authors: ["愛波哥・AIPOGER"] } };
}
export default async function MusicNewsArticlePage({ params, searchParams }: Props) {
  const article = musicNewsArticle((await params).slug); if (!article) notFound();
  const Body = bodies[article.slug as keyof typeof bodies]; if (!Body) notFound();
  const lang = await requestLang((await searchParams).lang); const copy = musicNewsCopy[lang]; const path = `/news/${article.slug}`;
  return <div className="music-news-page"><EditorialHeader active="news" returnPath={path} />
    <main className="music-news-container"><Link className="music-news-back" href={`/news?lang=${lang}`}>← {copy.back}</Link>
      <article lang="zh-Hant">
        <header className="music-news-article-heading"><div className="music-news-title-block"><p className="music-news-kicker">MUSIC NEWS / {article.category}</p><h1>{article.title}</h1>
          <p className="music-news-deck">{article.deck}</p>
          <p className="music-news-meta"><span>愛波哥・AIPOGER</span><span>約 5 分鐘</span></p>
          <p className="music-news-meta"><span>發布 <time dateTime={article.publishedOn}>{article.publishedOn}</time></span><span>事件 {article.eventOn}</span><span>查核 {article.verifiedOn}</span></p>
          {lang !== "zh" ? <p className="music-news-language" lang={lang}>{copy.languageNote}</p> : null}
          <ShareButton {...publicShareCopy(lang)} title={article.title} text={article.summary} url={`${path}?lang=zh`} />
        </div><figure className="music-news-cover"><Image src={article.cover} alt={article.coverAlt} width={1200} height={630} priority sizes="(max-width: 900px) 100vw, 650px" /><figcaption>{article.coverCaption}</figcaption></figure></header>
        <Body />
        <footer className="music-news-article-footer"><h2>查核來源</h2><p>本文依官方公開資料整理，新聞事實與本站觀點分別呈現；相關規則以官方最新說明為準。</p>
          <ol>{article.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ol>
          <nav className="music-news-related" aria-label="延伸閱讀"><h2>接著讀：AI 音樂與創作者權益</h2>{publishedMusicNews().filter(item => item.slug !== article.slug).map(item => <Link key={item.slug} href={musicNewsHref(item, lang)}>{item.title} →</Link>)}</nav>
          <Link className="music-news-read" href={`/news?lang=${lang}`}>← {copy.back}</Link></footer>
        <MusicNewsDiscussion slug={article.slug} title={article.title} lang={lang} />
        <SeoJsonLd data={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: article.title, description: article.summary,
          inLanguage: article.language, datePublished: article.publishedOn, dateModified: article.verifiedOn, mainEntityOfPage: publicUrl(path, "zh"),
          image: [new URL(article.cover, publicUrl("/", "zh")).href], author: { "@type": "Person", name: "愛波哥", url: "https://www.youtube.com/@djapple2000" },
          publisher: { "@id": "https://aipoger.com/#organization" }, citation: article.sources.map(source => source.url) }} />
      </article></main></div>;
}
