# 首頁精選MV：簡潔又有力的版面

2026-10-27（Asia/Taipei）使用者確認demo並要求納入以後的設計規範、開始修改網站。固定設計正文位於`aipoger-experience.md`的Visual Language；本report只保留實作與驗收證據。

## 已確認版面

- 標題與副標桌機同排；左側影片下集中評論、YouTube、頁碼與前後切換，與右側橘色觀看CTA共用基線。
- 作者下方整合真實平均分／10、評分人數及獨立週支持，點評分進原評論／評價；無評分和讀取失敗分開呈現。
- 收斂標題與評論區密度、探索區向上，手機自然換行並維持44px操作。原封面、播放、評論、四語與限時推薦保留。
- 已確認demo：私人驗收目錄`/Users/huangyihong/Documents/New project/audits/2026-10-27-compact-featured-mv/approved-demo.png`。示範數字不直接寫進產品。

## 實作

- 首頁專屬CSS grid兩列：影片／作品資訊、次要操作／主要CTA；不影響MV主頁與其他共用樣式。
- 首頁discovery接原`work_rating_summaries`公開彙總，只補入目前推薦作品，不新增資料表或寫入。彙總失敗保留首頁，欄位未知不當成零；空推薦不查分數。
- 播放中的作品保留原iframe，背景評分更新可顯示最新分數；評論視窗沿同一作品ID，原播放狀態與草稿行為保持。

## 驗證與發布

- 應用`0fd1478`，平板斷點修訂`4cedfc1`；只改精選首頁及評分讀取，沒有DB migration或正式互動寫入。
- 定向50/50；完整918項：879通過、39選用略過、0失敗。TypeScript、本機webpack通過；lint 0 errors、9既有圖片warnings。
- 待驗收桌機1712px，同一首`no one stays — where nothing can breathe`：精選高度757.63→641.82px，探索標題頂端889.63→773.82px，往上115.81px；左右操作列y=666.82px、高52px，無水平溢出。
- 手機中英日韓320px、中文390px無水平溢出；評分／評論／YouTube／前後切換均至少44px。768px初驗發現兩欄留下空白，最終修訂將900px及以下改單欄，防止重現。
- 點真實9.0／2人評分開啟同作品原評論視窗，顯示同分數及原評論、創作者回覆；訪客輸入禁用，沒有提交測試內容。原YouTube影片實際播放至0:02／0:31，收起正常，瀏覽器error 0。
- 待驗收公開API：四支首頁評分與MV原彙總一致；四支精選ID、全部99支MV ID與人氣順序保留；Eve限時推薦仍第一，兩頁期限仍2026-11-01T00:00:00+08:00。
- 驗收圖片與JSON：私人`audits/2026-10-27-compact-featured-mv/`，包含已確認demo、前後桌機、手機四語、平板、幾何與資料核對。
- 最終雲端build READY：`dpl_7ToYfKLHnVLp4kncCrRyp4JdhKw3`，來源`4cedfc1`；先prod --skip-domain驗收，後promote同一build，aipoger.com核對同ID。原先`0fd1478`候選build未綁正式網域。
- 正式11項HTTP通過（四語首頁、MV／Explore／Showtime／News、兩個discovery、通知訪客401），四支真實評分、99支MV、限時置頂與期限再核對通過；桌機左右操作y相同，輪播與原作品評分正常。發布查核error／fatal runtime log為0。
- 最終768px為單欄681px、無溢出；1712px保持903.68／420.32雙欄。最終修訂只改平板CSS斷點，原50項定向／全套測試結果仍適用，雲端建置重新通過。
