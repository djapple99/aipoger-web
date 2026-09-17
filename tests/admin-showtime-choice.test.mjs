import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const showtimeAdminPage = readFileSync(new URL("../src/app/admin/showtime/page.tsx", import.meta.url), "utf8");
const showtimeAdminRoute = readFileSync(new URL("../src/app/api/admin/showtime/route.ts", import.meta.url), "utf8");
const playbackCatalog = readFileSync(new URL("../src/lib/server-creator-choice-catalog.ts", import.meta.url), "utf8");
const choiceAdminPage = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const choiceAdminRoute = readFileSync(new URL("../src/app/api/admin/choice/route.ts", import.meta.url), "utf8");
const choiceCurrentRoute = readFileSync(new URL("../src/app/api/choice/current/route.ts", import.meta.url), "utf8");
const creatorChoicePublicRoute = readFileSync(new URL("../src/app/api/creator-choice/public/route.ts", import.meta.url), "utf8");
const creatorChoiceRoute = readFileSync(new URL("../src/app/api/creator-choice/route.ts", import.meta.url), "utf8");
const creatorChoiceProfilePage = readFileSync(new URL("../src/app/profile/choice/page.tsx", import.meta.url), "utf8");
const choiceHelper = readFileSync(new URL("../src/lib/aipoger-choice.ts", import.meta.url), "utf8");
const choiceCatalog = readFileSync(new URL("../src/lib/server-choice-catalog.ts", import.meta.url), "utf8");
const rankPage = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
const publicGallery = readFileSync(new URL("../src/components/public-choice-gallery.tsx", import.meta.url), "utf8");
const showtimeChoiceShelf = readFileSync(
  new URL("../src/components/showtime-choice-shelf.tsx", import.meta.url),
  "utf8",
);
const choiceCover = readFileSync(new URL("../src/components/aipoger-choice-cover.tsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20260712072918_choice_weekly_curation.sql", import.meta.url), "utf8");
const coverMigration = readFileSync(new URL("../supabase/migrations/20260805190000_choice_collection_cover.sql", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("retired Showtime admin redirects to works management and cannot certify or mutate songs", () => {
  assert.match(showtimeAdminPage, /redirect\("\/admin\/listen-bar"\)/);
  assert.match(showtimeAdminRoute, /status: 410/);
  assert.match(showtimeAdminRoute, /status: 401/);
  assert.match(showtimeAdminRoute, /status: 403/);
  assert.match(showtimeAdminRoute, /isAdminEmail/);
  assert.match(showtimeAdminRoute, /choiceUrl: "\/admin\/choice"/);
  assert.doesNotMatch(showtimeAdminRoute, /\.update\(|\.insert\(|\.delete\(|certify_candidate/);
  assert.doesNotMatch(showtimeAdminPage, /runChoiceAction|certify_candidate|30 天/);
});

test("the independent Choice workbench retains selection, preview and publication controls", () => {
  assert.match(choiceAdminPage, /async function addChoiceItem/);
  assert.match(choiceAdminPage, /runAction\("remove_item"/);
  assert.match(choiceAdminPage, /runAction\("set_published"/);
  assert.match(choiceAdminPage, /choiceItemCountMessage/);
  assert.match(choiceAdminPage, /item.selectable/);
  assert.match(choiceAdminPage, /musicPlayer\?\.start/);
  assert.match(choiceAdminPage, /setPreviewTrack\(item\)/);
});

test("Choice persists human weekly selections with strict bounded publishing", () => {
  assert.ok(migration.includes("create table if not exists public.aipoger_choice_collections"));
  assert.ok(migration.includes("create table if not exists public.aipoger_choice_items"));
  assert.ok(migration.includes("enable row level security"));
  assert.ok(migration.includes("revoke all on table public.aipoger_choice_collections from anon, authenticated"));
  assert.ok(choiceHelper.includes("AIPOGER_CHOICE_MIN_ITEMS = 5"));
  assert.ok(choiceHelper.includes("AIPOGER_CHOICE_MAX_ITEMS = 10"));
  assert.ok(choiceAdminRoute.includes("Choice 發布需要 ${AIPOGER_CHOICE_MIN_ITEMS}-${AIPOGER_CHOICE_MAX_ITEMS} 首作品。"));
  assert.ok(choiceAdminRoute.includes("assertSelectableSource"));
  assert.ok(choiceAdminRoute.includes("!source?.isPublic || !source.selectable"));
  assert.ok(choiceAdminRoute.includes('action === "set_published"'));
  assert.ok(choiceAdminRoute.includes('action === "clear_cover"'));
  assert.ok(choiceAdminRoute.includes('action === "delete_collection"'));
  assert.ok(choiceAdminRoute.includes("confirmed !== true"));
  assert.ok(choiceAdminPage.includes("Choice 管理"));
  assert.ok(choiceAdminPage.includes("加入本週 Choice"));
  assert.ok(choiceAdminPage.includes("上傳封面"));
  assert.ok(coverMigration.includes("add column if not exists cover_path"));
});

test("Choice selection shows all public playable songs in the compact cover catalog", () => {
  assert.ok(choiceAdminPage.includes("item.isPublic && item.selectable"));
  assert.ok(choiceCatalog.includes("loadCreatorChoicePlaybackCatalog"));
  assert.doesNotMatch(choiceCatalog + choiceAdminPage, /isAipogerChoiceNewRelease|CHOICE 新選|30 天/);
  assert.ok(choiceAdminPage.includes("lg:grid-cols-6"));
  assert.ok(choiceAdminPage.includes("CHOICE_CATALOG_PER_PAGE = 24"));
  assert.ok(choiceAdminPage.includes("musicPlayer?.start"));
  assert.ok(choiceAdminPage.includes("setPreviewTrack(item)"));
  assert.ok(choiceHelper.includes("audioUrl: string | null"));
  assert.ok(playbackCatalog.includes("signedBattleAudioUrl"));
  assert.ok(playbackCatalog.includes("isPublicBarAirplayTrack"));
  assert.ok(playbackCatalog.includes("full_audio_public === true"));
});

test("Choice admin exposes a compact visual library for each weekly issue", () => {
  assert.ok(choiceAdminPage.includes("Choice Library"));
  assert.ok(choiceAdminPage.includes("歷期 Choice"));
  assert.ok(choiceAdminPage.includes("choiceThumb(collection)"));
  assert.ok(choiceAdminPage.includes("FilePlus2"));
  assert.ok(choiceAdminPage.includes("aria-pressed={active}"));
  assert.ok(choiceAdminPage.includes("entry.isPublished ? \"已發布\" : \"草稿\""));
  assert.ok(choiceAdminPage.includes("entry.itemCount"));
  assert.ok(choiceAdminPage.includes("創作者 Choice"));
  assert.ok(choiceAdminPage.includes("點擊小圖示就能進入編輯"));
  assert.ok(choiceAdminPage.includes("刪除這一期"));
  assert.ok(choiceAdminRoute.includes("aipoger_creator_choice_collections"));
  assert.ok(choiceAdminRoute.includes("choicePublicPath(row.id, \"creator\")"));
});

test("official Choice can create a draft from the first selected song", () => {
  assert.ok(choiceAdminPage.includes("async function ensureChoiceCollection"));
  assert.ok(choiceAdminPage.includes("async function addChoiceItem"));
  assert.ok(choiceAdminPage.includes("void addChoiceItem(item)"));
  assert.equal(choiceAdminPage.includes("disabled={!selected || added || busy !== \"\"}"), false);
  assert.match(choiceAdminPage, /const collectionId = await ensureChoiceCollection\(\)/);
});

test("published Choice reaches Showtime without becoming a ranking or social publisher", () => {
  assert.ok(choiceCurrentRoute.includes('.eq("is_published", true)'));
  assert.ok(choiceCurrentRoute.includes(".limit(80)"));
  assert.ok(choiceCurrentRoute.includes("collections"));
  assert.ok(rankPage.includes("PublicChoiceGallery"));
  assert.ok(publicGallery.includes("/api/choice/current"));
  assert.ok(showtimeChoiceShelf.includes('id="choice-weekly"'));
  assert.equal(choiceAdminRoute.includes("social_posts"), false);
  assert.equal(choiceAdminRoute.includes("publish_target"), false);
  assert.ok(productRules.includes("Choice 選曲不會建立社群草稿或自動外部發布"));
});

test("published Creator Choice keeps history and supports a dedicated cover", () => {
  assert.equal(creatorChoicePublicRoute.includes("latestByCreator"), false);
  assert.ok(creatorChoicePublicRoute.includes('.eq("is_published", true)'));
  assert.ok(creatorChoicePublicRoute.includes(".limit(48)"));
  assert.ok(creatorChoicePublicRoute.includes("cover_path"));
  assert.ok(creatorChoiceRoute.includes('action === "clear_cover"'));
  assert.ok(creatorChoiceRoute.includes("export async function POST"));
  assert.ok(creatorChoiceRoute.includes("Choice 封面欄位尚未準備完成"));
  assert.match(creatorChoiceProfilePage, /type="file"/);
  assert.match(creatorChoiceProfilePage, /copy.removeCover/);
  assert.match(creatorChoiceProfilePage, /accept="image\/jpeg,image\/png,image\/webp,image\/gif"/);
});

test("profile exposes dedicated owner entry points for works and Choice", () => {
  assert.ok(profilePage.includes('href="/admin/listen-bar"'));
  assert.ok(profilePage.includes('href="/admin/choice"'));
});

test("Choice history opens creator editing and supports confirmed deletion", () => {
  const creatorChoiceRoute = readFileSync(new URL("../src/app/api/creator-choice/route.ts", import.meta.url), "utf8");
  const creatorChoiceProfile = readFileSync(new URL("../src/app/profile/choice/page.tsx", import.meta.url), "utf8");
  assert.ok(creatorChoiceRoute.includes('action === "delete_collection"'));
  assert.ok(creatorChoiceRoute.includes("confirmed !== true"));
  assert.match(creatorChoiceProfile, /collections.map/);
  assert.ok(creatorChoiceProfile.includes("delete_collection"));
  assert.match(creatorChoiceProfile, /window.confirm\(copy.confirmDelete/);
  assert.ok(creatorChoiceProfile.includes("searchParams.get(\"collection\")"));
});

test("Choice covers carry a clear AIPOGER mark in the top-left corner", () => {
  assert.ok(choiceCover.includes("AIPOGER_CHOICE_LOGO"));
  assert.ok(choiceCover.includes("absolute left-2 top-2"));
  assert.ok(choiceCover.includes("drop-shadow"));
  assert.equal(choiceCover.includes("bg-black"), false);
  assert.equal(choiceCover.includes("border-white"), false);
  assert.ok(showtimeChoiceShelf.includes("AipogerChoiceCover"));
  assert.ok(choiceAdminPage.includes("AipogerChoiceCover"));
  assert.ok(creatorChoiceProfilePage.includes("AipogerChoiceCover"));
});
