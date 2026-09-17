# Choice 管理精簡與收藏順序

更新：2026-09-18 05:04 Asia/Taipei。

## 發布

- 應用 commit：`147dbc6`；分支：`codex/choice-management-simplify`，已 push。
- Vercel：`dpl_FfPbhR4V3nXbMaJswnNf5vZ9Yw5t`，READY 並 promote 至 aipoger.com。
- 版本 URL：https://aipoger-web-rnz8-jukvrju11-yohungs-projects.vercel.app
- 僅提交本次檔案；逐檔比對前版後同步回原本 dirty 網站工作區，未清除或提交其他既有改動。

## 本次範圍

- 依使用者最新要求，新歌待宣傳、官方 Choice 草稿退出頭像紅點與後台待辦彙總。Bar 內原本宣傳標記／數量不動；同票、檢舉及社群工作提醒保留。
- 移除官方 Choice 製作表單、封面編輯與選曲池，並停用對應 API（owner 通過驗證後回 410）。後台僅列所有已發布 Choice，支援搜尋、分頁、公開查看、主推及確認刪除；不展示私人草稿，也不自動刪除舊草稿。
- owner 改用個人 Choice 製作入口。既有官方發布內容、身分與分享連結保留；本次沒有實際刪除歌曲、歌單、互動或改寫分數。
- 新增私有 per-user 收藏時間，只在首次收藏／取消後重收藏記錄。每日重按 Heart、其他人的互動及留言不刷新排序；已編排的 Choice 曲序不變。
- 舊資料只有 favoriteUserIds，沒有各人收藏時間。未用上傳或全域 updatedAt 偽造舊收藏時間；有時間的新收藏優先，舊收藏穩定排在後方。

## 驗證

- 444 項測試全通過、0 略過；TypeScript、本機及雲端 build 通過；lint 0 errors，16 項既有 warnings。
- 新增實際 TypeScript API runtime 測試：權限、停用寫入、發布限定、超過 500 筆分頁、刪除範圍、收藏時間、兩條收藏寫入路徑，以及不洩漏私有時間資料。
- 實際管理元件的隔離 Node renderer 與事件綁定測試通過；使用 CUA 瀏覽器檢查桌機、390px 與 320px 手機版。封面載入正常、無橫向溢出、管理按鈕 44px。測試 fixture 不部署成網站路由，不加入正式測試帳號或 auth bypass。
- 正式 /rank、/admin/choice、/profile/choice 回 200；未登入 /api/admin/choice、/api/admin/tasks、/api/creator-choice 回 401；兩類公開 Choice API 回 200。
- 正式瀏覽器驗證未登入管理頁不暴露內容、個人製作入口返回帶 next 的登入頁。未使用 owner 真實帳號操作主推、刪除或新增收藏，不能把隔離測試說成正式登入全流程驗收。
- 無新 SQL migration／回填。沿用既有 JSON 收藏存放方式，其跨請求 read-modify-write 並發限制仍屬既有技術債，本次沒有宣稱已解決。
