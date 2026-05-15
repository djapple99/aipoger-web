import { Righteous } from "next/font/google";
import localFont from "next/font/local";

/** 英文副標、Where AI Beats Bleed */
export const fontRighteous = Righteous({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/** 未來熒黑 Glow Sans TC — 中文主標語（繁體） */
export const fontGlowSans = localFont({
  src: "../assets/fonts/GlowSansTC-Normal-Regular.subset.woff2",
  display: "swap",
  weight: "400",
  preload: true,
});
