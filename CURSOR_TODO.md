# CURSOR_TODO — AIPOGER 開發任務清單

> 由 Mavis（AI 助理）維護，**每次開專案請先閱讀此檔案**，依優先順序處理。  
> 每完成一個可獨立說明的功能：**git add → git commit -m "feat|fix|docs: …" → git push**。

---

## 優先任務（狀態摘要）

| 項目 | 狀態 |
|------|------|
| i18n、頭像／封面上傳 | ✅ |
| AI 工具欄位與擂台 🤖 顯示 | ✅ |
| Realtime（battles / chat / votes） | ✅ |
| `user_profiles` APC／等級／勝敗欄位 | ✅ |
| 擂台 RLS 讀取 + Storage 音檔 signed URL | ✅ 見 `supabase/battle_arena_rls_and_storage.sql`（**請在 SQL Editor 執行**） |
| 首頁每日簽到 `award_daily_login_points` | ✅ `src/app/page.tsx` |
| 首次登入來賓禮 `award_signup_bonus` | ✅ `src/app/auth/callback/page.tsx` |
| 觀戰人數（Presence）+ i18n | ✅ `src/app/battle/[id]/page.tsx` |
| Hook 進配對前 APC ≥ 200 | ✅ `src/app/battle/hook-cut/page.tsx` |

---

## 待驗證／細修

- **投票**：`/battle/[id]` 與 `cast_vote` RPC 在正式環境再點一次流程確認。
- **配對端到端**：setup → hook-cut → matchmaking → arena，確認 `battles` 有列且 `audio_*_path` 正確。

---

## 提交規範

- 每個功能完成後：**commit + push**，訊息用 `feat:` / `fix:` / `docs:` 等前綴。
- 避免單一 commit 混雜多個無關主題。

---

最後更新：2026-05-14
