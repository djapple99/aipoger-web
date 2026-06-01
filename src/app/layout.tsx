import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import GlobalLangToggle from "@/components/global-lang-toggle";
import NavHomeLink from "@/components/nav-home-link";
import GlobalBattleCallOverlay from "@/components/global-battle-call-overlay";
import GlobalListenBarDock from "@/components/global-listen-bar-dock";
import GlobalSitePresenceBadge from "@/components/global-site-presence-badge";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";

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
  description: "AIPOGER 愛播歌是 AI 音樂創作者的鬥歌場、傷心酒吧與榮譽榜。上傳你的 AI 音樂，參加 Drop Battle、24H Full Song 對決，讓聽眾投票聽見作品。",
  applicationName: "AIPOGER 愛播歌",
  keywords: ["AIPOGER", "愛播歌", "AI 音樂", "AI Music", "鬥歌", "Drop Battle", "傷心酒吧", "AI 音樂創作"],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: AIPOGER_BRAND_LOGO,
    apple: AIPOGER_BRAND_LOGO,
  },
  openGraph: {
    title: "AIPOGER 愛播歌｜AI 音樂鬥歌場與傷心酒吧",
    description: "上傳你的 AI 音樂，參加 Drop Battle、24H Full Song 對決，進入傷心酒吧公播池接受聽眾投票。",
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
    description: "AI 音樂創作者的 Drop Battle、24H Full Song、傷心酒吧公播池與榮譽榜。",
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
