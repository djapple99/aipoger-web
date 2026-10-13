import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const listenBarPage = readFileSync(new URL("../src/app/listen-bar/page.tsx", import.meta.url), "utf8");
const messagesRoute = readFileSync(new URL("../src/app/api/listen-bar/messages/route.ts", import.meta.url), "utf8");
const cleanupMessagesRoute = readFileSync(new URL("../src/app/api/listen-bar/cleanup-messages/route.ts", import.meta.url), "utf8");
const honorInteractionsRoute = readFileSync(new URL("../src/app/api/honor-board/interactions/route.ts", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const releaseChecklist = readFileSync(new URL("../docs/aipoger-engineering.md", import.meta.url), "utf8");

test("retired public story surface preserves backend historical retention", () => {
  assert.ok(messagesRoute.includes("MESSAGE_RETENTION_HOURS = 24"));
  assert.ok(cleanupMessagesRoute.includes("MESSAGE_RETENTION_HOURS = 24"));
  assert.equal(listenBarPage.includes("setChatInput"), false);
  assert.equal(listenBarPage.includes("傷心的故事傾訴留言"), false);
});

test("Saved favorite removal remains explicit while public Heart re-press cancels the daily reaction", () => {
  assert.ok(honorInteractionsRoute.includes('body?.action === "removeFavorite"'));
  assert.ok(honorInteractionsRoute.includes('action === "removeFavorite"'));
  assert.ok(honorInteractionsRoute.includes('setFavoriteMembership(record, userId, action === "favorite" && !record.favoriteUserIds.includes(userId), now)'));
  assert.ok(productRules.includes("Removing a saved favorite is also available from the user's Profile saved-song manager, even while that day's Heart remains active"));
  assert.ok(releaseChecklist.includes("Profile saved favorites can be removed while that day's Heart remains active"));
  assert.ok(releaseChecklist.includes("Re-pressing the public Heart button must cancel that day's Heart and synchronized favorite"));
});
