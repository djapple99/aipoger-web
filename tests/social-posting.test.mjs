import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBattleSocialDraft,
  buildManualSocialDraft,
} from "../src/lib/social-posting.ts";

const battleInput = {
  battleId: "11111111-1111-4111-8111-111111111111",
  battleCode: "BATTLE-001",
  winnerSide: "fighter_a",
  winnerName: "Mavis",
  winnerSong: "雨夜 Drop",
  opponentName: "Nova",
  opponentSong: "霓虹失眠",
  genre: "Cyber Pop",
  finalVoteLeft: 7,
  finalVoteRight: 4,
  totalVotes: 11,
  resultUrl: "https://aipoger.com/r/example?lang=zh",
  battleUrl: "https://aipoger.com/b/example?lang=zh",
  backgroundAudioUrl: "https://audio.example/winner.mp3",
};

test("battle social draft uses 60s language and never 45-second copy", () => {
  const draft = buildBattleSocialDraft(battleInput);

  assert.ok(draft);
  const allText = draft.targets.map((target) => `${target.title}\n${target.content}\n${target.notes}`).join("\n");
  assert.match(allText, /60s Drop Battle/);
  assert.match(allText, /30-60 秒抓波/);
  assert.doesNotMatch(allText, /45\s*秒|45\s*sec/i);
});

test("battle social draft refuses no-contest zero-vote results", () => {
  const draft = buildBattleSocialDraft({
    ...battleInput,
    finalVoteLeft: 0,
    finalVoteRight: 0,
    totalVotes: 0,
  });

  assert.equal(draft, null);
});

test("battle social draft carries winner audio for background music targets", () => {
  const draft = buildBattleSocialDraft(battleInput);

  assert.ok(draft);
  for (const platform of ["instagram", "tiktok", "youtube", "facebook_group"]) {
    const target = draft.targets.find((item) => item.platform === platform);
    assert.ok(target, `missing ${platform}`);
    assert.equal(target.backgroundAudioUrl, battleInput.backgroundAudioUrl);
    assert.equal(target.backgroundAudioLabel, battleInput.winnerSong);
    assert.match(target.content, /背景配樂/);
  }
});

test("manual social draft defaults to 30-60 second drop CTA", () => {
  const draft = buildManualSocialDraft({
    topic: "Creator Wanted",
    body: "徵求第一批 AI 音樂創作者。",
    cta: "",
    linkUrl: "https://aipoger.com/battle?lang=zh",
  });
  const allText = draft.targets.map((target) => target.content).join("\n");

  assert.match(allText, /30-60 秒抓波/);
  assert.doesNotMatch(allText, /45\s*秒|45\s*sec/i);
});
