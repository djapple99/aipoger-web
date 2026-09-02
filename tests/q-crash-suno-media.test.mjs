import assert from "node:assert/strict";
import test from "node:test";

import {
  qCrashSunoPlaybackUrl,
  resolveQCrashSunoPlaybackUrl,
} from "../src/lib/q-crash-suno-media.ts";

const TRACK_ID = "871ee320-b22c-4d8f-9f0e-6c373a79cbdb";

test("Q Crash maps a canonical Suno song link to the public MP4 playback source", async () => {
  assert.equal(
    await resolveQCrashSunoPlaybackUrl(`https://suno.com/song/${TRACK_ID}`),
    `https://cdn1.suno.ai/${TRACK_ID}.mp4`,
  );
  assert.equal(qCrashSunoPlaybackUrl(TRACK_ID), `https://cdn1.suno.ai/${TRACK_ID}.mp4`);
});

test("Q Crash resolves a short Suno share link from public page metadata", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    `{"video_url":"https:\\/\\/cdn1.suno.ai\\/${TRACK_ID}.mp4"}`,
    { status: 200 },
  );
  try {
    assert.equal(
      await resolveQCrashSunoPlaybackUrl("https://suno.com/s/example-short-link"),
      `https://cdn1.suno.ai/${TRACK_ID}.mp4`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Q Crash does not produce a playback source for non-Suno or invalid media IDs", async () => {
  assert.equal(await resolveQCrashSunoPlaybackUrl("https://example.com/song/test"), null);
  assert.equal(qCrashSunoPlaybackUrl("not-a-track-id"), null);
});
