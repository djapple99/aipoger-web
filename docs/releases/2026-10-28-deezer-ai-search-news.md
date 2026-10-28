# 2026-10-28 Deezer AI 音樂搜尋開關新聞

本次每日新聞依已核實選稿只新增一篇，不湊三篇。一般平台政策已獲發布授權；法律個案指控不在本篇。沒有社群發文、寄信、資料庫／key／排程／基礎設施或其他網站功能變更。

## 正式基線與範圍

- 發布前即時核對：apex／www指向READY的 `dpl_5GCDUYakRuHNw6yj9436aN33XkHL`，應用commit `cb7a722`。
- 從乾淨 `0ba86b3d8937f3d262abf82966af913d024686aa` 建立task-2內獨立checkout；相對正式應用的差異只有文件。主repo大量既有未提交內容與原public-rule-copy工作樹均保留。
- 新增 `deezer-ai-music-search-toggle` 正文、catalog、路由map、原創1200×630 SVG／PNG封面（65,589 bytes）及新聞／Sitemap測試。Sitemap快取鍵加入已發布新聞slug與查核日期，避免跨部署共用舊四篇索引。既有首頁最多3篇、列表全部5篇、延伸閱讀、會員討論、OG／Twitter及NewsArticle沿用原機制。
- 題目：「Deezer 再確認年底前推出 AI 音樂搜尋開關：上架、推薦、被找到，是三件事」。
- 公開目標：`https://aipoger.com/news/deezer-ai-music-search-toggle?lang=zh`；發布狀態以本頁後續正式驗收紀錄為準。

## 原始資料與編輯判讀

- [Deezer 10/27 Q3官方公告](https://newsroom-deezer.com/2026/10/deezer-delivers-second-consecutive-quarter-of-revenue-growth-and-upgrades-its-fy26-outlook/)重申預計年底前推出。
- [Deezer 10/13功能公告與FAQ](https://newsroom-deezer.com/2026/10/deezer-ai-music-toggle/)為首次公布；搜尋開關可選、可關閉，針對fully AI-generated歌曲、專輯與相關藝人；有限AI輔助的人類創作另作區分。既有推薦／編輯歌單政策與搜尋計畫分開。
- [MBW 10/27報導](https://www.musicbusinessworldwide.com/deezer-raises-2026-outlook-as-q3-revenues-grow-1-8-yoy-to-149-5m-but-total-subscribers-fall-to-8-7m/)僅用於發現議題，回查以上官方資料，沒有翻譯或近似搬運原文。
- 本站發布／查核日10/28，事件日為10/27最新重申；正文交代10/13首次宣布。未宣稱已上線，不引用財報營收、42m等非本篇重點數字，不把搜尋過濾寫成全部下架或全面無版稅。
- 原創圖解標示概念、非Deezer介面，沒有新聞照片或官方產品截圖。觀點與行動明確標為AIPOGER建議；不虛構作者親身經驗、不提供規避偵測方法、不保證人工剪輯豁免。

## 本機驗證

- 34項新聞定向測試通過；新聞與公開SEO組合36項通過。全套938項：898通過／40項既有選用測試略過／0失敗；未啟用正式資料庫測試。
- TypeScript通過；Lint 0 errors／9筆既有img warnings；`git diff --check`通過。
- 原樣 `next build --webpack`通過；不修改字型、依賴或設定。本機初次因sandbox DNS無法下載既有Google Fonts中斷，允許必要網路後編譯成功；獨立checkout再使用既有、被ignore且不顯示／不上傳的本機環境配置完成全建置。
- 本機1440×900桌機、390×844手機文章已檢視；320px中英日韓正文均為真實繁中、封面載入、無水平溢出、延伸閱讀保留語言。320px列表5篇，最新主打為Deezer。
- Vercel CLI project inspect核對既有團隊與project ID，不新增專案、不改環境值。`.vercelignore`排除環境檔、截圖及輸出。

## 待發布驗收與正式發布

此初始紀錄尚未宣稱發布成功。後續以production環境 `--skip-domain` 建立待驗收build，通過後promote同一build；記錄commit、deployment、HTTP／瀏覽器驗收及正式alias。


## 待發布驗收發現與限定修正

第一個待驗收production build `dpl_G4d6uZRyUeX5733FkPwsFD5MZK8z` READY，commit `16de20c`；18項HTTP中17項通過。Sitemap回傳200但仍列舊四篇，確認跨部署共用固定unstable_cache key造成。只將新聞slug／verifiedOn納入同一cache key，保留原300秒策略及其他資料讀取；新增模擬共用cache的跨新刊／修訂／舊刊並存回歸，938全套898通過、40略過、0失敗。後續新build須驗Sitemap新文僅列一次。

第一build實際Chrome桌機、四語320px文章已驗封面、繁中正文／語言提示、延伸閱讀及討論載入；討論真實0讚0留言，未製造互動。本機既有API配置報Unregistered API key，首頁／Sitemap／討論／探索等資料驗收不冒稱通過，改在production待驗收環境完成。

in-app browser沒有Vercel登入。自動核准審查拒絕會建立23小時分享連結的fetch；該連結未建立、未重試。改用已存在的automation驗收權限作HTTP唯讀檢查，以及Chrome既有Vercel登入作真實畫面驗收，未建立憑證、分享、修改保護或Trusted Sources。無需因此擴大權限。
