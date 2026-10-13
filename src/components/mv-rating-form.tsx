"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { mvCopy } from "@/lib/mv-copy";
import { homeCopy } from "@/lib/home-copy";
import styles from "./home-editorial.module.css";

export type MvReviewComment = { id: string; name: string; text: string; createdAt: string };
export type MvReviewDraft = { score: number | null; text: string };
export default function MvRatingForm({ trackId, signedIn, onSaved, onBusy, drafts }: {
  trackId: string; signedIn: boolean; onSaved: (comment: MvReviewComment | null) => void; onBusy: (busy: boolean) => void; drafts?: Map<string, MvReviewDraft>;
}) {
  const { lang } = useI18n(); const mv = mvCopy(lang); const copy = homeCopy(lang);
  const [score, setScore] = useState<number | null>(drafts?.get(trackId)?.score ?? null); const [text, setText] = useState(drafts?.get(trackId)?.text ?? "");
  const [ready, setReady] = useState(false); const [canRate, setCanRate] = useState(false);
  const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const [summary, setSummary] = useState<{ ratingAverage: number | null; ratingCount: number } | null>(null);
  const [retry, setRetry] = useState(0); const receipt = useRef<string | null>(null); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setReady(false); setFailed(false);
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const response = await fetch(`/api/mv/review?trackId=${encodeURIComponent(trackId)}`, { signal: controller.signal, cache: "no-store", headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {} });
        const payload = await response.json(); if (!response.ok) throw new Error("Unavailable");
        if (active) { setScore(drafts?.get(trackId)?.score ?? payload.myScore ?? null); setCanRate(payload.canRate === true); setSummary(payload); setReady(true); }
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; controller.abort(); };
  }, [trackId, signedIn, retry, drafts]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !ready || !signedIn || (score === null && !text.trim())) return;
    setBusy(true); onBusy(true); setFailed(false); setSaved(false);
    try {
      const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error("Sign in");
      receipt.current ??= crypto.randomUUID();
      const response = await fetch("/api/mv/review", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ trackId, score: canRate ? score : null, text: text.trim(), requestId: receipt.current }) });
      const payload = await response.json(); if (!response.ok) throw new Error("Unavailable");
      if (!alive.current) return;
      receipt.current = null; drafts?.delete(trackId); setText(""); setSaved(true); onSaved(payload.comment ?? null);
      window.dispatchEvent(new CustomEvent("aipoger:mv-rating", { detail: { trackId } }));
      setRetry(value => value + 1);
    } catch { if (alive.current) setFailed(true); }
    finally { if (alive.current) { setBusy(false); onBusy(false); } }
  };
  const edit = () => { receipt.current = null; setSaved(false); };
  return <form onSubmit={submit} className={`${styles.feedbackForm} ${styles.mvRatingForm}`}>
    <div className={styles.ratingHeading}><h3>{mv.rateQuestion}</h3><span>{summary?.ratingCount ? `${summary.ratingAverage?.toFixed(1)} ${mv.points}｜${summary.ratingCount} ${mv.raters}` : mv.unrated}</span></div>
    <fieldset className={styles.ratingNumbers} disabled={!ready || !signedIn || !canRate || busy}>
      <legend className={styles.srOnly}>{mv.rateQuestion}</legend>
      {Array.from({ length: 10 }, (_, i) => i + 1).map(value => <label key={value} data-selected={score === value}>
        <input type="radio" name={`mv-rating-${trackId}`} value={value} checked={score === value} onChange={() => { edit(); drafts?.set(trackId, { score: value, text }); setScore(value); }} aria-label={`${value} / 10`} /><span>{value}</span>
      </label>)}
    </fieldset>
    <p className={styles.ratingNote}>{ready && signedIn && !canRate ? mv.ownWork : mv.ratingNote}</p>
    {signedIn ? <>
      <label htmlFor={`mv-thoughts-${trackId}`}>{mv.thoughts}</label>
      <textarea id={`mv-thoughts-${trackId}`} value={text} maxLength={280} rows={3} placeholder={mv.thoughts} disabled={busy}
        onChange={event => { edit(); drafts?.set(trackId, { score, text: event.target.value }); setText(event.target.value); }} />
      <div><span>{text.length} / 280</span><button type="submit" disabled={!ready || busy || (score === null && !text.trim())}>{busy ? copy.sending : mv.sendReview}</button></div>
    </> : null}
    {failed ? <p role="alert" className={styles.refreshError}>{mv.ratingError}<button type="button" onClick={() => setRetry(value => value + 1)}>{copy.retry}</button></p> : null}
    {saved ? <p role="status" className={styles.feedbackSaved}>{mv.reviewSaved}</p> : null}
  </form>;
}
