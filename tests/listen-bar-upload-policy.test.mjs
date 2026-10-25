import assert from "node:assert/strict";
import test from "node:test";

import {
  LISTEN_BAR_AUDIO_UPLOAD_ACCEPT,
  LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES,
  LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL,
  isAllowedListenBarAudioFile,
  listenBarAudioContentType,
} from "../src/lib/listen-bar-audio-policy.ts";

function audioFile(name, type = "") {
  return new File(["x"], name, { type });
}

test("listen bar new submissions use a 30MB MP3-only policy", () => {
  assert.equal(LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES, 30 * 1024 * 1024);
  assert.equal(LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL, "30MB");
  assert.match(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, /\.mp3/);
  assert.doesNotMatch(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, /\.m4a/);
  assert.doesNotMatch(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, /\.aac/);
  assert.doesNotMatch(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, /\.ogg/);
  assert.equal(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT.includes(".wav"), false);
  assert.equal(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT.includes(".aiff"), false);
});

test("listen bar upload policy accepts only MP3 only", () => {
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.mp3", "audio/mpeg")), true);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.m4a", "audio/mp4")), false);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.aac", "audio/aac")), false);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.ogg", "audio/ogg")), false);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.wav", "audio/wav")), false);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.aiff", "audio/aiff")), false);
});

test("listen bar upload content type normalizes accepted extensions", () => {
  assert.equal(listenBarAudioContentType(audioFile("SONG.MP3")), "audio/mpeg");
});
