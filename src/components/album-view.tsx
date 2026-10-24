"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MessageCircleMore, Play, Share2 } from "lucide-react";
import { albumCopy } from "@/lib/album-copy";
import { albumPath, type PublicAlbum, type AlbumMember } from "@/lib/album";
import { useI18n } from "@/lib/i18n";
import { parseExternalMusic } from "@/lib/external-music";
import { getMusicPlayerState, musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import WorkImage from "./work-image";
import styles from "./album-view.module.css";
const MvPlayer = dynamic(() => import("./mv-player"));
const ExternalMusicPlayer = dynamic(() => import("./external-music-player"));
const HomeWorkFeedback = dynamic(() => import("./home-work-feedback"));
export default function AlbumView({ initialId, query = "", genre = "" }: { initialId?: string | null; query?: string; genre?: string }) {
  const { lang } = useI18n(); const c = albumCopy(lang);
  const [albums, setAlbums] = useState<PublicAlbum[]>([]); const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(null); const [trackIndex, setTrackIndex] = useState(0); const [playing, setPlaying] = useState(false); const [comment, setComment] = useState<PublicAlbum | null>(null); const [shared, setShared] = useState("");
  useEffect(() => {
    let active = true; const controller = new AbortController(); setLoading(true); setFailed(false);
    void (async () => {
      try {
        const r = await fetch("/api/albums", { signal: controller.signal }); const data = await r.json(); if (!r.ok || !Array.isArray(data.albums)) throw new Error();
        let items: PublicAlbum[] = data.albums;
        if (initialId && !items.some(a => a.id === initialId)) { const one = await fetch(`/api/albums?id=${encodeURIComponent(initialId)}`, { signal: controller.signal }); const p = await one.json(); if (!one.ok) throw new Error(); items = [...(p.albums ?? []), ...items]; }
        if (active) { setAlbums(items); if (initialId && items.some(a => a.id === initialId)) { setSelected(initialId); setTrackIndex(0); setPlaying(false); if (new URLSearchParams(window.location.search).get("comments") === "1") setComment(items.find(a => a.id === initialId) ?? null); } }
      } catch { if (active) setFailed(true); } finally { if (active) setLoading(false); }
    })(); return () => { active = false; controller.abort(); };
  }, [initialId, retry]);
  const globalPlayer = useMusicPlayer();
  useEffect(() => { if (globalPlayer.playing) setPlaying(false); }, [globalPlayer.playing]);
  const album = albums.find(a => a.id === selected); const track: AlbumMember | PublicAlbum | undefined = album?.tracks.length ? album.tracks[trackIndex] : album;
  const media = parseExternalMusic(track?.externalUrl);
  const start = (a: PublicAlbum, index = 0) => { if (getMusicPlayerState().playing) musicPlayer?.toggle(); setSelected(a.id); setTrackIndex(index); setPlaying(true); };
  const next = () => { if (album && trackIndex < album.tracks.length - 1) setTrackIndex(i => i + 1); else setPlaying(false); };
  const share = async (a: PublicAlbum) => { const url = new URL(albumPath(a.id, lang), window.location.origin).href; try { if (navigator.share) await navigator.share({ title: a.title, url }); else { await navigator.clipboard.writeText(url); setShared(a.id); } } catch { /* Cancellation leaves the album unchanged. */ } };
  const filtered = albums.filter(a => (!genre || a.genre === genre) && `${a.title} ${a.artist}`.normalize("NFKC").toLowerCase().includes(query.normalize("NFKC").trim().toLowerCase()));
  return <div className={styles.root}>
    <div className={styles.heading}><div><h2>{c.albums}</h2><p>{c.intro}</p><p>{c.note}</p></div><Link href={`/profile?lang=${lang}#submit-work`}>{c.submit} ↗</Link></div>
    {loading ? <p role="status">{c.loading}</p> : null}{failed ? <p role="alert">{c.loadError}<button onClick={() => setRetry(i => i + 1)}>{c.retry}</button></p> : null}
    {album && track ? <section className={styles.detail} aria-label={album.title}>
      <div className={styles.detailHeading}><div><span>{c.label}</span><h3>{album.title}</h3><p>{album.artist}</p></div><button onClick={() => { setSelected(null); setPlaying(false); }}>{c.close}</button></div>
      <p>{album.description}</p>
      {playing ? <div className={styles.player} key={track.id}>
        {track.videoId ? <MvPlayer work={track} autoPlay onEnded={next} /> : media ? <ExternalMusicPlayer media={media} title={track.title} /> : track.audioUrl ? <audio controls autoPlay preload="metadata" src={track.audioUrl} onEnded={next} onPlay={() => { if (getMusicPlayerState().playing) musicPlayer?.toggle(); }} /> : <p>{c.error}</p>}
      </div> : <button className={styles.start} onClick={() => start(album, trackIndex)}><Play size={20} />{c.play}</button>}
      {album.tracks.length ? <ol className={styles.tracks}>{album.tracks.map((item, index) => <li key={item.id}><button aria-pressed={index === trackIndex} onClick={() => start(album, index)}><span>{index + 1}</span><span>{item.title}<small>{item.artist}</small></span><Play size={17} /></button></li>)}</ol> : null}
      {album.tracks.length && playing ? <div className={styles.actions}><button aria-label={lang === "zh" ? "上一首" : lang === "ja" ? "前の曲" : lang === "ko" ? "이전 곡" : "Previous track"} disabled={trackIndex === 0} onClick={() => setTrackIndex(i => i - 1)}>←</button><span>{trackIndex + 1} / {album.tracks.length}</span><button aria-label={lang === "zh" ? "下一首" : lang === "ja" ? "次の曲" : lang === "ko" ? "다음 곡" : "Next track"} disabled={trackIndex === album.tracks.length - 1} onClick={next}>→</button></div> : null}
    </section> : null}
    {!loading && !failed && !filtered.length ? <p role="status">{c.empty}</p> : null}
    <div className={styles.grid}>{filtered.map(a => <article key={a.id} className={styles.card}>
      <button className={styles.cover} onClick={() => { setSelected(a.id); setTrackIndex(0); setPlaying(false); }} aria-label={`${c.open} · ${a.title}`}><WorkImage work={a} video={Boolean(a.videoId)} /><span>{c.label}{a.durationSeconds ? ` · ${Math.floor(a.durationSeconds / 60)}:${String(a.durationSeconds % 60).padStart(2, "0")}` : a.tracks.length ? ` · ${a.tracks.length}` : ""}</span></button>
      <h3><button onClick={() => { setSelected(a.id); setTrackIndex(0); setPlaying(false); }}>{a.title}</button></h3><p>{a.artist}</p>
      <div className={styles.actions}><button onClick={() => start(a)} aria-label={`${c.play} · ${a.title}`}><Play size={19} /></button><button onClick={() => setComment(a)} aria-label={`${c.comments} · ${a.title}`}><MessageCircleMore size={19} /></button><button onClick={() => void share(a)} aria-label={`${lang === "zh" ? "分享" : lang === "ja" ? "共有" : lang === "ko" ? "공유" : "Share"} · ${a.title}`}><Share2 size={19} /></button>{shared === a.id ? <span role="status">{lang === "zh" ? "已複製連結" : lang === "ja" ? "リンクをコピーしました" : lang === "ko" ? "링크 복사됨" : "Link copied"}</span> : null}</div>
    </article>)}</div>
    {comment ? <HomeWorkFeedback key={comment.id} work={comment} returnPath={albumPath(comment.id, lang)} onClose={() => setComment(null)} onChange={() => {}} /> : null}
  </div>;
}
