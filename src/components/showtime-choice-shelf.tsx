"use client";

import Link from "next/link";
import { Heart, ListMusic, MessageCircle, Play, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ChoiceCommentsDialog from "@/components/choice-comments-dialog";
import ShareButton from "@/components/share-button";
import { AipogerChoiceCover } from "@/components/aipoger-choice-cover";
import { choiceItemRecordKey, type AipogerChoiceItem } from "@/lib/aipoger-choice";
import { getChoiceCopy } from "@/lib/choice-copy";
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
  featuredKey?: string | null;
  chart?: ReactNode;
  lang: Lang;
  loading?: boolean;
  loadError?: string;
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
  featuredKey,
  chart,
  lang,
  loading = false,
  loadError,
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
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [commentsKey, setCommentsKey] = useState<string | null>(null);
  const detail = entries.find((entry) => recordKey(entry) === detailKey) ?? null;
  const commentsEntry = entries.find((entry) => recordKey(entry) === commentsKey) ?? null;
  const setDetail = (entry: ShowtimeChoiceShelfEntry | null) => setDetailKey(entry ? recordKey(entry) : null);
  const setCommentsEntry = (entry: ShowtimeChoiceShelfEntry | null) => setCommentsKey(entry ? recordKey(entry) : null);
  const editorial = {
    zh: { featured: "本期主推", choices: "Choice 歌單", more: "更多 Choice" },
    en: { featured: "Featured Choice", choices: "Choice Playlists", more: "More Choices" },
    ja: { featured: "注目の Choice", choices: "Choice プレイリスト", more: "もっと Choice" },
    ko: { featured: "추천 Choice", choices: "Choice 플레이리스트", more: "더 많은 Choice" },
  }[lang];
  const playableEntries = entries.filter((entry) => entry.items.some((item) => Boolean(item.audioUrl)));
  const featured = playableEntries.find((entry) => recordKey(entry) === featuredKey);
  const lead = featured ?? playableEntries[0];
  const remaining = playableEntries.filter((entry) => entry !== lead);
  const side = remaining.slice(0, 1);
  const more = remaining.slice(1);

  useEffect(() => {
    if (!detail) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailKey(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [detail]);

  useEffect(() => {
    if (detailKey && !detail) setDetailKey(null);
    if (commentsKey && !commentsEntry) setCommentsKey(null);
  }, [detailKey, detail, commentsKey, commentsEntry]);

  function renderCard(entry: ShowtimeChoiceShelfEntry, large = false) {
              const key = recordKey(entry);
              const heart = hearts[key] ?? { heartCount: 0, myHeart: false };
              const playable = entry.items.some((item) => Boolean(item.audioUrl));
              return (
                <article key={key} data-choice-key={key} className="group min-w-0">
                  <div className="group relative aspect-square overflow-hidden bg-[#222]">
                    <AipogerChoiceCover src={entry.coverUrl} alt={`${entry.curatorName} Choice`} className="absolute inset-0 transition duration-300 group-hover:scale-[1.025]" />
                    <button type="button" onClick={() => setDetail(entry)} aria-label={`${copy.previewTracklist}: ${entry.title}`} className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-400" />
                    <button
                      type="button"
                      onClick={() => onPlay(entry)}
                      disabled={!playable}
                      className={`absolute bottom-3 left-3 inline-flex items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-35 ${large ? "h-12 w-12" : "h-10 w-10"}`}
                      aria-label={copy.playTrack(entry.title)}
                    >
                      <Play className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                  </div>
                  <div className="pt-3">
                    <button type="button" onClick={() => setDetail(entry)} className={`block w-full break-words text-left font-bold leading-snug text-white hover:text-orange-200 ${large ? "text-xl sm:text-2xl" : "line-clamp-2 text-sm"}`} title={entry.title}>
                      {entry.title}
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                      <p className="min-w-0 truncate text-cyan-200">{entry.curatorName}</p>
                      <time dateTime={entry.weekStart} className="tabular-nums text-zinc-500">{choiceDateLabel(entry.weekStart, lang)}</time>
                    </div>
                    {large && entry.intro ? <p className="mt-2 line-clamp-1 text-sm leading-6 text-zinc-400">{entry.intro}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
                      <button
                        type="button"
                        onClick={() => onToggleHeart(entry)}
                        disabled={Boolean(heartBusy[key])}
                        className={`aipo-ghost-button inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full px-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${heart.myHeart ? "border-rose-200/45 bg-rose-500/20 text-rose-100" : "text-zinc-200 hover:text-white"}`}
                        aria-label={heart.myHeart ? copy.removeChoice : copy.favoriteChoice}
                        aria-pressed={heart.myHeart}
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
  }

  return (
    <>
      <div className="grid items-start gap-x-7 gap-y-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)]" data-showtime-editorial>
        <section id="choice-weekly" className="min-w-0 scroll-mt-24 lg:col-start-1 lg:row-start-1" aria-labelledby="choice-heading">
          <h2 id="choice-heading" className="mb-4 text-xl font-bold">{featured ? editorial.featured : editorial.choices}</h2>
          {lead ? <div className={`grid items-start gap-5 ${side.length ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]" : "max-w-lg"}`}>
            <div data-choice-lead>{renderCard(lead, true)}</div>
            {side.length > 0 && <div className="hidden gap-6 lg:grid">{side.map((entry) => renderCard(entry))}</div>}
          </div> : loading ? <div role="status" aria-label={copy.loading} className="aspect-square max-w-lg animate-pulse bg-white/5" /> : !loadError ? <p className="py-6 text-sm text-zinc-400">{copy.noPublished}</p> : null}
          {heartError ? <p role="alert" className="mt-3 text-xs font-bold text-rose-200">{heartError}</p> : null}
        </section>
        {chart && <aside className="min-w-0 border-t border-white/15 pt-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" data-showtime-chart>{chart}</aside>}
        {remaining.length > 0 && <section className={`min-w-0 lg:col-start-1 lg:row-start-2 ${more.length === 0 ? "lg:hidden" : ""}`} aria-labelledby="more-choice-heading" data-choice-more>
          <h2 id="more-choice-heading" className="mb-4 text-xl font-bold">{editorial.more}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {side.map((entry) => <div key={recordKey(entry)} className="min-w-0 lg:hidden">{renderCard(entry)}</div>)}
            {more.map((entry) => renderCard(entry))}
          </div>
        </section>}
      </div>

      {detail && typeof document !== "undefined" ? createPortal((
        <div className="fixed inset-0 z-[230] flex items-end bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={copy.tracklistPreview} onClick={() => setDetail(null)}>
          <section className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-yellow-100/25 bg-[#080808] shadow-[0_28px_100px_rgba(0,0,0,0.78)]" onClick={(event) => event.stopPropagation()}>
            <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/10 px-4 py-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:px-5">
              <div className="col-start-1 row-start-1 min-w-0 self-center">
                <h2 className="line-clamp-2 break-words text-xl font-black text-white">{detail.title}</h2>
                <time dateTime={detail.weekStart} className="mt-1 block text-xs font-black tabular-nums text-zinc-500">{choiceDateLabel(detail.weekStart, lang)}</time>
              </div>
              {detail.intro ? <p className="col-span-2 col-start-1 row-start-2 max-h-24 overflow-y-auto break-words text-sm font-bold leading-6 text-zinc-300 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:self-center">{detail.intro}</p> : <span className="hidden sm:block" />}
              <button type="button" onClick={() => setDetail(null)} className="col-start-2 row-start-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white sm:col-start-3" aria-label={copy.closeTracklist}><X className="h-4 w-4" /></button>
            </header>
            <div className="min-h-0 max-h-[58vh] overflow-y-auto p-3 sm:p-4">
              {heartError ? <p role="alert" className="mb-3 text-xs font-bold text-rose-200">{heartError}</p> : null}
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
            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
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
