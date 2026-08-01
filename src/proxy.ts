import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isSupportedLang, LANG_COOKIE_NAME, langForRequest } from "@/lib/locale";

const CANONICAL_HOST = "aipoger.com";
const WWW_HOST = "www.aipoger.com";
const AUTH_CALLBACK_PATH = "/auth/callback";

function requestLanguage(request: NextRequest) {
  const explicitLang = request.nextUrl.searchParams.get("lang");
  if (isSupportedLang(explicitLang)) return explicitLang;

  const savedLang = request.cookies.get(LANG_COOKIE_NAME)?.value;
  if (isSupportedLang(savedLang)) return savedLang;

  return langForRequest(
    request.headers.get("x-vercel-ip-country"),
    request.headers.get("accept-language"),
  );
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  const url = request.nextUrl.clone();
  const lang = requestLanguage(request);

  if (host === WWW_HOST) {
    url.protocol = "https";
    url.hostname = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  if (url.searchParams.has("code") && url.pathname !== AUTH_CALLBACK_PATH) {
    url.pathname = AUTH_CALLBACK_PATH;
    return NextResponse.redirect(url, 307);
  }

  if (url.pathname === "/battle") {
    const deepLinkId = url.searchParams.get("focusBattle") || url.searchParams.get("focusQueue");
    if (deepLinkId && /^[0-9a-z-]+$/i.test(deepLinkId)) {
      url.pathname = `/battle/${deepLinkId}`;
      url.search = "";
      url.searchParams.set("lang", lang);
      return NextResponse.redirect(url, 307);
    }
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-aipoger-lang", lang);
  return NextResponse.next({ request: { headers: forwardedHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
