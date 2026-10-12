# MV 放映室發布證據

發布日期：2026-10-13 Asia/Taipei。應用 commit `6d36364`、分支 `codex/homepage-mv-editorial` 已 push。正式部署 `dpl_6ntBxCmThoX1rXVpFqCzFy87xNPU`，URL https://aipoger-web-rnz8-aope4ii3r-yohungs-projects.vercel.app 。Vercel READY；promote 後 `aipoger.com` 解析同一 deployment。正式入口 https://aipoger.com/mv?lang=zh 。無 SQL migration、環境或登入資格變更。

## 行為及資料查核

- 黑橘放映室、首頁 MV 真實入口、四語導覽與 metadata、搜尋／曲風／最新與本週支持排序、逐批載入、影片與原作品評論／Heart。
- 既有連結資料查核：58 件 community 投稿具有 YouTube 欄位，51 件仍公開，其中 48 件是影片，3 件是頻道；7 件已撤下不重新上架。Battle queue 的 post-win release URL 欄位目前無資料；仍保留原流程與公開權限，不替它建立 community 身分。
- 本機、雲端部署與 apex 正式 API 都回傳 48 支影片與 3 個頻道，最早上架 2026-05-26；首頁和新頁當週精選一致。這是驗收當下數量，不固定為產品規則。
- 正式頁逐次展開至 48 件，無重複作品 ID；搜尋五月作品 Mango Ice (Bossa edit) 成功，原作品評論讀取成功、訪客登入返回 MV 頁。不同作品共用同影片不擅自合併支持。

## 驗證

- 501 項測試：470 通過、0 失敗、31 既有可選資料庫測試略過。新增涵蓋歷史連結、公開資格、頻道／影片分離、不混作者／投票身分、共用週支持、搜尋規範化、篩選、排序、完整列表、使用者發起播放及登入回程。
- TypeScript、本機／雲端 build 通過；lint 0 errors／16 既有 warnings。沒有新增 warning。
- `/mv`、首頁、auth、酒吧、Explore、Battle setup 及 `/api/mv/discovery` 正式 HTTP 200；公開回應不含作者 UID 或支持者身分。
- 1487 × 1058 桌機／390 × 844 手機，四語頁面與語系切換無橫向溢出；新页實際 YouTube 播放成功，原生影片／評論 dialog 及搜尋／曲風空結果重設驗證。apex 正式頁顯示 48 件、MV 導覽 active，控制台無 error。
- 視覺比較及修復記錄於根 `design-qa.md`。私人截圖位於 `/Users/huangyihong/Documents/New project/outputs/aipoger-mv-release/`，包括配對來源／實作、歷史播放、正式桌機／手機及評論；未上傳截圖至應用 repo。

## 範圍及回復

使用同一隔離工作樹，不混入原工作區未完成程式。沒有點數啟用、音檔改寫、三個月刪除、Battle 玩法改動或新任意來源投稿。沒有在生產建立測試作品、留言或支持；會員送出以 runtime mocks 驗證，未使用真實 owner session。可 promote 前正式部署 `dpl_DZJ9WQDd6yfJPawf5Dq5BuViNghM` 回復首頁版本，無資料回滾或刪除需求。

本次五份變更正文及固定索引已使用既有 Drive ID 原地更新，六份讀回內容逐字與本機完全一致；未改共享權限或新增副本。
