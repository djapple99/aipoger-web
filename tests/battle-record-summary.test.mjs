import assert from "node:assert/strict";
import test from "node:test";
import { monthlyBattleSummary, leadingVoteShare } from "../src/lib/battle-record-summary.ts";

const row = (id, mode, archivedAt, votesTotal = 7, audienceCount = 7) => ({ id, mode, archivedAt, votesTotal, audienceCount });

test("month selection keeps Q Crash, Drop, and summary totals in the same scope", () => {
  const records = [row("old", "q_crash", "2026-07-15T12:00:00"), row("q", "q_crash", "2026-08-03T12:00:00"), row("d", "drop_battle", "2026-08-04T12:00:00", 5, 3)];
  const august = monthlyBattleSummary(records, "2026-08");
  assert.deepEqual(august.qCrashRecords.map(r => r.id), ["q"]);
  assert.deepEqual(august.dropMonthRecords.map(r => r.id), ["d"]);
  assert.equal(august.monthRecords.length, 2);
  assert.equal(august.totalVotes, 12);
  assert.equal(august.totalAudience, 10); // Additive voter entries, not unique people across battles.
  assert.deepEqual(monthlyBattleSummary(records, "2026-07").qCrashRecords.map(r => r.id), ["old"]);
  assert.equal(monthlyBattleSummary(records, "2026-09").monthRecords.length, 0);
});

test("all monthly Q Crash records are retained beyond the old 12-card cap", () => {
  const records = Array.from({ length: 13 }, (_, i) => row(String(i), "q_crash", "2026-08-03T12:00:00"));
  const result = monthlyBattleSummary(records, "2026-08");
  assert.equal(result.qCrashRecords.length, 13);
  assert.equal(result.totalVotes, 91);
  assert.equal(records.length, 13);
});

test("single-battle vote share uses actual side votes, including ties and missing splits", () => {
  assert.equal(leadingVoteShare(4, 3), 57);
  assert.equal(leadingVoteShare(3, 4), 57);
  assert.equal(leadingVoteShare(3, 3), 50);
  assert.equal(leadingVoteShare(3, 0), 100);
  assert.equal(leadingVoteShare(0, 0), null);
});
