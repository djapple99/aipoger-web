"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { LogIn, MessageCircle, Reply, Send, Trash2, X } from "lucide-react";
import ReportButton from "@/components/report-button";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { AIPOGER_CHOICE_COMMENT_MAX_LENGTH } from "@/lib/aipoger-choice";
import type { Lang } from "@/lib/locale";
import { supabase } from "@/lib/supabase";

const commentsCopy = {
  zh: { heading: "Choice 評論", close: "關閉評論", loading: "讀取評論中...", preparing: "評論服務正在準備中。", empty: "還沒有評論，聊聊你聽完這份歌單的感受。", loadFailed: "評論讀取失敗，請稍後再試。", postFailed: "評論送出失敗，請稍後再試。", deleteFailed: "評論刪除失敗。", deleteMine: "刪除自己的評論", write: "寫下評論", placeholder: "分享你對這份 Choice 的感想...", post: "送出評論", signIn: "登入後留下評論", reply: "回覆", retry: "重新讀取", tooLong: "請縮短評論，再加入回覆對象。" },
  en: { heading: "Choice comments", close: "Close comments", loading: "Loading comments...", preparing: "Comments are being prepared.", empty: "No comments yet. Share what you thought of this playlist.", loadFailed: "Comments could not be loaded.", postFailed: "Comment could not be posted. Please try again.", deleteFailed: "Comment could not be deleted.", deleteMine: "Delete my comment", write: "Write a comment", placeholder: "Share your thoughts on this Choice...", post: "Post comment", signIn: "Sign in to comment", reply: "Reply", retry: "Reload comments", tooLong: "Shorten your comment before adding a reply name." },
  ja: { heading: "Choice コメント", close: "コメントを閉じる", loading: "コメントを読み込み中...", preparing: "コメント機能を準備中です。", empty: "まだコメントはありません。このプレイリストの感想を聞かせてください。", loadFailed: "コメントを読み込めませんでした。", postFailed: "コメントを投稿できませんでした。もう一度お試しください。", deleteFailed: "コメントを削除できませんでした。", deleteMine: "自分のコメントを削除", write: "コメントを書く", placeholder: "この Choice の感想を書いてください...", post: "コメントを投稿", signIn: "ログインしてコメント", reply: "返信", retry: "再読み込み", tooLong: "返信先を追加する前にコメントを短くしてください。" },
  ko: { heading: "Choice 댓글", close: "댓글 닫기", loading: "댓글을 불러오는 중...", preparing: "댓글 기능을 준비하고 있습니다.", empty: "아직 댓글이 없습니다. 플레이리스트를 듣고 느낀 점을 남겨 주세요.", loadFailed: "댓글을 불러오지 못했습니다.", postFailed: "댓글을 등록하지 못했습니다. 다시 시도해 주세요.", deleteFailed: "댓글을 삭제하지 못했습니다.", deleteMine: "내 댓글 삭제", write: "댓글 쓰기", placeholder: "이 Choice에 대한 감상을 남겨 주세요...", post: "댓글 등록", signIn: "로그인하고 댓글 쓰기", reply: "답글", retry: "다시 불러오기", tooLong: "답글 대상을 추가하기 전에 댓글을 줄여 주세요." },
};

type ChoiceCollectionKind = "official" | "creator";

type ChoiceComment = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
  isMine: boolean;
};

type ChoiceCommentsDialogProps = {
  open?: boolean;
  inline?: boolean;
  collectionKind: ChoiceCollectionKind;
  collectionId: string;
  title: string;
  lang: Lang;
  onClose?: () => void;
};

function commentTime(value: string, lang: Lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-TW" : lang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function initialFor(value: string) {
  return Array.from(value.trim())[0]?.toUpperCase() || "A";
}

export default function ChoiceCommentsDialog({
  open = true,
  inline = false,
  collectionKind,
  collectionId,
  title,
  lang,
  onClose,
}: ChoiceCommentsDialogProps) {
  const copy = commentsCopy[lang];
  const [comments, setComments] = useState<ChoiceComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [schemaReady, setSchemaReady] = useState(true);
  const [error, setError] = useState("");
  const loadVersion = useRef(0);
  const identityRef = useRef("");
  const [retry, setRetry] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const query = useMemo(
    () => new URLSearchParams({ collectionKind, collectionId }).toString(),
    [collectionId, collectionKind],
  );

  useEffect(() => {
    if (!open) return;
    let alive = true;
    let controller: AbortController | undefined;
    const requests = loadVersion;
    let loadedToken: string | undefined;
    const loadComments = async (token: string, nextUserId: string | null) => {
      if (!alive || loadedToken === token) return;
      loadedToken = token;
      const version = ++requests.current;
      controller?.abort();
      controller = new AbortController();
      const identity = `${query}:${nextUserId ?? "guest"}`;
      if (identityRef.current !== identity) { setCommentBody(""); setComments([]); }
      identityRef.current = identity;
      setAccessToken(token); setLoading(true); setError(""); setBusy(false); setDeletingId("");
      try {
        const response = await fetch(`/api/choice/comments?${query}`, {
          cache: "no-store", signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const payload = await response.json();
        if (!alive || version !== requests.current) return;
        if (!response.ok) throw new Error(copy.loadFailed);
        setSchemaReady(payload?.schemaReady !== false);
        setComments(Array.isArray(payload?.comments) ? payload.comments : []);
      } catch {
        if (alive && version === requests.current) setError(copy.loadFailed);
      } finally {
        if (alive && version === requests.current) setLoading(false);
      }
    };
    let authEventSeen = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      void loadComments(session?.access_token ?? "", session?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!authEventSeen) void loadComments(session?.access_token ?? "", session?.user.id ?? null);
    }).catch(() => { if (!authEventSeen) void loadComments("", null); });
    return () => { alive = false; ++requests.current; controller?.abort(); subscription.unsubscribe(); };
  }, [copy.loadFailed, open, query, retry]);

  useEffect(() => {
    if (!open || inline) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [inline, onClose, open]);

  if (!open) return null;

  function goToSignIn() {
    const nextPath = `${window.location.pathname}${window.location.search}${inline ? "#choice-comments" : window.location.hash}`;
    rememberAuthNextPath(nextPath);
    window.location.assign(`/auth?lang=${lang}&next=${encodeURIComponent(nextPath)}`);
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body || busy) return;
    if (!accessToken) {
      goToSignIn();
      return;
    }
    setBusy(true);
    setError("");
    const version = loadVersion.current;
    try {
      const response = await fetch("/api/choice/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ collectionKind, collectionId, body }),
      });
      const payload = (await response.json().catch(() => null)) as { comment?: ChoiceComment; error?: string } | null;
      if (version !== loadVersion.current) return;
      if (!response.ok || !payload?.comment) {
        setError(payload?.error || copy.postFailed);
        return;
      }
      setComments((current) => [...current, payload.comment as ChoiceComment]);
      setCommentBody("");
      textareaRef.current?.focus();
    } catch { if (version === loadVersion.current) setError(copy.postFailed); }
    finally { if (version === loadVersion.current) setBusy(false); }
  }

  async function deleteComment(commentId: string) {
    if (!accessToken || deletingId) return;
    setDeletingId(commentId);
    setError("");
    const version = loadVersion.current;
    try {
      const response = await fetch("/api/choice/comments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ commentId }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (version !== loadVersion.current) return;
      if (!response.ok) {
        setError(payload?.error || copy.deleteFailed);
        return;
      }
      setComments((current) => current.filter((comment) => comment.id !== commentId));
    } catch { if (version === loadVersion.current) setError(copy.deleteFailed); }
    finally { if (version === loadVersion.current) setDeletingId(""); }
  }

  const panel = (
      <section aria-label={copy.heading} className={inline ? "w-full min-w-0 border-t border-white/15 bg-[#080808]" : "flex max-h-[86svh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-cyan-100/20 bg-[#080808] shadow-[0_28px_100px_rgba(0,0,0,0.78)]"} onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            {!inline ? <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70"><MessageCircle className="h-3.5 w-3.5" />{copy.heading}</p> : null}
            <h2 className="mt-1 line-clamp-2 text-xl font-black text-white">{inline ? copy.heading : title}</h2>
          </div>
          {!inline ? <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white" aria-label={copy.close}><X className="h-4 w-4" /></button> : null}
        </header>

        <div className={inline ? "min-h-24 px-4 py-3 sm:px-5" : "min-h-36 flex-1 overflow-y-auto px-4 py-3 sm:px-5"}>
          {loading ? <p className="py-12 text-center text-sm font-bold text-zinc-500">{copy.loading}</p> : null}
          {!loading && !schemaReady ? <p className="border-l-2 border-orange-300 pl-3 text-sm font-bold text-zinc-400">{copy.preparing}</p> : null}
          {!loading && !error && schemaReady && comments.length === 0 ? <p className="py-12 text-center text-sm font-bold text-zinc-500">{copy.empty}</p> : null}
          {!loading && comments.length > 0 ? (
            <div className="divide-y divide-white/8">
              {comments.map((comment) => (
                <article key={comment.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] text-xs font-black text-cyan-100">
                    {comment.avatarUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={comment.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      </>
                    ) : initialFor(comment.displayName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="truncate text-sm font-black text-white">{comment.displayName}</p>
                      <time dateTime={comment.createdAt} className="text-[10px] font-bold tabular-nums text-zinc-600">{commentTime(comment.createdAt, lang)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-zinc-300">{comment.body}</p>
                    <button type="button" disabled={busy} onClick={() => {
                      if (!accessToken) { goToSignIn(); return; }
                      const mention = `@${comment.displayName} `;
                      const next = commentBody.startsWith(mention) ? commentBody : `${mention}${commentBody}`;
                      if (next.length > AIPOGER_CHOICE_COMMENT_MAX_LENGTH) { setError(copy.tooLong); return; }
                      setCommentBody(next);
                      textareaRef.current?.focus();
                    }} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-orange-300"><Reply className="h-3.5 w-3.5" />{copy.reply}</button>
                  </div>
                  <div className="flex items-start gap-1">
                    {comment.isMine ? (
                      <button type="button" disabled={deletingId === comment.id} onClick={() => void deleteComment(comment.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200/20 text-red-100 transition hover:border-red-200/60 disabled:opacity-40" aria-label={copy.deleteMine} title={copy.deleteMine}><Trash2 className="h-3.5 w-3.5" /></button>
                    ) : (
                      <ReportButton targetType="comment" targetId={comment.id} targetTitle={`${title} · ${comment.displayName}`} context={`Choice ${collectionKind}:${collectionId}`} iconOnly className="h-8 w-8 p-0" lang={lang} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-white/10 px-4 py-3 sm:px-5">
          {error ? <p className="mb-2 text-xs font-bold text-rose-200" role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="min-h-11 underline">{copy.retry}</button></p> : null}
          {accessToken ? (
            <form onSubmit={submitComment} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <label className="min-w-0">
                <span className="sr-only">{copy.write}</span>
                <textarea ref={textareaRef} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={AIPOGER_CHOICE_COMMENT_MAX_LENGTH} rows={3} disabled={busy} placeholder={copy.placeholder} className="min-h-12 w-full resize-none rounded-md border border-white/12 bg-black px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-100/60" />
              </label>
              <button type="submit" disabled={loading || busy || !commentBody.trim() || !schemaReady} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-35" aria-label={copy.post}><Send className="h-4 w-4" /></button>
              <p className="col-span-2 text-right text-[10px] font-bold tabular-nums text-zinc-600">{commentBody.length}/{AIPOGER_CHOICE_COMMENT_MAX_LENGTH}</p>
            </form>
          ) : (
            <button type="button" onClick={goToSignIn} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-100/30 px-4 text-sm font-black text-cyan-100 transition hover:border-cyan-100 hover:text-white"><LogIn className="h-4 w-4" />{copy.signIn}</button>
          )}
        </footer>
      </section>
  );
  if (inline) return <div id="choice-comments" className="mt-10 scroll-mt-24">{panel}</div>;
  return <div className="fixed inset-0 z-[235] flex items-end bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={copy.heading} onMouseDown={onClose}>{panel}</div>;
}
