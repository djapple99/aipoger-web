"use client";

import Link from "next/link";
import { ListMusic, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import PublicChoiceGallery from "@/components/public-choice-gallery";
import MonthlyChart from "@/components/monthly-chart";
import { fontGlowSans, fontRighteous } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

export default function RankPage() {
  const { lang } = useI18n();
  const [view, setView] = useState<"charts" | "choice">("charts");
  const copy = {
    zh: { charts: "月排行榜", explore: "探索音樂", bar: "傷心酒吧", records: "對戰記錄", make: "製作我的 Choice", tabs: "Showtime 頁面" },
    en: { charts: "Monthly Charts", explore: "Explore Music", bar: "Bar Heartbreak", records: "Battle Records", make: "Make My Choice", tabs: "Showtime views" },
    ja: { charts: "月間ランキング", explore: "音楽を探す", bar: "Bar Heartbreak", records: "対戦記録", make: "マイ Choice を作る", tabs: "Showtime の表示" },
    ko: { charts: "월간 차트", explore: "음악 탐색", bar: "Bar Heartbreak", records: "대전 기록", make: "내 Choice 만들기", tabs: "Showtime 보기" },
  }[lang];

  useEffect(() => {
    const update = () => setView(window.location.hash === "#choice-weekly" ? "choice" : "charts");
    update();
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => { window.removeEventListener("hashchange", update); window.removeEventListener("popstate", update); };
  }, []);

  function changeView(next: "charts" | "choice") {
    setView(next);
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${next === "choice" ? "#choice-weekly" : "#monthly-charts"}`);
  }

  return (
    <main className={`${fontGlowSans.className} min-h-screen bg-[#080909] px-4 pb-44 pt-24 text-white sm:px-6 lg:px-8`}>
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-white/15 pb-5 text-center">
          <h1 className={`${fontRighteous.className} text-3xl leading-tight sm:text-4xl`}>AIPOGER <span className="text-orange-400">SHOWTIME</span></h1>
          <nav className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-zinc-400">
            <Link href={`/ai-music?lang=${lang}`} className="hover:text-white">{copy.explore}</Link>
            <Link href={`/listen-bar?lang=${lang}`} className="hover:text-white">{copy.bar}</Link>
            <Link href={`/battle/results?lang=${lang}`} className="hover:text-white">{copy.records}</Link>
          </nav>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15">
          <div className="flex gap-6" role="tablist" aria-label={copy.tabs}>
            {(["charts", "choice"] as const).map((tab) => {
              const Icon = tab === "charts" ? Trophy : ListMusic;
              return <button key={tab} type="button" role="tab" id={`tab-${tab}`} aria-controls={`panel-${tab}`} aria-selected={view === tab} tabIndex={view === tab ? 0 : -1}
                onKeyDown={(event) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "charts" : event.key === "End" ? "choice" : tab === "charts" ? "choice" : "charts"; changeView(next); document.getElementById(`tab-${next}`)?.focus(); } }}
                onClick={() => changeView(tab)} className={`inline-flex min-h-14 items-center gap-2 border-b-2 text-sm font-black ${view === tab ? "border-orange-400 text-white" : "border-transparent text-zinc-500 hover:text-white"}`}>
                <Icon className="h-4 w-4" />{tab === "charts" ? copy.charts : "Choice"}
              </button>;
            })}
          </div>
          <Link href={`/profile/choice?lang=${lang}`} className="my-2 inline-flex min-h-10 items-center gap-2 rounded-md border border-white/20 px-3 text-xs font-bold text-orange-200 hover:border-orange-300"><ListMusic className="h-4 w-4" />{copy.make}</Link>
        </div>
        <section id="panel-charts" role="tabpanel" aria-labelledby="tab-charts" hidden={view !== "charts"}>
          {view === "charts" && <MonthlyChart lang={lang} />}
        </section>
        <section id="panel-choice" role="tabpanel" aria-labelledby="tab-choice" hidden={view !== "choice"}>
          {view === "choice" && <PublicChoiceGallery lang={lang} />}
        </section>
      </div>
    </main>
  );
}
