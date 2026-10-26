# AIPOGER 開發與維運

目前應用發布基準：2026-10-26／`53365da`，分支`codex/public-rule-copy`；Vercel `dpl_GEQBKTPqepFmsERT3UkFRpBPDwXW` READY，先以prod --skip-domain建立待驗收版本，再將同一build promote至aipoger.com。新增Suno／Reservoir與Spotify × Believe兩篇原創繁中圖文文章，首頁／新聞列表共三篇，獨立正文／來源／OG／NewsArticle及中文canonical，Sitemap三篇完整。沿用新聞登入按讚／留言，沒有DB、Auth、播放器、評分或Credit程式變更。32定向測試通過；全套885項853通過／32選用略過／0失敗，tsc與本機／雲端webpack通過，lint0錯誤／9既有警告。待驗收版本兩篇四語320px、桌機及訪客API限制通過，正式18項HTTP檢查與首頁三篇卡片驗證通過；發布查核時error／fatal runtime log為0筆。見[三篇新聞發布report](releases/2026-10-26-news-three-articles.md)。

前輪新聞互動發布基準：2026-10-26／`b80ae04`，分支`codex/public-rule-copy`；Vercel `dpl_2cW555nJYzdaHMDJEmbjWNmCWGrB` READY並promote至aipoger.com。新聞底部新增四語按讚／公開討論，所有寫入以auth.getUser驗證且拒絕匿名帳號，公開署名讀既有stage resolver。兩張RLS service-only表與三個invoker RPC，按讚複合主鍵、留言request去重／限流與游標分頁，管理後台新增news來源。新增migration本機`20261026132404`／正式ledger`20261026133644`已套用，正式回滾驗證後0測試留言／讚。881測試849通過／32選用略過／0失敗；TypeScript、本機webpack與雲端build通過，新增檔案lint0錯誤／0警告。既有安全WARN兩類15筆未變；新私有表各增加一筆RLS無policy INFO，無直接瀏覽器grant或auth.users讀權。原評分／回覆／Credit五個函式hash相同。四語1440px／320px、實際音訊中打字／斷線重送不重複且播放不中斷、正式會員表單／公開署名及11項HTTP驗收通過。見[新聞互動report](releases/2026-10-26-news-discussion.md)。

前輪音樂新聞發布基準：2026-10-26／`90142a6`，分支`codex/public-rule-copy`；Vercel `dpl_6K1wjRCjzBcgUpnDM6JkezZKMPyG` READY並promote至aipoger.com。新增音樂新聞列表／首篇全文、共用導覽與首頁最新文章、原創封面／分類及流程圖，全文SSR、NewsArticle JSON-LD、中文canonical與專屬OG／Twitter卡片及Sitemap。870測試833通過／37選用略過／0失敗；TypeScript、本機webpack與Vercel正式build通過，lint0 errors／9既有warnings。無DB／環境／評分／Credit變更。正式13項HTTP／metadata／圖片／Sitemap／404檢查通過，四語1440px／320px及390px閱讀順序驗證；正式環境原4支MV／3首單曲ID與前版一致，MV可播放及評論視窗正常開啟。見[音樂新聞report](releases/2026-10-26-music-news.md)。

前輪本人作品刪除發布基準：2026-10-26／`50af0a8`，SQL與DB測試後續commit `2b775f0`，分支`codex/public-rule-copy`；Vercel `dpl_5mfEhykxfdzh5RVJxBzbka3hcMWT` READY並promote至正式。依使用者最新指令改本人作品永久刪除，service-only invoker RPC鎖定所有權並DELETE、FK清除附屬互動及Choice引用，清理工作與刪除同交易。舊客戶端缺permanent:true回409；上傳來源按引用保護與既有MP3 claim清理，失敗由原每小時cron重試，不留作品下架歷史。兩份新增migration已套用，第一正式ledger20261025163615，第二version見report；Auth身份由server getUser驗證，未賦予service_role讀取auth.users。862測試826通過／36選用略過／0失敗；TypeScript、webpack及雲端build通過，lint0 errors／9既有warnings。Security WARN仍2筆既有項，僅新增service-only清理表無policy INFO。依使用者本次指令實際刪除指定已下架舊MV一筆，同名上架新版保留。詳見[永久刪除report](releases/2026-10-26-permanent-work-delete.md)。

前輪刪除guard修復：2026-10-26／`8579b7a`／`codex/public-rule-copy`。前輪d7dfdeb將內部moderation_note從資料庫已識別的字串改短，導致本人公開作品下架被既有guard拒絕；已還原穩定標記，保留權限與防自動移除規則，錯誤訊息依401／403／409／系統失敗區分。18項定向測試通過，新增PGlite真實PostgreSQL測試載入正式同源guard，先重現錯誤再執行實際API的UPDATE；本機及正式prosrc MD5相同。全套856項820通過／36選用略過／0失敗；TypeScript、本機webpack與雲端build通過，lint0 errors／9既有warnings。Vercel `dpl_GD8r35wYea9VmtJWh7BveXZbXdUq`，發布狀態及正式驗收見[刪除guard修復report](releases/2026-10-26-creator-delete-guard.md)。本輪無DB migration、RLS／Auth／Storage變更或正式作品DML。

前輪刪除入口發布：2026-10-25／`d7dfdeb`／`codex/public-rule-copy`；Vercel `dpl_8PV9p2tbVF31a6aXPeGE1sTNv12x` READY並已promote至aipoger.com／www。「我的作品」每列補回本人刪除鍵，沿既有remove-track軟下架API；一般會員與Owner共用本人權限，保留原媒體、評論、評分、愛心、戰績、Credit與投稿額度規則。API新增匿名拒絕、更新時重驗作者／來源／啟用狀態、重試冪等與private/no-store；無schema、RLS或正式作品資料變更。14項定向測試通過；全套852項816通過／36選用略過／0失敗，TypeScript、本機webpack與雲端build通過，lint0 errors／9既有warnings。一般會員隔離runtime及四語320px／1440px驗收完成；正式已登入Chrome確認四列44px刪除鍵、無水平溢出與console error，訪客POST 401，沒有刪除真人作品作測試。詳見[本人作品刪除report](releases/2026-10-25-creator-work-delete.md)。文件收尾：2026-10-26。

前輪MP3發布基準：2026-10-25／`0c146c7`／`codex/public-rule-copy`；Vercel `dpl_5Xn2RHQTVXb9NoDiGUjuhAFu6kEF` READY並綁定aipoger.com／www。一般／Drop／Q共用連結或MP3最高320kbps／30MB，MV僅影片連結；實際frame／hash雙重驗證，私人pending→verified去重與已引用檔案保護，舊大型音訊入口410／daily導回Battle。新版私人草稿逾24h每小時清理，舊作品／戰績不回收。兩份本機migration `20261025063109`／`20261025074556`已套用，正式ledger `20261025073854`／`20261025074717`；新table service-only／restrictive Storage policy及權限核對通過。830測試799通過／31既有選用DB略過／0失敗；補強legacy引用PG測試及最末9項runtime通過，TypeScript、本機webpack及雲端build通過，lint0 errors／9既有warnings。正式320kbps上傳／75秒播放中填字不中斷／跨Drop與Q共用1份／取消草稿清空通過，沒有正式新作品或場次。384件作品／165queue／55battle／8archive／829原物件及原核心函式hash相同，15項HTTP通過，無新增Security WARN或runtime error。證據見[MP3／連結統一發布驗收](releases/2026-10-25-mp3-upload-policy.md)。

前輪通知發布基準：2026-10-25／`4184af5`／`codex/public-rule-copy`；Vercel `dpl_EtPjkm6Dn22LzoyvvmDsJBc4UeNR` READY並綁定aipoger.com／www。通知進入即展開、成功顯示且可見後沿清單readThrough標記既有本人通知已讀；不限首三則、不要求回覆，新通知仍提醒。API保留auth.getUser及本人／期限篩選，不新增schema、權限或直接批次改客戶資料；GET無副作用，明確PATCH標讀，截止時間正規化／不超過當下。成功事件帶確認未讀數，舊讀取revision失效（含隱藏分頁），失敗保留狀態可重試。818測試787通過／31既有選用DB略過／0失敗，19項通知定向回歸通過；TypeScript、本機webpack與最終雲端build通過，lint0 errors／9既有warnings。真實元件／client／hook隔離瀏覽器驗7→0、新通知1、刷新仍1、重入0及四語320px；正式已登入Chrome確認自動展開、0未讀、通知仍在、刷新持續。沒有新增正式測試通知／評論／Credit。原MV布局、評分、播放及對戰流程繼承前輪。[通知已讀驗收](releases/2026-10-25-notice-read.md)。

前輪MV發布基準：2026-10-25／`ea9ea8a`／`codex/public-rule-copy`；Vercel `dpl_DmFRys9uJtntpWB4cQn7qUd2ixem` READY並綁定aipoger.com／www。MV採使用者第一張設計：左人氣榜、右四支時間序新作、下方完整清單，手機榜單預設收合；評分與收藏人數分開。`readMvPopularity`服務端共用Explore `rankMusicPool`／Heart去重／盲聽及收藏彙總，不另改公式或公開身分，無資料庫migration／寫入。811測試780通過／31既有選用DB略過／0失敗；TypeScript、webpack本機與雲端build通過，lint0 errors／9既有warnings。敏感環境值不可下載，本機視覺用公開資料快照；真實staged API另驗92件MV／58件可排序作品，全部名次與Explore既有規則一致、原評分及收藏相同；正式原評論前後相同。四語320px、1440px桌機／手機無溢出，實際YouTube播放與原9.1評價確認；9個正式入口200，查核時無error／fatal runtime log。播放、邊聽邊評論、評價、連播與分享沿既有元件／API。驗收見[MV人氣與新作](releases/2026-10-25-mv-popularity-newest.md)。

前輪對戰發布基準：2026-10-25／`e2668b5`／`codex/public-rule-copy`；Vercel `dpl_3n6KoUdpV4SjRfpTZiPZzjLMMx43` READY並綁定aipoger.com／www。Drop新增每首60／90秒／整首、接戰沿用發起者模式；Drop／Q Crash改公開Suno、YouTube、本人站內單曲連結投稿，保留原舞台、舊音檔／投票／正式戰績。YouTube優先服務端metadata，缺時長時使用可見官方播放器量測並記錄來源，播放時再核對，不宣稱server獨立驗證回退時長。三模式四語玩法指南／SEO已同步。本機migration `20261024202323_battle_link_modes.sql`、正式ledger `20261024211426`已套用；新service-only RPC、來源快照鎖定、同模式配對、實際時長完成guard及交易回滾驗證通過。原165佇列／55對戰／8完整封存hash及核心封存／結算／Credit／戰績函式hash前後相同，沒有保留正式測試場次。805測試774通過／31既有選用DB略過／0失敗，TypeScript、webpack與雲端build通過，lint0 errors／9既有warnings。四語320px、90秒目標選項鎖定、真實YouTube片段／A/B互停／Q整首超90秒及輸入不中斷通過；正式指南SSR與入口驗證通過。原歌曲播放／留言／評分及盲聽規則保留。[對戰連結與指南驗收](releases/2026-10-25-battle-link-modes.md)。

前輪回覆發布基準：2026-10-25／`5bb0fcc`／`codex/public-rule-copy`；Vercel `dpl_5jTGr5TXuSmZ9sHvreh1KZoXbJ6E` READY並綁定aipoger.com／www。MV／外站播放恢復880px內上播下評，歌曲有詞仍可展開。作品所屬帳號可回覆他人原評論，首次每則2 Credit、無每日／總額上限，同則原評論永久去重。回覆、發點、重送與原評論者通知同交易，獨立回覆表不碰評分／人氣；新收入併入既有私有Credit view及先補欠額規則。兩個新增migration已套用：本機`20261024192722`／`20261024194035`，正式ledger`20261024193944`／`20261024194233`。服務端先auth.getUser並拒絕匿名、RPC僅service_role可執行；未開放auth.users讀權。793測試762通過／31既有選用DB略過／0失敗，含實際PGlite首次100則200點及原評論／評分／欠額／通知失敗原子回滾；TypeScript、webpack及雲端build通過，lint0 errors／14既有warnings。正式可回滾驗證2／重試／0點通過、0測試回覆或獎勵保留；安全advisor無新增WARN。實際影片中隔離送回覆保留同iframe，四語320px／1440px桌機與歌曲歌詞驗證通過；正式Owner回覆入口、指定作品原評論／10.0分不變。[回覆與播放器還原驗收](releases/2026-10-25-creator-replies.md)。

前輪SEO發布基準：2026-10-25／`b8cc6d1`／`codex/public-rule-copy`；Vercel `dpl_9QyWRviUnwrL5nyx5YwwoxSsGNy3` READY並綁定aipoger.com／www。Next 16 App Router保留，公開清單／作品／Choice／Battle與聖經導讀改由伺服器提供首次HTML；原資料函式與JSON API共用，React.cache僅請求內去重。`/works/[id]`整合歌曲／MV canonical、1200×630原封面分享圖及同窗評論；動態Sitemap使用自有XML序列化與300秒公開索引快取，修正Next metadata serializer未轉義query ampersand的問題。783測試750通過／33既有選用DB略過／0失敗，TypeScript、webpack與雲端build通過，lint0 errors／14既有warnings。正式16路由200、1,131筆Sitemap合法／無重複、三種分享圖200、會員全文API401、原留言／兩種評分回應與10首Choice前後一致；手機四語與實際YouTube播放、原9.1評價確認。無schema／RLS／Auth／Credit或排行公式修改；SEO讀取Q Crash不觸發結算，盲聽不預先輸出身分。[SEO與分享架構驗收](releases/2026-10-25-seo-architecture.md)。

前輪 Choice 分享發布基準：2026-10-25／`a90079f`／`codex/public-rule-copy`；Vercel `dpl_x4TQgrzGyy2upxmrtb8eanFP5Upn` READY並綁定aipoger.com／www。Choice 的 LINE 分享使用完整歌單封面 800×800 JPEG、head metadata 與固定封面版本連結；縮圖函式明列 Linux sharp／libvips tracing，正式圖片三份 200、原頭像回退一份 200。767測試734通過／33既有選用DB略過／0失敗；TypeScript、webpack build、lint0 errors／14既有warnings，native tracing 修正後相關檢查再次通過。正式四語三種UA共12組、原10首歌單與評論前後資料、主要入口及瀏覽器縮圖驗收通過。沒有 DB／Auth／Credit 變更或測試 LINE 發送。[Choice 分享縮圖驗收](releases/2026-10-25-choice-share-preview.md)。

前輪播放與評論發布基準：2026-10-25／`d744ac3`／`codex/public-rule-copy`；Vercel `dpl_5g3YnGwCYCeUr3pH94MofS5HrJjs` READY並綁定aipoger.com／www。探索外部作品與共用MV評論視窗改為桌機左播右評、手機上播下評；打字、送出與刷新保留同一播放器，visualViewport只調整CSS尺寸。760測試727通過／33既有選用DB略過／0失敗，TypeScript與webpack build通過，lint0 errors／14既有warnings；四語1440／320px、390×500模擬可視高度、實際YouTube播放中隔離送出及原評論保留通過。正式HTTP、Chrome登入原9.1評價／文字、公開API發布前後完全相同及console驗收通過。沒有DB migration或正式測試評論／評分／Heart。[播放與評價同窗驗收](releases/2026-10-25-listen-review.md)。

前輪人氣顯示發布基準：2026-10-24／`9b3236e`／`codex/public-rule-copy`；Vercel `dpl_91yTRNjHBDtrG7bNoPVHacX5yKbJ` READY並綁定aipoger.com／www。探索人氣Top50與歌曲卡分開顯示平均／10、評分人數及實際去重收藏人數，隱藏混合人氣分；208件可排序作品名次與原人氣分完整對帳不變。收藏從既有私人Storage並行唯讀彙總、只回傳數量，失敗不補零。755測試722通過／33既有選用DB略過／0失敗，TypeScript、webpack build通過；lint0 errors／14既有warnings，正式四語320px、1440px桌機、HTTP及console通過。無DB遷移／Auth／Credit或正式資料寫入。[人氣顯示發布驗收](releases/2026-10-24-popularity-display.md)。

前輪首頁發布基準：2026-10-24／`7936c34`／`codex/public-rule-copy`；Vercel `dpl_85sUMtwJs5VfnJ2qmm2XjfoYEMBR` READY並綁定aipoger.com／www。精選首頁新增Facebook／LINE社群入口，圖示緊接「加入創作討論社群」標題，介紹文字與關於／合作連結上提合併；Discord依使用者後續確認暫不放。TypeScript、webpack build、lint0 errors／14既有warnings及相關23項／精簡後首頁7項測試通過；四語桌機及320px、正式HTTP／真實作品與console驗收完成。無DB／Credit／Auth或Drop規則變更。[首頁社群發布驗收](releases/2026-10-24-community-footer.md)。

前輪關於與合作發布基準：2026-10-24／`555b529`／`codex/public-rule-copy`；Vercel `dpl_BqduXPi2ESjXsLozsXmGqNg84FdY` READY並綁定aipoger.com／www。依確認稿完成關於愛播歌與廣告合作新版，四語、可展開政策／合作內容及郵件入口，三張獨立WebP約520KB。TypeScript、webpack build、lint0 errors／14既有warnings、750測試717通過／33選用DB略過／0失敗；桌機與手機320／390px、完整設計比對及正式頁面驗收完成。舊授權正文保留，無Drop Battle規則、DB／Credit／Auth設定修改。[兩頁發布驗收](releases/2026-10-24-brand-pages.md)。

前輪盲聽評論發布基準：2026-10-24／`02180e1`／`codex/public-rule-copy`；Vercel `dpl_EzKLEtKFcpqUWUYMv7JgavE38jyj` READY並綁定aipoger.com／www。盲聽揭曉區增加原作品最近兩則評論／署名、評論與十分制評價視窗、已有MV才顯示完整觀看。歌曲與MV沿同一原作品ID／評分及評論；開窗暫停盲聽、MV明確點擊才載入。750項測試717通過／33既有選用DB略過／0失敗，TypeScript與webpack build通過，lint0 errors／14既有warnings。1440px與四語320px、8.75阻擋／8.7儲存後鎖定、預覽刷新及MV播放互停通過；互動為隔離fixture，正式原作品資料只讀核對，沒有測試發表。沒有DB／Auth／RLS或Storage設定變更。[評論與MV驗收](releases/2026-10-24-blind-reveal-feedback.md)。

前輪應用發布基準：2026-10-24／`98b7274`／`codex/public-rule-copy`；Vercel `dpl_Eh7nMAM14soP4pnq8ZuH292kw9iY` READY並綁定aipoger.com／www。盲聽投票前隱藏全部作品身分，成功單選只揭曉選中作品、平手揭曉兩首；上一題小卡保留愛心收藏與共用播放器完整版。伺服器只依已提交choice揭曉；揭曉失敗獨立重讀，不重投／重發Credit。736項測試703通過／33既有選用DB略過／0失敗，TypeScript與webpack build通過，lint0 errors／14既有warnings。四語320px、390px中文與1440px桌機及播放互停驗收通過；完整互動使用本機fixtures，未向正式站新增測試投票或愛心，非iOS真機。沒有DB／Auth／RLS或Storage設定變更。[選中才揭曉驗收](releases/2026-10-24-blind-chosen-reveal.md)。

前輪應用發布基準：2026-10-24／`317331c`／`codex/public-rule-copy`；Vercel `dpl_HDBZnYxRjh7mrZiJyvfyyqzbQgBZ` READY並綁定aipoger.com／www。專輯區、單曲／專輯投稿、本人作品組專輯、四語指南與讀取優化已發布。709項測試676通過／33既有選用DB略過／0失敗，TypeScript、webpack與雲端建置通過；lint0 errors／14既有warnings。正式資料轉類以交易內hash斷言確認原作品資料、4筆評分、3則留言、47筆愛心歷次記錄、4筆收據及所有Credit紀錄保留；只允許既有updated_at觸發器更新維護時間，created_at不變。資料庫遷移`20261024070956_album_classification`、`20261024071251_album_single_chart_eligibility`已套用，檔名對齊正式歷史；轉類是獨立授權的operations SQL，不混入通用schema遷移。詳見[專輯與載入驗收](releases/2026-10-24-albums-loading.md)。

前輪應用發布基準：2026-10-23／`8efdc79`／`codex/public-rule-copy`；Vercel `dpl_9HfZnBskqRMPKCtNuCu6s6BKs8kX` READY並綁定aipoger.com／www。Battle盲聽、Q Crash、Drop標題旁新增分享鍵，各有1200×630復古器材縮圖；伺服器metadata、canonical及四語連結保留mode，盲聽內頁同用盲聽圖。40項相關測試通過；完整698項665通過／33既有可選DB略過／0失敗，TypeScript與webpack build通過，lint0 errors／14既有warnings。正式16組爬蟲metadata、三張PNG及實際按鍵／手機定位驗收通過；沒有DB、Credit或自動發文修改。[三模式分享report](releases/2026-10-23-battle-mode-sharing.md)。

前輪應用發布基準：2026-10-23／`0791814`／`codex/public-rule-copy`；Vercel `dpl_AJRsf7z6BByhZ9N9AzktWN5h44nW` READY並綁定aipoger.com／www。單支MV分享metadata讀同一公開清單，帶出該影片封面、歌名與作者；canonical／og:url／四語alternates保留track ID。最高解析缺圖時伺服器改用同影片標準／高畫質縮圖。33項相關測試全過；完整684項651通過／33既有可選DB略過／0失敗，TypeScript與webpack build通過，lint0 errors／14既有warnings。正式驗收與快取限制見[MV分享封面report](releases/2026-10-23-mv-share-cover.md)。沒有DB、Credit或自動發文修改。

前輪應用發布基準：2026-10-22／`b0593ca`／`codex/public-rule-copy`；Vercel `dpl_8QtFJJ68C93AL1mEUoB8XuAtES8A` READY並綁定aipoger.com／www。MV下方保留完整公開清單（含所有精選），預設評分優先：封面平均分高者先、同分新作先，未評分作品由新到舊接在後面；原最新投稿／本週支持可手動切換。相關25項全過；全套676項643通過／33既有可選DB略過／0失敗，TypeScript及webpack build通過，lint 0 errors／14既有warnings。沒有DB／Credit／公開資格修改。正式驗收與原評論規則繼承見[MV清單與排序report](releases/2026-10-22-mv-catalog-visibility.md)。

前輪評論規則發布：2026-10-15／`0c0d2a6`／`codex/public-rule-copy`；Vercel `dpl_ALjK7rZuguVQ4HLfdvy1wm47gVJz` READY，aipoger.com與www均已指向同一SHA。歌曲／MV一般會員首次評分固定、文字一次修改、禁止自行刪除；Owner可刪除評論並不限次修改自己的文字／評分。評論獎勵已發不追回、不重複領；首次有效評分＋20字及反灌水保留，Heart原規則不改。正式遷移`20261015153016_review_finality`及`20261015153213_review_owner_lookup`已套用，舊RPC相容及service-only權限驗證；Owner helper固定search_path、僅server可執行。正式交易測試完整回滾，原評分與獎勵hash不變，Security advisor無新增WARN。相關22項全過，完整673項642通過／31既有可選DB略過／0失敗；TypeScript、webpack build及lint0 errors／14既有warnings通過。正式Owner編輯／取消及390px手機操作已驗證，沒有送出真實改評。一般會員由API／runtime與正式SQL驗證，未用真人會員帳號發表。[評論定案report](releases/2026-10-15-review-finality.md)。

前輪版面發布：2026-10-15／`5e79c27`／`codex/public-rule-copy`；Vercel `dpl_P2x4VeKoBGSeLLbHXTNaUKL5vf6A` READY，aipoger.com與www均已指向同一SHA。MV評論視窗移除獨立YouTube外連，愛心／說明／分享同列；小數輸入提示與每人一分說明合併，評分間距縮短，手機保留44px操作。37項相關測試通過；全套666項634通過、32既有可選DB略過、0失敗；TypeScript與webpack build通過，lint0 errors／14既有warnings。正式1440px桌機、390px手機及320px中英日韓無水平溢出，console errors為空；原8.2評分與公開舞台名保留，沒有測試發表或資料修改。本機測試環境discovery503，正式站已實際驗收。[MV版面精簡report](releases/2026-10-15-compact-mv-review.md)。

前輪公開署名發布：2026-10-15／`b1afc1b`／`codex/public-rule-copy`；Vercel `dpl_4TqowW8DpSxdemgs6hkN4swiHTC6` READY，aipoger.com與www均已指向同一SHA。歌曲／MV、舊歌曲、Choice與創作聖經留言採用已儲存舞台名，Choice新策展人／分享預覽同源；禁止OAuth姓名、Email或客戶端署名覆蓋。共同helper優先 `user_profiles.fighter_name`，舊fighter名需排除登入預設值，查詢失敗停止發表。限定修復1則錯誤留言、1則通知、1筆receipt；交易斷言原內容／評分／Credit不變，沒有schema migration或刪除。42項相關測試全過；完整666項中634通過、32既有可選DB略過、0失敗；TypeScript／webpack build通過，lint0 errors／14既有warnings。正式桌機與390px手機、匿名讀取／五個POST入口401通過，console errors為空。[公開署名修復report](releases/2026-10-15-public-display-name.md)。

前輪應用發布：2026-10-15／`7fe2d58`／`codex/public-rule-copy`；Vercel `dpl_4xqwy5Ch7gNPExu8bTRqrQNNJYdx` READY，aipoger.com與www已指向同一SHA。創作者中心通知每頁三則、點開已讀、保留／取消保留／刪除、同列篩選／翻頁及副標整合保存說明已發布。Migration `20261015121956_account_notification_retention.sql` 已套用，三個日曆月到期、保留免清、權限與來源外鍵保護均驗證；每小時清除排程已配置，首次授權SQL清除122則、剩53則。659項測試：627通過、32既有可選DB略過、0失敗；TypeScript／webpack正式build通過，lint 0 errors／14既有warnings。正式保留刷新持久、取消保留、翻頁、原作品評論、同頁／跨頁入口、320px四語／390px中文／1440px桌機通過，console errors為空。原評論、作品、Credit、排行未改。[本輪發布report](releases/2026-10-15-notifications.md)。

2026-10-15創作聖經發布：`6878560`／`codex/public-rule-copy`；Vercel `dpl_7rPqErjZbvMsNiQqWUBbrrP3Vmk8` READY，aipoger.com與www已指向同一SHA。創作聖經四色學習路線、入門三招、常用招式與收合章節已發布；647項測試中615通過、32既有可選DB略過、0失敗，TypeScript／本機webpack正式build及雲端build通過，lint0 errors／14既有warnings。正式會員搜尋／分享／163招資料與手機四語驗收通過；無SQL、Auth、Storage或Credit修改。[本輪發布report](releases/2026-10-15-bible-redesign.md)。繼承`6d76764`的YouTube曲風混合電台、選用預覽投稿及手機入口（[前輪report](releases/2026-10-15-radio-link-submission.md)），Credit、排行及一般會員權限以[參與流程report](releases/2026-10-15-participation-flow-fixes.md)為證據。

## 修改依據與確認日期

2026-10-15（Asia/Taipei）使用者確認並授權完成本輪修復。本文件為現行基準；驗收範圍、發布版本及限制見[本輪 report](releases/2026-10-15-participation-flow-fixes.md)。未有使用者新的明確指令，不得擅自改動點數數值、追回／恢復、投稿額度、排行公式、Owner權限、舊歌排除名單或公開文案邊界。修訂須記錄確認日期、具體差異與驗證證據，先更新對應現行正文，再同步索引與既有Drive檔案。舊技能摘要、歷史發布紀錄、GitHub main或另一代理的提案不能覆蓋現行規則；使用者後續明確指令仍優先。report提供證據，不另建立第二套產品規則。


2026-10-14 Showtime社群舞台已發布（app `32157e8`／`codex/homepage-mv-editorial`，Vercel `dpl_7rHpdCrj5N5BXG2GgYp1x9QFVpRu` READY並promote）：移除前台歌曲月榜、保留Choice原功能，融合第二稿主版面與第三稿右側文字／近30天樂評、創作與盲聽Top5；真實3份Choice／2位樂評／5位創作／1位盲聽，不灌示意資料。service-only read-only invoker RPC／索引已套用，無原資料或Credit／人氣分數修改；去重／8秒／隱藏／資格與grants交易測試回滾，0fixtures保留。613項測試582通過／31既有可選DB略過／0失敗，TypeScript、本機及雲端build、lint0errors／15既有warnings通過；Security advisor無新WARN。四語320px、桌機、評論HUD／共用播放／歌單排序及正式public API／Owner入口核對；手機非iOS真機。[發布及比對證據](releases/2026-10-14-showtime-community.md)。

2026-10-14歌曲／MV小數評分與累積人氣榜已正式發布（app `831354a`，`codex/homepage-mv-editorial`）：共用原作品ID、每會員一筆最新分數與原留言，手填1–10／最多一位小數、輸入框／10、decimal鍵盤，API及numeric欄位同步驗證。`work_rating_summaries`回有效平均／不同人數／原始總和，`save_work_review`以service-only SECURITY INVOKER原子寫入及receipt重試；保留舊integer RPC相容，首頁MV入口以作品影片資格決定評測來源，不依播放器是否顯示。`20261014082709_decimal_work_ratings.sql`已實際套用；交易測試4.8／6.8、修改／重送／跨面、作者、moderation、文字不加分與grants完整回滾，評分／receipt仍0筆，沒有測試投票留在正式站。Top50改為3×不同Heart支持者＋實際評分總和＋3×盲聽偏好點＋適用新歌3／回歸5；相同最終總分直接原上架時刻新歌優先、名次連續。無neutral假分／最大Heart歸一化，不把總分再乘人數。609測試578通過、31既有可選DB略過、0失敗；TypeScript、本機及雲端build通過，lint0 errors／15既有warnings。Security advisor無新增WARN（21 INFO／14 definer WARN／1 Auth WARN均原有）。Vercel `dpl_EfQmaeynk7U43oSjxt4bEzkvtQKo` READY並promote；218公開作品／50名、逐筆總分與同分排序核對通過。正式桌機及320px手機的歌曲／MV評分可輸入8.7，8.75停用並提示；公開評論及作者姓名保留，未提交真實評價。本次沒有啟用登入／評論／送愛心Credit獎勵，盲聽3Credit維持。[發布證據](releases/2026-10-14-decimal-ratings.md)。

2026-10-14 Top50／新歌加成／探索分享已正式發布（app `853a4cd`，`codex/homepage-mv-editorial`）：左側直接顯示50名，手機3列／平板4列預覽及原頁展開，撤下舊排行榜dialog；名次連續、同分按原投稿時刻新歌優先。新歌7×24小時內綜合分加3，精確到期且不重設時間，與原50／50基礎分及期滿回歸5點共用helper、不重複加分。探索標題旁44px分享鍵，四語固定正式入口／原生分享及Clipboard fallback；原作品ID／收藏評論／播放器沿用，無DB、Auth、Credit、Showtime或Storage修改。603測試572通過、31既有可選DB略過、0失敗；TypeScript／本機及雲端build通過，lint0 errors／15既有warnings。Vercel `dpl_6jrUY47Bfc88qizVZJ7W6hJ3A19X` READY並promote，正式218首／102首回歸／10首新歌加成，逐筆分數及排序核對通過；正式桌機50列、390px手機3↔50展開均無溢出。分享顯示複製成功提示，完整payload／取消分支以Browser API fixtures驗證；工具剪貼簿讀回未核實，不宣稱系統剪貼簿內容已驗收。[發布證據](releases/2026-10-14-top50-sharing.md)。

2026-10-14 Explore舊歌回歸已正式發布（app `773e97f`，`codex/homepage-mv-editorial`）：固定205件回歸名單與69件明確排除名單，保留原DB狀態、ID、音檔及created_at；Explore／電台／Top10／Top50及Profile資格一致，102首期滿作品回歸，正式公開曲庫218首。年齡例外至台灣時間11月1日00:00，期滿回歸作品綜合分單次加5，不灌票或加公開活動標籤；原支持／審核／撤下與Explore生命週期限制保留。盲聽、首頁單曲及Showtime未改；沒有SQL或刪檔排程。600測試569通過、31既有可選DB略過、0失敗；TypeScript／本機及雲端build通過，lint0 errors／15既有warnings。Vercel `dpl_7zbk1K7gMEFcBbziMypHDLQ8qSoZ` READY並promote，API逐筆核對無排除作品／隱藏撤下漏出／錯誤加分；正式搜尋、真實音訊及四語390px手機均驗證，無水平溢出或console error。[發布證據](releases/2026-10-14-explore-return.md)。

2026-10-14探索歌詞與收合修訂已正式發布（app `567ce28`，`codex/homepage-mv-editorial`）：封面TrackHud／多開expandedHud改為LyricsPopover，重用原作品lyrics與creator，不另加音訊或讀寫API。native auto popover處理點外／Esc／同鍵收起及只開一個，useId避免推荐與分類同曲重複ID；不用CSS新anchor依賴，按控制位置與viewport定位；舊瀏覽器有點外／Esc fallback。頁面scroll／resize收起，面板內scroll不收起；關閉鍵44px且返回原鍵盤入口。GlobalMusicPlayer既有dialog加backdrop幾何點外判斷，dialog內文字／padding點擊保留。594測試563通過、31既有可選DB略過、0失敗；TypeScript／本機及雲端build、lint0 errors／15既有warnings通過。Vercel `dpl_7uAYD1ktw42T3SR7ESvGWby5uy3L` READY且已promote。實際Chrome桌機／手機及四語本機／正式320px無溢出、點外均收合且console errors空；影片同曲After the Last Coffee(純音樂)正確顯示歌詞未提供。無DB／Auth／Credit／排行或正式Battle規則修改。[发布與正式驗收證據](releases/2026-10-14-explore-lyrics.md)。

2026-10-14盲聽HUD／拖曳與8秒解鎖修訂（app `c20f7c4`，`codex/homepage-mv-editorial`）：前台按實際media進度＋performance clock解鎖，不等較慢的tick回應；播放先取得server計時起點，保留Safari原tap媒體啟動，等待與快速跳秒不計聆聽。各側8秒後可拖曳／重播，新的seek事件不加時間、不干擾另一路活動音訊；SQL `20261014051909_blind_seek_hud.sql`已套用，service-only invoker／精確8秒門檻保留。HUD顯示準備、聆聽、可評選與下一回合；A/B預先auto緩衝，瀏覽器自行決定緩衝量、不另存clip。Tick移除重複question查詢；下一題catalog／seen／samples準備與驗票並行，完成原子發點後才issue新題。兩個blind API指定hnd1，靠近現有ap-northeast-1資料庫，其餘服務仍沿原region。594測試563通過、31既有可選DB略過、0失敗；TypeScript／本機及雲端build通過，lint0 errors／15既有warnings，SQL交易測試完整回滾。安全advisor前後21筆既有service-only INFO、14筆既有definer WARN及1筆既有Auth WARN，沒有新增WARN。發布與正式UI證據讀[本次驗收](releases/2026-10-14-blind-hud-seek.md)。

2026-10-14盲聽實測修訂已發布（app `621e2b3`）：各側最低8秒、成功自動新題、常駐離開評測；片段仍為原歌15–45秒，三種答案各3點。新migration `20261013173824_blind_eight_second_flow.sql`已套用；complete RPC驗證7.999秒拒絕／8秒成功，新的service-only音訊RPC把原三次DB讀取合成一次。答案回應併入下一題、取消揭示與後續GET；獨立配對讀取並行、驗票只查本題兩首、不在取題讀完整Credit。雙audio預備metadata及15秒定位，只允許一側播放。588測試557通過、31既有可選DB略過、0失敗；TypeScript、本機／雲端build通過，lint0 errors／15既有warnings；交易fixtures完整回滾，advisor沒有新增WARN。[正式驗收證據](releases/2026-10-14-blind-eight-second-flow.md)。

2026-10-14 Battle復古入口與30秒盲聽已正式發布（app `0a36bf6`，`codex/homepage-mv-editorial`）；Vercel `dpl_2cEZeFgVyCoywmn4ktnUz9vjZ2CS` READY並promote至apex／www。每題3Credit含平手，愛心50%＋盲聽50%接探索Top10／Top50，Creator Center讀獨立真實ledger；登入15／有效評論10／增額投稿60與聖經扣點未啟用。585項測試：554通過、31既有可選DB略過、0失敗；TypeScript、本機及雲端正式build通過，lint0 errors／15既有warnings。三個加法式migration已套用，題目／Credit RLS與service-only invoker RPC；交易測試完整回滾。Security advisor沒有新增WARN，仅兩張service-only表新增無policy INFO。[發布與正式驗收證據](releases/2026-10-14-blind-listening-retro.md)。

2026-10-13 MV統一觀看／評分與連播已正式發布（app `9cb1b9b`，`codex/homepage-mv-editorial`）。572項測試：541通過、31既有可選DB測試略過、0失敗；TypeScript、本機正式build通過，lint 0 errors／15既有warnings。新增migration `20261013131336_mv_ratings.sql` 已實際套用Supabase；評分與留言使用service-only SECURITY INVOKER RPC，已登入user由伺服器getUser驗證，不接受客戶端user ID或自行宣稱owner。兩張新表啟用RLS並撤銷anon／authenticated直接權限；新RPC只有service_role可執行。一次評價原子儲存，receipt防止重送重複評論；原作品評論／管理與通知共用既有資料。公開discovery只回平均分及人數，私密個人分數由驗證Bearer讀取。交易式資料庫測試確認修改、不同人數／平均、作者限制、隱藏／moderation及grants，所有fixture、評論、通知及quota完整回滾。Security advisor新增兩筆service-only無policy的INFO，沒有新增WARN；既有definer RPC／Auth警告另存既有維運待辦。

Vercel `dpl_CqDWx7SYkY1t2ktMpjMxqpZfy8xN` READY並promote至aipoger.com，MV頁與discovery正式／保護環境HTTP200。新migration檔名對齊實際Supabase歷史version `20261013131336`；MV discovery使用no-store，評價後讀取最新摘要，不使用舊CDN評分。

一個YouTube IFrame API播放器按完整篩選清單loadVideoById接播；真實第一支播完至第二支（widget6維持同一播放器）已驗證，手動切換、pause及各作品草稿由runtime tests驗證。四語320px手機及桌機十個分數同排、無水平溢出，分享／歌名不自動播放。Credit不啟用，Heart／首頁人氣規則不改。[發布證據](releases/2026-10-13-mv-ratings-continuous.md)。

2026-10-13 投稿額度與MV分享／評論提示已更新（app `3719612`／`codex/homepage-mv-editorial`）。一般會員連結與音檔共用168小時三首，取消同曲風五首active上限，Owner數量豁免由資料庫核對confirmed primary Auth identity。MV加入原生／複製分享，站內連結定位原MV評論視窗、無自動播放；橘色捲軸與可點向下評論提示、兩行卡片標題保留原資料，點歌名直接開MV視窗看全名。555項測試中524通過、31既有可選DB略過、0失敗；TypeScript、本機／雲端build及lint 0 errors／15既有warnings通過。Vercel `dpl_4MjsjhKvzXNLJG6ALa8SvT5ry66v` READY並promote；正式MV／Profile 200，私人API未登入401。點數每日15／至少20字有效評論10／增額60已定案但系統未啟用。部署及正式驗收讀[本次證據](releases/2026-10-13-submission-quota-mv-sharing.md)。


2026-10-13 創作者中心與連結投稿已上線（app `68949a5`／`codex/homepage-mv-editorial`）。Vercel `dpl_S9cenbAZ6TEnKTq5AC5siMwe6w6S` READY 並 promote 至 apex／www。個人統計、4件作品總覽、單首編輯、原管理入口、Credit未啟用／owner免扣點、YouTube／Suno／Spotify可見預覽後確認與音檔預覽已發布。543項測試中512通過、31既有可選DB略過、0失敗；TypeScript、本機／雲端build通過，lint0 errors／15既有warnings。两份加法式schema migration已套用；RLS、grants與原投稿額度trigger未修改，329筆原作品保留。正式owner帳號與四語桌機／手機證據見[發布證據](releases/2026-10-13-creator-center-links.md)。


2026-10-13 傷心酒吧整合、三個月曲庫與Profile投稿已上線（app `6342878`／`codex/homepage-mv-editorial`）。Vercel `dpl_BjHkGMG8YcpcFXtHBCXNcrDBb5iB` READY，先以正式環境不綁網域核對113首與66件有支持的真實資料，再promote至apex／www。小電台／Top10／Top50／四封面、原ID評論／定位與Profile自己的上傳區已發布；532測試中501通過、31既有可選DB略過、0失敗，TypeScript／本機與雲端build通過，lint0 errors／15既有warnings。無SQL／環境變更、點數啟用或音檔刪除；到期仅退出公開展示，歷史／storage／原active額度保留。正式四語桌機／手機與真實音訊、排行榜、評論、舊路由及投稿登入返回驗收見[發布證據](releases/2026-10-13-radio-chart-profile.md)。

2026-10-13 探索音樂改版已上線（app `e8f2977`／`codex/homepage-mv-editorial`）。Vercel `dpl_M3wZ23ATz3CPV6vjo9uUZkiYgKZW` READY 並已 promote 至 aipoger.com；使用者選定的黑橘精簡探索頁、醒目傷心酒吧入口、全曲庫搜尋／曲風交集、推薦去重、歌名旁大愛心與資訊操作已發布。519 測試中 488 通過、31 既有可選 DB 測試略過、0 失敗；TypeScript、本機／雲端 build 通過，lint 0 errors／15 既有 warnings。正式站實際播放、訪客 Heart 返回原曲、搜尋／無結果／重設、升溫與四語版面驗證；225 首公開作品、14 曲風及原播放／戰績／資格資料保留。未使用 live owner session 或寫入生產留言／Heart，無 SQL migration、環境變更或點數啟用。[發布證據](releases/2026-10-13-explore-redesign.md)。

2026-10-13 MV 卡片愛心與評論改版已上線（app `5d1178d`／`codex/homepage-mv-editorial`）。Vercel `dpl_J97UK5nFW6KQJaHurB9yoNJC7fhE` READY 並已 promote 至 aipoger.com；歌名右側大愛心／週票／評論、下一排創作者，直接切換既有 Heart／收藏，評論 dialog 包含同一支 MV。513 測試中 482 通過、31 既有可選 DB 測試略過、0 失敗；TypeScript、本機／雲端 build 通過，lint 0 errors／16 既有 warnings。正式桌機／手機、實際影片播放、公開評論、關閉回卡片及訪客返回路徑驗證，原 48 支影片／3 個頻道及曝光去重保留。登入寫入使用 runtime mocks 驗證，未使用 live owner session。無 SQL migration 或生產測試留言／Heart。[發布證據](releases/2026-10-13-mv-card-actions.md)。

2026-10-13 首頁與 MV 曝光去重修復已上線（app `8689575`／`codex/homepage-mv-editorial`）。Vercel `dpl_7Bs119NdHNPPncf4bTqjQRbaaSAQ` READY 並已 promote 至 aipoger.com；下方單曲／MV 先排除全部精選作品 ID 再補位，包含同票精選，搜尋精選可跳回上方。503 測試中 472 通過、31 既有可選 DB 測試略過、0 失敗；TypeScript、本機／雲端 build 通過，lint 0 errors／16 既有 warnings。正式桌機／手機、全量列表及精選搜尋驗證，原 48 支影片／3 個頻道資料保留。沒有 SQL migration 或生產資料寫入。[發布證據](releases/2026-10-13-featured-dedup.md)。

2026-10-13 MV 放映室已上線（app `6d36364`／`codex/homepage-mv-editorial`）。Vercel `dpl_6ntBxCmThoX1rXVpFqCzFy87xNPU` READY 並已 promote 至 aipoger.com；以真實公開既有連結聚合 48 支 MV、另列 3 個頻道（驗收當下數量），最早投稿為 2026-05-26。501 測試中 470 通過、31 既有可選 DB 測試略過、0 失敗；TypeScript、lint 0 errors／16 既有 warnings、本機與雲端 build 通過。四語桌機／手機、實際歷史影片播放、搜尋／篩選／全量展開及原作品評論驗收；沒有 SQL migration、環境變更或生產測試留言／Heart。[發布證據](releases/2026-10-13-mv-gallery.md)。

2026-10-13 首頁 MV 與單曲探索改版已上線（app `91f207c`／`codex/homepage-mv-editorial`）。Vercel `dpl_DZJ9WQDd6yfJPawf5Dq5BuViNghM` READY，先用 production 環境不分配自訂網域部署，驗證真實資料後 promote 至 aipoger.com；舊正式基準 `3618ef7` 的程式加上 `4256e4b` 文件為起點，原工作區既有變更未混入。457 測試通過、31 原有可選資料庫測試略過，TypeScript、lint 0 errors／16 既有 warnings、本機與雲端 build 通過；無 SQL migration、無點數啟用。[發布證據](releases/2026-10-13-homepage-mv.md)。

2026-09-28 全站文案一致性修正已上線（app `3618ef7`／`codex/music-analysis-tools`）：Music Bible 六步與準備發表提示改為外部工具按需自查；首頁酒吧四語移除生存玩法；Battle 分享、卡片、配對通知移除 APC 承諾。Vercel `dpl_9u5dxcQCnJFYfWkvUotFaLNZEspc` READY 並已 promote 至 aipoger.com。448 測試通過，31 原有可選資料庫測試略過；無 SQL migration。[發布證據](releases/2026-09-28-copy-consistency.md)。

2026-09-28 音樂分析外站工具入口已上線（app `52e66c6`／`codex/music-analysis-tools`）：三個網站、免費條件與使用步驟。Vercel `dpl_EPwbVwxBDdZqYYtSoy5RswCHgdAB` READY 並已 promote 至 aipoger.com。[發布證據](releases/2026-09-28-music-analysis-tools.md)。

2026-09-28 Music Bible 2.0 已發布（app `ae1f196`，分支 `codex/music-bible-2`）：五個創作入口、全部既有資料保留，前台不標新舊／生命週期狀態；Ask Music Agent 隱藏。Vercel `dpl_J3kTgFEt1nof95Nb2wSvxZ6gcQnr` Ready 並已 promote 至 aipoger.com；447 測試通過，無 SQL migration。[發布證據](releases/2026-09-28-music-bible-2.md)。

2026-09-27 創作者私人作品表現已上線（app `952c1bc`，分支 `codex/creator-insights`）：個人頁入口、28 天聆聽與轉換指標、目前支持與收藏、正式結算得票率；同步修復 Choice 分享 metadata 的頁面入口。Vercel `dpl_Bfniz6ZbAyzAzAj4VcBH43x64hrV` Ready 並已 promote 至 aipoger.com。441 測試通過、31 原有可選資料庫測試略過、0 失敗；無新資料庫 migration。[發布紀錄](releases/2026-09-27-creator-insights.md)。

2026-09-21 Choice 頁底評論已上線（app `0a49e0b`）：沿用既有 collection comments API，新增直接可見評論區、名稱回覆及四語文案；463 測試通過，無資料庫 migration。[發布紀錄](releases/2026-09-21-choice-inline-comments.md)。

2026-09-21 Choice 整批發布已上線（app `6564a8a`）：版面、分享封面與批次編輯完成，459 項測試通過。正式 migration `20260921132314_creator_choice_batch_editor` 已套用；[發布紀錄](releases/2026-09-21-choice-batch-release.md)。

文件整理：2026-10-15；產品實作基準：2026-10-15。主文件 4／6。先看架構與發布流程，再按改動選讀下方回歸章節；驗收清單不創造產品規則。

## 首頁新作輪替與連結投稿曝光（2026-10-25）

應用 `544736f`，分支 `codex/public-rule-copy`；Vercel `dpl_DYaF89v334r7SmmgnqXeqJepc7Bz`（`aipoger-web-rnz8-74cs19vg0-yohungs-projects.vercel.app`）READY，已promote至正式站。首頁原本只取本週最高支持MV、單曲又限audioUrl，導致新連結作品沒有曝光；改為近30天新作／創作者分散與每四小時輪替，最多三支新作＋一支週支持，單曲一首最新＋兩首輪替。

- MP3與已支援外站連結均可入選；連結使用既有官方播放器及評論同窗，MP3保留共用音訊。播放中MV與開啟中的評論以原作品快照保留，刷新不重建播放器。首頁首屏作品直接包含於SSR HTML。
- 新增六項選曲邊界測試及兩項UI runtime回歸；838項測試802通過／36選用略過／0失敗，TypeScript通過、lint 0 errors／9既有warnings，本機webpack與正式雲端build通過。本機node_modules是跨工作樹symlink，Turbopack root拒絕此既有配置，使用webpack完成本機build；雲端實體node_modules的原build正常。
- 正式環境staged API確認97支MV／60件人氣排序及原影片／投稿時間／評分／週支持不變，首頁4支MV與3首單曲去重，3首連結單曲正確帶來源；SSR包含實際歌名與新版標題。無DB migration、正式內容寫入或計分／Credit變更。
- 真實畫面與發布後檢查見[本次report](releases/2026-10-25-home-rotation.md)。

## 分類服務：分類已發布，worker 尚待啟用

- 2026-09-20：Web `e08687e`／`codex/genre-suggestions` 已 push；Vercel `dpl_CfrCok6hkdHSv3AGjK7RzNP56zdt` READY 並已 alias 至 aipoger.com。三個新分類及 15 個播放頻道已正式生效。
- Supabase `three_music_genres` 已套用，ledger `20260920055213`，對應本機 `20260920120000_three_music_genres.sql`，不要重複執行。
- 自動音訊建議尚未啟用：worker `c8f7d7f` 已準備並 push，等待使用者完成 Render 管理台登入，再核對資源與配置兩端服務。現時保留手動選擇／投稿。
- 450 項測試、TypeScript、本機／雲端 build、正式頁面和桌機／手機檢查通過。完整狀態與接續步驟見 [發布紀錄](releases/2026-09-20-genre-release.md)。

## 前版發布：Choice 管理精簡與收藏順序

- 應用 `147dbc6`／`codex/choice-management-simplify`；Vercel `dpl_FfPbhR4V3nXbMaJswnNf5vZ9Yw5t` READY，2026-09-18 05:04 Asia/Taipei 已 promote 至 aipoger.com。
- 444 項測試、TypeScript、本機／雲端 build 通過；lint 0 errors／16 既有 warnings。無 SQL migration、歷史收藏時間回填或正式資料刪除。
- 收藏時間為私有 interactions store 的 per-user 欄位，由 Heart 與 favorite 路徑共同維護；只影響個人 Choice 選曲順序。新歌宣傳／官方草稿不再進入待辦彙總。詳見 [發布紀錄](releases/2026-09-18-choice-management-simplify-release.md)。

## 前版發布：頭像後台待辦

- `9fc7074`／`codex/owner-task-avatar`：全站 owner 頭像紅色待辦數、後台彙總及分類入口；不取代 Profile 或原帳號通知。Vercel `dpl_CYiSQUWJWdaXxnQCGG4neeZFwoAw` READY 並 promote 至 aipoger.com。
- 無 DB migration／正式資料寫入。437 項測試、TypeScript、本機及雲端 build 通過；lint 0 errors／16 既有 warnings。正式 API 未登入／無效 token 為 401；owner 真實登入操作未執行，隔離 runtime 已涵蓋帳號切換、更新及紅點顯示。
- 新後台工作流要接入 `src/lib/admin-tasks.ts` 及 `/api/admin/tasks` 的真實待處理來源；新歌宣傳、所有 Choice 草稿、普通活動、已停用頁面或完成紀錄均不得誤算成待辦。詳見 [發布紀錄](releases/2026-09-18-owner-task-avatar-release.md)。

## 前版：排行榜管理與分享

- 使用者明確回覆 `do it` 後，`9f96865`／`codex/showtime-chart-admin` 已部署並 promote 至 aipoger.com：第 1 款純黑底、整份月榜分享、owner 排行榜管理與 Choice 管理入口整合。
- Vercel `dpl_EoRgvvWvNPfDNMyZSfg1BJjgfnox` READY；Supabase 已套用本機 `20260917180000_monthly_chart_owner_decisions.sql`，正式 migration ledger 版本 `20260917184048`、名稱 `monthly_chart_owner_decisions`，兩者是同一份 SQL，不重複套用。
- 429 項測試、TypeScript、本機及雲端 build 通過；lint 0 errors、16 項既有 warnings。正式資料／公開頁／API 權限驗證與限制見 [發布紀錄](releases/2026-09-18-showtime-chart-admin-release.md)。

## 前版發布：同頁策展

- Showtime 同頁策展版面：`6343ea0`，`codex/showtime-editorial` 已 push；Vercel `dpl_6q3DgSbgTmGzirmtyxdm4P5dH8RE` 已 promote 並驗證 aipoger.com。417 項測試通過，無新 DB migration。詳見 [本次發布紀錄](releases/2026-09-18-showtime-editorial-release.md)。

## 前一版基礎發布

- Showtime 月榜與收藏製作 Choice：應用 commit `79e53bd`（主實作 `e5eab5b`），分支 `codex/showtime-charts-choice`，已 push 與 promote 至 aipoger.com。
- Vercel `dpl_8WEW1DehGhKjNfrW1vSTNF7GbjLv`；三份 Supabase 遷移已套用，405 項測試通過、0 略過。詳細資料核對、瀏覽器驗證與限制見 [發布紀錄](releases/2026-09-17-showtime-charts-choice-release.md)。

## Music Bible 2.0：已發布的第一階段

- 首頁五入口：Knowledge、Style DNA、Prompts、Workflows、Solve My Problem。沿用章節 ID、會員搜尋、複製、評論及試聽；command dock 的 hash 切換會通知章節展開。Ask Music Agent 完全隱藏，未啟用模型或需求單。
- 程式分工：`ai-music-bible-page.tsx` 管會員入口與台語庫；`bible-home.tsx` 管創作入口；`suno-practice-library-section.tsx` 管招式／歌詞／流程；`suno-inspiration-index-section.tsx` 管 DNA／配方；`suno-reference-guide-section.tsx` 保留起手式與排錯。API 在會員驗證後合併靜態內容與 owner overrides。
- 每筆新增 `metadata`：`platform: string`、`model: string | null`、`modelVersion: string | null`、`lastVerifiedAt: YYYY-MM-DD | null`、`status: Verified | Experimental | Legacy | Deprecated`。未知模型、版本、日期留 null；既有資料內部預設 Legacy，但會員前台不顯示新舊分類、狀態或 metadata 面板，也不依狀態隱藏資料。原 evidence／sources 保留。
- 全部來源內容、ID、排序和搜尋文字保持：163 Prompt moves、21 lyric moves、38 Taiwanese entries、772 DNA、747 recipes；此次沒有刪除、重新去重或改寫內容。
- 三種既有 owner 可編輯條目沿用 `ai_music_bible_content_overrides.payload.metadata` JSONB，無需 SQL migration。Verified 必須有模型、版本及有效日曆日期；編輯日期不可當驗證日期。metadata-only 更新保留原文，舊客戶端更新保留既有 metadata。DNA／747 recipes 逐筆後台編輯仍待擴充。
- 會員驗證、private no-store、缺表靜態回退保留。正式站已實測登入後五入口、收合章節、搜尋／複製、四語切換與 command search；owner 儲存由隔離 runtime 驗證，此次未為測試而寫入正式內容。
- 修改檔案與完整驗收見 [發布證據](releases/2026-09-28-music-bible-2.md)。後續工作讀私人 roadmap。


## 音樂分析工具入口

- 應用 `52e66c6`／`codex/music-analysis-tools`。`src/app/music-analysis/page.tsx` 改為純外站導覽；`src/lib/music-analysis-tools.ts` 集中官方 URL、核對日期與四語文案；`src/components/ai-music-bible-page.tsx` 更新兩處入口說明。
- 頁面不再讀取 `NEXT_PUBLIC_MUSIC_ANALYSIS_URL`、輪詢 health 或嵌入 iframe；既有 `/api/music-analysis/health` 與獨立曲風建議 API 未改。未新增套件、API key、付費服務、SQL 或正式資料寫入。
- 三入口均使用固定 HTTPS URL、`target=_blank`、`rel=noopener noreferrer`；不向外站附帶帳號、音檔或其他資料。此頁公開，受保護會員功能不變。
- 官方資訊核對 2026-09-28；外站提供者可能修改免費條件。沒有使用使用者歌曲測試第三方分析品質，也未替使用者註冊或購買外站服務。
- 驗收及部署 ID 見 [發布證據](releases/2026-09-28-music-analysis-tools.md)。

## 創作者中心與來源預覽

- `GET /api/creator-center`：先驗證 bearer 身分，僅 service-read 本人 community tracks，包含 inactive／期滿歷史；按500筆分頁，逐100首分批讀取去重支持及其他會員可見評論。回應 private/no-store，不回傳评论者userid或假餘額。收藏沿用原私人 honors／Choice API，不建立第二套資料。
- `POST /api/creator-links`：preview 只向固定官方來源取 metadata，8秒逾時／1.5MB上限／拒絕任意host與redirect；Suno短分享僅接受一次官方受限轉向。以30分鐘HMAC綁定user及canonical source。簽名是解析與來源綁定，不是版權或伺服器播放保證。
- 2026-10-15：前端輸入來源後500ms debounce自動呼叫preview解析，忽略過期請求；previewToken仍是本人來源解析憑證，不再要求按預覽或confirmedPlayback。submit要求有效本人token、權利確認、現行曲風／名稱，沿用現行原子Credit投稿與本人RLS；每168h三件免費、後續成功件60並確認，Owner不限，沒有每曲風五件限制。原同來源unique及同作者既有YT防重複保留，同ID支援MV／評論。
- `20261013090019_creator_link_submission.sql` 增加來源provider／mediaID／URL與MV旗標、允許audio_path空、有效來源CHECK與部分unique index；`20261013094836_creator_link_required_fields.sql` 補SQL CHECK nullable三欄必填。兩份均已套用並validated，沒有改舊列、政策、grants或函數。
- 實際authenticated role的可回滾SQL交易驗證無音檔連結INSERT與quota+1；ROLLBACK後重查仍329列、0個link row、0個測試作品，UI仍0/3。沒有永久測試投稿、評論或Heart；訪站原analytics／presence照常。
- 投稿預覽與試播選用：一般音檔使用本機ObjectURL，明確投稿前不upload；Drop／Q Crash的MP3試播先驗證並暫存為私人草稿，明確發布前不建作品或場次、不扣投稿額度；YouTube／Suno／Spotify使用可見官方播放器，不要求播放事件或手動試播確認。來源解析失敗可重讀，Spotify長度仍由來源決定。只有YouTube連結納入酒吧混合電台，透過youtubeId而非偽造audioUrl；Suno／Spotify、Choice及盲聽來源資格不變。
- Owner沿用既有本人主email驗證，不以可編輯metadata email授權；一般帳號沒有後台入口。Credit沿用現行creator_credit_entries及參與ledger，已啟用回訪15、有效評論10、Heart3、盲聽3及額外成功投稿60；不能以殘留APC欄位冒充餘額。
- 原私人metadata、Choice、batch favorites、Battle與作品表現入口保留在focused dialog；新總覽4件／頁，原完整manager10件／頁。修改metadata不重置年齡／額度／戰績。
- 回復程式可promote舊READY版本；加法schema留在DB，不DROP來源欄位、不刪舊作品。若已有人提交新連結，舊app可能不展示無音檔列，但資料仍在，需先評估後再回復。
- Supabase advisor現有提醒含service-only表RLS無policy、既有可執行SECURITY DEFINER RPC與Auth密碼保護；本次未新增表／授權或展開無關hardening。[DB linter](https://supabase.com/docs/guides/database/database-linter)、[Auth密碼保護](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)。這不是整站安全稽核完成聲明。

## 架構與資料來源

- Next.js App Router、React、TypeScript、Tailwind；精確版本讀 package.json／lockfile，不在文件複製版本號。
- src/app 放頁面／API，src/components 放共用 UI，src/lib 放規則與資料轉換，tests 使用 Node test runner，supabase 放遷移。
- Explore 與酒吧共用 listen_bar_tracks／Heart；Showtime 月榜只彙總此曲庫的有效支持，Choice 是獨立歌單；Q Crash 使用自己的完整作品與密封票資料，不可混合跨來源 ID 或收藏語意。
- Supabase 與 Vercel 依使用者背景為 Pro；配額、費用、同時在線能力必須重新實測，舊容量估算不是承諾。
- 公開／私密資料邊界依產品規則。前端隱藏不等於權限；server 驗證 token、owner 與來源狀態。
- 發布使用 Vercel 既有 project link；不得建立錯誤新專案或更改帳號。環境值不寫進本文件。

## 發布與回復

1. 記錄分支、HEAD、git status，明確列出既有無關變更。
2. 先跑相關測試，再跑下方 Standard Commands。既有失敗需對照基準，不宣稱全通過。
3. 視覺改動用真實瀏覽器驗證桌機 1440×900、手機 390×844、中英與相關語系，檢查鍵盤、播放、返回路徑和 console。
4. 只提交本任務檔案。工作區有無關改動時，從待發布 commit 建立乾淨 worktree，僅使用必要的本機環境配置，禁止將環境檔或截圖提交。
5. 若涉及 DB，先完成對應遷移與授權範圍核對；未套用不能宣稱完整上線。資料庫變更需有遷移與驗證紀錄。
6. 發布後確認 Ready、alias 與正式 aipoger.com 的改動頁。記下 commit／deployment，不能只看本機。
7. 需要回復時，定位上一個已驗證 deployment／commit；依問題範圍回復應用，不能假設回復程式會撤銷 SQL 或真實資料變更。

## 帳號與事故排查

- 品牌信箱 aipoger99@gmail.com；Supabase project ref rwueinzgjaaefjvmsyem。SMTP sender 與品牌帳號須一致，精確設定到 dashboard 核對，密碼永不記錄。
- OAuth 回到首頁卻未登入時，檢查 code 是否進 auth/callback、www → apex、PKCE/session 交換與回程保存；不要把歷史成功紀錄當目前通過。
- 手機 App 內建瀏覽器可能阻擋 OAuth；Email Magic Link 為可用替代，測試必須回原操作頁。
- 自動播放阻擋先檢查恢復控制。手機音量要確認實際聲音／gain，不只百分比；本機音訊成功不等於 iOS 真機通過。
- 字型／外部媒體／分析服務冷啟動與不可用需要真實錯誤狀態，不可用 mock 成功。

## 回歸清單導航

以下按功能查閱：登入 → 首頁 → Drop／Q Crash → Explore 攻擂 → 隱藏 24H → 酒吧 → 作品 → 聖經／審核 → 耳朵蟲 → Showtime → 手機／流暢度。

## Standard Commands

Run before production deploy:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Known current lint warnings:

- `@next/next/no-img-element` warnings in admin Listen Bar UI.
- Existing React hook dependency warnings in Battle pages.

These are known warnings, not current blockers, unless a new change introduces new warnings/errors.

## Production Deploy

Deploy command:

```bash
npx vercel deploy --prod --yes
```

After deploy:

- Confirm Vercel aliases `https://aipoger.com`.
- Confirm the affected page returns HTTP 200.
- Open the affected production URL in the in-app browser when UI changed.
- Check console errors/warnings on the changed page.

## Auth Smoke Test

Check:

- Logged-out visitors can open home, Battle list, Bar Heartbreak, AIPOGER Showtime, rules pages.
- Logged-out visitors can listen to public Bar Heartbreak tracks.
- Logged-out visitors can browse and listen on Explore AI Music without sign-in.
- Logged-out visitors opening `/ai-music-bible` see the normal Bible title/value preview and a focused sign-in dialog, not the searchable Bible content. No large hero headline says "sign in" or "unlock"; the primary dialog action preserves the Bible return path.
- Logged-out visitors cannot vote or comment in Bar Heartbreak.
- Hearts and saved favorites on public listening surfaces require sign-in. Pressing Heart while signed out opens the focused sign-in dialog and preserves the exact track return path; it does not replace the public-listening hero with login copy.
- Logged-out visitors are asked to sign in before upload/Battle actions.
- Logged-in users can see profile/fighter identity where expected.
- Profile `收藏歌曲` supports batch selection and batch removal, and removing saved favorites does not delete historical Heart reactions.
- Creator and listener Profile saved songs both open the same fixed bottom queue player. Each song row has one play action, and the shared player exposes play/pause, seek, previous/next, volume on mobile and desktop, and close without covering the final song row.
- Profile saved favorites can be removed while that day's Heart remains active; this direct Profile action does not cancel or recount the Heart. Re-pressing the public Heart button must cancel that day's Heart and synchronized favorite, then allow a new Heart afterward.
- Profile creator data lists songs in pages of 10; `收藏歌曲` can batch-delete saved favorites, and the creator's own Bar Heartbreak songs can be batch-removed from public/battle surfaces.

## Homepage Checklist

Check:

- Desktop right-side destinations appear in this order: `探索 AI 音樂`, `傷心酒吧`, `Drop Battle`, `Showtime`; only Explore uses the solid-orange primary treatment.
- `Drop Battle` links to `/battle?lang=<lang>` and exposes the localized 60s Drop Battle hover/focus description.
- At 1440x900, all four desktop actions remain inside the right panel and the panel does not overlap the lower navigation cards.
- At desktop reference widths, the compact social row ends above the divider and does not overlap the five lower navigation cards; the lower row remains fully visible in the first viewport.
- At 390x844, the four destinations use a 2 x 2 grid with readable labels, usable tap targets, and no horizontal overflow.

## Drop Battle Checklist

Check:

- Battle setup page loads.
- Audio upload/cut flow still works.
- Duplicate active Drop audio is blocked when audio hash exists.
- One active Drop founder intent and one active challenger intent may coexist; reject extra intents within the same role.
- A user with an active Drop Battle can still start one active 24H Full Song challenge.
- Drop challenge cards older than 24 hours are cancelled by cleanup.
- If no instant opponent exists, user can open a Drop Battle challenge card.
- Public challenge cards render on the Battle page.
- The same battle/match group renders only once in the public Battle Pool.
- Share links from a Drop Battle card or live battle use `/b/{shortId}` and open the specific arena, not the Battle Pool.
- Drop Battle share thumbnails render as black background with the white AIPOGER logo.
- Logged-out visitors can enter a Battle arena link, vote, send arena danmaku, and tap feedback/reaction buttons.
- Logged-out visitors who try to accept/challenge a Battle card are sent to sign in before challenger upload.
- Bar Heartbreak reactions/comments/uploads/removals still require sign-in.
- Legacy `/battle?focusBattle=...` and `/battle?focusQueue=...` links redirect to `/battle/[id]`.
- Ended `/battle/[id]` links with no active rematch redirect to `/listen-bar`.
- Ended `/battle/[id]` links with active or uploaded rematch stay in the battle flow.
- Accepting a challenge card respects genre and ownership rules.
- A creator-owned waiting card shows `用另一首 Drop 挑戰` / `Challenge With Another Drop`; that explicit target flow may compare two same-genre Drops from the same account, while automatic pairing still never self-matches.
- Both participants can cancel an unfinished Drop Battle when the user is eligible.
- Quick start labels and stored start times are based on successful publish time, not a stale `expires_at`.
- Waiting room opens correctly.
- 0-2 distinct audience voters becomes audience-insufficient / no contest and does not create a result card, Showtime archive, song battle stats, battle history, or rematch window.
- 3+ distinct audience voters creates an official result that can be archived.
- Drop 勝出作品保留在正式對戰記錄，不再授予 Showtime 認證或直接進月榜。
- Upload-time full-song consent is captured before the Drop is published; the client cannot rewrite that consent or the stored full-song path afterward. After an official win, only the winning creator can submit an HTTPS YouTube MV URL from Battle Records.
- The submitted YouTube MV URL remains on the official Battle Record; no link appears for an opted-out winner, an unofficial result, a non-winner, or a Q Crash card using its separate editorial workflow.
- Apply and verify `supabase/20260802143000_battle_winner_release_links.sql` before enabling the winner release form. Confirm direct client updates to release fields are rejected while the server winner-release endpoint accepts only the verified winner.

### Q Crash

- Battle Pool shows one compact `建立 Q Crash` entry while keeping the existing live Drop Battle CTA and challenge pool unchanged.
- Creating work A offers supported public work links or verified MP3 (up to320 kbps,30MB), stores a unified full-song Track, captures the rights confirmation, and creates one pending Q Crash card without opening the Drop cropper.
- Work A and Work B may each attach their own cover; the selected cover is stored with that queue/work and appears on the matching A/B seat. Suno playback uses the public Mango rights handshake and just-in-time in-memory decryption; the audio is never persisted, copied into Storage, transcoded, or cropped.
- The creator may place a second own work, leave the card open for a shared invite, or target an existing creator account. A targeted creator receives a readable account notification linked to the pending card.
- Work B must use a distinct queue entry and the exact same fixed genre. A different creator must own the submitted track; the original creator may intentionally submit a second own track.
- The first successful work-B acceptance wins the pending-card claim. Two simultaneous accepts must not create duplicate battles.
- Voting begins only after both works lock. Both creators see the same battle ID and `/b/{shortId}` share link.
- Battle Pool shows exactly one paired Q Crash card for that ID and suppresses both A/B queue rows from the ordinary card list.
- Battle Pool places Q Crash matchup cards in a distinct blue/cyan section directly below the Q Crash introduction. The red/orange `Drop Battle 公開挑戰池` contains only official/public Drop cards and its genre filters do not hide Q Crash cards.
- Q Crash入口為薄荷色，原場次卡保留青色；Drop入口及正式池維持暖橘／紅辨識，手機沒有水平溢出。新盲聽位於最上區，不受Q投票或正式池曲風篩選影響。
- Server time sets the immutable 30-minute / 2-hour / 12-hour / custom-up-to-3-day deadline; 2 hours is the default. Custom windows use whole-minute values from 30 minutes through 3 days.
- Logged-out visitors can open, listen to either full song, switch A/B playback, pause, seek, see time remaining, and share. Suno works resolve their public media metadata and playback-rights handshake, then play inside the Q Crash player; a failed source shows an in-app error and never silently falls back to opening Suno. Pressing the protected vote path returns through sign-in to the exact card.
- Before leaving for sign-in, the selected A/B draft is stored with the voting deadline. Email and OAuth callbacks keep the exact return target until the Q Crash destination really loads, use a full-page return navigation, restore the draft without auto-submitting it, and do not fall back to `/`.
- Participants cannot vote. A signed-in audience account can vote once and cannot recast.
- Selecting A/B does not write a vote. A fixed, explicit confirmation dock remains visible above the player; before confirmation the listener may replay, seek, and switch choices, and after confirmation the vote cannot change. Logged-out copy says `登入並投作品 A/B`.
- Before confirming the vote, that voter may enter one optional comment of at most 120 characters and send it with the A/B vote. After confirmation, the API/UI rejects new, edited, or deleted comments; before settlement it returns no public comment list/count, and after settlement visible comments are public. Comments never affect voting or five-axis feedback.
- Each signed-in non-participant may select 押韻、爆點、旋律、情緒、結構 once per work. Every key locks immediately; participants cannot submit feedback.
- During voting, the public API/UI returns no tally, percentage, total audience, feedback aggregate, leader, radar, or inference signal. It may return only the current listener's own selected feedback keys. Direct guest voting and the normal `cast_vote` path reject Q Crash.
- Owner Analytics records a private funnel with distinct browser sessions: open, both works played, A/B selected, sign-in encountered, and vote submitted. Playback duration and completion never gate voting, and no funnel count appears in any public or participant-facing pre-deadline surface.
- Deadline settlement runs from the 5-minute Battle fallback cron and also settles opportunistically on a post-deadline card read.
- Verify 0, 1, and 2 valid audience accounts settle as insufficient with no archive/stats/Showtime/rematch. Verify 3+ creates an official work-first result and saves the winning queue/work ID.
- Verify official ties reuse the stable formal Drop Battle tie breaker.
- Final notifications and result copy name the winning work first and then the creator. Same-owner comparisons never say the creator defeated themself.
- Official result shows the winning work's five-axis pentagon distribution. Insufficient result shows no radar or feedback aggregate.
- Battle Records places official Q Crash results in a separate cyan section, labels them `Q CRASH`, and links to `/b/{shortId}` / the interactive Q Crash card rather than only the generic result page.
- After an official result, signed-in non-participants can choose a separate preferred work A/B and change it later; the UI labels it as post-result preference and never mixes it into official vote totals or winner stats.
- Legacy archives without `source: drop_battle` or `source: q_crash` stay in storage but are hidden from the public Battle Records list.
- Every work opens an in-page lyrics HUD and has a readable `歌詞未提供` fallback.
- Check the pending, voting, voted, insufficient, official-result, cancelled, and expired screens at 1440x900 and 390x844. The shared five-key dock, fixed vote-plus-optional-comment confirmation dock, and fixed bottom A/B player must not cover one another or create horizontal overflow. Before confirmation, the optional comment is sent together with the vote; after confirmation, no comment editor or edit/delete action is shown.
- Confirm ordinary live Drop Battle guest voting, Battle Records, official gatekeepers, rematch, Explore challenges, and Showtime do not regress.
- Before enabling Q Crash in production, apply and verify `supabase/20260731_q_crash_async_drop_battle.sql`, `supabase/20260731193000_q_crash_feedback.sql`, `supabase/20260731233000_q_crash_voter_comments.sql`, `supabase/20260801055052_q_crash_work_covers.sql`, and `supabase/migrations/20260901090000_q_crash_full_song_tracks.sql`; code deployment without these schemas/columns is a release blocker.
- Apply and verify `supabase/20260801070000_q_crash_post_result_preferences.sql` before enabling the post-result A/B preference controls; until then the card must remain readable without breaking official Q Crash results.

## Explore AI Music Challenge Checklist

Check:

- `/ai-music` loads real Bar Heartbreak/public-airplay works and only lights the challenge button when the track status is `等人挑戰` and a defender 60s Drop is prepared.
- The `/ai-music` bottom mini player exposes a draggable playback progress bar, time labels, and a lyrics HUD popup with a side lyrics scroll slider.
- Profile creator data lets the owner switch each public track among `僅展示`, `等人挑戰`, and `自定開戰`.
- Profile shows `尚未準備守擂 Drop` before a defender Drop exists, routes the owner to the 60s Drop cropper, and blocks replacing the defender Drop while an attack invite is pending.
- Challenging from Explore opens the 60s Drop cropper/setup flow, carries the defender track ID through upload, and requires a start time.
- Submitted Explore challenges copy the defender's prepared Drop at invite creation; they must not use the full public-airplay song as the defender battle audio.
- Submitted Explore challenges create a pending battle/invite; the battle room allows both 5-second previews but voting remains closed.
- Submitted Explore challenges write a defender-side in-app notification. The right-top notification dock shows a red dot or unread number, opens the private Creator Center notification inbox, and routes Explore challenge invites to Profile's `待接戰` section.
- Profile / 我的作品 shows `待接戰` cards with song title, challenger, genre, scheduled start time, defender 5-second preview, challenger 5-second preview, Accept, and Reject.
- The individual track row shows `待回覆` / locked defender Drop state while a pending invite exists; replacing the defender Drop is blocked until the invite is accepted, rejected, or expired.
- Defender accept moves the battle to active/live according to the scheduled time; reject closes the invite without stats.
- Defender timeout expires the invite and linked battle/queues without stats, Showtime progress, or either-side win/loss. The same challenger cannot keep multiple pending invites against the same track.
- A challenger is blocked after 6 outgoing Explore attack invites in the Taiwan day.
- Explore challenge results need 3 distinct non-participant voters; tied official results award the defender; under-3 shows audience-insufficient/no result.

Drop cropper keyboard check:

- In `/battle/hook-cut`, Space toggles preview only when focus is not inside textarea/input/select/contenteditable/`role="textbox"`, no meta/ctrl/alt is pressed, and IME composition is not active.
- Lyrics textarea, song title input, creator input, AI tool fields, genre select, notes/description, and other text-editing targets can enter Chinese and English spaces normally without `preventDefault`.

When the 10-card limit is implemented, also check:

- The 11th public Drop challenge is blocked before or at queue insert.
- User-facing copy says the Drop challenge field is full.

## 24H Full Song Checklist（僅修改此保留系統時）

Check:

- 24H upload mode loads.
- Full-song file size limit message is visible.
- Single active 24H per-user limit is enforced.
- Finished, cancelled, or expired 24H entries release the user to start another 24H challenge.
- A user with an active 24H Full Song challenge can still start one active Drop Battle.
- Duplicate active 24H audio is blocked when audio hash exists.
- Queued 24H challenge appears on Battle page.
- Queued 24H share links use `/d/{shortId}`.
- Another user can accept a queued 24H challenge.
- Live 24H battle page loads.
- Live 24H share links use `/h/{shortId}`.
- Voting requires login.
- Finished 24H battle records winner when not tied.
- Legacy 24H results remain historical Battle records; they do not grant certification or enter monthly charts automatically.

When the 10 active limit is implemented, also check:

- Count includes both `queued` and `live`.
- The 11th active 24H Full Song entry is blocked before storage upload.
- User-facing copy says the 24H Full Song field is full.

## Bar Heartbreak / Profile Submission Checklist

- `/listen-bar` 與 `/l/all`／原14曲風短鏈導向 `/ai-music#explore-radio`，保留語言、曲風与原曲深連結；`#play-request`／submit=1導Profile上傳。Spotlight參數忽略，不指定播放。
- `/api/listen-bar/tracks`直接沿用`/api/ai-music/tracks`，完整分頁讀取資格候選，三個日曆月期限与公開moderation／lifecycle條件一致；不得把讀取失敗當零歌曲或零票。
- 電台與卡片使用music-player-store共用控制，音檔唯一root audio，YouTube使用單一可見IFrame API播放器；驗證混合佇列實際自然播放、seek、volume、上一首歷史、下一首循環、卡片接替、跨頁持續與滾動切換控制。Inline IntersectionObserver只隱藏dock控制，音訊留在root；進頁不自動播放。
- 電台／卡片／dock評論開原ID modal、登入return带track/comments=1；每曲評論持久保存与原通知審核保留，創作者自留言不通知自己。Top10／50無評論圖示。
- 新ProfileMusicUpload抽出原有處理，只在自己的作品區開啟；guest引導登入后保留submit/語言/hash。Private讀取錯誤不得假裝無作品；上傳前與INSERT前重新核對同一帳號，同步鎖防雙重提交，失敗保留draft並清理僅該次新資產。
- 手選14曲風、21秒可選分析告知／worker未啟用手選回退、原格式30MB、metadata/cover/lyrics/YT、雜湊、一般會員連結／音檔共用個人168小時三首的DB原子限制保留，Owner不限數量；每曲風五首active上限取消。上傳格式／限制按產品規則，失敗不計額度、刪除不退額度。
- Profile自己的到期作品仍可管理／預覽，標示公開推廣期結束；到期不改DB active/quota、音檔、Heart或Battle記錄。Production驗證不以live owner或真實投稿／留言／Heart產生测试資料；mock runtime驗證寫入成功及失敗。
- 舊公開聊天與故事／歌詞牆撤下，24小時訊息API及清理只保留歷史相容。GET/POST process-rotation及DB rotation函式依舊零變動，不能重啟生存淘汰。

Choice and retired Spotlight:

- `/admin/listen-bar` song management lists 10 songs per page; `選取本頁` selects only the current page, while bulk update / hide / restore / delete still works for accumulated selections.
- `/admin/listen-bar` defaults to the `全部上架` active/on-air view, has no duplicate `隱藏下架` filter, keeps removed songs out of both active and hidden views, and provides separate `只看下架` and `已移除` views with restore. It shows `NEW` for `created_at` within seven rolling days and persists the owner-only external-promotion checkbox without changing `promoted_at`.
- `/admin/listen-bar` search/filter toolbar uses one consistent control height and radius at desktop and mobile widths, with no vertically wrapped button labels or orphaned sort control.
- `/admin/listen-bar` metadata and bulk-metadata saves preserve the current visibility, genre, month, search, sort, and page view; editing while sorted by upload time must not jump to update-time sorting.
- `/admin/listen-bar` upload preview and track rows each expose one play action. Every preview switches the same fixed bottom player with play/pause, seek, volume, and close controls; no track card renders its own native audio control.
- `/admin/listen-bar` has no Daily Spotlight selector, date, copy, media, preview, save, or draft-generation controls, and makes no Daily Spotlight API request.
- `/listen-bar?spotlight=YYYY-MM-DD&lang=zh` redirects to Explore radio, ignoring Spotlight without specified-song playback.
- `/today?lang=zh` returns 307 to `/rank?lang=zh#choice-weekly`.
- `/admin/social` remains the only draft, approval, and manual publishing console; Discord publishing still requires an approved draft plus its explicit publish action.
- /admin/showtime 不再提供授證；舊入口導至作品管理 /admin/listen-bar。音檔、實際 Battle 結果、票數及 Heart 不可改寫。
- /admin/choice 僅管理已發布歌單，owner 統一使用 /profile/choice 製作。官方新增／編輯／發布／封面 API 回傳 410，管理 GET 不返回草稿或選曲庫，分頁讀取全部已發布歌單；不自動生成社群草稿或對外發布。
- Existing `listen_bar_daily_spotlights`, historical assets, and old social drafts are not deleted during this retirement.

## AI Music Works Checklist

Check:

- Homepage first-layer primary action says `探索 AI 音樂` and links to `/ai-music?lang=zh`.
- `/ai-music?lang=zh` returns 200 and uses `探索音樂` with subtitle `找到對味的歌，讓好作品被聽見。`, a shared editorial header, search and compact Bar Heartbreak radio above the title. No old giant centered catalog hero, duplicate fixed chrome or nested taste panel remains.
- Shared header / homepage footer submission links preserve `lang` and open `/profile?submit=1#submit-work`; legacy `#play-request` redirects there. Guest auth return keeps intent, Explore work/comment links and account/owner dock remain intact.
- Search the complete loaded eligible catalog by title/creator/AI tool, combining the selected genre; matches beyond the collapsed four render, no-match/reset works, original IDs/counts are preserved. Filters on Hot Now must retain global rank labels.
- Earworm recommendation IDs do not occur again in lower lanes; lower-lane order still follows the complete original genre ordering, and playback queues retain original genre/heat sources. No profile means normal catalog plus test entry. Locale/data reloads show no stale recommendation success after loading/error.
- The local `/guide.png` action opens the existing accessible dialog: verify X, Escape, backdrop, focus trap/return and mobile scrolling. Desktop adds the concise guide text; phones retain the icon.
- An Explore share URL has the shape `/ai-music?lang=<lang>&track=<id>#works`, stays on Explore rather than Bar Heartbreak, expands the matching style lane, and scrolls to the shared work without autoplay.
- Desktop masthead is compact and cover-led: small radio, title/search/control strip, left Top10 and right four-card gallery. Phone uses two cards and a three-work chart preview with Top50 available; tablet previews four. Check 320/390/768/1280/1487 widths and zh/en/ja/ko without document overflow.
- `依曲風 | 正在升溫` is a local Explore control. The default preserves genre lanes; Hot Now remains separate from Showtime and Choice, but uses the same compact cover-card density: phone two-column and narrow-screen/desktop 3 / 4-column grids, never a wide rank table; 320px genre selector occupies its own full-width row.
- Hot Now reads only 7-day distinct Heart supporters, official Battle audience votes from archives meeting the 3-voter threshold, latest qualified interaction, then created_at/id. It never uses all-time Hearts, play counts, mock scores, or Heat Score. Signal-less works are `正在累積` with no rank number; this remains separate from monthly chart counting.
- The page groups works by the current 14 fixed music genres and shows at most 4 cards per genre before `看更多`.
- Explore has no standalone `最新上架` / `New Arrivals` / `72 小時新歌` shelf, route, category, or independent `看更多`; new eligible works appear at the front of their existing genre lane.
- `NEW` uses `created_at` younger than a rolling 7 x 24 hours for both its badge and Explore sorting priority; it expires from both at the seven-day boundary and never reads `updated_at`.
- Explore places `NEW` at the cover top-left and keeps `接戰` at the top-right without overlap on desktop/mobile. Bar Heartbreak shows `NEW` on the now-playing cover; creator track list preserves the original window.
- A NEW work (within rolling 7 x 24 hours by `created_at`, never `updated_at`) appears ahead of established works in its genre lane; lanes with NEW works lead the wall by newest NEW `created_at`, while lanes without NEW works keep the fixed genre order.
- The collapsed first 4 cards in a genre lane show at most one NEW work per creator; all other NEW works remain visible after that lane's `看更多` expansion.
- Cards put title beside large orange Heart and white comment, creator below; cumulative Heart is in tooltip/accessibility text, distinct supporter score in chart. Preserve original work ID, Battle HUD, actual W/L and 44px-high action targets without another row.
- Cards that are truly challenge-ready show a non-clickable red angled `接戰` badge at the cover's top-right on desktop and mobile; non-ready, retired, hidden/removed/moderation-held, missing-drop, or unplayable works do not show it. Old certification alone is no longer a gate; the creator must explicitly opt in after the one-time reset.
- The card's bottom `攻擂` button remains the only challenge action; the `接戰` badge must not replace it or use `攻擂` as badge text.
- Signed-in users' card/radio Heart lights for today's active reaction; re-press cancels current-day Heart and synchronized favorite. Read private state in ID batches, protect against account change, prevent duplicate pending writes; distinct support can remain if previous-day Heart exists.
- Desktop/mobile information action expands the Battle Record HUD. Desktop hover/focus reveals compact info/share controls; phone controls remain visible, and closed details do not obscure artwork.
- Cards and Battle HUD retain actual wins/losses; six-defense certification progress and promotion promises are removed.
- Card play uses root audio and inline radio/dock controls, never per-card audio. Chart cover plays the same queue; song name expands/locates original card without autoplay.
- `Drop Battle`, `Showtime`, `傷心酒吧`, and `Choice` are internal options on `/ai-music`.
- Old genre labels are not shown as current category headings.
- /api/ai-music/tracks 不再排除舊認證作品；8 敗退場及既有歷史豁免仍在。挑戰由公開狀態、未退場、創作者自行 opt in 和準備好的 Drop 決定。
- /rank 改讀月榜 RPC 與公開 Choice，不從認證或 Battle archive 建造另一份作品牆。

## AI Music Practice Bible Checklist

- Homepage lower navigation shows `AI 音樂練功聖經` with the book icon and links to `/ai-music-bible?lang=zh`; the old homepage `歌曲分析` card is absent.
- `/ai-music-bible?lang=zh` returns 200. Signed-out visitors see the normal Bible title/value preview, a focused sign-in dialog, and public links to Explore and Bar Heartbreak; signed-in members see the complete Bible and the external analysis-tool directory is linked from its practice map/toolbox.
- The Bible Hero exposes a clear localized `分享聖經` / `Share Bible` action in both access states. It keeps the current `lang` in the shared URL, uses native sharing when available, and shows the copy fallback without requiring sign-in.
- Desktop at 1440x900 keeps the full `AI 音樂練功聖經` title together without a single orphan character; mobile at 390x844 has no horizontal page overflow.
- `#suno-prompt-library` and nested `#lyric-control-library` are directly reachable from the practice map and render complete Chinese and English variants.
- The Suno library contains 163 unique free prompt moves, 21 unique lyric moves, at least 80 unique normalized genre terms, and six production-flow steps. The lyric library includes the five-layer basic vocal direction cues for delivery, character and tone, effects, placement, and transitions. The 163 prompts include the original Studio Mastering pack plus five Disco directions, 45 Beatport screenshot expansion prompts, core prompt moves, and 40 modular instrument-tone directions for common instruments, recording, effects, and mix/master balance. Every move has bilingual title, summary, use case, copy text, source attribution, and an official / field-tested / version-sensitive evidence label.
- The credited community guide and Apache-2.0 open skill remain internal provenance for seven deduplicated bilingual moves; the public library does not expose original-source buttons or attribution labels. Community cue counts, prompt lengths, bracket behavior, BPM, and key suggestions are not mislabeled as guaranteed Suno commands.
- Prompt, lyric, and genre search/filter interactions work on desktop and mobile; technique cards and genre groups copy the expected text, and Show All reveals the complete catalog without page-level horizontal overflow. Selecting `錄音室 Mastering` reveals the 15 wrapping music-family filters, family selection narrows the 100 Studio Mastering cards, and every studio card keeps a visible family badge.
- Prompt and lyric search panels include a visible instruction, readable placeholder, live result count, clear-search action, 44px-or-larger category targets, `aria-pressed` selected state, and wrapping category controls without a mobile horizontal scrollbar.
- `#suno-inspiration-index` is reachable from the practice map and shows two obvious database tabs: 772 artist sonic-DNA references (771 encyclopedia entries plus one labeled AIPOGER addition) and 747 canonical prompt recipes. The source total is 750 recipes and exactly three duplicate combinations are removed.
- Artist and recipe searches accept Chinese and English terms, selected genre filters are unmistakable, result counts update live, clear-all resets every condition, and Load More adds 18 cards without page-level horizontal overflow.
- Artist cards show the lookup name but the copy action exports only sonic traits plus the no-direct-imitation guard. Recipe cards expose Chinese dimensions and copy a concise English prompt.
- Every index card exposes comments after member sign-in. The comments GET endpoint rejects missing/expired bearer tokens; signed-in users can post up to 280 characters, delete only their own comments, and report other comments.
- `ai_music_bible_entry_comments` has RLS enabled and no public/anon/authenticated table grants. The same-origin API validates catalog keys, authenticates bearer tokens with `auth.getUser`, rate-limits writes, and degrades to a compact preparing state when the schema is unavailable.
- The library labels the supplied V4.5/V5 material as older than current V5.5, links to official Suno documentation, and does not claim bracket tags, percentage recipes, key changes, or mix/master wording are guaranteed commands.
- `#suno-control-desk` exposes three distinct Style / Lyrics / Title starter channels, one copyable starter template, an eight-item resettable pre-flight checklist, and six symptom-led troubleshooting routes in Chinese and English.
- The pre-flight chapter explicitly labels 4-7 Style cues and three-render comparison as field methods rather than official Suno limits. Troubleshooting never promises that bracket labels, structure cues, or mix/master wording will force a result.
- The signed-in sticky Bible dock exposes high-contrast chapter shortcuts at desktop and mobile widths; `Command/Ctrl + K` and `/` open search, Arrow Up/Down change the active result, Enter navigates, and Escape/backdrop/X close the dialog. It must not overlap the floating account/avatar dock.
- `#suno-version-watch` and `#rights-release` show page-updated and official-cross-check dates separately. Official feature cards link only to current Suno help pages, and rights copy distinguishes paid/free generation context, non-retroactive rights, and copyright uncertainty without presenting legal advice.
- The server-rendered public starter and five-question FAQ are localized for Chinese, English, Japanese, and Korean. They remain high-level, expose none of the complete 1,519-entry member index, and match the localized `TechArticle` / `FAQPage` JSON-LD plus canonical, hreflang, Open Graph, and Twitter metadata.
- `#stem-separation-guide` renders complete Chinese and English variants with 10 unique engine families, 7 unique goal routes, and official source links that open externally.
- Choosing a Stem goal updates the recommendation and highlights only the matching engine cards; accordion cards expose strengths, limits, implementations, and source links on desktop and mobile.
- The Stem guide credits the owner-provided PDF and its credited author, shows the 2026-07-17 cross-check date, treats FL Studio's underlying engine as undisclosed, and does not repeat the PDF's unconfirmed LALAL.AI direct-synthesis claim as fact.
- The Stem section remains readable at 1440x900 and 390x844 without page-level horizontal overflow.
- All 100 audited free Studio Mastering Prompt cards show one localized `15 秒試聽` / `15s preview` action and the generation-variability note. `Modern Taiwanese Pop` must not appear as a free searchable/copyable card or expose a stale preview action. `Chinese Gufeng Cinematic` must be searchable in Chinese and English and expose its approved preview. Clicking any example opens the shared fixed bottom player with seek, previous/next, mobile/desktop volume, and close; cards do not autoplay or render native audio controls.
- All 100 public audited Prompt preview MP3 URLs return `200`, have a duration of 15 seconds within normal encoding tolerance, keep a consistent perceived loudness without clipping, and can be traced to a corresponding Suno-generated source and crop point. Beatport expansion clips are demo sketches for direction listening and must not be described as formal mastering references.

## Comment Moderation Checklist

- `/admin/comments` rejects signed-out and non-owner accounts, and the API validates the bearer token with `auth.getUser` plus the owner allowlist.
- The desk loads Bar Heartbreak, Choice, and Bible persistent comments into one newest-first list without exposing user email addresses.
- Search, source filters, status filters, report-first view, target links, refresh, and pagination work on desktop and mobile.
- Hide removes a comment from its public/member API while preserving its body and moderation audit fields; restore makes it visible again.
- Resolving a reported comment closes matching open/reviewing `content_reports`; hide and permanent delete also resolve matching reports.
- Permanent deletion requires a second confirmation and removes only the selected source/id pair.
- Production moderation schema was applied and verified on 2026-07-17 with `20260716180323_ai_music_bible_entry_comments.sql`, `20260716185707_centralized_comment_moderation.sql`, and `20260717093516_comment_moderation_audit_indexes.sql`. All 20 pre-existing Bar Heartbreak comments remained `visible`; Choice and Bible began empty; no comment was deleted. All three tables have RLS enabled, no `anon` or `authenticated` grants, complete `service_role` access, moderation constraints, lookup indexes, and covered moderator audit foreign keys.
- The Taiwanese lab contains 38 unique seed rows, searches across meaning/recommended form/Suno form/note, filters by category, copies the Suno form, and switches from a desktop table to mobile cards.
- The lab disclaimer distinguishes AI singing phonetic experiments from recommended Taiwanese orthography.
- New suggestions require meaning, Suno writing, and a test note. Successful submissions show a pending-review confirmation instead of claiming immediate publication.
- `ai_music_bible_contributions` has RLS enabled; `anon` and `authenticated` have no direct table read/write grants; only the server service role can insert/review rows.
- `/admin/ai-music-bible` lets an owner search three editable groups, save bilingual copy/category/evidence fields or Taiwanese pronunciation notes, and restore a single row to its default. The page must show a clear migration-unavailable state instead of implying a save succeeded.
- `ai_music_bible_content_overrides` has RLS enabled with no `anon`/`authenticated` grants; public/member Bible reads and owner edits are server-mediated and preserve the static catalog as a fallback.
- Contribution requests reject foreign origins, use a honeypot, validate lengths and enums, and limit a request fingerprint to 6 submissions per hour.

## Earworm Checklist

Check:

- `/earworm` loads 10 real public playable works without a genre selector.
- Genre labels stay hidden during the questions and appear only in the final personality result.
- All four reactions are available immediately because Earworm records first impressions; there is no minimum listening time. Each track attempts automatic playback, and a visible `下一首` action records `無感` before advancing.
- Progress advances exactly once per answered work and reveals the result only after 10 answers.
- The result shows one `目前最接近` primary genre, two nearby genres, and listening keywords. Its vertical action order is `去探索音樂` -> `去傷心酒吧` -> `看看為我挑的歌` -> share -> retest; Explore and Bar use equal destination-card treatment.
- A signed-out visitor can see the result without a save prompt. Signed-in results save silently; the result has no `結果已保存`, account-save status, or separate save control.
- Ordinary `/ai-music?lang=zh` entry shows a dismissible Earworm invitation only when no fresh completion or skip exists; track/share/genre/challenge links bypass it. `先逛逛` suppresses it for 7 days and a completion suppresses it for 30 days.
- Completion writes a compact browser-local result for guests and members without per-song reactions. Explore shows one approximately 70/30 match/discovery recommendation shelf; the standard catalog remains available.
- The API rejects fewer/more than 10 answers, duplicate track IDs, invalid reactions, negative observed listening seconds, unavailable tracks, and a mismatched quiz key.
- Earworm exposes no APC copy, reward field, daily point limit, or point-award RPC call.
- `earworm_personality_results` has RLS enabled, no direct `anon` or `authenticated` grants, service-role access, and one-result-per-quiz protection.
- `earworm_track_reactions` has RLS enabled, no direct `anon` or `authenticated` grants, service-role access, and unique `(user_id, track_id)` protection. Retesting updates the latest aggregate input instead of adding a second public sample; no per-song personal history is exposed in Explore or Bar Heartbreak.
- `earworm_track_affinity_stats` is service-role-only. Explore and Bar Heartbreak read the same track aggregate, hide percentages below 20 distinct accounts, and show `好感度累積中` for tested small-sample works.
- Production Supabase application was verified on 2026-07-22: `earworm_personality_results` and `earworm_track_reactions` have RLS enabled; anon/authenticated direct reads are revoked; the service-role aggregate view is available. `20260725_earworm_instant_reactions.sql` was applied to relax only the listening-time check from eight seconds to non-negative observed time; all 10 existing reaction rows remained and RLS/grants were unchanged.
- Blind affinity never changes Heart totals, Bar pool/survival order, Battle votes/results, defense progress, Showtime certification, Choice, or public rankings.
- Earworm writes no formal Battle votes, results, wins/losses, defense progress, or Showtime state.
- Verify 1440x900 and 390x844 layouts, Explore invitation/skip/reopen, the single recommendation shelf, public favorability labels without personal-answer chips in Explore and Bar, first-load autoplay fallback, play/pause, seek, immediate reactions, `下一首`, next-track autoplay after a user gesture, tenth-answer result, the exact five-action result order, retest, and no browser console errors.

## Showtime 月榜與 Choice 現行驗收

- /rank 保留 AIPOGER Showtime 品牌，Choice 與月榜同時掛載，不用頁籤；#choice-weekly／#monthly-charts 是原生錨點。桌機約 70/30，手機為主推、月榜摘要、更多 Choice；僅一個製作入口，空／少內容不留廣告占位。
- 主推設定存於私有 listen-bar-data/choice/featured.json；僅 /api/admin/choice 的 owner guard 後可寫入。set_featured 驗證 kind、UUID、已發布及可播歌曲；公開讀取排除草稿／撤下／刪除，畫面再與公開可播歌單交集，不能靠主推繞過可見性。無 DB schema 變更，不修改認證、曲庫、票數或收藏。
- 月榜摘要最多五筆；完整展開及月份／類型／搜尋可用，Play All 依完整篩選名次。測試實際 API 權限與主推儲存失敗，既有 auth race／跨日愛心／共享播放器測試必須保留。
- 月榜讀 /api/charts/monthly，DB 依台灣曆月逐筆有效 Heart 去重、排除作者自投，至少 3 位支持才列名次，同分顯示名次待定，由 owner 在同支持數組內裁定；類型榜依產品規則繼承相對順序。不得從前端陣列索引或累積愛心捏造順位。
- 月份選單只顯示啟用後真實月份；本期更新、過期封存，零支持月份仍封存一次。歷史榜不得因下架重排；下架、未公開、審核中或無音檔歌曲不可播放。
- monthly_charts migration 的讀取／封存 RPC 僅 service_role 可執行；表格 RLS 開啟。來源寫入與月末封存共用 advisory lock；以獨立 PostgreSQL 測試驗證去重、跨月、取消支持、同分、權限、不可改寫及超過 1000 筆。
- /api/cron/monthly-charts 驗證 CRON_SECRET，每日台灣 00:05 執行；資料讀取與來源寫入也會補結算已完成月份。缺少 schema／權限不可偽装成正常空榜。
- 圖片、播放、收藏與分享沿用真實歌曲。月榜愛心使用歌曲 /api/listen-bar/reaction，Choice 歌單收藏與既有歌曲收藏保持各自語意；不新增第二套歌曲人氣分數。
- 公開 Choice 使用 PublicChoiceGallery 與 ShowtimeChoiceShelf，保留策展者身分封面、期別、標題、推薦介紹、HUD、評論、獨立歌單收藏與分享頁。官方／個人身分不可從標題猜測。
- 任何登入創作者可從 /profile/choice 開啟自己的收藏選曲；搜尋／類型篩選、獨立勾選最多十首後確認、已選清單、數字指定順位、預覽、發布 5–10 首。只有明確儲存或發布／撤回才提交整批內容，第一次明確儲存才建立草稿；單週一份 Choice 不改。
- 取消收藏不連帶刪除已選 Choice，移出 Choice 不取消歌曲收藏；未收藏新歌不可繞過 API 加入。既有公開歌單及舊 Battle 選曲保留來源 ID／音檔公開同意，不會因認證退役而消失。
- 所有創作者自有作品由 Profile 管理顯示資料與外部支持連結，音檔、戰績、票數不可改寫；修改外部支持連結仍進既有審核。平台不處理支付或金額。
- 認證入口、六次守擂認證進度、官方認證標章及認證資格 gating 移除。舊認證 metadata 僅歷史保存，新增資料不得授證。
- 原認證歌曲在退休遷移時一次設為 showcase；創作者可自行重新 opt in，重跑遷移不得覆蓋之後設定。歷史 8 敗豁免保留，未新增或恢復酒吧淘汰。
- 中英日韓、桌機 1440x900／手機 390x844 檢查：封面可见、文字換行、無橫向溢出、同頁錨點鍵盤操作、規則 HUD 關閉、底部唯一播放器不遮操作。
- 未登入者可聽歌與看榜；收藏／管理要求登入。驗證 auth 切換時清除舊私人資料，忽略舊請求，錯誤能重試且不鎖死 busy 狀態。

## Storage Checklist

Before large upload-related releases, check:

- Total Supabase Storage usage.
- `battle-audio` bucket usage.
- `listen-bar-audio` bucket usage.
- Largest file size.
- Current 24H queued/live count.
- Current Drop open challenge count.

Record fresh measurements for the current task; do not use historical snapshots as current usage.

## Mobile Checklist

Check at least one mobile viewport after UI changes:

- Home first viewport.
- Battle page.
- Battle setup.
- Bar Heartbreak now-playing area.
- Bar Heartbreak upload form.
- AIPOGER Showtime.
- Bar Heartbreak volume slider changes the effective audio level on a volume-locked mobile-media simulation, not only the displayed percentage; playback still advances after the gain node is connected.

Look for:

- Text clipping.
- Overlapping cards.
- Buttons too small to tap.
- Horizontally overflowing content.
- Audio controls crowding layout.
- Fixed home, language, and account controls do not cover page kickers or headings.
- Logged-out visitors see a sign-in action rather than a profile avatar with an empty notification bell; `/profile` returns them to sign-in and preserves the Profile return path.
- Signed-in users can click the center of the floating avatar to open Profile even when an account/Battle notice is present; the small bell is the separate notice control.
- Floating-avatar click is not swallowed by drag handling: pointer capture starts only after more than 8px of movement, while a real drag still persists its edge-relative position across release, reload, and viewport resize.
- Owner and non-owner signed-in sessions both render the floating Profile entry; Supabase auth-state changes update the dock when a session is signed in, signed out, or switched without requiring a full reload.

## Smoothness Checklist

Check:

- The desktop Battle Pool start-challenge artwork stays inside its header and does not cover genre filters or challenge cards.
- Battle入口使用Editorial頂欄、對戰記錄／規則與盲聽／Q Crash／Drop三區；Explore與電台仍從全站探索導覽進入。
- 1440x1024及390x844／320x812驗收三區和盲聽內頁，圖片設備與真實播放器區分；A/B／平手操作不重疊或水平溢出。手機允許捲至下方挑戰池。
- Battle新插畫設備保留VS訊號，撤下人物；帳號dock仍使用既有安全邊緣位置，不因拖曳／換頁／resize遮住評测主要操作。
- `/battle/results?lang=zh` uses `對戰記錄`; `/battle/results?lang=en` uses `Battle Records`. No public entry should still say `成果牆` / `Result Wall`.
- Bar Heartbreak shows one static Explore hint when there are no live Battle messages; duplicated marquee content is reserved for an active scrolling ticker.
- Legacy `/watch?lang=<lang>` keeps the supported language when it redirects to `/battle`.
- The retained analysis-health route handles warming versus upstream failure, but the public music-analysis directory no longer polls or embeds this service.


## 第一批版面與戰績回歸

- 空 Q Crash 不渲染大型空棚架；有卡時 A/B 卡仍存在且不進 Drop 列表。
- 無活躍 Q Crash 時，桌機與手機首屏可見 Drop 公開挑戰池主標。
- 個人推薦存在時，Explore 分類切換仍在其前；Heart、分享、播放、HUD 與開放接戰入口可用。
- 對戰記錄切換月份後，兩模式與本月摘要一致；超過 12 場 Q Crash 也不截斷本月小計。
- 4:3 顯示得票率 57%；缺少雙方票數不捏造百分比。

## 酒吧遷移與回復邊界

- `20260907182740_retire_bar_survival.sql` 已套用。回復應用不會撤銷 DB；原函式回復證據保留於私人 audits/2026-09-08-bar/database-functions-before.json。
- 不得為回復畫面而重啟淘汰；公開曲庫不設396首容量上限；目前展示另遵守三個日曆月期限與既有可見性保護。

## 共用播放器回歸（2026-09-08）

- 根 layout 透過 GlobalListenBarDock 掛載唯一 GlobalMusicPlayer；ShowtimeQueuePlayer 保留 imperative API 作為無音訊的相容入口。頁面使用 music-player-store 訂閱目前歌曲及進度。
- 酒吧下一首預告直接讀同一個 session queue；歌單建立後不受換頁、探索排序或新投稿影響。曲風庫每分鐘核對下架與三個月到期資料，僅從既有酒吧佇列移除不可播歌曲，不插入新歌曲。
- 驗證有限歌單結尾、單曲曲風循環、上一首歷史、快速連續跳歌、暫停後跨頁、拖曳後自然接播、音量、歌詞 Escape 與未登入愛心提示。桌機、手機及中英日韓控制項需渲染檢查。
- 2026-10-13 首頁不再自動啟動背景音樂；單曲由使用者按下播放，使用共用 session。切換 MV 先暫停共用音訊；改播單曲移除 MV iframe。

## 七日額度遷移

- `20260917142731_creator_upload_week.sql` 已套用；刪歌不退額度、原子計數與帳號隔離須維持。資料庫既有驗證不等於實際多連線壓測。
- 後續發布須從最新已驗證正式版建立，不能用目前較舊工作分支 HEAD 覆蓋正式站。需要重新驗收登入投稿／owner 寫入時，使用授權範圍內的真實流程。


## Credit 參與整合發布

隔離分支 `codex/participation-credit-live`，基準 `a2e156c`。2026-10-14收到具體正式遷移與部署授權，`20261014164151_credit_participation`已在單一交易成功套用；其後已發布`4bfc46f`（Vercel `dpl_4GFbsbawZCWqAgRM7qbpPaQzxQEs`），目前由同一基準的公開文案修訂`b18931a`接續。

正式遷移使用 `supabase/migrations/20261014164151_credit_participation.sql`，完整可核對來源亦保留 `supabase/credit_participation.sql`，QA 夾具與斷言位於 `tests/sql/credit-participation-*.sql`，禁止送到正式專案。新方案保留 `creator_credit_entries` 的全部歷史、delta=3／blind_compare限制、來源唯一性、RLS與grants；參與新收支寫入獨立表，由security-invoker歷史view及service-only summary RPC合併，使用單一snapshot取實際餘額／欠額及最近50筆。負淨額記欠額、未補足前禁止花點，後續收入先補欠額。

新獎勵憑證按會員／原作品／類別唯一，來源修改及流水同一交易。評論文本的正規化簽章防止重複複製；短討論不撤回另一則仍有效的獲獎評論。Heart綁定其來源日期，處理舊日反應不會撤回目前獎勵。新增before-trigger先取得與既有save_work_review相同的會員交易鎖，再進既有monthly chart hooks，避免鎖順序反轉；發點及扣點也沿同鎖。原盲聽表仍只有正收入，並行入帳最多造成保守的暫時不足，不會讓花點超支。

投稿沿用原Auth身份、確認過的Owner主信箱及168小時免費額度；免費額度使用到3後，只有明確確認60點且無欠額／餘額足夠的成功作品才扣點。穩定作品UUID讓重試讀回同件；音檔寫入結果不確定時保留素材，避免清理已成功作品。評論撤回為可恢復隱藏，不能用作者操作恢復管理員隱藏的內容。

本機以既有npm快取PGlite 0.5.8／PostgreSQL 18.3在記憶體測試；無新套件安裝、無正式資料庫QA。正式專案為PostgreSQL 17.6，真正伺服器的多連線壓測與真實Auth／Storage端到端仍須區分，不能用PGlite單backend的結果冒充。發布前需確認確切遷移／權限操作、重新核對正式基線，再套用正式遷移、部署及aipoger.com驗收；不增加APC／付款／收愛心者獎勵，不回補歷史點數，不刪資料。

正式遷移後唯讀確認8個新增trigger存在，原12筆／36點盲聽流水與兩個原CHECK保持不變，沒有參與流水回補，authenticated不能直接insert參與流水。623項本機測試0失敗／0skip、TypeScript與build通過；全量lint0錯誤、14項既有warning。尚未完成真正伺服器多連線壓測與真實Auth／Storage端到端，不宣稱通過；直接並行修改來源可能觸發可回滾死結，來源身份／作品ID應維持既有不變邊界。

## 參與流程維運

- 評論清單以原作品ID與成功更新版本重新讀取，取消前一次讀取；心情／Heart訂閱與公開留言讀取分開，修改或撤回不重設Heart。撤回評價同時發出原作品評分與Credit刷新事件；換曲或離開不誤寫後一首。
- `/api/blind-listen` 的 `prepare` 必須先驗證會員及所屬pending題，只回 prepared boolean。私有記憶體準備以會員＋題目為key、60秒TTL、最多64筆；命中不是保證（不同serverless instance或到期會正常重算），消耗一次，失敗可走原準備路徑。快取候選重新核對公開／三個月／撤下資格；另一頁的pending候選重新讀權威狀態。完成作答前不發下一題、不發點、不洩漏歌曲ID。餘額讀取350ms deadline，與新題建立並行；逾時回 balance/debt null與creditError，不以猜測餘額替代。
- 手動一般會員驗收程式為 `scripts/qa-participation-credit.mjs`，需明確 `AIPOGER_QA_RUN_ALLOWED=1`；日常npm test不執行。使用一次性測試會員和自產測試音，不能對真人作品加假票；密碼／token／service key不保存或輸出。實際Storage與多連線測試結束清理fixture並獨立查核殘留。
- 本輪沒有schema／grants／Auth設定變更。Credit仍用既有正式參與遷移，原12筆／36Credit盲聽流水保留。一般登入與Storage／RLS／API驗收不等於iOS真機或Email/OAuth投遞驗收。

- 額度parser保留一般會員在Credit啟用後的實際投稿件數，不套舊的used≤3驗證；僅接受帶正確Credit欄位的超額資料，舊／畸形quota仍拒绝。UI免費件數最高3/3；音檔及連結的60點確認條件為used≥3，音檔重讀伺服器額度後亦再次核對，不只擋第四件。
