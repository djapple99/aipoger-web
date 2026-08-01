import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../supabase/20260801070000_q_crash_post_result_preferences.sql");
const route = source("../src/app/api/q-crash/[id]/post-result-preference/route.ts");
const card = source("../src/components/q-crash-card-client.tsx");
const records = source("../src/app/battle/results/results-client.tsx");
const normalResult = source("../src/app/battle/result/battle-result-client.tsx");

test("post-result Q Crash preference is separate, authenticated, and changeable", () => {
  assert.match(migration, /q_crash_post_result_preferences/);
  assert.match(migration, /unique \(battle_id, user_id\)/);
  assert.match(migration, /target_status <> 'q_crash_finished'/);
  assert.match(migration, /work owners cannot submit post-result preferences/i);
  assert.match(route, /請先登入再留下結算後喜好/);
  assert.match(route, /onConflict: "battle_id,user_id"/);
  assert.match(route, /preferred_side/);
  assert.match(card, /結果公布後，你比較喜歡哪首/);
  assert.match(card, /不會改變正式勝負、票數或五角評分/);
  assert.match(card, /post-result-preference/);
});

test("Battle Records surfaces Q Crash separately and hides unmarked legacy archives", () => {
  assert.match(records, /Q Crash 戰報/);
  assert.match(records, /record\.mode === "q_crash"/);
  assert.match(records, /record\.publicVisible/);
  assert.match(records, /record\.audienceCount >= DROP_BATTLE_OFFICIAL_AUDIENCE_MIN/);
  assert.match(records, /battleShortPath/);
  assert.match(normalResult, /source: "drop_battle"/);
});
