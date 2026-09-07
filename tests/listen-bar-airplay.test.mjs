import assert from "node:assert/strict";
import test from "node:test";
import { isPublicBarAirplayTrack } from "../src/lib/listen-bar-airplay.ts";

test("Showtime recognition keeps the same public audio eligible for Bar airplay", () => {
  const row = { is_active: true, review_status: "approved", audio_path: "creator/song.mp3" };
  assert.equal(isPublicBarAirplayTrack(row), true);
  assert.equal(isPublicBarAirplayTrack({ ...row, ai_music_showtime_certified: true }), true);
  for (const reason of [
    { is_active: false }, { hidden_at: "2026-09-08" }, { removed_at: "2026-09-08" },
    { ai_music_showtime_public_removed_at: "2026-09-08" }, { audio_path: " " },
    ...["hidden", "removed", "completed", "rejected"].map(review_status => ({ review_status })),
  ]) assert.equal(isPublicBarAirplayTrack({ ...row, ai_music_showtime_certified: true, ...reason }), false);
});
