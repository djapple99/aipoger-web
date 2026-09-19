import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const aiMusicTracksRouteSource = readFileSync(new URL("../src/app/api/ai-music/tracks/route.ts", import.meta.url), "utf8");
const listenBarSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const reactionRouteSource = readFileSync(new URL("../src/app/api/listen-bar/reaction/route.ts", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("Explore AI Music hearts use the shared Bar Heartbreak total", () => {
  assert.ok(aiMusicSource.includes('fetch(`/api/ai-music/tracks?lang=${encodeURIComponent(lang)}`'));
  assert.ok(aiMusicSource.includes('fetch("/api/listen-bar/reaction"'));
  assert.ok(aiMusicSource.includes('reaction: "heart"'));
  assert.ok(aiMusicSource.includes("trackId: track.sourceId"));
  assert.ok(aiMusicTracksRouteSource.includes('.from("listen_bar_tracks")'));
  assert.ok(aiMusicSource.includes("row.heart_count ?? track.positiveReactionCount"));
  assert.equal(aiMusicSource.includes("battle_result_archives"), false);
  assert.equal(aiMusicSource.includes("battle_song_stats"), false);
  assert.equal(aiMusicSource.includes("/api/honor-board/interactions?keys="), false);
  assert.equal(aiMusicSource.includes("myFavorited"), false);
  assert.equal(aiMusicSource.includes("favoriteCount"), false);
});

test("Explore AI Music lights and cancels only the viewer's active Taiwan-day Heart", () => {
  assert.ok(aiMusicSource.includes("type HeartState = Record<string, boolean>"));
  assert.ok(aiMusicSource.includes("const [heartStates, setHeartStates]"));
  assert.ok(aiMusicSource.includes("const voteDate = taipeiVoteDate()"));
  assert.ok(aiMusicSource.includes('.eq("vote_date", voteDate)'));
  assert.ok(aiMusicSource.includes("heartedToday={Boolean(heartStates[track.recordKey])}"));
  assert.ok(aiMusicSource.includes("payload.heartedToday === true"));
  assert.ok(aiMusicSource.includes("已取消愛心與收藏。"));
  assert.ok(aiMusicSource.includes("取消愛心與收藏"));
  assert.equal(aiMusicSource.includes("heartCooldowns"), false);
  assert.equal(aiMusicSource.includes("HEART_COOLDOWN_MS"), false);
});

test("Bar Heartbreak repeats a Heart press as a same-day cancel", () => {
  assert.ok(listenBarSource.includes("const next = previous === key ? null : key;"));
  assert.ok(listenBarSource.includes("const today = taipeiVoteDate();"));
  assert.ok(listenBarSource.includes('.eq("vote_date", today)'));
  assert.ok(listenBarSource.includes("再按一次即可取消"));
  assert.ok(listenBarSource.includes("取消愛心與收藏"));
  assert.equal(listenBarSource.includes("HEART_COOLDOWN_MS"), false);
  assert.equal(listenBarSource.includes("heartCooldownSince"), false);
});

test("Listen Bar reaction API deletes today's repeated Heart and synchronizes saved songs", () => {
  assert.ok(reactionRouteSource.includes("const voteDate = taipeiVoteDate();"));
  assert.ok(reactionRouteSource.includes('.eq("vote_date", voteDate)'));
  assert.ok(reactionRouteSource.includes("const cancelCurrentReaction = Boolean(reaction && previousReaction === reaction);"));
  assert.ok(reactionRouteSource.includes("const nextReaction = cancelCurrentReaction ? null : reaction;"));
  assert.ok(reactionRouteSource.includes(".delete()"));
  assert.ok(reactionRouteSource.includes("removeListenBarFavorite"));
  assert.ok(reactionRouteSource.includes("const heartWasCancelled = previousReaction === \"heart\" && nextReaction !== \"heart\";"));
  assert.ok(reactionRouteSource.includes("heartedToday: nextReaction === \"heart\""));
  assert.equal(reactionRouteSource.includes("HEART_COOLDOWN_MS"), false);
  assert.equal(reactionRouteSource.includes("heartCooldownUntil"), false);
  assert.equal(reactionRouteSource.includes("alreadyReacted"), false);
});

test("product rules keep private active state separate from public totals", () => {
  assert.ok(productRulesSource.includes("Re-pressing an active Heart on the same track cancels that day's Heart"));
  assert.ok(productRulesSource.includes("Public music surfaces must show total Heart count only as the public metric"));
  assert.ok(productRulesSource.includes("Explore AI Music and Bar Heartbreak must read and update the same `listen_bar_tracks` Heart totals"));
});
