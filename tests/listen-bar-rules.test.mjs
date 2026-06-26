import assert from "node:assert/strict";
import test from "node:test";
import {
  LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
  LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS,
  listenBarIsHonorEligible,
  listenBarPublicDisplayDay,
  listenBarPublicSurvivalDays,
} from "../src/lib/listen-bar-rules.ts";
import { buildListenBarRotationPreview } from "../src/lib/listen-bar-rotation.ts";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 26, 0, 0, 0);

test("listen bar honor eligibility allows 30 positive reactions", () => {
  assert.equal(
    listenBarIsHonorEligible({
      positiveReactionCount: LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
      promotedAt: new Date(NOW - DAY_MS).toISOString(),
      createdAt: new Date(NOW - DAY_MS).toISOString(),
    }, NOW),
    true,
  );
});

test("listen bar honor eligibility allows seven public survival days", () => {
  const promotedAt = new Date(NOW - LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS * DAY_MS).toISOString();
  assert.equal(listenBarPublicSurvivalDays(promotedAt, null, NOW), 7);
  assert.equal(
    listenBarIsHonorEligible({
      positiveReactionCount: 0,
      promotedAt,
      createdAt: promotedAt,
    }, NOW),
    true,
  );
});

test("listen bar honor eligibility rejects under-threshold tracks before seven public days", () => {
  const promotedAt = new Date(NOW - (LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS * DAY_MS - 1)).toISOString();
  assert.equal(listenBarPublicSurvivalDays(promotedAt, null, NOW), 6);
  assert.equal(listenBarPublicDisplayDay(promotedAt, null, NOW), 7);
  assert.equal(
    listenBarIsHonorEligible({
      positiveReactionCount: LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD - 1,
      promotedAt,
      createdAt: promotedAt,
    }, NOW),
    false,
  );
});

test("listen bar rotation preview promotes protected challengers before calculating overflow removal", () => {
  const publicRows = Array.from({ length: 88 }, (_, index) => ({
    id: `public-${index}`,
    barPhase: "public",
    positiveReactionCount: index === 0 ? 0 : 5,
    createdAt: new Date(NOW - (10 + index) * DAY_MS).toISOString(),
  }));
  const challenger = {
    id: "challenger-ready",
    title: "Ready Challenger",
    barPhase: "challenger",
    positiveReactionCount: 0,
    createdAt: new Date(NOW - 2 * DAY_MS).toISOString(),
  };

  const preview = buildListenBarRotationPreview([...publicRows, challenger], NOW);

  assert.equal(preview.eligibleChallengerCount, 1);
  assert.equal(preview.projectedPublicCount, 89);
  assert.equal(preview.publicOverflow, 1);
  assert.deepEqual(preview.wouldPromote.map((track) => track.id), ["challenger-ready"]);
  assert.deepEqual(preview.wouldRemove.map((track) => track.id), ["public-0"]);
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
