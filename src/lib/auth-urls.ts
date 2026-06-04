export const AIPOGER_PUBLIC_ORIGIN = "https://aipoger.com";
export const AUTH_NEXT_STORAGE_KEY = "aipoger:auth-next";
export const AUTH_NEXT_COOKIE_KEY = "aipoger_auth_next";

const AIPOGER_HOSTS = new Set(["aipoger.com", "www.aipoger.com"]);

function normalizeOrigin(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    const parsed = new URL(withProtocol);
    return parsed.origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

function canonicalAipogerOrigin(origin: string): string {
  return origin === "https://www.aipoger.com" ? "https://aipoger.com" : origin;
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    );
  } catch {
    return true;
  }
}

function isTrustedReturnHost(hostname: string): boolean {
  return AIPOGER_HOSTS.has(hostname) || hostname.endsWith(".vercel.app");
}

export function safeNextPath(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "/";

  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const parsed = new URL(raw);
      if (!isTrustedReturnHost(parsed.hostname)) return "/";
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    }

    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    const parsed = new URL(raw, AIPOGER_PUBLIC_ORIGIN);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
  } catch {
    return "/";
  }
}

export function getAuthSiteOrigin(): string {
  const envOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (envOrigin && !isLocalOrigin(envOrigin)) return canonicalAipogerOrigin(envOrigin);

  if (typeof window !== "undefined") {
    const currentOrigin = normalizeOrigin(window.location.origin);
    if (currentOrigin && !isLocalOrigin(currentOrigin)) return canonicalAipogerOrigin(currentOrigin);
  }

  return AIPOGER_PUBLIC_ORIGIN;
}

export function buildAuthCallbackUrl(nextPath: string | null | undefined): string {
  const safeNext = safeNextPath(nextPath);
  return `${getAuthSiteOrigin()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

export function buildAuthPageUrl(nextPath: string | null | undefined): string {
  const safeNext = safeNextPath(nextPath);
  return `${getAuthSiteOrigin()}/auth?next=${encodeURIComponent(safeNext)}`;
}

export function rememberAuthNextPath(nextPath: string | null | undefined) {
  if (typeof window === "undefined") return;
  const safeNext = safeNextPath(nextPath);
  try {
    window.localStorage.setItem(AUTH_NEXT_STORAGE_KEY, safeNext);
  } catch {
    // localStorage may be unavailable in private or embedded browsers.
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_NEXT_COOKIE_KEY}=${encodeURIComponent(safeNext)}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
  } catch {
    // Cookies may be unavailable in hardened embedded browsers.
  }
}

export function readRememberedAuthNextPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const remembered = window.localStorage.getItem(AUTH_NEXT_STORAGE_KEY);
    return remembered ? safeNextPath(remembered) : null;
  } catch {
    return null;
  }
}

export function readRememberedAuthNextCookie(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const item = document.cookie
      .split("; ")
      .find((part) => part.startsWith(`${AUTH_NEXT_COOKIE_KEY}=`));
    if (!item) return null;
    return safeNextPath(decodeURIComponent(item.slice(AUTH_NEXT_COOKIE_KEY.length + 1)));
  } catch {
    return null;
  }
}

export function clearRememberedAuthNextPath() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
  try {
    document.cookie = `${AUTH_NEXT_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    // Ignore cookie cleanup failures.
  }
}
