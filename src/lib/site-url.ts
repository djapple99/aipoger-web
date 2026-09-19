const DEFAULT_AIPOGER_SITE_URL = "https://aipoger.com";

export function publicSiteUrl(rawValue = process.env.NEXT_PUBLIC_SITE_URL) {
  const candidate = String(rawValue || "").trim().replace(/\/$/, "");
  if (!candidate) return DEFAULT_AIPOGER_SITE_URL;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return DEFAULT_AIPOGER_SITE_URL;
    if (!parsed.hostname) return DEFAULT_AIPOGER_SITE_URL;
    if (parsed.hostname.toLowerCase() === "www.aipoger.com") return DEFAULT_AIPOGER_SITE_URL;
    return parsed.origin;
  } catch {
    return DEFAULT_AIPOGER_SITE_URL;
  }
}
