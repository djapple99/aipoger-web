# CURSOR_TODO — 給 Cursor / 代理用

## 每次開專案請先做

1. **完整讀過本檔**再改程式。
2. 從下方「待辦」**由上而下**處理第一個未完成項目。
3. **每完成一個可獨立說明的功能**：只 `git add` 該功能相關檔案 → `git commit -m "…"`（一句話、說清行為與原因）→ `git push`。不要把不相關的大改塞在同一個 commit。
4. 完成後把該項在本文改成 `[x]`，必要時在「已完成」補一行摘要。

## 待辦（由上而下）

- [ ] `/battle` 列表頁：使用者可見文案改接 `useI18n()`（`src/app/battle/page.tsx`）
- [ ] `/auth/callback`：狀態與錯誤提示改接 `useI18n()`（`src/app/auth/callback/page.tsx`）
- [ ] `hook-cut` 等仍使用頁內字典 `T` 的頁面：逐步合併到 `src/lib/i18n.tsx`，避免兩套翻譯來源
- [ ] 其餘路由若有硬編碼中文／英文 UI 字串，比照首頁／登入頁接上 `useI18n()`
- [ ] 部署前確認 Supabase 已套用 `supabase/storage_battle_audio.sql`（含圖片 MIME），且 Realtime publication 含 `battles`、`chat_messages`、`battle_votes`（說明見 `supabase/chat_and_votes.sql` 檔頭註解）

## 已完成（維護用）

- [x] 首頁、登入頁、左上角 `NavHomeLink`：雙語、`?lang=` 與 `document.documentElement.lang`
- [x] 鬥歌資料 `setup`：圖檔上傳帶正確 `contentType`、未登入導向 `/auth`、auth bypass 時略過遠端圖檔上傳；`battle-audio` bucket SQL 擴充圖片 MIME
