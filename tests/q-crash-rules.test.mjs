import assert from "node:assert/strict";
import test from "node:test";

import {
  Q_CRASH_OFFICIAL_AUDIENCE_MIN,
  canQCrashAccountJoin,
  canQCrashAccountVote,
  isQCrashOfficialAudienceCount,
  isValidQCrashDropDuration,
  pickQCrashWinner,
  qCrashDurationMinutes,
  qCrashGenresMatch,
  qCrashVersionLabels,
} from "../src/lib/q-crash-rules.ts";

test("Q Crash accepts only the four simple duration presets", () => {
  assert.equal(qCrashDurationMinutes(30), 30);
  assert.equal(qCrashDurationMinutes("120"), 120);
  assert.equal(qCrashDurationMinutes(360), 360);
  assert.equal(qCrashDurationMinutes(1440), 1440);
  assert.equal(qCrashDurationMinutes(60), null);
});

test("Q Crash enforces 60-second Drops and matching genres", () => {
  assert.equal(isValidQCrashDropDuration(15), true);
  assert.equal(isValidQCrashDropDuration(60), true);
  assert.equal(isValidQCrashDropDuration(60.01), false);
  assert.equal(isValidQCrashDropDuration(0), false);
  assert.equal(qCrashGenresMatch("K-Pop 韓式動感", "K-Pop 韓式動感"), true);
  assert.equal(qCrashGenresMatch("K-Pop 韓式動感", "Rap 街頭說唱"), false);
});

test("same creator can intentionally fill both Q Crash work seats", () => {
  assert.equal(
    canQCrashAccountJoin({
      status: "q_crash_pending_invite",
      founderUserId: "creator-a",
      viewerUserId: "creator-a",
      inviteExpiresAt: "2026-08-01T00:00:00.000Z",
      nowMs: Date.parse("2026-07-31T00:00:00.000Z"),
    }),
    true,
  );
});

test("targeted Q Crash invitation only allows the selected creator", () => {
  const base = {
    status: "q_crash_pending_invite",
    founderUserId: "creator-a",
    invitedUserId: "creator-b",
    inviteExpiresAt: "2026-08-01T00:00:00.000Z",
    nowMs: Date.parse("2026-07-31T00:00:00.000Z"),
  };
  assert.equal(canQCrashAccountJoin({ ...base, viewerUserId: "creator-b" }), true);
  assert.equal(canQCrashAccountJoin({ ...base, viewerUserId: "creator-c" }), false);
});

test("Q Crash vote eligibility requires login, excludes participants, blocks recasts, and trusts the deadline", () => {
  const base = {
    status: "q_crash_voting",
    votingEndsAt: "2026-07-31T02:00:00.000Z",
    fighterAUserId: "creator-a",
    fighterBUserId: "creator-b",
    nowMs: Date.parse("2026-07-31T01:00:00.000Z"),
  };
  assert.equal(canQCrashAccountVote({ ...base, viewerUserId: null }), false);
  assert.equal(canQCrashAccountVote({ ...base, viewerUserId: "creator-a" }), false);
  assert.equal(canQCrashAccountVote({ ...base, viewerUserId: "listener", alreadyVoted: true }), false);
  assert.equal(canQCrashAccountVote({ ...base, viewerUserId: "listener" }), true);
  assert.equal(
    canQCrashAccountVote({
      ...base,
      viewerUserId: "listener",
      nowMs: Date.parse("2026-07-31T02:00:00.000Z"),
    }),
    false,
  );
});

test("0, 1, and 2 listeners are insufficient; 3 establishes an official Q Crash", () => {
  assert.equal(Q_CRASH_OFFICIAL_AUDIENCE_MIN, 3);
  assert.equal(isQCrashOfficialAudienceCount(0), false);
  assert.equal(isQCrashOfficialAudienceCount(1), false);
  assert.equal(isQCrashOfficialAudienceCount(2), false);
  assert.equal(isQCrashOfficialAudienceCount(3), true);
});

test("Q Crash winner is work-side based and stable on an official tie", () => {
  assert.equal(pickQCrashWinner({ fighter_a: 3, fighter_b: 1 }, "q-crash-a"), "fighter_a");
  assert.equal(pickQCrashWinner({ fighter_a: 1, fighter_b: 3 }, "q-crash-b"), "fighter_b");
  assert.equal(pickQCrashWinner({ fighter_a: 0, fighter_b: 0 }, "q-crash-empty"), null);
  assert.equal(
    pickQCrashWinner({ fighter_a: 2, fighter_b: 2 }, "q-crash-tie"),
    pickQCrashWinner({ fighter_a: 2, fighter_b: 2 }, "q-crash-tie"),
  );
});

test("same-name works receive explicit version labels", () => {
  assert.deepEqual(qCrashVersionLabels("My Song", "my song"), { A: "版本 A", B: "版本 B" });
  assert.deepEqual(qCrashVersionLabels("Song One", "Song Two"), { A: "作品 A", B: "作品 B" });
});
