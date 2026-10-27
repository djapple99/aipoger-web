"use client";
import ParticipationGuide from "./participation-guide";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, MessageCircleMore, Play, Search, X } from "lucide-react";
import EditorialHeader from "@/components/editorial-header";
import WorkImage from "@/components/work-image";
import { isNewlyPublishedMusic } from "@/lib/music-newness";
import { albumCopy } from "@/lib/album-copy";
import dynamic from "next/dynamic";
const HomeWorkFeedback = dynamic(() => import("@/components/home-work-feedback"));
import ShareButton from "@/components/share-button";
import { useI18n } from "@/lib/i18n";
import { homeCopy } from "@/lib/home-copy";
import { mvCopy } from "@/lib/mv-copy";
import { filterMvWorks, type MvDiscovery, type MvSort, type MvWork } from "@/lib/mv-discovery";
import type { HomeWork } from "@/lib/home-discovery";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import { useMvHearts } from "@/lib/use-mv-hearts";
import base from "./home-editorial.module.css";
import styles from "./mv-gallery.module.css";

function MvShare({ work, className = "" }: { work: HomeWork; className?: string }) {
  const { lang } = useI18n(); const mv = mvCopy(lang);
  return <ShareButton title={work.title} text={`${work.artist} · ${work.title}`}
    url={`/works/${encodeURIComponent(work.id)}?lang=${lang}`} label={`${mv.share} · ${work.title}`}
    copiedLabel={mv.copied} sharedLabel={mv.shared} manualCopyLabel={mv.manualCopy} linkLabel={mv.shareLink}
    iconOnly iconSize={28} className={`!rounded !border-0 !bg-transparent !p-1 ${className}`} />;
}

export default function MvGallery({ initialData }: { initialData?: MvDiscovery } = {}) {
  const { lang, t } = useI18n(); const copy = homeCopy(lang); const mv = mvCopy(lang);
  const [data, setData] = useState<MvDiscovery | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData); const [failed, setFailed] = useState(false);
  const [viewAutoPlay, setViewAutoPlay] = useState(false);
  const [queue, setQueue] = useState<HomeWork[] | null>(null);
  const [queueEnded, setQueueEnded] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const lastAdvance = useRef<string | null>(null);
  const [pendingEnd, setPendingEnd] = useState(false);
  const [feedbackWork, setFeedbackWork] = useState<HomeWork | null>(null);
  const [sharedUnavailable, setSharedUnavailable] = useState(false);
  const sharedTrack = useRef<string | null>(null);
  const [query, setQuery] = useState(""); const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<MvSort>("latest"); const [limit, setLimit] = useState(12);
  const player = useMusicPlayer();
  const router = useRouter();
  const support = useMvHearts((data?.works ?? []).map(work => work.id));
  const withLang = (path: string) => { const [url, hash] = path.split("#"); return `${url}${url.includes("?") ? "&" : "?"}lang=${lang}${hash ? `#${hash}` : ""}`; };
  const [chartExpanded, setChartExpanded] = useState(false);
  const effectiveSort = sort === "popular" && data?.rankedIds == null ? "latest" : sort;
  const works = filterMvWorks(data?.works ?? [], query, genre, effectiveSort, data?.rankedIds);
  const promoted = data?.promotion?.work;
  const newest = filterMvWorks(data?.works ?? [], query, genre, "latest").slice(0, 4);
  const rankById = new Map((data?.rankedIds ?? []).map((id, index) => [id, index + 1]));
  const chart = filterMvWorks(data?.works ?? [], query, genre, "popular", data?.rankedIds).filter(work => rankById.has(work.id)).slice(0, 50);
  const channels = filterMvWorks(data?.channels ?? [], query, genre, "latest");
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/mv/discovery", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const next: MvDiscovery = await response.json();
      if (!Array.isArray(next.works) || !Array.isArray(next.featured) || !Array.isArray(next.channels)) throw new Error("Invalid MV response");
      if (!signal?.aborted) {
        setData(next); setFailed(false);
        const publicIds = new Set(next.works.map(work => work.id));
        setQueue(current => current ? current.filter(work => publicIds.has(work.id)) : current);
        setFeedbackWork(current => current && !publicIds.has(current.id) ? null : current);
      }
    } catch { if (!signal?.aborted) setFailed(true); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const endsAt = data?.promotion?.endsAt;
    if (!endsAt) return;
    const timer = window.setTimeout(() => void load(), Math.max(0, Date.parse(endsAt) - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [data?.promotion?.endsAt, load]);

  useEffect(() => {
    const controller = new AbortController(); void load(controller.signal);
    const refresh = () => { if (!document.hidden) void load(controller.signal); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("aipoger:music-heart", refresh); window.addEventListener("aipoger:mv-rating", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("aipoger:music-heart", refresh); window.removeEventListener("aipoger:mv-rating", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  useEffect(() => {
    if (!data || sharedTrack.current) return;
    const id = new URLSearchParams(window.location.search).get("track");
    if (!id) return;
    sharedTrack.current = id;
    const work = data.works.find(item => item.id === id && item.videoId);
    if (work) {
      // Open the original MV/comment view; the visitor still presses Play.
      setFeedbackWork(work);
    } else setSharedUnavailable(true);
  }, [data]);
  useEffect(() => { if (player.playing) setViewAutoPlay(false); }, [player.playing]);
  const openFeedback = (work: HomeWork, play = false) => {
    if (play && player.playing) musicPlayer?.toggle();
    setQueue(null); setPendingEnd(false); setQueueEnded(false); setReviewBusy(false); setViewAutoPlay(play); setFeedbackWork(work);
  };
  const watch = (work: HomeWork) => { if (work.videoId) openFeedback(work, true); };
  const startQueue = () => {
    const playlist = filterMvWorks(data?.works ?? [], query, genre, effectiveSort, data?.rankedIds);
    if (!playlist.length) return;
    if (player.playing) musicPlayer?.toggle();
    lastAdvance.current = null; setPendingEnd(false); setQueue(playlist); setQueueEnded(false); setViewAutoPlay(true); setFeedbackWork(playlist[0]);
  };
  const queueIndex = queue?.findIndex(work => work.id === feedbackWork?.id) ?? -1;
  const stepQueue = (direction: number, automatic = false) => {
    if (!queue || !feedbackWork) return;
    if (reviewBusy) { if (automatic) setPendingEnd(true); return; }
    setPendingEnd(false);
    if (automatic && lastAdvance.current === feedbackWork.id) return;
    lastAdvance.current = feedbackWork.id;
    const next = queue[queueIndex + direction];
    if (!next) { setQueueEnded(true); return; }
    setQueueEnded(false); setViewAutoPlay(true); setFeedbackWork(next);
  };
  useEffect(() => {
    if (!pendingEnd || reviewBusy || !queue || !feedbackWork) return;
    setPendingEnd(false);
    const next = queue[queue.findIndex(work => work.id === feedbackWork.id) + 1];
    if (next) { setQueueEnded(false); setViewAutoPlay(true); setFeedbackWork(next); }
    else setQueueEnded(true);
  }, [pendingEnd, reviewBusy, queue, feedbackWork]);
  const sendHeart = async (work: HomeWork) => {
    if (await support.toggle(work.id) === "login") router.push(`/auth?lang=${lang}&next=${encodeURIComponent(`/mv?lang=${lang}`)}`);
  };
  const reset = () => { setQuery(""); setGenre(""); setSort("latest"); setLimit(12); };
  const ratingText = (work: MvWork) => work.workKind === "album" ? albumCopy(lang).label
    : work.ratingCount && Number.isFinite(work.ratingAverage) ? `${work.ratingAverage!.toFixed(1)} / 10 · ${work.ratingCount} ${mv.raters}` : mv.unrated;
  const collectionText = (work: MvWork) => typeof work.favoriteCount === "number"
    ? mv.collections.replace("{count}", String(work.favoriteCount)) : mv.collectionsUnavailable;
  const heartButton = (work: MvWork) => <button className={styles.cardHeart} onClick={() => void sendHeart(work)}
    aria-label={`${support.hearts[work.id] ? copy.removeHeart : copy.sendHeart} · ${work.title}`}
    title={support.hearts[work.id] ? copy.removeHeart : copy.sendHeart} aria-pressed={Boolean(support.hearts[work.id])}
    aria-busy={support.busyId === work.id} disabled={!support.ready || support.busyId !== null || support.error === "read"}>
    <Heart size={28} strokeWidth={1.9} fill={support.hearts[work.id] ? "currentColor" : "none"} />
  </button>;
  const renderCard = (work: MvWork, priority = false) => <article key={work.id} className={styles.card} data-work-id={work.id}>
    <button className={styles.cardPoster} onClick={() => watch(work)} aria-label={`${copy.watch} · ${work.title}`}>
      <WorkImage work={work} video priority={priority} />
      {isNewlyPublishedMusic(work.publishedAt, new Date(data?.generatedAt ?? Date.now())) ? <span className={styles.newBadge}>NEW</span> : null}
      <span className={styles.cardPlay}><Play size={20} fill="currentColor" /></span><span className={base.videoSource}>YouTube</span>
    </button>
    <div className={styles.cardTitleRow}><h3 title={work.title}><Link prefetch={false} href={`/works/${encodeURIComponent(work.id)}?lang=${lang}`}>{work.title}</Link></h3>
      <div className={styles.cardActions}>{heartButton(work)}<button className={styles.cardComments} onClick={() => openFeedback(work)} title={mv.readComments} aria-label={`${mv.readComments} · ${work.title}`}><MessageCircleMore size={28} strokeWidth={1.9} /></button><MvShare work={work} className={styles.cardShare} /></div>
    </div><p className={styles.cardArtist}>{work.artist}</p><p className={styles.cardStats}><span>{ratingText(work)}</span><span>{collectionText(work)}</span></p>
  </article>;
  return <div className={base.page}>
    <EditorialHeader active="mv" />
    <main className={`${base.main} ${styles.main}`}>
      {sharedUnavailable ? <p role="status" className={styles.supportError}>{mv.sharedUnavailable}</p> : null}
      <section id="featured-mv" className={styles.pageIntro} aria-labelledby="mv-page-title">
        <div className={base.sectionIntro}><p className={base.eyebrow}>MUSIC VIDEO</p><h1 id="mv-page-title">{mv.title}</h1><p className={base.intro}>{mv.intro}</p></div>
        <div className={styles.controls}>
          <label className={styles.search}><Search size={18} /><input type="search" aria-label={mv.search} placeholder={mv.search} value={query} onChange={event => { setQuery(event.target.value); setLimit(12); }} />{query ? <button onClick={() => { setQuery(""); setLimit(12); }} aria-label={mv.clear}><X size={16} /></button> : null}</label>
          <select aria-label={mv.all} value={genre} onChange={event => { setGenre(event.target.value); setLimit(12); }}><option value="">{mv.all}</option>{MUSIC_GENRE_OPTIONS.filter(option => data?.works.some(work => work.genre === option.value) || data?.channels.some(work => work.genre === option.value)).map(option => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}</select>
          <button className={styles.continuousButton} type="button" onClick={startQueue} disabled={!works.length} title={mv.queueNote}><Play size={17} fill="currentColor" />{mv.continuous}</button>
          <ParticipationGuide surface="mv" lang={lang} />
        </div>
      </section>
      {loading && !data ? <div className={base.status} role="status">{copy.loading}</div>
        : failed && !data ? <div className={base.status} role="alert"><p>{copy.error}</p><button onClick={() => { setLoading(true); void load(); }}>{copy.retry}<ArrowRight size={18} /></button></div> : null}
      {failed && data ? <div className={base.refreshError} role="status">{copy.error}<button onClick={() => void load()}>{copy.retry}</button></div> : null}
      {support.error ? <div role="alert" className={styles.supportError}>{support.error === "read" ? mv.heartReadError : mv.heartWriteError}{support.error === "read" ? <button onClick={() => void support.reload()}>{copy.retry}</button> : null}</div> : null}
      {data ? <>
        {promoted ? <section className={`${base.hero} ${styles.promotion}`} aria-label={copy.seasonal} data-promoted-work={promoted.id}>
          <div className={base.video}>
            <button className={base.poster} onClick={() => watch(promoted)} aria-label={`${copy.watch} · ${promoted.title}`}>
              <WorkImage work={promoted} video priority />
              <span className={base.posterPlay}><Play size={27} fill="currentColor" /></span><span className={base.videoSource}>{copy.source}</span>
            </button>
          </div>
          <div className={base.workInfo}>
            <p className={base.workLabel}>{copy.seasonal}</p>
            <h2 title={promoted.title}><Link prefetch={false} href={`/works/${encodeURIComponent(promoted.id)}?lang=${lang}`}>{promoted.title}</Link></h2>
            <p className={base.artist}>{promoted.artist}</p>
            <button className={base.primary} onClick={() => watch(promoted)}><Play size={21} fill="currentColor" />{copy.watch}</button>
            <div className={styles.promotionActions}>{heartButton(promoted)}<button className={styles.cardComments} onClick={() => openFeedback(promoted)} aria-label={`${mv.readComments} · ${promoted.title}`}><MessageCircleMore size={28} /></button><MvShare work={promoted} className={styles.cardShare} /></div>
          </div>
        </section> : null}
        <div className={styles.discoveryStage}>
          <aside className={`${styles.chart} ${chartExpanded ? styles.chartExpanded : ""}`} aria-labelledby="mv-chart-title">
            <div className={styles.sectionHeading}><h2 id="mv-chart-title">{mv.ranking}</h2><button className={styles.chartToggle} aria-expanded={chartExpanded} aria-controls="mv-chart-rows" onClick={() => setChartExpanded(value => !value)}>{chartExpanded ? mv.collapseChart : mv.expandChart}</button></div>
            <p className={styles.sectionNote}>{mv.rankingNote}</p>
            <div id="mv-chart-rows" className={styles.chartRows}>
              {data.rankedIds == null ? <div role="status" className={styles.chartStatus}><p>{mv.rankingError}</p><button onClick={() => void load()}>{copy.retry}</button></div>
                : !chart.length ? <p className={styles.chartStatus}>{mv.rankingEmpty}</p>
                : <ol>{chart.map(work => <li key={work.id} data-work-id={work.id}>
                  <span className={styles.rank}>{String(rankById.get(work.id)).padStart(2, "0")}</span>
                  <button className={styles.rankPoster} onClick={() => watch(work)} aria-label={`${copy.watch} · ${work.title}`}><WorkImage work={work} video /><Play size={14} fill="currentColor" /></button>
                  <div className={styles.rankInfo}><button className={styles.rankTitle} title={work.title} onClick={() => openFeedback(work)}>{work.title}</button><p>{work.artist}</p><div className={styles.rankStats}><span>{ratingText(work)}</span><span>{collectionText(work)}</span></div></div>{heartButton(work)}
                </li>)}</ol>}
            </div>
          </aside>
          <section className={styles.newest} aria-labelledby="mv-newest-title">
            <div className={styles.sectionHeading}><h2 id="mv-newest-title">{mv.newest}</h2></div><p className={styles.sectionNote}>{mv.newestNote}</p>
            <div className={styles.newestGrid}>{newest.map((work, index) => renderCard(work, index < 2))}</div>
            {!newest.length ? <div className={styles.noResults}><p>{mv.noResults}</p><button onClick={reset}>{mv.reset}<ArrowRight size={17} /></button></div> : null}
          </section>
        </div>
        <section id="mv-catalog" className={styles.catalog} aria-labelledby="mv-catalog-title">
          <div className={styles.catalogHeading}><h2 id="mv-catalog-title">{mv.catalogTitle}</h2><div className={styles.sorts} aria-label={mv.catalogTitle}>{(["latest", "popular"] as const).map(value => <button key={value} disabled={value === "popular" && data.rankedIds == null} aria-pressed={effectiveSort === value} onClick={() => { setSort(value); setLimit(12); }}>{mv[value]}</button>)}</div><p className={styles.catalogCount} role="status">{works.length} {mv.count}</p>{works.length > limit ? <button className={styles.viewAll} onClick={() => setLimit(works.length)}>{mv.viewAll}<ArrowRight size={17} /></button> : null}</div>
          <div className={styles.grid}>{works.slice(0, limit).map(work => renderCard(work))}</div>
          {!works.length ? <div className={styles.noResults}><p>{mv.noResults}</p><button onClick={reset}>{mv.reset}<ArrowRight size={17} /></button></div> : null}
          {works.length > limit ? <div className={styles.more}><button onClick={() => setLimit(current => current + 12)}>{mv.loadMore}<span>{Math.min(limit, works.length)} / {works.length}</span></button></div> : null}
        </section>
        {channels.length ? <section className={styles.channels} aria-labelledby="mv-channels-title"><h2 id="mv-channels-title">{mv.channels}</h2><p>{mv.channelNote}</p><div>{channels.map(work => <a key={work.id} href={work.channelUrl} target="_blank" rel="noopener noreferrer"><WorkImage work={work} /><span><strong>{work.title}</strong><span>{work.artist}</span><small>{mv.openChannel}<ArrowRight size={14} /></small></span></a>)}</div></section> : null}
      </> : null}
      <aside className={styles.submission}><div><h2>{mv.yourMv}</h2><p>{mv.submitNote}</p></div><div><Link href={withLang("/profile")}>{mv.myWorks}<ArrowRight size={17} /></Link><Link href={`/profile?lang=${lang}&submit=1#submit-work`}>{copy.submit}<ArrowRight size={17} /></Link></div></aside>
      <footer className={base.footer}><p>{copy.footer}</p><div><Link href={withLang("/ai-music")}>{copy.explore}</Link><Link href={withLang("/about")}>{copy.about}</Link><Link href={withLang("/partners")}>{copy.contact}</Link></div></footer>
    </main>
    {feedbackWork ? <HomeWorkFeedback work={feedbackWork} onClose={() => { setFeedbackWork(null); setQueue(null); setPendingEnd(false); setReviewBusy(false); }} onChange={() => void load()} returnPath="/mv" showVideo autoPlay={viewAutoPlay}
      onReviewBusy={setReviewBusy} onVideoEnded={queue ? () => stepQueue(1, true) : undefined} onVideoUnavailable={queue ? () => stepQueue(1, true) : undefined}
      shareControl={<MvShare work={feedbackWork} />} videoControls={queue ? <div className={styles.queueControls}>
        <span>{queueEnded ? mv.queueEnded : `${mv.continuousActive} · ${queueIndex + 1} / ${queue.length}`}</span>
        <button type="button" disabled={reviewBusy || queueIndex <= 0} onClick={() => stepQueue(-1)} aria-label={mv.previousMv}><ChevronLeft size={20} /></button>
        <button type="button" disabled={reviewBusy || queueIndex >= queue.length - 1} onClick={() => stepQueue(1)} aria-label={mv.nextMv}><ChevronRight size={20} /></button>
        <button type="button" onClick={() => { setQueue(null); setPendingEnd(false); }}>{mv.stopContinuous}</button>
      </div> : null} /> : null}
  </div>;
}
