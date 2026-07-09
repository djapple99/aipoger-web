import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const listenBarSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const reactionRouteSource = readFileSync(new URL("../src/app/api/listen-bar/reaction/route.ts", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("Explore AI Music hearts use total public heart count instead of personal favorite state", () => {
  assert.ok(aiMusicSource.includes('fetch("/api/listen-bar/reaction"'));
  assert.ok(aiMusicSource.includes('reaction: "heart"'));
  assert.ok(aiMusicSource.includes("trackId: track.sourceId"));
  assert.ok(aiMusicSource.includes('.from("listen_bar_tracks")'));
  assert.ok(aiMusicSource.includes("row.heart_count ?? track.positiveReactionCount"));
  assert.equal(aiMusicSource.includes("battle_result_archives"), false);
  assert.equal(aiMusicSource.includes("battle_song_stats"), false);
  assert.equal(aiMusicSource.includes("/api/honor-board/interactions?keys="), false);
  assert.equal(aiMusicSource.includes("myFavorited"), false);
  assert.equal(aiMusicSource.includes("favoriteCount"), false);
  assert.equal(aiMusicSource.includes("取消收藏"), false);
});

test("Explore AI Music lights the Heart button for the viewer's 24 hour Heart cooldown", () => {
  assert.ok(aiMusicSource.includes("heartCooldowns"));
  assert.ok(aiMusicSource.includes('.from("listen_bar_track_reactions")'));
  assert.ok(aiMusicSource.includes('.eq("reaction", "heart")'));
  assert.ok(aiMusicSource.includes('.gte("created_at", since)'));
  assert.ok(aiMusicSource.includes("heartedToday={isHeartCoolingDown(heartCooldowns[track.recordKey])}"));
  assert.ok(aiMusicSource.includes("HeartIcon filled={heartedToday}"));
  assert.ok(aiMusicSource.includes("你已送過這首歌的愛心，24H 後可以再送一次。"));
  assert.equal(aiMusicSource.includes("myFavorited"), false);
  assert.equal(aiMusicSource.includes("favoriteCount"), false);
});

test("Bar Heartbreak Heart is idempotent during the 24 hour Heart cooldown", () => {
  assert.ok(listenBarSource.includes("const next = key;"));
  assert.ok(listenBarSource.includes("HEART_COOLDOWN_MS"));
  assert.ok(listenBarSource.includes('.gte("created_at", heartCooldownSince)'));
  assert.ok(listenBarSource.includes("currentHeartSent"));
  assert.ok(listenBarSource.includes("不重複累加"));
  assert.equal(listenBarSource.includes("previous === key ? null : key"), false);
  assert.equal(listenBarSource.includes("可更換或取消"), false);
});

test("Listen Bar reaction API returns 24 hour Heart cooldown state without duplicate increments", () => {
  assert.ok(reactionRouteSource.includes("HEART_COOLDOWN_MS"));
  assert.ok(reactionRouteSource.includes("heartCooldownUntil"));
  assert.ok(reactionRouteSource.includes("alreadyReacted"));
  assert.ok(reactionRouteSource.includes('.order("created_at", { ascending: false })'));
  assert.ok(reactionRouteSource.includes("reaction && !alreadyReacted"));
});

test("product rules keep personal favorite state out of public music surfaces", () => {
  assert.ok(productRulesSource.includes("Public music surfaces must show total Heart count only as the public metric"));
  assert.ok(productRulesSource.includes("may light the viewer's own Heart button"));
  assert.ok(productRulesSource.includes("must not duplicate, cancel, or remove the saved favorite"));
  assert.ok(productRulesSource.includes("Explore AI Music and Bar Heartbreak must read and update the same `listen_bar_tracks` Heart totals"));
});
