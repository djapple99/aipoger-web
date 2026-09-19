import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const releaseChecklist = readFileSync(new URL("../docs/aipoger-release-checklist.md", import.meta.url), "utf8");
const uiArtDirection = readFileSync(new URL("../docs/aipoger-ui-art-direction.md", import.meta.url), "utf8");
const queuePlayer = readFileSync(new URL("../src/components/showtime-queue-player.tsx", import.meta.url), "utf8");

test("Profile saved songs expose batch selection and removal controls", () => {
  assert.ok(profilePage.includes("favoriteSelectionMode"));
  assert.ok(profilePage.includes("selectedFavoriteIds"));
  assert.ok(profilePage.includes("bulkFavoriteBusy"));
  assert.ok(profilePage.includes("CREATOR_ITEMS_PER_PAGE = 10"));
  assert.ok(profilePage.includes("creatorTotalPages"));
  assert.ok(profilePage.includes("批次管理"));
  assert.ok(profilePage.includes("全選本頁"));
  assert.ok(profilePage.includes("刪除選取"));
  assert.ok(profilePage.includes("點擊選取"));
  assert.ok(profilePage.includes("aria-pressed={isSelectionSelected}"));
  assert.ok(profilePage.includes("filteredCreatorItemsBase.slice("));
  assert.ok(profilePage.includes("creatorPageStartIndex + CREATOR_ITEMS_PER_PAGE"));
});

test("Profile batch removal uses explicit favorite removal API sequentially", () => {
  assert.ok(profilePage.includes("removeFavoriteItems"));
  assert.ok(profilePage.includes('fetch("/api/honor-board/interactions"'));
  assert.ok(profilePage.includes('action: "removeFavorite"'));
  assert.ok(profilePage.includes("for (const item of favoriteItems)"));
  assert.ok(profilePage.includes("setHonorFavorites((current) => current.filter"));
  assert.ok(profilePage.includes("setFavoriteOrder((current) => current.filter"));
});

test("Profile own Bar Heartbreak songs expose paged batch removal", () => {
  assert.ok(profilePage.includes("listenBarSelectionMode"));
  assert.ok(profilePage.includes("selectedListenBarItemIds"));
  assert.ok(profilePage.includes("removeListenBarItems"));
  assert.ok(profilePage.includes('fetch("/api/listen-bar/remove-track"'));
  assert.ok(profilePage.includes("撤下選取"));
  assert.ok(profilePage.includes("每頁 10 首"));
  assert.ok(profilePage.includes("songBatchConfirm"));
});

test("Profile favorite management rules and release checklist cover batch removal", () => {
  assert.ok(productRules.includes("Profile `收藏歌曲` is the user's saved-song manager"));
  assert.ok(productRules.includes("batch selection and batch removal"));
  assert.ok(productRules.includes("Profile creator-song management"));
  assert.ok(releaseChecklist.includes("Profile `收藏歌曲` supports batch selection and batch removal"));
  assert.ok(releaseChecklist.includes("Profile creator data lists songs in pages of 10"));
  assert.ok(releaseChecklist.includes("historical Heart reactions"));
  assert.ok(productRules.includes("Removing a saved favorite is also available from the user's Profile saved-song manager, even while that day's Heart remains active"));
});

test("creator and listener saved songs use the shared fixed bottom queue player", () => {
  assert.ok(profilePage.includes('from "@/components/showtime-queue-player"'));
  assert.ok(profilePage.includes("profilePlayerRef"));
  assert.ok(profilePage.includes("playProfileItem"));
  assert.ok(profilePage.includes("profilePlayerRef.current?.start("));
  assert.ok(profilePage.includes("<ShowtimeQueuePlayer ref={profilePlayerRef} isZh={isZh} />"));
  assert.ok(!profilePage.includes("playPreviewItem"));
  assert.ok(!profilePage.includes("togglePreview"));
  assert.ok(queuePlayer.includes("data-showtime-queue-player"));
  assert.ok(queuePlayer.includes("Previous track"));
  assert.ok(queuePlayer.includes("Adjust volume"));
  assert.ok(queuePlayer.includes("Close player"));
});

test("saved-song player behavior is recorded in product, release, and art rules", () => {
  assert.ok(productRules.includes("Creator and listener accounts use the same fixed bottom queue player for Profile saved songs"));
  assert.ok(releaseChecklist.includes("Creator and listener Profile saved songs both open the same fixed bottom queue player"));
  assert.ok(uiArtDirection.includes("Profile saved music follows the same compact fixed-bottom player language"));
});
