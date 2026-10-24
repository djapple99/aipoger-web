# 公開 HTML、SEO 與分享預覽發布驗收

2026-10-25 Asia/Taipei。使用者確認四項修復並授權測試後部署，聖經只公開導讀／摘要、全文維持會員限制。

## 發布

- 應用：`b8cc6d12dc964f857c30b99c7e8201fcbb3fb350`，`codex/public-rule-copy`，已push。
- Vercel：`dpl_9QyWRviUnwrL5nyx5YwwoxSsGNy3` READY；aipoger.com與www均綁定。先以production環境 `--skip-domain`驗證，再promote同一build。
- 前一正式應用 `a90079f`。獨立release checkout實作，未覆蓋主要工作目錄的無關程式。

## 實作與公開界線

原專案為Next 16.2.12／React19 App Router，問題來自useEffect後才讀公開資料。保留框架與互動元件，首頁／Explore／MV／Showtime／Choice／Battle注入首次資料，JSON API和SSR共用原資格及排序邏輯；請求內React.cache去重，不以UA提供不同內容。Q Crash原API結算行為保留，SEO讀取使用明確read-only分支；盲聽配對與未揭曉身分不輸出。

新增原ID作品頁 `/works/[id]`，舊歌曲／MV入口canonical指向同頁；公開作品的原歌名、舞台署名與介紹在HTML中。沿既有播放器及評論／評分API，不新增第二套資料。桌機左播右評，手機上播下評；回應／草稿更新不改播放器key。專輯仍不參與單曲評分／排行。

作品和Choice分享圖採原封面等比置於1200×630畫布，JPEG，保留Linux sharp/libvips tracing；文章使用專屬主題圖。標題／摘要／完整OG與Twitter Card、絕對HTTPS圖片、canonical與四語hreflang在HTML提供；Q Crash維持中英，日韓依既有英文回退。LINE等有限HTML爬蟲與Googlebot完整取得head metadata。固定封面版本連結更新至cover3。

動態 `/sitemap.xml`只讀已公開索引，300秒快取；自有XML序列化轉義`&`及屬性字元，避免Next16內建serializer對帶query網址產生非法XML。robots排除私人、API與投稿工具；私人頁noindex。無詞曲目及未選曲收合歌詞控制，不顯示缺詞佔位。

聖經五篇導讀只取既有公開FAQ，未匯入會員全文；每篇及公開首頁底部加入中英日韓黑橘CTA，分別連Profile投稿及Battle。會員完整API仍需有效登入，沒有Google／社群爬蟲的權限例外。

## 驗收證據

- 783項：750通過、33既有選用DB略過、0失敗；新增SSR原始HTML、公開導讀邊界、404、Sitemap去重／語言／失敗重試／XML轉義、Q Crash不結算、空歌詞及inline評論播放器回歸。原測試僅隨共用handler搬移及新canonical更新入口，沒有關閉失敗測試。
- TypeScript、webpack正式build及Vercel正式環境build通過；lint 0 errors／14既有warnings。
- 驗證部署15個HTTP案例含舊入口、404與會員API401；正式16個公開路由200，包含作品、專輯、歌單、導讀、Battle、關於與合作。原始HTML排除script後仍有真實歌名／作者及導讀摘要。
- Sitemap完整XML解析：1,131個唯一網址，含263件作品的四語頁、4份歌單的四語頁、5篇導讀的四語頁；無雙問號、無私人投稿或會員全文。
- 正式作品／Choice圖片均JPEG 1200×630，導讀PNG 1200×630；皆200。沒有把預覽工具的模擬圖冒充LINE實際送出的聊天卡片。
- 1440px桌機、320px四語CTA／導覽與390px手機上下佈局無水平溢出；原YouTube可實際播放，登入Owner既有9.1及公開評論可讀。輸入／保存的媒體連續性使用隔離runtime測試；未送出正式測試評論、評分或愛心。
- 指定作品原公開留言及歌曲／MV兩種評分API回應發布前後逐項一致，原10首Choice與專輯媒體／分類一致。公開曲庫262列，平均分、評分人數／總和及收藏數一致；五件人氣分隨期間真實盲聽樣本增加，差額逐項等於3×偏好點增量，非本輪改公式。
- 最後部署查詢未見error／fatal runtime紀錄。私人證據與截圖：`/Users/huangyihong/Documents/New project/audits/2026-10-25-seo-release/`。

## 限制

未修改DB、RLS、Auth、Credit、人氣或Battle規則。Google後續收錄與社群舊卡片快取不能保證立即更新；未操作Search Console提交、未發送LINE／Facebook測試訊息。手機使用瀏覽器尺寸模擬，非iOS真機。
