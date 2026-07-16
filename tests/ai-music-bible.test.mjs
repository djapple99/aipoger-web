import assert from "node:assert/strict";
import test from "node:test";
import {
  TAIWANESE_LYRICS_CATEGORIES,
  TAIWANESE_LYRICS_ENTRIES,
} from "../src/lib/taiwanese-lyrics-lab.ts";

test("Taiwanese lyrics lab keeps the PDF seed catalog complete and uniquely addressable", () => {
  assert.equal(TAIWANESE_LYRICS_ENTRIES.length, 38);
  assert.equal(new Set(TAIWANESE_LYRICS_ENTRIES.map((entry) => entry.key)).size, 38);
  assert.ok(TAIWANESE_LYRICS_ENTRIES.every((entry) => entry.meaning && entry.sunoWriting && entry.note));
});

test("every Taiwanese lyrics lab entry uses a supported category", () => {
  const categories = new Set(TAIWANESE_LYRICS_CATEGORIES);
  assert.ok(TAIWANESE_LYRICS_ENTRIES.every((entry) => categories.has(entry.category)));
});
