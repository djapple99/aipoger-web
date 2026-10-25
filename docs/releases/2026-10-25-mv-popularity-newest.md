# MV 人氣榜與最新上架 — 2026-10-25

使用者選定第一張雙欄設計，要求與探索音樂構圖一致，解決新MV被有評分作品壓到後面的問題。應用 `ea9ea8a`，分支 `codex/public-rule-copy`；正式部署 `dpl_DmFRys9uJtntpWB4cQn7qUd2ixem`，來源 `aipoger-web-rnz8-a1er5auna-yohungs-projects.vercel.app`，READY並已綁定 `aipoger.com`／`www.aipoger.com`。

## 結果

- 桌機左側MV人氣榜、右側四支最新上架（2×2真實16:9封面）、下方完整清單。手機榜單預設收合，可原頁展開；沒有新增浮層或第二個播放器。
- 新作按原投稿時間由新到舊，未評分也保有最新曝光；完整清單預設最新，可切人氣、搜尋、曲風篩選、逐次12件及查看全部。評分、Heart及刷新不改原投稿日期。NEW沿既有7天判定。
- 榜單使用Explore既有 `rankMusicPool` 及相同資格／Heart去重／評分總和／盲聽／新歌與回歸加成，只取有效MV單曲；榜單最多50名。人氣資料包含全部合資格排序，完整清單接上其他公開歷史MV。沒有新增第二套評分或改變首頁週精選。
- 評分／10、評分人數、去重收藏人數分開顯示；未評分與收藏無法讀取有真實狀態，不捏造分數。人氣讀取失敗保留新作與完整清單，人氣切換停用並回最新；不影響觀看。
- 原作品ID、影片播放器、留言／回覆／評分／Heart、登入返回、分享與完整清單連播沿用。新增讀取與彙總，沒有DB migration、資料寫入、Auth／RLS／Credit規則變更。

## 驗證

- 全套811項：780通過、31既有選用DB測試略過、0失敗。新增後端實際函式測試覆蓋Explore排序、去重／作者／時間／專輯／過期排除、收藏去重、讀取故障降級及無寫入；UI回歸涵蓋新作曝光、人氣切換、排序故障後回最新、搜尋、完整分頁、原ID深連結、連播與送評價時延後END。
- TypeScript無錯誤；lint 0 errors／9既有warnings；本機webpack與Vercel雲端build成功。已移除暫時QA route及fixture import，最終部署沒有視覺測試入口。TypeScript第一次讀到已刪除QA route的舊generated types，清除該產物後通過，沒有修改tsconfig掩蓋錯誤。
- 本機視覺以公開API快照呈現，因Vercel敏感環境值不可下載；沒有將其當作本機DB成功。staged正式環境另讀真實API：92件公開MV全數保留，58件人氣排序與原Explore資料按同規則重算完全一致；原評分／總分／人數及收藏數一致。公開API不增加支持者或收藏者ID。
- 同一READY版本promote後，正式API與staged作品／排行一致。指定RUNRUNRUN原公開評論JSON發布前後相同；正式仍顯示9.1分／1人。未送出正式測試評論、評分或Heart。
- 正式1440px桌機構圖確認；320×800瀏覽器視窗中英日韓內容寬與scroll寬均305px（扣除捲軸），無水平溢出，榜單預設收合且展開正常，新MV封面首屏可見。這是瀏覽器視窗驗證，非實體iOS裝置測試。
- 真實YouTube RUNRUNRUN播放器已播放至22.326秒、paused=false、duration=202.101；原9.1評價及評論正常。原播放器／輸入不中斷的回歸沿既有測試保留；此次不改播放元件。
- `/`、`/auth`、`/listen-bar`、`/music-analysis`、`/battle/setup?lang=zh`及四語`/mv`共9入口200；MV初始HTML有真實作品／人氣榜／最新區、canonical及hreflang。正式瀏覽器console無error／warn；查核部署近15分鐘無error／fatal runtime log。
- 視覺對照與最終結果見根目錄 `design-qa.md`。私人實際畫面／API證據在 `New project/audits/2026-10-25-mv-popularity/`，不提交用戶資料或測試素材到Git。

## 現行文件

產品規則、體驗、工程與索引以目前實作更新；私人agent入口及既有Drive ID同步原地更新。歷史MV評分優先report僅保留查核用途，現行預設為最新上架。作品補上MV仍沿原投稿時間，未新增獨立影片發布日期欄位。
