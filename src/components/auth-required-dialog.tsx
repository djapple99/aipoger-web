"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { fontRighteous } from "@/lib/fonts";

type AuthPromptKind = "bible" | "heart";

type AuthPromptCopy = {
  eyebrow: string;
  title: string;
  body: string;
  primary: string;
  cancel: string;
  close: string;
};

const COPY: Record<"zh" | "en" | "ja" | "ko", Record<AuthPromptKind, AuthPromptCopy>> = {
  zh: {
    bible: {
      eyebrow: "MEMBER ACCESS",
      title: "登入後開始練功",
      body: "完整的搜尋、複製、評論與實戰資料庫會接著打開。",
      primary: "登入／免費加入",
      cancel: "先看看介紹",
      close: "關閉登入提示",
    },
    heart: {
      eyebrow: "SAVE THIS TRACK",
      title: "登入後送出愛心",
      body: "愛心會同步收藏這首歌；登入回來後，就能繼續剛才的操作。",
      primary: "登入／免費加入",
      cancel: "繼續聽歌",
      close: "關閉登入提示",
    },
  },
  en: {
    bible: {
      eyebrow: "MEMBER ACCESS",
      title: "Sign in to start practicing",
      body: "The complete searchable, copyable, and discussion-ready field database will open next.",
      primary: "Sign in / Join free",
      cancel: "Preview first",
      close: "Close sign-in prompt",
    },
    heart: {
      eyebrow: "SAVE THIS TRACK",
      title: "Sign in to send a Heart",
      body: "A Heart also saves this track. You can continue right where you left off after signing in.",
      primary: "Sign in / Join free",
      cancel: "Keep listening",
      close: "Close sign-in prompt",
    },
  },
  ja: {
    bible: {
      eyebrow: "MEMBER ACCESS",
      title: "ログインして練習を始める",
      body: "検索・コピー・コメントに対応した実践データベースを、このまま開けます。",
      primary: "ログイン／無料登録",
      cancel: "まず紹介を見る",
      close: "ログイン案内を閉じる",
    },
    heart: {
      eyebrow: "SAVE THIS TRACK",
      title: "ログインしてHeartを送る",
      body: "Heartを送ると、この曲も保存されます。ログイン後に続きから操作できます。",
      primary: "ログイン／無料登録",
      cancel: "このまま聴く",
      close: "ログイン案内を閉じる",
    },
  },
  ko: {
    bible: {
      eyebrow: "MEMBER ACCESS",
      title: "로그인하고 연습 시작",
      body: "검색·복사·댓글이 가능한 실전 데이터베이스가 이어서 열립니다.",
      primary: "로그인／무료 가입",
      cancel: "소개 먼저 보기",
      close: "로그인 안내 닫기",
    },
    heart: {
      eyebrow: "SAVE THIS TRACK",
      title: "로그인하고 Heart 보내기",
      body: "Heart를 보내면 이 곡도 함께 저장됩니다. 로그인 후 바로 이어서 할 수 있어요.",
      primary: "로그인／무료 가입",
      cancel: "계속 듣기",
      close: "로그인 안내 닫기",
    },
  },
};

function promptCopy(lang: string, kind: AuthPromptKind) {
  const locale = lang === "ja" || lang === "ko" || lang === "en" ? lang : "zh";
  return COPY[locale][kind];
}

export default function AuthRequiredDialog({
  open,
  kind,
  lang,
  nextPath,
  onClose,
}: {
  open: boolean;
  kind: AuthPromptKind;
  lang: string;
  nextPath: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const primaryRef = useRef<HTMLAnchorElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const copy = promptCopy(lang, kind);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => primaryRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  const loginHref = `/auth?next=${encodeURIComponent(nextPath)}`;

  return (
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center bg-black/78 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md overflow-hidden rounded-[1.35rem] border border-orange-200/35 bg-[#0b0a09] px-5 pb-5 pt-7 text-white shadow-[0_30px_100px_rgba(0,0,0,0.72)] sm:px-7 sm:pb-7 sm:pt-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-zinc-400 transition hover:border-orange-100/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
          aria-label={copy.close}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-200/35 bg-orange-400/10 text-orange-200 shadow-[0_0_30px_rgba(255,106,0,0.16)]">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <p className={`${fontRighteous.className} mt-5 text-[11px] uppercase tracking-[0.26em] text-cyan-100/72`}>
          {copy.eyebrow}
        </p>
        <h2 id={titleId} className="mt-2 pr-10 text-2xl font-black leading-tight text-[#fff8ed] sm:text-3xl">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm font-bold leading-7 text-zinc-300">{copy.body}</p>

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Link
            ref={primaryRef}
            href={loginHref}
            className="aipo-primary-button inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black"
          >
            {copy.primary}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="aipo-ghost-button inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-black text-white"
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
