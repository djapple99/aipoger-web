# Owner 頭像後台待辦提醒

更新：2026-09-18 03:09 Asia/Taipei。已正式發布。

- 應用 `9fc7074`／分支 `codex/owner-task-avatar` 已 push；Vercel `dpl_CYiSQUWJWdaXxnQCGG4neeZFwoAw` READY 並 promote 至 https://aipoger.com。版本網址 https://aipoger-web-rnz8-1f7i2ypek-yohungs-projects.vercel.app 。後續文件提交不改變此應用版本。
- 正式 `/api/admin/tasks` 未登入及無效 bearer token 均回 401、private/no-store；`/admin` 與 `/rank` HTTP 200。正式瀏覽器未登入仍顯示登入入口，不顯示 owner 待辦。沒有讀取、注入或複製登入憑證；owner 真實登入讀取仍須人工驗收。
- 發布時 SQL 唯讀核對：11 筆新歌待宣傳、1 份官方未發布 Choice、1 筆可見社群待處理；這不是全待辦總數，尚不含檢舉與同票。未修改這些任務狀態。

- 使用者要求同票或後台任務在頭像出現紅點；本批以獨立紅色數字徽章連到後台待辦，頭像本體仍進 Profile，原帳號／Battle 消息保留。
- 接入六項已可處理來源：跨月同票組、作品檢舉、評論檢舉、新歌待宣傳、官方 Choice 未發布草稿、社群未完成可見目標。TikTok-only、一般使用者私人草稿、完成事項與未啟用功能不會觸發。
- `/api/admin/tasks` 驗證 bearer token 與 owner，回傳彙總及時間，不送出檢舉者、音檔、私密稿件內容。讀取全量採分頁，report DB／storage fallback 依 ID 合併並以 DB 為準。未知來源保留 null；客戶端保留上次已知數量，不把錯誤當成零。
- 30 秒前景輪詢、焦點／可見性／路由更新；退出帳號或切換使用者清除舊結果，過期回應不能套到另一帳號。不是關閉網站後的推播服務。
- 無 DB migration，無正式資料寫入，不自動清空、裁定、發布或解決任何待辦。
- 本機 TypeScript、build 及雲端 build 通過；lint 0 errors／16 既有 warnings。最終完整回歸 437 項全數通過，0 略過。
- 新增測試覆蓋 401/403、全月份加總、超過 1000 筆分頁、storage fallback、私人內容不外洩、停用目標排除、保留未知、恢復零、登出／晚回應、頭像 Profile／紅點／Bell 分離及四語標籤。
- 隔離 SSR 使用真實 GlobalBattleCallOverlay 元件與編譯 CSS，注入測試帳號／數量僅存在 Node 測試，不植入網站 auth 或正式資料。手機 390x844 實際 screenshot 確認雙提醒與中心頭像不互遮；桌機 1440x900 DOM 邊界無溢出。沒有以真實 owner 帳號操作待辦，正式登入互動仍需 owner 驗收。
- 原 workspace 的既有無關變更保留；不提交本機 output／環境檔。
