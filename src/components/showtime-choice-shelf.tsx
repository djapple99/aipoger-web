"use client";

import Link from "next/link";
import { Heart, ListMusic, MessageCircle, Play, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ChoiceCommentsDialog from "@/components/choice-comments-dialog";
import ShareButton from "@/components/share-button";
import { AipogerChoiceCover } from "@/components/aipoger-choice-cover";
import { choiceItemRecordKey, type AipogerChoiceItem } from "@/lib/aipoger-choice";
import { choiceSharePath } from "@/lib/choice-share";
import { getChoiceCopy } from "@/lib/choice-copy";
import type { Lang } from "@/lib/locale";
import { showtimeCopy } from "@/lib/showtime-copy";
import styles from "./showtime.module.css";

export type ShowtimeChoiceShelfEntry = {
  id: string;
  kind: "official" | "creator";
  curatorName: string;
  coverUrl: string;
  title: string;
  intro: string;
  weekStart: string;
  publishedAt?: string | null;
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
  commentCounts?: Record<string, number>;
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

function shareUrl(entry: ShowtimeChoiceShelfEntry, lang: Lang) {
  return choiceSharePath(entry.id, entry.kind, lang, entry.coverUrl);
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
  commentCounts,
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
  const editorial = showtimeCopy(lang);
  const [sort, setSort] = useState<"featured" | "latest" | "saved">("featured");
  const playableEntries = entries.filter((entry) => entry.items.some((item) => Boolean(item.audioUrl)));
  const ordered = [...playableEntries].sort((a, b) => {
    if (sort === "saved") {
      const difference = (hearts[recordKey(b)]?.heartCount ?? 0) - (hearts[recordKey(a)]?.heartCount ?? 0);
      if (difference) return difference;
    }
    return (b.publishedAt || b.weekStart).localeCompare(a.publishedAt || a.weekStart) || recordKey(a).localeCompare(recordKey(b));
  });
  const featured = sort === "featured" ? ordered.find((entry) => recordKey(entry) === featuredKey) : undefined;
  const lead = featured ?? ordered[0];
  const remaining = ordered.filter((entry) => entry !== lead);
  const companions = remaining.slice(0, 4);
  const more = remaining.slice(4);

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

  function renderCard(entry: ShowtimeChoiceShelfEntry, mode: "lead" | "tile" | "wide" = "tile") {
    const key = recordKey(entry);
    const heart = hearts[key] ?? { heartCount: 0, myHeart: false };
    const isLead = mode === "lead";
    return <article key={key} data-choice-key={key} data-choice-lead={isLead || undefined} className={isLead ? styles.lead : mode === "wide" ? styles.wide : undefined}>
      <div className={styles.cover}>
        <AipogerChoiceCover src={entry.coverUrl} alt={`${entry.curatorName} Choice`} className="absolute inset-0" />
        <button type="button" className={styles.coverButton} onClick={() => setDetail(entry)} aria-label={`${copy.previewTracklist}: ${entry.title}`} />
        {!isLead ? <button type="button" className={styles.coverPlay} onClick={() => onPlay(entry)} aria-label={copy.playTrack(entry.title)}><Play size={17} fill="currentColor" /></button> : null}
      </div>
      <div className={styles.info}>
        <button type="button" onClick={() => setDetail(entry)} className={styles.title} title={entry.title}>{entry.title}</button>
        <p className={styles.curator}>{entry.curatorName}</p>
        {isLead && entry.intro ? <p className={styles.intro}>{entry.intro}</p> : null}
        <p className={styles.metadata}>{entry.items.length} {editorial.tracks}<time dateTime={entry.weekStart}>{choiceDateLabel(entry.weekStart, lang)}</time></p>
        {isLead ? <button type="button" className={styles.playLead} onClick={() => onPlay(entry)} aria-label={copy.playTrack(entry.title)}><Play size={19} fill="currentColor" />{editorial.play}</button> : null}
        <div className={styles.actions}>
          <button type="button" onClick={() => onToggleHeart(entry)} disabled={Boolean(heartBusy[key])} className={styles.heart} aria-label={heart.myHeart ? copy.removeChoice : copy.favoriteChoice} aria-pressed={heart.myHeart} title={heart.myHeart ? copy.removeChoice : copy.favoriteChoice}>
            <Heart size={isLead ? 26 : 20} fill={heart.myHeart ? "currentColor" : "none"} /><span className="tabular-nums">{heartBusy[key] ? "–" : heart.heartCount}</span>
          </button>
          <button type="button" onClick={() => setCommentsEntry(entry)} aria-label={copy.viewComments} title={copy.comments}><MessageCircle size={isLead ? 24 : 19} /><span>{commentCounts ? commentCounts[key] ?? 0 : "–"}</span></button>
          <ShareButton title={entry.title} text={entry.intro || entry.title} url={shareUrl(entry, lang)} label={copy.shareChoice} copiedLabel={copy.copied} iconOnly iconSize={isLead ? 22 : 19} />
          <div className={styles.tracklist}>
            <button type="button" onClick={() => setDetail(entry)} aria-label={copy.previewTracklist} title={copy.hoverToPreview}><ListMusic size={isLead ? 23 : 19} /></button>
            <div className={styles.tracklistPreview}><p className="mb-2 text-sm font-bold">{entry.title}</p><TracklistPreview entry={entry} /></div>
          </div>
        </div>
      </div>
    </article>;
  }

  return (
    <>
      <section id="choice-weekly" className="min-w-0 scroll-mt-24" aria-labelledby="choice-heading">
        <header className={styles.shelfHeader}>
          <h2 id="choice-heading">{editorial.choices}</h2>
          <div className={styles.sorts} role="group" aria-label={editorial.choices}>
            {(["featured", "latest", "saved"] as const).map(value => <button key={value} type="button" onClick={() => setSort(value)} aria-pressed={sort === value}>{editorial[value]}</button>)}
          </div>
        </header>
        {lead ? <div data-choice-feature-grid>
          {renderCard(lead, "lead")}
          {companions.length > 0 ? <div className={`${styles.tiles} ${companions.length <= 2 ? styles.fewTiles : ""}`}>
            {companions.map(entry => renderCard(entry))}
          </div> : null}
          {more.map(entry => renderCard(entry, "wide"))}
        </div> : loading ? <p role="status" className="py-6 text-sm text-zinc-400">{copy.loading}</p> : !loadError ? <p className="py-6 text-sm text-zinc-400">{copy.noPublished}</p> : null}
        {heartError ? <p role="alert" className="mt-3 text-sm text-orange-200">{heartError}</p> : null}
      </section>
      {chart ? <aside>{chart}</aside> : null}

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
          lang={lang}
          onClose={() => setCommentsEntry(null)}
        />
      ) : null}
    </>
  );
}
