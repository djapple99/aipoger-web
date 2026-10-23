import type { Metadata } from "next";
import { battleRetroCopy } from "./battle-retro-copy";
import type { Lang } from "./locale";

export const BATTLE_MODES = ["blind", "q-crash", "drop"] as const;
export type BattleMode = (typeof BATTLE_MODES)[number];

export function isBattleMode(value: unknown): value is BattleMode {
  return typeof value === "string" && BATTLE_MODES.includes(value as BattleMode);
}

export function battleModeSharePath(mode: BattleMode, lang: Lang) {
  return `/battle?lang=${lang}&mode=${mode}#battle-mode-${mode}`;
}

export function battleModeShareCopy(mode: BattleMode, lang: Lang) {
  // Q Crash keeps the existing English fallback for Japanese and Korean.
  const displayLang = mode === "q-crash" && lang !== "zh" ? "en" : lang;
  const c = battleRetroCopy(displayLang);
  const name = mode === "blind" ? c.blind : mode === "q-crash" ? "Q Crash" : "Drop Battle";
  const description = mode === "blind" ? c.blindDescription : mode === "q-crash" ? c.qDescription : c.dropDescription;
  const note = mode === "blind" ? c.listenDescription : mode === "q-crash" ? c.qNote : c.dropNote;
  return { name, title: `${name}｜AIPOGER`, text: `${description} ${note}`, displayLang };
}

export function battleModeMetadata(mode: BattleMode | null, lang: Lang, listenPage = false): Metadata {
  const c = battleRetroCopy(lang);
  const share = battleModeShareCopy(mode ?? "blind", lang);
  const title = mode ? share.title : `${c.title}｜AIPOGER`;
  const description = mode ? share.text : c.subtitle;
  const path = (language: Lang) => listenPage ? `/battle/listen?lang=${language}`
    : mode ? battleModeSharePath(mode, language).split("#")[0] : `/battle?lang=${language}`;
  const url = `https://aipoger.com${path(lang)}`;
  const image = { url: `https://aipoger.com/images/battle-share/${mode ?? "blind"}.png`, width: 1200, height: 630, alt: title };
  const locale = { zh: "zh_TW", en: "en_US", ja: "ja_JP", ko: "ko_KR" }[mode ? share.displayLang : lang];
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url, languages: { "zh-Hant": path("zh"), en: path("en"), ja: path("ja"), ko: path("ko") } },
    openGraph: { title, description, url, type: "website", siteName: "AIPOGER", locale, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
