"use client";

import Link from "next/link";
import { ListPlus } from "lucide-react";
import PublicChoiceGallery from "@/components/public-choice-gallery";
import MonthlyChart from "@/components/monthly-chart";
import { fontGlowSans, fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

export default function RankPage() {
  const { lang } = useI18n();
  const copy = {
    zh: { explore: "探索音樂", bar: "傷心酒吧", records: "對戰記錄", make: "製作我的 Choice" },
    en: { explore: "Explore Music", bar: "Bar Heartbreak", records: "Battle Records", make: "Make My Choice" },
    ja: { explore: "音楽を探す", bar: "Bar Heartbreak", records: "対戦記録", make: "マイ Choice を作る" },
    ko: { explore: "음악 탐색", bar: "Bar Heartbreak", records: "대전 기록", make: "내 Choice 만들기" },
  }[lang];

  return (
    <main className={`${fontGlowSans.className} min-h-screen bg-[#171717] px-4 pb-44 pt-24 text-white sm:px-6 lg:px-8`}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-5 border-b border-white/15 pb-5">
          <div className="min-w-0">
          <h1 className={`${fontRighteous.className} text-2xl leading-tight sm:text-3xl`}>AIPOGER <span className="text-orange-400">SHOWTIME</span></h1>
          <nav className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-zinc-400">
            <Link href={`/ai-music?lang=${lang}`} className="hover:text-white">{copy.explore}</Link>
            <Link href={`/listen-bar?lang=${lang}`} className="hover:text-white">{copy.bar}</Link>
            <Link href={`/battle/results?lang=${lang}`} className="hover:text-white">{copy.records}</Link>
          </nav>
          </div>
          <Link href={`/profile/choice?lang=${lang}`} className="inline-flex min-h-11 items-center gap-2 rounded border border-orange-400/50 px-4 text-sm font-bold text-orange-200 hover:bg-orange-400/10"><ListPlus className="h-4 w-4" />{copy.make}</Link>
        </header>
        <PublicChoiceGallery lang={lang} chart={<MonthlyChart lang={lang} />} />
      </div>
    </main>
  );
}
