export const DAILY_SPOTLIGHT_TIME_ZONE = "Asia/Taipei";

export function taipeiDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DAILY_SPOTLIGHT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return now.toISOString().slice(0, 10);
  return `${year}-${month}-${day}`;
}

export function normalizeSpotlightDate(value: string | null | undefined, now = new Date()) {
  const clean = value?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  return taipeiDateKey(now);
}

export function todaySpotlightPath(lang = "zh", now = new Date()) {
  const safeLang = /^[a-z]{2}$/i.test(lang) ? lang : "zh";
  return `/listen-bar?spotlight=${encodeURIComponent(taipeiDateKey(now))}&lang=${encodeURIComponent(safeLang)}`;
}
