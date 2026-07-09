import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profilePage = readFileSync(new URL("../src/app/profile/page.tsx", import.meta.url), "utf8");
const productRules = readFileSync(new URL("../docs/aipoger-product-rules.md", import.meta.url), "utf8");
const releaseChecklist = readFileSync(new URL("../docs/aipoger-release-checklist.md", import.meta.url), "utf8");

test("Profile saved songs expose batch selection and removal controls", () => {
  assert.ok(profilePage.includes("favoriteSelectionMode"));
  assert.ok(profilePage.includes("selectedFavoriteIds"));
  assert.ok(profilePage.includes("bulkFavoriteBusy"));
  assert.ok(profilePage.includes("批次管理"));
  assert.ok(profilePage.includes("全選顯示"));
  assert.ok(profilePage.includes("刪除選取"));
  assert.ok(profilePage.includes("點擊選取"));
  assert.ok(profilePage.includes("aria-pressed={isFavoriteSelected}"));
  assert.ok(profilePage.includes('creatorFilter === "favorites" ? filteredCreatorItemsBase : filteredCreatorItemsBase.slice(0, 16)'));
});

test("Profile batch removal reuses favorite toggle API sequentially", () => {
  assert.ok(profilePage.includes("removeFavoriteItems"));
  assert.ok(profilePage.includes('fetch("/api/honor-board/interactions"'));
  assert.ok(profilePage.includes('action: "favorite"'));
  assert.ok(profilePage.includes("for (const item of favoriteItems)"));
  assert.ok(profilePage.includes("setHonorFavorites((current) => current.filter"));
  assert.ok(profilePage.includes("setFavoriteOrder((current) => current.filter"));
});

test("Profile favorite management rules and release checklist cover batch removal", () => {
  assert.ok(productRules.includes("Profile `收藏歌曲` is the user's saved-song manager"));
  assert.ok(productRules.includes("batch selection and batch removal"));
  assert.ok(releaseChecklist.includes("Profile `收藏歌曲` supports batch selection and batch removal"));
  assert.ok(releaseChecklist.includes("historical Heart reactions"));
});
