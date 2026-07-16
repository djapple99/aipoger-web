import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const listenBarSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const showtimeSource = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");

test("Explore AI Music uses a compact catalog masthead and current navigation order", () => {
  assert.ok(aiMusicSource.includes("依照風格快速瀏覽作品，聽歌、送愛心，或向你喜歡的作品發起挑戰。"));
  assert.ok(aiMusicSource.includes("text-yellow-200"));
  assert.ok(aiMusicSource.includes("上傳音樂讓大家看到你的作品"));
  assert.ok(aiMusicSource.includes("catalogMetadata"));
  assert.ok(aiMusicSource.includes("首公開作品"));
  assert.ok(aiMusicSource.includes('catalog: localeText(lang, "作品庫", "Catalog", "作品カタログ", "작품 카탈로그")'));
  assert.ok(aiMusicSource.includes('setWorksView("genre")'));
  assert.ok(aiMusicSource.includes('setWorksView("heat")'));
  assert.ok(aiMusicSource.includes("正在升溫"));
  assert.equal(aiMusicSource.includes("Live Drop Signal"), false);
  assert.equal(aiMusicSource.includes("60s READY"), false);
  assert.ok(aiMusicSource.includes("ai-music-hero-title"));
  assert.ok(aiMusicSource.includes('#play-request'));
  assert.ok(aiMusicSource.includes("這裡怎麼玩？"));
  assert.ok(aiMusicSource.includes('src="/guide.png"'));
  assert.ok(aiMusicSource.includes('role="dialog"'));
  assert.ok(aiMusicSource.includes('aria-modal="true"'));
  assert.ok(aiMusicSource.includes("closeGuide"));
  assert.equal(aiMusicSource.includes("<details"), false);
  assert.ok(existsSync(new URL("../public/guide.png", import.meta.url)));
  assert.ok(aiMusicSource.includes("愛心會同步加入收藏"));
  assert.ok(aiMusicSource.includes("Profile 可整理收藏歌曲"));
  assert.ok(aiMusicSource.includes("已準備 60s Drop"));
  assert.ok(aiMusicSource.includes("守擂進度"));
  const worksIndex = aiMusicSource.indexOf('label: copy.browseWorks');
  const barIndex = aiMusicSource.indexOf('label: copy.bar');
  const dropIndex = aiMusicSource.indexOf('label: "Drop Battle"');
  const showtimeIndex = aiMusicSource.indexOf('label: "Showtime"');
  const choiceIndex = aiMusicSource.indexOf('label: "Choice"');
  assert.ok(worksIndex > -1 && worksIndex < barIndex);
  assert.ok(barIndex < dropIndex);
  assert.ok(dropIndex < showtimeIndex);
  assert.ok(showtimeIndex < choiceIndex);
  assert.ok(aiMusicSource.includes("公開作品"));
  assert.equal(aiMusicSource.includes("真實資料，不含 mock"), false);
  assert.equal(aiMusicSource.includes("Real records only"), false);
});

test("Explore share links stay on the shared work in the Explore catalog", () => {
  assert.ok(aiMusicSource.includes("function aiMusicTrackHref"));
  assert.ok(aiMusicSource.includes("return `/ai-music?${params.toString()}#works`;"));
  assert.equal(aiMusicSource.includes("function listenBarHref"), false);
  assert.ok(aiMusicSource.includes('new URLSearchParams(window.location.search).get("track")'));
  assert.ok(aiMusicSource.includes('id={`ai-music-work-${track.sourceId}`}'));
  assert.ok(aiMusicSource.includes("scrollIntoView"));
});

test("Bar Heartbreak and Showtime pages state their current surface positioning", () => {
  assert.ok(listenBarSource.includes("AI 音樂公播池與投稿入口"));
  assert.ok(listenBarSource.includes("也會出現在探索 AI 音樂"));
  assert.ok(
    showtimeSource.includes("收錄保留已獲得反應、正式戰績或策展認可的作品： 入選後不再接受挑戰"),
  );
  assert.ok(showtimeSource.includes("入選後不再接受挑戰"));
  assert.ok(showtimeSource.includes("/api/ai-music/tracks"));
  assert.ok(showtimeSource.includes("ai_music_showtime_certified"));
  assert.ok(showtimeSource.includes('href={`/ai-music${navSuffix}`}'));
  assert.equal(showtimeSource.includes("href={`/battle/setup${navSuffix}`}"), false);
});
