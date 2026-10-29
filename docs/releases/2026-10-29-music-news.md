# 2026-10-29 每日新聞：Easol 主辦實務與 PRS 播放資料

狀態：兩篇內容完成，待最終本機檢查及同一 production --skip-domain build 驗收後發布。本頁完成時補記正式證據。

## 正式基線與工作範圍

- 使用者後續確認今日兩篇有價值新聞，Easol 須加深主辦方實務；未充分核實題材不湊數。
- 即時核對 apex／www 仍為 `dpl_5epqX9GjDRn9aSz8PHi6uBsg7Bup` READY，工程記錄對應應用 `67eec4c`。來源 HEAD `5882ac5` 與該應用只有文件差異，GitHub 分支唯讀讀回一致。
- 隔離 checkout 在 `/Users/huangyihong/Documents/Codex/2026-10-29/task/aipoger-news-20261029`，保留原新聞工作樹及主 repo 既有大量未提交內容。
- 只改兩篇正文、新聞 catalog、文章路由對應／來源提示、四個原創 SVG／PNG、新聞／SEO 測試及本發布紀錄。沒有 Supabase、key、排程、音檔清理、其他網站功能、依賴或字型變更。
- 沿原 catalog 排序：首頁最多三篇，新聞列表全部七篇；兩篇各有來源、日期、專屬分享圖、NewsArticle 與 Sitemap，沿原會員討論。

## Easol 編輯查核

- 標題：Easol 把 AI 放進音樂節後台：客服、套票與加購怎麼運作，主辦人該守住哪些權限？
- 文章：https://aipoger.com/news/easol-teammates-festival-ai-agents?lang=zh
- 事件 10/28 公司公告（PR Newswire 11:00 ET），本站發布／查核 10/29；未另列發布日期的產品／操作文件不當成同日新政策。
- 逐頁重新核對公司公告、Teammates、三種 Agent、客服操作、Boots in the Park 案例、Pricing、Agent Resolved 計費、顧客幣別、多語與 Creator Terms；原始連結完整列於 catalog／文章。MBW 僅發現題材。
- 客服以操作文件為準：AI 擬稿／提案，寄信及改單、取消、退款均需人工核准。行銷頁有不同自動化描述，明示差異，不判定哪頁過時，不保證全自動可用。官方音樂節案例也有逐次批准；省略未獨立驗證的成效百分比。
- 平台 $250／月起、營收 2% 起與支付費分列，未認定包括完整 AI 方案；Agent Resolved 週計費及七天確認期不等於無人批准，單案價格未公開。
- TWD 未列、特定結帳／帳戶頁語言未列中文；不把翻譯草稿當全站繁中。台灣收款、銀行、發票、LINE Pay、ibon、KKTIX 均未確認，沒有推論一定支持或完全不支持。
- 主辦方工作量／規模、總費用與五項驗收為明示本站分析；未註冊、未聯絡廠商、未實測或虛構親身經驗。沒有推論平台資料不外流或不用於訓練。

## PRS × Soundtrack 編輯查核

- 標題：店裡播了什麼歌，版稅就更有依據：PRS 將導入約 7,000 個英國場所的播放紀錄。
- 文章：https://aipoger.com/news/prs-soundtrack-uk-play-data-royalties?lang=zh
- 事件 10/28，本站發布／查核 10/29；計畫 2026/12 起納入分配，沒有聲稱已完成。
- 合作依 Record of the Day 明標 Press release 的公開新聞稿重刊及 MBW 同日報導。未在雙方官網找到該公告，不宣稱官網公告已核，不把可能同源報導當兩組獨立調查；另以官方 PPL PRS／PRS 權利與登記說明建立背景。
- 約 7,000 英國場所、擴充既有資料合作、減少缺直接紀錄時的類比依賴；非首度使用紀錄、非取消所有估算、非固定每播一次費率，沒有增收保證。
- 清楚區分 PRS 詞曲與 PPL 錄音權利；資料仍須匹配。未擴大成所有 DJ set／現場或台灣自動適用，沒有新增 AI 音樂資格規則。PRS 登記僅作情境例子，非所有讀者的統一要求。
- 新聞事實與本站觀察分開，沒有長引文或搬運圖片；原始來源完整列於 catalog。

## 素材與變更檔案

- 自製兩份封面，各含可編輯 SVG 及 1200×630 PNG：Easol 70,579 bytes，PRS 77,630 bytes。沒有外站照片、官網圖片或 logo；封面及正文圖解均標明示意，非產品介面。
- `src/components/easol-teammates-article.tsx`、`src/components/prs-soundtrack-article.tsx`：兩份獨立原創正文。
- `src/lib/music-news.ts`：兩篇資料；可選 sourceNote 供 PRS 準確標示合作來源，其餘文章保留原提示。
- `src/app/news/[slug]/page.tsx`：兩篇正文對應與可選來源提示。
- `public/news/easol-festival-ai-approval.{svg,png}`、`public/news/prs-soundtrack-uk-play-data-royalties.{svg,png}`。
- `tests/music-news-runtime.test.mjs`、`tests/public-seo-runtime.test.mjs`：七篇／四語／來源／日期／封面／SEO／延伸閱讀。

## 中斷與舊待發布版本

第一稿 `9976da0` 的 staged production `dpl_4kHcQWkckYihQPxmnBr7M7iNcotg` READY，未 promote、未 push。使用者要求深入內容後已停用作為發布候選，不可直接提升。首輪 HTTP 在建置切換期間 17/19，前兩次沒有取得文章；READY 後重跑遇 Mac 通道斷線。恢復後核對該次沒有產生結果檔，不聲稱已通過，不盲目重跑已被內容修訂取代的舊版。後續兩篇新 build 需完整驗收。

本次沒有自動核准審查拒絕發布或建立憑證。始終不建立分享連結／bypass token、不調整 Deployment Protection 或 Trusted Sources，只使用既有登入與驗收權限。

## 最終驗證與發布

待補最終測試、build、待發布及正式驗收。私人 log、HTTP 結果與截圖保存在本任務目錄，未提交或上傳。正式資料庫 QA 不在本次內容任務範圍。

本機視覺驗收發現同名封面曾命中前稿的 Next image 快取；改用描述人工核准的新素材路徑 `easol-festival-ai-approval.png`，避免跨版本舊圖，未改圖片快取設定。

## 最終本機驗證

- 49 項新聞／SEO／熱門排行定向全通過；最終全套 972 項，930 通過／42 既有選用測試略過／0 失敗。正式 DB QA 未跑。
- TypeScript 通過；lint 0 errors／9 既有 img warnings；最終 webpack 建置通過，未改字型、依賴或環境值。
- 兩篇實際 Chrome 1440×900、四語 320×812：正確封面載入、無水平溢出、zh-Hant 正文與語言提示、手機摘要先於封面、延伸閱讀保留語言。320px 列表七篇，圖片的 lazy loading 與資料 API 完整狀態在待發布版本續驗。
- Vercel dry upload 1,165 檔，未含環境檔、node_modules、私人證據或測試輸出。本機沿既有 ignore 環境配置，未下載或修正正式 key。
