import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const battlePageSource = readFileSync(new URL("../src/app/battle/page.tsx", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const i18nSource = readFileSync(new URL("../src/lib/i18n.tsx", import.meta.url), "utf8");
const battleResultsSource = readFileSync(new URL("../src/app/battle/results/results-client.tsx", import.meta.url), "utf8");

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

test("Battle Pool compact navigation starts with Explore and keeps share separate", () => {
  const exploreIndex = battlePageSource.indexOf('href: `/ai-music?lang=${lang}`');
  const listenBarIndex = battlePageSource.indexOf('href: `/listen-bar?lang=${lang}`');
  const recordsIndex = battlePageSource.indexOf('href: `/battle/results?lang=${lang}`');
  assert.ok(exploreIndex >= 0);
  assert.ok(exploreIndex < listenBarIndex);
  assert.ok(listenBarIndex < recordsIndex);
  assert.ok(battlePageSource.includes('className="battle-stage-share-action"'));
  assert.equal(battlePageSource.includes("battle-stage-waveform"), false);
  assert.equal(battlePageSource.includes("battle-stage-deck"), false);
  assert.equal(battlePageSource.includes("battle-stage-eq"), false);
});

test("public Battle archive uses Battle Records instead of Result Wall", () => {
  assert.ok(i18nSource.includes("watch_result_card: '對戰記錄'"));
  assert.ok(i18nSource.includes("watch_result_card: 'Battle Records'"));
  assert.ok(battleResultsSource.includes('isZh ? "對戰記錄" : "Battle Records"'));
  assert.equal(battleResultsSource.includes("成果牆"), false);
  assert.equal(battleResultsSource.includes("Result Wall"), false);
});
