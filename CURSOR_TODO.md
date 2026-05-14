# CURSOR_TODO — AIPOGER 開發任務清單

> 由 Mavis（AI助理）維護，每次開專案請先閱讀此檔案。
> 完成每個任務後 commit + push，主動更新進度。

---

## 🚨 優先任務（請先處理）

### 1. 把其他頁面接上 i18n 雙語系統
- 狀態：✅ i18n.tsx 已建立，EN/中 按鈕已就緒
- 待做：`src/app/page.tsx`（首頁）、`src/app/auth/page.tsx`（登入頁）
- 說明：
  ```typescript
  import { useI18n } from '@/lib/i18n';
  // 在元件裡呼叫 const { t, lang } = useI18n();
  // 然後把靜態中文換成 t('key')
  ```
- 首頁要翻的 key 在 `src/lib/i18n.tsx` 的 dict.zh / dict.en 裡已有
- 登入頁的 key 也要加進 dict

### 2. 頭像上傳到 Supabase Storage
- 狀態：⚠️ setup 頁有上傳 UI 但還沒串實際上傳到 Storage
- `/battle/setup/page.tsx` 的 `uploadFile()` 函數需要完整實作
- 確認 `battle-audio` Storage bucket 已有 `avatars/` 資料夾權限

### 3. Supabase Realtime 啟用（重要！）
- 請去 Supabase Dashboard → 你的專案 → Database → Replication
- Enable Logical Replication 開關打開
- 把 `battles`、`chat_messages`、`battle_votes` 三個表加到 Replication Source
- 否則即時聊天、投票即時更新都無法運作

---

## 📋 待辦任務（依序做）

### 4. 首頁「觀戰聽歌」按鈕功能
- 目前 `/battle` 連結是對的，但需要有「顯示目前正在進行的鬥歌」列表
- 從 `battles` 表撈 `status = 'live'` 的 battle，顯示在觀戰頁

### 5. 投票功能完整串接
- `/battle/[id]` 頁的投票按鈕目前有 UI，但需要確認 `cast_vote` RPC 有正確運作
- 投票成功後要有視覺回饋（按鈕變色、票數即時更新）

### 6. 每日簽到點數系統
- `award_daily_login_points()` RPC 已經在 SQL 裡了
- 在首頁載入時自動觸發一次（只執行一次/天）
- 在 HomeAuthBar 顯示「簽到+100」的 toast 提示

### 7. 段位/天梯系統（PPT要求 15 級）
- 目前完全沒有實作
- 需要 `battles` 表加 `winner` 欄位、`user_profiles` 表加 `level`、`wins`、`losses`
- 等 MVP 功能做完再來處理這個

---

## ✅ 已完成（不用動）

- ✅ Google OAuth 登入
- ✅ 旋轉唱片擂台 `/battle/[id]`
- ✅ 即時聊天牆（chat_messages + Realtime）
- ✅ 配對過場動畫 `/battle/matchmaking`
- ✅ Hook 上傳 + Mastering（OfflineAudioContext WAV 渲染）
- ✅ i18n Provider + EN/中 Toggle

---

## 📝 提交規範

- 每個功能完成後：**git add . → git commit -m "feat: 簡短描述" → git push origin main**
- Commit 訊息格式：`feat: 做了什麼` / `fix: 修了什麼 bug` / `refactor: 重構`
- 不要一次 commit 太大量的改動，分功能 commit 比較好追蹤

---

最後更新：2026-05-14