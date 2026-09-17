import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lifecycleSource = readFileSync(new URL("../src/lib/ai-music-surface-lifecycle.ts", import.meta.url), "utf8");
const aiMusicTracksRouteSource = readFileSync(new URL("../src/app/api/ai-music/tracks/route.ts", import.meta.url), "utf8");
const aiMusicChallengeRouteSource = readFileSync(new URL("../src/app/api/ai-music/challenges/route.ts", import.meta.url), "utf8");
const clientSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");

test("Explore AI Music lifecycle reads official challenge results before displaying works", () => {
  assert.ok(lifecycleSource.includes('AI_MUSIC_CHALLENGE_BATTLE_TYPE'));
  assert.ok(lifecycleSource.includes('ai_music_challenge_invites'));
  assert.ok(lifecycleSource.includes('battle_result_archives'));
  assert.ok(lifecycleSource.includes('isOfficialDropBattleResult'));
  assert.ok(lifecycleSource.includes('stats.officialLosses += 1'));
  assert.ok(lifecycleSource.includes('status === "accepted"'));
  assert.ok(lifecycleSource.includes('defenseSuccessChallengerIdsByTrackId'));
  assert.ok(lifecycleSource.includes('stats.officialDefenseSuccesses = challengerIds.size'));
  assert.ok(lifecycleSource.includes('isAiMusicPersistedShowtimeCertified'));
  assert.equal(lifecycleSource.includes('shouldCertifyAiMusicTrackForShowtimeByDefense'), false);
  assert.ok(lifecycleSource.includes('shouldRetireAiMusicTrackFromExplore'));
});

test("Explore includes historical certified works and only blocks challenges for retirement or current availability", () => {
  assert.ok(aiMusicTracksRouteSource.includes('buildAiMusicSurfaceLifecycleMap'));
  assert.ok(aiMusicTracksRouteSource.includes('ai_music_official_defense_successes'));
  assert.equal(aiMusicTracksRouteSource.includes('ai_music_showtime_defense_target'), false);
  assert.equal(aiMusicTracksRouteSource.includes('surface === "showtime"'), false);
  assert.ok(aiMusicTracksRouteSource.includes('.filter((row) => !row.ai_music_explore_retired)'));
  assert.ok(aiMusicTracksRouteSource.includes('isPublicBarAirplayTrack(row)'));
  assert.ok(aiMusicChallengeRouteSource.includes('buildAiMusicSurfaceLifecycleMap'));
  assert.equal(aiMusicChallengeRouteSource.includes('isAiMusicPersistedShowtimeCertified'), false);
  assert.ok(aiMusicChallengeRouteSource.includes('isPublicBarAirplayTrack(track)'));
  assert.ok(aiMusicChallengeRouteSource.includes('已累積 8 場正式敗績'));
});

test("Explore presents genuine W/L without a certification badge or six-defense progress", () => {
  assert.ok(clientSource.includes('track.wins}W / ${track.losses}L'));
  assert.equal(clientSource.includes('defenseProgress'), false);
  assert.equal(clientSource.includes('Showtime certified'), false);
  assert.equal(clientSource.includes('Showtime 認證'), false);
  assert.equal(clientSource.includes('ai_music_showtime_defense_target'), false);
});
