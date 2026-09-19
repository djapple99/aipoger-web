import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBattleSocialDraft,
  buildManualSocialDraft,
} from "../src/lib/social-posting.ts";

const socialApi = readFileSync(new URL("../src/app/api/admin/social/route.ts", import.meta.url), "utf8");
const socialPage = readFileSync(new URL("../src/app/admin/social/page.tsx", import.meta.url), "utf8");

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
  for (const platform of ["instagram", "youtube", "facebook_group"]) {
    const target = draft.targets.find((item) => item.platform === platform);
    assert.ok(target, `missing ${platform}`);
    assert.equal(target.backgroundAudioUrl, battleInput.backgroundAudioUrl);
    assert.equal(target.backgroundAudioLabel, battleInput.winnerSong);
    assert.match(target.content, /背景配樂/);
  }
});

test("TikTok is excluded from new Social Desk drafts while historical data can remain untouched", () => {
  const battleDraft = buildBattleSocialDraft(battleInput);
  const manualDraft = buildManualSocialDraft({ topic: "公告", body: "內容", linkUrl: "https://aipoger.com" });

  assert.ok(battleDraft);
  assert.equal(battleDraft.targets.some((target) => target.platform === "tiktok"), false);
  assert.equal(manualDraft.targets.some((target) => target.platform === "tiktok"), false);
  assert.match(socialApi, /TikTok 已從目前社群工作台移出/);
  assert.doesNotMatch(socialPage, /TikTok/);
});

test("Social connection status distinguishes configuration from a verified external publish", () => {
  assert.match(socialApi, /connectionStatus: envHasAny\(discordKeys\) \? "configured" : "not_configured"/);
  assert.match(socialApi, /X_USER_ACCESS_TOKEN/);
  assert.doesNotMatch(socialApi, /X_API_BEARER_TOKEN/);
  assert.match(socialPage, /不會自動送測試訊息/);
  assert.match(socialPage, /建立草稿，確認內容，批准後才發送。/);
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
