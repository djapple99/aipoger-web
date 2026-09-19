import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import "./earworm-v3.css";
import { I18nProvider } from "@/lib/i18n";
import { htmlLangFor, isSupportedLang, LANG_COOKIE_NAME, langForRequest } from "@/lib/locale";
import GlobalLangToggle from "@/components/global-lang-toggle";
import NavHomeLink from "@/components/nav-home-link";
import GlobalBattleCallOverlay from "@/components/global-battle-call-overlay";
import GlobalListenBarDock from "@/components/global-listen-bar-dock";
import GlobalSitePresenceBadge from "@/components/global-site-presence-badge";
import AnalyticsEvents from "@/components/analytics-events";
import SeoJsonLd from "@/components/seo-json-ld";
import { publicSiteUrl } from "@/lib/site-url";

const siteUrl = publicSiteUrl();
const metadataBase = new URL(siteUrl);
const ogImage = "/aipoger-og-card-20260522.png";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "AIPOGER 愛播歌｜探索 AI 音樂、Drop Battle 與傷心酒吧",
    template: "%s｜AIPOGER 愛播歌",
  },
  description: "AIPOGER 愛播歌是 AI 音樂創作者一起成長、讓作品被認可的舞台。先探索 AI 音樂作品，再從喜歡的歌曲延伸到 Drop Battle、傷心酒吧公播、Showtime 與策展。",
  applicationName: "AIPOGER 愛播歌",
  keywords: ["AIPOGER", "愛播歌", "AI 音樂", "AI Music", "鬥歌", "Drop Battle", "傷心酒吧", "AI 音樂創作"],
  alternates: {
    canonical: "/",
    languages: {
      "zh-Hant": "/?lang=zh",
      en: "/?lang=en",
      ja: "/?lang=ja",
      ko: "/?lang=ko",
    },
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/aipoger-search-icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/aipoger-search-icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/aipoger-search-icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "AIPOGER 愛播歌｜探索 AI 音樂、Drop Battle 與傷心酒吧",
    description: "探索正在被聽見、送出愛心與挑戰的 AI 音樂作品，從喜歡的歌曲延伸到 Drop Battle、傷心酒吧與 Showtime。",
    url: siteUrl,
    siteName: "AIPOGER 愛播歌",
    locale: "zh_TW",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "AIPOGER",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIPOGER 愛播歌｜探索 AI 音樂、Drop Battle 與傷心酒吧",
    description: "AI 音樂創作者一起成長的 AIPOGER 舞台：AI 音樂作品、Drop Battle、傷心酒吧公播池與 Showtime。",
    images: [ogImage],
  },
};

const aipogerOrganizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AIPOGER 愛播歌",
  alternateName: ["AIPOGER", "愛播歌"],
  url: siteUrl,
  logo: `${siteUrl}/aipoger-search-icon-512x512.png`,
  description: "AI 音樂創作者的探索、Drop Battle、公共播放、認可與策展平台。",
  sameAs: [
    "https://www.youtube.com/@djapple2000",
    "https://www.instagram.com/aipoger.ai",
    "https://www.tiktok.com/@aipoger",
  ],
  founder: {
    "@type": "Person",
    name: "愛波哥",
    url: "https://www.youtube.com/@djapple2000",
  },
};

const aipogerWebSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  name: "AIPOGER 愛播歌",
  alternateName: "AIPOGER",
  url: siteUrl,
  inLanguage: ["zh-Hant", "en", "ja", "ko"],
  publisher: { "@id": `${siteUrl}/#organization` },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const cookieLang = (await cookies()).get(LANG_COOKIE_NAME)?.value;
  const requestLang = requestHeaders.get("x-aipoger-lang");
  const initialLang = isSupportedLang(requestLang)
    ? requestLang
    : isSupportedLang(cookieLang)
      ? cookieLang
      : langForRequest(requestHeaders.get("x-vercel-ip-country"), requestHeaders.get("accept-language"));

  return (
    <html lang={htmlLangFor(initialLang)}>
      <body>
        <SeoJsonLd data={{ ...aipogerOrganizationSchema, "@id": `${siteUrl}/#organization` }} />
        <SeoJsonLd data={aipogerWebSiteSchema} />
        <I18nProvider initialLang={initialLang}>
          <AnalyticsEvents />
          <NavHomeLink />
          <GlobalSitePresenceBadge />

          {/* 右上角語系切換 */}
          <GlobalLangToggle />
          <GlobalListenBarDock />
          <GlobalBattleCallOverlay />

          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
