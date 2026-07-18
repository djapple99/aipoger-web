import {
  SUNO_LYRIC_CATEGORIES,
  SUNO_LYRIC_MOVES,
  SUNO_PROMPT_CATEGORIES,
  SUNO_PROMPT_MOVES,
  type SunoEvidence,
  type SunoLyricCategory,
  type SunoPromptCategory,
  type SunoTechnique,
} from "./suno-practice-library.ts";
import {
  TAIWANESE_LYRICS_CATEGORIES,
  TAIWANESE_LYRICS_ENTRIES,
  type TaiwaneseLyricsCategory,
  type TaiwaneseLyricsEntry,
} from "./taiwanese-lyrics-lab.ts";
import type { StemEngine, StemGoal } from "./stem-separation-guide.ts";
import type { SunoArtistDnaEntry, SunoPromptRecipe } from "./suno-inspiration-index.ts";

export type BibleContentKind = "prompt_move" | "lyric_move" | "taiwanese_entry";
export type BibleTechnique = SunoTechnique<SunoPromptCategory> | SunoTechnique<SunoLyricCategory>;

export type BibleContentPayload = {
  title?: { zh?: string; en?: string };
  summary?: { zh?: string; en?: string };
  use?: { zh?: string; en?: string };
  copy?: { zh?: string; en?: string };
  category?: string;
  evidence?: SunoEvidence;
  keywords?: string[];
  meaning?: string;
  recommended?: string;
  sunoWriting?: string;
  note?: string;
};

export type BibleOverrideRow = {
  content_kind: BibleContentKind;
  content_key: string;
  payload: BibleContentPayload;
  updated_by: string | null;
  updated_at: string;
};

export type BibleCatalog = {
  promptMoves: SunoTechnique<SunoPromptCategory>[];
  lyricMoves: SunoTechnique<SunoLyricCategory>[];
  taiwaneseEntries: TaiwaneseLyricsEntry[];
  genreGroups?: { key: string; label: { zh: string; en: string }; terms: string[] }[];
  productionFlow?: { title: { zh: string; en: string }; body: { zh: string; en: string } }[];
  promptCategories?: { key: SunoPromptCategory | "all"; label: { zh: string; en: string } }[];
  lyricCategories?: { key: SunoLyricCategory | "all"; label: { zh: string; en: string } }[];
  stemEngines?: StemEngine[];
  stemGoals?: StemGoal[];
  artistDnaEntries?: readonly SunoArtistDnaEntry[];
  promptRecipes?: readonly SunoPromptRecipe[];
  recipeGenres?: { key: string; zh: string; en: string }[];
};

const promptCategoryKeys = new Set(SUNO_PROMPT_CATEGORIES.map((item) => item.key).filter((key) => key !== "all"));
const lyricCategoryKeys = new Set(SUNO_LYRIC_CATEGORIES.map((item) => item.key).filter((key) => key !== "all"));
const evidenceKeys = new Set<SunoEvidence>(["official", "field", "version"]);

// Keep this list intentionally narrow: an admin edit must not be able to
// replace a canonical key, source metadata, or any non-editorial field.
const textFields = new Set(["zh", "en"]);

function cleanString(value: unknown, maxLength = 4000) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function cleanLocalized(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of textFields) {
    const text = cleanString(record[key]);
    if (text) result[key] = text;
  }
  return Object.keys(result).length ? result : null;
}

export function sanitizeBiblePayload(value: unknown): BibleContentPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const output: BibleContentPayload = {};
  for (const field of ["title", "summary", "use", "copy"] as const) {
    const localized = cleanLocalized(input[field]);
    if (localized) output[field] = localized;
  }
  for (const field of ["meaning", "recommended", "sunoWriting", "note"] as const) {
    const text = cleanString(input[field]);
    if (text) output[field] = text;
  }
  const category = cleanString(input.category, 80);
  if (category) output.category = category;
  if (evidenceKeys.has(input.evidence as SunoEvidence)) output.evidence = input.evidence as SunoEvidence;
  if (Array.isArray(input.keywords)) {
    const keywords = input.keywords
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 30);
    if (keywords.length) output.keywords = keywords;
  }
  return Object.keys(output).length ? output : null;
}

function localizedOverride(base: { zh: string; en: string }, value: unknown) {
  const override = cleanLocalized(value);
  return override ? { ...base, ...override } : base;
}

function applyTechniqueOverride<T extends BibleTechnique>(base: T, payload: BibleContentPayload): T {
  const nextCategory = payload.category && (
    (promptCategoryKeys.has(payload.category as SunoPromptCategory) && promptCategoryKeys.has(base.category as SunoPromptCategory))
    || (lyricCategoryKeys.has(payload.category as SunoLyricCategory) && lyricCategoryKeys.has(base.category as SunoLyricCategory))
  ) ? payload.category : base.category;
  return {
    ...base,
    title: localizedOverride(base.title, payload.title),
    summary: localizedOverride(base.summary, payload.summary),
    use: localizedOverride(base.use, payload.use),
    copy: localizedOverride(base.copy, payload.copy),
    category: nextCategory as T["category"],
    evidence: payload.evidence ?? base.evidence,
    keywords: payload.keywords ?? base.keywords,
  } as T;
}

function applyTaiwaneseOverride(base: TaiwaneseLyricsEntry, payload: BibleContentPayload): TaiwaneseLyricsEntry {
  const category = TAIWANESE_LYRICS_CATEGORIES.includes(payload.category as TaiwaneseLyricsCategory)
    ? payload.category as TaiwaneseLyricsCategory
    : base.category;
  return {
    ...base,
    category,
    meaning: payload.meaning ?? base.meaning,
    recommended: payload.recommended ?? base.recommended,
    sunoWriting: payload.sunoWriting ?? base.sunoWriting,
    note: payload.note ?? base.note,
  };
}

export function bibleCatalogDefaults(): BibleCatalog {
  return {
    promptMoves: SUNO_PROMPT_MOVES,
    lyricMoves: SUNO_LYRIC_MOVES,
    taiwaneseEntries: TAIWANESE_LYRICS_ENTRIES,
  };
}

export function mergeBibleCatalog(rows: BibleOverrideRow[]): BibleCatalog {
  const byKey = new Map(rows.map((row) => [`${row.content_kind}:${row.content_key}`, row]));
  return {
    promptMoves: SUNO_PROMPT_MOVES.map((item) => applyTechniqueOverride(item, byKey.get(`prompt_move:${item.key}`)?.payload ?? {})),
    lyricMoves: SUNO_LYRIC_MOVES.map((item) => applyTechniqueOverride(item, byKey.get(`lyric_move:${item.key}`)?.payload ?? {})),
    taiwaneseEntries: TAIWANESE_LYRICS_ENTRIES.map((item) => applyTaiwaneseOverride(item, byKey.get(`taiwanese_entry:${item.key}`)?.payload ?? {})),
  };
}

export function findBibleItem(kind: BibleContentKind, key: string) {
  if (kind === "prompt_move") return SUNO_PROMPT_MOVES.find((item) => item.key === key) ?? null;
  if (kind === "lyric_move") return SUNO_LYRIC_MOVES.find((item) => item.key === key) ?? null;
  return TAIWANESE_LYRICS_ENTRIES.find((item) => item.key === key) ?? null;
}
