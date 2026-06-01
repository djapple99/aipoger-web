import { Noto_Serif_TC, Righteous } from "next/font/google";
import localFont from "next/font/local";

/** 英文副標、Where AI Beats Bleed */
export const fontRighteous = Righteous({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/** 源明體方向的標語字體：用於首頁中文 slogan，帶一點正式與詩性。 */
export const fontSourceSerifTC = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
  preload: true,
});

/** 未來熒黑 Glow Sans TC — 中文主標語（繁體） */
export const fontGlowSans = localFont({
  src: "../assets/fonts/GlowSansTC-Normal-Regular.subset.woff2",
  display: "swap",
  weight: "400",
  preload: true,
});

/** 鬥歌場全頁：涵蓋 i18n 字元的子集（動態歌名／歌詞缺字時回退系統字） */
export const fontGlowSansBattle = localFont({
  src: "../assets/fonts/GlowSansTC-battle.subset.woff2",
  display: "swap",
  weight: "400",
});
