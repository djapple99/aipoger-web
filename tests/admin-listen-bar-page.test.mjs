import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminListenBarSource = readFileSync(new URL("../src/app/admin/listen-bar/page.tsx", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("listen bar admin can filter tracks by fixed music genre", () => {
  assert.ok(adminListenBarSource.includes('const [trackGenreFilter, setTrackGenreFilter] = useState("all")'));
  assert.ok(adminListenBarSource.includes('if (trackGenreFilter !== "all" && track.genre?.trim() !== trackGenreFilter) return false;'));
  assert.ok(adminListenBarSource.includes('aria-label="依歌曲種類篩選"'));
  assert.ok(adminListenBarSource.includes("全部種類"));
  assert.ok(adminListenBarSource.includes("genreFilterOptions.map"));
});

test("listen bar admin no longer exposes pending genre review as a primary filter", () => {
  assert.equal(adminListenBarSource.includes("待補類型"), false);
  assert.equal(adminListenBarSource.includes("uncategorized"), false);
  assert.ok(productRulesSource.includes("dropdown filter for the fixed 10 music genres"));
  assert.ok(productRulesSource.includes("Do not bring back a primary `待補類型` filter"));
});

test("listen bar admin audio previews are mutually exclusive", () => {
  assert.ok(adminListenBarSource.includes("handleAdminAudioPlay"));
  assert.ok(adminListenBarSource.includes('querySelectorAll<HTMLAudioElement>("[data-admin-listen-bar-audio]")'));
  assert.ok(adminListenBarSource.includes("if (audio !== currentAudio) audio.pause();"));
  assert.ok(adminListenBarSource.includes('data-admin-listen-bar-audio="true"'));
  assert.ok(adminListenBarSource.includes("onPlay={handleAdminAudioPlay}"));
  assert.ok(productRulesSource.includes("track-card audio controls must be mutually exclusive"));
});
