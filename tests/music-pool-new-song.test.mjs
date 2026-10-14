import assert from "node:assert/strict";
import test from "node:test";
import { musicPoolNewSongBonus, musicPoolPopularityScore, rankMusicPool, MUSIC_POOL_NEW_SONG_WINDOW } from "../src/lib/music-pool.ts";
import { MUSIC_POOL_RETURN_IDS } from "../src/lib/music-pool-return.ts";
const published = "2026-10-14T01:00:00+08:00";
const birth = Date.parse(published);
test("new-song bonus is three points for exactly seven elapsed days, excluding future and invalid dates", () => {
  assert.equal(musicPoolNewSongBonus(published, birth - 1), 0);
  assert.equal(musicPoolNewSongBonus(published, birth), 3);
  assert.equal(musicPoolNewSongBonus(published, birth + MUSIC_POOL_NEW_SONG_WINDOW - 1), 3);
  assert.equal(musicPoolNewSongBonus(published, birth + MUSIC_POOL_NEW_SONG_WINDOW), 0);
  for (const invalid of [null, undefined, "", "invalid"]) assert.equal(musicPoolNewSongBonus(invalid, birth), 0);
});
test("new-song and return bonuses use original publication and never overlap or double-add", () => {
  const blind = { people: 10, preferencePoints: 5 };
  assert.equal(musicPoolPopularityScore("new", published, 5, blind, 0, birth), 33);
  assert.equal(musicPoolPopularityScore("new", published, 5, blind, 0, birth), 33);
  assert.equal(musicPoolPopularityScore("new", published, 5, blind, 0, birth + MUSIC_POOL_NEW_SONG_WINDOW), 30);
  assert.equal(musicPoolPopularityScore(MUSIC_POOL_RETURN_IDS[0], "2026-05-22T22:40:01Z", 5, blind, 0, birth), 35);
  assert.deepEqual(blind, { people: 10, preferencePoints: 5 });
});
test("a new supported song gets a lift, ties prefer the newer instant, and zero-support songs still cannot enter", () => {
  const base = { poolSupporterCount: 1, blindSampleCount: 0, blindPreferencePoints: 0 };
  const newSong = { ...base, id: "new", createdAt: published, popularityScore: 78 };
  const older = { ...base, id: "old", createdAt: "2026-10-01T00:00:00Z" };
  const empty = { ...newSong, id: "empty", poolSupporterCount: 0 };
  const ranked = rankMusicPool([older, empty, newSong], birth);
  assert.deepEqual(ranked.map(r => [r.track.id, r.rank, r.track.popularityScore]), [["new", 1, 6], ["old", 2, 3]]);
  const equal = rankMusicPool([
    { ...base, id: "earlier", createdAt: "2026-10-01T23:00:00+08:00" },
    { ...base, id: "later", createdAt: "2026-10-01T18:00:00Z" },
  ], birth);
  assert.deepEqual(equal.map(r => [r.track.id, r.rank]), [["later", 1], ["earlier", 2]]);
});
