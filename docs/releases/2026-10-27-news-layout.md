# 2026-10-27 新聞比例與社群榜名

使用者要求首頁新聞縮為一篇主打、旁邊兩篇小卡；新聞列表先參考Showtime，未來再考慮熱門新聞榜。同輪要求熱心樂評／活躍創作者／熱心評測者榜名有更明顯的藝術標記。作業跨日，本文件使用最新用戶端Asia/Taipei日期2026-10-27；證據目錄沿開始建檔的2026-10-26，文章原發布日期不變。

- 應用commit：`e83af71`，GitHub `codex/public-rule-copy`已推送。
- 部署：`dpl_5jeEBqwSBfHouaKaL7nZnxL4VQxy`，production --skip-domain先驗收，再promote同一build；get_deployment(aipoger.com)返回相同READY部署。
- 待驗收網址：`https://aipoger-web-rnz8-mh50qkmu8-yohungs-projects.vercel.app`。
- 正式：[精選新聞區](https://aipoger.com/?lang=zh#home-news-title)、[音樂新聞](https://aipoger.com/news?lang=zh)、[Showtime社群](https://aipoger.com/rank?lang=zh#showtime-reviewers)。
- 回滾目標：`dpl_GEQBKTPqepFmsERT3UkFRpBPDwXW`（`53365da`）。沒有資料庫遷移。

## 新版布局

精選首頁共用MusicNewsGrid，桌機主打在左、右側兩小卡上下排列，移除每張卡重複的長摘要與閱讀按鈕；連結保留原slug和介面語言。1440px實測整區約1173.34px→495.71px，縮短約58%。封面完整保留1200×630比例，主打圖大於旁卡，不裁掉圖中文字。手機主打一張、其餘兩篇縮圖橫列。文章不足時不留空格；新聞首頁更多文章會接續網格，首頁仍最多三篇。

新聞首頁採Showtime式主打橫向並排、下面兩篇小卡，縮小頁名與留白；未新增空側欄或熱門排名。文章全文、來源、會員互動、專屬分享與SEO沿原內容。

Showtime三個社群榜名用暖橘／青綠／淡紫，字後有低透明斜切標記與左上／右下角框。日期、Top5、名單和數字留在原位置；手機切換鍵44px、選取色與對應榜名一致。只改包裝與CSS，未修改社群API、30天統計、排序函式或資料。

## 驗證

- 定向27項通過：原文章SSR／metadata、首頁／列表各一主打兩小卡、零篇／單篇／兩篇／多篇不重複不漏項、四語深連結與既有SEO。
- 全套886項：854通過／32選用略過／0失敗。tsc、本機webpack及雲端build通過，ESLint 0 errors／9既有img warnings，變更檔案無新警告。服務端新聞網格不新增client state；Showtime原hook／選取行為維持。
- 待驗收Chrome：1440px首頁一大兩小及新聞主打／小卡畫面；兩頁四語320px無水平溢出，768px平板通過；Showtime四語320px通過，三個切換鍵各44px、僅顯示對應榜且選取色一致。社群資料載入後每榜5人，Stage API 200。
- 正式19項HTTP通過：首頁／新聞列表三篇且一主打兩小卡、三篇SSR／OG／canonical／JSON-LD、兩張PNG、Sitemap、404、新聞公開留言及訪客POST／PUT 401、探索／MV／登入入口、社群三份Top5 API。
- 發布切換初期一次主次卡片markup斷言未過；重取首頁與列表皆為一主打兩小卡，再完整跑完19項通過。沒有以略過斷言當成成功。
- 正式Chrome確認新布局與三個榜名色彩，主打卡可進完整文章且討論區存在。發布查核時部署error／fatal runtime log 0筆；未在正式站製造測試留言、讚、評分或排行資料。
- 文章與原分享網址、播放、邊聽邊評論、會員寫入驗證、評分／Credit及原音樂排行保留；熱門新聞榜只列後續規劃，尚未新增。

證據：`/Users/huangyihong/Documents/New project/audits/2026-10-26-news-layout/`，含高度前後、桌機／平板／四語手機、社群切換、測試／build、19項正式HTTP及部署識別。對應現行正文與索引共6份變更檔使用既有Drive ID原地同步，營運正文未改；六份正文與索引共7份讀回逐位元組及SHA-256一致（drive-verification.json）。
