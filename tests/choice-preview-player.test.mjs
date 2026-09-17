import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const playerSource = readFileSync(new URL("../src/components/choice-preview-player.tsx", import.meta.url), "utf8");
const adminChoiceSource = readFileSync(new URL("../src/app/admin/choice/page.tsx", import.meta.url), "utf8");
const globalPlayerSource = readFileSync(new URL("../src/components/global-music-player.tsx", import.meta.url), "utf8");
const creatorChoiceSource = readFileSync(new URL("../src/app/profile/choice/page.tsx", import.meta.url), "utf8");

test("Choice preview player provides a compact bottom audio surface", () => {
  assert.ok(playerSource.includes("data-choice-preview-player"));
  assert.ok(playerSource.includes("<audio"));
  assert.ok(playerSource.includes('aria-label="拖曳播放進度"'));
  assert.ok(playerSource.includes('aria-label="調整音量"'));
  assert.ok(playerSource.includes('aria-label="關閉播放器"'));
  assert.ok(playerSource.includes("onClick={toggle}"));
});

test("official and creator Choice workspaces use the existing global player with unavailable media disabled", () => {
  for (const source of [adminChoiceSource, creatorChoiceSource]) {
    assert.ok(source.includes("disabled={!item.audioUrl}"));
    assert.ok(source.includes("musicPlayer?.start"));
    assert.equal(source.includes("<ChoicePreviewPlayer"), false);
    assert.equal(source.includes("<audio"), false);
  }
  assert.ok(globalPlayerSource.includes("<audio"));
  assert.ok(creatorChoiceSource.includes("Boolean(track.audioUrl && track.isPublic)"));
  assert.ok(adminChoiceSource.includes("if (!item.audioUrl || !item.isPublic) return"));
});
