import { legacyBibleMetadata, type BibleMetadata } from "@/lib/bible-metadata";

export default function BibleEntryMetadata({ metadata, locale }: { metadata?: BibleMetadata; locale: "zh" | "en" }) {
  const value = metadata ?? legacyBibleMetadata();
  const zh = locale === "zh";
  return <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 text-xs leading-6 text-zinc-400">
    <p><span className="font-bold text-orange-200">{value.status}</span> · {value.platform}</p>
    <p>{zh ? "模型／版本" : "Model / version"}: {value.model ?? (zh ? "未記錄" : "Not recorded")} / {value.modelVersion ?? (zh ? "未記錄" : "Not recorded")}</p>
    <p>{zh ? "最後驗證" : "Last verified"}: {value.lastVerifiedAt ?? (zh ? "尚未驗證" : "Not verified")}</p>
    {(value.status === "Legacy" || value.status === "Deprecated") && <p>{zh ? "保留供參考；使用目前模型前請重測。" : "Preserved for reference; retest with your current model."}</p>}
  </div>;
}
