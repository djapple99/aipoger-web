import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalMusicGenre,
  isCurrentMusicGenre,
  MUSIC_GENRE_OPTIONS,
  MUSIC_GENRE_VALUES,
} from "../src/lib/music-genres.ts";
import {
  LISTEN_BAR_ACTIVE_GENRE_COUNT,
  LISTEN_BAR_GENRE_POOL_LIMIT,
  LISTEN_BAR_TOTAL_ROTATION_LIMIT,
} from "../src/lib/listen-bar-rules.ts";

test("music genre taxonomy includes Taiwanese Bear High as the eleventh formal genre", () => {
  assert.equal(MUSIC_GENRE_OPTIONS.length, 11);
  assert.equal(MUSIC_GENRE_VALUES.includes("台語熊high"), true);
  assert.equal(MUSIC_GENRE_OPTIONS.at(-2)?.value, "台語熊high");
  assert.equal(MUSIC_GENRE_OPTIONS.at(-1)?.value, "Original 自我風格");
  assert.equal(isCurrentMusicGenre("台語熊high"), true);
});

test("music genre normalization maps legacy Taiwanese Bear High spellings to the formal genre", () => {
  assert.equal(canonicalMusicGenre("台語熊 High"), "台語熊high");
  assert.equal(canonicalMusicGenre("台語熊 high"), "台語熊high");
  assert.equal(canonicalMusicGenre("Taiwanese Bear High"), "台語熊high");
});

test("listen bar public pool capacity follows the eleven-genre taxonomy", () => {
  assert.equal(LISTEN_BAR_ACTIVE_GENRE_COUNT, 11);
  assert.equal(LISTEN_BAR_GENRE_POOL_LIMIT, 36);
  assert.equal(LISTEN_BAR_TOTAL_ROTATION_LIMIT, 396);
});
