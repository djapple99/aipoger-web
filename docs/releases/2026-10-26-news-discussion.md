# 新聞會員按讚與討論發布驗收

- 日期：2026-10-26（Asia/Taipei）。使用者授權在新聞底部加入按讚、評論與建議，所有互動須登入，按既有Do it約定測試後部署。
- 應用commit：`b80ae04`；發布分支：`codex/public-rule-copy`。
- Vercel：`dpl_2cW555nJYzdaHMDJEmbjWNmCWGrB`，READY，已promote至aipoger.com。部署URL：https://aipoger-web-rnz8-glh7s18kb-yohungs-projects.vercel.app 。
- 正式入口：https://aipoger.com/news/youtube-music-ai-labels?lang=zh#news-discussion 。
- 前版可回滾部署：`dpl_6K1wjRCjzBcgUpnDM6JkezZKMPyG`；新DB為獨立空表，舊版不讀取，不需破壞性回退SQL。

## 結果與範圍

文章來源後加入內嵌討論區。標題旁並列按讚與留言數；登入會員自動顯示儲存公開舞台名，提供「留下你的建議」與1000字表單。訪客可讀，點按讚或留言動作前往登入，保留文章、語言及討論錨點。沒有新增點數、作品評分或人氣算法。

每位會員每篇至多一讚，可取消。所有寫入先由auth.getUser驗證，拒絕未登入／失效token及Supabase匿名帳號；客戶端偽造userId、displayName、count、Credit均不使用。公開讀取只回傳公開署名、內容、時間與統計，不回傳帳號ID／Email／requestId。GET個人狀態採private/no-store及Vary Authorization。

留言以user/requestId去重，提交成功但回應丟失後重送仍只有一筆；失敗保留草稿及ID，同帳號焦點登入／刷新不清稿，登出／換帳號才清稿。留言每會員每小時12則防洗版，20則一頁、createdAt/id游標，避免同時間排序漏筆。隱藏留言不計公開數，原後台新增「新聞留言」來源，可檢舉、隱藏、恢復與刪除。

## 資料庫

- 本機migration：`supabase/migrations/20261026132404_music_news_discussion.sql`，透過supabase migration new建立。
- 正式migration ledger：`20261026133644`／`music_news_discussion`，已實際套用。
- 新表：`music_news_likes`、`music_news_comments`。RLS開啟、anon/authenticated/PUBLIC無表grant；僅server service_role讀寫。
- 三個service-only SECURITY INVOKER RPC：`read_music_news_discussion`、`set_music_news_like`、`save_music_news_comment`。顯式search_path與revoke/grant，未賦予service_role讀取auth.users。
- 正式交易內驗證按讚去重／取消、同request重送、隱藏／恢復及公開欄位，全部ROLLBACK。確認新表0則測試留言、0個讚；未更動真人作品／留言／評分／Credit。
- 舊creator_credit_summary、兩個edit_work_review overload、save_work_review、save_work_comment_reply的prosrc MD5前後相同。
- Security advisor既有兩類WARN（14項既有函式與1項密碼保護設定）未變。兩張新service-only表各增加一筆RLS enabled no policy INFO，符合不開放瀏覽器直讀的既有架構。

## 驗證

- 全套881測試：849通過、32選用DB測試略過、0失敗；包含實際PGlite PostgreSQL權限、讚去重、request重試、限流、1000字Unicode、同時間游標及失敗原子性。
- 新增11項定向測試全通過，最末effect取消處理修訂後再次通過。TypeScript、本機webpack與Vercel雲端建置通過。修改元件lint無新增錯誤或警告；原全站9項既有warning保留。
- 真實元件與正式CSS的本機隔離瀏覽器：會員讚／取消、草稿保留、回應遺失後重送只存1筆、同帳號SIGNED_IN保留文字、登出隱藏表單。音訊持續播放中完成打字及重送，前後paused=false、來源相同；不是向正式文章刊登測試留言。
- 四語1440px與320px：無水平溢出，互動按鈕至少44px。正式Chrome已登入會員看到本人儲存公開署名與表單；正式320px無溢出，console無error。未代使用者按正式讚或刊登正式留言。
- 待發布部署先用既有Vercel登入與vercel curl驗真實公開GET、訪客POST/PUT 401，之後promote。未關閉部署保護，未下載或讀取登入憑證。
- 正式11項HTTP檢查通過：文章SSR／canonical／討論標題、新聞列表、公開API、訪客兩種寫入401、無文章404、游標400、聖經會員全文401，以及首頁／MV／探索200。
- 原文章正文、SEO／OG／分享封面、音樂及MV播放器、留言／評分與每日社團分享範圍保留。

## 現行文件與證據

六份現行正文與索引已更新，Drive沿既有ID原地同步並讀回核對；本report只保存部署及驗收證據，正式規則仍以產品／體驗／工程正文為準。

本機證據：`/Users/huangyihong/Documents/New project/audits/2026-10-26-news-discussion/`，包含production-http.json、DB migration／回滾後檢查、核心函式hash、advisor前後、四語尺寸結果與正式桌機／手機截圖。瀏覽器驗收用fixture與音訊只在/tmp，不進發布包。
