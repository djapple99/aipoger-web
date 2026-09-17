import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const rank = readSource("../src/app/rank/page.tsx");
const gallery = readSource("../src/components/public-choice-gallery.tsx");
const chart = readSource("../src/components/monthly-chart.tsx");
const shelf = readSource("../src/components/showtime-choice-shelf.tsx");
const player = readSource("../src/components/global-music-player.tsx");
const adapter = readSource("../src/components/showtime-queue-player.tsx");
const creatorApi = readSource("../src/app/api/creator-choice/public/route.ts");
const officialApi = readSource("../src/app/api/choice/current/route.ts");
const interactions = readSource("../src/app/api/choice/interactions/route.ts");
const heartMigration = readSource("../supabase/migrations/20260715083000_choice_collection_hearts.sql");
const identityMigration = readSource("../supabase/migrations/20260715085800_choice_curator_identity.sql");
const rules = readSource("../docs/aipoger-product-rules.md");
const experience = readSource("../docs/aipoger-experience.md");
const model = readSource("../src/lib/aipoger-choice.ts");
const adminApi = readSource("../src/app/api/admin/choice/route.ts");

test("Showtime mounts Choice and charts together with responsive editorial regions", () => {
  assert.match(rank, /<PublicChoiceGallery lang=\{lang\} chart=\{<MonthlyChart lang=\{lang\}/);
  assert.doesNotMatch(rank, /role="tablist"|role="tab"|role="tabpanel"|changeView/);
  assert.match(shelf, /lg:grid-cols-\[minmax\(0,2\.2fr\)_minmax\(320px,1fr\)\]/);
  assert.ok(shelf.indexOf('data-choice-lead') < shelf.indexOf('data-showtime-chart'));
  assert.ok(shelf.indexOf('data-showtime-chart') < shelf.indexOf('data-choice-more'));
  for (const label of ["Monthly Charts", "月排行榜", "月間ランキング", "월간 차트"]) assert.ok(chart.includes(label), label);
});

test("legacy anchors remain native scroll targets and the single CTA retains language", () => {
  assert.match(shelf, /id="choice-weekly"/);
  assert.match(chart, /id="monthly-charts"/);
  assert.match(rank, /\/profile\/choice\?lang=\$\{lang\}/);
  assert.match(rank, /<ListPlus/);
  assert.doesNotMatch(shelf, /\/profile\/choice/);
});

test("certification catalog is intentionally retired rather than moved into the gallery", () => {
  for (const source of [rank, gallery, chart]) {
    assert.doesNotMatch(source, /rank_all_certified_works|CERTIFIED MUSIC CATALOG|certificationLabel/);
    assert.doesNotMatch(source, /正式 Battle 認證|探索守擂認證|傷心酒吧公播認證/);
    assert.doesNotMatch(source, /surface=showtime|fetchDropFullSongMap|battle_result_archives/);
    assert.doesNotMatch(source, /battleRows|hotBarRows|ARCHIVE_SELECT_BASE|BoardKey|BOARD_META/);
  }
  assert.doesNotMatch(rank, /fetch\(|supabase|<ShowtimeChoiceShelf/);
  assert.doesNotMatch(gallery, /\.from\(|\/api\/charts\/monthly|\/api\/ai-music\/tracks|\/api\/showtime/);
  assert.match(chart, /\/api\/charts\/monthly/);
  assert.match(gallery, /\/api\/choice\/current/);
  assert.match(gallery, /\/api\/creator-choice\/public/);
});

test("Choice remains non-ranked with real square covers and owner-selected lead", () => {
  assert.match(gallery, /<ShowtimeChoiceShelf/);
  assert.match(shelf, /recordKey\(entry\) === featuredKey/);
  assert.match(shelf, /aspect-square/);
  assert.match(shelf, /grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4/);
  for (const retained of ["entry.coverUrl", "entry.intro", "ChoiceCommentsDialog", "<ShareButton", "onToggleHeart(entry)", "onPlay(entry)"]) {
    assert.ok(shelf.includes(retained), retained);
  }
  assert.doesNotMatch(shelf, /CURATOR SETS|由創作者選出他們心目中的歌單/);
  assert.doesNotMatch(gallery, /supporterCount|monthlyRank|\.sort\(/);
});

test("official and personal Choice covers keep persisted identity and authored titles", () => {
  assert.match(officialApi, /created_by/);
  assert.match(officialApi, /curator_identity/);
  assert.match(officialApi, /identity === "personal"/);
  assert.match(officialApi, /from\("fighter_profiles"\)/);
  assert.match(officialApi, /display_name,avatar_url/);
  assert.match(gallery, /curatorName: collection\.curatorName \|\| "AIPOGER"/);
  assert.match(gallery, /collection\.coverUrl\?\.trim\(\) \|\| \(collection\.curatorIdentity === "personal"/);
  assert.match(gallery, /collection\.avatarUrl\?\.trim\(\) \|\| AIPOGER_BRAND_LOGO : AIPOGER_BRAND_LOGO/);
  assert.match(gallery, /choiceDisplayTitle\(collection\.curatorName, collection\.title\)/);
  assert.match(gallery, /choicePublicPath\(collection\.id, "official"\)/);
  assert.match(adminApi, /row.curator_identity === "personal"/);
  assert.doesNotMatch(adminApi, /curator_identity: curatorIdentity\(body\?\.curatorIdentity\)/);
  assert.ok(identityMigration.includes("curator_identity in ('official', 'personal')"));
});

test("creator Choice preserves cover fallback and public playback independent of private favorites", () => {
  assert.match(gallery, /kind: "creator" as const/);
  assert.match(gallery, /collection\.coverUrl\?\.trim\(\) \|\| collection\.avatarUrl\?\.trim\(\) \|\| AIPOGER_BRAND_LOGO/);
  assert.match(gallery, /choicePublicPath\(collection\.id, "creator"\)/);
  assert.match(creatorApi, /publicCoverUrl\(admin, row\.cover_path\)/);
  assert.match(creatorApi, /fighter_profiles/);
  assert.match(creatorApi, /user_profiles/);
  assert.match(creatorApi, /\.eq\("is_published", true\)/);
  assert.match(creatorApi, /\.limit\(48\)/);
  assert.match(creatorApi, /source\?\.isPublic/);
  assert.match(creatorApi, /loadCreatorChoicePlaybackCatalog\(admin\)/);
  assert.doesNotMatch(creatorApi, /latestByCreator|loadCreatorChoiceSelectionCatalog|isAipogerChoiceNewRelease/);
});

test("Choice tracklist HUD retains order preview, song favorites, individual playback and Play All", () => {
  for (const retained of [
    "TracklistPreview", "group-hover/tracklist:visible", "setDetail(entry)", "createPortal((",
    "document.body", "choiceDateLabel(entry.weekStart, lang)", "choiceItemRecordKey(item)",
    "onToggleItemHeart(item)", "onPlay(detail, item.itemId)", "onPlay(detail)", "copy.openSharePage",
  ]) assert.ok(shelf.includes(retained), retained);
  assert.match(shelf, /aria-label=\{copy\.playAll\}/);
  assert.match(shelf, /aria-pressed=\{itemHeart\.myHeart\}/);
});

test("public Choice retains long articles without hiding HUD controls or share actions", () => {
  assert.match(model, /AIPOGER_CHOICE_INTRO_MAX_LENGTH = 3000/);
  assert.match(shelf, /detail\.intro/);
  assert.match(shelf, /max-h-24 overflow-y-auto break-words/);
  assert.match(shelf, /min-h-0 max-h-\[58vh\] overflow-y-auto/);
  assert.match(shelf, /<footer className="flex shrink-0 flex-wrap/);
  assert.match(shelf, /role="alert"/);
  assert.match(shelf, /iconOnly/);
});

test("collection saves and HUD favorites remain independent from monthly song Heart scoring", () => {
  assert.match(gallery, /\/api\/choice\/interactions/);
  assert.match(gallery, /action: scope\.hearts\[key\]\?\.myHeart \? "remove_heart" : "heart"/);
  assert.match(gallery, /collectionKind: entry\.kind, collectionId: entry\.id/);
  assert.match(gallery, /\/api\/honor-board\/interactions/);
  assert.match(gallery, /action: "favorite", recordKey: key/);
  assert.match(gallery, /favoriteCount/);
  assert.match(gallery, /myFavorited/);
  assert.doesNotMatch(gallery, /\/api\/listen-bar\/reaction|aipoger:music-heart/);
  assert.match(chart, /\/api\/listen-bar\/reaction/);
  assert.doesNotMatch(chart, /\/api\/choice\/interactions|\/api\/honor-board\/interactions/);
  assert.match(interactions, /aipoger_choice_collection_hearts/);
  assert.ok(interactions.includes('.eq("is_published", true)'));
  assert.ok(interactions.includes('action === "heart" || body?.action === "remove_heart"'));
  assert.match(heartMigration, /create table if not exists public\.aipoger_choice_collection_hearts/);
  assert.match(heartMigration, /enable row level security/);
  assert.match(heartMigration, /revoke all on table public\.aipoger_choice_collection_hearts from anon, authenticated/);
});

test("charts and Choice share the existing global sequential bottom player with mobile volume", () => {
  assert.match(gallery, /<ShowtimeQueuePlayer ref=\{playerRef\}/);
  assert.match(gallery, /playerRef\.current\?\.start\(tracks, index/);
  assert.match(adapter, /musicPlayer\?\.start\(\.\.\.args\)/);
  assert.match(adapter, /return null/);
  assert.match(chart, /musicPlayer\?\.start\(queue, index/);
  assert.doesNotMatch(gallery, /<audio|new Audio|\.close\(/);
  assert.doesNotMatch(chart, /<audio|new Audio/);
  for (const retained of ["data-showtime-queue-player", "onEnded", "registerMusicPlayer", "await audio.play()", "nextMusicIndex", "lg:hidden"]) {
    assert.ok(player.includes(retained), retained);
  }
  assert.match(player, /label\("調整音量"/);
});

test("current rules retire certification and preserve history without mixing curation into monthly ranks", () => {
  assert.match(rules, /There is no active Showtime certification/);
  assert.match(rules, /Choice stays non-ranked and separate from monthly song ranks/);
  assert.match(rules, /The only score is distinct signed-in non-author accounts with an effective song Heart/);
  assert.match(rules, /Collection interactions do not change song Hearts, monthly scores/);
  assert.match(rules, /Preserve every historical song and audio asset, stable IDs, existing favorites/);
  assert.match(experience, /No certification catalog, certification badges, six-defense progress/);
  assert.match(experience, /No Drop victory \/ Bar heat \/ certification source tabs/);
  assert.match(experience, /public Choice remains non-ranked/);
});
