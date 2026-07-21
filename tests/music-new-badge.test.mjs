import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  MUSIC_NEW_BADGE_WINDOW_MS,
  isNewlyPublishedMusic,
} from "../src/lib/music-newness.ts";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const listenBarSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const badgeSource = readFileSync(new URL("../src/components/new-music-badge.tsx", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");

const now = new Date("2026-07-21T12:00:00.000Z");

test("NEW status uses a rolling seven-day created_at window", () => {
  assert.equal(MUSIC_NEW_BADGE_WINDOW_MS, 7 * 24 * 60 * 60 * 1000);
  assert.equal(isNewlyPublishedMusic("2026-07-14T12:00:00.001Z", now), true);
  assert.equal(isNewlyPublishedMusic("2026-07-14T12:00:00.000Z", now), false);
  assert.equal(isNewlyPublishedMusic("2026-07-14T11:59:59.999Z", now), false);
  assert.equal(isNewlyPublishedMusic("2026-07-21T12:00:00.001Z", now), false);
  assert.equal(isNewlyPublishedMusic("not-a-date", now), false);
});

test("Explore shows NEW at the cover top-left while challenge-ready remains top-right", () => {
  assert.ok(aiMusicSource.includes("isNewlyPublishedMusic(track.createdAt)"));
  assert.ok(aiMusicSource.includes('className="absolute left-3 top-3 z-20'));
  assert.ok(aiMusicSource.includes('className="pointer-events-none absolute right-0 top-0'));
  assert.ok(badgeSource.includes("NEW"));
  assert.ok(badgeSource.includes("上架 7 天內"));
});

test("Bar Heartbreak marks new now-playing and visible list tracks", () => {
  assert.ok(listenBarSource.includes("isNew={isNewlyPublishedMusic(nowTrack.createdAt)}"));
  assert.ok(listenBarSource.includes('className="absolute left-[20%] top-[11%]'));
  assert.ok((listenBarSource.match(/isNewlyPublishedMusic\(track\.createdAt\)/g) ?? []).length >= 3);
});

test("product rules keep NEW separate from sorting and Choice Weekly", () => {
  assert.ok(productRulesSource.includes("rolling 7 x 24 hours"));
  assert.ok(productRulesSource.includes("72-hour sorting boost remains unchanged"));
  assert.ok(productRulesSource.includes("Do not label this state `Weekly`"));
  assert.equal(productRulesSource.includes("Do not add a `NEW` label"), false);
});
