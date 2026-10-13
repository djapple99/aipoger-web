"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDown, Heart, Play, X } from "lucide-react";
import WorkImage from "@/components/work-image";
import { useI18n } from "@/lib/i18n";
import { homeCopy } from "@/lib/home-copy";
import { mvCopy } from "@/lib/mv-copy";
import { supabase } from "@/lib/supabase";
import type { HomeWork } from "@/lib/home-discovery";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import styles from "./home-editorial.module.css";

type Comment = { id: string; name: string; text: string; createdAt: string };
export default function HomeWorkFeedback({ work, onClose, onChange, returnPath = "/", showVideo = false, supportNote }: { work: HomeWork; onClose: () => void; onChange: () => void; returnPath?: string; showVideo?: boolean; supportNote?: string }) {
  const { lang } = useI18n(); const copy = homeCopy(lang);
  const dialog = useRef<HTMLDialogElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const commentArea = useRef<HTMLElement>(null);
  const [showCommentCue, setShowCommentCue] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [readFailed, setReadFailed] = useState(false);
  const [writeFailed, setWriteFailed] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [hearted, setHearted] = useState<boolean | null>(null);
  const [heartReadFailed, setHeartReadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const player = useMusicPlayer();
  const withVideo = Boolean(showVideo && work.videoId);
  const destination = new URL(returnPath, "https://aipoger.com");
  destination.searchParams.set("lang", lang);
  if (destination.pathname === "/ai-music") { destination.searchParams.set("track", work.id); destination.searchParams.set("comments", "1"); }
  const authHref = `/auth?lang=${lang}&next=${encodeURIComponent(destination.pathname + destination.search + destination.hash)}`;

  useEffect(() => {
    const element = dialog.current; const previous = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  useEffect(() => { if (player.playing) setVideoOpen(false); }, [player.playing]);
  useEffect(() => {
    const scroll = scrollArea.current; const comments = commentArea.current;
    if (!withVideo || !scroll || !comments) return;
    const update = () => setShowCommentCue(comments.getBoundingClientRect().top >= scroll.getBoundingClientRect().bottom - 24);
    update();
    scroll.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(scroll); observer?.observe(comments);
    return () => { scroll.removeEventListener("scroll", update); window.removeEventListener("resize", update); observer?.disconnect(); };
  }, [withVideo]);

  useEffect(() => {
    const controller = new AbortController(); let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/listen-bar/track-comments?trackId=${encodeURIComponent(work.id)}`, { signal: controller.signal, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.comments)) throw new Error("Unavailable");
        if (active) setComments(payload.comments);
      } catch { if (active) setReadFailed(true); }
      finally { if (active) setLoading(false); }
    })();
    const readHeart = async () => {
      setHearted(null);
      setHeartReadFailed(false);
      try {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSignedIn(Boolean(data.session));
      if (!data.session) { setHearted(false); return; }
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      const { data: rows, error } = await supabase.from("listen_bar_track_reactions").select("reaction")
        .eq("track_id", work.id).eq("user_id", data.session.user.id).eq("vote_date", date).maybeSingle();
      if (error) throw new Error("Unavailable");
      if (active) setHearted(rows?.reaction === "heart");
      } catch { if (active) setHeartReadFailed(true); }
    };
    void readHeart();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void readHeart(); });
    const syncHeart = (event: Event) => {
      const detail = (event as CustomEvent<{ trackId?: string; heartedToday?: boolean }>).detail;
      if (detail?.trackId === work.id && typeof detail.heartedToday === "boolean") setHearted(detail.heartedToday);
    };
    window.addEventListener("aipoger:music-heart", syncHeart);
    return () => { active = false; controller.abort(); subscription.unsubscribe(); window.removeEventListener("aipoger:music-heart", syncHeart); };
  }, [work.id]);

  const submit = async (kind: "heart" | "comment") => {
    if (busy || (kind === "comment" && !draft.trim())) return;
    setBusy(true); setWriteFailed(false); setSaved(false);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) { setSignedIn(false); return; }
      const name = session.user.user_metadata?.display_name || session.user.user_metadata?.nickname || session.user.user_metadata?.full_name || session.user.user_metadata?.name || copy.member;
      const response = await fetch(kind === "heart" ? "/api/listen-bar/reaction" : "/api/listen-bar/track-comments", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(kind === "heart" ? { trackId: work.id, reaction: "heart" } : { trackId: work.id, displayName: name, text: draft.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) { if (response.status === 401) setSignedIn(false); throw new Error("Unavailable"); }
      if (kind === "heart") {
        setHearted(payload.heartedToday === true);
        window.dispatchEvent(new CustomEvent("aipoger:music-heart", { detail: { trackId: work.id, ...payload } }));
      } else if (payload.comment) {
        setComments(current => [...current, payload.comment]); setDraft(""); setSaved(true);
      } else { throw new Error("Missing comment"); }
      onChange();
    } catch { setWriteFailed(true); }
    finally { setBusy(false); }
  };
  const comment = (event: FormEvent) => { event.preventDefault(); void submit("comment"); };

  return <dialog ref={dialog} className={`${styles.feedbackDialog} ${withVideo ? styles.feedbackWithVideo : ""}`} aria-labelledby="home-feedback-title" onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={scrollArea} className={styles.feedbackInner}>
      <div className={styles.feedbackHeading}><div><p>{copy.discuss}</p><h2 id="home-feedback-title">{work.title}</h2><span>{work.artist}</span></div>
        <button autoFocus type="button" onClick={onClose} aria-label={copy.closeFeedback}><X size={22} /></button>
      </div>
      {withVideo ? <>
        <div className={styles.feedbackVideo}>
          {videoOpen ? <><iframe src={`https://www.youtube-nocookie.com/embed/${work.videoId}?autoplay=1&rel=0`} title={work.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            <button type="button" className={styles.closeVideo} onClick={() => setVideoOpen(false)} aria-label={copy.closeVideo}><X size={22} /></button></>
            : <button type="button" className={styles.poster} onClick={() => { if (player.playing) musicPlayer?.toggle(); setVideoOpen(true); }} aria-label={`${copy.watch} · ${work.title}`}>
              <WorkImage work={work} video /><span className={styles.posterPlay}><Play size={27} fill="currentColor" /></span><span className={styles.videoSource}>{copy.source}</span>
            </button>}
        </div>
        <a className={styles.feedbackSource} href={work.youtubeUrl!} target="_blank" rel="noopener noreferrer">{copy.openYouTube}</a>
      </> : null}
      <p className={styles.feedbackNote}>{supportNote ?? copy.supportNote}</p>
      {signedIn ? <button className={styles.feedbackHeart} type="button" disabled={busy || hearted === null} aria-pressed={hearted === true}
        onClick={() => void submit("heart")}><Heart size={18} fill={hearted ? "currentColor" : "none"} />{hearted ? copy.removeHeart : copy.sendHeart}</button>
        : <Link className={styles.feedbackAuth} href={authHref}>{copy.loginFeedback}</Link>}
      {heartReadFailed ? <p role="alert" className={styles.refreshError}>{copy.error}</p> : null}
      <section ref={commentArea} id="mv-comment-area" className={styles.feedbackComments} aria-label={copy.comments}>
        {loading ? <p role="status">{copy.loadingComments}</p> : readFailed ? <p role="alert">{copy.error}</p>
          : comments.length ? comments.map(item => <article key={item.id}><strong>{item.name}</strong><p>{item.text}</p></article>)
            : <p>{copy.firstComment}</p>}
      </section>
      {signedIn ? <form onSubmit={comment} className={styles.feedbackForm}>
        <label htmlFor="home-comment">{copy.writeComment}</label>
        <textarea id="home-comment" value={draft} onChange={event => { setDraft(event.target.value); setSaved(false); }} maxLength={280} rows={3} placeholder={copy.commentHint} />
        <div><span>{draft.length} / 280</span><button type="submit" disabled={busy || !draft.trim()}>{busy ? copy.sending : copy.sendComment}</button></div>
      </form> : null}
      {writeFailed ? <p role="alert" className={styles.refreshError}>{copy.feedbackError}</p> : null}
      {saved ? <p role="status" className={styles.feedbackSaved}>{copy.commentSaved}</p> : null}
    </div>
    {withVideo && showCommentCue ? <button type="button" className={styles.commentScrollCue} aria-controls="mv-comment-area"
      onClick={() => commentArea.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>
      {mvCopy(lang).scrollComments}<ArrowDown size={18} aria-hidden="true" />
    </button> : null}
  </dialog>;
}
