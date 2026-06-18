import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOfficialGatekeeperDrop } from "../src/lib/official-gatekeeper-drops.ts";

test("official gatekeeper normalizer keeps media fields", () => {
  const drop = normalizeOfficialGatekeeperDrop({
    id: "gate-01-heartbreak",
    gate_number: "GATE 01",
    title: "官方守門 Drop",
    genre: "感人抒情",
    ai_tool: "Suno",
    description: "歡迎任何人來挑戰",
    audio_path: "official-gatekeeper-drops/gate-01/audio/drop.wav",
    cover_path: "official-gatekeeper-drops/gate-01/covers/cover.jpg",
    lyrics: "第一句\n第二句",
    active: true,
    sort_order: 1,
  });

  assert.equal(drop.audioPath, "official-gatekeeper-drops/gate-01/audio/drop.wav");
  assert.equal(drop.coverPath, "official-gatekeeper-drops/gate-01/covers/cover.jpg");
  assert.equal(drop.lyrics, "第一句\n第二句");
  assert.equal(drop.active, true);
});
