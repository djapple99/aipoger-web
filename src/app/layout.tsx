import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import GlobalLangToggle from "@/components/global-lang-toggle";
import NavHomeLink from "@/components/nav-home-link";
import GlobalBattleCallOverlay from "@/components/global-battle-call-overlay";
import GlobalListenBarDock from "@/components/global-listen-bar-dock";
import GlobalSitePresenceBadge from "@/components/global-site-presence-badge";

const configuredSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aipoger.com").replace(/\/$/, "");
const siteUrl = configuredSiteUrl === "https://www.aipoger.com" ? "https://aipoger.com" : configuredSiteUrl;
const metadataBase = new URL(siteUrl);
const ogImage = "/aipoger-og-card-20260522.png";

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "AIPOGER 愛播歌｜AI 音樂鬥歌場與傷心酒吧",
    template: "%s｜AIPOGER 愛播歌",
  },
  description: "AIPOGER 愛播歌是 AI 音樂創作者一起成長、讓作品被認可的舞台。上傳 AI 音樂，參加 Drop Battle、24H Full Song 與傷心酒吧公播，讓勝出作品走向播放、策展與商業化。",
  applicationName: "AIPOGER 愛播歌",
  keywords: ["AIPOGER", "愛播歌", "AI 音樂", "AI Music", "鬥歌", "Drop Battle", "傷心酒吧", "AI 音樂創作"],
  alternates: {
    canonical: "/",
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
    title: "AIPOGER 愛播歌｜AI 音樂鬥歌場與傷心酒吧",
    description: "上傳 AI 音樂，參加 Drop Battle、24H Full Song 與傷心酒吧公播，讓作品被聽見、被投票認可，並累積播放與商業化機會。",
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
    title: "AIPOGER 愛播歌｜AI 音樂鬥歌場與傷心酒吧",
    description: "AI 音樂創作者一起成長的 AIPOGER 舞台：Drop Battle、24H Full Song、傷心酒吧公播池與榮譽榜。",
    images: [ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <I18nProvider>
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
