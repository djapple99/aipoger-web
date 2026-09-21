# 2026-09-21 Choice 整批發布

範圍：Showtime 一大兩小／更多 Choice、分享使用同一封面、最多十首勾選後確認、直接指定歌曲順位、文字與歌單手動整批儲存。

- 以已發布 `3803169` 為基底建立乾淨工作樹；未包含其他本地任務或設計預覽資料。
- 459 tests pass、0 skipped；lint 0 errors / 16 existing warnings；production build（本地使用佔位 public Supabase 設定）成功，TypeScript 通過。
- 本地同一編輯器實測：選十首、確認、改順序、輸入中英文均不送儲存；按儲存一次送出。失敗保留輸入並可重試。中英日韓手機無橫向溢出，桌機大圖與兩小圖底部對齊。
- Supabase migration 已套用，ledger `20260921132314_creator_choice_batch_editor`；檔案 `20260921150000_creator_choice_batch_editor.sql`。加入僅 service_role 可呼叫的交易式儲存 RPC、過期編輯衝突保護；intro constraint 對齊既有 UI/API 3000 字。PGlite 驗證交易／權限／順序／文字上限。
- Vercel 使用雲端環境設定重新建置，不上傳本地環境檔，不使用本地佔位設定的 prebuilt 產物。

部署與正式站驗證結果於發布後補記。
