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

test("listen bar volume falls back to Web Audio gain when mobile media volume is locked", () => {
  assert.ok(listenBarPageSource.includes("setNativeMediaVolume(audio, normalizedVolume)"));
  assert.ok(listenBarPageSource.includes("createMediaElementSource(audio)"));
  assert.ok(listenBarPageSource.includes("audioContext.createGain()"));
  assert.ok(listenBarPageSource.includes("void ensureRadioVolumeControl()"));
  assert.ok(listenBarPageSource.includes('audioContext?.state === "suspended"'));
  assert.ok(listenBarPageSource.includes('crossOrigin="anonymous"'));
});

test("listen bar upload form previews the selected genre destination", () => {
  assert.ok(listenBarPageSource.includes("送出後直接進公播"));
  assert.ok(listenBarPageSource.includes("送出後進 Challenger"));
  assert.ok(listenBarPageSource.includes("uploadPhaseNoticeBody"));
});

test("listen bar upload form blocks creator genre public over-cap uploads", () => {
  assert.ok(listenBarPageSource.includes("此類公播已嚴重超標"));
  assert.ok(listenBarPageSource.includes("必須先降到 4 首公播以下"));
  assert.ok(listenBarPageSource.includes("此類須降到4首"));
});

test("listen bar hero actions stay in the lower action strip", () => {
  assert.equal(listenBarPageSource.includes("navBible"), false);
  assert.equal(listenBarPageSource.includes("navAbout"), false);
  assert.equal(listenBarPageSource.includes('href: "/ai-music-bible"'), false);
  assert.equal(listenBarPageSource.includes('href: "/about"'), false);
  assert.equal((listenBarPageSource.match(/navDrop: "Drop Battle"/g) ?? []).length, 4);
  assert.ok(listenBarPageSource.includes("data-listen-bar-action-strip"));
  assert.ok(listenBarPageSource.includes('href={`/battle${langQuery}`}'));
  assert.ok(
    listenBarPageSource.indexOf('href={`/ai-music${langQuery}`}')
      < listenBarPageSource.indexOf('href={`/battle${langQuery}`}'),
  );
  assert.ok(listenBarPageSource.includes("basis-full flex-wrap justify-center gap-2"));
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

test("listen bar upload and share actions keep visible glow highlights", () => {
  assert.ok(listenBarPageSource.includes("shadow-[0_0_42px_rgba(255,49,80,0.3)"));
  assert.ok(listenBarPageSource.includes("!shadow-[0_0_34px_rgba(255,49,80,0.34)"));
  assert.ok(listenBarPageSource.includes("!shadow-[0_0_30px_rgba(255,49,80,0.36)"));
  assert.ok(listenBarPageSource.includes("!bg-[linear-gradient(180deg,rgba(164,24,42,0.78)_0%,rgba(116,21,34,0.72)_100%)]"));
  assert.ok(listenBarPageSource.includes("!bg-[linear-gradient(180deg,rgba(164,24,42,0.8)_0%,rgba(96,18,30,0.76)_100%)]"));
  assert.ok(listenBarPageSource.includes("ring-rose-100/14"));
  assert.ok(listenBarPageSource.includes("ring-rose-100/20"));
});
