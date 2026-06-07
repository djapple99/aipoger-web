# Drop Battle 5 秒守擂挑戰執行方案

> 狀態：待實作規格草案
> 最後更新：2026-06-07
> 範圍：只處理 90s Drop Battle。不要動 24H Full Song battle。

## 結論

要做。

這個功能會讓 Drop Battle 從「一場結束」變成「現場連戰」。Battle 結束後，勝者短暫留在場上成為擂主，全場有 5 秒可以搶挑戰權。第一版只做一位挑戰者，先到先得，不做排隊、不做連勝獎勵、不做多人挑戰池。

核心規則：

- 5 秒只用來搶挑戰權。
- 挑戰者按下後，再給 120 秒上傳 Drop。
- 不要求使用者在 5 秒內完成上傳。
- 0:0 no contest 不觸發守擂挑戰。
- 只有登入者可以挑戰。
- 不允許自己挑戰自己。

## 使用者體驗

### 1. 正常 Battle 結束

當 Battle 結束且產生有效 winner：

1. 顯示勝者揭曉。
2. 顯示成果卡生成狀態。
3. 同時出現 5 秒倒數區塊：
   - 標題：`有人要挑戰擂主嗎？`
   - 副文：`第一個按下的人取得挑戰席，接著有 120 秒上傳 Drop。`
   - 主按鈕：`我要挑戰擂主`
   - 倒數中不顯示 `看成果卡`
4. 倒數期間，觀眾可以留在戰場看是否有人接。
5. 倒數結束沒人接戰，直接自動進成果卡。

### 2. 有人搶到挑戰席

第一位按下 `我要挑戰擂主` 的登入者：

1. 系統鎖定挑戰席。
2. 全場顯示：
   - `挑戰者準備中`
   - `擂主守擂中`
   - `挑戰者還有 120 秒上傳 Drop`
3. 挑戰者被導到上傳流程。
4. 擂主與觀眾留在戰場等待。

### 3. 挑戰者完成上傳

上傳完成後：

1. 建立下一場 battle。
2. 上一場 winner 變成 A side / 擂主。
3. 新挑戰者變成 B side。
4. 直接進入下一場戰場倒數與 5 秒預播。
5. 舊成果卡仍可保留，但戰場 UI 以「守擂下一場」為主。

### 4. 挑戰者超時

若 120 秒內沒有完成上傳：

1. 釋放挑戰席。
2. 原 battle 正常結束。
3. 觀眾可以看成果卡或回鬥歌場。
4. 不再重新開第二輪 5 秒倒數。

### 5. 沒有人挑戰

5 秒倒數結束沒人按：

1. 原 battle 正常進 `finished`。
2. 直接自動進成果卡，不再停留在守擂倒數畫面。
3. 戰鬥池不殘留熱鬥中卡片。

## V1 規則

### 觸發條件

只在以下條件全部成立時觸發：

- battle 是 90s Drop Battle。
- 有有效 winner。
- 全場至少有 1 張觀眾票。
- 不是 0:0 no contest。
- battle 尚未進入已清場狀態。

不觸發：

- 24H Full Song battle。
- no contest。
- 取消場。
- 已被系統清理的過期場。
- 已有下一場接上的場。

### 搶挑戰權

- 時間：5 秒。
- 按鈕：`我要挑戰擂主`。
- 只允許登入者按。
- 第一個成功寫入的人取得挑戰席。
- 若使用者是擂主本人，不允許按。
- 若使用者已經有 active Drop challenger state，不允許按。
- 若使用者已經有 active Drop founder state，不影響是否能挑戰，但仍須遵守現有 Drop challenger state 限制。

### 上傳時間

- 搶到挑戰席後給 120 秒上傳。
- 120 秒從 challenge slot 被 claim 的時間開始算。
- 超時未完成，上傳資格失效。
- 第一版不做延長時間。

### 擂主歌曲

- 擂主使用上一場 winner 的 Drop，不需要重新上傳。
- 擂主資料要沿用上一場 winner：
  - user id
  - fighter name
  - song name
  - audio path
  - cover
  - avatar
  - AI tool
  - lyrics
  - rank

### 新挑戰者歌曲

- 挑戰者需要上傳新的 Drop。
- 類型 / genre 第一版建議沿用上一場 battle genre。
- 不讓挑戰者改 genre，避免守擂被跨類型亂打。

## 資料模型建議

第一版可以新增一張表，不硬塞進現有 `battles` 或 `battle_queue`，降低破壞面。

### 新表：`drop_battle_rematch_claims`

用途：記錄某場 battle 結束後的 5 秒挑戰權與 120 秒上傳期。

欄位草案：

- `id uuid primary key`
- `source_battle_id uuid not null`
- `winner_user_id uuid not null`
- `winner_side text not null`
- `claimer_user_id uuid`
- `status text not null`
  - `open`
  - `claimed`
  - `uploaded`
  - `expired`
  - `cancelled`
- `claim_window_started_at timestamptz not null`
- `claim_window_ends_at timestamptz not null`
- `claimed_at timestamptz`
- `upload_deadline_at timestamptz`
- `next_battle_id uuid`
- `next_queue_id uuid`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

必要 constraint：

- `source_battle_id` 應唯一，避免同一場 battle 開多個 5 秒接戰。
- 同一個 `source_battle_id` 只能有一個有效 claimed user。
- `status` 用 check constraint 限制合法值。

### 為什麼不用直接重開 battle_queue？

原因：

- `battle_queue` 已經承擔 founder / challenger / matched 狀態，直接塞守擂狀態會讓現有規則變難懂。
- 5 秒接戰是「賽後事件」，不是一般公開戰帖。
- 獨立表可以清楚記錄誰搶到、何時超時、是否接成下一場。

## API 設計

### `POST /api/battle-pool/open-rematch-window`

用途：battle 結束後建立 5 秒挑戰窗口。

呼叫時機：

- battle 結算成功後。
- 有 winner 且不是 no contest。

輸入：

- `battleId`
- `winnerSide`

輸出：

- `claimId`
- `claimWindowEndsAt`

安全：

- server 驗證 battle 結果，不相信 client 傳 winner。
- 若已存在 open / claimed claim，直接回現有資料。

### `POST /api/battle-pool/claim-rematch`

用途：登入者搶挑戰席。

輸入：

- `sourceBattleId`

規則：

- 必須登入。
- 必須在 5 秒內。
- 不能是 winner user。
- 不能已有 active Drop challenger state。
- 第一個成功 update 的人取得資格。

輸出：

- `claimId`
- `uploadDeadlineAt`
- `uploadUrl`

競態處理：

- 用單一 SQL update 或 RPC 原子化：
  - `status = 'open'`
  - `claim_window_ends_at > now()`
  - `claimer_user_id is null`
- 成功更新 1 row 才算搶到。

### `POST /api/battle-pool/complete-rematch-upload`

用途：挑戰者上傳完成後，把擂主和挑戰者接成下一場。

輸入：

- `claimId`
- 挑戰者上傳後的 queue/audio metadata

規則：

- 必須是 claim owner。
- 必須在 `upload_deadline_at` 前完成。
- 建立新 battle。
- `next_battle_id` 寫回 claim。
- claim status 改 `uploaded`。

### `POST /api/battle-pool/expire-rematch-claims`

用途：清掉超時 claim。

可由：

- client 進場時呼叫。
- Vercel Cron 週期呼叫。
- battle fallback processor 順便處理。

規則：

- `open` 且 5 秒過期 -> `expired`
- `claimed` 且 120 秒過期 -> `expired`

## 前端實作點

### Battle Arena

主要檔案：

- `src/app/battle/[id]/battle-room-client.tsx`

新增 UI 狀態：

- `rematchWindow`
- `rematchClaim`
- `rematchCountdown`
- `uploadCountdown`

新增畫面：

1. Winner reveal 後的 5 秒接戰 overlay。
2. 挑戰者準備中 overlay。
3. 擂主守擂中提示。
4. 超時 / 沒人挑戰的退場提示。

文案：

- `有人要挑戰擂主嗎？`
- `5 秒內搶挑戰席`
- `搶到後有 120 秒上傳 Drop`
- `我要挑戰擂主`
- `挑戰者準備中`
- `擂主守擂中`
- `挑戰者上傳逾時，這場 Battle 已結束`

### 上傳流程

主要檔案：

- `src/app/battle/setup/page.tsx`
- `src/app/battle/hook-cut/page.tsx`

新增 query：

- `rematchClaimId`
- `sourceBattleId`
- `defenderUserId`
- `genre`

上傳頁顯示：

- `你正在挑戰擂主`
- `請在 120 秒內完成上傳`
- `這場會沿用上一場 genre`

### 鬥歌池

主要檔案：

- `src/app/battle/page.tsx`

V1 可以先不在鬥歌池新增複雜卡片。

只需要：

- 若有 `claimed` rematch，可顯示小提示：`擂台熱鬥中`
- 若沒有資料，不影響現有公開挑戰池。

## Realtime

建議第一版用 Supabase Realtime channel broadcast 或 polling fallback。

需要同步給觀眾：

- 5 秒倒數是否開始。
- 是否有人搶到挑戰席。
- 挑戰者上傳倒數。
- 下一場 battle 是否建立。

第一版可接受：

- 寫 DB 後 client 每 2 秒查一次。
- 有 Realtime 更好，但不要讓 Realtime 成為唯一可靠來源。

## 清場規則

需要特別小心，避免戰鬥池殘影。

### 有人挑戰且成功上傳

- source battle 可以保留 result / history。
- next battle 建立後，觀眾導向 next battle。
- source battle 不應再顯示可挑戰。

### 有人挑戰但超時

- claim -> `expired`
- source battle -> 正常 finished
- battle_queue -> completed / finished，不殘留 matched。

### 沒人挑戰

- claim -> `expired`
- source battle -> 正常 finished
- 戰鬥池不顯示熱鬥中。

## No Contest 規則

必須保留現有原則：

- 0:0 no contest 不觸發 5 秒接戰。
- no contest 不產生成果卡。
- no contest 不進榮譽榜。
- no contest 沒有擂主。

原因：

- 沒有觀眾投票代表沒有市場驗證。
- 不能讓無觀眾場次產生守擂權。

## 風險與取捨

### 風險 1：狀態變複雜

解法：

- 新增獨立 `drop_battle_rematch_claims` 表。
- 不直接把 rematch 狀態塞進既有 battle_queue。

### 風險 2：使用者搶到但不上傳

解法：

- 120 秒 deadline。
- 超時自動釋放。
- 第一版不排隊，避免更多狀態。

### 風險 3：多人同時按挑戰

解法：

- DB 原子 update。
- 只有第一個成功。
- 其他人看到 `已有人取得挑戰席`。

### 風險 4：擂主離開頁面

解法：

- 擂主不需要操作。
- 擂主 Drop 已在 source battle 裡，可直接被下一場沿用。
- 擂主回來時可進 next battle。

### 風險 5：觀眾等待太久

解法：

- 5 秒只等搶席。
- 120 秒上傳期間畫面要清楚顯示倒數。
- 超時就結束，不拖。

## 分階段實作

### Phase 1：資料與 API

- 新增 SQL migration。
- 新增 rematch claims table。
- 新增 claim / expire / complete API。
- 補 node tests：
  - no contest 不開 rematch。
  - 5 秒過期不能 claim。
  - 同一場只能一人 claim。
  - winner 不能 claim 自己。
  - 120 秒過期不能 complete upload。

### Phase 2：Battle Arena UI

- Winner reveal 後顯示 5 秒接戰 overlay。
- 按 `我要挑戰擂主` 串 API。
- 顯示有人搶到挑戰席。
- 顯示 120 秒上傳倒數。

### Phase 3：上傳接續

- 上傳頁支援 `rematchClaimId`。
- 完成上傳後呼叫 complete API。
- 建立下一場 battle。
- 觀眾導向下一場。

### Phase 4：清場與 QA

- 補 expire cron / fallback。
- 檢查 battle pool 不殘留。
- 檢查 production：
  - 0:0 no contest
  - 正常 winner 無人挑戰
  - 有人 claim 但超時
  - 有人 claim 並完成上傳
  - 擂主離開再回來
  - 手機畫面

## 第一版不做

- 多人排隊。
- 連勝獎勵。
- 擂主主動拒絕挑戰。
- 觀眾集氣延長倒數。
- 多擂台轉播牆。
- 24H Full Song 守擂。

## 建議開工順序

下一個對話若要實作，建議直接下這句：

`依照 docs/drop-battle-king-of-hill-10s-plan.md 實作 Phase 1 到 Phase 4，先不要做多人排隊與連勝獎勵。`

實作時必須先跑：

- `npx tsc --noEmit`
- `npm test`
- `npm run lint`
- `npm run build`

若包含 production deploy，還要做：

- Supabase SQL 套用確認。
- Vercel production deploy。
- `https://aipoger.com` 實站檢查。
