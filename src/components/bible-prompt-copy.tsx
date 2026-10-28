"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Lang } from "@/lib/locale";
import { BIBLE_PROMPT_COPY_COST, completeBibleCopyOperation, createBibleCopyOperation, resolveBiblePaidCopy, type BiblePaidCopy } from "@/lib/bible-prompt-copy";

// Only browser click handlers write here. Two entrances to the same pending copy
// share one receipt; a completed copy is removed and the next click is a new use.
const pending = new Map<string, { operation: BiblePaidCopy; promise?: Promise<string> }>();

export default function BiblePromptCopy({ copyKey, locale, navigationLang = locale, label, compact = false }: {
  copyKey: string; locale: "zh" | "en"; navigationLang?: Lang; label?: string; compact?: boolean;
}) {
  const zh = locale === "zh";
  const busy = useRef(false);
  const [state, setState] = useState<{ busy?: boolean; text?: string; issue?: string; copied?: boolean; exempt?: boolean }>({});
  const copy = async () => {
    if (busy.current) return;
    busy.current = true;
    setState(current => ({ ...current, busy: true, issue: undefined, copied: false }));
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session || data.session.user.is_anonymous) throw new Error("AUTH_REQUIRED");
      if (!navigator.clipboard?.writeText) throw new Error("COPY_UNAVAILABLE");
      const id = `${data.session.user.id}:${locale}:${copyKey}`;
      let job = pending.get(id);
      if (!job) { job = { operation: createBibleCopyOperation(copyKey, locale, data.session.user.id) }; pending.set(id, job); }
      const currentJob = job;
      if (!job.promise) job.promise = resolveBiblePaidCopy(job.operation, data.session.access_token).finally(() => { currentJob.promise = undefined; window.dispatchEvent(new CustomEvent("aipoger:credit")); });
      const value = await job.promise;
      setState({ busy: true, text: value, exempt: job.operation.exempt });
      try { await navigator.clipboard.writeText(value); }
      catch { setState({ text: value, exempt: job.operation.exempt, issue: "clipboard" }); return; }
      completeBibleCopyOperation(job.operation, data.session.user.id);
      pending.delete(id);
      setState({ text: value, copied: true, exempt: job.operation.exempt });
      window.setTimeout(() => setState(current => ({ ...current, copied: false })), 1500);
    } catch (error) {
      setState(current => ({ ...current, busy: false, issue: error instanceof Error ? error.message : "COPY_UNAVAILABLE" }));
    } finally { busy.current = false; setState(current => ({ ...current, busy: false })); }
  };
  const text = state.busy ? (zh ? "處理中…" : "Processing…") : state.copied ? (zh ? "已複製" : "Copied") : state.issue === "clipboard" ? (zh ? "重試複製・不再扣點" : "Retry copy · already paid") : state.exempt ? (zh ? "複製・Owner 免扣點" : "Copy · Owner exempt") : compact ? (zh ? `複製・${BIBLE_PROMPT_COPY_COST} 點` : `Copy · ${BIBLE_PROMPT_COPY_COST}`) : (zh ? `複製並顯示・${BIBLE_PROMPT_COPY_COST} 點` : `Copy & reveal · ${BIBLE_PROMPT_COPY_COST} Credit`);
  return <div className={compact ? "contents" : "mt-4 min-w-0"} data-prompt-copy={copyKey}>
    <div className={compact ? "contents" : "overflow-hidden rounded-xl border border-white/10 bg-[#050707]"}>
      {state.text !== undefined && <pre className={`max-h-96 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs font-bold leading-6 text-cyan-50/90 ${compact ? "order-last col-start-2 col-end-[-1]" : ""}`}>{state.text}</pre>}
      <button type="button" onClick={() => void copy()} disabled={Boolean(state.busy)} aria-label={label ? `${label} · ${text}` : undefined} className={`flex min-h-11 w-full items-center justify-center gap-2 px-3 py-2 text-xs font-black text-zinc-300 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50 ${state.text !== undefined ? "border-t border-white/10" : ""}`}>
        {state.copied ? <Check className="h-4 w-4 shrink-0 text-emerald-300" /> : <Copy className="h-4 w-4 shrink-0" />}<span>{text}</span>
      </button>
    </div>
    {state.issue && <p role="status" className={`mt-2 text-xs font-bold leading-6 text-orange-200 ${compact ? "order-last col-start-2 col-end-[-1]" : ""}`}>
      {state.issue === "INSUFFICIENT_CREDIT" ? <>{zh ? "目前點數不足，" : "Not enough Credit. "}<Link className="underline underline-offset-4" href={`/profile?lang=${navigationLang}#my-credit`}>{zh ? "查看我的點數" : "View my Credit"}</Link></> : state.issue === "AUTH_REQUIRED" ? <Link href={`/auth?lang=${navigationLang}&next=${encodeURIComponent(`/ai-music-bible?lang=${navigationLang}`)}`}>{zh ? "請重新登入後複製" : "Sign in again to copy"}</Link> : state.issue === "clipboard" ? (zh ? "完整 Prompt 已顯示。瀏覽器未允許複製，重試同次操作不再扣點。" : "Your prompt is shown. Clipboard access was blocked; retry this copy at no extra cost.") : state.issue === "COPY_PRICE_CHANGED" ? (zh ? "複製規則已更新，請重新整理後再試。" : "Copy rules changed. Refresh before trying again.") : (zh ? "暫時無法確認結果，請重試；同次請求不重複扣點。" : "Result unavailable. Retry this request without a duplicate charge.")}
    </p>}
  </div>;
}
