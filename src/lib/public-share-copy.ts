import type { Lang } from "@/lib/locale";
const copy = {
  zh: { label: "分享", copiedLabel: "連結已複製", sharedLabel: "已分享", manualCopyLabel: "請手動複製網址", linkLabel: "分享連結" },
  en: { label: "Share", copiedLabel: "Link copied", sharedLabel: "Shared", manualCopyLabel: "Copy this link", linkLabel: "Share link" },
  ja: { label: "シェア", copiedLabel: "リンクをコピーしました", sharedLabel: "シェアしました", manualCopyLabel: "リンクをコピーしてください", linkLabel: "共有リンク" },
  ko: { label: "공유", copiedLabel: "링크 복사됨", sharedLabel: "공유됨", manualCopyLabel: "링크를 복사해 주세요", linkLabel: "공유 링크" },
} as const;
export function publicShareCopy(lang: Lang) { return copy[lang]; }
