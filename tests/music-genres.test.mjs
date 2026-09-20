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

test("music genre taxonomy includes Taiwanese Bear High and the three added genres with stable share indices", () => {
  assert.equal(MUSIC_GENRE_OPTIONS.length, 14);
  assert.equal(MUSIC_GENRE_VALUES.includes("台語熊high"), true);
  assert.equal(MUSIC_GENRE_OPTIONS[9]?.value, "台語熊high");
  assert.equal(MUSIC_GENRE_OPTIONS[10]?.value, "Original 自我風格");
  assert.equal(isCurrentMusicGenre("台語熊high"), true);
});

test("music genre normalization maps legacy Taiwanese Bear High spellings to the formal genre", () => {
  assert.equal(canonicalMusicGenre("台語熊 High"), "台語熊high");
  assert.equal(canonicalMusicGenre("台語熊 high"), "台語熊high");
  assert.equal(canonicalMusicGenre("Taiwanese Bear High"), "台語熊high");
});

test("listen bar public pool capacity follows the fourteen-genre taxonomy", () => {
  assert.equal(LISTEN_BAR_ACTIVE_GENRE_COUNT, 14);
  assert.equal(LISTEN_BAR_GENRE_POOL_LIMIT, 36);
  assert.equal(LISTEN_BAR_TOTAL_ROTATION_LIMIT, 504);
});

test("new genres append after stable original share indices", () => {
  assert.deepEqual(MUSIC_GENRE_VALUES.slice(11), ["Children's Music 兒歌", "Latin / Reggae 拉丁雷鬼", "Cinematic 電影配樂"]);
});
