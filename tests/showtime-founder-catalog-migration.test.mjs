import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const showtimeHelperSource = readFileSync(new URL("../src/lib/ai-music-showtime.ts", import.meta.url), "utf8");
const lifecycleSource = readFileSync(new URL("../src/lib/ai-music-surface-lifecycle.ts", import.meta.url), "utf8");
const aiMusicTracksRouteSource = readFileSync(new URL("../src/app/api/ai-music/tracks/route.ts", import.meta.url), "utf8");
const listenBarTracksRouteSource = readFileSync(new URL("../src/app/api/listen-bar/tracks/route.ts", import.meta.url), "utf8");
const challengeRouteSource = readFileSync(new URL("../src/app/api/ai-music/challenges/route.ts", import.meta.url), "utf8");
const removeTrackRouteSource = readFileSync(new URL("../src/app/api/listen-bar/remove-track/route.ts", import.meta.url), "utf8");
const showtimeMyTracksRouteSource = readFileSync(new URL("../src/app/api/showtime/my-tracks/route.ts", import.meta.url), "utf8");
const profileSource = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const rankSource = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
const honorInteractionsRouteSource = readFileSync(new URL("../src/app/api/honor-board/interactions/route.ts", import.meta.url), "utf8");
const dropFullSongsRouteSource = readFileSync(new URL("../src/app/api/honor-board/drop-full-songs/route.ts", import.meta.url), "utf8");
const previewScriptSource = readFileSync(new URL("../scripts/showtime-founder-catalog-preview.mjs", import.meta.url), "utf8");
const applyScriptSource = readFileSync(new URL("../scripts/showtime-founder-catalog-apply.mjs", import.meta.url), "utf8");
const migrationSource = readFileSync(new URL("../supabase/20260710_showtime_founder_catalog.sql", import.meta.url), "utf8");
const archiveRemovalMigrationSource = readFileSync(new URL("../supabase/20260710_showtime_archive_public_removal.sql", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const listenBarSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");

test("founder catalog uses persisted Showtime state instead of old dynamic Heart/day eligibility", () => {
  assert.ok(showtimeHelperSource.includes("ai_music_showtime_certified"));
  assert.ok(showtimeHelperSource.includes("ai_music_showtime_public_removed_at"));
  assert.ok(migrationSource.includes("ai_music_showtime_certification_source"));
  assert.ok(lifecycleSource.includes("isAiMusicPersistedShowtimeCertified"));
  assert.equal(lifecycleSource.includes("showtimeTrackIdsFromListenBarRows"), false);
  assert.equal(lifecycleSource.includes("listenBarIsHonorEligible"), false);
  assert.ok(productRulesSource.includes("persisted recognition state"));
  assert.ok(productRulesSource.includes("public_time <= now() - 30 days"));
  assert.ok(productRulesSource.includes("including works exactly 30 days old"));
  assert.ok(productRulesSource.includes("not a public or recurring `30 days -> Showtime` promise"));
});

test("Explore, Bar Heartbreak, and Showtime APIs split certified works by surface", () => {
  assert.ok(aiMusicTracksRouteSource.includes('surface = url.searchParams.get("surface") === "showtime"'));
  assert.ok(aiMusicTracksRouteSource.includes('if (surface === "showtime") return row.ai_music_showtime_certified'));
  assert.ok(aiMusicTracksRouteSource.includes("return !row.ai_music_showtime_certified && !row.ai_music_explore_retired"));
  assert.ok(listenBarTracksRouteSource.includes("!isAiMusicPersistedShowtimeCertified(row)"));
  assert.ok(rankSource.includes("surface=showtime"));
  assert.equal(rankSource.includes("listenBarIsHonorEligible"), false);
});

test("Showtime works cannot be challenged or removed through old Bar flows", () => {
  assert.ok(challengeRouteSource.includes("Showtime 作品入選後不再接受挑戰"));
  assert.ok(challengeRouteSource.includes("isAiMusicPersistedShowtimeCertified(track)"));
  assert.ok(challengeRouteSource.includes("不能修改守擂設定"));
  assert.ok(removeTrackRouteSource.includes("Showtime 作品請改用 Showtime 展示管理"));
  assert.ok(removeTrackRouteSource.includes("不能從傷心酒吧流程移除底層認可紀錄"));
});

test("creator Showtime management only exposes display metadata and reviewed support URL", () => {
  assert.ok(showtimeMyTracksRouteSource.includes("cleanShowtimeSupportUrl"));
  assert.ok(showtimeMyTracksRouteSource.includes('support_url_status: supportUrlStatus'));
  assert.ok(showtimeMyTracksRouteSource.includes('ai_music_challenge_status: "showcase"'));
  assert.equal(showtimeMyTracksRouteSource.includes("audio_path: body"), false);
  assert.equal(showtimeMyTracksRouteSource.includes("ai_music_showtime_certified: body"), false);
  assert.ok(profileSource.includes('showtime: "Showtime 展示"'));
  assert.ok(profileSource.includes("/api/showtime/my-tracks"));
  assert.ok(profileSource.includes("copy.showtimeSupportPending"));
});

test("founder catalog production write path is guarded by read-only preview and explicit confirmation", () => {
  assert.ok(previewScriptSource.includes("write_safe: false"));
  assert.ok(previewScriptSource.includes("ambiguous_or_not_exactly_two_do_not_apply"));
  assert.ok(previewScriptSource.includes("demo_candidate_needs_owner_confirmation"));
  assert.ok(previewScriptSource.includes("surfacedMs > cutoffMs"));
  assert.ok(previewScriptSource.includes("public_less_than_30_days"));
  assert.ok(applyScriptSource.includes("--confirm=showtime-founder-catalog-2026-07-10"));
  assert.ok(applyScriptSource.includes("If demo IDs are provided, exactly two confirmed demo UUIDs are required."));
  assert.ok(applyScriptSource.includes("let softDeletedDemoCount = 0"));
  assert.ok(applyScriptSource.includes("Explicit founder catalog candidate UUIDs are required"));
});

test("public Bar Heartbreak copy no longer promises Heart/day Showtime eligibility", () => {
  assert.equal(listenBarSource.includes("Showtime 入選資格"), false);
  assert.equal(listenBarSource.includes("makes it Showtime eligible"), false);
  assert.equal(listenBarSource.includes("顆心，或公播存活"), false);
  assert.ok(listenBarSource.includes("Showtime 是 AIPOGER 認可作品庫"));
});

test("Battle archive Showtime public removals keep history but leave the public catalog", () => {
  assert.ok(archiveRemovalMigrationSource.includes("showtime_public_removed_at"));
  assert.ok(archiveRemovalMigrationSource.includes("battle_result_archives_showtime_public_idx"));
  assert.ok(archiveRemovalMigrationSource.includes("keeps the original battle archive/result history intact"));
  assert.ok(rankSource.includes(".is(\"showtime_public_removed_at\", null)"));
  assert.ok(rankSource.includes("row.showtimePublicRemovedAt"));
  assert.ok(honorInteractionsRouteSource.includes(".is(\"showtime_public_removed_at\", null)"));
  assert.ok(dropFullSongsRouteSource.includes(".is(\"showtime_public_removed_at\", null)"));
  assert.equal(archiveRemovalMigrationSource.includes("delete from public.battle_result_archives"), false);
});
