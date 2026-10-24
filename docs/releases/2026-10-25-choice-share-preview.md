# Choice 歌單 LINE 分享縮圖

- 日期：2026-10-25，Asia/Taipei。
- 應用提交：`a90079f5636c3ff8fe6142d5d56b8c8a6d661b1d`，分支 `codex/public-rule-copy`；功能提交 `77c6f3c`。
- 正式部署：`dpl_x4TQgrzGyy2upxmrtb8eanFP5Upn`，READY，aipoger.com／www 已綁定並核對提交。

## 修正

Choice 使用已發布歌單自己的封面、當期標題與推薦文章。站內公開封面透過 `/choice/{id}/share-image` 等比完整縮放為 800×800 JPEG；只允許既有公開 cover bucket，禁止任意來源／重新導向，不提供未發布或不存在歌單。圖片有大小、像素及下載時限限制，成功快取五分鐘，失敗 no-store。

LINE crawler 直接在 head 取得 metadata；一般瀏覽器維持 streaming，保留 Next 16.2.12 原 crawler 名單。Showtime 與完整歌單的分享鍵共用原 ID／類型／語言及固定封面版本 URL，更新封面才改版本，避免沿用舊的無圖預覽。沒有新增社群自動發送或變動原歌單內容／評論／收藏／播放。

第一個正式部署的縮圖函式發現缺少 Linux libvips，已補上該函式的 native runtime tracing，重新部署並實測四份公開歌單圖片。只以最後成功部署為完成基準。

## 驗證

- 全套 767 項：734 通過、33 既有選用 DB 測試略過、0 失敗。TypeScript、webpack build 通過；lint 0 errors／14 既有 warnings；補上 native tracing 後再次 TypeScript、相關測試及變動檔 lint 通過。未更換套件或套件鎖。
- 正式中英日韓 × line-poker／Line／facebookexternalhit 共 12 組：正確歌單 metadata 在 head、圖片 URI 與 800×800 JPEG 宣告完整，封面版本 canonical 可公開開啟。
- 三份有站內封面的公開歌單：實際 800×800 JPEG，109,783／182,153／59,534 bytes，均 HTTP 200。另一份未設定封面沿既有個人頭像回退，512×512 PNG 134,095 bytes，HTTP 200。
- 本次指定歌單原封面 3,242,688 bytes，分享縮圖 109,783 bytes；瀏覽器確認完整封面、800×800，已保存截圖。
- 指定歌單 10 首原 ID／標題／順序及歌單介紹／封面／策展名稱與評論 API 前後核對一致。無效圖片 ID 回 404，首頁／登入／Showtime／探索／Battle 入口 HTTP 200。
- 僅驗證公開 metadata／圖片與瀏覽器顯示，沒有傳送測試 LINE 訊息；既有 LINE 訊息是否重繪仍由客戶端／平台快取決定。重新從分享鍵取得新版連結使用。
- 私人驗收證據：`/Users/huangyihong/Documents/New project/audits/2026-10-25-choice-share-preview/`，包含前後 HTML／公開資料、production-qa.json、測試記錄及 production-share-cover.png。未提交這些本機證據、環境檔或登入資訊。
