import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAiMusicHeatList } from "../src/lib/ai-music-heat.ts";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const aiMusicTracksRouteSource = readFileSync(new URL("../src/app/api/ai-music/tracks/route.ts", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

function work(id, values = {}) {
  return {
    id,
    createdAt: "2026-07-08T12:00:00.000Z",
    recentHeartSupporters: 0,
    recentOfficialAudienceVotes: 0,
    recentQualifiedInteractionAt: null,
    ...values,
  };
}

test("Hot Now uses seven-day distinct Heart supporters before official audience votes", () => {
  const rows = buildAiMusicHeatList([
    work("more-votes", { recentHeartSupporters: 2, recentOfficialAudienceVotes: 30 }),
    work("more-supporters", { recentHeartSupporters: 3, recentOfficialAudienceVotes: 3 }),
  ]);

  assert.deepEqual(rows.map((row) => row.track.id), ["more-supporters", "more-votes"]);
  assert.deepEqual(rows.map((row) => row.rank), [1, 2]);
});

test("Hot Now uses official valid votes, interaction time, created_at, then id for stable ties", () => {
  const rows = buildAiMusicHeatList([
    work("older-interaction", { recentHeartSupporters: 2, recentOfficialAudienceVotes: 8, recentQualifiedInteractionAt: "2026-07-09T08:00:00.000Z" }),
    work("newer-interaction", { recentHeartSupporters: 2, recentOfficialAudienceVotes: 8, recentQualifiedInteractionAt: "2026-07-09T09:00:00.000Z" }),
    work("same-time-a", { recentHeartSupporters: 2, recentOfficialAudienceVotes: 8, recentQualifiedInteractionAt: "2026-07-09T09:00:00.000Z", createdAt: "2026-07-10T00:00:00.000Z" }),
    work("same-time-z", { recentHeartSupporters: 2, recentOfficialAudienceVotes: 8, recentQualifiedInteractionAt: "2026-07-09T09:00:00.000Z", createdAt: "2026-07-10T00:00:00.000Z" }),
  ]);

  assert.deepEqual(rows.map((row) => row.track.id), ["same-time-z", "same-time-a", "newer-interaction", "older-interaction"]);
});

test("works without a recent verified signal stay in accumulating without a fake rank", () => {
  const rows = buildAiMusicHeatList([
    work("signal", { recentHeartSupporters: 1 }),
    work("older-accumulating", { createdAt: "2026-07-01T00:00:00.000Z" }),
    work("newer-accumulating", { createdAt: "2026-07-02T00:00:00.000Z" }),
  ]);

  assert.deepEqual(rows.map((row) => row.track.id), ["signal", "newer-accumulating", "older-accumulating"]);
  assert.equal(rows[0]?.rank, 1);
  assert.equal(rows[1]?.rank, null);
  assert.equal(rows[2]?.rank, null);
});

test("Explore Hot Now reads real recent Heart and official Battle archive data without an opaque score", () => {
  assert.ok(aiMusicTracksRouteSource.includes('from("listen_bar_track_reactions")'));
  assert.ok(aiMusicTracksRouteSource.includes('.eq("reaction", "heart")'));
  assert.ok(aiMusicTracksRouteSource.includes('from("ai_music_challenge_invites")'));
  assert.ok(aiMusicTracksRouteSource.includes('from("battle_result_archives")'));
  assert.ok(aiMusicTracksRouteSource.includes('isOfficialDropBattleResult'));
  assert.ok(aiMusicSource.includes('setWorksView("heat")'));
  assert.ok(aiMusicSource.includes("function HeatList"));
  assert.ok(aiMusicSource.includes("AIPOGER HEAT"));
  assert.ok(aiMusicSource.includes("catalogLabel={rank ? `#${String(rank).padStart(2, \"0\")}`"));
  assert.ok(aiMusicSource.includes("catalogNote={hasRecentSignal ? heatReason(track, isZh) : undefined}"));
  assert.ok(aiMusicSource.includes("sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 xl:grid-cols-6"));
  assert.equal(aiMusicSource.includes("sm:grid-cols-[2.6rem_5.5rem_minmax(0,1fr)_minmax(12rem,0.7fr)_auto]"), false);
  assert.equal(aiMusicSource.includes("Live Drop Signal"), false);
  assert.equal(aiMusicSource.includes("60s READY"), false);
  assert.equal(aiMusicSource.includes("Heat Score"), false);
  assert.ok(productRulesSource.includes("Hot Now / 正在升溫"));
});
