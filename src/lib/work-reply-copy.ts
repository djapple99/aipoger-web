import type { Lang } from "./locale";
const copy = {
  zh: { reply: "回覆評論", again: "繼續回覆", author: "創作者回覆", placeholder: "回應這位聽眾…", send: "送出回覆", cancel: "取消", hint: "首次回覆這則評論可得 2 Credit", saved: "回覆已送出", earned: "回覆已送出 · +2 Credit", error: "回覆暫時無法讀取，請重試。", failed: "回覆未能確認，內容已保留，請重試。", retry: "重試", signIn: "請重新登入後回覆。" },
  en: { reply: "Reply", again: "Reply again", author: "Creator reply", placeholder: "Write back to this listener…", send: "Send reply", cancel: "Cancel", hint: "Your first reply to this comment earns 2 Credit", saved: "Reply sent", earned: "Reply sent · +2 Credit", error: "Replies are unavailable. Please retry.", failed: "We could not confirm your reply. Your text is kept; please retry.", retry: "Retry", signIn: "Sign in again to reply." },
  ja: { reply: "返信する", again: "もう一度返信", author: "作者からの返信", placeholder: "リスナーに返信…", send: "返信を送る", cancel: "取消", hint: "このコメントへの初回返信で2 Credit", saved: "返信しました", earned: "返信しました · +2 Credit", error: "返信を読み込めません。再試行してください。", failed: "返信を確認できませんでした。入力内容は残っています。再試行してください。", retry: "再試行", signIn: "再度ログインして返信してください。" },
  ko: { reply: "답글 쓰기", again: "답글 더 쓰기", author: "창작자의 답글", placeholder: "리스너에게 답글을 남겨 보세요…", send: "답글 보내기", cancel: "취소", hint: "이 댓글에 처음 답하면 2 Credit", saved: "답글을 보냈습니다", earned: "답글을 보냈습니다 · +2 Credit", error: "답글을 불러올 수 없습니다. 다시 시도해 주세요.", failed: "전송 결과를 확인하지 못했습니다. 내용은 보관되어 있으니 다시 시도해 주세요.", retry: "다시 시도", signIn: "다시 로그인한 후 답글을 남겨 주세요." },
} as const;
export function workReplyCopy(lang: Lang) { return copy[lang]; }
