export type EmbeddedBrowserKind =
  | "line"
  | "facebook"
  | "instagram"
  | "messenger"
  | "tiktok"
  | "google_app"
  | "gmail"
  | "android_webview"
  | "other_in_app";

export type BrowserContext = EmbeddedBrowserKind | "standard" | "unknown";

function explicitEmbeddedKind(userAgent: string): EmbeddedBrowserKind | null {
  if (/Line\//i.test(userAgent)) return "line";
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return "facebook";
  if (/Instagram/i.test(userAgent)) return "instagram";
  if (/Messenger/i.test(userAgent)) return "messenger";
  if (/TikTok|Bytedance/i.test(userAgent)) return "tiktok";
  if (/GSA\/|GoogleApp/i.test(userAgent)) return "google_app";
  if (/Gmail/i.test(userAgent)) return "gmail";
  if (/MicroMessenger|Twitter|LinkedInApp|Pinterest|Snapchat/i.test(userAgent)) return "other_in_app";
  return null;
}

export function detectEmbeddedBrowser(userAgent: string | null | undefined): {
  isEmbedded: boolean;
  kind: BrowserContext;
} {
  const ua = userAgent ?? "";
  const explicitKind = explicitEmbeddedKind(ua);
  if (explicitKind) return { isEmbedded: true, kind: explicitKind };

  const isAndroidWebView = /; wv\)|\bwv\b/i.test(ua);
  if (isAndroidWebView) return { isEmbedded: true, kind: "android_webview" };

  const isStandaloneBrowser =
    /CriOS|Chrome\/|Chromium\/|FxiOS|Firefox\/|EdgiOS|EdgA|Edg\/|OPiOS|OPR\/|SamsungBrowser/i.test(ua) ||
    (/Safari\//i.test(ua) && /Version\//i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua));

  if (isStandaloneBrowser) return { isEmbedded: false, kind: "standard" };
  return { isEmbedded: false, kind: "unknown" };
}

export function isLikelyEmbeddedBrowser(userAgent: string | null | undefined): boolean {
  return detectEmbeddedBrowser(userAgent).isEmbedded;
}
