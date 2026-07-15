"use client";

import Link from "next/link";
import { FileText, Heart, ListMusic, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import ShareButton from "@/components/share-button";
import type { AipogerChoiceItem } from "@/lib/aipoger-choice";
import { fontRighteous } from "@/lib/fonts";

export type ShowtimeChoiceShelfEntry = {
  id: string;
  kind: "official" | "creator";
  curatorName: string;
  coverUrl: string;
  title: string;
  intro: string;
  weekStart: string;
  href?: string;
  items: AipogerChoiceItem[];
};

export type ShowtimeChoiceHeartState = {
  heartCount: number;
  myHeart: boolean;
};

type ShowtimeChoiceShelfProps = {
  entries: ShowtimeChoiceShelfEntry[];
  isZh: boolean;
  onPlay: (entry: ShowtimeChoiceShelfEntry, itemId?: string) => void;
  hearts: Record<string, ShowtimeChoiceHeartState>;
  heartBusy: Record<string, boolean>;
  heartError?: string;
  onToggleHeart: (entry: ShowtimeChoiceShelfEntry) => void;
};

function recordKey(entry: ShowtimeChoiceShelfEntry) {
  return `${entry.kind}:${entry.id}`;
}

function shareUrl(entry: ShowtimeChoiceShelfEntry) {
  return entry.href || "/rank#choice-weekly";
}

export default function ShowtimeChoiceShelf({
  entries,
  isZh,
  onPlay,
  hearts,
  heartBusy,
  heartError,
  onToggleHeart,
}: ShowtimeChoiceShelfProps) {
  const [detail, setDetail] = useState<ShowtimeChoiceShelfEntry | null>(null);
  const [editorial, setEditorial] = useState<ShowtimeChoiceShelfEntry | null>(null);

  useEffect(() => {
    if (!detail && !editorial) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetail(null);
        setEditorial(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detail, editorial]);

  return (
    <>
      <section id="choice-weekly" className="scroll-mt-20 border-y border-yellow-100/15 py-5 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={`${fontRighteous.className} text-4xl leading-[0.88] text-white sm:text-5xl lg:text-6xl`}>
            AIPOGER <span className="text-orange-300">CHOICE</span>
          </h2>
          <Link href="/profile/choice" className="aipo-ghost-button rounded-full px-3 py-2 text-xs font-black text-cyan-100 transition hover:text-white">
            {isZh ? "建立我的 Choice" : "Build My Choice"}
          </Link>
        </div>

        {entries.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {entries.map((entry) => {
              const key = recordKey(entry);
              const heart = hearts[key] ?? { heartCount: 0, myHeart: false };
              const playable = entry.items.some((item) => Boolean(item.audioUrl));
              return (
                <article key={key} className="group min-w-0 rounded-md border border-yellow-100/20 bg-black/35 p-1.5 shadow-[0_10px_26px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-yellow-100/40">
                  <div className="group relative aspect-square overflow-hidden rounded-md bg-[#090909]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.coverUrl} alt={`${entry.curatorName} Choice`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                    <button
                      type="button"
                      onClick={() => onPlay(entry)}
                      disabled={!playable}
                      className="absolute bottom-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_8px_18px_rgba(0,0,0,0.44)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={isZh ? `順播 ${entry.curatorName} 的 Choice` : `Play ${entry.curatorName}'s Choice`}
                    >
                      <Play className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetail(entry)}
                      className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black/75 text-cyan-100 transition hover:border-cyan-100 hover:text-white"
                      aria-label={isZh ? `查看 ${entry.curatorName} 的歌單` : `View ${entry.curatorName}'s tracklist`}
                      title={isZh ? "查看歌單" : "View tracklist"}
                    >
                      <ListMusic className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="px-0.5 pb-0.5 pt-2">
                    <button type="button" onClick={() => setDetail(entry)} className="block w-full truncate text-left text-sm font-black text-white transition hover:text-orange-100" title={entry.title || `${entry.curatorName} Choice`}>
                      {entry.title || `${entry.curatorName} Choice`}
                    </button>
                    <p className="mt-0.5 truncate text-[11px] font-black text-cyan-100">{entry.curatorName}</p>
                    {entry.intro ? <p className="mt-1.5 line-clamp-2 text-[11px] font-bold leading-4 text-zinc-400">{entry.intro}</p> : null}
                    <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2">
                      <button
                        type="button"
                        onClick={() => onToggleHeart(entry)}
                        disabled={Boolean(heartBusy[key])}
                        className={`aipo-ghost-button inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${heart.myHeart ? "border-rose-200/45 bg-rose-500/20 text-rose-100" : "text-zinc-200 hover:text-white"}`}
                        aria-label={heart.myHeart ? (isZh ? "取消收藏 Choice" : "Remove Choice from favorites") : (isZh ? "收藏 Choice" : "Favorite Choice")}
                        title={heart.myHeart ? (isZh ? "取消收藏" : "Remove favorite") : (isZh ? "收藏 Choice" : "Favorite Choice")}
                      >
                        <Heart className="h-3.5 w-3.5" fill={heart.myHeart ? "currentColor" : "none"} />
                        <span className="tabular-nums">{heart.heartCount}</span>
                      </button>
                      <ShareButton
                        title={entry.title || `${entry.curatorName} Choice`}
                        text={entry.intro || `${entry.curatorName} Choice`}
                        url={shareUrl(entry)}
                        label={isZh ? "分享 Choice" : "Share Choice"}
                        copiedLabel={isZh ? "已複製" : "Copied"}
                        iconOnly
                        className="h-7 w-7 rounded-full p-0 text-cyan-100"
                      />
                      {entry.intro ? (
                        <button
                          type="button"
                          onClick={() => setEditorial(entry)}
                          className="aipo-ghost-button inline-flex h-7 w-7 items-center justify-center rounded-full text-cyan-100 transition hover:text-white"
                          aria-label={isZh ? "閱讀推薦文章" : "Read editorial"}
                          title={isZh ? "閱讀推薦文章" : "Read editorial"}
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setDetail(entry)}
                        className="aipo-ghost-button ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-cyan-100 transition hover:text-white"
                        aria-label={isZh ? "查看歌單" : "View tracklist"}
                        title={isZh ? "查看歌單" : "View tracklist"}
                      >
                        <ListMusic className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 border-l-2 border-orange-400 pl-3 text-sm font-bold text-zinc-500">
            {isZh ? "目前還沒有已發布的 Choice。" : "No published Choice playlists yet."}
          </p>
        )}
        {heartError ? <p className="mt-3 text-xs font-bold text-rose-200">{heartError}</p> : null}
      </section>

      {detail ? (
        <div className="fixed inset-0 z-[230] flex items-end bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={isZh ? "Choice 歌單" : "Choice tracklist"} onClick={() => setDetail(null)}>
          <div className="max-h-[82vh] w-full max-w-3xl overflow-hidden rounded-lg border border-yellow-100/25 bg-[#080808] shadow-[0_28px_100px_rgba(0,0,0,0.78)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">{detail.curatorName} · CHOICE</p>
                <h2 className="mt-1 truncate text-xl font-black text-white">{detail.title || `${detail.curatorName} Choice`}</h2>
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

      {editorial ? (
        <div className="fixed inset-0 z-[231] flex items-end bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={isZh ? "Choice 推薦文章" : "Choice editorial"} onClick={() => setEditorial(null)}>
          <article className="w-full max-w-2xl overflow-hidden rounded-lg border border-yellow-100/25 bg-[#080808] shadow-[0_28px_100px_rgba(0,0,0,0.78)]" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-start gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editorial.coverUrl} alt="" className="h-11 w-11 rounded-full border border-white/15 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">{editorial.curatorName} · CHOICE</p>
                <h2 className="mt-1 truncate text-xl font-black text-white">{editorial.title || `${editorial.curatorName} Choice`}</h2>
              </div>
              <button type="button" onClick={() => setEditorial(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white" aria-label={isZh ? "關閉推薦文章" : "Close editorial"}><X className="h-4 w-4" /></button>
            </header>
            <div className="max-h-[65vh] overflow-y-auto px-4 py-5 sm:px-5">
              <p className="whitespace-pre-wrap text-sm font-bold leading-7 text-zinc-300">{editorial.intro}</p>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
