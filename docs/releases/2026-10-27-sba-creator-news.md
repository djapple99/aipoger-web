# 2026-10-27 SBA 創作者經營圖文新聞

使用者確認選題與切角，授權沿現有文章版型寫成完整圖文新聞、測試後直接上線。日期採 Asia/Taipei。

- 應用：`ac9178e`（文章主體 `536b7cc`），GitHub `codex/public-rule-copy` 已推送。繼承已發布的精簡點數視窗 `35137ce`，沒有還原其他任務的變更。
- 正式：[SBA 新聞文章](https://aipoger.com/news/sba-creator-small-business-guidance?lang=zh)、[新聞列表](https://aipoger.com/news?lang=zh)。
- 部署：`dpl_4NgHY9NHe4X68k5KsqzbPyS5nfF9`，READY；production --skip-domain 建立待驗收版本，通過後以 request_promote 切換同一 build，aipoger.com 返回相同 ID。
- 待驗收網址：`https://aipoger-web-rnz8-cqee8fd9w-yohungs-projects.vercel.app`。回滾目標為前一正式部署 `dpl_9CYrmbg17t7qtGxGHDipXDYMDeyT`（`35137ce`）。

## 完成內容

新增「創作者也是老闆：美國 SBA 釐清影音創作者的小企業分類」，先列三點摘要，再展開新聞事實、兩組圖解、愛波哥觀點與三項經營建議。原創 1200×630 PNG 約59KB及可編輯SVG；圖說標為概念圖，沒有挪用官方或外站照片。

首頁依原排序仍最多三篇，新文為主打；列表保留全部四篇，第四篇接續既有網格。每篇互相延伸閱讀並保留介面語言。新文有獨立來源、OG／Twitter圖片、NewsArticle、中文canonical及Sitemap。文章標題加入平衡換行，改善320px末行單字。沿原會員按讚、留言、公開舞台名與登入返回；沒有資料庫遷移、Auth／Storage、評分、Credit或音樂作品資料變更。

## 編輯查核

- 官方事件日2026-10-15，本站發布／查核日2026-10-27，Inc.報導日10/26；日期分開呈現。
- 依SBA原公告：原本符合方案要求的創作者事業就可能取得支援；此次是針對影音事業的分類指引，5121為產業組別，仍須依主業選六位數細項。
- 不把分類說成新補助、貸款必過或第一次才有企業資格；以SBA補助說明核對一般創業／擴張限制。
- BLS的5121影音與5122錄音分類分開呈現，不替個別音樂創作者判定資格，也不推論AI著作權。
- 台灣讀者的收入／成本／合約／作品授權紀錄清單，明確標為AIPOGER經營建議，而非SBA申請要求。沒有把單一美國事件寫成全球政府趨勢。

## 驗證與限制

- 34項定向全部通過：四語SSR、獨立正文與metadata、首頁三篇／列表四篇、PNG尺寸、新slug公開讀取與訪客寫入401、Sitemap及404。
- 全套907項：868通過／39既有選用略過／0失敗；TypeScript、本機webpack及最終Vercel雲端build通過。Lint 0 errors／9既有img warnings。新文章為服務端元件，未新增client state或資料請求。
- 最終待驗收版本：首頁／列表／新文中英日韓320px全部無水平溢出，手機摘要在封面之前，延伸閱讀保留語言；1440px桌機三頁截圖已檢視，pageerror 0。討論API成功後按讚按鈕可用，訪客仍須登入。
- 正式16項HTTP全部通過：首頁3篇／列表4篇、四篇正文與互相連結、新文日期／canonical／NewsArticle／四個來源、1200×630 PNG、Sitemap四篇不重複、未知slug404、公開討論200、訪客POST／PUT 401，以及登入／探索／MV／Battle入口200。
- 正式390px文章200、封面載入、討論按鈕完成載入且無水平溢出。發布查核時，此部署error／fatal runtime log為0筆。未在正式站製造測試讚、留言、評分或作品。
- 本機既有API設定回報 Unregistered API key，首頁資料與討論的完整驗收改在待驗收production環境完成；未下載或修改正式密鑰。
- 社群實際抓取與快取更新由其平台決定；已驗伺服器HTML及分享圖片，不宣稱已發社群貼文或已重新抓圖。

證據目錄：`/Users/huangyihong/Documents/New project/audits/2026-10-27-sba-news/`，含來源判讀、測試／build／lint、最終四語版面、正式16項HTTP與手機畫面。現行正文與索引使用既有Drive ID原地更新；同步讀回結果見同目錄的drive-verification.json。
