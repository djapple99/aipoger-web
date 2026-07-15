"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

type ShareButtonProps = {
  title: string;
  text?: string;
  url?: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  wrapperClassName?: string;
  iconOnly?: boolean;
};

export default function ShareButton({
  title,
  text,
  url,
  label = "分享",
  copiedLabel = "已複製",
  className = "",
  wrapperClassName = "",
  iconOnly = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [shareUnavailable, setShareUnavailable] = useState(false);
  const [manualUrl, setManualUrl] = useState("");

  const copyWithFallback = async (value: string) => {
    if (!value) return false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Some embedded/local browsers block the async clipboard API.
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let copiedText = false;
    try {
      copiedText = document.execCommand("copy");
    } catch {
      copiedText = false;
    } finally {
      textarea.remove();
    }
    return copiedText;
  };

  const flashCopied = () => {
    setManualUrl("");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleShare = async () => {
    const shareUrl =
      url && typeof window !== "undefined" && url.startsWith("/")
        ? `${window.location.origin}${url}`
        : url || (typeof window !== "undefined" ? window.location.href : "");
    const payload = { title, text: text ?? title, url: shareUrl };
    const fallbackCopy = payload.text ? `${payload.text}\n${shareUrl}` : shareUrl;
    setShareUnavailable(false);
    setManualUrl("");

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(payload);
      } else if (await copyWithFallback(fallbackCopy)) {
        flashCopied();
        return;
      } else {
        setManualUrl(shareUrl);
        setShareUnavailable(true);
        return;
      }
      flashCopied();
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      if (await copyWithFallback(fallbackCopy)) {
        flashCopied();
        return;
      }
      setManualUrl(shareUrl);
      setShareUnavailable(true);
    }
  };

  return (
    <span className={`relative inline-flex ${wrapperClassName}`}>
      <button
        type="button"
        onClick={handleShare}
        className={`aipo-ghost-button inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-black text-orange-100 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${className}`}
        aria-label={label}
        title={label}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {iconOnly ? <span className="sr-only">{label}</span> : <span>{shareUnavailable ? "請手動複製網址" : copied ? copiedLabel : label}</span>}
      </button>
      {shareUnavailable && manualUrl && (
        <span className="absolute right-0 top-[calc(100%+0.45rem)] z-30 w-[min(82vw,22rem)] rounded-2xl border border-orange-200/35 bg-black/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
          <input
            readOnly
            value={manualUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-orange-50 outline-none"
            aria-label="分享連結"
          />
        </span>
      )}
    </span>
  );
}
