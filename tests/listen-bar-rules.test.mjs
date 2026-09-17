import assert from "node:assert/strict";
import test from "node:test";
import {
  LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT,
  LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS,
  LISTEN_BAR_HONOR_ROLL_REACTION_THRESHOLD,
  LISTEN_BAR_HONOR_ROLL_SURVIVAL_DAYS,
  LISTEN_BAR_PUBLIC_ROTATION_LIMIT,
  listenBarChallengerSlotLimitForPublicCount,
  listenBarCreatorGenrePublicLimitReached,
  listenBarIsHonorEligible,
  listenBarPublicDisplayDay,
  listenBarPublicSurvivalDays,
  listenBarSubmissionPhaseForGenrePublicCount,
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

test("listen bar submissions remain public above former genre capacity", () => {
  assert.equal(listenBarSubmissionPhaseForGenrePublicCount(0), "public");
  assert.equal(listenBarSubmissionPhaseForGenrePublicCount(LISTEN_BAR_PUBLIC_ROTATION_LIMIT - 1), "public");
  assert.equal(listenBarSubmissionPhaseForGenrePublicCount(LISTEN_BAR_PUBLIC_ROTATION_LIMIT), "public");
  assert.equal(listenBarSubmissionPhaseForGenrePublicCount(Number.NaN), "public");
});

test("listen bar challenger protection period is thirty six hours", () => {
  assert.equal(LISTEN_BAR_CHALLENGER_OBSERVATION_HOURS, 36);
});

test("listen bar creator genre public cap requires reducing to four before uploading again", () => {
  assert.equal(LISTEN_BAR_CREATOR_GENRE_PUBLIC_LIMIT, 5);
  assert.equal(listenBarCreatorGenrePublicLimitReached(4), false);
  assert.equal(listenBarCreatorGenrePublicLimitReached(5), true);
  assert.equal(listenBarCreatorGenrePublicLimitReached(26), true);
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

test("retired rotation never promotes or removes tracks even above former capacity", () => {
  const tracks = Array.from({ length: 500 }, (_, index) => ({
    id: String(index), genre: "EDM 百大電音", barPhase: index % 2 ? "public" : "challenger",
    positiveReactionCount: 0, createdAt: new Date(NOW - 90 * DAY_MS).toISOString(),
  }));
  for (const at of [NOW, Date.UTC(2027, 0, 1)]) {
    const preview = buildListenBarRotationPreview(tracks, at);
    assert.equal(preview.projectedPublicCount, 500);
    assert.equal(preview.publicOverflow, 0);
    assert.deepEqual(preview.wouldPromote, []);
    assert.deepEqual(preview.wouldRemove, []);
  }
});
