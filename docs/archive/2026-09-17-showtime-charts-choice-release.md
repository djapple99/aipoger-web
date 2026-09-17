# Showtime 月榜與收藏 Choice 發布紀錄

更新：2026-09-17 23:54 Asia/Taipei。此檔記錄發布證據，不是另一份可編輯產品規則。

## 發布

- 主實作 `e5eab5b`；發布應用 `79e53bd`，分支 `codex/showtime-charts-choice` 已 push。
- Vercel `dpl_8WEW1DehGhKjNfrW1vSTNF7GbjLv` 已 Ready 並 promote 至 https://aipoger.com。
- 部署來源為獨立 worktree `/private/tmp/aipoger-upload-week-release`，基準 `b025d55`，不夾帶原工作區無關變更。
- `.vercelignore` 排除環境檔、瀏覽器測試輸出與暫存資料；密鑰與暫時存取連結不寫入 repo。

## 資料庫

- 已套用 `20260917151525_monthly_charts.sql`、`20260917152244_retire_showtime_certification.sql`、`20260917153446_monthly_chart_canonical_genres.sql`。
- 遷移前後均為 292 首總歌曲、196 首 active、Heart 合計 663、Battle archives 8。沒有複製、刪除歌曲或改寫音檔、收藏與戰績。
- 45 首舊資格作品完成一次性退役標記，接戰狀態全部為 showcase；舊來源保留內部歷史，不能生成新認證。cutoff 後沒有新攻擂 archive 遺漏。
- 月榜從台灣時間 2026-09 開始；正式查詢當時 27 首有有效非作者支持，其中 1 首達 3 人門檻。類型別名正規化後再計算類型順位，無效類型不入榜。
- 月結快照包含 `distinct_non_author_heart_v1` 計分版本，歷史名次不可改寫；來源寫入前及受保護 cron 均可完成跨月結算。

## 驗證

- 405 項 Node 測試全部通過、0 略過，包含實際 PostgreSQL/PGlite SQL 執行；TypeScript 與 production build 通過。
- ESLint 0 error、16 個既有 warning，未新增 warning。
- SQL 測試涵蓋不同帳號去重、排除作者、台灣月份邊界、1/1/3 同分、1000 筆以上聚合、空月、結算重試與不可改寫、隱藏後保留原順位、權限、類型別名與舊來源保留。
- Choice runtime 測試涵蓋自己的收藏選曲、週草稿、5–10 首發布、取消收藏後保留選曲、授權完整歌曲、跨帳號舊請求隔離與同帳號 token 刷新保留編輯。
- 正式站月榜 API 200；上線前月份 404、未來月份與無效類型 400；私人 Choice 管理與 cron 未授權 401。
- 正式站 Explore 與 Bar API 各 196 首；首頁、rank、auth、Bar、Explore、Battle setup 與 About 入口皆 200。
- 月榜桌機 1440x900、手機 390x844 真實封面與曲庫驗證；手機中英日韓均 27 列、11 類型加總榜、0 橫向溢位、0 壞圖。
- 真實音檔播放至 14.8 秒、readyState 4，可暫停；未登入 Heart 提示、規則彈窗、台語熊high 四首篩選與無搜尋結果狀態通過。正式月榜瀏覽器 console 0 error／warning。
- 畫面保存在 worktree 的 `output/playwright/monthly-production-mobile-*.png` 與 `monthly-desktop-zh.png`，不提交測試圖片。
- Choice 正式站四語、桌機／手機 8 組封面與 HUD 驗證通過，0 橫向溢位；實際播放、上下首、末首邊界、分享頁與四語登入返回路徑通過。截圖為 `output/playwright/prod-choice-*`。

## 限制

- 沒有使用真實登入帳號發表 Choice、變更收藏、投稿或開戰；相關權限與寫入流程以 runtime/SQL 測試驗證。未做 iOS 真機驗證。
- 實際月末尚未到來，結算正確性使用隔離 PostgreSQL 測試，不宣稱已發生正式月結。
- 小資料量鎖定／結算測試不是大規模並發效能保證；既有 Choice 跨視窗排序仍非單一資料庫交易，本次沒有擴大此行為。
- 暫存 Vercel 網址的存取授權曾影響連續瀏覽；應用已於正式網域重新驗證，未停用部署保護。
- 既有待修、非此次回歸：Choice HUD 開啟後未隨父清單更新清除舊快照；評論網路拒絕缺少 finally，可能停在 busy；日韓評論沿用英文。前兩項已用元件／mock 重現，未在正式站製造評論寫入或下架事件。後續修整列入私人 roadmap。
