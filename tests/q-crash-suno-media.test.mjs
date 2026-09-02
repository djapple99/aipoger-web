import assert from "node:assert/strict";
import test from "node:test";

import {
  qCrashSunoInAppPlaybackUrl,
  qCrashSunoPlaybackUrl,
  resolveQCrashSunoMediaSource,
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

test("Q Crash resolves a short Suno share link from its redirect URL", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    url: `https://suno.com/song/${TRACK_ID}?sh=example-short-link`,
    text: async () => "",
  });
  try {
    assert.equal(
      await resolveQCrashSunoPlaybackUrl("https://suno.com/s/example-short-link"),
      `https://cdn1.suno.ai/${TRACK_ID}.mp4`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Q Crash resolves Suno's encrypted Mango media source", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    `<a href="https://suno.com/song/${TRACK_ID}?sh=example-short-link">track</a>\n` +
      `{"media_urls":[{"url":"https:\\/\\/d2lwuy8qc234o3.cloudfront.net\\/1\\/clip\\/${TRACK_ID}.m4a","content_type":"m4a-opus","encoding":"1.0.0"}]}`,
    { status: 200 },
  );
  try {
    assert.deepEqual(
      await resolveQCrashSunoMediaSource("https://suno.com/s/example-short-link"),
      {
        trackId: TRACK_ID,
        url: `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${TRACK_ID}.m4a`,
        encrypted: true,
      },
    );
    assert.equal(
      qCrashSunoInAppPlaybackUrl("https://suno.com/s/example-short-link"),
      "/api/q-crash/suno-playback?source=https%3A%2F%2Fsuno.com%2Fs%2Fexample-short-link",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Q Crash does not produce a playback source for non-Suno or invalid media IDs", async () => {
  assert.equal(await resolveQCrashSunoPlaybackUrl("https://example.com/song/test"), null);
  assert.equal(qCrashSunoPlaybackUrl("not-a-track-id"), null);
});
