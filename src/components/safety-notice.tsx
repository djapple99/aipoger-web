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
      "成人本人非露點的泳裝、舞台造型、時尚性感照片可以上傳。禁止露點、性行為、色情導流、未成年性暗示、暴力血腥、自殘傷害、仇恨歧視、政治宣傳、廣告詐騙、賭博、毒品武器、個資、盜用品牌/名人肖像或侵權內容。違規內容會下架，嚴重或累犯將停權。",
    chatTitle: "交流規範",
    chatBody:
      "請依照音樂感動交流與最終投票。禁止侮辱、攻擊、歧視、騷擾、洗版、政治煽動、廣告詐騙、色情暴力或公開他人個資；違規者立即踢出，嚴重者永久停權。",
  },
  en: {
    uploadTitle: "Upload Rules",
    uploadBody:
      "Non-explicit adult swimwear, stage looks, and tasteful sexy fashion are allowed. Do not upload nudity, sex acts, porn/adult redirects, sexualized minors, graphic violence, self-harm, hate or discrimination, political propaganda, ads or scams, gambling, drugs or weapons, personal data, impersonation, stolen brand assets, celebrity likenesses, or infringing content. Violations may be removed; severe or repeated abuse can lead to suspension.",
    chatTitle: "Community Rules",
    chatBody:
      "React and vote based on the music. No insults, attacks, discrimination, harassment, spam, political agitation, ads, scams, sexual/violent content, or sharing personal data. Violators may be removed immediately; severe cases can be permanently suspended.",
  },
  ja: {
    uploadTitle: "投稿ルール",
    uploadBody:
      "成人本人の露出のない水着、ステージ衣装、上品なセクシーファッションは投稿できます。ヌード、性行為、成人向け誘導、未成年者の性的表現、残虐な暴力、自傷、差別、政治宣伝、広告・詐欺、ギャンブル、薬物・武器、個人情報、なりすまし、権利侵害は禁止です。違反内容は削除され、重大または反復する違反は利用停止となる場合があります。",
    chatTitle: "コミュニティルール",
    chatBody:
      "音楽を基準に反応・投票してください。侮辱、攻撃、差別、嫌がらせ、スパム、政治的扇動、広告、詐欺、性的・暴力的内容、個人情報の共有は禁止です。違反者は即時退出、重大な場合は永久停止となることがあります。",
  },
  ko: {
    uploadTitle: "업로드 규칙",
    uploadBody:
      "성인 본인의 노출 없는 수영복, 무대 의상, 품격 있는 섹시 패션은 업로드할 수 있습니다. 누드, 성행위, 성인물 유도, 미성년자 성적 표현, 잔혹한 폭력, 자해, 혐오·차별, 정치 선전, 광고·사기, 도박, 마약·무기, 개인정보, 사칭 및 권리 침해 콘텐츠는 금지됩니다. 위반 콘텐츠는 삭제되며 중대하거나 반복될 경우 이용이 정지될 수 있습니다.",
    chatTitle: "커뮤니티 규칙",
    chatBody:
      "음악을 기준으로 반응하고 투표해 주세요. 모욕, 공격, 차별, 괴롭힘, 도배, 정치 선동, 광고, 사기, 성적·폭력적 콘텐츠 및 개인정보 공유는 금지됩니다. 위반자는 즉시 퇴장되며 중대한 경우 영구 정지될 수 있습니다.",
  },
};

export default function SafetyNotice({ kind, compact = false, className = "" }: SafetyNoticeProps) {
  const { lang } = useI18n();
  const text = lang === "ja" ? copy.ja : lang === "ko" ? copy.ko : lang === "en" ? copy.en : copy.zh;
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
