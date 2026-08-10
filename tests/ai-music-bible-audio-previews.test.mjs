import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const previewCatalog = readFileSync(
  new URL("../src/lib/suno-studio-mastering-audio-previews.ts", import.meta.url),
  "utf8",
);
const promptLibrary = readFileSync(
  new URL("../src/components/suno-practice-library-section.tsx", import.meta.url),
  "utf8",
);
const productRules = readFileSync(
  new URL("../docs/aipoger-product-rules.md", import.meta.url),
  "utf8",
);

const previewKeys = [...previewCatalog.matchAll(/\["(studio-mastering-[^"]+)", "[^"]+"\]/g)].map(
  (match) => match[1],
);
const previewSlugs = [...previewCatalog.matchAll(/\["studio-mastering-[^"]+", "([^"]+)"\]/g)].map(
  (match) => match[1],
);

test("AI Music Bible publishes 95 distinct Studio Mastering audio previews", () => {
  assert.equal(previewKeys.length, 95);
  assert.equal(new Set(previewKeys).size, 95);
  assert.equal(previewSlugs.length, 95);
  assert.equal(new Set(previewSlugs).size, 95);
  assert.equal(previewKeys.includes("studio-mastering-taiwanese-pop"), false);
  assert.equal(previewKeys.includes("studio-mastering-chinese-gufeng"), true);
  assert.ok(productRules.includes("all 95 free prompts"));
});

test("every Bible preview URL has a compact public MP3 asset", () => {
  for (const slug of previewSlugs) {
    const audioUrl = `/audio/ai-music-bible/studio-mastering/${slug}.mp3`;
    const file = new URL(`../public${audioUrl}`, import.meta.url);
    assert.equal(existsSync(file), true, `${audioUrl} is missing`);
    const size = statSync(file).size;
    assert.ok(size > 200_000, `${audioUrl} is unexpectedly small`);
    assert.ok(size < 300_000, `${audioUrl} is unexpectedly large`);
  }
});

test("Bible preview cards use one shared bottom queue player", () => {
  assert.ok(promptLibrary.includes("15 秒試聽"));
  assert.ok(promptLibrary.includes("15s preview"));
  assert.ok(promptLibrary.includes("聲音方向示例・不是正式母帶；Suno 實際生成仍會變化"));
  assert.ok(promptLibrary.includes("<ShowtimeQueuePlayer ref={previewPlayerRef}"));
  assert.equal(promptLibrary.includes("<audio controls"), false);
  assert.equal(promptLibrary.includes("autoPlay"), false);
});
