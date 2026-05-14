# CURSOR_TODO — AIPOGER 開發任務清單

> 由 Mavis（AI助理）維護，**每次開專案請先閱讀此檔案**，依優先順序處理。  
> 每完成一個可獨立說明的功能：**git add → git commit -m "feat|fix|docs: …" → git push**。

---

## 🚨 優先任務（請先處理）

## 🚨 優先任務

### 1-2. i18n / 頭像上傳
- **狀態：✅ 已完成**

### 3. AI 工具標示（廣告商務核心 ⚠️）— 正在做
- **`battles` 表新增欄位**：`ai_tool_a`、`ai_tool_b`（TEXT）
- **Battle 擂台 UI**：每位參賽者的唱片下方顯示 `🤖 製作工具：{工具名}`
- 若 setup 頁有「選擇 AI 工具」選項則串上；若沒有則直接在手動填入

### 4. Supabase Realtime 啟用
- **狀態：✅ 已完成** — `battles`、`chat_messages`、`battle_votes` 已啟用

### 5. SQL Migration（點數+等級系統）
- **狀態：✅ 已完成** — `user_profiles` 已有 `apc_balance`、`level`、`total_wins`、`total_losses`、`last_sign_in_at`、`ai_tool_preference`

---

## 📋 待辦任務（依序做）

### 6. 首頁「觀戰聽歌」— 進行中的鬥歌列表
- **狀態：✅ 已完成**

### 7. 投票功能完整串接
- `/battle/[id]` 投票與 `cast_vote` RPC 行為與視覺回饋需再驗證。

### 8. 每日簽到點數系統
- `award_daily_login_points()` 等 RPC 接上首頁載入與 toast。

### 9. 來賓禮 1000 點 + 挑戰費扣 200 點
- `award_signup_bonus()` RPC 需在使用者首次登入時觸發
- 配對前需檢查 APC 餘額是否 ≥ 200，不夠則提示

### 10. 等級顯示 + 贏家結算
- 在使用者資料卡顯示 Lv. 等級名稱（中英對照見下）
- 鬥歌結束後更新 `battles.winner` 並結算勝敗 + APC
- 等級計算函數 `calculate_user_level(wins)` 已存在於 DB
- 等級名稱對照：
  - Lv.1 Signal Starter（訊號啟動者）
  - Lv.2 Melody Crafter（旋律達人）
  - Lv.3 Lyric Ghost（詞曲鬼匠）
  - Lv.4 Rhythm Pilot（節奏動感領航員）
  - Lv.5 Acoustic Philosopher（聲學哲學家）
  - Lv.6 Spirit Pharaoh（靈性薩滿法老王）
  - Lv.7 Symphony Pope（交響樂之教皇）
  - Lv.8 Top 100 Titan（百大 DJ 泰坦）
  - Lv.9 Melody Monarch（優美旋律之王）
  - Lv.10 Pure Sound Master（音純大師）

---

## ✅ 已完成（摘要）

- Google OAuth 登入、`/battle/[id]` 擂台、聊天、配對、`hook-cut` WAV 上傳、i18n Provider + 語系切換、首頁/登入/觀戰列表與 setup 圖檔上傳。

---

## 📝 提交規範

- 每個功能完成後：**commit + push**，訊息用 `feat:` / `fix:` / `docs:` 等前綴。
- 避免單一 commit 混雜多個無關主題。

---

最後更新：2026-05-14
