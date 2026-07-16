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

const practiceLibraryComponent = readFileSync(new URL("../src/components/suno-practice-library-section.tsx", import.meta.url), "utf8");

test("Taiwanese lyrics lab keeps the PDF seed catalog complete and uniquely addressable", () => {
  assert.equal(TAIWANESE_LYRICS_ENTRIES.length, 38);
  assert.equal(new Set(TAIWANESE_LYRICS_ENTRIES.map((entry) => entry.key)).size, 38);
  assert.ok(TAIWANESE_LYRICS_ENTRIES.every((entry) => entry.meaning && entry.sunoWriting && entry.note));
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
  assert.equal(SUNO_PROMPT_MOVES.length, 18);
  assert.equal(SUNO_LYRIC_MOVES.length, 16);

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
  assert.doesNotMatch(practiceLibraryComponent, /mt-3 flex gap-2 overflow-x-auto pb-1/);
});
