# 萬聖節 MV 限時推薦

使用者確認與實作日期：2026-10-27（Asia/Taipei）。已正式發布並驗收。應用`d5c6893`，部署來源`1b99229`，發布分支`codex/public-rule-copy`（實作分支`codex/halloween-mv-feature`）。

## 範圍

- 指定Eve《🎃 怪獸也想當偶像？萬聖節男團出道！👻 The Boo Crew｜Boop! Monster Mode #Shorts #Halloween》。原作品ID `fda62063-417c-4d81-b3d7-b7d2d58f15f7`，YouTube `0NlXuljHn0I`；以正式公開API與使用者截圖核對。
- 台灣時間2026-10-27起至2026-11-01 00:00前，首頁精選固定預設第一支，MV主頁在原人氣榜／最新區之前顯示大幅推薦。
- 不受一般選片輪替或其他作品支持數影響；期限後恢復原規則，無需人工關閉。原排行、投稿時間、留言、評分、Heart、Credit與作品資料未改，無SQL或migration。

## 實作

- 共用`mv-promotion.ts`定義精確含時區的起迄時間及原ID，僅從合資格公開MV中挑選，不以模糊歌名比對，不重新上架隱藏／刪除作品，也不加入專輯。
- 首頁推薦去重、最多四支，單曲區沿原ID排除；MV完整清單、人氣排序與週支持原結果保留。四語推薦標籤與原封面／觀看／互動共用。
- 首頁API在期限前60秒停用快取，兩頁皆保留每60秒及返回頁面刷新，另於精確期限觸發重讀；持續觀看的影片不因曝光例外結束而中斷。

## 驗證

- 3項新規則測試涵蓋每4小時輪替、新作及更高週支持、去重、到期精確邊界、非年度循環、快取邊界、缺少／隱藏／未公開／非影片／專輯排除。
- 1項新增MV runtime測試驗證推薦位於榜單前、觀看沿原作品、到期重讀後移除推薦且保留正在播放的影片。
- 全套911項：872通過、39選用測試略過、0失敗。TypeScript通過；lint0 errors／9既有img warnings。本機與最終雲端webpack建置通過。

- 正式首頁與MV頁四語320px無水平溢出；推薦操作鍵44px以上。桌機原封面載入1280px，YouTube觀看視窗確認同一影片`0NlXuljHn0I`，開啟／關閉正常，未送出評論、評分或Heart。
- 正式12項HTTP（首頁、四語MV、作品頁、兩個discovery API、登入、酒吧、音樂分析、Battle setup）皆200；瀏覽器未捕捉到error。
- 發布前後99支MV ID與原投稿時間保留。期間指定MV新增1份真實公開評分／支持，因此另以舊build和新build同時讀取目前資料比對：99筆原日期／評分／支持、完整人氣排序及原週支持精選完全一致。推薦不改寫作品互動。

## 部署與文件

- Vercel `dpl_DHvPYJ9nwrwPDiJFMcdL7R2aqVqU` READY；[build](https://aipoger-web-rnz8-qxq6vp46o-yohungs-projects.vercel.app)。先prod --skip-domain並檢查首頁與MV API的指定作品／期限，再promote同一build；aipoger.com查核相同ID。
- 基底包含當日SBA新聞`ac9178e`、精簡點數視窗及既有發布；主repo其他未提交程式未部署。無資料庫變更、秘密或環境設定修改。
- 現行產品／體驗／工程／索引及協作入口更新；Drive沿既有檔案ID原地同步並核對讀回。營運／roadmap不變。
- 私人驗收證據：`/Users/huangyihong/Documents/New project/audits/2026-10-27-halloween-mv/`，含前後公開API、舊新版資料比對、HTTP與桌機／四語手機截圖。未來期限由固定時間的單元／runtime測試驗證，不宣稱已觀察未來正式狀態。
