# 通知進入即已讀與紅點修復 — 2026-10-25

使用者反映已進去看通知／回覆後，頭像紅點仍無法消除，明確要求「看過即清除，是否處理是另外一回事」。本次用這個規則取代2026-10-15的「逐則展開才標讀」。

應用 `4184af5`（含 `7e67ef1`），發布分支 `codex/public-rule-copy`；Vercel `dpl_EtPjkm6Dn22LzoyvvmDsJBc4UeNR` READY，`aipoger-web-rnz8-dflogjqag-yohungs-projects.vercel.app` 已promote並綁定 `aipoger.com`／`www.aipoger.com`。

## 原因與修復

- 舊版創作者中心預設收合通知，單純進入Profile、展開清單或看作品／回覆不會標讀；必須逐則展開原通知。頭像計算的是這些未讀通知，不是是否已回覆，導致使用者覺得紅點卡住。
- 現在進入創作者中心就展開通知，成功顯示且頁面可見後，明確PATCH將讀取開始時既有本人有效通知標為已讀，包含其他分頁，不受每頁三則限制；無需逐則點開、回覆、刪除或處理對戰。通知仍保存可查，全文只在展開時顯示。
- GET回傳伺服器readThrough快照截止時間；PATCH重新正規化並限制不超過當下、只更新本人、仍有效且未讀的通知，不覆寫已讀時間。後來的新通知仍可計未讀；背景頁不自動標記，轉為可見時重新讀取。同頁通知入口可刷新已開啟清單。
- 成功後事件帶確認的未讀數，頭像與通知標題立即同步，並重新查核。更新revision令較舊的回應失效，包括隱藏頁面，避免舊數字把紅點復活。API／網路失敗不回假0，清單提示重試。
- 保留原逐則讀取相容、保留／取消保留／刪除、三則分頁、原期限與權限。對戰待辦、原評論／回覆、評分、播放、MV布局與Credit不受影響。沒有schema、RLS、Auth設定或批次手動修客戶資料。

## 驗證

- 全套818項：787通過、31既有選用DB略過、0失敗；通知定向19項通過。涵蓋65則跨頁、只限本人、已讀冪等、已保留／已過期資格、新通知截止時間、未登入401、失敗保持狀態、client認證／事件、count舊回應競態、隱藏頁面、同頁重入及重試。
- TypeScript通過；lint 0 errors／9既有warnings；本機webpack build與最終雲端build成功。初輪callback加Event參數後的Realtime型別不合，已用獨立callback修正並重驗；不使用型別斷言掩蓋。最終同頁重入修正另通過TypeScript、變更檔lint、全部測試及雲端build。
- 私人隔離瀏覽器harness匯入實際通知元件、client與count hook，僅登入來源及HTTP資料採fixture，未連正式資料庫：原7則未讀→進入後0、仍保有7則；新增一則→1，刷新仍1，重入→0，console無error／warn。四語320×800內容及scroll寬均320、三則列與已讀狀態正常，沒有水平溢出。這是隔離瀏覽器驗證，非真實客戶帳號或實體iOS測試；沒有新增正式測試通知。
- 正式已登入Chrome直接進Profile，自動展開互動通知，確認0未讀、25則原通知仍可分頁查閱；刷新後仍0，頭像無紅點。沿正常介面驗本人狀態，未代登入客戶或送出回覆／評論／點數操作。
- Staged與正式未登入GET／PATCH皆401 AUTH_REQUIRED。正式首頁、Auth、四語Profile、MV、Battle共8入口200；alias已指向本次READY版本。查核近15分鐘無error／fatal runtime log。
- 私人證據在 `New project/audits/2026-10-25-notice-read/`，包含隔離前後畫面、四語手機及正式通知截圖、HTTP結果；不提交私人用戶資料或bundle到Git。隔離server已停止，沒有QA route或測試fixture進正式source。

現行產品／體驗／工程／索引與私人協作入口更新，既有Drive ID原地同步並讀回核對。
