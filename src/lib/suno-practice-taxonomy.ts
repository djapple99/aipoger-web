import type { SunoExpressionFamily, SunoLocalizedText, SunoStudioMasteringFamily } from "./suno-practice-library.ts";

// Safe client taxonomy: no member prompt bodies or catalog constructors.
export const SUNO_STUDIO_MASTERING_FAMILY_OPTIONS: { key: SunoStudioMasteringFamily | "all"; label: SunoLocalizedText }[] = [
  { key: "all", label: { zh: "全部錄音室", en: "All studios" } },
  { key: "electronic", label: { zh: "電子音樂", en: "Electronic" } },
  { key: "hip-hop", label: { zh: "Hip-Hop", en: "Hip-Hop" } },
  { key: "soul-rnb", label: { zh: "Soul & R&B", en: "Soul & R&B" } },
  { key: "new-age-ambient", label: { zh: "New Age & Ambient", en: "New Age & Ambient" } },
  { key: "rock-roll", label: { zh: "Rock & Roll", en: "Rock & Roll" } },
  { key: "indie-dance", label: { zh: "Indie Dance", en: "Indie Dance" } },
  { key: "disco-funk", label: { zh: "Disco & Funk", en: "Disco & Funk" } },
  { key: "jazz-bossa", label: { zh: "Jazz & Bossa", en: "Jazz & Bossa" } },
  { key: "pop", label: { zh: "Pop", en: "Pop" } },
  { key: "classical-cinematic", label: { zh: "Classical & Cinematic", en: "Classical & Cinematic" } },
  { key: "latin-caribbean", label: { zh: "Latin & Caribbean", en: "Latin & Caribbean" } },
  { key: "african-amapiano", label: { zh: "African & Amapiano", en: "African & Amapiano" } },
  { key: "asian-middle-eastern", label: { zh: "Asian & Middle Eastern", en: "Asian & Middle Eastern" } },
  { key: "country-folk", label: { zh: "Country & Folk", en: "Country & Folk" } },
  { key: "dj-edit", label: { zh: "DJ Edit／Extended", en: "DJ Edit / Extended" } },
];

export const SUNO_EXPRESSION_FAMILY_OPTIONS: { key: SunoExpressionFamily | "all"; label: SunoLocalizedText }[] = [
  { key: "all", label: { zh: "全部表情詞", en: "All expression terms" } },
  { key: "vocal", label: { zh: "人聲與樂句", en: "Voice & phrasing" } },
  { key: "emotion", label: { zh: "情緒與氛圍", en: "Mood & atmosphere" } },
  { key: "energy", label: { zh: "力度與推進", en: "Energy & drive" } },
  { key: "character", label: { zh: "演奏性格", en: "Performance character" } },
  { key: "comparison", label: { zh: "A／B／C 對照練習", en: "A/B/C comparison" } },
];
