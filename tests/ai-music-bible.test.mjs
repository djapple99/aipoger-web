import assert from "node:assert/strict";
import test from "node:test";
import {
  TAIWANESE_LYRICS_CATEGORIES,
  TAIWANESE_LYRICS_ENTRIES,
} from "../src/lib/taiwanese-lyrics-lab.ts";
import {
  STEM_ENGINES,
  STEM_GOALS,
} from "../src/lib/stem-separation-guide.ts";

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
