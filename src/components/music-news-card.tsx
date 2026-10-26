import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Lang } from "@/lib/locale";
import { musicNewsCopy, musicNewsHref, type MusicNews } from "@/lib/music-news";

export default function MusicNewsCard({ article, lang, variant = "tile", compact = false }: {
  article: MusicNews; lang: Lang; variant?: "lead" | "companion" | "tile"; compact?: boolean;
}) {
  const copy = musicNewsCopy[lang];
  return <article className="music-news-card" lang="zh-Hant" data-news-card={variant}>
    <Link href={musicNewsHref(article, lang)} className="music-news-card-image" tabIndex={-1} aria-hidden="true">
      <Image src={article.cover} alt="" width={1200} height={630} sizes={variant === "companion" ? "(max-width: 700px) 105px, 240px" : "(max-width: 700px) 100vw, 560px"} />
    </Link>
    <div className="music-news-card-body">
      <p className="music-news-meta"><span>{article.category}</span><time dateTime={article.publishedOn}>{article.publishedOn.replaceAll("-", ".")}</time><span lang={lang}>{copy.language}</span></p>
      <h3><Link href={musicNewsHref(article, lang)} title={article.title}>{article.title}</Link></h3>
      {!compact && variant !== "companion" ? <><p className="music-news-card-summary">{article.summary}</p>
        <Link href={musicNewsHref(article, lang)} className="music-news-read" lang={lang}>{copy.read}<ArrowUpRight size={18} aria-hidden="true" /></Link></> : null}
    </div>
  </article>;
}
