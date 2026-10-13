import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const listenBarSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const showtimeSource = readFileSync(new URL("../src/app/rank/page.tsx", import.meta.url), "utf8");

test("Explore uses the shared navigation and compact searchable layout", () => {
  const header = readFileSync(new URL("../src/components/editorial-header.tsx", import.meta.url), "utf8");
  assert.ok(aiMusicSource.includes('<EditorialHeader active="explore" />'));
  assert.ok(aiMusicSource.includes('找到對味的歌，讓好作品被聽見。'));
  assert.ok(aiMusicSource.includes('type="search"'));
  assert.ok(aiMusicSource.includes('filterAiMusicTracks'));
  assert.ok(aiMusicSource.includes('<ExploreRadio'));
  assert.ok(aiMusicSource.includes('setWorksView("genre")'));
  assert.ok(aiMusicSource.includes('setWorksView("heat")'));
  assert.ok(header.includes('/profile?submit=1#submit-work'));
  assert.equal(aiMusicSource.includes('ai-music-hero-title'), false);
  assert.equal(aiMusicSource.includes('explore-frequency-stage.webp'), false);
  assert.ok(aiMusicSource.includes('catalogMetadata'));
  assert.ok(aiMusicSource.includes('src="/guide.png"'));
  assert.ok(existsSync(new URL("../public/guide.png", import.meta.url)));
  assert.ok(aiMusicSource.includes('role="dialog"'));
  assert.ok(aiMusicSource.includes('aria-modal="true"'));
  assert.ok(aiMusicSource.includes('closeGuide'));
  assert.ok(aiMusicSource.includes('愛心會同步加入收藏'));
  assert.ok(aiMusicSource.includes('Profile 可整理收藏歌曲'));
  assert.ok(aiMusicSource.includes('已準備 60s Drop'));
  assert.ok(aiMusicSource.includes('正式戰績'));
});

test("Explore share links stay on the shared work in the Explore catalog", () => {
  assert.ok(aiMusicSource.includes("function aiMusicTrackHref"));
  assert.ok(aiMusicSource.includes("return `/ai-music?${params.toString()}#works`;"));
  assert.equal(aiMusicSource.includes("function listenBarHref"), false);
  assert.ok(aiMusicSource.includes('new URLSearchParams(window.location.search).get("track")'));
  assert.ok(aiMusicSource.includes('id={`ai-music-work-${track.sourceId}`}'));
  assert.ok(aiMusicSource.includes("scrollIntoView"));
});

test("Bar redirects to integrated Explore and Showtime keeps charts and Choice", () => {
  assert.ok(listenBarSource.includes("/ai-music?"));
  assert.ok(listenBarSource.includes("/profile?submit=1"));
  assert.equal(listenBarSource.includes("setChatInput"), false);
  assert.ok(showtimeSource.includes("chart={<MonthlyChart lang={lang} />"));
  assert.ok(showtimeSource.includes("PublicChoiceGallery"));
  assert.equal(showtimeSource.includes("ai_music_showtime_certified"), false);
  assert.ok(showtimeSource.includes('href={`/ai-music?lang=${lang}`}'));
  assert.equal(showtimeSource.includes("href={`/battle/setup${navSuffix}`}"), false);
});
