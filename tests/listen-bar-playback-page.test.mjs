import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listenBarPageSource = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");

test("listen bar genre switches start the selected lane from the beginning", () => {
  assert.match(
    listenBarPageSource,
    /if \(rotationTracks\.some\(\(track\) => track\.id === nowTrack\.id\)\) return;[\s\S]*startTrackAtZeroRef\.current = true;[\s\S]*liveSeekRef\.current = \{ trackId: nextTrack\.id, offset: 0 \};/,
  );
});

test("listen bar playlist refresh keeps the currently playing track", () => {
  assert.match(
    listenBarPageSource,
    /if \(current\.audioUrl && tracks\.some\(\(track\) => track\.id === current\.id\)\) return current;/,
  );
});

test("listen bar resume controls do not force live-position seeking", () => {
  assert.equal(listenBarPageSource.includes("resumeRadioPlayback(true)"), false);
});
