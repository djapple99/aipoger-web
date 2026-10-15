export const ACCOUNT_NOTICES_CHANGED = "aipoger:account-notices-read";
export type AccountNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  kept_at: string | null;
  expires_at: string;
  metadata?: { href?: string; trackId?: string; commenterName?: string } | null;
  battle_id?: string | null;
};
export type AccountNoticeAction = "read" | "keep" | "unkeep" | "delete";
export const ACCOUNT_NOTICE_PAGE_SIZE = 3;

export function accountNotificationSummary(notice: AccountNotification, lang: string) {
  const work = /^你的作品〈([\s\S]+)〉收到新留言$/.exec(notice.title)?.[1];
  const name = notice.metadata?.commenterName;
  if (!work || !name) return notice.title;
  if (lang === "en") return `${name} commented on “${work}”`;
  if (lang === "ja") return `${name} が「${work}」にコメント`;
  if (lang === "ko") return `${name} 님이 「${work}」에 댓글을 남겼습니다`;
  return `${name} 評論了〈${work}〉`;
}

// Notification metadata is stored content, never permission to navigate off-site.
export function accountNotificationHref(notice: AccountNotification, lang: string) {
  const href = notice.metadata?.href;
  const fallback = notice.battle_id ? `/battle/${encodeURIComponent(notice.battle_id)}` : "/profile";
  const safe = typeof href === "string" && /^\/(?!\/)/.test(href) && !/[\\\s]/.test(href) ? href : fallback;
  const url = new URL(safe, "https://aipoger.com");
  if (url.origin !== "https://aipoger.com") return `/profile?lang=${lang}`;
  url.searchParams.set("lang", lang);
  return `${url.pathname}${url.search}${url.hash}`;
}
