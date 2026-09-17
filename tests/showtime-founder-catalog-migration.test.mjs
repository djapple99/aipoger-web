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
const supportUrlMigrationSource = readFileSync(new URL("../supabase/20260710_listen_bar_support_url_schema.sql", import.meta.url), "utf8");
const listenBarSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");

test("founder catalog uses persisted Showtime state instead of old dynamic Heart/day eligibility", () => {
  assert.ok(showtimeHelperSource.includes("ai_music_showtime_certified"));
  assert.ok(showtimeHelperSource.includes("ai_music_showtime_public_removed_at"));
  assert.ok(migrationSource.includes("ai_music_showtime_certification_source"));
  assert.ok(lifecycleSource.includes("isAiMusicPersistedShowtimeCertified"));
  assert.equal(lifecycleSource.includes("showtimeTrackIdsFromListenBarRows"), false);
  assert.equal(lifecycleSource.includes("listenBarIsHonorEligible"), false);
  assert.ok(migrationSource.includes("ai_music_showtime_certified_at"));
});

test("Explore and Bar no longer exclude historical certified community songs", () => {
  assert.equal(aiMusicTracksRouteSource.includes('surface === "showtime"'), false);
  assert.ok(aiMusicTracksRouteSource.includes('.filter((row) => !row.ai_music_explore_retired)'));
  assert.ok(listenBarTracksRouteSource.includes("isPublicBarAirplayTrack"));
  assert.equal(rankSource.includes("surface=showtime"), false);
  assert.equal(rankSource.includes("listenBarIsHonorEligible"), false);
});

test("historical recognition no longer gates explicit creator challenge preferences or soft removal", () => {
  assert.equal(challengeRouteSource.includes("isAiMusicPersistedShowtimeCertified(track)"), false);
  assert.ok(challengeRouteSource.includes('ai_music_challenge_status: body.status'));
  assert.ok(removeTrackRouteSource.includes('review_status: "removed"'));
  assert.equal(removeTrackRouteSource.includes('isAiMusicPersistedShowtimeCertified'), false);
});

test("creator Showtime management only exposes display metadata and reviewed support URL", () => {
  assert.ok(showtimeMyTracksRouteSource.includes("cleanShowtimeSupportUrl"));
  assert.ok(showtimeMyTracksRouteSource.includes('support_url_status: supportUrlStatus'));
  assert.ok(showtimeMyTracksRouteSource.includes('ai_music_challenge_status: "showcase"'));
  assert.equal(showtimeMyTracksRouteSource.includes("audio_path: body"), false);
  assert.equal(showtimeMyTracksRouteSource.includes("ai_music_showtime_certified: body"), false);
  assert.ok(profileSource.includes('listenBar: "我的作品"'));
  assert.equal(showtimeMyTracksRouteSource.includes('.eq("ai_music_showtime_certified", true)'), false);
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
  assert.ok(listenBarSource.includes("愛波哥會持續選曲與整理"));
});

test("Battle archive Showtime public removals keep history but leave the public catalog", () => {
  assert.ok(archiveRemovalMigrationSource.includes("showtime_public_removed_at"));
  assert.ok(archiveRemovalMigrationSource.includes("battle_result_archives_showtime_public_idx"));
  assert.ok(archiveRemovalMigrationSource.includes("keeps the original battle archive/result history intact"));
  assert.ok(honorInteractionsRouteSource.includes(".is(\"showtime_public_removed_at\", null)"));
  assert.ok(dropFullSongsRouteSource.includes(".is(\"showtime_public_removed_at\", null)"));
  assert.equal(archiveRemovalMigrationSource.includes("delete from public.battle_result_archives"), false);
});

test("Showtime API schema includes support URL fields so modern selects do not fall back to legacy rows", () => {
  assert.ok(supportUrlMigrationSource.includes("add column if not exists support_url text"));
  assert.ok(supportUrlMigrationSource.includes("support_url_status text not null default 'none'"));
  assert.ok(supportUrlMigrationSource.includes("listen_bar_tracks_support_url_status_check"));
  assert.ok(aiMusicTracksRouteSource.includes("AI_MUSIC_SHOWTIME_TRACK_SELECT_FIELDS"));
  assert.ok(aiMusicTracksRouteSource.includes("isPublicBarAirplayTrack(row)"));
});
