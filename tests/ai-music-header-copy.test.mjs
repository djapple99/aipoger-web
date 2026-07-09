import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");

test("Explore AI Music header uses compact public copy without mock wording", () => {
  assert.ok(aiMusicSource.includes("依照風格快速瀏覽作品，聽歌、送愛心，或向你喜歡的作品發起挑戰。"));
  assert.ok(aiMusicSource.includes("text-yellow-200"));
  assert.ok(aiMusicSource.includes("上傳音樂讓大家看到你的作品"));
  assert.ok(aiMusicSource.includes('#play-request'));
  assert.ok(aiMusicSource.includes("公播作品"));
  assert.equal(aiMusicSource.includes("真實資料，不含 mock"), false);
  assert.equal(aiMusicSource.includes("Real records only"), false);
});
