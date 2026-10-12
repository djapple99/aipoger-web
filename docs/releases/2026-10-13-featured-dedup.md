# 首頁與 MV 曝光去重發布證據

發布日期：2026-10-13 Asia/Taipei。應用 `8689575`，分支 `codex/homepage-mv-editorial` 已 push。正式部署 `dpl_7Bs119NdHNPPncf4bTqjQRbaaSAQ`，URL https://aipoger-web-rnz8-a6ng1wcii-yohungs-projects.vercel.app 。READY、promote 完成；apex aipoger.com 查核解析同一 READY 部署。

## 行為與驗證

- 首頁探索單曲與 MV 頁下方列表按作品 ID 排除上方全部精選，再沿用原排序補位，包含同票及零支持新作。候選不足時少顯示，不重複填滿。原作品與不同作品共用影片的資料不合併、不刪除。
- MV 搜尋符合精選時顯示提示與跳轉，切換到對應主視覺；排序、篩選及載入更多仍排除精選作品。
- 本機與正式首頁 API：精選「救生圈」，單曲為「海端，記得海」、「BOOM BOOM」、「NO NAME」，ID 無交集。正式 MV API 保留 48 件影片及 3 個頻道；下方全量展開 47 件，沒有「救生圈」重複卡片，首列為「還沒學會忘記」、「V O R A C I O U S」、「聲聲攏是愛」。數量為驗收當下值。
- 503 項測試：472 通過、31 既有可選資料庫測試略過、0 失敗。針對同票、候選補位、候選不足、排序及逐批載入、精選搜尋和原作品保留新增／更新 regression checks。
- TypeScript、本機／雲端 build、git diff check 通過；lint 0 errors、16 既有 warnings。
- 正式桌機 1487 × 1058 與手機 390 × 844 無橫向溢出；精選搜尋成功並跳至上方，完整載入與支持排序驗證。首頁與 MV 確認使用不同作品；控制台無 error。四語搜尋提示於本機驗證。
- 私人截圖：`/Users/huangyihong/Documents/New project/outputs/aipoger-feature-dedup-release/production-desktop.jpg`、`production-mobile.jpg`、`production-home-desktop.jpg`。根 `design-qa.md` 已記錄本次查核。

## 範圍與回復

僅修改展示選曲與搜尋提示，沒有 SQL migration、依賴／環境／登入／計分變更，沒有生產測試留言／Heart 或資料寫入。原工作區程式未混入。可 promote 前版 `dpl_6ntBxCmThoX1rXVpFqCzFy87xNPU` 回復，無資料回滾需求。

協作入口、產品規則、使用流程、工程及固定索引已使用各自既有 Drive ID 原地同步，五份完整讀回內容逐字與本機一致。未新增文件副本或更改共享權限。
