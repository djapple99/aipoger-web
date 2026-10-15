export const ACCOUNT_NOTICES_CHANGED = "aipoger:account-notices-read";
export type AccountNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  metadata?: { href?: string; trackId?: string; commenterName?: string } | null;
  battle_id?: string | null;
};

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
