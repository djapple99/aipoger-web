# 音樂新聞與首篇圖文文章發布驗收

日期：2026-10-26，Asia/Taipei。使用者確認文章方向、圖文／口語／先講重點編排，後續明確授權「做吧／let’s do it」。

## 發布

- 應用commit：`90142a6`，`codex/public-rule-copy`，已push。
- Vercel：`dpl_6K1wjRCjzBcgUpnDM6JkezZKMPyG`，READY；正式環境先skip-domain驗證，再promote至aipoger.com。已由apex inspect確認實際deployment ID。
- 部署網址：https://aipoger-web-rnz8-by3xdcy4o-yohungs-projects.vercel.app
- 正式列表：https://aipoger.com/news?lang=zh
- 首篇：https://aipoger.com/news/youtube-music-ai-labels?lang=zh
- 前版：`dpl_5mfEhykxfdzh5RVJxBzbka3hcMWT`，保留可回復。

## 實作與內容

公開新聞以版本管理的已發布catalog提供；列表與全文服務端輸出，沒有先回CSR載入空殼。首頁探索後、社群前加入最新最多三篇，只有一篇時不填假資料。原作品選取與播放state不改。導覽、返回與語系沿既有編輯頁。

首篇先三點摘要，再分類／上架途徑圖解與愛波哥觀點，自製1200×630 PNG封面67,591 bytes；SVG來源與重製腳本保留。圖解明示非官方操作介面，不搬用新聞照片。內容核對YouTube 10/14公告與Help兩份指南；事件日與本站10/26發布／查核日分開，區分一般影片揭露／營利資格與音樂分潤尚未完整說明的範圍。

四語列表／導覽可用，首篇全文只有繁中並明示語言，article lang=zh-Hant；canonical及OG URL固定中文全文，hreflang只宣告zh-Hant及x-default，避免虛構翻譯。加入NewsArticle JSON-LD、OG article、Twitter大圖與Sitemap。未知或未發布slug回404。

無DB migration、Auth/RLS/Storage／環境設定或資料內容DML；原評分、Credit、對戰與會員通知邏輯保留。MBW合作與固定新聞出刊未啟動，沒有自動轉載或社群發文。

## 驗證

- TypeScript無錯誤；ESLint 0 errors／9既有warnings。本機webpack與Vercel正式build成功。
- 870項測試：833通過、37選用略過、0失敗。涵蓋實際新聞SSR、語言／canonical／分享圖、未知slug、Sitemap及原首頁播放／評論保留。
- 真實Chrome 1440×900、320×844與390×844：四語列表／全文無水平溢出；手機重點摘要早於封面，分類圖與來源可讀。非iOS真機。
- 正式環境待驗證版本使用既有Vercel登入與CLI curl存取，未關閉保護或下載生產密鑰。本機舊DB配置失效的首頁不冒充通過；真實首頁改於待驗證與正式版本驗證。
- 真實待驗證版本MV播放成功，評論評分視窗可開啟；沒有送出測試評分、留言或愛心。
- 正式13項HTTP檢查通過：四語列表、四語全文、PNG格式／1200×630、Sitemap合法XML且5個新聞URL、首頁入口、未知slug404及原4支MV／3首單曲ID與發布前相同。
- facebookexternalhit首次HTML含head metadata與實際文章內容；分享圖片HTTP200。未將實際LINE／FB平台的抓圖或快取狀態冒充已驗證。
- 正式文章瀏覽器可開啟、圖片載入、桌機無溢出、手機摘要在封面前。

## 證據

本機私人驗收位置：`/Users/huangyihong/Documents/New project/audits/2026-10-26-music-news/`，包含production-checks.json、production-article-desktop.png、production-article-mobile.png；不提交個人截圖／環境檔。現行產品／體驗／工程、內容營運、roadmap、協作入口與既有Drive檔案原地同步。
