"use client";

import { Check, Copy, ExternalLink, QrCode, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AIPOGER_LINE_COMMUNITY_URL, AIPOGER_SOCIAL_LINKS } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";

type SocialIconProps = {
  label: string;
  className?: string;
};

export function SocialIcon({ label, className = "h-11 w-11" }: SocialIconProps) {
  const normalized = label.toLowerCase();

  if (normalized.includes("instagram")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.4" fill="#ff8a18" />
        <circle cx="16.4" cy="7.3" r="4.2" fill="#6f58ff" opacity="0.92" />
        <circle cx="8" cy="16.2" r="4.4" fill="#ff2a81" opacity="0.9" />
        <circle cx="7.1" cy="7.1" r="3.6" fill="#ffe66b" opacity="0.64" />
        <path d="M5.8 5.15h7.7" stroke="white" strokeLinecap="round" strokeOpacity="0.46" strokeWidth="1.35" />
        <circle cx="12" cy="12" r="4.05" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="17.1" cy="6.9" r="1.35" fill="white" />
      </svg>
    );
  }

  if (normalized.includes("line")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 3.15c-5.36 0-9.7 3.3-9.7 7.37 0 3.55 3.3 6.53 7.75 7.2-.1.34-.37 1.3-.43 1.59-.07.37.14.36.3.25.12-.08 1.84-1.2 2.57-1.69 5.25-.2 9.21-3.31 9.21-7.35 0-4.07-4.34-7.37-9.7-7.37Z" fill="#06c755" />
        <path d="M7.55 10.2h1.66v3.85H7.55V10.2Zm3.03 0h1.57l1.91 2.3v-2.3h1.66v3.85h-1.54l-1.94-2.34v2.34h-1.66V10.2Zm5.94 0h2.82v1.2h-1.17v.24h1.08v1.12h-1.08v.28h1.2v1.21h-2.85V10.2Z" fill="white" />
      </svg>
    );
  }

  if (normalized.includes("discord")) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M5.35 8.15c3.75-2.35 9.55-2.35 13.3 0l1.25 7.7c-1.62 1.38-3.22 2.12-4.8 2.32l-.88-1.35c-.72.12-1.48.18-2.22.18s-1.5-.06-2.22-.18l-.88 1.35c-1.58-.2-3.18-.94-4.8-2.32l1.25-7.7Z"
          fill="#7284ff"
        />
        <path d="M7.15 8.45c2.9-1.1 6.8-1.1 9.7 0" fill="none" stroke="white" strokeLinecap="round" strokeOpacity="0.46" strokeWidth="1.25" />
        <circle cx="9.4" cy="12.3" r="1.18" fill="white" />
        <circle cx="14.6" cy="12.3" r="1.18" fill="white" />
        <path d="M9.55 15.1c1.62.72 3.28.72 4.9 0" fill="none" stroke="white" strokeLinecap="round" strokeWidth="1.25" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9.6" fill="#1877f2" />
      <circle cx="9" cy="7.2" r="5" fill="#70b9ff" opacity="0.45" />
      <path d="M7.8 6.1c2.55-1.75 6.35-2.02 9.08-.4" fill="none" stroke="white" strokeLinecap="round" strokeOpacity="0.42" strokeWidth="1.2" />
      <path
        d="M13.65 20.7v-7.35h2.42l.46-3.04h-2.88V8.33c0-.83.4-1.64 1.7-1.64h1.32V4.1c-.78-.12-1.58-.2-2.38-.2-2.44 0-4.04 1.48-4.04 4.16v2.25H7.52v3.04h2.73v7.35h3.4Z"
        fill="white"
      />
    </svg>
  );
}

export function SocialIconCluster({
  label,
  className = "",
  iconClassName = "h-11 w-11",
}: {
  label?: string;
  className?: string;
  iconClassName?: string;
}) {
  const { lang } = useI18n();
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ui = {
    zh: {
      qrButton: "顯示 LINE 社群 QR code",
      eyebrow: "AIPOGER COMMUNITY",
      title: "加入 LINE 社群",
      body: "手機直接點 LINE；用電腦瀏覽時，掃描 QR code 就能加入。",
      close: "關閉 LINE 社群 QR code",
      open: "在 LINE 開啟",
      copy: "複製邀請連結",
      copied: "已複製邀請連結",
      alt: "AIPOGER LINE 社群加入 QR code",
    },
    en: {
      qrButton: "Show LINE community QR code",
      eyebrow: "AIPOGER COMMUNITY",
      title: "Join the LINE community",
      body: "Open LINE directly on mobile. On desktop, scan the QR code to join.",
      close: "Close LINE community QR code",
      open: "Open in LINE",
      copy: "Copy invite link",
      copied: "Invite link copied",
      alt: "QR code to join the AIPOGER LINE community",
    },
    ja: {
      qrButton: "LINEコミュニティのQRコードを表示",
      eyebrow: "AIPOGER COMMUNITY",
      title: "LINEコミュニティに参加",
      body: "スマホではLINEを直接開けます。パソコンではQRコードを読み取って参加してください。",
      close: "LINEコミュニティのQRコードを閉じる",
      open: "LINEで開く",
      copy: "招待リンクをコピー",
      copied: "招待リンクをコピーしました",
      alt: "AIPOGER LINEコミュニティ参加用QRコード",
    },
    ko: {
      qrButton: "LINE 커뮤니티 QR 코드 보기",
      eyebrow: "AIPOGER COMMUNITY",
      title: "LINE 커뮤니티 참여",
      body: "모바일에서는 LINE을 바로 열고, 데스크톱에서는 QR 코드를 스캔해 참여하세요.",
      close: "LINE 커뮤니티 QR 코드 닫기",
      open: "LINE에서 열기",
      copy: "초대 링크 복사",
      copied: "초대 링크를 복사했습니다",
      alt: "AIPOGER LINE 커뮤니티 참여 QR 코드",
    },
  }[lang];
  const clusterLabel = label ?? (lang === "zh" ? "AIPOGER 社群連結" : lang === "ja" ? "AIPOGER ソーシャルリンク" : lang === "ko" ? "AIPOGER 소셜 링크" : "AIPOGER social links");

  useEffect(() => {
    if (!qrOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQrOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [qrOpen]);

  const copyLineLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(AIPOGER_LINE_COMMUNITY_URL);
      } else {
        const input = document.createElement("textarea");
        input.value = AIPOGER_LINE_COMMUNITY_URL;
        input.setAttribute("readonly", "true");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2.5 ${className}`} aria-label={clusterLabel}>
      {label && <span className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</span>}
      <div className="flex items-center gap-3 sm:gap-5">
        {AIPOGER_SOCIAL_LINKS.map((social) => (
          <a
            key={social.label}
            href={social.href}
            target="_blank"
            rel="noreferrer"
            title={`${social.label} ${social.handle}`}
            aria-label={`${social.label} ${social.handle}`}
            className="group relative inline-flex h-12 w-12 items-center justify-center transition hover:-translate-y-0.5 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
          >
            <span className="absolute inset-1 rounded-full bg-white/22 opacity-75 blur-lg transition group-hover:opacity-100" aria-hidden="true" />
            <span className="absolute bottom-0 h-2 w-9 rounded-full bg-black/58 blur-md" aria-hidden="true" />
            <SocialIcon
              label={social.label}
              className={`${iconClassName} relative drop-shadow-[0_9px_12px_rgba(0,0,0,0.62)] [filter:brightness(1.28)_saturate(1.42)_contrast(1.08)]`}
            />
          </a>
        ))}
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          title={ui.qrButton}
          aria-label={ui.qrButton}
          className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#06c755]/55 bg-[#06c755]/10 text-[#a3f7be] transition hover:-translate-y-0.5 hover:border-[#06c755] hover:bg-[#06c755]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06c755]"
        >
          <span className="absolute inset-1 rounded-full bg-[#06c755]/18 opacity-70 blur-md transition group-hover:opacity-100" aria-hidden="true" />
          <QrCode className="relative h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
          <span className="sr-only">QR</span>
        </button>
      </div>
      </div>

      {qrOpen && typeof document !== "undefined"
        ? createPortal(
        <div
          className="fixed inset-0 z-[260] flex items-end justify-center bg-black/78 p-3 backdrop-blur-sm sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={() => setQrOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="line-community-qr-title"
            className="w-full max-w-md rounded-[1.5rem] border border-[#06c755]/35 bg-[#07110b] p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_55px_rgba(6,199,85,0.12)] sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-[#7af0a1]">{ui.eyebrow}</p>
                <h2 id="line-community-qr-title" className="mt-2 text-2xl font-black tracking-tight">{ui.title}</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">{ui.body}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                aria-label={ui.close}
                className="rounded-full border border-white/10 p-2 text-zinc-400 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06c755]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mx-auto mt-6 flex w-fit rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(AIPOGER_LINE_COMMUNITY_URL)}`}
                alt={ui.alt}
                width={240}
                height={240}
                loading="eager"
                referrerPolicy="no-referrer"
                className="h-56 w-56 sm:h-60 sm:w-60"
              />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <a
                href={AIPOGER_LINE_COMMUNITY_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#06c755] px-4 text-sm font-black text-[#031b0b] transition hover:bg-[#38df79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b6ffcb]"
              >
                {ui.open}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => void copyLineLink()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 text-sm font-black text-zinc-100 transition hover:border-[#06c755]/60 hover:bg-[#06c755]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06c755]"
              >
                {copied ? ui.copied : ui.copy}
                {copied ? <Check className="h-4 w-4 text-[#7af0a1]" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}
