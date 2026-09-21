# Choice 完整頁底部評論

2026-09-21，使用者確認後實作並整批發布。

- `/choice/{id}` 曲目列表下方直接顯示歌單評論；頂部評論入口連到 `#choice-comments`。Showtime 的快速評論視窗繼續共用同一元件與資料。
- 所有人可讀，任何登入者可留言；頭像、名稱、時間、自刪與檢舉沿用。回覆帶入 `@名稱` 至輸入框，仍需按送出，不建立通知或巢狀討論；既有歌曲評論不受影響。
- 中英日韓、登入回到評論位置、網路失敗保留文字、登出清除草稿；行內評論不鎖頁面捲動。
- 無 API／資料庫修改，不新增測試留言至正式站。
- 463 tests pass / 0 skipped；新增四個元件行為測試覆蓋公開讀取、回覆、送出失敗與重試、登入變更與四語；TypeScript / 修改檔 ESLint / production build 通過；全站 lint 16 個既有 warnings、0 errors。
- 本地 build 使用單次佔位 public Supabase 設定；正式部署由 Vercel 雲端設定重新建置，環境檔排除上傳。

## 正式驗證

- App commit `0a49e0b` 已推送；Vercel `dpl_GPvWdFNxyhNoLNQp5vzVHs34P78y` READY，綁定 `aipoger.com` / `www.aipoger.com`。
- 部署網址：https://aipoger-web-rnz8-h3eys5sey-yohungs-projects.vercel.app
- 七個主要入口及完整 Choice 頁 HTTP 200；匿名評論 GET 200，既有一則評論保留，POST/DELETE 未登入回應 401。
- 正式 Chrome 驗證歌單下方既有留言、頭像、名稱、時間與檢舉；頂部錨點可到評論區，回覆會帶入正確名稱。僅試填並清空，未送出、刪除或檢舉任何正式留言。
- 桌機與 390px 手機視覺檢查，中英日韓標題／輸入提示正常、無水平溢出，行內評論不鎖 body 捲動；瀏覽器 error logs 為空。
- 送出成功／失敗重試、自刪入口、訪客登入提示與登出清除草稿由元件行為測試驗證；正式站未發布測試留言。

