# CURSOR_TODO — AIPOGER 開發任務清單

> 由 Mavis（AI助理）維護，**每次開專案請先閱讀此檔案**，依優先順序處理。  
> 每完成一個可獨立說明的功能：**git add → git commit -m "feat|fix|docs: …" → git push**。

---

## 🚨 優先任務（請先處理）

### 1. 把其他頁面接上 i18n 雙語系統
- **狀態：✅ 已完成** — `src/app/page.tsx`、`src/app/auth/page.tsx`、`src/components/nav-home-link.tsx` 已使用 `useI18n()`；字典在 `src/lib/i18n.tsx`。
- **待做：** `/battle` 內嵌預覽頁其餘字串、`/battle/[id]`、`hook-cut` 內建 `T` 字典、`/auth/callback` 等可續接。

### 2. 頭像上傳到 Supabase Storage
- **狀態：✅ 已完成** — `src/app/battle/setup/page.tsx` 的 `uploadFile()` 上傳至 `battle-audio` bucket（路徑 `{userId}/avatar|cover.ext`）；請確認遠端已套用 `supabase/storage_battle_audio.sql`（含圖片 MIME）。

### 3. Supabase Realtime 啟用（重要！）
- **狀態：⏳ 須在 Dashboard 手動操作**（無法由 repo 代開）
- Supabase Dashboard → Database → Replication：啟用 Logical Replication，將 `battles`、`chat_messages`、`battle_votes` 加入 publication。  
- 說明亦見 `supabase/chat_and_votes.sql` 檔頭註解。

---

## 📋 待辦任務（依序做）

### 4. 首頁「觀戰聽歌」— 進行中的鬥歌列表
- **狀態：✅ 已完成** — 造訪 `/battle`（無 `?matchId=`）會從 `battles` 撈 `status = 'live'`，每列連結至 `/battle/[id]` 即時擂台。

### 5. 投票功能完整串接
- `/battle/[id]` 投票與 `cast_vote` RPC 行為與視覺回饋需再驗證（見該頁實作）。

### 6. 每日簽到點數系統
- `award_daily_login_points()` 等 RPC 接上首頁載入與 toast。

### 7. 段位/天梯系統（PPT 15 級）
- MVP 後再規劃。

---

## ✅ 已完成（摘要）

- Google OAuth 登入、`/battle/[id]` 擂台、聊天、配對、`hook-cut` WAV 上傳、i18n Provider + 語系切換、首頁/登入/觀戰列表與 setup 圖檔上傳。

---

## 📝 提交規範

- 每個功能完成後：**commit + push**，訊息用 `feat:` / `fix:` / `docs:` 等前綴。
- 避免單一 commit 混雜多個無關主題。

---

最後更新：2026-05-14
