import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lifecycleSource = readFileSync(new URL("../src/lib/ai-music-surface-lifecycle.ts", import.meta.url), "utf8");
const aiMusicTracksRouteSource = readFileSync(new URL("../src/app/api/ai-music/tracks/route.ts", import.meta.url), "utf8");
const aiMusicChallengeRouteSource = readFileSync(new URL("../src/app/api/ai-music/challenges/route.ts", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("Explore AI Music lifecycle reads official challenge results before displaying works", () => {
  assert.ok(lifecycleSource.includes('AI_MUSIC_CHALLENGE_BATTLE_TYPE'));
  assert.ok(lifecycleSource.includes('ai_music_challenge_invites'));
  assert.ok(lifecycleSource.includes('battle_result_archives'));
  assert.ok(lifecycleSource.includes('isOfficialDropBattleResult'));
  assert.ok(lifecycleSource.includes('stats.officialLosses += 1'));
  assert.ok(lifecycleSource.includes('status === "accepted"'));
  assert.ok(lifecycleSource.includes('defenseSuccessChallengerIdsByTrackId'));
  assert.ok(lifecycleSource.includes('stats.officialDefenseSuccesses = challengerIds.size'));
  assert.ok(lifecycleSource.includes('shouldCertifyAiMusicTrackForShowtimeByDefense'));
  assert.ok(lifecycleSource.includes('shouldRetireAiMusicTrackFromExplore'));
});

test("Explore AI Music API filters retired works and challenge API blocks retired or certified works", () => {
  assert.ok(aiMusicTracksRouteSource.includes('buildAiMusicSurfaceLifecycleMap'));
  assert.ok(aiMusicTracksRouteSource.includes('ai_music_official_defense_successes'));
  assert.ok(aiMusicTracksRouteSource.includes('ai_music_showtime_defense_target'));
  assert.ok(aiMusicTracksRouteSource.includes('AI_MUSIC_SHOWTIME_DEFENSE_SUCCESS_TARGET'));
  assert.ok(aiMusicTracksRouteSource.includes('.filter((row) => !row.ai_music_explore_retired)'));
  assert.ok(aiMusicChallengeRouteSource.includes('buildAiMusicSurfaceLifecycleMap'));
  assert.ok(aiMusicChallengeRouteSource.includes('已進入 Showtime，入選後不再接受挑戰'));
  assert.ok(aiMusicChallengeRouteSource.includes('已累積 8 場正式敗績'));
});

test("product rules document current surface lifecycle", () => {
  assert.ok(productRulesSource.includes("Bar Heartbreak is the AI music public airplay pool and submission entry"));
  assert.ok(productRulesSource.includes("Explore AI Music is the public uploaded-works wall"));
  assert.ok(productRulesSource.includes("Showtime is the certified works archive"));
  assert.ok(productRulesSource.includes("6 official defense successes"));
  assert.ok(productRulesSource.includes("The same challenger may contribute at most 1 defense success"));
  assert.ok(productRulesSource.includes("8 official losses"));
});
