import Link from "next/link";
import EditorialHeader from "@/components/editorial-header";
import { battleGuideCopy } from "@/lib/battle-guide-copy";
import type { Lang } from "@/lib/locale";
export default function BattleGuide({ lang }: { lang: Lang }) {
  const c = battleGuideCopy(lang);
  return <main className="min-h-screen bg-[#080a0b] px-5 pb-20 text-white md:px-10">
    <div className="mx-auto max-w-6xl"><EditorialHeader active="battle" returnPath="/drop-guide" />
      <header className="max-w-4xl pb-9 pt-12 md:pt-20"><p className="text-xs font-bold tracking-[.3em] text-orange-300">AIPOGER · BATTLE GUIDE</p><h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">{c.title}</h1><p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400">{c.intro}</p></header>
      <nav aria-label={c.nav} className="mb-10 flex flex-wrap gap-3">{c.modes.map(m => <a key={m.id} href={`#${m.id}`} className="min-h-11 rounded-full border border-white/20 px-5 py-3 text-sm font-bold text-zinc-300">{m.title}</a>)}</nav>
      <div className="grid items-start gap-5 lg:grid-cols-3">{c.modes.map((m, i) => <section id={m.id} key={m.id} className={`min-w-0 scroll-mt-6 rounded-[1.75rem] border bg-black/40 p-6 ${i === 1 ? "border-orange-400/35" : i === 2 ? "border-cyan-300/30" : "border-yellow-300/25"}`}>
        <p className="text-[11px] tracking-[.24em] text-zinc-500">{m.label}</p><h2 className="mt-4 text-3xl font-black">{m.title}</h2><p className={`mt-3 text-sm font-bold ${i === 1 ? "text-orange-300" : i === 2 ? "text-cyan-200" : "text-yellow-200"}`}>{m.tag}</p>
        <ol className="mt-6 space-y-5 text-sm leading-7 text-zinc-400">{m.items.map((item, n) => <li key={n}><span className="mr-2 font-mono text-orange-300">0{n + 1}</span>{item}</li>)}</ol>
        <Link href={`${m.href}?lang=${lang}`} className={`mt-7 inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-black text-black ${i === 2 ? "bg-cyan-300" : "bg-orange-400"}`}>{m.action} ↗</Link>
      </section>)}</div>
      <section className="mt-8 rounded-[1.75rem] border border-white/10 p-6 md:p-8"><h2 className="text-xl font-bold">{c.linksTitle}</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-zinc-400">{c.links}</p><Link className="mt-4 inline-flex min-h-11 items-center text-sm text-orange-300" href={`/battle/results?lang=${lang}`}>{c.records} ↗</Link></section>
    </div>
  </main>;
}
