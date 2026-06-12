"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReportTargetType =
  | "listen_bar_track"
  | "battle"
  | "battle_result"
  | "creator"
  | "profile"
  | "support_link"
  | "comment"
  | "other";

type ReportReason =
  | "copyright"
  | "unauthorized_voice_or_sample"
  | "impersonation"
  | "scam_or_suspicious_payment"
  | "illegal_or_harmful"
  | "privacy_or_harassment"
  | "spam"
  | "other";

type ReportButtonProps = {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  targetUrl?: string;
  context?: string;
  lang?: string;
  className?: string;
};

const REASONS: Array<{ key: ReportReason; zh: string; en: string }> = [
  { key: "copyright", zh: "版權 / 採樣爭議", en: "Copyright or Sample Issue" },
  { key: "unauthorized_voice_or_sample", zh: "未授權聲音 / 人聲", en: "Unauthorized Voice or Vocal" },
  { key: "impersonation", zh: "冒名 / 假帳號", en: "Impersonation" },
  { key: "scam_or_suspicious_payment", zh: "疑似詐騙 / 收款異常", en: "Suspicious Payment or Scam" },
  { key: "illegal_or_harmful", zh: "違法 / 仇恨 / 暴力內容", en: "Illegal or Harmful Content" },
  { key: "privacy_or_harassment", zh: "個資 / 騷擾", en: "Privacy or Harassment" },
  { key: "spam", zh: "垃圾內容", en: "Spam" },
  { key: "other", zh: "其他", en: "Other" },
];

function cleanCurrentUrl() {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function resolveReportUrl(value: string | undefined) {
  if (typeof window === "undefined") return value || "";
  const trimmed = value?.trim();
  if (!trimmed) return cleanCurrentUrl();
  try {
    return new URL(trimmed, window.location.origin).toString();
  } catch {
    return cleanCurrentUrl();
  }
}

export default function ReportButton({
  targetType,
  targetId,
  targetTitle,
  targetUrl,
  context,
  lang = "zh",
  className = "",
}: ReportButtonProps) {
  const isZh = lang !== "en";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("copyright");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const resolvedTargetUrl = open ? resolveReportUrl(targetUrl) : "";

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/content-reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({
        targetType,
        targetId,
        targetTitle,
        targetUrl: resolvedTargetUrl,
        reason,
        description,
        evidenceUrl,
        contactEmail,
        context,
      }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);

    if (!response.ok) {
      setError(payload?.error || (isZh ? "檢舉送出失敗，請稍後再試。" : "Report failed. Please try again."));
      return;
    }

    setMessage(isZh ? "已收到檢舉，我們會進後台審查。" : "Report received. We will review it.");
    setDescription("");
    setEvidenceUrl("");
    setContactEmail("");
    window.setTimeout(() => setOpen(false), 1200);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage("");
          setError("");
        }}
        className={`inline-flex items-center justify-center rounded-full border border-red-200/25 bg-red-500/8 px-3 py-1.5 text-xs font-black text-red-100 transition hover:border-red-200/70 hover:bg-red-500/14 ${className}`}
      >
        {isZh ? "檢舉" : "Report"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={submitReport}
            className="w-full max-w-lg rounded-[1.4rem] border border-white/12 bg-[#080808] p-5 text-left shadow-[0_24px_90px_rgba(0,0,0,0.62)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-200/75">
                  {isZh ? "內容檢舉" : "Content Report"}
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {targetTitle?.trim() || (isZh ? "回報這個內容" : "Report This Content")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-zinc-200 transition hover:border-white/30 hover:text-white"
              >
                {isZh ? "關閉" : "Close"}
              </button>
            </div>

            <label className="mt-5 block text-xs font-black text-zinc-400">
              {isZh ? "檢舉原因" : "Reason"}
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value as ReportReason)}
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none focus:border-red-200"
              >
                {REASONS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {isZh ? item.zh : item.en}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-xs font-black text-zinc-400">
              {isZh ? "補充說明" : "Details"}
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1200}
                rows={4}
                placeholder={isZh ? "請寫下你看到的問題、相關連結或權利聲明。" : "Describe the issue, links, or rights claim."}
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black px-3 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-red-200"
              />
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-black text-zinc-400">
                {isZh ? "證據連結" : "Evidence URL"}
                <input
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  maxLength={500}
                  placeholder="https://"
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:border-red-200"
                />
              </label>
              <label className="block text-xs font-black text-zinc-400">
                {isZh ? "聯絡信箱" : "Contact Email"}
                <input
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  maxLength={180}
                  placeholder={isZh ? "可不填" : "Optional"}
                  className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none placeholder:text-zinc-600 focus:border-red-200"
                />
              </label>
            </div>

            {error ? <p className="mt-3 rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100">{error}</p> : null}
            {message ? <p className="mt-3 rounded-xl border border-emerald-300/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100">{message}</p> : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                {isZh ? "取消" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-red-500 px-5 py-2 text-xs font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-zinc-500"
              >
                {busy ? (isZh ? "送出中" : "Sending") : isZh ? "送出檢舉" : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
