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

test("Showtime defaults to monthly charts with a distinct public Choice tab", () => {
  assert.match(rank, /useState<"charts" \| "choice">\("charts"\)/);
  assert.match(rank, /role="tablist"/);
  assert.match(rank, /role="tab"/);
  assert.match(rank, /aria-selected=\{view === tab\}/);
  assert.match(rank, /role="tabpanel"/);
  assert.match(rank, /hidden=\{view !== "charts"\}/);
  assert.match(rank, /hidden=\{view !== "choice"\}/);
  assert.match(rank, /view === "charts" && <MonthlyChart lang=\{lang\}/);
  assert.match(rank, /view === "choice" && <PublicChoiceGallery lang=\{lang\}/);
  for (const label of ["Monthly Charts", "月排行榜", "月間ランキング", "월간 차트", "ArrowLeft", "ArrowRight"]) {
    assert.ok(rank.includes(label), label);
  }
});

test("legacy Choice anchors select the Choice tab and CTAs retain language", () => {
  assert.match(rank, /window\.location\.hash === "#choice-weekly" \? "choice" : "charts"/);
  assert.match(rank, /addEventListener\("hashchange", update\)/);
  assert.match(rank, /addEventListener\("popstate", update\)/);
  assert.match(rank, /window\.history\.pushState/);
  assert.match(shelf, /id="choice-weekly"/);
  for (const source of [rank, shelf]) assert.match(source, /\/profile\/choice\?lang=\$\{lang\}/);
  assert.match(shelf, /<ListPlus/);
  assert.match(shelf, /copy\.buildMyChoice/);
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

test("Choice remains a non-ranked square-cover editorial shelf inside its own tab", () => {
  assert.match(gallery, /<ShowtimeChoiceShelf/);
  assert.ok(shelf.includes('AIPOGER <span className="text-orange-300">CHOICE</span>'));
  assert.match(shelf, /aspect-square/);
  assert.match(shelf, /grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6/);
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
  assert.match(adminApi, /curator_identity: curatorIdentity\(body\?\.curatorIdentity\)/);
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
