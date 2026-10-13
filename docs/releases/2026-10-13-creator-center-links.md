# 創作者中心與連結預覽投稿發布證據

正式發布：2026-10-13；app `68949a5795ac47e3ceaf44c5e9e0df4625b6452a`，分支 `codex/homepage-mv-editorial`。應用從乾淨隔離 checkout 部署，未混入 main 工作區其他程式變更。

Vercel `dpl_S9cenbAZ6TEnKTq5AC5siMwe6w6S` READY；`https://aipoger-web-rnz8-42vt592k4-yohungs-projects.vercel.app`，已 promote 至 aipoger.com／www.aipoger.com。任務開始前可回復基準為 `dpl_BjHkGMG8YcpcFXtHBCXNcrDBb5iB`（原app `6342878`），如回復須保留新來源schema及已投稿資料。

## 已交付

- Creator Center 私人音樂投稿／收藏歌曲與Choice／收到的評論／Credit狀態、4件作品總覽、搜尋／狀態／翻頁、原作品評論及單首資料編輯。
- 頭像與資料、個人作品表現及原Battle／Choice／批次管理移至清楚入口；owner單一後台入口，主email驗證替代可編輯metadata email。一般會員只讀自己的資料。
- YouTube／Suno／Spotify單曲 metadata 和可見來源播放器，播放及權利確認後才明確投稿；音檔先本機預覽再upload。YouTube可勾MV，同ID共用愛心／評論。不下載外站影音、不冒充radio音檔。
- Credit未啟用，無ledger／發扣點；owner顯示免扣點，其他帳號顯示尚未啟用。未新增點數獎勵、聖經扣點或容量刪檔。

## 驗證

- TypeScript、local/cloud build通過；543 tests：512 pass、31原有可選DB skipped、0 fail；lint 0 errors、15既有warnings。
- Runtime 覆蓋 preview無INSERT／額度、權利與播放確認、HMAC本人綁定／篡改／過期、caller RLS INSERT context、重複舊YT與新來源、DB quota錯誤、全量501筆私人分頁、他人排除、owner／metadata偽裝、音檔試播／換檔／並行／失敗回復與Suno apostrophe metadata。
- 正式使用既有owner登入：8件音樂作品、95首收藏歌曲＋2個Choice，7件推廣期結束、1件下架。真實評價人數0，不填mock的17／64。搜尋／翻頁、收藏／評論、單首編輯取消、個人資料及Credit說明驗收。
- 真實owned YouTube 預覽收到播放事件；Suno及Spotify官方來源 metadata成功，Suno官方embed可見。未按確認投稿、未新增測試留言／Heart或儲存測試metadata。
- 中英日韓新中心、390／320手機、768平板、1280／1487桌機排版；手機帳號通知避開導覽，原通知及其他頁儲存位置保留。新UI沒有意外console error。
- Apex private summary訪客401；公開Explore仍113首、66首有有效支持（當時資料），MV與www/profile HTTP200。兩個正式網域alias核對。

## DB 遷移與回復

`20261013090019_creator_link_submission.sql` 與 `20261013094836_creator_link_required_fields.sql` 已apply，兩個CHECK validated。新增4欄、nullable audio、來源與unique驗證；未改既有RLS／grants／quota triggers，未刪舊作品或audio。

在單一BEGIN／ROLLBACK交易內，以authenticated role與本人claims驗證無audio來源INSERT及個人quota+1，整筆回滾；重查仍329 tracks、0 external rows、0 retained test tracks，UI仍0/3。這是實際DB規則測試，不是永久生產投稿。

公開三個日曆月只控制展示；storage實際回收仍待定。舊Storage-only comments缺會員ID，未偽造成完整歷史評價人數。Suno／Spotify由作者手動確認播放，metadata／簽名不是版權或完整可播保證。Advisor保留原service-only RLS／RPC與Auth提醒，參見工程正文，不宣稱整站安全稽核完成。

## 畫面證據

本機：`/Users/huangyihong/Documents/New project/outputs/aipoger-creator-center-release/`。源稿是生成示意圖，真實資料與official 16:9播放器替換示意。`design-qa.md`記錄並排輸入比較、畫面密度與手機導航修正及可接受差異。截圖與private logs未加入Git或公開Drive。
