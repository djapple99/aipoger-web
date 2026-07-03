import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homePageSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const homeI18nSource = readFileSync(new URL("../src/lib/i18n.tsx", import.meta.url), "utf8");

test("homepage uses current 60s Drop Battle language", () => {
  assert.ok(homePageSource.includes("[\"60s\", \"Drop Battle\"]"));
  assert.ok(homePageSource.includes("60s Drop Battle 規則"));
  assert.ok(homePageSource.includes("30-60 秒 Drop"));
  assert.ok(homeI18nSource.includes("上傳 60s Drop"));
  assert.ok(homeI18nSource.includes("30-60 秒 Drop"));
});

test("homepage no longer advertises retired 90s Drop Battle labels", () => {
  assert.equal(homePageSource.includes("[\"90s\""), false);
  assert.equal(homePageSource.includes("最強Drop Battle 對決抓波規則"), false);
  assert.equal(homePageSource.includes("AI 音樂播台"), false);
  assert.equal(homeI18nSource.includes("AI 音樂播台"), false);
  assert.equal(homeI18nSource.includes("home_stat_45_label"), false);
});
