"use client";

import Link from "next/link";
import { Heart, ListMusic, MessageCircle, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import ChoiceCommentsDialog from "@/components/choice-comments-dialog";
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

function choiceDateLabel(value: string, isZh: boolean) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  return isZh ? `${match[1]}.${match[2]}.${match[3]}` : `${match[1]}-${match[2]}-${match[3]}`;
}

function TracklistPreview({ entry }: { entry: ShowtimeChoiceShelfEntry }) {
  return (
    <ol className="grid gap-1.5">
      {entry.items.map((item, index) => (
        <li key={item.itemId} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 border-b border-white/8 pb-1.5 last:border-0 last:pb-0">
          <span className="text-[9px] font-black tabular-nums text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-black text-white">{item.title}</span>
            <span className="mt-0.5 block truncate text-[9px] font-bold text-zinc-500">{item.artist}</span>
          </span>
        </li>
      ))}
    </ol>
  );
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
  const [commentsEntry, setCommentsEntry] = useState<ShowtimeChoiceShelfEntry | null>(null);

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
                      aria-label={isZh ? `順播 ${entry.title}` : `Play ${entry.title}`}
                    >
                      <Play className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                  </div>
                  <div className="px-0.5 pb-0.5 pt-2">
                    <button type="button" onClick={() => setDetail(entry)} className="block w-full line-clamp-2 min-h-10 text-left text-sm font-black leading-5 text-white transition hover:text-orange-100" title={entry.title}>
                      {entry.title}
                    </button>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] font-black">
                      <p className="truncate text-cyan-100">{entry.curatorName}</p>
                      <time dateTime={entry.weekStart} className="shrink-0 tabular-nums text-orange-200/75">{choiceDateLabel(entry.weekStart, isZh)}</time>
                    </div>
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
                        title={entry.title}
                        text={entry.intro || entry.title}
                        url={shareUrl(entry)}
                        label={isZh ? "分享 Choice" : "Share Choice"}
                        copiedLabel={isZh ? "已複製" : "Copied"}
                        iconOnly
                        className="h-7 w-7 rounded-full p-0 text-cyan-100"
                      />
                      <button
                        type="button"
                        onClick={() => setCommentsEntry(entry)}
                        className="aipo-ghost-button inline-flex h-7 w-7 items-center justify-center rounded-full text-cyan-100 transition hover:text-white"
                        aria-label={isZh ? "查看 Choice 評論" : "View Choice comments"}
                        title={isZh ? "評論" : "Comments"}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                      <div className="group/tracklist relative ml-auto">
                        <button
                          type="button"
                          onClick={() => setDetail(entry)}
                          className="aipo-ghost-button inline-flex h-7 w-7 items-center justify-center rounded-full text-cyan-100 transition hover:text-white"
                          aria-label={isZh ? "預覽歌單" : "Preview tracklist"}
                          title={isZh ? "移到這裡預覽歌單" : "Hover to preview tracklist"}
                        >
                          <ListMusic className="h-3.5 w-3.5" />
                        </button>
                        <div className="pointer-events-none invisible absolute bottom-[calc(100%+0.5rem)] right-0 z-[90] hidden w-72 translate-y-1 rounded-md border border-yellow-100/25 bg-[#080808]/98 p-3 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.72)] backdrop-blur-xl transition duration-150 group-hover/tracklist:visible group-hover/tracklist:translate-y-0 group-hover/tracklist:opacity-100 group-focus-within/tracklist:visible group-focus-within/tracklist:translate-y-0 group-focus-within/tracklist:opacity-100 lg:block">
                          <p className="mb-2 line-clamp-2 text-xs font-black text-white">{entry.title}</p>
                          <TracklistPreview entry={entry} />
                        </div>
                      </div>
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
        <div className="fixed inset-0 z-[230] flex items-end bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={isZh ? "Choice 歌單預覽" : "Choice tracklist preview"} onClick={() => setDetail(null)}>
          <section className="max-h-[82vh] w-full max-w-3xl overflow-hidden rounded-lg border border-yellow-100/25 bg-[#080808] shadow-[0_28px_100px_rgba(0,0,0,0.78)]" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 className="line-clamp-2 text-xl font-black text-white">{detail.title}</h2>
                <time dateTime={detail.weekStart} className="mt-1 block text-xs font-black tabular-nums text-zinc-500">{choiceDateLabel(detail.weekStart, isZh)}</time>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white" aria-label={isZh ? "關閉歌單" : "Close tracklist"}><X className="h-4 w-4" /></button>
            </header>
            <div className="max-h-[58vh] overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.items.map((item, index) => (
                  <article key={item.itemId} className="grid min-w-0 grid-cols-[2rem_2.75rem_minmax(0,1fr)] items-center gap-2 rounded border border-white/10 bg-white/[0.025] p-2">
                    <span className="text-center text-[10px] font-black tabular-nums text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.coverUrl} alt="" className="h-11 w-11 rounded object-cover" />
                    <span className="min-w-0"><span className="block truncate text-xs font-black text-white">{item.title}</span><span className="mt-0.5 block truncate text-[11px] font-bold text-zinc-500">{item.artist}</span></span>
                  </article>
                ))}
              </div>
            </div>
            {detail.href ? <footer className="border-t border-white/10 px-4 py-3 text-right"><Link href={detail.href} className="text-xs font-black text-cyan-100 hover:text-white">{isZh ? "開啟完整分享頁" : "Open full share page"}</Link></footer> : null}
          </section>
        </div>
      ) : null}

      {commentsEntry ? (
        <ChoiceCommentsDialog
          open
          collectionKind={commentsEntry.kind}
          collectionId={commentsEntry.id}
          title={commentsEntry.title}
          isZh={isZh}
          onClose={() => setCommentsEntry(null)}
        />
      ) : null}
    </>
  );
}
