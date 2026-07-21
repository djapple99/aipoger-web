import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adminListenBarSource = readFileSync(new URL("../src/app/admin/listen-bar/page.tsx", import.meta.url), "utf8");
const adminListenBarApiSource = readFileSync(new URL("../src/app/api/admin/listen-bar-tracks/route.ts", import.meta.url), "utf8");
const promotionMigrationSource = readFileSync(new URL("../supabase/migrations/20260721130437_listen_bar_promotion_check_20260721.sql", import.meta.url), "utf8");
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
  assert.ok(productRulesSource.includes("dropdown filter for the fixed 11 music genres"));
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

test("listen bar admin paginates management tracks and selects only the current page", () => {
  assert.ok(adminListenBarSource.includes("ADMIN_TRACKS_PER_PAGE = 10"));
  assert.ok(adminListenBarSource.includes("pagedRenderedTracks"));
  assert.ok(adminListenBarSource.includes("trackTotalPages"));
  assert.ok(adminListenBarSource.includes("每頁 10 首"));
  assert.ok(adminListenBarSource.includes("pagedRenderedTracks.map((track)"));
  assert.ok(adminListenBarSource.includes("new Set(pagedRenderedTracks.map((track) => track.id))"));
  assert.ok(productRulesSource.includes("/admin/listen-bar` track management paginates songs at 10 per page"));
});

test("listen bar admin prioritizes current work and records promotion separately", () => {
  assert.ok(adminListenBarSource.includes('useState<TrackVisibilityFilter>("active")'));
  assert.ok(adminListenBarSource.includes("全部上架"));
  assert.equal(adminListenBarSource.includes("隱藏下架"), false);
  assert.ok(adminListenBarSource.includes('trackVisibilityFilter === "hidden"'));
  assert.ok(adminListenBarSource.includes('trackVisibilityFilter === "removed"'));
  assert.ok(adminListenBarSource.includes("已移除"));
  assert.ok(adminListenBarSource.includes("isNewlyPublishedMusic(track.created_at"));
  assert.ok(adminListenBarSource.includes("標記已宣傳"));
  assert.ok(adminListenBarSource.includes("取消宣傳標記"));
  assert.ok(adminListenBarSource.includes("promotion_checked_at"));
  assert.ok(adminListenBarApiSource.includes('action === "promotion_check"'));
  assert.ok(adminListenBarApiSource.includes("promotion_checked_at"));
  assert.ok(adminListenBarApiSource.includes("20260721130437_listen_bar_promotion_check_20260721.sql"));
  assert.ok(promotionMigrationSource.includes("add column if not exists promotion_checked_at timestamptz"));
  assert.ok(productRulesSource.includes("opens on active/on-air songs only"));
  assert.ok(productRulesSource.includes("separate from `promoted_at`"));
});
