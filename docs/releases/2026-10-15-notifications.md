# 創作者中心互動通知與持久已讀 — 2026-10-15

確認日期：2026-10-15（Asia/Taipei）。依使用者要求修正頭像紅字「1」無法對應消息、看過仍反覆提醒；此 report 是驗證證據，後續規則以現行產品規則及版面文件為準，未有新指令不得任意更動。

## 實作

- 頭像本體仍進創作者中心；未讀數字與消息鈴鐺直接進私人 `/profile?lang=<lang>&tab=notifications`，顯示事件、作品、評論者、原文、時間與查看作品／評論入口。
- 通知區預設緊湊收合；指定入口自動展開，支援全部／未讀及每次10則向前載入。已讀消息保留，不刪除紀錄。
- 實際可見且前景分頁停留800ms後才寫入已讀；背景、畫面外及收合不預先清空。失敗顯示重試；重複確認為冪等，不重複扣數字。
- 新 `/api/account-notifications` GET/PATCH 以 `creatorAuth/getUser` 驗證會員，所有讀寫附帶 recipient user_id。只收指定ID、不接受客戶端指定收件人；回應 private/no-store，連結限制站內。
- Badge 讀伺服器確認值；成功已讀事件、Realtime變更、focus及可見分頁30秒更新。舊請求不能覆蓋新帳號或登出狀態；讀取失敗保留最後確認數。
- 移除Profile載入時將尚未看見的攻擂邀請批次清空。一般消息不再搶佔頭像成為浮動彈卡；即時Battle狀態及獨立Owner後台待辦保留。
- 正式驗收發現Next同頁hash導航不派發原生hashchange，已補明確開啟通知事件，跨頁改用tab query，保留舊hash直達相容；並為同頁挑戰詳情補入口。
- Realtime在帳號／路由切換時使用獨立訂閱識別；過期非同步載入不得再建立訂閱，防止重複callback註冊錯誤。
- 無SQL migration、權限設定、Storage、作品、Credit或排行變更。

## 發布與驗證

應用SHA：`e8c99f505d1bb7842a80a88ebe0aaf39fdc8cf8a`；分支 `codex/public-rule-copy`。
Vercel：`dpl_A9BTkBfcGc8acSCm7q33Zq2B83Lh`。READY並已alias至aipoger.com／www。

本機：TypeScript及webpack正式build通過；通知API／可見已讀／失敗重試／同頁展開／帳號隔離測試通過。全套656項：624通過、32既有可選DB測試略過、0失敗；lint 0 errors／14既有warnings。最終修正已納入全套測試；TypeScript、相關檔案lint及重新正式build亦通過。

證據目錄：`/Users/huangyihong/Documents/New project/audits/2026-10-15-notifications/`。沒有創建假評論、投票或測試通知；正式驗收只讀取並按使用者要求標讀既有消息。

正式站：既有未讀評論1則，點紅字後展開、看到評論者／作品／全文，已讀成功且數字歸0；重新整理保留已讀。全部／未讀篩選正常，對應MV及原評論可開啟；從MV點鈴鐺返回及同頁收合再開均正常。桌機1440px、手機390px與320px四語均無水平溢出，最終正式巡覽console errors為空。匿名API回401及private/no-store。帳號切換／他人ID不可讀寫／失敗保留提醒由runtime測試驗證；未切換使用者正式登入或建立新測試互動。

現行產品規則、版面流程、工程文件、索引與私人agent.md同步維護；Drive同步結果另存同一證據目錄。
