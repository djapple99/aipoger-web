import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migrationSource = source("../supabase/20260731_q_crash_async_drop_battle.sql");
const cardRouteSource = source("../src/app/api/q-crash/[id]/route.ts");
const voteRouteSource = source("../src/app/api/q-crash/[id]/vote/route.ts");
const guestVoteRouteSource = source("../src/app/api/battle-pool/guest-vote/route.ts");
const cancelCurrentRouteSource = source("../src/app/api/battle-pool/cancel-current/route.ts");
const settlementSource = source("../src/lib/server-q-crash.ts");
const fallbackSource = source("../src/app/api/battle-pool/process-fallbacks/route.ts");
const hookCutSource = source("../src/app/battle/hook-cut/page.tsx");
const cardClientSource = source("../src/components/q-crash-card-client.tsx");
const productRulesSource = source("../docs/aipoger-product-rules.md");

test("Q Crash migration seals votes and enforces 60-second Drops", () => {
  assert.ok(migrationSource.includes("drop_duration_seconds > 0 and drop_duration_seconds <= 60"));
  assert.ok(migrationSource.includes("q_crash_votes_one_account_per_battle unique (battle_id, user_id)"));
  assert.ok(migrationSource.includes("revoke all on table public.q_crash_votes from anon, authenticated"));
  assert.ok(migrationSource.includes("block_unsealed_q_crash_battle_votes"));
  assert.ok(migrationSource.includes("Q Crash votes must use the sealed server vote route"));
});

test("Q Crash API returns tallies only after the card reaches a final state", () => {
  assert.ok(
    cardRouteSource.includes(
      'const isFinal = card.status === "q_crash_finished" || card.status === "q_crash_insufficient";',
    ),
  );
  assert.match(cardRouteSource, /if \(isFinal && card\.battle_id\)[\s\S]*?from\("q_crash_votes"\)/);
  assert.match(cardRouteSource, /result: isFinal[\s\S]*?counts,[\s\S]*?audienceCount/);
  assert.equal(voteRouteSource.includes("counts:"), false);
  assert.ok(voteRouteSource.includes("結果將在截止後公開"));
  assert.ok(cardRouteSource.includes("battle?.audio_a_path || queueA.audio_path"));
  assert.ok(cardRouteSource.includes("battle?.audio_b_path || queueB.audio_path"));
});

test("Q Crash voting requires sign-in, excludes participants, and cannot be changed", () => {
  assert.ok(voteRouteSource.includes('if (!token) return jsonError("請先登入再投票。", 401)'));
  assert.ok(voteRouteSource.includes("作品持有人不能替自己的 Q Crash 投票"));
  assert.ok(voteRouteSource.includes("Q Crash 不提供改票"));
  assert.ok(guestVoteRouteSource.includes('battle.battle_type === "q_crash"'));
});

test("Q Crash settlement archives only official results and stores the winning work", () => {
  const insufficientIndex = settlementSource.indexOf("if (!isQCrashOfficialAudienceCount(audienceCount))");
  const archiveIndex = settlementSource.indexOf('admin.rpc("archive_battle_result"');
  assert.ok(insufficientIndex >= 0);
  assert.ok(archiveIndex > insufficientIndex);
  assert.ok(settlementSource.includes('status: "q_crash_insufficient"'));
  assert.ok(settlementSource.includes('status: "q_crash_finished"'));
  assert.ok(settlementSource.includes("winner_queue_id: winnerQueueId"));
  assert.ok(settlementSource.includes("不產生正式勝負、不進 Showtime"));
});

test("legacy live Drop Battle fallback cannot archive Q Crash through the old path", () => {
  assert.match(
    fallbackSource,
    /\.eq\("status", "finished"\)[\s\S]*?\.neq\("battle_type", "q_crash"\)[\s\S]*?\.is\("result_archived_at", null\)/,
  );
  assert.ok(fallbackSource.includes('settleQCrashBattle(admin, row.id'));
});

test("generic queue cancellation synchronizes pending Q Crash and protects started cards", () => {
  assert.ok(cancelCurrentRouteSource.includes('from("q_crash_cards")'));
  assert.ok(cancelCurrentRouteSource.includes("Q Crash 投票開始後不能取消"));
  assert.ok(cancelCurrentRouteSource.includes('status: "q_crash_cancelled"'));
});

test("Q Crash reuses the Drop cutter and keeps the sealed-vote presentation", () => {
  assert.ok(hookCutSource.includes("searchParams.get('qCrashCreate')"));
  assert.ok(hookCutSource.includes("searchParams.get('qCrashCardId')"));
  assert.ok(hookCutSource.includes("/api/q-crash/"));
  assert.ok(cardClientSource.includes("投票期間不顯示票數、百分比或領先作品"));
  assert.ok(cardClientSource.includes('className="fixed inset-x-3 bottom-3'));
  assert.ok(cardClientSource.includes("battleShortPath(payload.card.battleId, lang)"));
});

test("product rules lock the asynchronous Q Crash contract", () => {
  for (const phrase of [
    "Q Crash",
    "`30 minutes`, `2 hours` (default), `6 hours`, and `24 hours`",
    "At least 3 establishes an official Drop Battle result",
    "Work owners cannot vote",
    "No visitor, participant, or host may see counts",
    "does not open the live rematch window",
  ]) {
    assert.ok(productRulesSource.includes(phrase), `missing product rule: ${phrase}`);
  }
});
