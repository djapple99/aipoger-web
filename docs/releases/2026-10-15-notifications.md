# 創作者中心互動通知與持久已讀 — 2026-10-15

確認日期：2026-10-15（Asia/Taipei）。依使用者要求修正頭像紅字「1」無法對應消息、看過仍反覆提醒；此 report 是驗證證據，後續規則以現行產品規則及版面文件為準，未有新指令不得任意更動。

## 首輪實作（同日精簡修訂已取代通知展示與保存方式）

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


## 同日精簡修訂：使用者確認的最終設計

確認日期：2026-10-15（Asia/Taipei）。使用者在設計稿反覆確認後授權「do it」。此節取代首輪每次10則、全文攤開及可見800ms即已讀的方式；後續修改須遵照現行規則／體驗正文，未有新指令不得自行增加說明區塊或改變三則上限。

- 每頁最多三則平面摘要，點開一則才顯示全文及持久已讀，同時只展開一則；全部／未讀／已保留及翻頁同列，沒有通知底部說明列。三個月文案直接接在既有創作者中心副標之後。
- 桌機保留／刪除圖示同排；手機「⋯」小選單，點外或Esc收合。通知不可編輯，保留不等於已讀。保留狀態與已讀狀態都由伺服器確認，失敗不顯示假成功。
- 三個日曆月使用Asia/Taipei及SQL生成的expires_at；未保留到期即從清單／未讀排除，每小時清除資料列。保留可持續保存；取消保留不重設期限。原Battle／queue外鍵改為SET NULL以免連帶刪掉保留通知；刪帳號仍CASCADE。
- Migration `20261015121956_account_notification_retention.sql` 已套用正式Supabase `rwueinzgjaaefjvmsyem`。新增kept_at、expires_at、索引與可見RLS；authenticated僅保留舊客戶端read_at寫入權限，不能改內容／日期／保留。會員驗證API負責本人read／keep／unkeep／delete，所有操作以user_id限制，拒絕救回已過期未保留通知。
- 新增 `/api/cron/account-notifications`，沿用正式CRON_SECRET授權，每小時15分執行條件DELETE。首次已用相同條件清除122則過期未保留通知，175→53，剩餘過期未保留0則。未刪作品、原評論、檔案或Credit流水。
- 正式DB rollback交易驗證月份月底、保留免清、取消保留恢復期限、近期不清及不可編輯權限；所有QA fixture已rollback，沒有提交假公開評論或測試通知。

### 驗證證據與界線

全套659項：627通過、32既有可選DB略過、0失敗；通知相關12項通過。TypeScript、webpack正式build通過；lint 0 errors／14既有warnings。手機修正後相關12項、TypeScript、相關檔lint及正式build再次通過。

正式站已驗證保留→刷新仍保留→已保留篩選→取消保留回空、三則前後翻頁、既有評論點開與正確MV連結、跨頁鈴鐺返回。保留測試已還原至原狀。該帳號既有消息皆已讀，新的未讀→點開→持久已讀及刪除補位／最後頁回退以runtime測試驗證；不為UI測試刪除會員未過期的真實消息。

匿名通知API與cron均401；本機CRON_SECRET與正式環境不同，手動帶本機secret呼叫也401，沒有更換正式secret。排程已隨部署配置；實際排程首次自動執行時間未觀察，首次清除使用授權SQL完成，不冒充已觀察到排程執行。

最終應用SHA：`7fe2d5872400b4df8ec0e33c174fb47107f8889b`，分支`codex/public-rule-copy`；Vercel `dpl_4xqwy5Ch7gNPExu8bTRqrQNNJYdx` READY，aipoger.com／www同SHA。320px中英日韓全部三則、頁面無水平溢出、所有通知控制在容器內；390px中文操作選單、1440px桌機驗收通過。最終巡覽console errors為空。
證據目錄：`/Users/huangyihong/Documents/New project/audits/2026-10-15-notifications-compact/`。
