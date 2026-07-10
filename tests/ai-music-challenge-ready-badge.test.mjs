import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const aiMusicSource = readFileSync(new URL("../src/app/ai-music/ai-music-client.tsx", import.meta.url), "utf8");
const productRulesSource = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const releaseChecklistSource = readFileSync(new URL("../docs/aipoger-release-checklist.md", import.meta.url), "utf8");

test("Explore AI Music uses a non-clickable challenge-ready badge separate from the challenge action", () => {
  assert.ok(aiMusicSource.includes("function ChallengeReadyBadge"));
  assert.ok(aiMusicSource.includes('const label = isZh ? "接戰" : "OPEN";'));
  assert.ok(aiMusicSource.includes("right-0 top-0"));
  assert.ok(aiMusicSource.includes("rotate-45 bg-red-600"));
  assert.ok(aiMusicSource.includes("pointer-events-none"));
  assert.ok(aiMusicSource.includes("track.openForChallenge && Boolean(track.audioUrl)"));
  assert.ok(aiMusicSource.includes("showChallengeReadyBadge ? <ChallengeReadyBadge"));
  assert.ok(aiMusicSource.includes("href={aiMusicChallengeHref(track, lang)}"));
});

test("product rules lock the badge eligibility without reviving a NEW category", () => {
  assert.ok(productRulesSource.includes("red angled `接戰` corner badge"));
  assert.ok(productRulesSource.includes("This badge means the original creator is ready to accept a challenge; it is not the attack action"));
  assert.ok(productRulesSource.includes("The bottom `攻擂` button remains the challenge action"));
  assert.ok(productRulesSource.includes("not Showtime-certified, not retired, not hidden/removed/moderation-held"));
  assert.ok(productRulesSource.includes("a defender 60s Drop is prepared"));
  assert.ok(productRulesSource.includes("Do not add a `NEW` label or a new-song category"));
  assert.equal(productRulesSource.includes("NEW · 類型"), false);
  assert.ok(releaseChecklistSource.includes("non-clickable red angled `接戰` badge"));
  assert.ok(releaseChecklistSource.includes("The card's bottom `攻擂` button remains the only challenge action"));
});
