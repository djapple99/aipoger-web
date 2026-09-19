# AIPOGER Profile — 決鬥計數 Badge Spec

> 2026-06-03 開的新 spec，給 Codex CLI 跑。

---

## 目標

在用戶頭像旁顯示「**總 X / 進行中 Y**」決鬥計數 badge，點開可以看到 battle 列表，founder 可以從這裡按取消。

---

## 顯示規則

- **總決鬥數**：包含所有狀態（`live` + `pending` + `finished` + `cancelled` + `cancelled_no_challenger` + `cancelled_founder` + `active` + `completed` + `expired` + `ghost_battle` + `public_voting`）
- **進行中數**：只包含 `live` + `pending`（2 個 status，不含任何 `cancelled*` 或 `finished`）
- 同類型不限制計入（總數可包含多場歷史 24H 或多場歷史 Drop）

---

## UI 規格

### Avatar 旁 badge

```
[Avatar]  DJ 蘋果哥
          ⚔️ 42  ⚡3
```

- 戰鬥圖示 ⚔️ + 總數
- 閃電 ⚡ + 進行中數
- 兩個獨立顯示，不一定用「/」連在一起
- hover tooltip：「總決鬥 42 場，進行中 3 場」

### 點開展開（accordion）

預設**收合**狀態。點 badge 展開：

```
▼ ⚔️ 42  ⚡3
  ─── 進行中 (3) ───
  1. 與 @xxx 的 90s Drop（4:25 開戰）
     [取消挑戰]（founder 才看到）
  2. 與 @yyy 的 24H Full Song（剩 12 小時）
  3. ...

  ─── 歷史 (39) ───
  - 5/30 與 @zzz 90s Drop 勝利
  - 5/28 24H Full Song 未分勝負
  - ...
```

- 收合時不佔空間，只顯示 badge
- 展開時下方出現列表
- 進行中列表只顯示該用戶的 battle（founder 或 challenger 都算）

---

## 影響檔案

- 新 component：`src/components/profile-battle-count-badge.tsx`
- 引用位置：
  - `src/app/profile/page.tsx`（founder 自己的 profile，最重要）
  - `src/app/battle/[id]/battle-room-client.tsx`（戰場頁的 fighter avatar 旁邊 — 給觀戰者看其他人）
  - 可選：`src/app/battle/page.tsx`（battle list 的 fighter card）
- 新 query：從 `battles` 表統計 `status in (...)` 數量
- 取消按鈕：呼叫既有的 `/api/battle-pool/cancel-founder-challenge` route（v3 Task 7 已有）

---

## 業務規則

- **「總計」包含** 11 個 status：見上方「顯示規則」
- **「進行中」包含** 2 個 status：`live` + `pending`
- **取消按鈕**：
  - founder 才能看到
  - 該 battle `fighter_b_user_id IS NULL` 才能按
  - 走既有的 v3 API route（`/api/battle-pool/cancel-founder-challenge`）
  - UI 整合用 Task 7 的 `handleFounderCancelChallenge` 邏輯（重新包裝成可以在 badge 列表裡觸發）

---

## i18n

- 「總決鬥」/ "Total battles"
- 「進行中」/ "Active"
- 「歷史」/ "History"
- 「與 @xxx 的 90s Drop」/ "90s Drop with @xxx"
- 「剩 12 小時」/ "12h left"
- 「取消挑戰」/ "Cancel challenge"
- Tooltip 中英雙語

---

## 不做

- 不做篩選器（全部列出來即可）
- 不做「查看全部」分頁（profile 頁展開列表就夠）
- 不動 battle room client 的 RPS / 戰鬥邏輯
- 不改 v3 spec 任何東西
- 不動 daily battle / 24H 規則（v3 邏輯已經在）

---

## 驗證

- 視覺檢查（手動）：badge 顯示正確、accordion 收放正常
- 計數正確：建 1 場 finish、1 場 cancel、1 場 pending，總計應該 3，進行中 1
- 取消功能：founder 點取消能成功（200），非 founder 看不到按鈕
- i18n：中英兩版都看
- `npm test` / `npm run lint` / `npx tsc --noEmit` / `npm run build` 全綠

---

## 提交規範

- Commit message: `feat(profile): 頭像旁決鬥計數 badge（總 X / 進行中 Y）`
- **不要 push**

---

## 給 Codex CLI 的 prompt（直接複製貼上）

```
你在 AIPOGER 專案（Next.js 16 + Supabase + Vercel，現在在 codex/aipoger-ui-redesign 分支）幫我做一個新 feature。

完整 spec 在 @docs/aipoger-profile-battle-count-badge.md，請先讀。

只做這個 feature（頭像旁決鬥計數 badge），**不要**動 v3 spec 任何東西、**不要**改 daily battle / 24H 規則。

要求：
1. 新 component src/components/profile-battle-count-badge.tsx
2. 顯示「⚔️ 總數  ⚡ 進行中數」在頭像旁
3. 點開 accordion 展開 battle 列表：
   - 進行中：3 個 status（live + pending）
   - 歷史：8 個 cancelled* + finished
4. 取消按鈕：founder 才能看、走既有的 /api/battle-pool/cancel-founder-challenge route
5. i18n 中英雙語
6. 主要在 src/app/profile/page.tsx 引用；次要考慮 src/app/battle/[id]/battle-room-client.tsx 給觀戰者看其他 fighter 的計數
7. 從 battles 表 query 統計，**不要**每次點開都重算，用 SWR 或 React Query 緩存（如果已經有用就沿用，沒有的話簡單 useEffect + state 也行）
8. Commit 訊息用：`feat(profile): 頭像旁決鬥計數 badge（總 X / 進行中 Y）`
9. 跑驗證：`npm test`、`npm run lint`、`npx tsc --noEmit`、`npm run build` 都要綠
10. **不要 push**、**不要**做篩選器、**不要**做 modal

完成後回報：
- Commit hash
- 改了哪些檔案
- 跑了哪些驗證、是否全綠
- 遇到的問題或 spec 沒寫清楚的地方
```
