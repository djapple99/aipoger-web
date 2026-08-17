"use client";

import { FormEvent, useEffect, useState } from "react";
import { ExternalLink, Loader2, Youtube } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ReleaseState = {
  eligible?: boolean;
  youtubeUrl?: string | null;
};

export default function BattleWinnerReleaseLink({
  battleId,
  isZh,
  onSaved,
}: {
  battleId: string;
  isZh: boolean;
  onSaved?: (youtubeUrl: string | null) => void;
}) {
  const [checked, setChecked] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) {
        if (!cancelled) setChecked(true);
        return;
      }
      try {
        const response = await fetch(`/api/battle/winner-release?battleId=${encodeURIComponent(battleId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as ReleaseState | null;
        if (!cancelled) {
          const current = payload?.youtubeUrl?.trim() || "";
          setEligible(Boolean(response.ok && payload?.eligible));
          setYoutubeUrl(current);
          setDraft(current);
          setChecked(true);
        }
      } catch {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [battleId]);

  if (!checked || !eligible) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setSaving(false);
      setError(isZh ? "登入狀態已過期，請重新登入後再提交。" : "Your session expired. Sign in again to submit.");
      return;
    }
    try {
      const response = await fetch("/api/battle/winner-release", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ battleId, youtubeUrl: draft.trim() }),
      });
      const payload = (await response.json().catch(() => null)) as { youtubeUrl?: string | null; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || (isZh ? "發布連結提交失敗。" : "Could not save the release link."));
      const saved = payload?.youtubeUrl?.trim() || "";
      setYoutubeUrl(saved);
      setDraft(saved);
      onSaved?.(saved || null);
      setMessage(isZh ? "發布連結已保存。" : "Release link saved.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : isZh ? "發布連結提交失敗。" : "Could not save the release link.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 rounded-xl border border-yellow-200/20 bg-yellow-300/[0.06] p-2.5">
      <div className="flex items-start gap-2">
        <Youtube className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-yellow-100">
            {isZh ? "勝出獎勵：發布你的 MV" : "Winner reward: publish your MV"}
          </p>
          <p className="mt-1 text-[10px] font-bold leading-4 text-zinc-400">
            {isZh ? "只有你自己可以提交或更新這個 YouTube 連結。" : "Only you can submit or update this YouTube link."}
          </p>
        </div>
      </div>
      <div className="mt-2 flex gap-1.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 300))}
          type="url"
          inputMode="url"
          placeholder={isZh ? "貼上 YouTube MV 連結" : "Paste your YouTube MV link"}
          className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/55 px-2.5 py-2 text-[11px] font-bold text-white outline-none placeholder:text-zinc-600 focus:border-yellow-200/70"
          aria-label={isZh ? "YouTube MV 連結" : "YouTube MV link"}
        />
        <button
          type="submit"
          disabled={saving || draft.trim() === youtubeUrl}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-yellow-300 px-2.5 py-2 text-[11px] font-black text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label={isZh ? "保存中" : "Saving"} /> : isZh ? "保存" : "Save"}
        </button>
      </div>
      {youtubeUrl ? (
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-red-200 transition hover:text-white"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          {isZh ? "開啟目前的 MV 連結" : "Open current MV link"}
        </a>
      ) : null}
      {message ? <p className="mt-1.5 text-[10px] font-black text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-1.5 text-[10px] font-black leading-4 text-red-200">{error}</p> : null}
    </form>
  );
}
