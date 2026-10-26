"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, ThumbsUp } from "lucide-react";
import ReportButton from "@/components/report-button";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { supabase } from "@/lib/supabase";
import type { Lang } from "@/lib/locale";
import { newsDiscussionCopy, type NewsCursor, type NewsDiscussion } from "@/lib/music-news-discussion";

export default function MusicNewsDiscussion({ slug, title, lang }: { slug: string; title: string; lang: Lang }) {
  const copy = newsDiscussionCopy[lang];
  const endpoint = `/api/news/${encodeURIComponent(slug)}/discussion`;
  const [discussion, setDiscussion] = useState<NewsDiscussion | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const generation = useRef(0);
  const activeUser = useRef<string | null | undefined>(undefined);
  const authGeneration = useRef(0);
  const writeGeneration = useRef(0);
  const writeLock = useRef({ like: false, comment: false });
  const pendingComment = useRef<{ body: string; requestId: string } | null>(null);

  const load = useCallback(async (token: string, cursor: NewsCursor = null) => {
    const revision = cursor ? generation.current : ++generation.current;
    const savedWrite = writeGeneration.current;
    if (cursor) setMoreBusy(true); else setLoading(true);
    setError("");
    try {
      const query = cursor ? `?${new URLSearchParams({ before: cursor.createdAt, beforeId: cursor.id })}` : "";
      const response = await fetch(endpoint + query, { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const payload = await response.json() as NewsDiscussion;
      if (!response.ok) throw new Error("UNAVAILABLE");
      if (generation.current !== revision) return;
      if (writeGeneration.current !== savedWrite) return;
      setDiscussion(current => cursor && current ? { ...payload, comments: [...current.comments, ...payload.comments.filter(item => !current.comments.some(existing => existing.id === item.id))] } : payload);
    } catch {
      if (generation.current === revision) setError("UNAVAILABLE");
    } finally {
      if (generation.current === revision) { setLoading(false); setMoreBusy(false); }
    }
  }, [endpoint]);
  const invalidateRequests = useCallback(() => { generation.current++; authGeneration.current++; }, []);

  useEffect(() => {
    let alive = true;
    let authRevision = 0;
    function updateIdentity(userId: string | null) {
      if (activeUser.current !== userId) {
        authGeneration.current++;
        if (activeUser.current !== undefined) { setBody(""); pendingComment.current = null; setSent(false); }
        setDiscussion(current => current ? { ...current, signedIn: false, liked: false, viewerName: null } : current);
        activeUser.current = userId;
      }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authRevision++;
      if (!alive) return;
      // A different account must never inherit the previous member's private draft.
      updateIdentity(session?.user && !session.user.is_anonymous ? session.user.id : null);
      void load(session?.user && !session.user.is_anonymous ? session.access_token : "");
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (alive && !authRevision) { updateIdentity(session?.user && !session.user.is_anonymous ? session.user.id : null); void load(session?.user && !session.user.is_anonymous ? session.access_token : ""); }
    }).catch(() => { if (alive && !authRevision) void load(""); });
    return () => { alive = false; invalidateRequests(); subscription.unsubscribe(); };
  }, [load, invalidateRequests]);

  function signIn() {
    const nextPath = window.location.pathname + window.location.search + "#news-discussion";
    rememberAuthNextPath(nextPath);
    window.location.assign(`/auth?lang=${lang}&next=${encodeURIComponent(nextPath)}`);
  }
  async function tokenForWrite() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || session.user.is_anonymous) { signIn(); return null; }
    if (session.user.id !== activeUser.current) { void load(session.access_token); return null; }
    return session.access_token;
  }
  function handleFailure(code: string, status: number) {
    if (status === 401) setDiscussion(current => current ? { ...current, signedIn: false, liked: false, viewerName: null } : current);
    setError(code || "UNAVAILABLE");
  }
  async function toggleLike() {
    if (!discussion?.signedIn) { signIn(); return; }
    if (writeLock.current.like) return;
    writeLock.current.like = true; setLikeBusy(true); setError(""); setSent(false);
    const revision = authGeneration.current;
    try {
      const token = await tokenForWrite(); if (!token) return;
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ liked: !discussion.liked }) });
      const payload = await response.json();
      if (authGeneration.current !== revision) return;
      if (!response.ok) { handleFailure(payload.code, response.status); return; }
      writeGeneration.current++;
      setDiscussion(current => current ? { ...current, liked: payload.liked, likeCount: payload.likeCount } : current);
    } catch { if (authGeneration.current === revision) setError("UNAVAILABLE"); }
    finally { writeLock.current.like = false; setLikeBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!discussion?.signedIn) { signIn(); return; }
    if (!text || Array.from(text).length > 1000 || writeLock.current.comment) return;
    writeLock.current.comment = true; setSendBusy(true); setError(""); setSent(false);
    const revision = authGeneration.current;
    try {
      const token = await tokenForWrite(); if (!token) return;
      if (!pendingComment.current || pendingComment.current.body !== text) pendingComment.current = { body: text, requestId: crypto.randomUUID() };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(pendingComment.current) });
      const payload = await response.json();
      if (authGeneration.current !== revision) return;
      if (!response.ok || !payload.comment) { handleFailure(payload.code, response.status); return; }
      writeGeneration.current++;
      setDiscussion(current => current ? { ...current, commentCount: payload.commentCount, comments: [payload.comment, ...current.comments.filter(item => item.id !== payload.comment.id)] } : current);
      setBody(""); pendingComment.current = null; setSent(true); textarea.current?.focus();
    } catch { if (authGeneration.current === revision) setError("UNAVAILABLE"); }
    finally { writeLock.current.comment = false; setSendBusy(false); }
  }
  async function reload(cursor: NewsCursor = null) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await load(session?.user && !session.user.is_anonymous ? session.access_token : "", cursor);
    } catch { setError("UNAVAILABLE"); }
  }
  const errorText = error === "RATE_LIMIT" ? copy.rate : error === "REQUEST_CONFLICT" ? copy.conflict : error === "AUTH_REQUIRED" ? copy.hint : copy.failed;
  return <section id="news-discussion" className="music-news-discussion" aria-labelledby="news-discussion-title" lang={lang === "zh" ? "zh-Hant" : lang}>
    <header><div><h2 id="news-discussion-title">{copy.title}</h2><p>{copy.intro}</p></div>
      <div className="news-discussion-actions"><button type="button" className="news-like" aria-pressed={discussion?.liked ?? false} disabled={loading || likeBusy || !discussion} onClick={() => void toggleLike()}>
        <ThumbsUp size={18} aria-hidden="true" />{discussion?.liked ? copy.liked : copy.like}<span>{discussion?.likeCount ?? "—"}</span>
      </button><button type="button" onClick={() => discussion?.signedIn ? textarea.current?.focus() : signIn()}><MessageCircle size={18} aria-hidden="true" />{copy.comments}<span>{discussion?.commentCount ?? "—"}</span></button></div>
    </header>
    {loading && !discussion ? <p role="status">{copy.loading}</p> : null}
    {discussion?.signedIn ? <form onSubmit={event => void submit(event)}>
      <label htmlFor="news-comment-body">{copy.label}</label>
      <p className="news-writing-as">{copy.writingAs} · {discussion.viewerName}</p>
      <textarea ref={textarea} id="news-comment-body" value={body} onChange={event => { setBody(event.target.value); setSent(false); }} placeholder={copy.placeholder} rows={4} required maxLength={2000} />
      <div className="news-comment-submit"><span aria-live="polite">{Array.from(body).length} / 1000</span><button type="submit" disabled={sendBusy || !body.trim() || Array.from(body.trim()).length > 1000}><Send size={16} aria-hidden="true" />{sendBusy ? copy.sending : copy.submit}</button></div>
    </form> : !loading ? <div className="news-discussion-signin"><p>{copy.hint}</p><button type="button" onClick={signIn}>{copy.signIn}</button></div> : null}
    {error ? <div className="news-discussion-error" role="alert"><p>{errorText}</p><button type="button" disabled={loading} onClick={() => void reload()}>{copy.retry}</button></div> : null}
    {sent ? <p className="news-discussion-success" role="status">{copy.sent}</p> : null}
    {discussion?.comments.length === 0 ? <p className="news-discussion-empty">{copy.empty}</p> : null}
    <div className="news-comment-list">{discussion?.comments.map(comment => <article key={comment.id} id={`news-comment-${comment.id}`}>
      <header><span className="news-comment-initial" aria-hidden="true">{Array.from(comment.displayName)[0] || "A"}</span><div><h3>{comment.displayName}</h3><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : lang, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Taipei" }).format(new Date(comment.createdAt))}</time></div>
        {discussion.signedIn ? <ReportButton targetType="comment" targetId={comment.id} targetTitle={`${title} · ${comment.displayName}`} context={`Music news ${slug}`} targetUrl={`/news/${slug}?lang=${lang}#news-comment-${comment.id}`} lang={lang} iconOnly /> : null}</header>
      <p>{comment.body}</p>
    </article>)}</div>
    {discussion?.nextCursor ? <button type="button" className="news-discussion-more" disabled={moreBusy || loading} onClick={() => void reload(discussion.nextCursor)}>{moreBusy ? copy.loading : copy.more}</button> : null}
  </section>;
}
