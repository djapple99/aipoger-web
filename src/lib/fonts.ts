import { Righteous } from "next/font/google";
import localFont from "next/font/local";

/** 英文副標、Where AI Beats Bleed */
export const fontRighteous = Righteous({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/** 未來熒黑 Glow Sans — 中文主標語 */
export const fontGlowSans = localFont({
  src: "../assets/fonts/GlowSansSC-Normal-Regular.subset.woff2",
  display: "swap",
  weight: "400",
});
