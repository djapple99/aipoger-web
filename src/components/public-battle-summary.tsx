import Link from "next/link";
import type { PublicBattleSummary } from "@/lib/server-public-battles";
import type { Lang } from "@/lib/locale";
export default function PublicBattleSummaryView({ battle, lang }: { battle: PublicBattleSummary; lang: Lang }) {
  return <main className="min-h-[70vh] bg-[#050505] px-5 pb-12 pt-28 text-white"><article className="mx-auto max-w-4xl space-y-6">
    <Link className="inline-flex min-h-11 items-center text-orange-300" href={`/battle?lang=${lang}`}>← Battle</Link>
    <p className="text-sm tracking-widest text-orange-300">{battle.battle_type === "q_crash" ? "Q CRASH" : "DROP BATTLE"} · {battle.genre}</p>
    <h1 className="text-3xl font-bold leading-snug md:text-5xl">{battle.song_a_name}{battle.song_b_name ? ` VS ${battle.song_b_name}` : ""}</h1>
    <p className="text-lg text-zinc-300">{battle.fighter_a_name}{battle.fighter_b_name ? ` · ${battle.fighter_b_name}` : ""}</p>
  </article></main>;
}
