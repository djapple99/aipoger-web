"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { workReplyCopy } from "@/lib/work-reply-copy";
import type { Lang } from "@/lib/locale";
import styles from "./home-editorial.module.css";

type WorkReply = { id: string; commentId: string; name: string; text: string; createdAt: string };
export function useWorkCommentReplies(trackId: string, signedIn: boolean) {
  const [replies, setReplies] = useState<WorkReply[]>([]);
  const [canReplyIds, setCanReplyIds] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const current = useRef(trackId); current.current = trackId;
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setCanReplyIds([]); setVersion(v => v + 1); });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setCanReplyIds([]); setFailed(false);
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (controller.signal.aborted) return;
        const response = await fetch(`/api/work-comment-replies?trackId=${encodeURIComponent(trackId)}`, {
          cache: "no-store", signal: controller.signal, headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.replies) || !Array.isArray(data.canReplyIds)) throw new Error("Unavailable");
        if (!controller.signal.aborted) { setReplies(data.replies); setCanReplyIds(data.canReplyIds); }
      } catch { if (!controller.signal.aborted) setFailed(true); }
    })();
    return () => controller.abort();
  }, [trackId, signedIn, version]);
  const save = async (commentId: string, text: string, requestId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("SIGN_IN");
    const response = await fetch("/api/work-comment-replies", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ trackId, commentId, text, requestId }) });
    const data = await response.json();
    if (!response.ok || data.reply?.commentId !== commentId || !data.reply?.id || ![0, 2].includes(data.creditAwarded)) throw new Error(response.status === 401 ? "SIGN_IN" : "Unavailable");
    if (current.current === trackId) setReplies(rows => rows.some(r => r.id === data.reply.id) ? rows : [...rows, data.reply]);
    window.dispatchEvent(new CustomEvent("aipoger:credit"));
    return data.creditAwarded as number;
  };
  return { replies, canReplyIds, failed, retry: () => setVersion(v => v + 1), save };
}
export default function WorkCommentReplies({ commentId, lang, state, onBusy }: { commentId: string; lang: Lang; state: ReturnType<typeof useWorkCommentReplies>; onBusy?: (busy: boolean) => void }) {
  const copy = workReplyCopy(lang); const rows = state.replies.filter(r => r.commentId === commentId);
  const [open, setOpen] = useState(false), [text, setText] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [failed, setFailed] = useState(false);
  const pending = useRef<{ text: string; id: string } | null>(null);
  const submit = async () => {
    if (busy || !text.trim()) return;
    setBusy(true); onBusy?.(true); setFailed(false); setMessage("");
    const body = text.trim();
    if (pending.current?.text !== body) pending.current = { text: body, id: crypto.randomUUID() };
    try {
      const earned = await state.save(commentId, body, pending.current.id);
      pending.current = null; setText(""); setOpen(false); setMessage(earned === 2 ? copy.earned : copy.saved);
    } catch (error) { setFailed(true); setMessage(error instanceof Error && error.message === "SIGN_IN" ? copy.signIn : copy.failed); }
    finally { setBusy(false); onBusy?.(false); }
  };
  return <>
    {rows.length ? <div className={styles.replyThread}>{rows.map(row => <div key={row.id} id={`reply-${row.id}`} className={styles.replyItem}><span>{copy.author} · {row.name}</span><p>{row.text}</p></div>)}</div> : null}
    {state.canReplyIds.includes(commentId) ? <div className={styles.replyControls}>
      {!open ? <button type="button" onClick={() => { setOpen(true); setMessage(""); }}>{rows.length ? copy.again : copy.reply}</button>
        : <form onSubmit={event => { event.preventDefault(); void submit(); }}>
          <label htmlFor={`reply-input-${commentId}`}>{copy.reply}</label>
          <textarea id={`reply-input-${commentId}`} value={text} onChange={event => setText(event.target.value)} maxLength={280} rows={2} placeholder={copy.placeholder} disabled={busy} />
          <div><span>{rows.length ? `${text.length} / 280` : copy.hint}</span><button type="button" disabled={busy} onClick={() => setOpen(false)}>{copy.cancel}</button><button type="submit" disabled={busy || !text.trim()}>{copy.send}</button></div>
        </form>}
    </div> : null}
    {message ? <div className={failed ? styles.replyError : styles.replySaved} role={failed ? "alert" : "status"}>{message}</div> : null}
  </>;
}
