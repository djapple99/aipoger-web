import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rank = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
const chart = readFileSync(new URL("../src/components/monthly-chart.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/rank/layout.tsx", import.meta.url), "utf8");

test("Showtime replaces certification with accessible monthly chart and Choice tabs", () => {
  assert.match(rank, /MonthlyChart/);
  assert.match(rank, /PublicChoiceGallery/);
  assert.match(rank, /role="tablist"/);
  assert.match(rank, /aria-selected/);
  assert.match(rank, /ArrowLeft/);
  assert.match(rank, /#choice-weekly/);
  assert.match(rank, /hashchange/);
  assert.doesNotMatch(rank, /fetchBattleArchivesForRank|fetchAiMusicTracksForRank|certified|認證/);
  assert.doesNotMatch(layout, /認證|被認可/);
});

test("monthly chart preserves server ranks, real supporter counts, and no-rank states", () => {
  assert.match(chart, /\/api\/charts\/monthly/);
  assert.match(chart, /track\.rank !== null/);
  assert.match(chart, /track\.rank === null/);
  assert.match(chart, /track\.supporterCount/);
  assert.doesNotMatch(chart, /index\s*\+\s*1|heart_count|favoriteCount|positiveReactionCount/);
  assert.match(chart, /availableMonths\.map/);
});

test("song chart Hearts reuse shared support and global playback without changing Choice saves", () => {
  assert.match(chart, /\/api\/listen-bar\/reaction/);
  assert.match(chart, /heartTrackId: item\.id/);
  assert.match(chart, /musicPlayer\?\.start/);
  assert.match(chart, /aipoger:music-heart/);
  assert.match(chart, /heartLocks/);
  assert.match(chart, /finally/);
  assert.doesNotMatch(chart, /\/api\/choice\/interactions|createElement\("audio"\)|<audio/);
});

test("monthly chart handles stale loads, errors, four languages and a native rules dialog", () => {
  assert.match(chart, /AbortController/);
  assert.match(chart, /role="alert"/);
  for (const lang of ["zh", "en", "ja", "ko"]) assert.match(chart, new RegExp(`${lang}: \\{`));
  assert.match(chart, /<dialog/);
  assert.match(chart, /showModal/);
  assert.match(chart, /aria-pressed/);
});
