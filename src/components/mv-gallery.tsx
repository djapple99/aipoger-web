"use client";
import ParticipationGuide from "./participation-guide";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, MessageCircleMore, Play, Search, X } from "lucide-react";
import EditorialHeader from "@/components/editorial-header";
import WorkImage from "@/components/work-image";
import HomeWorkFeedback from "@/components/home-work-feedback";
import ShareButton from "@/components/share-button";
import { useI18n } from "@/lib/i18n";
import { homeCopy } from "@/lib/home-copy";
import { mvCopy } from "@/lib/mv-copy";
import { filterMvWorks, type MvDiscovery, type MvSort } from "@/lib/mv-discovery";
import type { HomeWork } from "@/lib/home-discovery";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import { useMvHearts } from "@/lib/use-mv-hearts";
import base from "./home-editorial.module.css";
import styles from "./mv-gallery.module.css";

function MvShare({ work, className = "" }: { work: HomeWork; className?: string }) {
  const { lang } = useI18n(); const mv = mvCopy(lang);
  return <ShareButton title={work.title} text={`${work.artist} · ${work.title}`}
    url={`/mv?lang=${lang}&track=${encodeURIComponent(work.id)}`} label={`${mv.share} · ${work.title}`}
    copiedLabel={mv.copied} sharedLabel={mv.shared} manualCopyLabel={mv.manualCopy} linkLabel={mv.shareLink}
    iconOnly iconSize={28} className={`!rounded !border-0 !bg-transparent !p-1 ${className}`} />;
}

export default function MvGallery() {
  const { lang, t } = useI18n(); const copy = homeCopy(lang); const mv = mvCopy(lang);
  const [data, setData] = useState<MvDiscovery | null>(null);
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
  const [sort, setSort] = useState<MvSort>("rated"); const [limit, setLimit] = useState(12);
  const player = useMusicPlayer();
  const router = useRouter();
  const support = useMvHearts((data?.works ?? []).map(work => work.id));
  const withLang = (path: string) => { const [url, hash] = path.split("#"); return `${url}${url.includes("?") ? "&" : "?"}lang=${lang}${hash ? `#${hash}` : ""}`; };
  const selected = data?.featured.find(work => work.id === selectedId) ?? data?.featured[0];
  const selectedIndex = data?.featured.findIndex(work => work.id === selected?.id) ?? 0;
  // The MV catalogue is complete: support or a review must not remove a card
  // when that work also becomes a featured candidate above.
  const works = filterMvWorks(data?.works ?? [], query, genre, sort);
  const channels = filterMvWorks(data?.channels ?? [], query, genre, sort);
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
  const moveFeatured = (direction: number) => {
    if (!data?.featured.length) return;
    setSelectedId(data.featured[(selectedIndex + direction + data.featured.length) % data.featured.length].id);
  };
  const startQueue = () => {
    const playlist = filterMvWorks(data?.works ?? [], query, genre, sort);
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
  const reset = () => { setQuery(""); setGenre(""); setSort("rated"); setLimit(12); };
  return <div className={base.page}>
    <EditorialHeader active="mv" />
    <main className={base.main}>
      {sharedUnavailable ? <p role="status" className={styles.supportError}>{mv.sharedUnavailable}</p> : null}
      <section id="featured-mv" className={base.featured} aria-labelledby="mv-page-title">
        <div className={`${base.sectionIntro} ${styles.intro}`}><p className={base.eyebrow}>MUSIC VIDEO</p><h1 id="mv-page-title">{mv.title}</h1><p className={base.intro}>{copy.intro}</p><div className="mt-3 flex justify-end"><ParticipationGuide surface="mv" lang={lang} /></div></div>
        {loading && !data ? <div className={base.status} role="status">{copy.loading}</div>
          : failed && !data ? <div className={base.status} role="alert"><p>{copy.error}</p><button onClick={() => { setLoading(true); void load(); }}>{copy.retry}<ArrowRight size={18} /></button></div>
          : selected ? <div className={`${base.hero} ${styles.hero}`}>
            <div className={`${base.video} ${styles.heroVideo}`}>
              <button className={base.poster} onClick={() => watch(selected)} aria-label={`${copy.watch} · ${selected.title}`}>
                <WorkImage key={selected.id} work={selected} video priority /><span className={base.posterPlay}><Play size={27} fill="currentColor" /></span><span className={base.videoSource}>{copy.source}</span>
                <span className={styles.ratingBadge}>{selected.ratingCount ? `${selected.ratingAverage?.toFixed(1)} ${mv.points}｜${selected.ratingCount} ${mv.raters}` : mv.unrated}</span>
              </button>
            </div>
            <div className={base.workInfo}><p className={base.workLabel}>{data?.featureKind === "community" ? copy.community : copy.newWork}</p>
              <h2 title={selected.title}>{selected.title}</h2><p className={base.artist}>{selected.artist}</p>
              {data?.featureKind === "community" ? <div className={base.support}><Heart size={18} /><span>{copy.supporters} <strong>{selected.supporterCount}</strong> {copy.people}</span>
                {data.featured.length > 1 ? <span className={base.tieLabel}>{copy.tied}</span> : null}</div> : <p className={base.supportBuilding}>{copy.noSupport}</p>}
              <div className={base.quote}><p>{selected.comment ? copy.comments : copy.creatorSays}</p><blockquote>{selected.comment?.text || selected.description || copy.noComment}</blockquote>
                {selected.comment ? <cite>{selected.comment.name}</cite> : null}</div>
              <button className={base.primary} onClick={() => watch(selected)}><Play size={21} fill="currentColor" />{copy.watch}</button>
              <div className={`${base.workLinks} ${styles.heroActions}`}><button onClick={() => openFeedback(selected)}>{copy.discuss}<ArrowRight size={17} /></button>
                <MvShare work={selected} />
                <a href={selected.youtubeUrl!} target="_blank" rel="noopener noreferrer">{copy.openYouTube}<ArrowRight size={17} /></a></div>
              {(data?.featured.length ?? 0) > 1 ? <div className={base.featureControls}><span>{selectedIndex + 1} / {data!.featured.length}</span>
                <button onClick={() => moveFeatured(-1)} aria-label={copy.previous}><ChevronLeft size={20} /></button><button onClick={() => moveFeatured(1)} aria-label={copy.next}><ChevronRight size={20} /></button></div> : null}
            </div>
          </div> : <div className={base.empty}><h2>{copy.empty}</h2><p>{copy.emptyBody}</p><Link href={withLang("/listen-bar#play-request")}>{copy.submit}<ArrowRight size={19} /></Link></div>}
        {failed && data ? <div className={base.refreshError} role="status">{copy.error}<button onClick={() => void load()}>{copy.retry}</button></div> : null}
      </section>
      {data ? <>
        <section className={styles.catalog} aria-labelledby="mv-catalog-title">
          <div className={styles.catalogHeading}><h2 id="mv-catalog-title">{mv.more}</h2>
            <div className={styles.sorts} aria-label={mv.more}>{(["rated", "latest", "support"] as const).map(value => <button key={value} aria-pressed={sort === value} onClick={() => { setSort(value); setLimit(12); }}>{mv[value]}</button>)}</div>
<div className={styles.filterRow}><select aria-label={mv.all} value={genre} onChange={event => { setGenre(event.target.value); setLimit(12); }}>
            <option value="">{mv.all}</option>{MUSIC_GENRE_OPTIONS.filter(option => data.works.some(work => work.genre === option.value) || data.channels.some(work => work.genre === option.value)).map(option => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}</select>
            <p role="status">{works.length} {mv.count}</p><button className={styles.continuousButton} type="button" onClick={startQueue} disabled={!filterMvWorks(data.works, query, genre, sort).length} title={mv.queueNote}><Play size={17} fill="currentColor" />{mv.continuous}</button></div>
            <label className={styles.search}><Search size={18} /><input type="search" aria-label={mv.search} placeholder={mv.search} value={query} onChange={event => { setQuery(event.target.value); setLimit(12); }} />
              {query ? <button onClick={() => { setQuery(""); setLimit(12); }} aria-label={mv.clear}><X size={16} /></button> : null}</label>
          </div>
          {support.error ? <div role="alert" className={styles.supportError}>{support.error === "read" ? mv.heartReadError : mv.heartWriteError}
            {support.error === "read" ? <button onClick={() => void support.reload()}>{copy.retry}</button> : null}</div> : null}
          <div className={styles.grid}>{works.slice(0, limit).map(work => <article key={work.id} className={styles.card}>
            <button className={styles.cardPoster} onClick={() => watch(work)} aria-label={`${copy.watch} · ${work.title}`}><WorkImage work={work} video />
              <span className={styles.ratingBadge}>{work.ratingCount ? `${work.ratingAverage?.toFixed(1)} ${mv.points}｜${work.ratingCount} ${mv.raters}` : mv.unrated}</span>
              <span className={styles.cardPlay}><Play size={20} fill="currentColor" /></span><span className={base.videoSource}>YouTube</span></button>
            <div className={styles.cardTitleRow}>
              <h3 title={work.title}><button type="button" onClick={() => openFeedback(work)} aria-label={`${mv.openWork} · ${work.title}`}>{work.title}</button></h3>
              <div className={styles.cardActions}>
                <button className={styles.cardHeart} onClick={() => void sendHeart(work)} aria-label={`${support.hearts[work.id] ? copy.removeHeart : copy.sendHeart} · ${work.title}`}
                  title={support.hearts[work.id] ? copy.removeHeart : copy.sendHeart} aria-pressed={Boolean(support.hearts[work.id])} aria-describedby={`mv-support-${work.id}`}
                  aria-busy={support.busyId === work.id} disabled={!support.ready || support.busyId !== null || support.error === "read"}>
                  <Heart size={34} strokeWidth={1.9} fill={support.hearts[work.id] ? "currentColor" : "none"} />
                  <span id={`mv-support-${work.id}`}><span className={styles.srOnly}>{mv.support} </span>{work.supporterCount}</span>
                </button>
                <button className={styles.cardComments} onClick={() => openFeedback(work)} title={mv.readComments} aria-label={`${mv.readComments} · ${work.title}`}>
                  <MessageCircleMore size={34} strokeWidth={1.9} />
                </button>
                <MvShare work={work} className={styles.cardShare} />
              </div>
            </div><p className={styles.cardArtist}>{work.artist}</p>
          </article>)}</div>
          {!works.length ? <div className={styles.noResults}>
            <p>{mv.noResults}</p>
            <button onClick={reset}>{mv.reset}<ArrowRight size={17} /></button>
          </div> : null}
          {works.length > limit ? <div className={styles.more}><button onClick={() => setLimit(current => current + 12)}>{mv.loadMore}<span>{Math.min(limit, works.length)} / {works.length}</span></button></div> : null}
        </section>
        {channels.length ? <section className={styles.channels} aria-labelledby="mv-channels-title"><h2 id="mv-channels-title">{mv.channels}</h2><p>{mv.channelNote}</p>
          <div>{channels.map(work => <a key={work.id} href={work.channelUrl} target="_blank" rel="noopener noreferrer"><WorkImage work={work} /><span><strong>{work.title}</strong><span>{work.artist}</span><small>{mv.openChannel} <ArrowRight size={14} /></small></span></a>)}</div></section> : null}
      </> : null}
      <aside className={styles.submission}><div><h2>{mv.yourMv}</h2><p>{mv.submitNote}</p></div><div><Link href={withLang("/profile")}>{mv.myWorks}<ArrowRight size={17} /></Link><Link href={withLang("/listen-bar#play-request")}>{copy.submit}<ArrowRight size={17} /></Link></div></aside>
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
