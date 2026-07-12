import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const showtimeAdminPage = readFileSync(new URL("../src/app/admin/showtime/page.tsx", import.meta.url), "utf8");
const showtimeAdminRoute = readFileSync(new URL("../src/app/api/admin/showtime/route.ts", import.meta.url), "utf8");
const choiceAdminPage = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const choiceAdminRoute = readFileSync(new URL("../src/app/api/admin/choice/route.ts", import.meta.url), "utf8");
const choiceCurrentRoute = readFileSync(new URL("../src/app/api/choice/current/route.ts", import.meta.url), "utf8");
const choiceHelper = readFileSync(new URL("../src/lib/aipoger-choice.ts", import.meta.url), "utf8");
const rankPage = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260712071102_choice_weekly_curation.sql", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("Showtime admin manages certification and display only", () => {
  assert.ok(showtimeAdminPage.includes("Showtime 管理"));
  assert.ok(showtimeAdminPage.includes("SHOWTIME_PER_PAGE = 10"));
  assert.ok(showtimeAdminRoute.includes('type ShowtimeAction = "certify_track" | "hide_track" | "restore_track" | "hide_archive" | "restore_archive"'));
  assert.ok(showtimeAdminRoute.includes('ai_music_challenge_status: "showcase"'));
  assert.ok(showtimeAdminRoute.includes('ai_music_showtime_certification_source: "airplay"'));
  assert.equal(showtimeAdminRoute.includes("audio_path:"), false);
  assert.equal(showtimeAdminRoute.includes("heart_count:"), false);
  assert.equal(showtimeAdminRoute.includes("final_vote_left:"), false);
});

test("Choice persists human weekly selections with strict bounded publishing", () => {
  assert.ok(migration.includes("create table if not exists public.aipoger_choice_collections"));
  assert.ok(migration.includes("create table if not exists public.aipoger_choice_items"));
  assert.ok(migration.includes("enable row level security"));
  assert.ok(migration.includes("revoke all on table public.aipoger_choice_collections from anon, authenticated"));
  assert.ok(choiceHelper.includes("AIPOGER_CHOICE_MIN_ITEMS = 5"));
  assert.ok(choiceHelper.includes("AIPOGER_CHOICE_MAX_ITEMS = 10"));
  assert.ok(choiceAdminRoute.includes("Choice 發布需要 ${AIPOGER_CHOICE_MIN_ITEMS}-${AIPOGER_CHOICE_MAX_ITEMS} 首 Showtime 作品。"));
  assert.ok(choiceAdminRoute.includes("assertSelectableSource"));
  assert.ok(choiceAdminRoute.includes('action === "set_published"'));
  assert.ok(choiceAdminPage.includes("Choice 管理"));
  assert.ok(choiceAdminPage.includes("加入本週 Choice"));
});

test("published Choice reaches Showtime without becoming a ranking or social publisher", () => {
  assert.ok(choiceCurrentRoute.includes('.eq("is_published", true)'));
  assert.ok(rankPage.includes("fetchCurrentChoice"));
  assert.ok(rankPage.includes("choiceCollection?.items.length"));
  assert.ok(rankPage.includes('id="choice-weekly"'));
  assert.equal(choiceAdminRoute.includes("social_posts"), false);
  assert.equal(choiceAdminRoute.includes("publish_target"), false);
  assert.ok(productRules.includes("Choice 選曲不會建立社群草稿或自動外部發布"));
});

test("profile exposes dedicated owner entry points for Showtime and Choice", () => {
  assert.ok(profilePage.includes('href="/admin/showtime"'));
  assert.ok(profilePage.includes('href="/admin/choice"'));
});
