import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAiMusicExploreGenreLanes } from "../src/lib/ai-music-explore-order.ts";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const aiMusicTracksRouteSource = readFileSync(new URL("../src/app/api/ai-music/tracks/route.ts", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

const now = new Date("2026-07-10T12:00:00.000Z");

function work(id, genre, createdAt, creator = "Creator", positiveReactionCount = 0) {
  return { id, genre, createdAt, creator, positiveReactionCount };
}

test("fresh eligible works lead their genre lane ahead of established reaction order", () => {
  const lanes = buildAiMusicExploreGenreLanes([
    work("old-high-reaction", "K-Pop 韓式動感", "2026-07-01T12:00:00.000Z", "Old", 99),
    work("fresh-work", "K-Pop 韓式動感", "2026-07-10T10:00:00.000Z", "New", 0),
  ], now);
  const kpop = lanes.find((lane) => lane.genre === "K-Pop 韓式動感");

  assert.deepEqual(kpop?.tracks.map((track) => track.id), ["fresh-work", "old-high-reaction"]);
});

test("lanes with fresh works move forward by their newest created_at and use fixed genre order for ties", () => {
  const lanes = buildAiMusicExploreGenreLanes([
    work("kpop-fresh", "K-Pop 韓式動感", "2026-07-10T10:00:00.000Z"),
    work("rap-fresh", "Rap 街頭說唱", "2026-07-10T11:00:00.000Z"),
    work("disco-old", "Disco / Funk / City-Pop", "2026-07-01T12:00:00.000Z"),
  ], now);

  assert.deepEqual(lanes.slice(0, 3).map((lane) => lane.genre), [
    "Rap 街頭說唱",
    "K-Pop 韓式動感",
    "Disco / Funk / City-Pop",
  ]);
});

test("works older than 72 hours return to established reaction-first ordering", () => {
  const lanes = buildAiMusicExploreGenreLanes([
    work("expired-new", "K-Pop 韓式動感", "2026-07-07T11:59:59.999Z", "Expired", 1),
    work("established-hit", "K-Pop 韓式動感", "2026-07-01T12:00:00.000Z", "Hit", 80),
  ], now);
  const kpop = lanes.find((lane) => lane.genre === "K-Pop 韓式動感");

  assert.deepEqual(kpop?.tracks.map((track) => track.id), ["established-hit", "expired-new"]);
});

test("matching created_at values use id descending as a stable order", () => {
  const lanes = buildAiMusicExploreGenreLanes([
    work("fresh-a", "K-Pop 韓式動感", "2026-07-10T10:00:00.000Z"),
    work("fresh-z", "K-Pop 韓式動感", "2026-07-10T10:00:00.000Z"),
  ], now);
  const kpop = lanes.find((lane) => lane.genre === "K-Pop 韓式動感");

  assert.deepEqual(kpop?.tracks.map((track) => track.id), ["fresh-z", "fresh-a"]);
});

test("one creator cannot fill the compact lane with multiple fresh works, but expanded lane keeps them", () => {
  const lanes = buildAiMusicExploreGenreLanes([
    work("newest-a", "K-Pop 韓式動感", "2026-07-10T11:00:00.000Z", "Creator A"),
    work("newer-a", "K-Pop 韓式動感", "2026-07-10T10:00:00.000Z", "Creator A"),
    work("older-a", "K-Pop 韓式動感", "2026-07-10T09:00:00.000Z", "Creator A"),
    work("old-1", "K-Pop 韓式動感", "2026-07-01T12:00:00.000Z", "Old 1", 5),
    work("old-2", "K-Pop 韓式動感", "2026-07-01T11:00:00.000Z", "Old 2", 4),
    work("old-3", "K-Pop 韓式動感", "2026-07-01T10:00:00.000Z", "Old 3", 3),
  ], now);
  const kpop = lanes.find((lane) => lane.genre === "K-Pop 韓式動感");

  assert.deepEqual(kpop?.collapsedTracks.map((track) => track.id), ["newest-a", "old-1", "old-2", "old-3"]);
  assert.deepEqual(kpop?.tracks.map((track) => track.id), ["newest-a", "newer-a", "older-a", "old-1", "old-2", "old-3"]);
});

test("Explore has no standalone latest shelf and only orders eligible tracks by created_at", () => {
  assert.ok(aiMusicSource.includes("buildAiMusicExploreGenreLanes"));
  assert.ok(aiMusicSource.includes("group.collapsedTracks"));
  assert.equal(aiMusicSource.includes("New Arrivals"), false);
  assert.equal(aiMusicSource.includes("最新上架"), false);
  assert.equal(aiMusicSource.includes("72 小時新歌"), false);
  assert.ok(aiMusicTracksRouteSource.includes("isCurrentMusicGenre(row.genre)"));
  assert.ok(aiMusicTracksRouteSource.includes('status === "moderation_hold"'));
  assert.equal(aiMusicTracksRouteSource.includes('"updated_at"'), false);
  assert.ok(productRulesSource.includes("No standalone `最新上架` / `New Arrivals` / `72 小時新歌` shelf"));
});
