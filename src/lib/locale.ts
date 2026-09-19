export const SUPPORTED_LANGS = ["zh", "en", "ja", "ko"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_COOKIE_NAME = "aipoger_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isSupportedLang(value: string | null | undefined): value is Lang {
  return SUPPORTED_LANGS.includes(value as Lang);
}

/**
 * Country policy for the first visit. Explicit user choices are resolved elsewhere
 * and always take precedence over this geo-derived default.
 */
export function langForCountry(country: string | null | undefined): Lang {
  switch (country?.trim().toUpperCase()) {
    case "CN":
    case "TW":
      return "zh";
    case "JP":
      return "ja";
    case "KR":
      return "ko";
    default:
      return "en";
  }
}

/** Use Accept-Language only when the platform does not provide a country. */
export function langForRequest(
  country: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Lang {
  if (country?.trim()) return langForCountry(country);
  const browserLang = acceptLanguage?.split(",", 1)[0]?.split("-", 1)[0]?.trim().toLowerCase();
  if (browserLang === "zh") return "zh";
  if (browserLang === "ja") return "ja";
  if (browserLang === "ko") return "ko";
  return "en";
}

export function htmlLangFor(lang: Lang) {
  return lang === "zh" ? "zh-Hant" : lang;
}
