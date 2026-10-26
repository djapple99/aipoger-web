import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Lang } from "@/lib/locale";
import { musicNewsCopy, publishedMusicNews } from "@/lib/music-news";
import MusicNewsCard from "@/components/music-news-card";

export default function LatestMusicNews({ lang }: { lang: Lang }) {
  const articles = publishedMusicNews().slice(0, 3); const copy = musicNewsCopy[lang];
  if (!articles.length) return null;
  return <section className="music-news-shelf" aria-labelledby="home-news-title">
    <div className="music-news-section-heading"><div><h2 id="home-news-title">{copy.latest}</h2><p>{copy.intro}</p></div>
      <Link href={`/news?lang=${lang}`}>{copy.all}<ArrowRight size={18} aria-hidden="true" /></Link></div>
    <div className="music-news-cards">{articles.map(article => <MusicNewsCard key={article.slug} article={article} lang={lang} />)}</div>
  </section>;
}
