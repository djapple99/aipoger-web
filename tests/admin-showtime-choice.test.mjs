import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const showtimeAdminPage = readFileSync(new URL("../src/app/admin/showtime/page.tsx", import.meta.url), "utf8");
const showtimeAdminRoute = readFileSync(new URL("../src/app/api/admin/showtime/route.ts", import.meta.url), "utf8");
const showtimeCatalog = readFileSync(new URL("../src/lib/server-showtime-catalog.ts", import.meta.url), "utf8");
const choiceAdminPage = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const choiceAdminRoute = readFileSync(new URL("../src/app/api/admin/choice/route.ts", import.meta.url), "utf8");
const choiceCurrentRoute = readFileSync(new URL("../src/app/api/choice/current/route.ts", import.meta.url), "utf8");
const choiceHelper = readFileSync(new URL("../src/lib/aipoger-choice.ts", import.meta.url), "utf8");
const rankPage = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260712072918_choice_weekly_curation.sql", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("Showtime admin uses a current public six-cover catalog with display-only editing", () => {
  assert.ok(showtimeAdminPage.includes("Showtime 管理"));
  assert.ok(showtimeAdminPage.includes("SHOWTIME_PER_PAGE = 12"));
  assert.ok(showtimeAdminPage.includes("xl:grid-cols-6"));
  assert.ok(showtimeAdminPage.includes("編輯資料"));
  assert.ok(showtimeAdminPage.includes("Showtime 評語／作品介紹"));
  assert.ok(showtimeAdminPage.includes("textarea value={editForm.description}"));
  assert.ok(showtimeAdminRoute.includes("update_track_metadata"));
  assert.ok(showtimeAdminRoute.includes("uploadTrackCover"));
  assert.ok(showtimeAdminRoute.includes('ai_music_challenge_status: "showcase"'));
  assert.ok(showtimeCatalog.includes("Boolean(row.ai_music_showtime_certified) && isAiMusicShowtimePubliclyVisible(row)"));
  assert.ok(showtimeCatalog.includes("entry.item?.isPublic && entry.item.selectable"));
  assert.equal(showtimeCatalog.includes("isShowtimeTrackCertificationCandidate"), false);
  assert.equal(showtimeAdminPage.includes("公播候選"), false);
  assert.equal(showtimeAdminPage.includes("certify_track"), false);
  assert.equal(showtimeAdminRoute.includes("certify_track"), false);
  assert.ok(showtimeAdminRoute.includes('body.action !== "hide_archive"'));
  assert.equal(showtimeAdminRoute.includes("audio_path:"), false);
  assert.equal(showtimeAdminRoute.includes("heart_count:"), false);
  assert.equal(showtimeAdminRoute.includes("final_vote_left:"), false);
});

test("Showtime catalog can curate and publish the current Choice in place", () => {
  assert.ok(showtimeAdminPage.includes("編輯本期 Choice"));
  assert.ok(showtimeAdminPage.includes("勾選 Showtime 作品，組成本期 Choice"));
  assert.ok(showtimeAdminPage.includes('runChoiceAction("add_item"'));
  assert.ok(showtimeAdminPage.includes('runChoiceAction("remove_item"'));
  assert.ok(showtimeAdminPage.includes('runChoiceAction("set_published"'));
  assert.ok(showtimeAdminPage.includes("choiceItemCountMessage"));
  assert.ok(showtimeAdminPage.includes("item.selectable"));
  assert.ok(showtimeAdminPage.includes("ChoicePreviewPlayer"));
  assert.ok(showtimeAdminPage.includes("setPreviewTrack(item)"));
  assert.ok(showtimeAdminPage.includes("封面右下播放鈕可先試聽，再勾選。"));
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
  assert.ok(choiceAdminRoute.includes("!source?.isPublic || !source.selectable"));
  assert.ok(choiceAdminRoute.includes('action === "set_published"'));
  assert.ok(choiceAdminPage.includes("Choice 管理"));
  assert.ok(choiceAdminPage.includes("加入本週 Choice"));
});

test("Choice selection shows only currently public Showtime works in a compact cover catalog", () => {
  assert.ok(choiceAdminPage.includes("item.isPublic && item.selectable"));
  assert.ok(choiceAdminPage.includes("只顯示目前仍在 Showtime 公開展示中的認證作品；左下播放鈕可直接試聽，尚未建立草稿時，按＋會自動建立本週草稿。"));
  assert.ok(choiceAdminPage.includes("lg:grid-cols-6"));
  assert.ok(choiceAdminPage.includes("CHOICE_CATALOG_PER_PAGE = 24"));
  assert.ok(choiceAdminPage.includes("ChoicePreviewPlayer"));
  assert.ok(choiceAdminPage.includes("setPreviewTrack(item)"));
  assert.ok(choiceAdminPage.includes("左下播放鈕可直接試聽"));
  assert.ok(choiceHelper.includes("audioUrl: string | null"));
  assert.ok(showtimeCatalog.includes("signedBattleAudioUrl"));
  assert.ok(showtimeCatalog.includes("audioUrl: audioUrl(admin, row.audio_path)"));
});

test("official Choice can create a draft from the first selected song", () => {
  assert.ok(choiceAdminPage.includes("async function ensureChoiceCollection"));
  assert.ok(choiceAdminPage.includes("async function addChoiceItem"));
  assert.ok(choiceAdminPage.includes("void addChoiceItem(item)"));
  assert.equal(choiceAdminPage.includes("disabled={!selected || added || busy !== \"\"}"), false);
  assert.ok(choiceAdminPage.includes("按＋會自動建立本週草稿"));
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
