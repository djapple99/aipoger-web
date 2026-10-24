import Link from "next/link";
import type { Lang } from "@/lib/locale";
import { biblePublicCopy, publicBibleArticles } from "@/lib/bible-public-articles";
export default function BiblePublicIndex({ lang }: { lang: Lang }) {
  const copy = biblePublicCopy[lang];
  return <section className="relative z-[1] mx-auto w-full max-w-6xl space-y-6 px-4 py-14 text-zinc-100" aria-labelledby="bible-public-guides">
    <div><h2 id="bible-public-guides" className="text-3xl font-bold">{copy.title}</h2><p className="mt-3 max-w-2xl leading-7 text-zinc-400">{copy.intro}</p></div>
    <div className="grid gap-4 md:grid-cols-2">{publicBibleArticles(lang).map(article => <article key={article.slug} className="rounded-xl border border-white/15 bg-white/[0.025] p-5">
      <h3 className="text-lg font-bold"><Link href={`/ai-music-bible/${article.slug}?lang=${lang}`}>{article.title}</Link></h3>
      <p className="my-4 leading-7 text-zinc-400">{article.summary}</p><Link className="inline-flex min-h-11 items-center text-sm font-bold text-orange-300" href={`/ai-music-bible/${article.slug}?lang=${lang}`}>{copy.read} ↗</Link>
    </article>)}</div>
  </section>;
}
