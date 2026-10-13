import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listenBarPageSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const playerSource = readFileSync(new URL("../src/components/global-music-player.tsx", import.meta.url), "utf8");
const listenBarShortRouteSource = readFileSync(new URL("../src/app/l/[genre]/route.ts", import.meta.url), "utf8");

test("listen bar playback does not hard-sync currentTime while a song is playing", () => {
  assert.equal(
    listenBarPageSource.includes("Math.abs(audio.currentTime - livePosition.offset)"),
    false,
  );
  assert.equal(
    listenBarPageSource.includes("setInterval(() => {\n      const audio = audioRef.current;"),
    false,
  );
});

test("listen bar resume controls do not force live-position seeking", () => {
  assert.equal(listenBarPageSource.includes("resumeRadioPlayback(true)"), false);
});

test("integrated radio uses the shared repeating queue without another audio element", () => {
  const radio = readFileSync(new URL("../src/components/explore-radio.tsx", import.meta.url), "utf8");
  assert.ok(radio.includes("repeat: true"));
  assert.ok(radio.includes("musicPlayer?.start"));
  assert.equal(radio.includes("<audio"), false);
});
test("shared player provides volume fallback for bar", () => {
  assert.ok(playerSource.includes("createMediaElementSource(audio)"));
  assert.ok(playerSource.includes("createGain()"));
  assert.ok(playerSource.includes('crossOrigin="anonymous"'));
});

test("submission moved to Profile and preserves weekly quota with no genre cap", () => {
  const upload = readFileSync(new URL("../src/components/profile-music-upload.tsx", import.meta.url), "utf8");
  assert.ok(upload.includes("投稿後直接公開"));
  assert.equal(upload.includes("listenBarCreatorGenrePublicLimitReached"), false);
  assert.ok(upload.includes("publicUploadBlocked"));
  assert.ok(upload.includes("refreshUploadQuota"));
  assert.equal(listenBarPageSource.includes("<form"), false);
});
test("old radio links keep genre and old submission bookmarks lead to Profile", () => {
  assert.ok(listenBarPageSource.includes('new URLSearchParams(window.location.search)'));
  assert.ok(listenBarPageSource.includes('window.location.hash === "#play-request"'));
  assert.ok(listenBarPageSource.includes('/profile?submit=1'));
  assert.ok(listenBarShortRouteSource.includes('target.searchParams.set("genre"'));
});
test("integrated radio controls hide the fixed player only while visible", () => {
  const radio = readFileSync(new URL("../src/components/explore-radio.tsx", import.meta.url), "utf8");
  assert.ok(radio.includes("IntersectionObserver"));
  assert.ok(radio.includes('detail: false'));
  assert.ok(playerSource.includes('hidden={inlineVisible}'));
  assert.ok(playerSource.includes("<audio"));
});
