import assert from "node:assert/strict";
import test from "node:test";

import { clampMediaVolume, setNativeMediaVolume } from "../src/lib/media-volume-control.ts";

test("media volume is clamped to the HTML media range", () => {
  assert.equal(clampMediaVolume(-0.5), 0);
  assert.equal(clampMediaVolume(0.42), 0.42);
  assert.equal(clampMediaVolume(3), 1);
  assert.equal(clampMediaVolume(Number.NaN), 1);
});

test("native media volume support is detected from the applied value", () => {
  const writable = { volume: 1 };
  assert.equal(setNativeMediaVolume(writable, 0.35), true);
  assert.equal(writable.volume, 0.35);

  const locked = {
    get volume() {
      return 1;
    },
    set volume(_value) {},
  };
  assert.equal(setNativeMediaVolume(locked, 0.35), false);
});

test("native media volume failures fall back without throwing", () => {
  const throwing = {
    get volume() {
      return 1;
    },
    set volume(_value) {
      throw new Error("volume locked");
    },
  };
  assert.equal(setNativeMediaVolume(throwing, 0.5), false);
});
