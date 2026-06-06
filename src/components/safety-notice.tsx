"use client";

import { useI18n } from "@/lib/i18n";

type SafetyNoticeKind = "upload" | "chat";

type SafetyNoticeProps = {
  kind: SafetyNoticeKind;
  compact?: boolean;
  className?: string;
};

const copy = {
  zh: {
    uploadTitle: "上傳規範",
    uploadBody:
      "請勿上傳色情裸露、暴力血腥、自殘傷害、仇恨歧視、政治宣傳、廣告詐騙、賭博或成人導流、毒品武器、個人資料、盜用品牌/名人肖像或任何侵權內容。違規內容會下架，嚴重或累犯將停權。",
    chatTitle: "交流規範",
    chatBody:
      "請依照音樂感動交流與最終投票。禁止侮辱、攻擊、歧視、騷擾、洗版、政治煽動、廣告詐騙、色情暴力或公開他人個資；違規者立即踢出，嚴重者永久停權。",
  },
  en: {
    uploadTitle: "Upload Rules",
    uploadBody:
      "Do not upload sexual nudity, graphic violence, self-harm, hate or discrimination, political propaganda, ads or scams, gambling/adult redirects, drugs or weapons, personal data, impersonation, stolen brand assets, celebrity likenesses, or infringing content. Violations may be removed; severe or repeated abuse can lead to suspension.",
    chatTitle: "Community Rules",
    chatBody:
      "React and vote based on the music. No insults, attacks, discrimination, harassment, spam, political agitation, ads, scams, sexual/violent content, or sharing personal data. Violators may be removed immediately; severe cases can be permanently suspended.",
  },
};

export default function SafetyNotice({ kind, compact = false, className = "" }: SafetyNoticeProps) {
  const { lang } = useI18n();
  const text = lang === "zh" ? copy.zh : copy.en;
  const title = kind === "upload" ? text.uploadTitle : text.chatTitle;
  const body = kind === "upload" ? text.uploadBody : text.chatBody;

  return (
    <div
      role="note"
      className={`rounded-2xl border border-yellow-300/35 bg-yellow-300/[0.075] text-yellow-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
        compact ? "px-3 py-2 text-[11px] leading-snug" : "px-4 py-3 text-xs leading-6"
      } ${className}`}
    >
      <span className="mr-2 font-black uppercase tracking-[0.16em] text-yellow-200">{title}</span>
      <span className="font-semibold text-zinc-100/90">{body}</span>
    </div>
  );
}
