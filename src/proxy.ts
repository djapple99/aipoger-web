import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "aipoger.com";
const WWW_HOST = "www.aipoger.com";
const AUTH_CALLBACK_PATH = "/auth/callback";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  const url = request.nextUrl.clone();

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
      const lang = url.searchParams.get("lang") === "en" ? "en" : "zh";
      url.pathname = `/battle/${deepLinkId}`;
      url.search = "";
      url.searchParams.set("lang", lang);
      return NextResponse.redirect(url, 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
