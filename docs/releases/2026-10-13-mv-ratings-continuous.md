# MV 統一觀看、十分制與連播發布證據

- 正式應用：`9cb1b9b`，分支 `codex/homepage-mv-editorial`；核心實作 `9d31cce`，最後版本補上中斷／重開連播的狀態清理、評論回傳去重與MV摘要no-store。
- Vercel：`dpl_CqDWx7SYkY1t2ktMpjMxqpZfy8xN`，READY並promote至aipoger.com。部署URL：`https://aipoger-web-rnz8-i1tm3h0pm-yohungs-projects.vercel.app`。保護環境 `/mv?lang=zh`、`/api/mv/discovery` HTTP200後才promote；正式站首頁／MV／Auth HTTP200，MV discovery回no-store及評分摘要。
- 572項測試：541通過、31既有可選DB測試略過、0失敗。TypeScript、eslint（0 errors／15既有warnings）、本機與雲端正式build通過。新增API身份／資格／分數驗證、評價送出／失敗／重試、YT事件／自動播放阻擋、完整篩選佇列與重開狀態測試。
- Supabase新增migration已套用；現行檔案 `supabase/migrations/20261013131336_mv_ratings.sql` 的timestamp對齊實際migration history `20261013131336`／`mv_ratings`（初始CLI產生檔名後按實際history對齊，SQL正文未更動）。`mv_work_ratings`、`mv_review_receipts` 為service-only、RLS enabled；兩個RPC皆SECURITY INVOKER、固定search_path、撤銷public／anon／authenticated執行。
- `tests/sql/mv-reviews.sql` 已在交易內實測：8→10修改分數不加人、另一會員6分後平均8.0／2人；作者不可自評但可留言；11分拒絕；receipt重送不重複留言；moderation／隱藏作品不公開計算；匿名／會員沒有直接表或RPC權限。所有測試fixture、評分、留言、通知與quota皆ROLLBACK；未新增永久測試會員或對真實作品送出測試評價。
- Advisor：新增兩筆service-only表無policy的INFO，無新增WARN；既有可執行definer RPC與Auth密碼保護警告未作本次範圍外變更。[RLS advisor說明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。
- 正式公開資料驗收當下：53支MV／3個頻道，精選1支、卡片52支，原作品ID、歷史連結與公開資格仍保留。沒有評分時顯示尚未評分；公開回應僅平均分／人數，不含原始rater身份。正式review GET公開作品200、不存在作品404、非法ID400；未登入POST401。
- 四語320px手機與桌機：十個數字同排，無頁面水平溢出，卡片最多兩行，視窗完整標題用緊湊換行。歌名／評論／分享接收入口不自動播放；封面播放直接進統一評價視窗。Owner真實session可評他人，自己的分數停用且可留言。
- 真實YouTube實測：第一支204.681秒播完，原widget6自動接播第二支252.141秒，清單由1／53→2／53，原作品ID、標題、連結及評價區同步；手動前後切換保留唯一iframe。正式站已實測連播、manual next／previous及未送出草稿按作品保留；所有測試文字只填入未送出欄位，離開驗證視窗即清除。
- 證據圖保存於私人工作區 `outputs/aipoger-mv-ratings-release/`，不提交到網站或雲端部署。
- Credit未啟用；評分／留言不發扣點，Heart週支持／首頁精選／Showtime與Battle規則不變。

播放器事件與自動播放阻擋依[YouTube官方IFrame API](https://developers.google.com/youtube/iframe_api_reference)；RPC與grants依[Supabase官方資料庫函式說明](https://supabase.com/docs/guides/database/functions)。
