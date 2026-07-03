import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listenBarPageSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const listenBarGlobalsSource = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
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

test("listen bar repeats a one-track genre after the song ends", () => {
  assert.ok(listenBarPageSource.includes("if (nextTrack.id === nowTrack.id) {"));
  assert.ok(listenBarPageSource.includes("audio.currentTime = 0;"));
  assert.ok(listenBarPageSource.includes("void audio.play()"));
});

test("listen bar upload form previews the selected genre destination", () => {
  assert.ok(listenBarPageSource.includes("送出後直接進公播"));
  assert.ok(listenBarPageSource.includes("送出後進 Challenger"));
  assert.ok(listenBarPageSource.includes("uploadPhaseNoticeBody"));
});

test("listen bar hero actions stay in the lower action strip", () => {
  assert.equal(listenBarPageSource.includes("navBible"), false);
  assert.equal(listenBarPageSource.includes("navAbout"), false);
  assert.equal(listenBarPageSource.includes('href: "/ai-music-bible"'), false);
  assert.equal(listenBarPageSource.includes('href: "/about"'), false);
});

test("listen bar ticker is an animated marquee instead of static truncation", () => {
  assert.ok(listenBarPageSource.includes("aipo-marquee-track"));
  assert.ok(listenBarGlobalsSource.includes("@keyframes aipoMarquee"));
  assert.equal(listenBarPageSource.includes("truncate text-left text-xs"), false);
});

test("listen bar category share uses short links and restores the selected genre", () => {
  assert.ok(listenBarPageSource.includes('listenBarShortPath("all", lang)'));
  assert.ok(listenBarPageSource.includes("selectedGenreShareUrl"));
  assert.ok(listenBarPageSource.includes('params.get("genre")'));
  assert.ok(listenBarShortRouteSource.includes('target.searchParams.set("genre"'));
});

test("listen bar now playing title uses dynamic sizing for long names", () => {
  assert.ok(listenBarPageSource.includes("function nowPlayingTitleClass"));
  assert.ok(listenBarPageSource.includes("titleDisplayUnits"));
  assert.ok(listenBarPageSource.includes("nowTrackTitleClass"));
  assert.ok(listenBarPageSource.includes("max-w-[min(100%,15.5em)]"));
  assert.equal(listenBarPageSource.includes('className="mt-4 line-clamp-2 max-w-[9.6em]'), false);
});
