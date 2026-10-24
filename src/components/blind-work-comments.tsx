"use client";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { battleRetroCopy } from "@/lib/battle-retro-copy";
import styles from "./battle-retro.module.css";

type Comment = { id: string; name: string; text: string; createdAt: string };
export default function BlindWorkComments({ trackId, version, onReview }: { trackId: string; version: number; onReview: () => void }) {
  const { lang } = useI18n(), c = battleRetroCopy(lang);
  const [comments, setComments] = useState<Comment[]>([]), [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setLoading(true); setFailed(false); setComments([]);
    void (async () => {
      try {
        const response = await fetch("/api/listen-bar/track-comments?trackId=" + encodeURIComponent(trackId), { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.comments)) throw new Error("COMMENTS_UNAVAILABLE");
        if (active) setComments(payload.comments);
      } catch { if (active) setFailed(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [trackId, version, retry]);
  const latest = comments.slice(-2).reverse();
  return <div className={styles.revealComments}>
    <div className={styles.revealCommentsHeading}><h3>{c.listenerComments}{!loading && !failed && comments.length ? <span> · {comments.length}</span> : null}</h3>
      <button type="button" onClick={onReview}><MessageSquare size={16}/>{c.reviewSong}</button></div>
    {loading ? <p className={styles.revealCommentsState} role="status">{c.commentsLoading}</p>
      : failed ? <p className={styles.revealCommentsState} role="alert">{c.commentsFailed}<button type="button" onClick={() => setRetry(n => n + 1)}>{c.retry}</button></p>
      : latest.length ? <div className={styles.revealCommentList}>{latest.map(comment => <div className={styles.revealComment} key={comment.id}><strong>{comment.name}</strong><p>{comment.text}</p></div>)}</div>
        : <p className={styles.revealCommentsState}>{c.firstReview}</p>}
  </div>;
}
