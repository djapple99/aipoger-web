import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Lang } from "@/lib/locale";
import { musicNewsCopy, musicNewsHref, type MusicNews } from "@/lib/music-news";

export default function MusicNewsCard({ article, lang }: { article: MusicNews; lang: Lang }) {
  const copy = musicNewsCopy[lang];
  return <article className="music-news-card" lang="zh-Hant">
    <Link href={musicNewsHref(article, lang)} className="music-news-card-image" tabIndex={-1} aria-hidden="true">
      <Image src={article.cover} alt="" width={1200} height={630} sizes="(max-width: 700px) 100vw, 540px" />
    </Link>
    <div className="music-news-card-body">
      <p className="music-news-meta"><span>{article.category}</span><time dateTime={article.publishedOn}>{article.publishedOn.replaceAll("-", ".")}</time><span lang={lang}>{copy.language}</span></p>
      <h3><Link href={musicNewsHref(article, lang)}>{article.title}</Link></h3>
      <p>{article.summary}</p>
      <Link href={musicNewsHref(article, lang)} className="music-news-read" lang={lang}>{copy.read}<ArrowUpRight size={18} aria-hidden="true" /></Link>
    </div>
  </article>;
}
