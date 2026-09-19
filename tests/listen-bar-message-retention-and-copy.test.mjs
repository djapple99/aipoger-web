import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listenBarPage = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const messagesRoute = readFileSync(new URL("../src/app/api/listen-bar/messages/route.ts", import.meta.url), "utf8");
const cleanupMessagesRoute = readFileSync(new URL("../src/app/api/listen-bar/cleanup-messages/route.ts", import.meta.url), "utf8");
const honorInteractionsRoute = readFileSync(new URL("../src/app/api/honor-board/interactions/route.ts", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const releaseChecklist = readFileSync(new URL("../docs/aipoger-release-checklist.md", import.meta.url), "utf8");

test("Listen Bar story messages use 24 hour retention and current copy", () => {
  assert.ok(messagesRoute.includes("MESSAGE_RETENTION_HOURS = 24"));
  assert.ok(cleanupMessagesRoute.includes("MESSAGE_RETENTION_HOURS = 24"));
  assert.ok(listenBarPage.includes("傷心的故事傾訴留言"));
  assert.ok(listenBarPage.includes("留言保留 24H"));
  assert.ok(listenBarPage.includes("說說你的傷心故事"));
  assert.equal(listenBarPage.includes("AI 音樂交流區"), false);
  assert.equal(listenBarPage.includes("留言保留 8H"), false);
  assert.equal(listenBarPage.includes("留言保留 12H"), false);
});

test("Saved favorite removal remains explicit while public Heart re-press cancels the daily reaction", () => {
  assert.ok(honorInteractionsRoute.includes('body?.action === "removeFavorite"'));
  assert.ok(honorInteractionsRoute.includes('action === "removeFavorite"'));
  assert.ok(honorInteractionsRoute.includes("record.favoriteUserIds = record.favoriteUserIds.filter((id) => id !== userId);"));
  assert.ok(productRules.includes("Removing a saved favorite is also available from the user's Profile saved-song manager, even while that day's Heart remains active"));
  assert.ok(releaseChecklist.includes("Profile saved favorites can be removed while that day's Heart remains active"));
  assert.ok(releaseChecklist.includes("Re-pressing the public Heart button must cancel that day's Heart and synchronized favorite"));
});
