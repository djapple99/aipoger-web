import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");

test("Explore AI Music mini player has seekable playback controls", () => {
  assert.ok(aiMusicSource.includes("formatPlayerTime"));
  assert.ok(aiMusicSource.includes('aria-label={localeText(lang, "拖曳播放進度", "Seek playback", "再生位置を移動", "재생 위치 이동")}'));
  assert.ok(aiMusicSource.includes("onTimeUpdate"));
  assert.ok(aiMusicSource.includes("audioRef.current.currentTime = next"));
});

test("Explore AI Music mini player exposes lyrics in a scrollable HUD", () => {
  assert.ok(aiMusicSource.includes("Lyrics HUD"));
  assert.ok(aiMusicSource.includes('aria-label={localeText(lang, "看歌詞", "View lyrics", "歌詞を見る", "가사 보기")}'));
  assert.ok(aiMusicSource.includes('aria-label={localeText(lang, "拖曳瀏覽歌詞", "Scroll lyrics", "歌詞をスクロール", "가사 스크롤")}'));
  assert.ok(aiMusicSource.includes("lyricsPanelRef"));
  assert.ok(aiMusicSource.includes("歌詞未提供"));
  assert.ok(aiMusicSource.includes('event.key !== "Escape"'));
  assert.ok(aiMusicSource.includes('aria-modal="true"'));
});

test("Explore AI Music mini player exposes mobile volume control", () => {
  assert.ok(aiMusicSource.includes('aria-label={localeText(lang, "調整音量", "Adjust volume", "音量を調整", "볼륨 조절")}'));
  assert.ok(aiMusicSource.includes('className="flex items-center gap-2 text-zinc-400 sm:hidden"'));
  assert.ok(aiMusicSource.includes("event.currentTarget.volume = volume"));
});
