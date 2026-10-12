# MV 卡片愛心與評論發布證據

發布日期：2026-10-13 Asia/Taipei。應用 `5d1178d`，分支 `codex/homepage-mv-editorial` 已 push。正式部署 `dpl_J97UK5nFW6KQJaHurB9yoNJC7fhE`，URL https://aipoger-web-rnz8-8qijokynh-yohungs-projects.vercel.app 。READY、promote 完成；apex aipoger.com 查核解析同一 READY 部署。

## 行為與驗證

- 採用使用者批准的兩排卡片：歌名右側大愛心／本週票數／評論，下面創作者；34px 圖示及至少 44px 點擊範圍，沒有獨立第三排操作。
- 直接 Heart 使用原 `/api/listen-bar/reaction` 及收藏連動。批次讀取登入者自己當日 Heart，不新增公開支持者資料；連點鎖定、寫入失敗保留原狀態、帳號切換忽略舊讀寫結果。公開票數仍由 discovery 週支持計數更新。
- 評論圖示開同一原作品的影片／留言 dialog，關閉返回卡片及恢復焦點；使用者點觀看才嵌入影片。實際正式播放 `NXeLr7SaePI`，觀察到播放時間與暫停控制；收起影片卸載 iframe。共用音訊與影片互斥，草稿不因收起影片而丟失。
- 正式手機 390 × 844 與桌機 1487 × 1058 無水平溢出。公開評論成功讀取真實空狀態，訪客點愛心導向 `/auth?lang=zh&next=%2Fmv%3Flang%3Dzh`；關閉評論焦點返回原圖示。本機四語桌機／手機檢查通過。控制台無 error。
- 正式 API 保留 48 支影片、3 個頻道，救生圈只在主視覺，下方首列為還沒學會忘記、V O R A C I O U S、聲聲攏是愛。首頁單曲仍為海端，記得海、BOOM BOOM、NO NAME，ID 不與精選交集。數量為驗收當下值。
- 513 項測試：482 通過、31 既有可選資料庫測試略過、0 失敗。TypeScript、本機／雲端 build、git diff check 通過；lint 0 errors、16 既有 warnings。已登入寫入、收藏同步、讀寫失敗、帳號競態、連點及評論草稿由 runtime mocks 驗證，沒有 live owner session 寫入測試。
- 私人證據目錄：`/Users/huangyihong/Documents/New project/outputs/aipoger-mv-actions-release/`；`production-desktop.jpg`、`production-mobile-cards.jpg`、`production-comments-mobile.jpg` 及同尺寸 `comparison-final.jpg`／`comparison-detail-final.jpg`。根 `design-qa.md` 的 final result: passed。

## 範圍與回復

沿用作品、評論、Heart、收藏與週支持規則，沒有 SQL migration、依賴／環境／登入／計分變更，沒有生產測試留言／Heart、上傳或點數啟用。原工作區程式未混入。可 promote 前版 `dpl_7Bs119NdHNPPncf4bTqjQRbaaSAQ` 回復，無資料回滾需求。

協作入口、產品規則、使用流程、工程及固定索引已使用各自既有 Drive ID 原地同步，五份完整讀回內容逐字與本機一致。未新增文件副本或更改共享權限。
