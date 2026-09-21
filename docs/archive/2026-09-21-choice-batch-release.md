# 2026-09-21 Choice 整批發布

範圍：Showtime 一大兩小／更多 Choice、分享使用同一封面、最多十首勾選後確認、直接指定歌曲順位、文字與歌單手動整批儲存。

- 以已發布 `3803169` 為基底建立乾淨工作樹；未包含其他本地任務或設計預覽資料。
- 459 tests pass、0 skipped；lint 0 errors / 16 existing warnings；production build（本地使用佔位 public Supabase 設定）成功，TypeScript 通過。
- 本地同一編輯器實測：選十首、確認、改順序、輸入中英文均不送儲存；按儲存一次送出。失敗保留輸入並可重試。中英日韓手機無橫向溢出，桌機大圖與兩小圖底部對齊。
- Supabase migration 已套用，ledger `20260921132314_creator_choice_batch_editor`；檔案 `20260921150000_creator_choice_batch_editor.sql`。加入僅 service_role 可呼叫的交易式儲存 RPC、過期編輯衝突保護；intro constraint 對齊既有 UI/API 3000 字。PGlite 驗證交易／權限／順序／文字上限。
- Vercel 使用雲端環境設定重新建置，不上傳本地環境檔，不使用本地佔位設定的 prebuilt 產物。

## 正式發布結果

- App commit `6564a8a`，已推送 `codex/choice-batch-release`。
- Vercel `dpl_5sqqrRUNCkQQU72FmTruYdhV6gdw` READY，alias `aipoger.com` / `www.aipoger.com`。部署網址：https://aipoger-web-rnz8-m0eymhehx-yohungs-projects.vercel.app
- 正式七個入口 `/`、`/auth`、`/listen-bar`、`/music-analysis`、`/battle/setup?lang=zh`、`/rank?lang=zh`、`/profile/choice?lang=zh` 全部 HTTP 200；私有 Choice API 未登入 GET/PATCH 均 401。
- 最新 Choice 的 Open Graph 與 Twitter 圖片皆等於公開 API 的封面 URL，圖片回應 200/image/png。外部平台先前快取的縮圖未代為刷新。
- 正式 Chrome 已登入編輯器讀取 87 首收藏／4 期，10 首上限與數字順位控制正常。暫改中英文標題及第十首移到第一首，顯示尚未儲存；另讀公開 API 確認標題與順序維持原值。試編已完整還原，未按儲存、發布或撤回。
- 桌機 Showtime 一大兩小實際封面排列正確；390px 手機 Showtime 與編輯器無橫向溢出。正式瀏覽器 error logs 為空。
- migration 後 collections=4 / items=30 與之前一致；RPC grants 僅 postgres/service_role，固定 search_path；intro constraint 3000 字已確認。實際儲存交易由本地同元件測試與 PGlite 驗證，未為 QA 改寫使用者正式歌單。

