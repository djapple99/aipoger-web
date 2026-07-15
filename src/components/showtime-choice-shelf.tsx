"use client";

import Link from "next/link";
import { ListMusic, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AipogerChoiceItem } from "@/lib/aipoger-choice";

export type ShowtimeChoiceShelfEntry = {
  id: string;
  curatorName: string;
  avatarUrl: string;
  title: string;
  intro: string;
  weekStart: string;
  href?: string;
  items: AipogerChoiceItem[];
};

type ShowtimeChoiceShelfProps = {
  entries: ShowtimeChoiceShelfEntry[];
  isZh: boolean;
  onPlay: (entry: ShowtimeChoiceShelfEntry, itemId?: string) => void;
};

export default function ShowtimeChoiceShelf({ entries, isZh, onPlay }: ShowtimeChoiceShelfProps) {
  const [detail, setDetail] = useState<ShowtimeChoiceShelfEntry | null>(null);

  useEffect(() => {
    if (!detail) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detail]);

  return (
    <>
      <section id="choice-weekly" className="scroll-mt-20 border-y border-yellow-100/15 py-4 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">CURATOR SETS</p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">AIPOGER CHOICE</h2>
            <p className="mt-1 text-sm font-black text-yellow-100">
              {isZh ? "由創作者選出他們心目中的歌單" : "Playlists chosen by AIPOGER creators."}
            </p>
          </div>
          <Link href="/profile/choice" className="text-xs font-black text-cyan-100 transition hover:text-white">
            {isZh ? "建立我的 Choice" : "Build My Choice"}
          </Link>
        </div>

        {entries.length > 0 ? (
          <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {entries.map((entry) => (
              <article key={entry.id} className="w-[5.4rem] shrink-0 snap-start text-center sm:w-[6rem]">
                <div className="group relative mx-auto h-[4.7rem] w-[4.7rem] overflow-hidden rounded-full border-2 border-yellow-100/35 bg-black shadow-[0_10px_28px_rgba(0,0,0,0.42)] sm:h-[5.25rem] sm:w-[5.25rem]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.avatarUrl} alt={entry.curatorName} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <button
                    type="button"
                    onClick={() => onPlay(entry)}
                    disabled={!entry.items.some((item) => Boolean(item.audioUrl))}
                    className="absolute inset-0 inline-flex items-center justify-center bg-black/22 text-white transition hover:bg-black/45 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={isZh ? `順播 ${entry.curatorName} 的 Choice` : `Play ${entry.curatorName}'s Choice`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-black shadow-lg">
                      <Play className="h-4 w-4" fill="currentColor" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetail(entry)}
                    className="absolute bottom-0.5 right-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/35 bg-black text-cyan-100 transition hover:bg-cyan-200 hover:text-black"
                    aria-label={isZh ? `查看 ${entry.curatorName} 的歌單` : `View ${entry.curatorName}'s tracklist`}
                  >
                    <ListMusic className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button type="button" onClick={() => setDetail(entry)} className="mt-2 w-full truncate text-xs font-black text-zinc-100 hover:text-yellow-100">
                  {entry.curatorName}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 border-l-2 border-orange-400 pl-3 text-sm font-bold text-zinc-500">
            {isZh ? "目前還沒有已發布的 Choice。" : "No published Choice playlists yet."}
          </p>
        )}
      </section>

      {detail ? (
        <div className="fixed inset-0 z-[230] flex items-end bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={isZh ? "Choice 歌單" : "Choice tracklist"} onClick={() => setDetail(null)}>
          <div className="max-h-[82vh] w-full max-w-3xl overflow-hidden rounded-lg border border-yellow-100/25 bg-[#080808] shadow-[0_28px_100px_rgba(0,0,0,0.78)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">{detail.curatorName} · CHOICE</p>
                <h2 className="mt-1 truncate text-xl font-black text-white">{detail.title || `${detail.curatorName} Choice`}</h2>
                {detail.intro ? <p className="mt-1 line-clamp-2 text-sm font-bold text-zinc-400">{detail.intro}</p> : null}
              </div>
              <button type="button" onClick={() => setDetail(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white" aria-label={isZh ? "關閉歌單" : "Close tracklist"}><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[58vh] overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.items.map((item, index) => (
                  <button key={item.itemId} type="button" onClick={() => onPlay(detail, item.itemId)} disabled={!item.audioUrl} className="grid min-w-0 grid-cols-[2rem_2.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded border border-white/10 bg-white/[0.025] p-2 text-left transition hover:border-yellow-100/35 hover:bg-white/[0.05] disabled:opacity-40">
                    <span className="text-center text-[10px] font-black tabular-nums text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.coverUrl} alt="" className="h-11 w-11 rounded object-cover" />
                    <span className="min-w-0"><span className="block truncate text-xs font-black text-white">{item.title}</span><span className="mt-0.5 block truncate text-[11px] font-bold text-zinc-500">{item.artist}</span></span>
                    <Play className="h-4 w-4 text-orange-300" fill="currentColor" />
                  </button>
                ))}
              </div>
            </div>
            {detail.href ? <div className="border-t border-white/10 px-4 py-3 text-right"><Link href={detail.href} className="text-xs font-black text-cyan-100 hover:text-white">{isZh ? "開啟完整分享頁" : "Open full share page"}</Link></div> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
