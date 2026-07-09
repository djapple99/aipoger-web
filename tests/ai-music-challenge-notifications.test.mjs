import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const challengesRoute = readFileSync(new URL("../src/app/api/ai-music/challenges/route.ts", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const globalOverlay = readFileSync(new URL("../src/components/global-battle-call-overlay.tsx", import.meta.url), "utf8");
const processFallbacks = readFileSync(new URL("../src/app/api/battle-pool/process-fallbacks/route.ts", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const releaseChecklist = readFileSync(new URL("../docs/aipoger-release-checklist.md", import.meta.url), "utf8");

test("Explore AI Music challenge invites create in-app notifications and expire pending replies", () => {
  assert.ok(challengesRoute.includes('type: "ai_music_challenge_invite"'));
  assert.ok(challengesRoute.includes('href: "/profile#pending-ai-music-challenges"'));
  assert.ok(challengesRoute.includes("expireExpiredInvitesForUser"));
  assert.ok(challengesRoute.includes("expireExpiredInvitesForTrack"));
  assert.ok(challengesRoute.includes("AI_MUSIC_INVITE_RESPONSE_WINDOW_MS"));
  assert.ok(challengesRoute.includes("expires_at: scheduledStartAt"));
  assert.ok(challengesRoute.includes("你已對這首歌送出待回覆攻擂邀請"));
  assert.ok(challengesRoute.includes("defender_audio_path"));
  assert.ok(challengesRoute.includes("challenger_audio_path"));
});

test("Profile exposes pending defense inbox with five-second previews and locked defender Drop copy", () => {
  assert.ok(profilePage.includes('id="pending-ai-music-challenges"'));
  assert.ok(profilePage.includes("copy.pendingChallenges"));
  assert.ok(profilePage.includes("playFiveSecondPreview"));
  assert.ok(profilePage.includes("defenderPreviewUrl"));
  assert.ok(profilePage.includes("challengerPreviewUrl"));
  assert.ok(profilePage.includes("守擂 Drop 已鎖定，回覆前不可修改。"));
  assert.ok(profilePage.includes("接受接戰"));
  assert.ok(profilePage.includes("aipoger:account-notices-read"));
});

test("Global notification dock shows unread account notices and routes to pending challenges", () => {
  assert.ok(globalOverlay.includes("unreadAccountNoticeCount"));
  assert.ok(globalOverlay.includes('select("id", { count: "exact", head: true })'));
  assert.ok(globalOverlay.includes("profileNoticeHref"));
  assert.ok(globalOverlay.includes("pending-ai-music-challenges"));
  assert.ok(globalOverlay.includes("aipoger:account-notices-read"));
});

test("Fallback maintenance expires unanswered AI Music attack invites", () => {
  assert.ok(processFallbacks.includes("expireStaleAiMusicChallengeInvites"));
  assert.ok(processFallbacks.includes("expiredAiMusicInvites"));
  assert.ok(processFallbacks.includes("ai_music_challenge_expired"));
  assert.ok(processFallbacks.includes("這場不算戰績、不進 Showtime，也不算任何一方勝敗"));
});

test("Product docs and release checklist cover challenge notification handling", () => {
  assert.ok(productRules.includes("Profile / 我的作品"));
  assert.ok(productRules.includes("右上角通知"));
  assert.ok(productRules.includes("Email is auxiliary"));
  assert.ok(releaseChecklist.includes("待接戰"));
  assert.ok(releaseChecklist.includes("right-top notification"));
});
