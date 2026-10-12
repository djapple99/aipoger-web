# 探索音樂改版發布證據

產品發布：2026-10-13。應用 `e8f2977`，分支 `codex/homepage-mv-editorial`；GitHub 已 push。Vercel `dpl_M3wZ23ATz3CPV6vjo9uUZkiYgKZW`，`aipoger-web-rnz8-po3krpap6-yohungs-projects.vercel.app` READY；先以 skip-domain 部署及認證 curl 查核 225 首曲庫，再 promote，aliases 已包含 `aipoger.com`／`www.aipoger.com`。CLI deployment metadata 未提供 gitSource；版本對應依乾淨 checkout 的應用 commit、上傳紀錄及正式頁面驗證。

改動：依使用者批准參考圖重排 `/ai-music`；共用黑橘頂欄、大標、搜尋及大橘色傷心酒吧入口；單層推薦與原曲風列、推薦 ID 去重、完整作品搜尋與曲風交集、歌曲旁大愛心／原累計總數。保留曲庫 eligibility、14 曲風、NEW／接戰、攻擂、Hot Now 原排序與全站名次、共用播放器、Heart／收藏、原 ID／Deep Link、耳朵測驗與 owner dock。資訊以明確操作展開，分享仍連原作品。沒有新增 demo 曲目或檔案儲存方案。

驗證：

- 519 tests：488 passed、31 既有可選 DB skips、0 failed；文件更新後全量重跑結果相同。
- `npx tsc --noEmit`、本機 `npm run build`、Vercel build 通過；lint 0 errors、15 既有 warnings。
- 視覺 QA `design-qa.md` final result passed。批准 source 1487 × 1058 與同尺寸 live paired comparison，外加 header/card crops；修正 320px 英文選單寬度及桌機標題比例。最終第一排封面約 y334，目標 y331。
- 本機實際訪客耳朵測驗完成 Jazz 主場、回探索顯示 6 推薦；0 重複卡片 ID；zh/en/ja/ko 桌機／390px 手機，320/768/1280 斷點無整頁溢出；GUIDE focus trap／Escape／return。
- 正式站實際音訊 readyState 4、持續播放 >34 秒、關閉播放器；Heart 訪客登入提示攜带原歌曲 return；搜尋愛波哥 7 曲、Jazz 交集 2 曲、無結果／清除篩選；Hot Now 真實支持者與名次；資訊開關正常。登入寫入與 owner 身分未使用生產帳號測試；相關原 API／資料規則未修改。
- 正式 `/`、`/ai-music`、`/mv`、`/auth`、`/listen-bar` HTTP 200；正式曲庫 225（驗收當下數量）。四語界面與手機截圖另存私人 evidence；公開作品量可正常變動。

私人驗證截圖位於 `/Users/huangyihong/Documents/New project/outputs/aipoger-explore-release/`；未提交截圖／環境檔／密鑰或工具輸出。Canonical 正文維持六份，Google Drive 依既有 ID 原地同步及讀回比對。

無 SQL migration、資料庫資料刪除、环境／登入設定更改、APC 啟用、正式票／評論寫入。上一個可回退部署：`dpl_J97UK5nFW6KQJaHurB9yoNJC7fhE`（app `5d1178d`）。
