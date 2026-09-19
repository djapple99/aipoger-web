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

test("listen bar new submissions use a 30MB compressed-audio policy", () => {
  assert.equal(LISTEN_BAR_AUDIO_UPLOAD_MAX_BYTES, 30 * 1024 * 1024);
  assert.equal(LISTEN_BAR_AUDIO_UPLOAD_MAX_LABEL, "30MB");
  assert.match(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, /\.mp3/);
  assert.match(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, /\.m4a/);
  assert.match(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, /\.aac/);
  assert.match(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT, /\.ogg/);
  assert.equal(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT.includes(".wav"), false);
  assert.equal(LISTEN_BAR_AUDIO_UPLOAD_ACCEPT.includes(".aiff"), false);
});

test("listen bar upload policy accepts only MP3 M4A AAC and OGG", () => {
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.mp3", "audio/mpeg")), true);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.m4a", "audio/mp4")), true);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.aac", "audio/aac")), true);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.ogg", "audio/ogg")), true);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.wav", "audio/wav")), false);
  assert.equal(isAllowedListenBarAudioFile(audioFile("song.aiff", "audio/aiff")), false);
});

test("listen bar upload content type normalizes accepted extensions", () => {
  assert.equal(listenBarAudioContentType(audioFile("SONG.MP3")), "audio/mpeg");
  assert.equal(listenBarAudioContentType(audioFile("song.m4a")), "audio/mp4");
  assert.equal(listenBarAudioContentType(audioFile("song.aac")), "audio/aac");
  assert.equal(listenBarAudioContentType(audioFile("song.ogg")), "audio/ogg");
});
