# AIPOGER 最新文件索引

目前最新應用 `67eec4c`／`codex/public-rule-copy`（2026-10-29）：Choices混合歌單的YouTube／上傳音檔可全部播放及換曲直接開始，YouTube iframe重用，Shorts自然循環以實際曲尾進度去重接續。Suno／Spotify仍需手動播放及下一首，不宣稱含這些來源的整份歌單已全自動。Vercel `dpl_5epqX9GjDRn9aSz8PHi6uBsg7Bup` READY，已promote，apex／www同版。970項969通過／1選用略過，webpack含TypeScript通過，lint0 errors／9既有warnings；本輪沒有DB寫入。原Choice發布50點／評論10點與收藏連結修復保留。見[Choice連播report](releases/2026-10-29-choice-autoplay.md)。

唯一現行正文是以下六份；檔名固定，內容持續更新。

1. [協作入口](</Users/huangyihong/Documents/New project/agent.md>)
2. [現行產品規則](</Users/huangyihong/Documents/GitHub/aipoger-web/docs/aipoger-product-rules.md>)
3. [版面與使用流程](</Users/huangyihong/Documents/GitHub/aipoger-web/docs/aipoger-experience.md>)
4. [開發與維運](</Users/huangyihong/Documents/GitHub/aipoger-web/docs/aipoger-engineering.md>)
5. [內容與營運](</Users/huangyihong/Documents/New project/docs/aipoger-growth.md>)
6. [待辦與未完成項目](</Users/huangyihong/Documents/New project/docs/aipoger-roadmap.md>)

2026-10-26新聞按讚／討論已發布：文章底部新增會員按讚與留言，公開署名、訪客登入返回、重送去重與Owner管理已接上；見[新聞互動report](releases/2026-10-26-news-discussion.md)。

音樂新聞現有五篇原創繁中圖文（YouTube Music、Suno／Reservoir、Spotify × Believe、SBA創作者事業分類、Deezer搜尋開關）；先講重點、再詳解，使用愛波哥口語與自製圖解。首頁仍最多三篇，列表保留全部；最新文章2026-10-28發布，見[Deezer新聞report](releases/2026-10-28-deezer-ai-search-news.md)。編輯標準讀「內容與營運」；沒有新增出刊排程。

## 現況與查找順序

- 歷次發布／遷移驗證統一見[必要發布證據](releases/README.md)；本索引只保留最新部署及現行功能摘要。
- 首頁為精選 MV、三首單曲與社群評論／支持入口，`/mv` 集中既有公開影片及頻道連結，左側MV人氣榜／右側四支最新上架、下方完整清單預設最新並可切人氣；沿Explore原公式，平均評分／評分人數與收藏分開顯示，手機榜單可收合，提供搜尋／曲風／排序、原作品統一觀看／小數輸入／10評價與完整清單連播；探索音樂合併傷心酒吧小電台（音檔／YouTube混合曲風隨機連播）、左側Top50與右側四首封面，手機原頁展開榜單／連續名次／同分新歌優先／新歌7天加3及標題探索分享鍵、同作品評論，封面歌詞／分享、歌詞點外收合；目前公開單曲按三個日曆月展示，Explore另有舊歌回歸例外至台灣時間11月1日00:00，102首期滿作品已恢復／回歸綜合分5點且無刪檔排程，投稿搬到新版創作者中心，新增私人互動通知（每頁最多三則、進入可見通知區即標讀／清除紅點、新通知仍提醒、保留／刪除、未保留三個月到期、已保留持續保存）與全站數字同步，提供統計、Credit可用餘額／收支／待追回欠額及YouTube／Suno／Spotify連結自動解析及音檔投稿，預覽／試播選用，手機頂欄常駐投稿，原酒吧聊天撤下；Battle首頁改為盲聽／Q Crash／Drop三個復古器材區，匿名兩段最多30秒、每首聽滿8秒才可選與拖曳重聽、舞台狀態HUD，作答自動新題及常駐離開，上一題只揭曉選中作品的歌名／作者／封面、平手兩首，提供愛心收藏及完整版、原評論與十分制評價、已有MV的完整觀看；A／B／平手各3點；Explore Top50以每位Heart3分＋實際填寫評分總和＋盲聽支持累積總分排序，同分新歌先，再加原新歌3點或期滿回歸5點。正式Drop／Q、Showtime Choice／社群人物Top5（原歌曲月榜退出前台、歷史與Owner管理保留）、共用播放器與耳朵蟲仍保留。創作聖經改為黑底四色學習路線、先學三招、常用招式／卡關入口與完整章節收合；原資料、會員權限、搜尋／複製／試聽保留。
- 公開頁已有伺服器端正文、作品獨立頁 `/works/[id]`、原ID canonical／多語hreflang及專屬OG／Twitter圖片；動態Sitemap完整XML解析通過，公開聖經五篇FAQ導讀與四語投稿／Battle CTA已發布。會員全文仍需登入，沒有爬蟲例外。原留言與評分保留，未選曲／無歌詞不顯示空歌詞區塊。Google實際收錄仍依後續抓取，未宣稱已提交Search Console。
- 探索外部作品與MV觀看／評價整合為同一視窗：依2026-10-25後續確認，桌機與手機均還原為880px內上播下評；打字／送出／刷新不重建播放器，沿原作品ID與留言／評分API。正式原評論與評分發布前後相同，未提交正式測試評價。
- 創作者可回覆他人對自己作品的可見原評論，原評論者收到通知。每則不同評論首次回覆2 Credit，沒有每日或總額上限；同則原評論後續回覆／重試／刪重貼不重複發點，不計作品評分或人氣。MV恢復上下緊湊布局，歌曲已提供的歌詞入口保留。
- 使用者最終保留現行人氣排序，Explore榜單／歌曲卡改顯示平均分／10、評分人數及實際去重收藏人數，未評分明示、收藏讀取失敗不補零；混合分不再對外展示。可信度本機試排未採用，208件可排作品名次與原人氣分均未變。
- 專輯區、完整合輯投稿／本人作品組專輯及四語內容分類指南已發布；專輯不評分、不入單曲榜。指定24:24合輯已轉類，原留言／愛心／評分／Credit保留。評論、裁切及投稿工具按需載入；探索／MV／專輯／私人中心資料函式改在東京附近執行。
- Drop由發起者選每首60秒／90秒／整首、接戰沿用；一般投稿、Drop／Q Crash接受原支援連結或MP3最高320kbps／30MB，MV僅影片連結，前後端及Storage統一；舊大型音檔入口退役，新私人草稿無引用才清理；舊音檔與戰績保留。四語Battle玩法指南整合盲聽／Drop／Q Crash，原舞台及投票／點數保留。
- Battle盲聽／Q Crash／Drop標題旁各有分享鍵，預覽使用模式專屬器材插畫，分享連結保留語言並定位入口。
- 酒吧容量生存淘汰、Challenger 保護、Showtime 認證、Daily Spotlight 已退役；24H Full Song Battle 隱藏於前台。
- 本次Credit發布加入每日回訪15、有效評分評論10、歌曲／MV送愛心3及額外成功投稿60，保留盲聽3及舊流水；2026-10-15最新歌曲／MV規則為首次評分固定、評論一次修改、會員不得刪除、已發評論獎勵不追回／不重發，Owner權限依產品正文，Heart追回／恢復未改；APC／付款及舊案聖經2點解鎖未啟用，新增49張表情詞／對照卡自2026-10-28起每次複製8點已啟用，原5點紀錄保留，不繼承舊APC；公開指南不顯示舊歌+5或Owner免扣點，但內部行為保留；自動音訊曲風建議的前端已發布，worker 尚待啟用。創作者私人「作品表現」第一版已發布；新版聆聽比例從發布後開始累積，不能補成歷史完整數據。
- 優先讀本機六份正文，其次讀 [Google Drive 最新規格資料夾](https://drive.google.com/drive/folders/1C_mLLcpRvTNh6m6ZkWVhPN_QWVr9CrCN)；雲端是本機同步副本，發布狀態仍需工程證據。Library 可搜尋 `AIPOGER 最新文件索引`、`aipoger-product-rules.md`。
- GitHub main 停留在較舊狀態。遠端查詢須讀有發布證據的分支，不可把 main 的舊文件或 7 月簡報當最新規格；未讀正確路徑前不可直接回報「找不到」。

- 2026-10-15公開署名修復：歌曲／MV、舊歌曲、Choice與聖經留言及Choice名稱回退改讀儲存舞台名；不以登入姓名或Email覆蓋。本人指出的1則錯誤留言及其通知／receipt已修復，內容、評分與Credit保留。

## 維護

2026-10-15使用者確認以現行MD及本輪report為後續修訂基準；未有新的明確指令不得擅改已確認的規則。每次改動須記日期、差異及驗證，保留六個固定檔名與既有Drive ID。只改對應正文；待辦完成後從 roadmap 移除。發布紀錄只保存必要驗證／遷移證據，不能反向覆蓋正文。新發布後更新本索引的產品基準；文件整理日期不冒充功能發布日期。
Google Drive 使用固定檔名和既有檔案 ID 原地更新；不可每次另建 dated/final/v2 副本。同步不是自動執行，修改正文的任務需同步完成並核對讀回內容。讀回核對只保留結果，不另存整批舊MD副本；歷史發布數字只保留於必要report，避免入口重複累加。
不更改作品、歌曲音檔、資料庫、部署環境或登入設定。文件刪除不代表刪除產品歷史資料。

[必要發布證據](</Users/huangyihong/Documents/GitHub/aipoger-web/docs/releases/README.md>)

## Google Drive 固定同步目標

私人資料夾；日後以既有 ID 原地更新，勿新增副本。檔案正文中的相對路徑用於本機，雲端導覽使用此表。

| 固定檔名 | 用途 | Drive 檔案 ID |
|---|---|---|
| [agent.md](https://drive.google.com/file/d/1b1ZoPVZ1kYc3gl8tfai1JFqU-GW3HQIS/view?usp=drivesdk) | 協作入口 | `1b1ZoPVZ1kYc3gl8tfai1JFqU-GW3HQIS` |
| [aipoger-product-rules.md](https://drive.google.com/file/d/12x5R2LKcM5FsUnbH-7Y9CvW_eCsMZHi_/view?usp=drivesdk) | 現行產品規則 | `12x5R2LKcM5FsUnbH-7Y9CvW_eCsMZHi_` |
| [aipoger-experience.md](https://drive.google.com/file/d/1I59ue5EHqD53bNHEPsnpez-Zer2hQ0dP/view?usp=drivesdk) | 版面與使用流程 | `1I59ue5EHqD53bNHEPsnpez-Zer2hQ0dP` |
| [aipoger-engineering.md](https://drive.google.com/file/d/1_Ox29pcftVwJ5x_M-_RAvM1iCRGezvPy/view?usp=drivesdk) | 開發與維運 | `1_Ox29pcftVwJ5x_M-_RAvM1iCRGezvPy` |
| [aipoger-growth.md](https://drive.google.com/file/d/1Q-taa0s8_UKtQwun3VujI-vqpdIsgx0-/view?usp=drivesdk) | 內容與營運 | `1Q-taa0s8_UKtQwun3VujI-vqpdIsgx0-` |
| [aipoger-roadmap.md](https://drive.google.com/file/d/1i2J3rehyYFdQCCvTJZZVFPw_yhcxar_d/view?usp=drivesdk) | 待辦與未完成項目 | `1i2J3rehyYFdQCCvTJZZVFPw_yhcxar_d` |

雲端固定入口：[00-AIPOGER-最新文件索引.md](https://drive.google.com/file/d/1tBZJ3jW2WJbeIpGWrHSo6eF4lOtALaHs/view?usp=drivesdk)。索引 ID：`1tBZJ3jW2WJbeIpGWrHSo6eF4lOtALaHs`。六份現行正文與雲端索引持續原地更新；GitHub 網站正文以 `codex/public-rule-copy` 為發布來源，私人協作／營運／待辦以本機及 Drive 為準。
