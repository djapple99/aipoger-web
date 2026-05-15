import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import GlobalLangToggle from "@/components/global-lang-toggle";
import NavHomeLink from "@/components/nav-home-link";

export const metadata: Metadata = {
  title: "AIPOGER",
  description: "AIPOGER music battle platform",
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

          {/* 右上角語系切換 */}
          <GlobalLangToggle />

          {children}
        </I18nProvider>
      </body>
    </html>
  );
}