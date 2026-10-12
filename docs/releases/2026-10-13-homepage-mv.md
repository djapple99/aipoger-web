# 首頁 MV 與單曲探索發布證據

發布日期：2026-10-13 Asia/Taipei。應用 commit `91f207c`，GitHub 分支 `codex/homepage-mv-editorial` 已 push。正式部署 `dpl_DZJ9WQDd6yfJPawf5Dq5BuViNghM`；部署 URL https://aipoger-web-rnz8-n8s126054-yohungs-projects.vercel.app 。Vercel Ready；promote 後以 `aipoger.com` 查詢解析到同一 deployment。沒有資料庫 migration 或環境設定變更。

## 最終行為

- 使用者選定的黑橘首頁：精選 MV 主視覺、最新三首單曲、傷心酒吧，保留 Explore、Showtime、Battle、創作聖經和投稿入口；手機與四語同步。
- 首頁曝光讀取本週不同非作者會員的現存 Heart，同票可切換；未產生支持時顯示真實最新 MV 並標新作放映。評論引用需公開可見；沒有留言則使用介紹，介紹空白時是平台留言邀請。
- 原作品首頁評論視窗沿用現有留言與 Heart API；不重複投稿、儲存 MV 檔案或啟用點數。
- 單曲沿用共用音樂播放器；MV 由使用者按下才載入 YouTube，互相切換先停止另一個音源。

## 驗證

- 488 項測試：457 通過、0 失敗、31 既有可選 DB 測試略過。涵蓋台北週界／年界、不同支持者去重、作者排除、隱藏／撤下作品、同票、零支持、無 MV、分頁不截斷、四語入口、登入 transport、留言失敗留稿及共用音訊切換。
- `npx tsc --noEmit` 通過。Lint 0 errors／16 既有 warnings，無新增 warning。本機及 Vercel 正式 build 通過。
- 真實本機與已部署 API 都回傳台灣週 `2026-10-12` 至 `2026-10-19`，新作放映「救生圈」；單曲「海端，記得海」「救生圈」「BOOM BOOM」。此為查核當下資料，不固定為產品內容。
- 主要公開入口及品牌 Logo HTTP 200；公開首頁 response 未回傳 voter／creator UID。
- 瀏覽器確認實際單曲播放，YouTube 嵌入成功，音訊在切換後暫停；評論視窗無評論的真實狀態、登入入口、Escape／焦點回復。首頁語系切換、1440×900、1487×1058 與 390×844 無水平溢出。
- 視覺配對比較及修復詳見根目錄 `design-qa.md`。截圖留在私人 `New project/outputs/aipoger-homepage-release`，未提交至應用 repository。

- 本機固定索引及六份正文維持單一來源；本次五份變更正文與雲端索引使用既有 Drive ID 原地同步，六個讀回內容與本機完全一致。

## 範圍與回復

- 使用隔離且乾淨的工作樹 `/Users/huangyihong/Documents/GitHub/aipoger-homepage-mv`。沒有重置或上傳原工作區的未完成變更。
- 沒有對生產資料寫入測試評論、Heart 或投稿。會員送出／失敗流程以 transport mocks 驗證；未使用真實 owner session 驗收登入後頭像。沿用既有帳號與通知元件。
- 首頁不修改 Showtime 月榜、正式 Battle、作品容量保留或既有審核。MV 專頁、Album／外站連結新投稿、評分量尺與點數經濟仍待後續。
- 回復可 promote 前正式部署 `dpl_9u5dxcQCnJFYfWkvUotFaLNZEspc`；不撤銷或刪除資料。
