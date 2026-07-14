import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const playerSource = readFileSync(new URL("../src/components/choice-preview-player.tsx", import.meta.url), "utf8");
const adminChoiceSource = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const creatorChoiceSource = readFileSync(new URL("../src/app/profile/choice/page.tsx", import.meta.url), "utf8");

test("Choice preview player provides a compact bottom audio surface", () => {
  assert.ok(playerSource.includes("data-choice-preview-player"));
  assert.ok(playerSource.includes("<audio"));
  assert.ok(playerSource.includes('aria-label="拖曳播放進度"'));
  assert.ok(playerSource.includes('aria-label="調整音量"'));
  assert.ok(playerSource.includes('aria-label="關閉播放器"'));
  assert.ok(playerSource.includes("onClick={toggle}"));
});

test("official and creator Choice catalogs expose playable preview controls", () => {
  for (const source of [adminChoiceSource, creatorChoiceSource]) {
    assert.ok(source.includes("disabled={!item.audioUrl}"));
    assert.ok(source.includes('title={item.audioUrl ? "播放試聽" : "目前沒有可播放音檔"}'));
    assert.ok(source.includes("<ChoicePreviewPlayer track={previewTrack}"));
  }
});
