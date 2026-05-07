import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

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
        <Link
          href="/"
          aria-label="回到主畫面"
          className="fixed left-4 top-4 z-50 rounded-3xl bg-black/40 p-2 ring-1 ring-white/10 backdrop-blur hover:bg-black/55 transition"
        >
          <Image
            src="/aipoger-logo.png"
            alt="AIPOGER 愛播歌"
            width={44}
            height={44}
            priority
            className="h-11 w-11"
          />
        </Link>
        {children}
      </body>
    </html>
  );
}
