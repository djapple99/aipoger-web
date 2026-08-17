# Drop Battle 接戰導流修復重點

日期：2026-06-04

## 當前問題

- 挑戰者收到 Drop Battle 邀請連結後，如果尚未登入，會先到登入頁，登入成功後卻回到首頁，沒有回到原本要接受挑戰的流程。
- 已登入使用者點邀請卡或戰鬥池卡的接受挑戰入口時，仍可能被導到登入頁或鬥歌場。
- 戰鬥池卡片目前把「接受挑戰」語意和「進入戰場」混在一起，導致挑戰者歌曲還沒上傳就進入鬥歌場。
- 正確流程應該是：接受挑戰一定先到上傳 Drop / 裁切流程；只有觀戰才進戰場。

## 產品原則

- AIPOGER 沒有等待室；等待開打一律在戰場內聽 teaser / 暖場。
- 「我要接受挑戰」是參賽者動作，必須去上傳歌曲。
- 「我要觀戰」是觀眾動作，才可以直接進入戰場。
- 戰帖已被其他人先接走時，不再讓使用者上傳，改顯示「已經被人挑戰了」並提供觀戰。
- 戰帖真的取消、過期或不存在時，才顯示失效/結束。

## 建議方案

新增專用接戰入口：

```txt
/battle/accept/[id]?lang=zh
```

這個頁面只做接戰分流，不直接進鬥歌場。

## 路由規則

### 邀請卡

```txt
我要接受挑戰 -> /battle/accept/[id]?lang=zh
我要觀戰     -> /battle/[id]?lang=zh
```

### 戰鬥池卡片

```txt
我要接受挑戰 -> /battle/accept/[id]?lang=zh
我要觀戰     -> /battle/[id]?lang=zh
```

卡片本體不要再用「接受挑戰」語意連到戰場。

## /battle/accept/[id] 行為

### 未登入

導向：

```txt
/auth?next=/battle/accept/[id]?lang=zh
```

登入成功後必須回到 `/battle/accept/[id]`，不能回首頁。

### 已登入且戰帖可挑戰

導向上傳 Drop / 裁切流程：

```txt
/battle/hook-cut?flow=upload-first&battleMode=instant&instantPairing=auto&challengeEntryId=[id]&genre=[genre]&lang=zh
```

如果之後決定跳過裁切，也可以改成 `/battle/setup?...`，但原則仍是先上傳歌曲，不可進戰場。

### 戰帖已被挑戰

顯示狀態：

```txt
已經被人挑戰了
```

提供：

```txt
我要觀戰 -> /battle/[match_group_id 或 id]?lang=zh
```

### 戰帖取消 / 過期 / 不存在

顯示失效文案，提供回鬥歌場或去傷心酒吧，不提供上傳。

## 登入 next 防線

目前 `/auth?next=...` 會掉首頁，下一輪需要加強：

- `safeNextPath()` 必須保留 `/battle/accept/[id]?lang=zh`。
- Auth page 進入時要把 `nextPath` 寫入 localStorage。
- 建議同時寫 cookie 作第二層保險，避免 magic link / OAuth callback 找不到 next。
- `/auth/callback` 讀取順序：
  1. URL `next`
  2. localStorage `aipoger:auth-next`
  3. cookie 備援
  4. 最後才回首頁

## 需要修改的主要檔案

- `src/app/battle/invite/[id]/page.tsx`
  - 將 `我要接受挑戰` 改指向 `/battle/accept/[id]`。
  - `我要觀戰` 保持指向戰場。

- `src/app/battle/page.tsx`
  - 戰鬥池等待挑戰卡要分成「接受挑戰」與「觀戰」。
  - 不可再讓接受挑戰直接進 `/battle/[id]`。

- `src/app/battle/accept/[id]/page.tsx`
  - 新增接戰分流頁。
  - 查 battle_queue 狀態、登入狀態、genre、match_group_id。

- `src/lib/auth-urls.ts`
  - 確認 `safeNextPath()` 不會把 `/battle/accept/[id]?lang=zh` 洗掉。
  - 新增 cookie fallback helper 可考慮放這裡。

- `src/app/auth/page.tsx`
  - 記錄 nextPath 的 localStorage/cookie。

- `src/app/auth/callback/page.tsx`
  - callback 成功後優先回到 nextPath。

## 驗證清單

- 未登入使用者點邀請卡 `我要接受挑戰`：
  - 先到登入。
  - 登入後回 `/battle/accept/[id]`。
  - 戰帖可挑戰時進入上傳 Drop / 裁切流程。

- 已登入使用者點邀請卡 `我要接受挑戰`：
  - 不進登入。
  - 不進鬥歌場。
  - 直接進入上傳 Drop / 裁切流程。

- 已登入使用者在戰鬥池點 `我要接受挑戰`：
  - 直接進上傳 Drop / 裁切流程。

- 點 `我要觀戰`：
  - 才進 `/battle/[id]` 戰場。

- 戰帖已被其他人先接走：
  - 顯示 `已經被人挑戰了`。
  - 提供 `我要觀戰`。
  - 不提供上傳。

- 戰帖取消、過期、不存在：
  - 顯示失效。
  - 不提供上傳。

## 注意

- 不要再使用等待室概念。
- 不要把「接受挑戰」與「進入戰場」混成同一個按鈕。
- 分享連結可以保持短版 `/battle/invite/[id]?type=hook-card&lang=zh`。
- 對外文案維持 `drop` / `抓波`，避免回到 hook 說法；程式路由若仍是 `hook-cut` 可先保留。
