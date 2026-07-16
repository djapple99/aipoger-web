"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogIn, MessageCircle, Send, Trash2, X } from "lucide-react";
import ReportButton from "@/components/report-button";
import { rememberAuthNextPath } from "@/lib/auth-urls";
import { AIPOGER_CHOICE_COMMENT_MAX_LENGTH } from "@/lib/aipoger-choice";
import { supabase } from "@/lib/supabase";

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
  open: boolean;
  collectionKind: ChoiceCollectionKind;
  collectionId: string;
  title: string;
  isZh: boolean;
  onClose: () => void;
};

function commentTime(value: string, isZh: boolean) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(isZh ? "zh-TW" : "en", {
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
  open,
  collectionKind,
  collectionId,
  title,
  isZh,
  onClose,
}: ChoiceCommentsDialogProps) {
  const [comments, setComments] = useState<ChoiceComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [schemaReady, setSchemaReady] = useState(true);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const query = useMemo(
    () => new URLSearchParams({ collectionKind, collectionId }).toString(),
    [collectionId, collectionKind],
  );

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? "";
    setAccessToken(token);
    const response = await fetch(`/api/choice/comments?${query}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const payload = (await response.json().catch(() => null)) as {
      comments?: ChoiceComment[];
      schemaReady?: boolean;
      error?: string;
    } | null;
    setLoading(false);
    if (!response.ok) {
      setError(payload?.error || (isZh ? "評論讀取失敗，請稍後再試。" : "Comments could not be loaded."));
      return;
    }
    setSchemaReady(payload?.schemaReady !== false);
    setComments(Array.isArray(payload?.comments) ? payload.comments : []);
  }, [isZh, query]);

  useEffect(() => {
    if (!open) return;
    void loadComments();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [loadComments, onClose, open]);

  if (!open) return null;

  function goToSignIn() {
    const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    rememberAuthNextPath(nextPath);
    window.location.assign(`/auth?next=${encodeURIComponent(nextPath)}`);
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
    const response = await fetch("/api/choice/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ collectionKind, collectionId, body }),
    });
    const payload = (await response.json().catch(() => null)) as { comment?: ChoiceComment; error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload?.comment) {
      setError(payload?.error || (isZh ? "評論送出失敗，請稍後再試。" : "Comment could not be posted."));
      return;
    }
    setComments((current) => [...current, payload.comment as ChoiceComment]);
    setCommentBody("");
    textareaRef.current?.focus();
  }

  async function deleteComment(commentId: string) {
    if (!accessToken || deletingId) return;
    setDeletingId(commentId);
    setError("");
    const response = await fetch("/api/choice/comments", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ commentId }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setDeletingId("");
    if (!response.ok) {
      setError(payload?.error || (isZh ? "評論刪除失敗。" : "Comment could not be deleted."));
      return;
    }
    setComments((current) => current.filter((comment) => comment.id !== commentId));
  }

  return (
    <div className="fixed inset-0 z-[235] flex items-end bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={isZh ? "Choice 評論" : "Choice comments"} onMouseDown={onClose}>
      <section className="flex max-h-[86svh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-cyan-100/20 bg-[#080808] shadow-[0_28px_100px_rgba(0,0,0,0.78)]" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70"><MessageCircle className="h-3.5 w-3.5" />{isZh ? "Choice 評論" : "Choice Comments"}</p>
            <h2 className="mt-1 line-clamp-2 text-xl font-black text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition hover:border-white/30 hover:text-white" aria-label={isZh ? "關閉評論" : "Close comments"}><X className="h-4 w-4" /></button>
        </header>

        <div className="min-h-36 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {loading ? <p className="py-12 text-center text-sm font-bold text-zinc-500">{isZh ? "讀取評論中..." : "Loading comments..."}</p> : null}
          {!loading && !schemaReady ? <p className="border-l-2 border-orange-300 pl-3 text-sm font-bold text-zinc-400">{isZh ? "評論服務正在準備中。" : "Comments are being prepared."}</p> : null}
          {!loading && schemaReady && comments.length === 0 ? <p className="py-12 text-center text-sm font-bold text-zinc-500">{isZh ? "還沒有評論，留下第一句。" : "No comments yet."}</p> : null}
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
                      <time dateTime={comment.createdAt} className="text-[10px] font-bold tabular-nums text-zinc-600">{commentTime(comment.createdAt, isZh)}</time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-zinc-300">{comment.body}</p>
                  </div>
                  <div className="flex items-start gap-1">
                    {comment.isMine ? (
                      <button type="button" disabled={deletingId === comment.id} onClick={() => void deleteComment(comment.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200/20 text-red-100 transition hover:border-red-200/60 disabled:opacity-40" aria-label={isZh ? "刪除自己的評論" : "Delete my comment"} title={isZh ? "刪除" : "Delete"}><Trash2 className="h-3.5 w-3.5" /></button>
                    ) : (
                      <ReportButton targetType="comment" targetId={comment.id} targetTitle={`${title} · ${comment.displayName}`} context={`Choice ${collectionKind}:${collectionId}`} iconOnly className="h-8 w-8 p-0" lang={isZh ? "zh" : "en"} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="border-t border-white/10 px-4 py-3 sm:px-5">
          {error ? <p className="mb-2 text-xs font-bold text-rose-200" role="alert">{error}</p> : null}
          {accessToken ? (
            <form onSubmit={submitComment} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <label className="min-w-0">
                <span className="sr-only">{isZh ? "寫下評論" : "Write a comment"}</span>
                <textarea ref={textareaRef} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} maxLength={AIPOGER_CHOICE_COMMENT_MAX_LENGTH} rows={2} placeholder={isZh ? "寫下你對這份 Choice 的評論..." : "Comment on this Choice..."} className="min-h-12 w-full resize-none rounded-md border border-white/12 bg-black px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-100/60" />
              </label>
              <button type="submit" disabled={busy || !commentBody.trim() || !schemaReady} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-35" aria-label={isZh ? "送出評論" : "Post comment"}><Send className="h-4 w-4" /></button>
              <p className="col-span-2 text-right text-[10px] font-bold tabular-nums text-zinc-600">{commentBody.length}/{AIPOGER_CHOICE_COMMENT_MAX_LENGTH}</p>
            </form>
          ) : (
            <button type="button" onClick={goToSignIn} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-100/30 px-4 text-sm font-black text-cyan-100 transition hover:border-cyan-100 hover:text-white"><LogIn className="h-4 w-4" />{isZh ? "登入後留下評論" : "Sign in to comment"}</button>
          )}
        </footer>
      </section>
    </div>
  );
}
