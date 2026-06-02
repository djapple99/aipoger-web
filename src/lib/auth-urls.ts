export const AIPOGER_PUBLIC_ORIGIN = "https://aipoger.com";

const AIPOGER_HOSTS = new Set(["aipoger.com", "www.aipoger.com"]);
const AUTH_RETURN_STORAGE_KEY = "aipoger:auth-return";
const AUTH_RETURN_MAX_AGE_MS = 5 * 60 * 1000;

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

type AuthReturnRecord = {
  nextPath: string;
  createdAt: number;
};

function readAuthReturnRecord(): AuthReturnRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_RETURN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthReturnRecord>;
    if (typeof parsed.nextPath !== "string" || typeof parsed.createdAt !== "number") return null;
    return {
      nextPath: safeNextPath(parsed.nextPath),
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

function clearAuthReturnRecord() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
  } catch {
    // Ignore storage failures; auth should still land safely on home.
  }
}

export function rememberAuthReturnPath(value: string | null | undefined): string {
  const nextPath = safeNextPath(value);
  if (typeof window === "undefined") return nextPath;

  try {
    window.localStorage.setItem(
      AUTH_RETURN_STORAGE_KEY,
      JSON.stringify({ nextPath, createdAt: Date.now() } satisfies AuthReturnRecord),
    );
  } catch {
    // Ignore storage failures; the callback will fall back to home.
  }

  return nextPath;
}

export function consumeFreshAuthReturnPath(value: string | null | undefined): string {
  const requestedNext = safeNextPath(value);
  if (requestedNext === "/") {
    clearAuthReturnRecord();
    return "/";
  }

  const record = readAuthReturnRecord();
  const isFresh = record ? Date.now() - record.createdAt <= AUTH_RETURN_MAX_AGE_MS : false;
  const matchesRequest = record?.nextPath === requestedNext;

  clearAuthReturnRecord();

  return isFresh && matchesRequest ? requestedNext : "/";
}
