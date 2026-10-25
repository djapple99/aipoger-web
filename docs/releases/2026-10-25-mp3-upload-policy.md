# MP3／連結投稿統一發布驗收

確認與發布：2026-10-25（Asia/Taipei）。使用者已明確授權前後端、Storage限制、舊入口處理、測試後直接部署及更新現行文件。

## 正式版本

- 應用：`0c146c7`，`codex/public-rule-copy`，已push。
- Vercel：`dpl_5Xn2RHQTVXb9NoDiGUjuhAFu6kEF`，READY；`aipoger.com`與`www.aipoger.com`已指向同一版。
- 本機migration `20261025063109_verified_mp3_submissions.sql`；正式ledger `20261025073854`，已套用。
- 本機補強 `20261025074556_protect_legacy_mp3_references.sql`；正式ledger `20261025074717`，已套用，保護舊官方關卡／完整音源路徑引用。這份SQL／驗收／文件隨後提交，無額外應用程式修改。

## 最終行為

一般投稿、Drop Battle及Q Crash接受原支援連結或MP3，最高320 kbps、單檔30MB（31,457,280 bytes）。MV仍只接受YouTube影片連結，不收實體影片。一般入口原YouTube／Suno／Spotify範圍保留；對戰僅原Suno／YouTube／本人公開單曲，不擴大任意URL或Spotify資格。

前端與伺服器共用實際MP3 frame檢查，驗證檔名、大小、SHA-256、MPEG Layer III及全檔frame最高碼率，VBR按最高frame計算。改名WAV、AIFF、MP4，空白／截斷與非標準free-format不能通過。舊作品不重編碼或搬檔。

音檔直接傳入私人`pending-audio`，伺服器下載驗證後保存一份至私人`verified-audio`；不經Vercel表單大檔body，也不產生WAV剪輯副本。同會員同SHA-256重用，不另占第二份空間；上傳回應遺失可取回同一草稿。`/api/audio-assets/[id]`只有經公開作品、已確認參戰或啟用官方模板引用時才簽發讀取，未發布草稿404。私人創作者中心仍可播放自己的原作品及隱藏作品。

兩個新bucket及原audio bucket皆上限30MB。原`listen-bar-audio`只保留MP3新寫入格式；原`battle-audio`保留封面圖片MIME。authenticated直接音訊INSERT／UPDATE受到restrictive policy阻擋，不能繞過驗證；既有讀取權限不變。

舊`upload-hook`及`signed-url`、24H新建API、後台舊音訊簽發入口均退役410。`/battle/setup?mode=daily`返回Battle首頁，原24H房間、舊音檔、投票及戰績仍保留。官方守門模板的新音檔同樣只收60秒內MP3320／30，不再在瀏覽器製造大WAV；原模板與封面保留。

新的私人未使用草稿逾24小時可由每小時45分清理排程回收；取消也只清本人未被引用草稿。新作品／queue／官方模板以FK保護，舊queue的audio_path及full_audio_path引用另行保護。此排程不掃除原音檔。原一般投稿額度、Credit、60／90／整首模式、接戰規則、評分與排行公式均保留。

## 驗證

- 完整830項：799通過、31項既有選用DB測試略過、0失敗。啟用新PGlite migration測試，實測所有權、Storage RLS、legacy WAV／AIFF保留、FK、已引用草稿不刪除及真正RPC建卡／配對／Q播放快照。
- Q Crash實際route runtime：新MP3 audio_path為NULL仍可建卡、加入作品B；外人或驗證失效音源422，未建立場次。SQL實際RPC驗證60／90／整首與Q不同完整長度，均在隔離資料庫完成。
- 補強legacy路徑保護後再跑該Postgres測試1項通過；最末client錯誤分類調整後9項表單／API runtime通過。
- TypeScript、本機webpack及雲端正式build通過，lint0 errors／9既有img warnings，git diff --check通過。
- 本機瀏覽器使用真實元件、解析器、API實作與測試專用Auth／Storage／DB：75秒320kbps及VBR音檔可播，75秒來源選90秒正確阻擋，偽裝WAV與超過30MB拒絕；Drop四語320px無橫向溢出。這部分不是正式DB寫入，也不是iOS真機。
- 正式Chrome實際上傳自製75秒320kbps測試音訊，伺服器確認3,003,080 bytes、75.075918秒、320kbps，verified只有1份、pending為0。Drop播放中填字前後time25.5625→25.616504、paused均false。Q Crash同檔同asset／同1份物件，完整75秒可播放。
- 正式未發布草稿404。切回連結取消測試後，該測試asset及新bucket測試物件均0，queue仍165、battle仍55；未送正式作品、對戰、評論、評分或Heart。
- 正式15項HTTP驗收通過，包括首頁／Auth／Explore／MV／Drop／Q／指南／分析入口200，未登入上傳及Cron401，舊API410、草稿404及daily導回Battle。
- Security advisor無新增WARN；新私人service-only table的「RLS enabled no policy」是預期INFO。既有14項函式與1項Auth警示保留。正式應用error／fatal runtime logs查無新紀錄。

## 原資料保留對帳

遷移前後384件作品、165筆queue、55場battle、8份archive、829個原音訊bucket物件數量及完整內容hash均相同。期間站上正常新增的作品在本次遷移前已納入新基準，不以較早383件快照覆蓋使用者資料。

| 範圍 | 前後相同MD5 |
|---|---|
| 作品（排除新增空白FK欄） | dcf6c9ada7dc42ef75a3406100123edb |
| Queue（排除新增空白FK欄） | e218dd412f80447d3b6244d4ae862fc1 |
| Battles | 425729dcf62f72a595f4ff9f5e5fbbfd |
| Archives | ff60e7e8bb85ff3d74bb087ec7fa4a74 |
| 原Storage物件 | 8e4cec2f022a1a9bf1ecef3abe64ae53 |
| 原封存／結算／Credit／投票／戰績／配對函式 | 1a23f8b4c298ceee058824e0892577cb |

本機私有QA證據：`/Users/huangyihong/Documents/New project/audits/2026-10-25-mp3/`，含prod-data-proof.json、prod-http.json、prod-playback-proof.json、正式Drop／Q截圖、四語320px與本機測試證據。沒有保存登入token或私人原信。原圖片／臨時QA harness不進Git部署。

## 現行文件

產品規則、體驗、工程、索引及私人agent.md原地更新；Drive沿既有五個ID同步、讀回核對，不建立第二套規格。應用發布SHA與後續文件／資料庫補強commit分開記錄。
