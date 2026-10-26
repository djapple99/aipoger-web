import EditorialHeader from "@/components/editorial-header";
import MusicNewsCard from "@/components/music-news-card";
import SeoJsonLd from "@/components/seo-json-ld";
import { musicNewsCopy, musicNewsHref, publishedMusicNews } from "@/lib/music-news";
import { requestLang } from "@/lib/server-public-locale";
import { publicMetadata, publicUrl } from "@/lib/public-seo";

type Props = { searchParams: Promise<{ lang?: string }> };
export async function generateMetadata({ searchParams }: Props) {
  const lang = await requestLang((await searchParams).lang); const copy = musicNewsCopy[lang];
  return publicMetadata({ path: "/news", lang, title: `${copy.title}｜AIPOGER`, description: copy.description,
    image: { url: "/news/youtube-music-ai-labels.png", width: 1200, height: 630, alt: copy.title, type: "image/png" } });
}
export default async function MusicNewsPage({ searchParams }: Props) {
  const lang = await requestLang((await searchParams).lang); const copy = musicNewsCopy[lang]; const articles = publishedMusicNews();
  return <div className="music-news-page"><EditorialHeader active="news" returnPath="/news" />
    <main className="music-news-container"><header className="music-news-index-heading"><p className="music-news-kicker">AIPOGER JOURNAL</p>
      <h1>{copy.title}<span aria-hidden="true">.</span></h1><p className="music-news-deck">{copy.intro}</p><p>{copy.description}</p></header>
      <div className="music-news-cards">{articles.map(article => <MusicNewsCard article={article} lang={lang} key={article.slug} />)}</div>
      <SeoJsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: copy.title, url: publicUrl("/news", lang),
        mainEntity: { "@type": "ItemList", itemListElement: articles.map((article, i) => ({ "@type": "ListItem", position: i + 1, name: article.title,
          url: new URL(musicNewsHref(article, "zh"), publicUrl("/news", "zh")).href })) } }} />
    </main></div>;
}
