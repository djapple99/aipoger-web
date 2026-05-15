# CURSOR_TODO — AIPOGER 開發任務清單

> 由 Mavis（AI 助理）維護，**每次開專案請先閱讀此檔案**，依優先順序處理。  
> 每完成一個可獨立說明的功能：**git add → git commit -m "feat|fix|docs: …" → git push**。

---

## 🚨 優先任務（請在 SQL Editor 執行）

### 🔴 SQL 執行（用戶需手動貼上執行）
在 Supabase SQL Editor 執行以下所有 SQL：

```sql
-- 1. 重建 battle-audio storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('battle-audio', 'battle-audio', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS：允許所有類型上傳
DROP POLICY IF EXISTS "Allow all battle-audio upload" ON storage.objects;
CREATE POLICY "Allow all battle-audio upload" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'battle-audio');

DROP POLICY IF EXISTS "Allow all battle-audio read" ON storage.objects;
CREATE POLICY "Allow all battle-audio read" ON storage.objects
FOR SELECT TO authenticated, anon USING (bucket_id = 'battle-audio');

-- 3. 確認 battles 表有正確欄位
ALTER TABLE battles ADD COLUMN IF NOT EXISTS ai_tool_a TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS ai_tool_b TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS winner TEXT;

-- 4. 給測試用戶 1000 APC（你的 user_id）
UPDATE user_profiles SET apc_balance = 1000 WHERE id = '3336dd37-7fe8-4203-bd55-9eb1067ca047';
-- 也給另一個測試帳號（用 FB 登入的）1000 APC

-- 5. attempt_matchmaking 權限
GRANT EXECUTE ON FUNCTION public.attempt_matchmaking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attempt_matchmaking(uuid) TO anon;
```

### 🔴 代碼修復（Cursor 直接做）

**問題 1：配對卡在 matchmaking 頁**
- `attempt_matchmaking` RPC 被呼叫但可能失敗
- 原因：RLS 或權限問題
- 解決：確保 `attempt_matchmaking` 的 `GRANT EXECUTE` 已執行（見上面 SQL）
- 同時檢查 `battle_queue` 插入成功後 RPC 才被呼叫

**問題 2：擂台無資料顯示**
- 擂台讀取 `battles` 表時 RLS 擋住
- 解決：執行上面 SQL 第 6 行
- 確保擂台用 `createSignedUrl` 讀取 Storage 音檔

**問題 3：擂台聲音播放**
- `VinylDisc` 組件的 audio URL 要從 Storage 取 signed URL
- 在 `loadBattle` 裡呼叫 `createSignedUrl(audio_a_path)`

**問題 4：來賓禮 1000 點**
- 在 `auth/callback` 或首頁載入時呼叫 `award_signup_bonus()` RPC

**問題 5：AI 工具標示顯示**
- 確認 `ai_tool_a`、`ai_tool_b` 顯示在擂台 VinylDisc 下方
- 格式：`🤖 {ai_tool_a}` / `🤖 {ai_tool_b}`

### 🟡 測試驗證（Cursor 完成後告知）
- 走完整流程：setup → hook-cut → matchmaking → arena
- 確認擂台顯示頭像、封面、曲目名、AI 工具標示
- 確認聲音可以播放
- 確認觀戰人數顯示
- 拿到真實 UUID 的擂台 URL（不是 mock- 開頭）

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
