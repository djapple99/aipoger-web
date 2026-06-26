import assert from "node:assert/strict";
import test from "node:test";
import {
  LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
  LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS,
  listenBarIsHonorEligible,
  listenBarPublicDisplayDay,
  listenBarPublicSurvivalDays,
} from "../src/lib/listen-bar-rules.ts";

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
