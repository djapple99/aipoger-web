import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const migration = source("../supabase/20260802143000_battle_winner_release_links.sql");
const route = source("../src/app/api/battle/winner-release/route.ts");
const form = source("../src/components/battle-winner-release-link.tsx");
const hookCut = source("../src/app/battle/hook-cut/page.tsx");
const fullSongRoute = source("../src/app/api/honor-board/drop-full-songs/route.ts");
const results = source("../src/app/battle/results/results-client.tsx");
const rank = source("../src/app/rank/rank-client.tsx");
const productRules = source("../docs/aipoger-product-rules.md");
const releaseChecklist = source("../docs/aipoger-engineering.md");

test("winner release migration locks upload consent and protects creator release fields", () => {
  assert.ok(migration.includes("add column if not exists full_song_youtube_url text"));
  assert.ok(migration.includes("battle_queue_full_song_youtube_url_check"));
  assert.ok(migration.includes("trg_prevent_battle_queue_release_rewrite"));
  assert.ok(migration.includes("new.full_audio_public is distinct from old.full_audio_public"));
  assert.ok(migration.includes("new.full_song_youtube_url is distinct from old.full_song_youtube_url"));
  assert.ok(migration.includes("auth.role()"));
});

test("winner release API verifies an official result, winner ownership, and upload consent", () => {
  assert.ok(route.includes('from("battle_result_archives")'));
  assert.ok(route.includes("DROP_BATTLE_OFFICIAL_AUDIENCE_MIN"));
  assert.ok(route.includes("full_audio_public"));
  assert.ok(route.includes("winnerUserId === userId"));
  assert.ok(route.includes('battle.battle_type === "q_crash"'));
  assert.ok(route.includes("normalizeYouTubeUrl"));
  assert.ok(route.includes("full_song_youtube_url"));
  assert.ok(route.includes('update({ full_song_youtube_url: youtubeUrl })'));
});

test("new link entries confirm the selected public format, while legacy winner-release guards remain", () => {
  const form = readFileSync(new URL("../src/components/battle-link-submission.tsx", import.meta.url), "utf8");
  assert.ok(hookCut.includes('mode="drop"'));
  assert.ok(form.includes("confirmedRights: rights"));
  assert.ok(form.includes("consent to public playback in this format"));
  assert.equal(form.includes("audioBase64"), false);
});

test("Battle Records retain the creator-submitted MV link independently of monthly charts", () => {
  assert.ok(fullSongRoute.includes("full_song_youtube_url"));
  assert.ok(fullSongRoute.includes("youtubeUrl:"));
  assert.ok(results.includes("BattleWinnerReleaseLink"));
  assert.ok(results.includes("觀看勝出作品 MV"));
  assert.ok(rank.includes("PublicChoiceGallery"));
  assert.equal(rank.includes("MonthlyChart"), false);
  assert.equal(rank.includes("fetchBattleArchivesForRank"), false);
});

test("winner release rules and release checklist are documented", () => {
  assert.ok(productRules.includes("only the winning creator may submit or update a YouTube MV URL"));
  assert.ok(productRules.includes("upload-time full-song consent"));
  assert.ok(productRules.includes("only the winning creator may submit or update a YouTube MV URL"));
  assert.ok(releaseChecklist.includes("20260802143000_battle_winner_release_links.sql"));
  assert.ok(releaseChecklist.includes("only the winning creator can submit an HTTPS YouTube MV URL"));
});

test("winner release form is self-service and not an admin editor", () => {
  assert.ok(form.includes("Only you can submit or update this YouTube link."));
  assert.ok(form.includes("/api/battle/winner-release"));
  assert.ok(form.includes("Paste your YouTube MV link"));
  assert.ok(form.includes("onSaved"));
});
