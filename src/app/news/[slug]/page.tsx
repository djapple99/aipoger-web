import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditorialHeader from "@/components/editorial-header";
import ShareButton from "@/components/share-button";
import SeoJsonLd from "@/components/seo-json-ld";
import YouTubeAiLabelsArticle from "@/components/youtube-ai-labels-article";
import { musicNewsArticle, musicNewsCopy, musicNewsSources, publishedMusicNews } from "@/lib/music-news";
import { publicShareCopy } from "@/lib/public-share-copy";
import { requestLang } from "@/lib/server-public-locale";
import { publicMetadata, publicUrl } from "@/lib/public-seo";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };
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
  const lang = await requestLang((await searchParams).lang); const copy = musicNewsCopy[lang]; const path = `/news/${article.slug}`;
  return <div className="music-news-page"><EditorialHeader active="news" returnPath={path} />
    <main className="music-news-container"><Link className="music-news-back" href={`/news?lang=${lang}`}>← {copy.back}</Link>
      <article lang="zh-Hant">
        <header className="music-news-article-heading"><div className="music-news-title-block"><p className="music-news-kicker">MUSIC NEWS / 發行與曝光</p><h1>{article.title}</h1>
          <p className="music-news-deck">先講重點，再陪你把規則看懂。創作已經夠燒腦，填資料就別再猜謎。</p>
          <p className="music-news-meta"><span>愛波哥・AIPOGER</span><span>約 5 分鐘</span></p>
          <p className="music-news-meta"><span>發布 <time dateTime={article.publishedOn}>{article.publishedOn}</time></span><span>事件 {article.eventOn}</span><span>查核 {article.verifiedOn}</span></p>
          {lang !== "zh" ? <p className="music-news-language" lang={lang}>{copy.languageNote}</p> : null}
          <ShareButton {...publicShareCopy(lang)} title={article.title} text={article.summary} url={`${path}?lang=zh`} />
        </div><figure className="music-news-cover"><Image src={article.cover} alt={article.coverAlt} width={1200} height={630} priority sizes="(max-width: 900px) 100vw, 650px" /><figcaption>圖／AIPOGER 原創概念圖，非 YouTube 實際介面</figcaption></figure></header>
        <YouTubeAiLabelsArticle />
        <footer className="music-news-article-footer"><h2>查核來源</h2><p>本文依官方公開資料整理，新聞事實與本站觀點分別呈現；平台規則以官方最新說明為準。</p>
          <ol>{musicNewsSources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a></li>)}</ol>
          <Link className="music-news-read" href={`/news?lang=${lang}`}>← {copy.back}</Link></footer>
        <SeoJsonLd data={{ "@context": "https://schema.org", "@type": "NewsArticle", headline: article.title, description: article.summary,
          inLanguage: article.language, datePublished: article.publishedOn, dateModified: article.verifiedOn, mainEntityOfPage: publicUrl(path, "zh"),
          image: [new URL(article.cover, publicUrl("/", "zh")).href], author: { "@type": "Person", name: "愛波哥", url: "https://www.youtube.com/@djapple2000" },
          publisher: { "@id": "https://aipoger.com/#organization" }, citation: musicNewsSources.map(source => source.url) }} />
      </article></main></div>;
}
