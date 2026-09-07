import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const player = readFileSync(new URL("../src/components/global-music-player.tsx", import.meta.url), "utf8");
const explore = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
test("Explore delegates playback without mounting a second audio element", () => {
  assert.ok(explore.includes("musicPlayer?.start("));
  assert.ok(!explore.includes("<audio"));
  assert.ok(player.includes("audioRef.current.currentTime = next"));
  assert.ok(player.includes("Seek playback"));
});
test("shared player preserves accessible scrollable lyrics", () => {
  assert.ok(player.includes("<dialog"));
  assert.ok(player.includes("showModal()"));
  assert.ok(player.includes("overflow-y-auto"));
  assert.ok(player.includes("歌詞未提供"));
  assert.ok(player.includes("View lyrics"));
});
test("shared player supports mobile volume and native-volume fallback", () => {
  assert.ok(player.includes("lg:hidden"));
  assert.ok(player.includes("Adjust volume"));
  assert.ok(player.includes("createMediaElementSource(audio)"));
  assert.ok(player.includes("createGain()"));
});
