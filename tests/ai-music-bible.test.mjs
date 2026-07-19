import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  TAIWANESE_LYRICS_CATEGORIES,
  TAIWANESE_LYRICS_ENTRIES,
} from "../src/lib/taiwanese-lyrics-lab.ts";
import {
  STEM_ENGINES,
  STEM_GOALS,
} from "../src/lib/stem-separation-guide.ts";
import {
  AI_PRODUCTION_FLOW,
  SUNO_GENRE_GROUPS,
  SUNO_LYRIC_MOVES,
  SUNO_PROMPT_MOVES,
} from "../src/lib/suno-practice-library.ts";
import { SUNO_STUDIO_MASTERING_MOVES } from "../src/lib/suno-studio-mastering-prompts.ts";
import {
  SUNO_ARTIST_DNA_ENTRIES,
  SUNO_INSPIRATION_SOURCE,
  SUNO_PROMPT_RECIPES,
  SUNO_RECIPE_GENRES,
} from "../src/lib/suno-inspiration-index.ts";
import {
  bibleCatalogDefaults,
  mergeBibleCatalog,
  sanitizeBiblePayload,
} from "../src/lib/ai-music-bible-content.ts";

const practiceLibraryComponent = readFileSync(new URL("../src/components/suno-practice-library-section.tsx", import.meta.url), "utf8");
const inspirationIndexComponent = readFileSync(new URL("../src/components/suno-inspiration-index-section.tsx", import.meta.url), "utf8");

test("Taiwanese lyrics lab keeps the PDF seed catalog complete and uniquely addressable", () => {
  assert.equal(TAIWANESE_LYRICS_ENTRIES.length, 38);
  assert.equal(new Set(TAIWANESE_LYRICS_ENTRIES.map((entry) => entry.key)).size, 38);
  assert.ok(TAIWANESE_LYRICS_ENTRIES.every((entry) => entry.meaning && entry.sunoWriting && entry.note));
});

test("Bible editorial overrides are narrow, merge onto defaults, and preserve the catalog shape", () => {
  const defaults = bibleCatalogDefaults();
  const merged = mergeBibleCatalog([
    {
      content_kind: "prompt_move",
      content_key: "prompt-dna",
      payload: { title: { zh: "新版聲音 DNA" }, copy: { zh: "新版可複製公式" }, category: "lyric" },
      updated_by: null,
      updated_at: "2026-07-18T00:00:00.000Z",
    },
    {
      content_kind: "taiwanese_entry",
      content_key: "pronoun-me",
      payload: { sunoWriting: "新版阮", note: "新版測試說明" },
      updated_by: null,
      updated_at: "2026-07-18T00:00:00.000Z",
    },
  ]);
  assert.equal(merged.promptMoves.length, defaults.promptMoves.length);
  assert.equal(merged.lyricMoves.length, defaults.lyricMoves.length);
  assert.equal(merged.taiwaneseEntries.length, defaults.taiwaneseEntries.length);
  assert.equal(merged.promptMoves.find((item) => item.key === "prompt-dna").title.zh, "新版聲音 DNA");
  assert.equal(merged.promptMoves.find((item) => item.key === "prompt-dna").copy.zh, "新版可複製公式");
  assert.equal(merged.promptMoves.find((item) => item.key === "prompt-dna").category, "foundation");
  assert.equal(merged.taiwaneseEntries.find((item) => item.key === "pronoun-me").sunoWriting, "新版阮");
});

test("Bible editor payload sanitization rejects unknown shapes and caps editable values", () => {
  assert.equal(sanitizeBiblePayload(null), null);
  assert.equal(sanitizeBiblePayload({ __proto__: "unsafe" }), null);
  const payload = sanitizeBiblePayload({ title: { zh: "  可用標題  ", nope: "discard" }, evidence: "field", keywords: [" prompt ", 4] });
  assert.deepEqual(payload, { title: { zh: "可用標題" }, evidence: "field", keywords: ["prompt"] });
});

test("every Taiwanese lyrics lab entry uses a supported category", () => {
  const categories = new Set(TAIWANESE_LYRICS_CATEGORIES);
  assert.ok(TAIWANESE_LYRICS_ENTRIES.every((entry) => categories.has(entry.category)));
});

test("stem separation guide keeps ten unique engine families and seven goal routes", () => {
  assert.equal(STEM_ENGINES.length, 10);
  assert.equal(new Set(STEM_ENGINES.map((engine) => engine.key)).size, 10);
  assert.equal(STEM_GOALS.length, 7);
  assert.equal(new Set(STEM_GOALS.map((goal) => goal.key)).size, 7);
});

test("stem separation guide is bilingual, sourced, and points only to known engines", () => {
  const engineKeys = new Set(STEM_ENGINES.map((engine) => engine.key));

  assert.ok(STEM_ENGINES.every((engine) => (
    engine.name
    && engine.family.zh
    && engine.family.en
    && engine.access.zh
    && engine.access.en
    && engine.summary.zh
    && engine.summary.en
    && engine.bestFor.zh
    && engine.bestFor.en
    && engine.strengths.every((item) => item.zh && item.en)
    && engine.limits.every((item) => item.zh && item.en)
    && engine.sources.length > 0
    && engine.sources.every((source) => source.label && source.url.startsWith("https://"))
  )));
  assert.ok(STEM_GOALS.every((goal) => (
    goal.label.zh
    && goal.label.en
    && goal.pick.zh
    && goal.pick.en
    && goal.why.zh
    && goal.why.en
    && goal.engineKeys.length > 0
    && goal.engineKeys.every((key) => engineKeys.has(key))
  )));
});

test("Suno prompt and lyric libraries keep unique, bilingual, sourced moves", () => {
  assert.equal(SUNO_PROMPT_MOVES.length, 42);
  assert.equal(SUNO_STUDIO_MASTERING_MOVES.length, 19);
  assert.equal(SUNO_STUDIO_MASTERING_MOVES.filter((entry) => entry.category === "mastering").length, 19);
  assert.equal(SUNO_LYRIC_MOVES.length, 18);

  for (const entries of [SUNO_PROMPT_MOVES, SUNO_LYRIC_MOVES]) {
    assert.equal(new Set(entries.map((entry) => entry.key)).size, entries.length);
    assert.ok(entries.every((entry) => (
      entry.title.zh
      && entry.title.en
      && entry.summary.zh
      && entry.summary.en
      && entry.use.zh
      && entry.use.en
      && entry.copy.zh
      && entry.copy.en
      && ["official", "field", "version"].includes(entry.evidence)
      && entry.sources.length > 0
      && entry.keywords.length > 0
    )));
  }

  for (const key of [
    "two-field-routing",
    "vocal-identity-stack",
    "instrument-role-map",
    "section-density-arc",
    "fusion-four-part",
  ]) {
    assert.ok(SUNO_PROMPT_MOVES.some((entry) => entry.key === key));
  }
  assert.ok(SUNO_STUDIO_MASTERING_MOVES.some((entry) => entry.key === "studio-mastering-general"));
  assert.ok(SUNO_STUDIO_MASTERING_MOVES.some((entry) => entry.key === "studio-mastering-taiwanese-pop"));
  for (const key of ["enriched-section-cue", "singability-edit"]) {
    assert.ok(SUNO_LYRIC_MOVES.some((entry) => entry.key === key));
  }
});

test("genre crate and production flow remain complete and bilingual", () => {
  const genreTerms = SUNO_GENRE_GROUPS.flatMap((group) => group.terms);

  assert.ok(genreTerms.length >= 80);
  assert.equal(new Set(genreTerms.map((term) => term.toLocaleLowerCase())).size, genreTerms.length);
  assert.ok(SUNO_GENRE_GROUPS.every((group) => group.key && group.label.zh && group.label.en && group.terms.length > 0));
  assert.equal(AI_PRODUCTION_FLOW.length, 6);
  assert.ok(AI_PRODUCTION_FLOW.every((step) => step.title.zh && step.title.en && step.body.zh && step.body.en));
});

test("Prompt and lyric finders explain their controls and expose clear states", () => {
  assert.match(practiceLibraryComponent, /找你需要的 Prompt 招式/);
  assert.match(practiceLibraryComponent, /找你需要的歌詞控制/);
  assert.match(practiceLibraryComponent, /aria-live="polite"/);
  assert.match(practiceLibraryComponent, /aria-pressed=\{selected\}/);
  assert.match(practiceLibraryComponent, /清除 Prompt 搜尋/);
  assert.match(practiceLibraryComponent, /清除歌詞搜尋/);
  assert.doesNotMatch(practiceLibraryComponent, /閱讀 Reddit 原文|Read Reddit guide|查看開源 Skill|View open skill/);
  assert.doesNotMatch(practiceLibraryComponent, /NEW SOURCE · COMMUNITY FIELD GUIDE/);
  assert.match(practiceLibraryComponent, /官方文件核對：2026-07-17/);
  assert.doesNotMatch(practiceLibraryComponent, /mt-3 flex gap-2 overflow-x-auto pb-1/);
});

test("artist encyclopedia becomes 771 unique, searchable sonic DNA references", () => {
  assert.equal(SUNO_ARTIST_DNA_ENTRIES.length, 771);
  assert.equal(SUNO_INSPIRATION_SOURCE.artist.suppliedEntries, 771);
  assert.equal(new Set(SUNO_ARTIST_DNA_ENTRIES.map((entry) => entry.key)).size, 771);
  assert.equal(new Set(SUNO_ARTIST_DNA_ENTRIES.map((entry) => entry.artist.toLocaleLowerCase())).size, 771);
  assert.ok(SUNO_ARTIST_DNA_ENTRIES.every((entry) => (
    entry.artist
    && entry.sourcePage >= 3
    && entry.sourcePage <= 38
    && entry.tags.length >= 2
    && entry.summaryZh.length === 4
    && entry.prompt.includes("no direct artist imitation")
    && entry.searchText.includes(entry.artist.toLocaleLowerCase())
  )));
});

test("750 supplied prompts become 747 unique bilingual recipes", () => {
  assert.equal(SUNO_INSPIRATION_SOURCE.recipes.suppliedEntries, 750);
  assert.equal(SUNO_INSPIRATION_SOURCE.recipes.canonicalEntries, 747);
  assert.equal(SUNO_INSPIRATION_SOURCE.recipes.exactDuplicatesRemoved, 3);
  assert.equal(SUNO_PROMPT_RECIPES.length, 747);
  assert.equal(SUNO_RECIPE_GENRES.length, 10);
  assert.equal(new Set(SUNO_PROMPT_RECIPES.map((entry) => entry.key)).size, 747);

  const signatures = SUNO_PROMPT_RECIPES.map((entry) => [
    entry.genre,
    entry.vocal,
    entry.mood,
    entry.instrument,
    entry.story,
    entry.texture,
  ].join("|"));
  assert.equal(new Set(signatures).size, 747);
  assert.ok(SUNO_PROMPT_RECIPES.every((entry) => (
    entry.genreZh
    && entry.vocalZh
    && entry.moodZh
    && entry.instrumentZh
    && entry.storyZh
    && entry.textureZh
    && entry.prompt.includes(entry.genre)
  )));
});

test("large inspiration index exposes clear search, filter, copy, comment, and paging controls", () => {
  assert.match(practiceLibraryComponent, /SunoInspirationIndexSection/);
  assert.match(practiceLibraryComponent, /id="suno-inspiration-index"/);
  assert.match(inspirationIndexComponent, /聲音 DNA × Prompt 配方索引/);
  assert.match(inspirationIndexComponent, /771 組參考風格/);
  assert.match(inspirationIndexComponent, /747 組去重配方/);
  assert.match(inspirationIndexComponent, /aria-live="polite"/);
  assert.match(inspirationIndexComponent, /aria-pressed={selected}/);
  assert.match(inspirationIndexComponent, /複製聲音 DNA/);
  assert.match(inspirationIndexComponent, /複製英文 Prompt/);
  assert.match(inspirationIndexComponent, /BibleEntryCommentsDialog/);
  assert.match(inspirationIndexComponent, /再載入 18 筆/);
  assert.doesNotMatch(inspirationIndexComponent, /overflow-x-auto/);
});
