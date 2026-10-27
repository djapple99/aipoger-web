import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MusicNewsCard from "@/components/music-news-card";
import { musicNewsCopy, musicNewsHref, type MusicNews } from "@/lib/music-news";
import type { Lang } from "@/lib/locale";
import type { NewsPopularity } from "@/lib/server-news-popularity";

export default function MusicNewsIndex({ articles, lang, popularity }: {
  articles: readonly MusicNews[]; lang: Lang; popularity: NewsPopularity;
}) {
  const copy = musicNewsCopy[lang], lead = articles[0];
  if (!lead) return null;
  const popular = popularity.slugs.map(slug => articles.find(article => article.slug === slug)).filter((article): article is MusicNews => Boolean(article));
  return <>
    <div className="music-news-spotlight">
      <section className="music-news-latest" aria-labelledby="news-latest-title">
        <h2 id="news-latest-title">{copy.latest}</h2>
        <MusicNewsCard article={lead} lang={lang} variant="lead" />
      </section>
      <aside className="music-news-popular" aria-labelledby="news-popular-title">
        <h2 id="news-popular-title">{copy.popular}</h2>
        <ol>{popular.map((article, i) => <li key={article.slug}>
          <Link href={musicNewsHref(article, lang)} title={article.title}>
            <span className="music-news-rank" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <span lang="zh-Hant">{article.title}</span><ArrowRight size={18} aria-hidden="true" />
          </Link>
        </li>)}</ol>
        <p className="music-news-ranking-note">{popularity.status === "ranked" ? copy.popularOrder : popularity.status === "empty" ? copy.popularEmpty : copy.popularUnavailable}</p>
      </aside>
    </div>
    <section className="music-news-catalog" aria-labelledby="news-all-title">
      <header><h2 id="news-all-title">{copy.catalog}</h2><span>{copy.newest}</span></header>
      <div className="music-news-cover-grid">{articles.map(article => <article key={article.slug} lang="zh-Hant">
        <Link className="music-news-card-image" href={musicNewsHref(article, lang)} title={article.title} aria-label={article.title}>
          <Image src={article.cover} alt={article.title} width={1200} height={630} sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 450px" />
        </Link>
      </article>)}</div>
    </section>
  </>;
}
