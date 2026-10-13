import test from "node:test";
import assert from "node:assert/strict";
import {
  parseExternalMusic,
  externalEmbedUrl,
} from "../src/lib/external-music.ts";
import {
  isPublicDiscoveryTrack,
  isPublicBarAirplayTrack,
} from "../src/lib/listen-bar-airplay.ts";
import { buildPublicHomeWorks } from "../src/lib/home-discovery.ts";
test("canonical IDs strip tracking and accept only supported HTTPS single works", () => {
  assert.equal(
    parseExternalMusic("https://youtu.be/MdxaU0l3FzI?si=track").url,
    "https://www.youtube.com/watch?v=MdxaU0l3FzI",
  );
  assert.equal(
    parseExternalMusic(
      "https://suno.com/song/b82184b0-efcb-4750-a7bf-8dcc2d68c3f1?sh=x",
    ).provider,
    "suno",
  );
  assert.equal(
    parseExternalMusic(
      "https://open.spotify.com/intl-zh/track/0Lr4kGOYn9l83EjuK6cZFQ",
    ).provider,
    "spotify",
  );
  for (const u of [
    "http://youtu.be/MdxaU0l3FzI",
    "https://youtube.com.evil.test/watch?v=MdxaU0l3FzI",
    "https://a@youtube.com/watch?v=MdxaU0l3FzI",
    "https://youtube.com:8000/watch?v=MdxaU0l3FzI",
    "https://127.0.0.1/song/a",
    "https://open.spotify.com/playlist/0Lr4kGOYn9l83EjuK6cZFQ",
    "https://suno.com/@creator",
  ])
    assert.equal(parseExternalMusic(u), null);
});
test("linked discovery does not masquerade as radio audio or a separate MV submission", () => {
  const row = {
    id: "work",
    title: "Title",
    artist: "Creator",
    genre: "Original 自我風格",
    source: "community",
    is_active: true,
    review_status: "approved",
    external_url: "https://www.youtube.com/watch?v=MdxaU0l3FzI",
    audio_path: null,
    is_music_video: true,
    created_at: new Date().toISOString(),
  };
  assert.equal(isPublicDiscoveryTrack(row), true);
  assert.equal(isPublicBarAirplayTrack(row), false);
  assert.equal(isPublicDiscoveryTrack({ ...row, hidden_at: "now" }), false);
  assert.equal(
    isPublicDiscoveryTrack({ ...row, review_status: "rejected" }),
    false,
  );
  const works = buildPublicHomeWorks([row], [], () => "", new Date());
  assert.equal(works.length, 1);
  assert.equal(works[0].id, "work");
  assert.equal(works[0].videoId, "MdxaU0l3FzI");
  assert.equal(works[0].audioUrl, "");
  assert.match(
    externalEmbedUrl(parseExternalMusic(row.external_url)),
    /youtube-nocookie/,
  );
});
