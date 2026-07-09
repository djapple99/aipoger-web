import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");

test("Explore AI Music mini player has seekable playback controls", () => {
  assert.ok(aiMusicSource.includes("formatPlayerTime"));
  assert.ok(aiMusicSource.includes('aria-label={isZh ? "拖曳播放進度" : "Seek playback"}'));
  assert.ok(aiMusicSource.includes("onTimeUpdate"));
  assert.ok(aiMusicSource.includes("audioRef.current.currentTime = next"));
});

test("Explore AI Music mini player exposes lyrics in a scrollable HUD", () => {
  assert.ok(aiMusicSource.includes("Lyrics HUD"));
  assert.ok(aiMusicSource.includes('aria-label={isZh ? "看歌詞" : "View lyrics"}'));
  assert.ok(aiMusicSource.includes('aria-label={isZh ? "拖曳瀏覽歌詞" : "Scroll lyrics"}'));
  assert.ok(aiMusicSource.includes("lyricsPanelRef"));
  assert.ok(aiMusicSource.includes("歌詞未提供"));
});
