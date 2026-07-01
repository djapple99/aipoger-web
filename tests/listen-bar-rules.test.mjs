import assert from "node:assert/strict";
import test from "node:test";
import {
  LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
  LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS,
  LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
  listenBarChallengerSlotLimitForPublicCount,
  listenBarIsHonorEligible,
  listenBarPublicDisplayDay,
  listenBarPublicSurvivalDays,
  listenBarSurvivalStartedAt,
} from "../src/lib/listen-bar-rules.ts";
import { buildListenBarRotationPreview } from "../src/lib/listen-bar-rotation.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 26, 0, 0, 0);

test("listen bar challenger slot limit follows public pool 3/2/1 tiers", () => {
  assert.equal(listenBarChallengerSlotLimitForPublicCount(0), 3);
  assert.equal(listenBarChallengerSlotLimitForPublicCount(2), 3);
  assert.equal(listenBarChallengerSlotLimitForPublicCount(3), 2);
  assert.equal(listenBarChallengerSlotLimitForPublicCount(5), 2);
  assert.equal(listenBarChallengerSlotLimitForPublicCount(6), 1);
  assert.equal(listenBarChallengerSlotLimitForPublicCount(Number.NaN), 3);
});

test("listen bar honor eligibility allows 30 positive reactions", () => {
  const survivalStartedAt = new Date(NOW - DAY_MS).toISOString();
  assert.equal(
    listenBarIsHonorEligible({
      positiveReactionCount: LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
      promotedAt: new Date(NOW - DAY_MS).toISOString(),
      createdAt: new Date(NOW - DAY_MS).toISOString(),
    }, NOW, survivalStartedAt),
    true,
  );
});

test("listen bar honor eligibility allows seven public survival days", () => {
  const promotedAt = new Date(NOW - LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS * DAY_MS).toISOString();
  const survivalStartedAt = promotedAt;
  assert.equal(listenBarPublicSurvivalDays(promotedAt, null, NOW, survivalStartedAt), 7);
  assert.equal(
    listenBarIsHonorEligible({
      positiveReactionCount: 0,
      promotedAt,
      createdAt: promotedAt,
    }, NOW, survivalStartedAt),
    true,
  );
});

test("listen bar honor eligibility rejects under-threshold tracks before seven public days", () => {
  const promotedAt = new Date(NOW - (LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS * DAY_MS - 1)).toISOString();
  const survivalStartedAt = promotedAt;
  assert.equal(listenBarPublicSurvivalDays(promotedAt, null, NOW, survivalStartedAt), 6);
  assert.equal(listenBarPublicDisplayDay(promotedAt, null, NOW, survivalStartedAt), 7);
  assert.equal(
    listenBarIsHonorEligible({
      positiveReactionCount: LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD - 1,
      promotedAt,
      createdAt: promotedAt,
    }, NOW, survivalStartedAt),
    false,
  );
});

test("listen bar honor eligibility stays inactive before the genre public pool reaches 36 songs", () => {
  const publicRows = Array.from({ length: LISTEN_BAR_PUBLIC_ROTATION_LIMIT - 1 }, (_, index) => ({
    id: `public-${index}`,
    genre: "EDM 百大電音",
    barPhase: "public",
    promotedAt: new Date(NOW - (20 + index) * DAY_MS).toISOString(),
    createdAt: new Date(NOW - (20 + index) * DAY_MS).toISOString(),
  }));

  const survivalStartedAt = listenBarSurvivalStartedAt(publicRows, LISTEN_BAR_PUBLIC_ROTATION_LIMIT, "EDM 百大電音");
  assert.equal(survivalStartedAt, null);
  assert.equal(
    listenBarIsHonorEligible({
      positiveReactionCount: LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
      promotedAt: new Date(NOW - 20 * DAY_MS).toISOString(),
      createdAt: new Date(NOW - 20 * DAY_MS).toISOString(),
    }, NOW, survivalStartedAt),
    false,
  );
});

test("listen bar honor survival starts when the 36th same-genre public song enters the pool", () => {
  const publicRows = Array.from({ length: LISTEN_BAR_PUBLIC_ROTATION_LIMIT }, (_, index) => ({
    id: `public-${index}`,
    genre: "EDM 百大電音",
    barPhase: "public",
    promotedAt: new Date(NOW - (LISTEN_BAR_PUBLIC_ROTATION_LIMIT - index) * 60_000).toISOString(),
    createdAt: new Date(NOW - (LISTEN_BAR_PUBLIC_ROTATION_LIMIT - index) * 60_000).toISOString(),
  }));
  const survivalStartedAt = listenBarSurvivalStartedAt(publicRows, LISTEN_BAR_PUBLIC_ROTATION_LIMIT, "EDM 百大電音");
  const expectedStartedAt = publicRows[LISTEN_BAR_PUBLIC_ROTATION_LIMIT - 1].promotedAt;

  assert.equal(survivalStartedAt, expectedStartedAt);
  assert.equal(
    listenBarPublicSurvivalDays(new Date(NOW - 20 * DAY_MS).toISOString(), null, NOW, survivalStartedAt),
    0,
  );
  assert.equal(
    listenBarIsHonorEligible({
      positiveReactionCount: 0,
      promotedAt: new Date(NOW - 20 * DAY_MS).toISOString(),
      createdAt: new Date(NOW - 20 * DAY_MS).toISOString(),
    }, NOW, survivalStartedAt),
    false,
  );
});

test("listen bar rotation preview protects honor-eligible public songs before overflow removal", () => {
  const publicRows = Array.from({ length: LISTEN_BAR_PUBLIC_ROTATION_LIMIT }, (_, index) => ({
    id: `public-${index}`,
    genre: "EDM 百大電音",
    barPhase: "public",
    positiveReactionCount: index === 0 ? 0 : 5,
    createdAt: new Date(NOW - (10 + index) * DAY_MS).toISOString(),
  }));
  const challenger = {
    id: "challenger-ready",
    title: "Ready Challenger",
    genre: "EDM 百大電音",
    barPhase: "challenger",
    positiveReactionCount: 0,
    createdAt: new Date(NOW - 2 * DAY_MS).toISOString(),
  };

  const preview = buildListenBarRotationPreview([...publicRows, challenger], NOW);

  assert.equal(preview.eligibleChallengerCount, 1);
  assert.equal(preview.projectedPublicCount, LISTEN_BAR_PUBLIC_ROTATION_LIMIT + 1);
  assert.equal(preview.publicOverflow, 1);
  assert.deepEqual(preview.wouldPromote.map((track) => track.id), ["challenger-ready"]);
  assert.deepEqual(preview.wouldRemove.map((track) => track.id), ["challenger-ready"]);
});

test("listen bar capacity pause is no longer active after new genre-pool rules launch", () => {
  const protectionNow = Date.UTC(2026, 6, 1, 12, 0, 0);
  const preview = buildListenBarRotationPreview([], protectionNow);
  assert.equal(preview.evictionPaused, false);
});

test("listen bar rotation preview keeps protected challengers out of removal candidates", () => {
  const preview = buildListenBarRotationPreview([
    {
      id: "public-low",
      barPhase: "public",
      positiveReactionCount: 0,
      createdAt: new Date(NOW - 8 * DAY_MS).toISOString(),
    },
    {
      id: "challenger-new",
      barPhase: "challenger",
      positiveReactionCount: 0,
      createdAt: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
    },
  ], NOW);

  assert.equal(preview.eligibleChallengerCount, 0);
  assert.equal(preview.publicOverflow, 0);
  assert.deepEqual(preview.wouldRemove, []);
});

test("listen bar rotation preview only removes overflow inside the same genre pool", () => {
  const edmRows = Array.from({ length: LISTEN_BAR_PUBLIC_ROTATION_LIMIT + 1 }, (_, index) => ({
    id: `edm-${index}`,
    genre: "EDM 百大電音",
    barPhase: "public",
    positiveReactionCount: index === 0 ? 0 : 9,
    createdAt: new Date(NOW - (index + 1) * 60_000).toISOString(),
  }));
  const rapRows = Array.from({ length: LISTEN_BAR_PUBLIC_ROTATION_LIMIT - 1 }, (_, index) => ({
    id: `rap-${index}`,
    genre: "Rap 街頭說唱",
    barPhase: "public",
    positiveReactionCount: 0,
    createdAt: new Date(NOW - (index + 1) * 60_000).toISOString(),
  }));

  const preview = buildListenBarRotationPreview([...edmRows, ...rapRows], NOW);

  assert.equal(preview.publicOverflow, 1);
  assert.deepEqual(preview.wouldRemove.map((track) => track.id), ["edm-0"]);
});
