import "server-only";
import { SUNO_PROMPT_MOVES, SUNO_LYRIC_MOVES } from "./suno-practice-library.ts";
import { SUNO_ARTIST_DNA_ENTRIES, SUNO_PROMPT_RECIPES } from "./suno-inspiration-index.ts";
import { bibleExpressionCardKey, biblePromptCopyKey } from "./bible-prompt-copy.ts";
import { mergeBibleCatalog, type BibleOverrideRow } from "./ai-music-bible-content.ts";

type PromptKind = "prompt_move" | "lyric_move" | "artist_dna" | "prompt_recipe";
type Entry = { key: string; sourceKey: string; kind: PromptKind };
const entries: Entry[] = [
  ...SUNO_PROMPT_MOVES.map(item => ({ key: biblePromptCopyKey("prompt_move", item.key), sourceKey: item.key, kind: "prompt_move" as const })),
  ...SUNO_LYRIC_MOVES.map(item => ({ key: biblePromptCopyKey("lyric_move", item.key), sourceKey: item.key, kind: "lyric_move" as const })),
  ...SUNO_ARTIST_DNA_ENTRIES.map(item => ({ key: biblePromptCopyKey("artist_dna", item.key), sourceKey: item.key, kind: "artist_dna" as const })),
  ...SUNO_PROMPT_RECIPES.map(item => ({ key: biblePromptCopyKey("prompt_recipe", item.key), sourceKey: item.key, kind: "prompt_recipe" as const })),
];
const byKey = new Map(entries.map(item => [item.key, item]));
for (const item of entries) if (item.sourceKey.startsWith("expression-")) byKey.set(bibleExpressionCardKey(item.sourceKey), item);
const artists = new Map(SUNO_ARTIST_DNA_ENTRIES.map(item => [item.key, item]));
const recipes = new Map(SUNO_PROMPT_RECIPES.map(item => [item.key, item]));

/** Also used to generate the private database whitelist, without storing Prompt bodies there. */
export const BIBLE_FORMAL_PROMPT_KEYS = entries.map(item => item.key);
export function resolveBibleFormalPrompt(value: unknown): Entry | null {
  return typeof value === "string" ? byKey.get(value) ?? null : null;
}
export function bibleFormalPromptText(entry: Entry, locale: "zh" | "en", overrides: BibleOverrideRow[] = []) {
  if (entry.kind === "artist_dna") return artists.get(entry.sourceKey)?.prompt;
  if (entry.kind === "prompt_recipe") return recipes.get(entry.sourceKey)?.prompt;
  const catalog = mergeBibleCatalog(overrides);
  return (entry.kind === "prompt_move" ? catalog.promptMoves : catalog.lyricMoves).find(item => item.key === entry.sourceKey)?.copy[locale];
}
