import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS,
  LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS,
  cleanListenBarDisplayText,
  limitListenBarDisplayText,
  listenBarDisplayUnitCount,
} from "../src/lib/listen-bar-field-limits.ts";

describe("listen bar field display limits", () => {
  it("counts CJK characters as two display units", () => {
    assert.equal(listenBarDisplayUnitCount("愛波哥"), 6);
    assert.equal(listenBarDisplayUnitCount("AIPOGER"), 7);
    assert.equal(listenBarDisplayUnitCount("愛A"), 3);
  });

  it("limits short user-entered fields to 12 CJK chars or 24 English chars", () => {
    assert.equal(limitListenBarDisplayText("愛愛愛愛愛愛愛愛愛愛愛愛愛", LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS), "愛愛愛愛愛愛愛愛愛愛愛愛");
    assert.equal(limitListenBarDisplayText("abcdefghijklmnopqrstuvwxy", LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS), "abcdefghijklmnopqrstuvwx");
  });

  it("limits one-line descriptions to 16 CJK chars or 32 English chars", () => {
    assert.equal(limitListenBarDisplayText("歌歌歌歌歌歌歌歌歌歌歌歌歌歌歌歌歌", LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS), "歌歌歌歌歌歌歌歌歌歌歌歌歌歌歌歌");
    assert.equal(limitListenBarDisplayText("abcdefghijklmnopqrstuvwxyzABCDEFG", LISTEN_BAR_DESCRIPTION_DISPLAY_UNITS), "abcdefghijklmnopqrstuvwxyzABCDEF");
  });

  it("trims before cleaning API fields", () => {
    assert.equal(cleanListenBarDisplayText("  愛愛愛愛愛愛愛愛愛愛愛愛愛  ", LISTEN_BAR_SHORT_FIELD_DISPLAY_UNITS), "愛愛愛愛愛愛愛愛愛愛愛愛");
  });
});
