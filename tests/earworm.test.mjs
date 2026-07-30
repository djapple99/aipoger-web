import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  EARWORM_MIN_LISTEN_SECONDS,
  EARWORM_TRACK_COUNT,
  calculateEarwormResult,
  earwormQuizKey,
  isEarwormReaction,
} from "../src/lib/earworm.ts";
import {
  EARWORM_AFFINITY_MIN_SAMPLES,
  calculateEarwormAffinityPercent,
  publicEarwormAffinity,
} from "../src/lib/earworm-affinity.ts";
import {
  EARWORM_PROFILE_PROMPT_FRESH_MS,
  EARWORM_PROMPT_SKIP_MS,
  buildEarwormLocalProfile,
  parseEarwormLocalProfile,
  shouldPromptForEarworm,
} from "../src/lib/earworm-profile.ts";

test("耳朵蟲 is a ten-track personality test without a point dependency", () => {
  assert.equal(EARWORM_TRACK_COUNT, 10);
  assert.equal(EARWORM_MIN_LISTEN_SECONDS, 0);
  assert.equal(isEarwormReaction("love"), true);
  assert.equal(isEarwormReaction("replay"), true);
  assert.equal(isEarwormReaction("okay"), true);
  assert.equal(isEarwormReaction("pass"), true);
  assert.equal(isEarwormReaction("a"), false);
});

test("耳朵蟲 quiz keys preserve the ten-track session order", () => {
  const ids = Array.from({ length: 10 }, (_, index) => `track-${index + 1}`);
  assert.equal(earwormQuizKey(ids), `earworm-quiz:${ids.join(":")}`);
  assert.notEqual(earwormQuizKey(ids), earwormQuizKey([...ids].reverse()));
});

test("耳朵蟲 result normalizes repeated genre exposure and returns two nearby types", () => {
  const result = calculateEarwormResult([
    { trackId: "1", genre: "R&B 深情瞬間", reaction: "love", listenedSeconds: 8 },
    { trackId: "2", genre: "R&B 深情瞬間", reaction: "love", listenedSeconds: 8 },
    { trackId: "3", genre: "Jazz / Bossa 微醺時刻", reaction: "replay", listenedSeconds: 8 },
    { trackId: "4", genre: "EDM 百大電音", reaction: "okay", listenedSeconds: 8 },
  ]);
  assert.equal(result.primaryGenre, "R&B 深情瞬間");
  assert.deepEqual(result.secondaryGenres, ["Jazz / Bossa 微醺時刻", "EDM 百大電音"]);
  assert.equal(result.scores["R&B 深情瞬間"], 100);
  assert.equal(result.scores["Jazz / Bossa 微醺時刻"], 75);
  assert.equal(result.signal, "strong");
});

test("耳朵蟲 personality migration is reward-free and server-only", async () => {
  const migration = await readFile(new URL("../supabase/20260723_earworm_personality_quiz.sql", import.meta.url), "utf8");
  assert.match(migration, /create table if not exists public\.earworm_personality_results/);
  assert.match(migration, /cardinality\(track_ids\) = 10/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /grant all on table public\.earworm_personality_results to service_role/);
  assert.doesNotMatch(migration, /reward_points|reward_day|award_battle_points|APC/i);
  assert.doesNotMatch(migration, /drop table|truncate|delete from/i);
});

test("好感度 uses the 4/3/1/0 scale and hides small public samples", () => {
  assert.equal(EARWORM_AFFINITY_MIN_SAMPLES, 20);
  assert.equal(calculateEarwormAffinityPercent([4, 3, 1, 0]), 50);
  assert.deepEqual(publicEarwormAffinity(19, 88), { sampleCount: 19, percent: null });
  assert.deepEqual(publicEarwormAffinity(20, 88), { sampleCount: 20, percent: 88 });
});

test("好感度 UI stays public and does not expose per-song personal reactions", async () => {
  const explore = await readFile(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
  const listenBar = await readFile(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");

  assert.match(explore, /好感度累積中/);
  assert.match(explore, /AudioLines/);
  assert.doesNotMatch(explore, /catalogLabel=\{localeText\(lang, "命中"/);
  assert.doesNotMatch(explore, /你的反應：/);
  assert.doesNotMatch(explore, /盲聽好感/);
  assert.match(listenBar, /好感度累積中/);
  assert.match(listenBar, /AudioLines/);
  assert.doesNotMatch(listenBar, /你的反應：/);
  assert.doesNotMatch(listenBar, /盲聽好感/);
});

test("Explore prompt respects recent completion, skip, and deep-link intent", () => {
  const now = Date.UTC(2026, 6, 22);
  const answers = Array.from({ length: 10 }, (_, index) => ({
    trackId: `track-${index + 1}`,
    genre: "R&B 深情瞬間",
    reaction: index === 0 ? "love" : "okay",
    listenedSeconds: 8,
  }));
  const result = calculateEarwormResult(answers);
  const profile = buildEarwormLocalProfile(result, now - 1000);
  assert.ok(parseEarwormLocalProfile(profile));
  assert.equal("reactions" in profile, false);
  const legacyProfile = parseEarwormLocalProfile({ ...profile, version: 1, reactions: answers });
  assert.equal(legacyProfile?.version, 2);
  assert.equal("reactions" in legacyProfile, false);
  assert.equal(shouldPromptForEarworm({ profile: null, skippedAt: null, search: "?lang=zh", hash: "", now }), true);
  assert.equal(shouldPromptForEarworm({ profile, skippedAt: null, search: "?lang=zh", hash: "", now }), false);
  assert.equal(shouldPromptForEarworm({ profile: null, skippedAt: now - EARWORM_PROMPT_SKIP_MS + 1000, search: "", hash: "", now }), false);
  assert.equal(shouldPromptForEarworm({ profile: null, skippedAt: null, search: "?track=abc", hash: "#works", now }), false);
  assert.equal(shouldPromptForEarworm({ profile: { ...profile, completedAt: now - EARWORM_PROFILE_PROMPT_FRESH_MS - 1 }, skippedAt: null, search: "", hash: "", now }), true);
});

test("耳朵蟲 affinity migration is additive, account-distinct, and APC-free", async () => {
  const migration = await readFile(new URL("../supabase/20260724_earworm_affinity_signals.sql", import.meta.url), "utf8");
  assert.match(migration, /create table if not exists public\.earworm_track_reactions/);
  assert.match(migration, /unique \(user_id, track_id\)/);
  assert.match(migration, /count\(distinct user_id\)/);
  assert.match(migration, /security_invoker = true/);
  assert.match(migration, /grant select on table public\.earworm_track_affinity_stats to service_role/);
  assert.doesNotMatch(migration, /reward_points|reward_day|award_battle_points|APC/i);
  assert.doesNotMatch(migration, /drop table|truncate|delete from/i);
});

test("耳朵蟲 supports instant reactions, automatic playback, and a clear Explore result action", async () => {
  const client = await readFile(new URL("../src/app/earworm/earworm-client.tsx", import.meta.url), "utf8");
  const instantMigration = await readFile(new URL("../supabase/20260725_earworm_instant_reactions.sql", import.meta.url), "utf8");

  assert.match(client, /autoPlay/);
  assert.match(client, /AUTO PLAY/);
  assert.match(client, /width=\{146\} height=\{146\} className="earworm-logo"/);
  assert.match(client, /第一耳就能選，選完自動播下一首/);
  assert.match(client, /不喜歡就<\/small>下一首/);
  assert.match(client, /去探索音樂/);
  assert.match(client, /去傷心酒吧/);
  assert.doesNotMatch(client, /結果已保存到你的帳號/);
  assert.doesNotMatch(client, />結果已保存</);
  assert.doesNotMatch(client, /登入保存結果/);
  assert.ok(client.indexOf("去探索音樂") < client.indexOf("去傷心酒吧"));
  assert.ok(client.indexOf("去傷心酒吧") < client.indexOf("看看為我挑的歌"));
  assert.ok(client.indexOf("看看為我挑的歌") < client.indexOf("分享我的耳朵類型"));
  assert.ok(client.indexOf("分享我的耳朵類型") < client.indexOf("重新測一次"));
  assert.match(instantMigration, /listened_seconds >= 0/);
  assert.doesNotMatch(instantMigration, /drop table|truncate|delete from/i);
});
