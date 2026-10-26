import type { Lang } from "@/lib/locale";
import type { MusicNews } from "@/lib/music-news";
import MusicNewsCard from "@/components/music-news-card";

export default function MusicNewsGrid({ articles, lang, surface }: {
  articles: readonly MusicNews[]; lang: Lang; surface: "home" | "index";
}) {
  const [lead, ...rest] = articles;
  if (!lead) return null;
  const companions = rest.slice(0, 2);
  const more = rest.slice(2);
  return <div className="music-news-grid" data-news-surface={surface}>
    <div className="music-news-feature" data-news-single={companions.length === 0 ? "true" : undefined}>
      <MusicNewsCard article={lead} lang={lang} variant="lead" compact={surface === "home"} />
      {companions.length ? <div className="music-news-companions">{companions.map(article => <MusicNewsCard key={article.slug} article={article} lang={lang} variant="companion" />)}</div> : null}
    </div>
    {more.length ? <div className="music-news-more">{more.map(article => <MusicNewsCard key={article.slug} article={article} lang={lang} />)}</div> : null}
  </div>;
}
