"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, Play, Search, X } from "lucide-react";
import EditorialHeader from "@/components/editorial-header";
import WorkImage from "@/components/work-image";
import HomeWorkFeedback from "@/components/home-work-feedback";
import { useI18n } from "@/lib/i18n";
import { homeCopy } from "@/lib/home-copy";
import { mvCopy } from "@/lib/mv-copy";
import { filterMvWorks, type MvDiscovery, type MvSort } from "@/lib/mv-discovery";
import { excludeFeaturedWorks, type HomeWork } from "@/lib/home-discovery";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import base from "./home-editorial.module.css";
import styles from "./mv-gallery.module.css";

function VideoDialog({ work, onClose, onFeedback }: { work: HomeWork; onClose: () => void; onFeedback: () => void }) {
  const { lang } = useI18n(); const copy = homeCopy(lang);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current; const previous = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className={styles.videoDialog} aria-labelledby="mv-playing-title" onCancel={onClose}>
    <div className={styles.dialogHeading}><div><h2 id="mv-playing-title">{work.title}</h2><p>{work.artist}</p></div>
      <button autoFocus onClick={onClose} aria-label={copy.closeVideo}><X size={23} /></button></div>
    <div className={styles.dialogVideo}><iframe src={`https://www.youtube-nocookie.com/embed/${work.videoId}?autoplay=1&rel=0`}
      title={work.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
    <div className={styles.dialogLinks}><button onClick={onFeedback}>{copy.discuss}<ArrowRight size={17} /></button>
      <a href={work.youtubeUrl!} target="_blank" rel="noopener noreferrer">{copy.openYouTube}<ArrowRight size={17} /></a></div>
  </dialog>;
}

export default function MvGallery() {
  const { lang, t } = useI18n(); const copy = homeCopy(lang); const mv = mvCopy(lang);
  const [data, setData] = useState<MvDiscovery | null>(null);
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [heroVideo, setHeroVideo] = useState<string | null>(null);
  const [dialogWork, setDialogWork] = useState<HomeWork | null>(null);
  const [feedbackWork, setFeedbackWork] = useState<HomeWork | null>(null);
  const [query, setQuery] = useState(""); const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<MvSort>("latest"); const [limit, setLimit] = useState(12);
  const player = useMusicPlayer();
  const withLang = (path: string) => { const [url, hash] = path.split("#"); return `${url}${url.includes("?") ? "&" : "?"}lang=${lang}${hash ? `#${hash}` : ""}`; };
  const selected = data?.featured.find(work => work.id === selectedId) ?? data?.featured[0];
  const selectedIndex = data?.featured.findIndex(work => work.id === selected?.id) ?? 0;
  const videoOpen = Boolean(selected?.videoId && selected.videoId === heroVideo);
  const works = filterMvWorks(excludeFeaturedWorks(data?.works ?? [], data?.featured ?? []), query, genre, sort);
  const matchingFeatured = filterMvWorks(data?.featured ?? [], query, genre, sort);
  const channels = filterMvWorks(data?.channels ?? [], query, genre, sort);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/mv/discovery", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const next: MvDiscovery = await response.json();
      if (!Array.isArray(next.works) || !Array.isArray(next.featured) || !Array.isArray(next.channels)) throw new Error("Invalid MV response");
      if (!signal?.aborted) { setData(next); setFailed(false); }
    } catch { if (!signal?.aborted) setFailed(true); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController(); void load(controller.signal);
    const refresh = () => { if (!document.hidden) void load(controller.signal); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("aipoger:music-heart", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("aipoger:music-heart", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  // Starting the shared radio after a video closes the video, avoiding overlapping audio.
  useEffect(() => { if (player.playing) { setHeroVideo(null); setDialogWork(null); } }, [player.playing]);
  const watch = (work: HomeWork, hero = false) => {
    if (!work.videoId) return;
    if (player.playing) musicPlayer?.toggle();
    if (hero) { setDialogWork(null); setHeroVideo(work.videoId); }
    else { setHeroVideo(null); setDialogWork(work); }
  };
  const moveFeatured = (direction: number) => {
    if (!data?.featured.length) return;
    setHeroVideo(null); setSelectedId(data.featured[(selectedIndex + direction + data.featured.length) % data.featured.length].id);
  };
  const reset = () => { setQuery(""); setGenre(""); setSort("latest"); setLimit(12); };
  return <div className={base.page}>
    <EditorialHeader active="mv" />
    <main className={base.main}>
      <section id="featured-mv" className={base.featured} aria-labelledby="mv-page-title">
        <div className={`${base.sectionIntro} ${styles.intro}`}><p className={base.eyebrow}>MUSIC VIDEO</p><h1 id="mv-page-title">{mv.title}</h1><p className={base.intro}>{copy.intro}</p></div>
        {loading && !data ? <div className={base.status} role="status">{copy.loading}</div>
          : failed && !data ? <div className={base.status} role="alert"><p>{copy.error}</p><button onClick={() => { setLoading(true); void load(); }}>{copy.retry}<ArrowRight size={18} /></button></div>
          : selected ? <div className={`${base.hero} ${styles.hero}`}>
            <div className={`${base.video} ${styles.heroVideo}`}>
              {videoOpen ? <><iframe src={`https://www.youtube-nocookie.com/embed/${selected.videoId}?autoplay=1&rel=0`} title={selected.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                <button className={base.closeVideo} onClick={() => setHeroVideo(null)} aria-label={copy.closeVideo}><X size={19} /></button></>
                : <button className={base.poster} onClick={() => watch(selected, true)} aria-label={`${copy.watch} · ${selected.title}`}>
                  <WorkImage key={selected.id} work={selected} video priority /><span className={base.posterPlay}><Play size={27} fill="currentColor" /></span><span className={base.videoSource}>{copy.source}</span></button>}
            </div>
            <div className={base.workInfo}><p className={base.workLabel}>{data?.featureKind === "community" ? copy.community : copy.newWork}</p>
              <h2 title={selected.title}>{selected.title}</h2><p className={base.artist}>{selected.artist}</p>
              {data?.featureKind === "community" ? <div className={base.support}><Heart size={18} /><span>{copy.supporters} <strong>{selected.supporterCount}</strong> {copy.people}</span>
                {data.featured.length > 1 ? <span className={base.tieLabel}>{copy.tied}</span> : null}</div> : <p className={base.supportBuilding}>{copy.noSupport}</p>}
              <div className={base.quote}><p>{selected.comment ? copy.comments : copy.creatorSays}</p><blockquote>{selected.comment?.text || selected.description || copy.noComment}</blockquote>
                {selected.comment ? <cite>{selected.comment.name}</cite> : null}</div>
              <button className={base.primary} onClick={videoOpen ? () => setHeroVideo(null) : () => watch(selected, true)}>{videoOpen ? <X size={21} /> : <Play size={21} fill="currentColor" />}{videoOpen ? copy.closeVideo : copy.watch}</button>
              <div className={base.workLinks}><button onClick={() => setFeedbackWork(selected)}>{copy.discuss}<ArrowRight size={17} /></button>
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
            <div className={styles.sorts} aria-label={mv.more}>{(["latest", "support"] as const).map(value => <button key={value} aria-pressed={sort === value} onClick={() => { setSort(value); setLimit(12); }}>{mv[value]}</button>)}</div>
<div className={styles.filterRow}><select aria-label={mv.all} value={genre} onChange={event => { setGenre(event.target.value); setLimit(12); }}>
            <option value="">{mv.all}</option>{MUSIC_GENRE_OPTIONS.filter(option => data.works.some(work => work.genre === option.value) || data.channels.some(work => work.genre === option.value)).map(option => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>)}</select>
            <p role="status">{works.length} {mv.count}</p></div>
            <label className={styles.search}><Search size={18} /><input type="search" aria-label={mv.search} placeholder={mv.search} value={query} onChange={event => { setQuery(event.target.value); setLimit(12); }} />
              {query ? <button onClick={() => { setQuery(""); setLimit(12); }} aria-label={mv.clear}><X size={16} /></button> : null}</label>
          </div>

          <div className={styles.grid}>{works.slice(0, limit).map(work => <article key={work.id} className={styles.card}>
            <button className={styles.cardPoster} onClick={() => watch(work)} aria-label={`${copy.watch} · ${work.title}`}><WorkImage work={work} video />
              <span className={styles.cardPlay}><Play size={20} fill="currentColor" /></span><span className={base.videoSource}>YouTube</span></button>
            <h3><Link href={withLang(`/ai-music?track=${encodeURIComponent(work.id)}`)}>{work.title}</Link></h3><p className={styles.cardArtist}>{work.artist}</p>
            <button className={styles.cardFeedback} onClick={() => setFeedbackWork(work)} aria-label={`${copy.discuss} · ${work.title}`}><Heart size={15} /><span>{mv.support} {work.supporterCount}</span><ArrowRight size={15} /></button>
          </article>)}</div>
          {!works.length ? <div className={styles.noResults}>
            <p>{matchingFeatured.length ? mv.shownAbove : mv.noResults}</p>
            {matchingFeatured.length ? <a href="#featured-mv" onClick={() => { setHeroVideo(null); setSelectedId(matchingFeatured[0].id); }}>{mv.viewFeatured}<ArrowRight size={17} /></a> : null}
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
    {dialogWork ? <VideoDialog key={dialogWork.id} work={dialogWork} onClose={() => setDialogWork(null)} onFeedback={() => { setFeedbackWork(dialogWork); setDialogWork(null); }} /> : null}
    {feedbackWork ? <HomeWorkFeedback key={feedbackWork.id} work={feedbackWork} returnPath="/mv" onClose={() => setFeedbackWork(null)} onChange={() => void load()} /> : null}
  </div>;
}
