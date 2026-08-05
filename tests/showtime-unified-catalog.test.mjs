import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const showtimeSource = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
const choiceShelfSource = readFileSync(new URL("../src/components/showtime-choice-shelf.tsx", import.meta.url), "utf8");
const queuePlayerSource = readFileSync(new URL("../src/components/showtime-queue-player.tsx", import.meta.url), "utf8");
const publicCreatorChoiceSource = readFileSync(new URL("../src/app/api/creator-choice/public/route.ts", import.meta.url), "utf8");
const choiceInteractionsSource = readFileSync(new URL("../src/app/api/choice/interactions/route.ts", import.meta.url), "utf8");
const choiceHeartsMigration = readFileSync(new URL("../supabase/migrations/20260715083000_choice_collection_hearts.sql", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const releaseChecklistSource = readFileSync(new URL("../docs/aipoger-release-checklist.md", import.meta.url), "utf8");
const artDirectionSource = readFileSync(new URL("../docs/aipoger-ui-art-direction.md", import.meta.url), "utf8");
const adminChoiceSource = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const adminShowtimeSource = readFileSync(new URL("../src/app/admin/showtime/page.tsx", import.meta.url), "utf8");
const profileChoiceSource = readFileSync(new URL("../src/app/profile/choice/page.tsx", import.meta.url), "utf8");
const adminChoiceApiSource = readFileSync(new URL("../src/app/api/admin/choice/route.ts", import.meta.url), "utf8");
const creatorChoiceApiSource = readFileSync(new URL("../src/app/api/creator-choice/route.ts", import.meta.url), "utf8");
const choiceModelSource = readFileSync(new URL("../src/lib/aipoger-choice.ts", import.meta.url), "utf8");
const shareButtonSource = readFileSync(new URL("../src/components/share-button.tsx", import.meta.url), "utf8");
const curatorIdentityMigration = readFileSync(new URL("../supabase/migrations/20260715085800_choice_curator_identity.sql", import.meta.url), "utf8");

test("Showtime renders one certified works catalog without old source boards", () => {
  assert.ok(showtimeSource.includes("All Certified Works"));
  assert.ok(showtimeSource.includes("所有認證作品"));
  assert.ok(showtimeSource.includes("certificationLabel"));
  assert.ok(showtimeSource.includes("正式 Battle 認證"));
  assert.ok(showtimeSource.includes("探索守擂認證"));
  assert.ok(showtimeSource.includes("傷心酒吧公播認證"));
  assert.ok(showtimeSource.includes("surface=showtime"));
  assert.ok(showtimeSource.includes("Support Creator"));
  assert.ok(showtimeSource.includes("[...battleRows, ...hotBarRows]"));
  assert.ok(choiceShelfSource.includes('id="choice-weekly"'));
  assert.equal(showtimeSource.includes("type BoardKey"), false);
  assert.equal(showtimeSource.includes("BOARD_META"), false);
  assert.equal(showtimeSource.includes("BOARD_KEYS"), false);
  assert.equal(showtimeSource.includes("Share This Board"), false);
  assert.equal(showtimeSource.includes("SocialIconCluster"), false);
  assert.equal(showtimeSource.includes("featuredRows"), false);
  assert.equal(showtimeSource.includes("activeBadge"), false);
  assert.equal(showtimeSource.includes("熱血 Drop 抓波勝利榜"), false);
  assert.equal(showtimeSource.includes("傷心酒吧熱播榜"), false);
  assert.equal(showtimeSource.includes("傷心酒吧熱播紀錄"), false);
});

test("Showtime puts cover-led Choice editorials before a compact six-column catalog", () => {
  assert.ok(showtimeSource.includes("<ShowtimeChoiceShelf"));
  assert.ok(showtimeSource.indexOf("<ShowtimeChoiceShelf") < showtimeSource.indexOf("CERTIFIED MUSIC CATALOG"));
  assert.ok(showtimeSource.includes("lg:grid-cols-6"));
  assert.ok(showtimeSource.includes("收錄保留已獲得反應、正式戰績或策展認可的作品： 入選後不再接受挑戰"));
  assert.equal(showtimeSource.includes("DJ 與營運從 Showtime 認證作品中人工挑選"), false);
  assert.ok(choiceShelfSource.includes("AIPOGER <span className=\"text-orange-300\">CHOICE</span>"));
  assert.ok(choiceShelfSource.includes("aspect-square"));
  assert.ok(choiceShelfSource.includes("grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"));
  assert.ok(choiceShelfSource.includes("entry.coverUrl"));
  assert.ok(choiceShelfSource.includes("entry.intro"));
  assert.ok(choiceShelfSource.includes("entry.intro"));
  assert.ok(choiceShelfSource.includes("ChoiceCommentsDialog"));
  assert.ok(choiceShelfSource.includes("<ShareButton"));
  assert.ok(choiceShelfSource.includes("onToggleHeart(entry)"));
  assert.equal(choiceShelfSource.includes("CURATOR SETS"), false);
  assert.equal(choiceShelfSource.includes("由創作者選出他們心目中的歌單"), false);
  assert.ok(choiceShelfSource.includes('aria-label={isZh ? "預覽歌單" : "Preview tracklist"}'));
  assert.ok(choiceShelfSource.includes("onPlay(entry)"));
});

test("owner Choice preserves an explicit official or personal publishing identity", () => {
  const currentChoiceSource = readFileSync(new URL("../src/app/api/choice/current/route.ts", import.meta.url), "utf8");
  assert.ok(currentChoiceSource.includes("created_by"));
  assert.ok(currentChoiceSource.includes("curator_identity"));
  assert.ok(currentChoiceSource.includes('identity === "personal"'));
  assert.ok(currentChoiceSource.includes('from("fighter_profiles")'));
  assert.ok(currentChoiceSource.includes("display_name,avatar_url"));
  assert.ok(showtimeSource.includes("choiceCollection.curatorName || \"AIPOGER\""));
  assert.ok(showtimeSource.includes('choiceCollection.curatorIdentity === "personal"'));
  assert.ok(showtimeSource.includes('mediaSrc(choiceCollection.avatarUrl || "")'));
  assert.ok(showtimeSource.includes(": AIPOGER_BRAND_LOGO"));
  assert.ok(showtimeSource.includes("choiceDisplayTitle(choiceCollection.curatorName, choiceCollection.title)"));
  assert.ok(adminChoiceSource.includes('option value="official"'));
  assert.ok(adminChoiceSource.includes('option value="personal"'));
  assert.ok(adminShowtimeSource.includes("choiceCuratorIdentity"));
  assert.ok(curatorIdentityMigration.includes("curator_identity in ('official', 'personal')"));
});

test("Choice tracklist HUD supports song saves, individual playback, and play all", () => {
  assert.ok(choiceShelfSource.includes("TracklistPreview"));
  assert.ok(choiceShelfSource.includes("group-hover/tracklist:visible"));
  assert.ok(choiceShelfSource.includes("setDetail(entry)"));
  assert.ok(choiceShelfSource.includes("createPortal(("));
  assert.ok(choiceShelfSource.includes("document.body"));
  assert.ok(choiceShelfSource.includes("choiceDateLabel(entry.weekStart, isZh)"));
  assert.ok(choiceShelfSource.includes("choiceItemRecordKey(item)"));
  assert.ok(choiceShelfSource.includes("onToggleItemHeart(item)"));
  assert.ok(choiceShelfSource.includes("onPlay(detail, item.itemId)"));
  assert.ok(choiceShelfSource.includes('aria-label={isZh ? "全部播放" : "Play all"}'));
  assert.ok(choiceShelfSource.includes("onPlay(detail)"));
  assert.ok(choiceShelfSource.includes("onPlay(entry)"));
});

test("Choice editor supports long-form recommendation articles and visible icon-only sharing", () => {
  assert.ok(choiceModelSource.includes("AIPOGER_CHOICE_INTRO_MAX_LENGTH = 3000"));
  assert.ok(adminChoiceApiSource.includes("cleanText(body?.intro, AIPOGER_CHOICE_INTRO_MAX_LENGTH)"));
  assert.ok(creatorChoiceApiSource.includes("cleanText(body?.intro, AIPOGER_CHOICE_INTRO_MAX_LENGTH)"));
  assert.ok(adminChoiceSource.includes("maxLength={AIPOGER_CHOICE_INTRO_MAX_LENGTH}"));
  assert.ok(adminShowtimeSource.includes("maxLength={AIPOGER_CHOICE_INTRO_MAX_LENGTH}"));
  assert.ok(profileChoiceSource.includes("maxLength={AIPOGER_CHOICE_INTRO_MAX_LENGTH}"));
  assert.ok(shareButtonSource.includes('iconOnly ? "p-0" : "px-4 py-2"'));
});

test("Choice saves persist independently from song Hearts and only target public collections", () => {
  assert.ok(showtimeSource.includes("/api/choice/interactions"));
  assert.ok(showtimeSource.includes("action: choiceHearts[key]?.myHeart ? \"remove_heart\" : \"heart\""));
  assert.ok(choiceInteractionsSource.includes("aipoger_choice_collection_hearts"));
  assert.ok(choiceInteractionsSource.includes(".eq(\"is_published\", true)"));
  assert.ok(choiceInteractionsSource.includes('action === "heart" || body?.action === "remove_heart"'));
  assert.ok(choiceHeartsMigration.includes("create table if not exists public.aipoger_choice_collection_hearts"));
  assert.ok(choiceHeartsMigration.includes("enable row level security"));
  assert.ok(choiceHeartsMigration.includes("revoke all on table public.aipoger_choice_collection_hearts from anon, authenticated"));
  assert.ok(productRulesSource.includes("Choice saves remain collection-level"));
});

test("Choice and Showtime use one sequential bottom player with mobile volume", () => {
  assert.ok(showtimeSource.includes("<ShowtimeQueuePlayer"));
  assert.ok(queuePlayerSource.includes("data-showtime-queue-player"));
  assert.ok(queuePlayerSource.includes("onEnded"));
  assert.ok(queuePlayerSource.includes("useImperativeHandle"));
  assert.ok(queuePlayerSource.includes("await audio.play()"));
  assert.ok(queuePlayerSource.includes("current.index + 1"));
  assert.ok(queuePlayerSource.includes('aria-label={isZh ? "調整音量"'));
  assert.ok(queuePlayerSource.includes("lg:hidden"));
});

test("public Creator Choice shelf keeps published playable selections after the new-release window", () => {
  assert.match(publicCreatorChoiceSource, /\.eq\("is_published", true\)/);
  assert.doesNotMatch(publicCreatorChoiceSource, /latestByCreator/);
  assert.match(publicCreatorChoiceSource, /\.limit\(48\)/);
  assert.match(publicCreatorChoiceSource, /source\?\.isPublic/);
  assert.match(publicCreatorChoiceSource, /fighter_profiles/);
  assert.match(publicCreatorChoiceSource, /user_profiles/);
});

test("Showtime rules require a unified catalog and card-level recognition source", () => {
  assert.ok(productRulesSource.includes("Showtime display is a single certified-works catalog"));
  assert.ok(productRulesSource.includes("Recognition source belongs inside the individual song introduction"));
  assert.ok(productRulesSource.includes("Do not show duplicate Featured/Top sections"));
  assert.ok(releaseChecklistSource.includes("one unified certified-works catalog"));
  assert.ok(releaseChecklistSource.includes("Song cards include the recognition source"));
  assert.ok(artDirectionSource.includes("One unified catalog of certified songs"));
  assert.ok(artDirectionSource.includes("No Drop victory / Bar heat source tabs"));
});
