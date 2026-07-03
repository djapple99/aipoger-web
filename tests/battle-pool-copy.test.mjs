import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const battlePageSource = readFileSync(new URL("../src/app/battle/page.tsx", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

test("Battle Pool uses current official gatekeeper copy", () => {
  assert.ok(battlePageSource.includes("歡迎任何人來挑戰 AIPOGER 官方關卡"));
  assert.ok(battlePageSource.includes("歡迎挑戰這首官方 Drop，設定開戰時間並分享拉人投票。看看你的歌能不能打"));
  assert.ok(battlePageSource.includes("showAllButton={false}"));
});

test("Battle Pool does not repeat retired official section headings", () => {
  assert.equal(battlePageSource.includes("官方 Drop 挑戰"), false);
  assert.equal(battlePageSource.includes("Official Drop Challenge"), false);
  assert.equal(battlePageSource.includes("Open to Anyone"), false);
});

test("product rules lock the no all-styles Battle Pool filter rule", () => {
  assert.ok(productRulesSource.includes("must not show `全部風格` / `All Styles`"));
  assert.ok(productRulesSource.includes("Clicking an already selected Battle Pool genre clears the selection"));
});
