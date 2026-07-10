import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const showtimeSource = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");
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
  assert.ok(showtimeSource.includes('id="choice-weekly"'));
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

test("Showtime rules require a unified catalog and card-level recognition source", () => {
  assert.ok(productRulesSource.includes("Showtime display is a single certified-works catalog"));
  assert.ok(productRulesSource.includes("Recognition source belongs inside the individual song introduction"));
  assert.ok(productRulesSource.includes("Do not show duplicate Featured/Top sections"));
  assert.ok(releaseChecklistSource.includes("one unified certified-works catalog"));
  assert.ok(releaseChecklistSource.includes("Song cards include the recognition source"));
  assert.ok(artDirectionSource.includes("One unified catalog of certified songs"));
  assert.ok(artDirectionSource.includes("No Drop victory / Bar heat source tabs"));
});
