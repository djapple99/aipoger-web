import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const showtimeSource = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
const choiceShelfSource = readFileSync(new URL("../src/components/showtime-choice-shelf.tsx", import.meta.url), "utf8");
const queuePlayerSource = readFileSync(new URL("../src/components/showtime-queue-player.tsx", import.meta.url), "utf8");
const publicCreatorChoiceSource = readFileSync(new URL("../src/app/api/creator-choice/public/route.ts", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const releaseChecklistSource = readFileSync(new URL("../docs/aipoger-release-checklist.md", import.meta.url), "utf8");
const artDirectionSource = readFileSync(new URL("../docs/aipoger-ui-art-direction.md", import.meta.url), "utf8");

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

test("Showtime puts playable creator Choice avatars before a compact six-column catalog", () => {
  assert.ok(showtimeSource.includes("<ShowtimeChoiceShelf"));
  assert.ok(showtimeSource.indexOf("<ShowtimeChoiceShelf") < showtimeSource.indexOf("CERTIFIED MUSIC CATALOG"));
  assert.ok(showtimeSource.includes("xl:grid-cols-6"));
  assert.ok(showtimeSource.includes("收錄保留已獲得反應、正式戰績或策展認可的作品： 入選後不再接受挑戰"));
  assert.equal(showtimeSource.includes("DJ 與營運從 Showtime 認證作品中人工挑選"), false);
  assert.ok(choiceShelfSource.includes("由創作者選出他們心目中的歌單"));
  assert.ok(choiceShelfSource.includes("查看 ${entry.curatorName} 的歌單"));
  assert.ok(choiceShelfSource.includes("onPlay(entry)"));
});

test("Choice and Showtime use one sequential bottom player with mobile volume", () => {
  assert.ok(showtimeSource.includes("<ShowtimeQueuePlayer"));
  assert.ok(queuePlayerSource.includes("data-showtime-queue-player"));
  assert.ok(queuePlayerSource.includes("onEnded"));
  assert.ok(queuePlayerSource.includes("onIndexChange(index + 1)"));
  assert.ok(queuePlayerSource.includes('aria-label={isZh ? "調整音量"'));
  assert.ok(queuePlayerSource.includes("lg:hidden"));
});

test("public Creator Choice shelf exposes only latest published playable Showtime selections", () => {
  assert.match(publicCreatorChoiceSource, /\.eq\("is_published", true\)/);
  assert.match(publicCreatorChoiceSource, /latestByCreator/);
  assert.match(publicCreatorChoiceSource, /source\?\.isPublic && source\.selectable/);
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
