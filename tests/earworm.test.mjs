import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EARWORM_MIN_LISTEN_SECONDS,
  EARWORM_REWARD_POINTS,
  earwormTaskKey,
  isEarwormSelection,
} from "../src/lib/earworm.ts";

test("耳朵蟲 keeps the listening gate and APC reward explicit", () => {
  assert.equal(EARWORM_MIN_LISTEN_SECONDS, 8);
  assert.equal(EARWORM_REWARD_POINTS, 5);
  assert.equal(isEarwormSelection("a"), true);
  assert.equal(isEarwormSelection("b"), true);
  assert.equal(isEarwormSelection("neither"), true);
  assert.equal(isEarwormSelection("tie"), false);
});

test("耳朵蟲 task keys are directional and independent from Battle records", () => {
  assert.equal(earwormTaskKey("Rap 街頭說唱", "track-a", "track-b"), "earworm:Rap 街頭說唱:track-a:track-b");
  assert.notEqual(
    earwormTaskKey("Rap 街頭說唱", "track-a", "track-b"),
    earwormTaskKey("Rap 街頭說唱", "track-b", "track-a"),
  );
});

test("耳朵蟲 migration is isolated, repeat-safe, and service-role mediated", async () => {
  const migration = await readFile(new URL("../supabase/20260722_earworm_game.sql", import.meta.url), "utf8");
  assert.match(migration, /create table if not exists public\.earworm_votes/);
  assert.match(migration, /unique \(user_id, task_key\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /grant all on table public\.earworm_votes to service_role/);
  assert.match(migration, /award_battle_points\(\)/);
});
