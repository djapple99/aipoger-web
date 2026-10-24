"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { albumCopy } from "@/lib/album-copy";
import { mvCopy } from "@/lib/mv-copy";
import { homeCopy } from "@/lib/home-copy";
import { creditCopy } from "@/lib/credit-copy";
import { parseWorkRating } from "@/lib/work-rating";
import styles from "./home-editorial.module.css";

export type MvReviewComment = { id: string; name: string; text: string; createdAt: string };
export type MvReviewDraft = { score: number | null; scoreInput?: string; text: string };
export default function MvRatingForm({ trackId, signedIn, onSaved, onBusy, drafts, surface = "mv", workKind }: {
  trackId: string; signedIn: boolean; onSaved: (comment: MvReviewComment | null) => void; onBusy: (busy: boolean) => void; drafts?: Map<string, MvReviewDraft>; surface?: "music" | "mv"; workKind?: "single" | "album";
}) {
  const { lang } = useI18n(); const mv = mvCopy(lang); const copy = homeCopy(lang);
  const [isAlbum, setIsAlbum] = useState(workKind === "album");
  const albums = albumCopy(lang);
  const cached = drafts?.get(trackId);
  const [scoreInput, setScoreInput] = useState(cached?.scoreInput ?? (cached?.score == null ? "" : String(cached.score))); const [text, setText] = useState(cached?.text ?? "");
  const score = parseWorkRating(scoreInput);
  const invalidScore = Boolean(scoreInput.trim() && score === null);
  const endpoint = surface === "music" ? "/api/listen-bar/review" : "/api/mv/review";
  const question = surface === "music" ? mv.rateSongQuestion : mv.rateQuestion;
  const [myComment, setMyComment] = useState<{id:string;text:string}|null>(null); const [editing, setEditing] = useState(false);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [canEditScore, setCanEditScore] = useState(false); const [canEditComment, setCanEditComment] = useState(false);
  const [canDeleteComment, setCanDeleteComment] = useState(false); const [reviewBlocked, setReviewBlocked] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const scoreLocked = myScore !== null && !canEditScore;
  const [ready, setReady] = useState(false); const [canRate, setCanRate] = useState(false);
  const requiresScore = canRate && (!editing || canEditScore);
  const [failed, setFailed] = useState(false); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  const [summary, setSummary] = useState<{ ratingAverage: number | null; ratingCount: number } | null>(null);
  const [retry, setRetry] = useState(0); const receipt = useRef<string | null>(null); const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true; const controller = new AbortController(); setReady(false); setFailed(false);
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const response = await fetch(`${endpoint}?trackId=${encodeURIComponent(trackId)}`, { signal: controller.signal, cache: "no-store", headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {} });
        const payload = await response.json(); if (!response.ok) throw new Error("Unavailable");
        if (active) {
          const draft = drafts?.get(trackId);
          setIsAlbum(workKind === "album" || payload.workKind === "album");
          setMyScore(payload.myScore ?? null);
          setScoreInput(payload.myScore != null && !payload.canEditScore ? String(payload.myScore) : draft?.scoreInput ?? (draft?.score != null ? String(draft.score) : payload.myScore == null ? "" : String(payload.myScore)));
          setCanRate(payload.canRate === true); setMyComment(payload.myComment ?? null);
          setCanEditScore(payload.canEditScore === true); setCanEditComment(payload.canEditComment === true);
          setCanDeleteComment(payload.canDeleteComment === true); setReviewBlocked(payload.reviewBlocked === true);
          setText(draft?.text ?? payload.myComment?.text ?? "");
          setSummary(payload); setReady(true);
        }
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; controller.abort(); };
  }, [trackId, signedIn, retry, drafts, endpoint, workKind]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy || !ready || !signedIn || reviewBlocked || (myComment && (!editing || !canEditComment)) || (requiresScore && score === null) || ((!canRate || editing) && !text.trim())) return;
    setBusy(true); onBusy(true); setFailed(false); setErrorCode(null); setSaved(false);
    try {
      const { data } = await supabase.auth.getSession(); if (!data.session) throw new Error("Sign in");
      receipt.current ??= crypto.randomUUID();
      const response = await fetch(endpoint, { method: editing && myComment ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify(editing && myComment ? { commentId: myComment.id, text: text.trim(), active:true, score: canEditScore ? score : null } : { trackId, score: canRate ? (scoreLocked ? myScore : score) : null, text: text.trim(), requestId: receipt.current }) });
      const payload = await response.json(); if (!response.ok) { setErrorCode(payload.code ?? null); throw new Error("Unavailable"); }
      if (!alive.current) return;
      setEditing(false); window.dispatchEvent(new CustomEvent("aipoger:credit"));
      receipt.current = null; drafts?.delete(trackId); setText(""); setSaved(true); onSaved(payload.comment ?? null);
      window.dispatchEvent(new CustomEvent("aipoger:mv-rating", { detail: { trackId } }));
      setRetry(value => value + 1);
    } catch { if (alive.current) setFailed(true); }
    finally { if (alive.current) { setBusy(false); onBusy(false); } }
  };
  const withdraw = async () => {
    if (!myComment || busy || !canDeleteComment) return;
    setBusy(true); onBusy(true); setFailed(false);
    try {
      const {data}=await supabase.auth.getSession(); if(!data.session) throw new Error("Sign in");
      const r=await fetch(endpoint,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({commentId:myComment.id,text:myComment.text,active:false})});
      if(!r.ok) throw new Error("Unavailable");
      if (!alive.current) return;
      setMyComment(null);setEditing(false);setText("");onSaved(null);setRetry(v=>v+1);window.dispatchEvent(new CustomEvent("aipoger:credit"));
      window.dispatchEvent(new CustomEvent("aipoger:mv-rating", { detail: { trackId } }));
    } catch {if (alive.current) setFailed(true);} finally {if (alive.current) {setBusy(false);onBusy(false);}}
  };
  const edit = () => { receipt.current = null; setSaved(false); };
  return <form onSubmit={submit} className={`${styles.feedbackForm} ${styles.mvRatingForm}`}>
    {isAlbum ? <><h3>{albums.comments}</h3><p>{albums.note}</p></> : <>
    <div className={styles.ratingHeading}><h3>{question}</h3><span>{summary?.ratingCount ? `${summary.ratingAverage?.toFixed(1)} ${mv.points}｜${summary.ratingCount} ${mv.raters}` : mv.unrated}</span></div>
    <div className={styles.ratingInputRow}>
      <label htmlFor={`work-score-${trackId}`} className={styles.srOnly}>{question}</label>
      <div className={styles.ratingInputWrap}>
        <input id={`work-score-${trackId}`} type="text" inputMode="decimal" value={scoreInput} placeholder="8.7" maxLength={4}
          pattern="(?:[1-9](?:[.,][0-9])?|10(?:[.,]0)?)" required={signedIn && requiresScore} autoComplete="off"
          disabled={!ready || !signedIn || !canRate || busy || scoreLocked || reviewBlocked || Boolean(myComment && !editing) || (editing && !canEditScore)} aria-invalid={invalidScore} aria-describedby={`work-score-note-${trackId}`}
          onChange={event => { edit(); const value = event.target.value; setScoreInput(value); drafts?.set(trackId, { score: parseWorkRating(value), scoreInput: value, text }); }} />
        <span aria-hidden="true">/ 10</span>
      </div>
      <span id={`work-score-note-${trackId}`}>{mv.scoreHint}{ready && canEditScore ? "" : ` · ${ready && signedIn && !canRate ? mv.ownWork : mv.ratingNote}`}</span>
    </div>
    {invalidScore ? <p className={styles.ratingInvalid} role="alert">{mv.scoreError}</p> : null}
    </>}
    {signedIn ? <>
      <p className={styles.ratingNote}>{creditCopy(lang).reviewHint}</p>
      {myComment ? <div className={styles.reviewActions}>
        {canEditComment ? <button type="button" disabled={busy || !ready} onClick={() => { setEditing(!editing); setText(myComment.text); setScoreInput(myScore === null ? "" : String(myScore)); setErrorCode(null); setFailed(false); receipt.current = null; drafts?.delete(trackId); }}>{editing ? creditCopy(lang).cancelEdit : canDeleteComment ? creditCopy(lang).edit : creditCopy(lang).editOnce}</button> : <span>{creditCopy(lang).edited}</span>}
        {canDeleteComment ? <button type="button" disabled={busy} onClick={() => void withdraw()}>{creditCopy(lang).withdraw}</button> : null}
      </div> : null}
      <label htmlFor={`mv-thoughts-${trackId}`}>{mv.thoughts}</label>
      <textarea id={`mv-thoughts-${trackId}`} value={text} maxLength={280} rows={3} placeholder={mv.thoughts} disabled={busy || !ready || reviewBlocked} readOnly={Boolean(myComment && !editing)}
        onChange={event => { edit(); drafts?.set(trackId, { score, scoreInput, text: event.target.value }); setText(event.target.value); }} />
      <div><span>{text.length} / 280</span>{(!myComment || editing) && !reviewBlocked ? <button type="submit" disabled={!ready || busy || (requiresScore ? score === null : !text.trim()) || (editing && !text.trim())}>{busy ? copy.sending : editing ? creditCopy(lang).saveEdit : mv.sendReview}</button> : null}</div>
      {reviewBlocked ? <p className={styles.ratingNote}>{creditCopy(lang).reviewUnavailable}</p> : null}
    </> : null}
    {failed ? <p role="alert" className={styles.refreshError}>{errorCode === "REVIEW_CONTENT_REQUIRED" ? creditCopy(lang).contentRequired : errorCode === "REVIEW_EDIT_LIMIT" ? creditCopy(lang).edited : errorCode === "REVIEW_SCORE_LOCKED" ? mv.ratingNote : errorCode === "REVIEW_ALREADY_EXISTS" ? creditCopy(lang).reviewExists : mv.ratingError}<button type="button" onClick={() => { setEditing(false); setRetry(value => value + 1); }}>{copy.retry}</button></p> : null}
    {saved ? <p role="status" className={styles.feedbackSaved}>{mv.reviewSaved}</p> : null}
  </form>;
}
