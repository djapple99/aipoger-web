import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homePageSource = readFileSync(new URL("../src/app/page.tsx", import.meta.url), "utf8");
const homeI18nSource = readFileSync(new URL("../src/lib/i18n.tsx", import.meta.url), "utf8");

test("homepage uses current Explore AI Music first-layer entry", () => {
  assert.ok(homePageSource.includes("withLang(\"/ai-music\")"));
  assert.ok(homePageSource.includes("AI 音樂作品"));
  assert.ok(homePageSource.includes("探索 AI 音樂"));
  assert.ok(homeI18nSource.includes("btn_explore_music"));
  assert.ok(homeI18nSource.includes("先探索 AI 音樂"));
});

test("homepage keeps 60s Drop Battle as a secondary product signal", () => {
  assert.ok(homePageSource.includes("[\"60s\", \"Drop Battle\"]"));
});

test("homepage exposes four ordered primary destinations", () => {
  assert.ok(homePageSource.includes('type HomeActionKey = "explore" | "bar" | "battle" | "rank"'));
  assert.match(
    homePageSource,
    /href=\{withLang\("\/ai-music"\)\}[\s\S]*?href=\{withLang\("\/listen-bar"\)\}[\s\S]*?href=\{withLang\("\/battle"\)\}[\s\S]*?href=\{withLang\("\/rank"\)\}/,
  );
  assert.ok(homePageSource.includes("帶上 30–60 秒抓波"));
  assert.ok(homePageSource.includes("grid-cols-2 gap-x-8 gap-y-4"));
});

test("homepage no longer advertises retired 90s Drop Battle labels", () => {
  assert.equal(homePageSource.includes("[\"90s\""), false);
  assert.equal(homePageSource.includes("最強Drop Battle 對決抓波規則"), false);
  assert.equal(homePageSource.includes("AI 音樂播台"), false);
  assert.equal(homeI18nSource.includes("AI 音樂播台"), false);
  assert.equal(homeI18nSource.includes("home_stat_45_label"), false);
});
