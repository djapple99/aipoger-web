import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const listenBarSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const showtimeSource = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");

test("Explore AI Music header uses compact public copy and current navigation order", () => {
  assert.ok(aiMusicSource.includes("依照風格快速瀏覽作品，聽歌、送愛心，或向你喜歡的作品發起挑戰。"));
  assert.ok(aiMusicSource.includes("text-yellow-200"));
  assert.ok(aiMusicSource.includes("上傳音樂讓大家看到你的作品"));
  assert.ok(aiMusicSource.includes("Public Wall"));
  assert.ok(aiMusicSource.includes("Live Drop Signal"));
  assert.ok(aiMusicSource.includes("ai-music-console-tab"));
  assert.ok(aiMusicSource.includes("ai-music-hero-title"));
  assert.ok(aiMusicSource.includes('#play-request'));
  assert.ok(aiMusicSource.includes("這裡怎麼玩？"));
  assert.ok(aiMusicSource.includes("愛心會同步收藏"));
  assert.ok(aiMusicSource.includes("Profile 管理"));
  assert.ok(aiMusicSource.includes("守擂 60s Drop"));
  assert.ok(aiMusicSource.includes("8 場正式敗績"));
  const worksIndex = aiMusicSource.indexOf('label: isZh ? "作品瀏覽" : "Works"');
  const barIndex = aiMusicSource.indexOf('label: isZh ? "傷心酒吧" : "Bar Heartbreak"');
  const dropIndex = aiMusicSource.indexOf('label: "Drop Battle"');
  const showtimeIndex = aiMusicSource.indexOf('label: "Showtime"');
  const choiceIndex = aiMusicSource.indexOf('label: "Choice"');
  assert.ok(worksIndex > -1 && worksIndex < barIndex);
  assert.ok(barIndex < dropIndex);
  assert.ok(dropIndex < showtimeIndex);
  assert.ok(showtimeIndex < choiceIndex);
  assert.ok(aiMusicSource.includes("公播作品"));
  assert.equal(aiMusicSource.includes("真實資料，不含 mock"), false);
  assert.equal(aiMusicSource.includes("Real records only"), false);
});

test("Bar Heartbreak and Showtime pages state their current surface positioning", () => {
  assert.ok(listenBarSource.includes("AI 音樂公播池與投稿入口"));
  assert.ok(listenBarSource.includes("也會出現在探索 AI 音樂"));
  assert.ok(showtimeSource.includes("Showtime 是 AIPOGER 的認證作品庫"));
  assert.ok(showtimeSource.includes("入選後不再接受挑戰"));
  assert.ok(showtimeSource.includes('href={`/ai-music${navSuffix}`}'));
  assert.equal(showtimeSource.includes("href={`/battle/setup${navSuffix}`}"), false);
});
