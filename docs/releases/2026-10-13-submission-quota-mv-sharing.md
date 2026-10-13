# 投稿額度、MV分享與評論導覽發布證據

產品發布：2026-10-13 Asia/Taipei。應用 `a01f7aa1f9ba110c63c4b12d57fd9f3efe5f2f60`，分支 `codex/homepage-mv-editorial`。正式網址 [MV](https://aipoger.com/mv?lang=zh)、[創作者中心](https://aipoger.com/profile?lang=zh)。

## 正式部署

- 投稿數量先以 `f47b35e` 發布，Vercel `dpl_G3scGvCJZk18BJQdKgZ6n8RAVvqr` READY／promote。
- 最終加入MV分享與評論提示，Vercel `dpl_7j4ZennvAK8X7dXh2PemENqmWjKo` READY，先使用正式環境與skip-domain部署；保護網址以Vercel curl驗證200後promote。正式apex的MV與Profile回200，未登入私人Creator Center API回401。
- 本機／雲端build、TypeScript通過；lint 0 errors／15既有warnings。555項測試中524通過、31既有可選DB略過、0失敗。

## 投稿資料庫規則

- `supabase/migrations/20261013115506_creator_upload_owner_unlimited.sql` 已套用。取代三個既有function，保留觸發器、RLS／grants與已存在的quota歷史，不修改原歌曲、封面、audio、Heart或Battle資料。
- 一般會員的連結／音檔共用個人168小時三首；失敗與預覽不消耗，刪除不退。取消同作者同曲風五首active的庫存上限。
- Owner數量豁免查Auth的confirmed primary email及既有owner identity名單；不依user metadata、profile is_admin或客戶端參數。仍驗證created_by與caller UID相同。Owner quota回傳`unlimited:true,limit:null`，前端顯示不限數量，不以虛構的大額數字實現。
- `tests/creator-upload-week.sql`以BEGIN／ROLLBACK驗證第三首可成功、第四首被擋、刪除／編輯不退、168小時到期重開、同曲風至少七首active可存在、偽造claims仍受三首限制。
- `tests/creator-upload-owner.sql`在真正authenticated RLS role下，六首交錯連結／音檔可成功、quota仍不消耗，冒用created_by仍被拒。全部ROLLBACK；重查0件`Quota rollback`測試作品，沒有永久測試投稿／評論／Heart。
- 兩個SECURITY DEFINER函式鎖empty search_path，quota RPC僅authenticated可呼叫；觸發器函式不向anon／authenticated開放execute。Advisor仍列既有service-only RLS空policy、authenticated SECURITY DEFINER與Auth密碼保護提醒，本次不新增其他管理權限或展開無關hardening。[資料庫檢查說明](https://supabase.com/docs/guides/database/database-linter)。

## MV互動與畫面驗收

- 精選、卡片及觀看視窗加入分享鍵；每件作品的站內連結保留lang與原track ID。系統分享、取消、複製、原生失敗回退及手動連結由runtime測試覆蓋。背景自動化Chrome的原生分享完成狀態未冒充實機收件分享驗收，沒有向他人傳送測試訊息。
- 真實公開分享連結可打開對應的原MV／評論視窗；只顯示封面，不自動播放。超過首12張的作品及不可公開ID由runtime驗證。分享不加Heart／排行／Credit。
- MV留言視窗使用orange scrollbar，真實computed color為`rgb(255,143,50) rgb(24,18,12)`；評論仍在下方時顯示可點的向下提示，點擊後留言欄可見且提示收起。播放與捲動仍保留草稿，不自動POST。
- 320px手機驗證無橫向溢出；長卡片標題收為兩行，實測58px／29px行高，原完整文字、title與作品資料保留。完整歌名可從封面打開觀看視窗閱讀；本次不新增跑馬燈或將卡片歌名既有Explore連結改成新路由。
- 新分享／捲動提示四語已驗證，Owner連結／音檔的不限數量提示四語亦驗證。正式Owner畫面、可見評論欄與Orange scrollbar完成檢查；沒有藉UI提交測試評論或點Heart。
- 圖像證據在本機工作區`outputs/aipoger-creator-center-release/`：`owner-quota-desktop.jpg`、`owner-quota-file-mobile.jpg`、`mv-comments-scroll-production.jpg`，並保留local桌機／手機問題與修正驗收。

## 點數邊界及回復

- 使用者定案每日登入15、至少20字有效評論10、每期三首免費後額外每首60；Owner免扣。整套餘額／流水／發扣點仍待實作；當前第四首仍受三首額度限制，未自動領點、扣點或販售額外投稿，短評論仍可使用。
- 任務開始正式版為`68949a5`／`dpl_S9cenbAZ6TEnKTq5AC5siMwe6w6S`。回復舊程式時須一併恢復舊quota RPC與count／public guard定義，因舊UI不支援Owner nullable limit。三個原function定義存於任務本機`/tmp/aipoger-quota-function-rollback.sql`；沒有需回填的資料更改。任何生產回復須依当次授權處理。
