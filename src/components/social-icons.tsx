"use client";

import { Check, Copy, ExternalLink, QrCode, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { siDiscord, siFacebook, siInstagram, siLine } from "simple-icons";
import { AIPOGER_LINE_COMMUNITY_URL, AIPOGER_SOCIAL_LINKS } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";

type SocialIconProps = {
  label: string;
  className?: string;
};

type SupportedLang = "zh" | "en" | "ja" | "ko";

const BRAND_ICONS = {
  line: siLine,
  discord: siDiscord,
  instagram: siInstagram,
  facebook: siFacebook,
};

const LINE_DIALOG_COPY: Record<SupportedLang, {
  qrButton: string;
  eyebrow: string;
  title: string;
  body: string;
  close: string;
  open: string;
  copy: string;
  copied: string;
  alt: string;
}> = {
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
};

function iconForLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("line")) return BRAND_ICONS.line;
  if (normalized.includes("discord")) return BRAND_ICONS.discord;
  if (normalized.includes("instagram")) return BRAND_ICONS.instagram;
  return BRAND_ICONS.facebook;
}

export function SocialIcon({ label, className = "h-7 w-7" }: SocialIconProps) {
  const icon = iconForLabel(label);
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d={icon.path} fill={`#${icon.hex}`} />
    </svg>
  );
}

export function LineCommunityDialog({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: SupportedLang }) {
  const [copied, setCopied] = useState(false);
  const ui = LINE_DIALOG_COPY[lang];

  useEffect(() => {
    if (!open) {
      setCopied(false);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center bg-black/78 p-3 backdrop-blur-sm sm:items-center sm:p-5"
      role="presentation"
      onPointerDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-community-qr-title"
        className="w-full max-w-md rounded-[1.5rem] border border-[#06c755]/35 bg-[#07110b] p-5 text-white shadow-[0_30px_100px_rgba(0,0,0,0.75),0_0_55px_rgba(6,199,85,0.12)] sm:p-7"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-[#7af0a1]">{ui.eyebrow}</p>
            <h2 id="line-community-qr-title" className="mt-2 text-2xl font-black tracking-tight">{ui.title}</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-zinc-400">{ui.body}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
  );
}

export function SocialIconCluster({
  label,
  className = "",
  iconClassName = "h-7 w-7",
}: {
  label?: string;
  className?: string;
  iconClassName?: string;
}) {
  const { lang } = useI18n();
  const [qrOpen, setQrOpen] = useState(false);
  const clusterLabel = label ?? (lang === "zh" ? "AIPOGER 社群連結" : lang === "ja" ? "AIPOGER ソーシャルリンク" : lang === "ko" ? "AIPOGER 소셜 링크" : "AIPOGER social links");

  return (
    <>
      <div className={`flex flex-wrap items-center gap-3 ${className}`} aria-label={clusterLabel}>
        {label && <span className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</span>}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {AIPOGER_SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              title={`${social.label} ${social.handle}`}
              aria-label={`${social.label} ${social.handle}`}
              className="group relative inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white/12 bg-black/55 shadow-[0_10px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
            >
              <span className="absolute inset-1 rounded-[0.8rem] bg-white/[0.04] opacity-0 blur-md transition group-hover:opacity-100" aria-hidden="true" />
              <SocialIcon label={social.label} className={`${iconClassName} relative drop-shadow-[0_5px_8px_rgba(0,0,0,0.55)]`} />
            </a>
          ))}
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            title={LINE_DIALOG_COPY[lang].qrButton}
            aria-label={LINE_DIALOG_COPY[lang].qrButton}
            className="group relative inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#06c755]/48 bg-[#06c755]/[0.07] text-[#9bf3b7] shadow-[0_10px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:border-[#06c755] hover:bg-[#06c755]/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06c755]"
          >
            <QrCode className="relative h-6 w-6" strokeWidth={2.1} aria-hidden="true" />
            <span className="sr-only">QR</span>
          </button>
        </div>
      </div>
      <LineCommunityDialog open={qrOpen} onClose={() => setQrOpen(false)} lang={lang as SupportedLang} />
    </>
  );
}
