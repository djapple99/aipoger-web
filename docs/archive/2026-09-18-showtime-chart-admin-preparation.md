# Showtime 配色、分享與後台管理準備紀錄

更新：2026-09-18 02:07 Asia/Taipei。

後續：使用者於本次後續對話明確回覆 `do it`，DB 更新與部署已完成。以下保留準備時狀態；正式結果以 [發布紀錄](2026-09-18-showtime-chart-admin-release.md) 為準。

## 狀態

- 使用者選擇圖 1，並要求排行榜新增分享鍵。程式在 `codex/showtime-chart-admin`，基準 `f1f44dc`；未部署，未套用本批正式資料庫遷移。
- 已詢問是否同意新增式正式 DB 更新，尚待回覆。現行正式程式仍為 `6343ea0`、deployment `dpl_6q3DgSbgTmGzirmtyxdm4P5dH8RE`。
- 本批沒有撤下歌曲、修改真實愛心或代 owner 決定排序。之前單筆撤下見 [獨立紀錄](2026-09-18-duplicate-track-withdrawal.md)。

## 已實作

- Showtime 使用 `#070809` 中性純黑底；Choice 與月榜維持同頁，保留真實封面、資料及橘色控制，不帶入生成示意圖內容。
- 整份月榜分享沿用原 ShareButton，URL 保留月份、類型、語言與月榜錨點；原單曲分享保留。開啟分享連結還原篩選。
- `/admin/charts` 提供月份、待裁定組數、試聽、上下移動及儲存；後台總覽提示跨月份待辦，與既有 `/admin/choice` 互通，不另建 Choice 資料系統。
- owner 只裁定同支持數的先後，不能更改真實票數或跨分數排序。未裁定公開顯示名次待定；票數或成員改變後舊裁定失效。類型榜沿用總榜相對次序。
- 月底仍凍結原始支持數與候選快照；未決組保持待定，owner 可完成一次裁定，已有效結算的裁定鎖定。紀錄 append-only，保留月份、當時支持數、成員、順序、操作者與時間。
- 疑似重複檢查分頁讀取全部公開曲庫，依相同檔案雜湊或同作者相近歌名提示人工試聽；不宣稱音訊指紋辨識，不自動撤下或合併票數。手動撤下需確認並沿用現有軟下架 API。
- API 驗證 owner token；裁定 actor 取自驗證帳號，資料庫讀写權限由 RLS／RPC 限制。過時名單或已鎖定裁定回傳衝突，不假稱儲存成功。

## 驗證

- 429 項 Node 測試通過，0 失敗、0 略過；TypeScript 與 production build 通過，lint 0 errors／16 項既有 warnings。Build 明確注入現有公開 Supabase URL／anon key，未使用 service secret。
- PostgreSQL 隔離測試使用 PGlite，執行真實遷移 SQL，涵蓋同分裁定、變動失效、月底鎖定、類型排序、撤下後歷史席次、全月份待辦、權限及遷移重跑。沒有在正式 DB 留測試資料。
- 執行方式：`MONTHLY_CHART_PGLITE_MODULE=/private/tmp/aipoger-monthly-db-tests/node_modules/@electric-sql/pglite/dist/index.js npm test`。PGlite 是本機外部測試依賴，不加入網站正式依賴。
- 實際 TSX runtime 測試上下移動、儲存 ID 順序、共用播放器、鎖定及衝突重試；API 測試 401／403、actor、輸入驗證及超過 1000 首的分頁。
- 真實瀏覽器以本機 production build 搭配正式公開 GET 資料驗證，沒有轉送正式寫入：桌機 1440x900、手機 390x844；手機中英日韓無橫向溢出，背景 computed color 為 rgb(7,8,9)，真實封面完整載入。
- 分享 URL 的月份／台語熊high 類型還原經瀏覽器與 runtime 驗證。原生分享點擊未取得可讀剪貼簿結果，不宣稱已驗證裝置分享完成。
- 真實後台未登入狀態經瀏覽器驗證；登入 owner 的保存以隔離 runtime／API 驗證，沒有操作正式裁定。正式上線後仍需 owner 完成一次人工驗收。

## 待發布

1. 等使用者回覆正式資料庫授權；不可把功能方向批准視為已完成遷移。
2. 核對正式既有函式與權限，套用新增式 SQL，確認歌曲、Heart 與舊快照未改寫。
3. 部署並檢查正式黑底、分享、owner 入口、權限與待裁定顯示。
4. 上線後更新產品／體驗正文及發布證據；本紀錄不能替代正式驗收。
