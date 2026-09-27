# 創作者私人作品表現發布證據

發布日期：2026-09-27（Asia/Taipei）。產品規則讀 [現行正文](../aipoger-product-rules.md)，此檔只保留部署與驗證證據。

## 發布版本

- 分支：`codex/creator-insights`；已 push GitHub。
- 應用：`952c1bc`。主功能 `19fd7ba`；Choice 分享 metadata 修復 `9143aeb`；個人頁作品／收藏播放識別補正 `952c1bc`。
- Vercel：`dpl_Bfniz6ZbAyzAzAj4VcBH43x64hrV`，Ready，已 promote 至正式 aipoger.com。
- 部署 URL：https://aipoger-web-rnz8-ho2nwa6ha-yohungs-projects.vercel.app
- 本次發布前的正式版本：`dpl_GPvWdFNxyhNoLNQp5vzVHs34P78y`，應用 `0a49e0b`。本次沒有 SQL migration、歷史資料回填或正式資料刪除。
- 從獨立 worktree 發布；原始工作區其他未提交程式保持原狀。環境檔未上傳，雲端重新建置並使用既有專案配置。

## 行為與驗證

- Profile 新增「作品表現」入口；私人 API 以驗證後的登入身分查自有啟用作品及正式結算對戰。伺服器拒絕未登入／無效 token，回應 `private, no-store`，不回傳聽眾身分。
- 最近 28 天有效登入聽眾、完聽、主動重播與聽後 Heart／收藏轉換，另外顯示目前支持者／收藏者；新比例只使用新版量測。公開卡片與月榜計分未改。
- Choice 的 `generateMetadata` 從 layout 移到 server page，原互動內容置於 client component，保留網址語系、歌單封面與分享文字。正式四語 OG locale／title／image 已核對。
- `npm test`：472 項，441 通過、0 失敗、31 略過。略過原因為原有可選 PGlite 資料庫測試環境未配置；本次無 SQL 變更。
- TypeScript、本機與 Vercel 正式 build 通過。lint 為 0 errors、16 項既有 warnings。本機第二次增量建置曾停滯，清除本 worktree 的產物快取後重新完整建置通過。
- 隔離 runtime 測試覆蓋：跨帳號查詢不可越權、資料來源錯誤不補零、超過 1000 筆的分頁、未結算密封票不回傳、播放去重、拖曳／暫停與重播、Heart 與收藏轉換及來源 ID 排除。
- 真實正式登入：個人頁入口可用，讀到本人 7 首啟用曲庫作品及現存支持／收藏；無正式期間對戰時顯示空狀態。Profile 顯示的 8 首作品包含未啟用作品，口徑不同。
- 桌機 1440×900、手機 390×844 畫面檢查通過；中英日韓標題與手機橫向寬度核對，無橫向溢出；作品頁無 console error。當時新比例顯示資料累積中，未用假資料補齊。
- 正式 `/`、`/auth`、`/listen-bar`、`/music-analysis`、`/battle/setup?lang=zh`、`/rank?lang=zh`、`/profile/insights?lang=zh` 已核對；私人 API 未登入和無效 token 為 401。

- 真實收藏播放補正後驗證：自有作品播放約 66 秒，正式資料庫出現新版 song_play、15／30／45／60 秒心跳及 66 秒 pause 紀錄；覆蓋秒數與實際播放相符。回到私人頁該曲有效聽眾仍為 0，作者本人排除正確。未更動 Heart／收藏／投票。

## 資料解讀限制

- 新版聆聽比例需上線後累積；不包含未登入訪客與作者自己，不能稱為全站完整歷史數據。
- Heart 連動收藏，兩項轉換不得相加；轉換指有效聆聽後記錄且目前仍保留的行為，不是因果歸因或歷史所有點擊。
- 本輪沒有建立第二個真人帳號或偽造聽眾、收藏、投票；跨帳號越權由伺服器 runtime 測試驗證。
