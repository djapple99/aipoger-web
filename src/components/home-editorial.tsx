"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Heart, Pause, Play, Radio, X } from "lucide-react";
import { AIPOGER_BRAND_LOGO, AIPOGER_SOCIAL_LINKS } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
import { homeCopy } from "@/lib/home-copy";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import type { HomeDiscovery, HomeWork } from "@/lib/home-discovery";
import type { ExternalMusic } from "@/lib/external-music";
import { MUSIC_GENRE_OPTIONS } from "@/lib/music-genres";
import dynamic from "next/dynamic";
const HomeWorkFeedback = dynamic(() => import("@/components/home-work-feedback"));
import EditorialHeader from "@/components/editorial-header";
import LatestMusicNews from "@/components/latest-music-news";
import WorkImage from "@/components/work-image";
import { SocialIcon } from "@/components/social-icons";
import styles from "./home-editorial.module.css";

const communityLinks = ["Facebook", "LINE"].flatMap(label =>
  AIPOGER_SOCIAL_LINKS.filter(link => link.label === label));

export default function HomeEditorial({ initialData }: { initialData?: HomeDiscovery } = {}) {
  const { lang, t } = useI18n();
  const copy = homeCopy(lang);
  const [data, setData] = useState<HomeDiscovery | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingWork, setPlayingWork] = useState<HomeWork | null>(null);
  const [playError, setPlayError] = useState(false);
  const [feedback, setFeedback] = useState<{ work: HomeWork; externalMedia?: ExternalMusic } | null>(null);
  const player = useMusicPlayer();
  const withLang = (path: string) => { const [url, hash] = path.split("#"); return `${url}${url.includes("?") ? "&" : "?"}lang=${lang}${hash ? `#${hash}` : ""}`; };
  const workHref = (work: HomeWork) => withLang(`/works/${encodeURIComponent(work.id)}`);
  const selected = playingWork ?? data?.featured.find(work => work.id === selectedId) ?? data?.featured[0];
  const selectedIndex = data?.featured.findIndex(work => work.id === selected?.id) ?? 0;
  const videoOpen = Boolean(playingWork?.videoId);

  useEffect(() => { setSelectedId(null); }, [data?.rotationKey]);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/home/discovery", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const next: HomeDiscovery = await response.json();
      if (!Array.isArray(next.featured) || !Array.isArray(next.singles)) throw new Error("Invalid discovery response");
      if (signal?.aborted) return;
      setData(next); setFailed(false);
    } catch {
      if (!signal?.aborted) setFailed(true);
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const refresh = () => { if (!document.hidden) void load(controller.signal); };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("aipoger:music-heart", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("aipoger:music-heart", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);

  const watch = () => {
    if (!selected?.videoId) return;
    if (player.playing) musicPlayer?.toggle();
    setPlayingWork(selected);
  };
  const moveFeatured = (direction: number) => {
    if (!data?.featured.length) return;
    setPlayingWork(null);
    setSelectedId(data.featured[(selectedIndex + direction + data.featured.length) % data.featured.length].id);
  };
  const playSingle = async (work: HomeWork) => {
    setPlayingWork(null); setPlayError(false);
    if (!work.audioUrl && work.externalMedia) {
      if (player.playing) musicPlayer?.toggle();
      setFeedback({ work, externalMedia: work.externalMedia });
      return;
    }
    if (player.session?.queue[player.session.index]?.id === `bar:${work.id}`) { musicPlayer?.toggle(); return; }
    const queue = (data?.singles ?? []).filter(song => song.audioUrl).map(song => ({ id: `bar:${song.id}`, heartTrackId: song.id,
      title: song.title, artist: song.artist, audioUrl: song.audioUrl, coverUrl: song.coverUrl || AIPOGER_BRAND_LOGO,
      lyrics: song.lyrics, genre: song.genre }));
    const success = await musicPlayer?.start(queue, queue.findIndex(song => song.heartTrackId === work.id), copy.explore,
      { sourceKey: "home-discovery", repeat: false });
    if (!success) setPlayError(true);
  };

  return <div className={styles.page}>
    <EditorialHeader active="home" />

    <main className={styles.main}>
      <section id="featured-mv" className={styles.featured} aria-labelledby="home-feature-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1 id="home-feature-title">{copy.title}</h1>
          <p className={styles.intro}>{copy.intro}</p>
        </div>

        {loading && !data ? <div className={styles.status} role="status">{copy.loading}</div>
          : failed && !data ? <div className={styles.status} role="alert"><p>{copy.error}</p><button onClick={() => { setLoading(true); void load(); }}>{copy.retry}<ArrowRight size={18} /></button></div>
          : selected ? <div className={styles.hero}>
            <div className={styles.video}>
              {videoOpen ? <>
                <iframe src={`https://www.youtube-nocookie.com/embed/${selected.videoId}?autoplay=1&rel=0`}
                  title={selected.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                <button className={styles.closeVideo} onClick={() => setPlayingWork(null)} aria-label={copy.closeVideo}><X size={19} /></button>
              </> : <button className={styles.poster} onClick={watch} aria-label={`${copy.watch} · ${selected.title}`}>
                <WorkImage work={selected} video priority />
                <span className={styles.posterPlay}><Play size={27} fill="currentColor" /></span>
                <span className={styles.videoSource}>{copy.source}</span>
              </button>}
            </div>
            <div className={styles.workInfo}>
              <p className={styles.workLabel}>{selected.discoveryReason === "community" || (!selected.discoveryReason && data?.featureKind === "community") ? copy.community : selected.discoveryReason === "discovery" ? copy.rotatingWork : copy.newWork}</p>
              <h2 title={selected.title}><Link prefetch={false} href={workHref(selected)}>{selected.title}</Link></h2>
              <p className={styles.artist}>{selected.artist}</p>
              {selected.supporterCount > 0 ? <div className={styles.support}>
                <Heart size={18} /> <span>{copy.supporters} <strong>{selected.supporterCount}</strong> {copy.people}</span>
              </div> : <p className={styles.supportBuilding}>{copy.noSupport}</p>}
              <div className={styles.quote}>
                <p>{selected.comment ? copy.comments : copy.creatorSays}</p>
                <blockquote>{selected.comment?.text || selected.description || copy.noComment}</blockquote>
                {selected.comment ? <cite>{selected.comment.name}</cite> : null}
              </div>
              <button className={styles.primary} onClick={videoOpen ? () => setPlayingWork(null) : watch}>
                {videoOpen ? <X size={21} /> : <Play size={21} fill="currentColor" />}{videoOpen ? copy.closeVideo : copy.watch}
              </button>
              <div className={styles.workLinks}>
                <button onClick={() => setFeedback({ work: selected })}>{copy.discuss}<ArrowRight size={17} /></button>
                <a href={selected.youtubeUrl!} target="_blank" rel="noopener noreferrer">{copy.openYouTube}<ArrowRight size={17} /></a>
              </div>
              {(data?.featured.length ?? 0) > 1 ? <div className={styles.featureControls}>
                <span>{Math.max(0, selectedIndex) + 1} / {data!.featured.length}</span>
                <button onClick={() => moveFeatured(-1)} aria-label={copy.previous}><ChevronLeft size={20} /></button>
                <button onClick={() => moveFeatured(1)} aria-label={copy.next}><ChevronRight size={20} /></button>
              </div> : null}
            </div>
          </div> : <div className={styles.empty}>
            <h2>{copy.empty}</h2><p>{copy.emptyBody}</p>
            <Link href={withLang("/ai-music")}>{copy.allMusic}<ArrowRight size={19} /></Link>
          </div>}
        {failed && data ? <div className={styles.refreshError} role="status">{copy.error}<button onClick={() => void load()}>{copy.retry}</button></div> : null}
      </section>

      <section className={styles.explore} aria-labelledby="home-explore-title">
        <div className={styles.exploreHeading}>
          <div><h2 id="home-explore-title">{copy.exploreTitle}</h2><p>{copy.exploreIntro}</p></div>
          <div className={styles.exploreLinks}>
            <Link href={withLang("/listen-bar")}><Radio size={19} />{copy.bar}<ArrowRight size={17} /></Link>
            <Link href={withLang("/ai-music")}>{copy.allMusic}<ArrowRight size={17} /></Link>
          </div>
        </div>
        <div className={styles.singles}>
          {data?.singles.map(work => {
            const playing = player.playing && player.session?.queue[player.session.index]?.id === `bar:${work.id}`;
            return <article key={work.id} className={styles.single}>
              <button className={styles.singleCover} onClick={() => void playSingle(work)} aria-label={`${playing ? copy.pause : copy.play} · ${work.title}`}>
                <WorkImage work={work} />
                <span className={styles.singlePlay}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</span>
              </button>
              <div className={styles.singleInfo}>
                <Link prefetch={false} href={workHref(work)} title={work.title}><h3>{work.title}</h3></Link>
                <p>{work.artist}</p><p className={styles.genre}>{t(MUSIC_GENRE_OPTIONS.find(option => option.value === work.genre)?.labelKey ?? "genre_custom")}</p>
              </div>
            </article>;
          })}
        </div>
        {!loading && !failed && !data?.singles.length ? <p className={styles.noSongs}>{copy.emptySongs}</p> : null}
        {playError ? <p role="alert" className={styles.refreshError}>{copy.playError}</p> : null}
      </section>
      <LatestMusicNews lang={lang} />
      <footer className={styles.footer}>
        <div className={styles.footerCommunity}>
          <div className={styles.communityHeading}>
            <h2 id="home-community-title">{copy.joinCommunity}</h2>
            <nav aria-labelledby="home-community-title" className={styles.communityLinks}>
              {communityLinks.map(social => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label} title={`${social.label} ${social.handle}`}>
                <SocialIcon label={social.label} className={styles.communityIcon} />
              </a>)}
            </nav>
          </div>
          <p>{copy.footer}</p>
        </div>
        <div className={styles.footerLinks}>
          <Link href={withLang("/profile?submit=1#submit-work")}>{copy.submit}</Link><Link href={withLang("/about")}>{copy.about}</Link><Link href={withLang("/partners")}>{copy.contact}</Link>
        </div>
      </footer>
    </main>
    {feedback ? <HomeWorkFeedback key={feedback.work.id} work={feedback.work} externalMedia={feedback.externalMedia} onClose={() => setFeedback(null)} onChange={() => void load()} /> : null}
  </div>;
}
