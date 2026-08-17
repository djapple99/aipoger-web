"use client";

import Link from "next/link";
import { Heart, ListMusic, MessageCircle, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ChoiceCommentsDialog from "@/components/choice-comments-dialog";
import ShareButton from "@/components/share-button";
import { AipogerChoiceCover } from "@/components/aipoger-choice-cover";
import { choiceItemRecordKey, type AipogerChoiceItem } from "@/lib/aipoger-choice";
import { getChoiceCopy } from "@/lib/choice-copy";
import { fontRighteous } from "@/lib/fonts";
import type { Lang } from "@/lib/locale";

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

export type ShowtimeChoiceItemHeartState = {
  heartCount: number;
  myHeart: boolean;
};

type ShowtimeChoiceShelfProps = {
  entries: ShowtimeChoiceShelfEntry[];
  lang: Lang;
  loading?: boolean;
  onPlay: (entry: ShowtimeChoiceShelfEntry, itemId?: string) => void;
  hearts: Record<string, ShowtimeChoiceHeartState>;
  heartBusy: Record<string, boolean>;
  heartError?: string;
  onToggleHeart: (entry: ShowtimeChoiceShelfEntry) => void;
  itemHearts: Record<string, ShowtimeChoiceItemHeartState>;
  itemHeartBusy: Record<string, boolean>;
  onToggleItemHeart: (item: AipogerChoiceItem) => void;
};

function recordKey(entry: ShowtimeChoiceShelfEntry) {
  return `${entry.kind}:${entry.id}`;
}

function shareUrl(entry: ShowtimeChoiceShelfEntry) {
  return entry.href || "/rank#choice-weekly";
}

function choiceDateLabel(value: string, lang: Lang) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  if (lang === "zh" || lang === "ko") return `${match[1]}.${match[2]}.${match[3]}`;
  if (lang === "ja") return `${match[1]}/${match[2]}/${match[3]}`;
  return `${match[1]}-${match[2]}-${match[3]}`;
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
  lang,
  loading = false,
  onPlay,
  hearts,
  heartBusy,
  heartError,
  onToggleHeart,
  itemHearts,
  itemHeartBusy,
  onToggleItemHeart,
}: ShowtimeChoiceShelfProps) {
  const copy = getChoiceCopy(lang);
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
            {copy.buildMyChoice}
          </Link>
        </div>

        {loading && entries.length === 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" role="status" aria-label={copy.loading}>
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-md border border-yellow-100/10 bg-black/35 p-2">
                <div className="aspect-square rounded-md bg-white/[0.08]" />
                <div className="mt-3 h-4 w-4/5 rounded bg-white/[0.08]" />
                <div className="mt-2 h-3 w-3/5 rounded bg-white/[0.06]" />
              </div>
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {entries.map((entry) => {
              const key = recordKey(entry);
              const heart = hearts[key] ?? { heartCount: 0, myHeart: false };
              const playable = entry.items.some((item) => Boolean(item.audioUrl));
              return (
                <article key={key} className="group min-w-0 rounded-md border border-yellow-100/20 bg-black/35 p-2 shadow-[0_10px_26px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-yellow-100/40 sm:p-1.5">
                  <div className="group relative aspect-square overflow-hidden rounded-md bg-[#090909]">
                    <AipogerChoiceCover src={entry.coverUrl} alt={`${entry.curatorName} Choice`} className="absolute inset-0 transition duration-300 group-hover:scale-[1.025]" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                    <button
                      type="button"
                      onClick={() => onPlay(entry)}
                      disabled={!playable}
                      className="absolute bottom-2 left-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_8px_18px_rgba(0,0,0,0.44)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={copy.playTrack(entry.title)}
                    >
                      <Play className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                  </div>
                  <div className="px-0.5 pb-0.5 pt-2">
                    <button type="button" onClick={() => setDetail(entry)} className="block w-full line-clamp-2 min-h-[2.3rem] text-left text-[13px] font-black leading-[1.15rem] text-white transition hover:text-orange-100 sm:min-h-10 sm:text-sm sm:leading-5" title={entry.title}>
                      {entry.title}
                    </button>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-black sm:mt-0.5 sm:text-[11px]">
                      <p className="truncate text-cyan-100">{entry.curatorName}</p>
                      <time dateTime={entry.weekStart} className="shrink-0 tabular-nums text-orange-200/75">{choiceDateLabel(entry.weekStart, lang)}</time>
                    </div>
                    {entry.intro ? <p className="mt-1.5 line-clamp-2 text-[11px] font-bold leading-4 text-zinc-400 sm:text-[11px]">{entry.intro}</p> : null}
                    <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2">
                      <button
                        type="button"
                        onClick={() => onToggleHeart(entry)}
                        disabled={Boolean(heartBusy[key])}
                        className={`aipo-ghost-button inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${heart.myHeart ? "border-rose-200/45 bg-rose-500/20 text-rose-100" : "text-zinc-200 hover:text-white"}`}
                        aria-label={heart.myHeart ? copy.removeChoice : copy.favoriteChoice}
                        title={heart.myHeart ? copy.removeChoice : copy.favoriteChoice}
                      >
                        <Heart className="h-3.5 w-3.5" fill={heart.myHeart ? "currentColor" : "none"} />
                        <span className="tabular-nums">{heart.heartCount}</span>
                      </button>
                      <ShareButton
                        title={entry.title}
                        text={entry.intro || entry.title}
                        url={shareUrl(entry)}
                        label={copy.shareChoice}
                        copiedLabel={copy.copied}
                        iconOnly
                        className="h-7 w-7 rounded-full p-0 text-cyan-100"
                      />
                      <button
                        type="button"
                        onClick={() => setCommentsEntry(entry)}
                        className="aipo-ghost-button inline-flex h-7 w-7 items-center justify-center rounded-full text-cyan-100 transition hover:text-white"
                        aria-label={copy.viewComments}
                        title={copy.comments}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>
                      <div className="group/tracklist relative ml-auto">
                        <button
                          type="button"
                          onClick={() => setDetail(entry)}
                          className="aipo-ghost-button inline-flex h-7 w-7 items-center justify-center rounded-full text-cyan-100 transition hover:text-white"
                          aria-label={copy.previewTracklist}
                          title={copy.hoverToPreview}
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
            {copy.noPublished}
          </p>
        )}
        {heartError ? <p className="mt-3 text-xs font-bold text-rose-200">{heartError}</p> : null}
      </section>

      {detail && typeof document !== "undefined" ? createPortal((
        <div className="fixed inset-0 z-[230] flex items-end bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={copy.tracklistPreview} onClick={() => setDetail(null)}>
          <section className="max-h-[82vh] w-full max-w-3xl overflow-hidden rounded-lg border border-yellow-100/25 bg-[#080808] shadow-[0_28px_100px_rgba(0,0,0,0.78)]" onClick={(event) => event.stopPropagation()}>
            <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/10 px-4 py-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:px-5">
              <div className="col-start-1 row-start-1 min-w-0 self-center">
                <h2 className="line-clamp-2 text-xl font-black text-white">{detail.title}</h2>
                <time dateTime={detail.weekStart} className="mt-1 block text-xs font-black tabular-nums text-zinc-500">{choiceDateLabel(detail.weekStart, lang)}</time>
              </div>
              {detail.intro ? <p className="col-span-2 col-start-1 row-start-2 text-sm font-bold leading-6 text-zinc-300 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:self-center">{detail.intro}</p> : <span className="hidden sm:block" />}
              <button type="button" onClick={() => setDetail(null)} className="col-start-2 row-start-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white sm:col-start-3" aria-label={copy.closeTracklist}><X className="h-4 w-4" /></button>
            </header>
            <div className="max-h-[58vh] overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.items.map((item, index) => {
                  const itemKey = choiceItemRecordKey(item);
                  const itemHeart = itemHearts[itemKey] ?? { heartCount: 0, myHeart: false };
                  return (
                    <article key={item.itemId} className="grid min-w-0 grid-cols-[1.5rem_2.75rem_minmax(0,1fr)_2.25rem_2.25rem] items-center gap-2 rounded border border-white/10 bg-white/[0.025] p-2">
                      <span className="text-center text-[10px] font-black tabular-nums text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.coverUrl} alt="" className="h-11 w-11 rounded object-cover" />
                      <span className="min-w-0"><span className="block truncate text-xs font-black text-white">{item.title}</span><span className="mt-0.5 block truncate text-[11px] font-bold text-zinc-500">{item.artist}</span></span>
                      <button
                        type="button"
                        onClick={() => onToggleItemHeart(item)}
                        disabled={Boolean(itemHeartBusy[itemKey])}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition disabled:cursor-wait disabled:opacity-45 ${itemHeart.myHeart ? "border-rose-200/55 bg-rose-500/20 text-rose-200" : "border-white/12 text-zinc-400 hover:border-rose-200/45 hover:text-rose-200"}`}
                        aria-label={itemHeart.myHeart ? copy.removeTrack(item.title) : copy.favoriteTrack(item.title)}
                        aria-pressed={itemHeart.myHeart}
                      >
                        <Heart className="h-4 w-4" fill={itemHeart.myHeart ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onPlay(detail, item.itemId);
                          setDetail(null);
                        }}
                        disabled={!item.audioUrl}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={copy.playTrack(item.title)}
                      >
                        <Play className="h-4 w-4" fill="currentColor" />
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <button type="button" onClick={() => {
                onPlay(detail);
                setDetail(null);
              }} disabled={!detail.items.some((item) => Boolean(item.audioUrl))} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-xs font-black text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-35" aria-label={copy.playAll}>
                <Play className="h-4 w-4" fill="currentColor" />{copy.playAll}
              </button>
              {detail.href ? <Link href={detail.href} className="text-xs font-black text-cyan-100 hover:text-white">{copy.openSharePage}</Link> : null}
            </footer>
          </section>
        </div>
      ), document.body) : null}

      {commentsEntry ? (
        <ChoiceCommentsDialog
          open
          collectionKind={commentsEntry.kind}
          collectionId={commentsEntry.id}
          title={commentsEntry.title}
          isZh={lang === "zh"}
          onClose={() => setCommentsEntry(null)}
        />
      ) : null}
    </>
  );
}
