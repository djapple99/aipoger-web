import assert from "node:assert/strict";
import test from "node:test";
import { isInMusicPool, isInDiscoveryMusicPool, musicPoolReturnBonus, musicPoolPopularityScore, rankMusicPool } from "../src/lib/music-pool.ts";
import { MUSIC_POOL_RETURN_IDS, MUSIC_POOL_RETURN_EXCLUDED_IDS, MUSIC_POOL_RETURN_START, MUSIC_POOL_RETURN_END } from "../src/lib/music-pool-return.ts";
const id = MUSIC_POOL_RETURN_IDS[0];
const old = "2026-05-22T22:40:01Z";
const now = Date.parse("2026-10-14T08:00:00+08:00");
test("return exception is restricted to the verified cohort and exact Taipei cutoff", () => {
  assert.equal(isInMusicPool(old, now), false);
  assert.equal(isInDiscoveryMusicPool(old, id, now), true);
  assert.equal(isInDiscoveryMusicPool(old, "not-in-cohort", now), false);
  assert.equal(isInDiscoveryMusicPool(old, id, MUSIC_POOL_RETURN_START - 1), false);
  assert.equal(isInDiscoveryMusicPool(old, id, MUSIC_POOL_RETURN_END - 1), true);
  assert.equal(isInDiscoveryMusicPool(old, id, MUSIC_POOL_RETURN_END), false);
  assert.equal(new Date(MUSIC_POOL_RETURN_END).toISOString(), "2026-10-31T16:00:00.000Z");
});
test("excluded works stay outside Explore, including works still within ordinary expiry", () => {
  for (const blocked of MUSIC_POOL_RETURN_EXCLUDED_IDS) {
    assert.equal(isInDiscoveryMusicPool(old, blocked, now), false);
    assert.equal(isInDiscoveryMusicPool("2026-08-01T00:00:00Z", blocked, now), false);
    assert.equal(musicPoolReturnBonus(old, blocked, now), 0);
  }
  assert.equal(new Set(MUSIC_POOL_RETURN_IDS).size, MUSIC_POOL_RETURN_IDS.length);
  assert.equal(MUSIC_POOL_RETURN_IDS.some(x => MUSIC_POOL_RETURN_EXCLUDED_IDS.includes(x)), false);
});
test("missing, invalid or rewritten future publication cannot use a cohort ID to bypass expiry", () => {
  for (const invalid of [null, undefined, "", "invalid", "2027-01-01T00:00:00Z"]) {
    assert.equal(isInDiscoveryMusicPool(invalid, id, now), false);
  }
});
test("five points apply once to expired return works and expire without changing real scoring inputs", () => {
  const blind = { people: 10, preferencePoints: 5 };
  assert.equal(musicPoolPopularityScore(id, old, 5, 10, blind, now), 55);
  assert.equal(musicPoolPopularityScore(id, old, 5, 10, blind, now), 55);
  assert.deepEqual(blind, { people: 10, preferencePoints: 5 });
  assert.equal(musicPoolPopularityScore(id, old, 5, 10, blind, MUSIC_POOL_RETURN_END), 50);
  assert.equal(musicPoolReturnBonus("2026-09-15T00:00:00Z", id, now), 0);
  assert.equal(isInDiscoveryMusicPool("2026-10-14T00:00:00Z", "new-work", MUSIC_POOL_RETURN_END), true);
});
test("Top10/50 use source IDs consistently and do not double-add an API-provided score", () => {
  const normal = { id: "new", createdAt: "2026-10-01T00:00:00Z", poolSupporterCount: 1, blindSampleCount: 0, blindPreferencePoints: 0 };
  const returned = { ...normal, id: "bar-" + id, sourceId: id, createdAt: old, popularityScore: 80 };
  const ranked = rankMusicPool([normal, returned], now);
  assert.equal(ranked[0].track.sourceId, id);
  assert.equal(ranked[0].track.popularityScore, 80);
  assert.equal(ranked[1].track.popularityScore, 75);
  assert.equal(rankMusicPool([normal, returned], MUSIC_POOL_RETURN_END).length, 1);
  assert.equal(rankMusicPool([{ ...returned, poolSupporterCount: 0 }], now).length, 0);
});
