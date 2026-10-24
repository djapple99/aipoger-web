# 對戰連結投稿、三種播放長度與玩法指南

2026-10-25 Asia/Taipei。使用者明確確認：Drop Battle由發起者選每首60秒、90秒或整首，接戰沿用；Drop／Q Crash改連結投稿，保留戰場視覺、舊音檔與戰績；三模式指南更新，測試後直接部署。

## 發布

- 應用`e2668b5`（功能`cb9236a`、配對修正`c992d1d`）／`codex/public-rule-copy`已push。
- Vercel `dpl_3n6KoUdpV4SjRfpTZiPZzjLMMx43` READY；先以production skip-domain建置並驗證，再promote同一build，aipoger.com／www均綁定。
- 最終正式部署為`https://aipoger-web-rnz8-n4phnluye-yohungs-projects.vercel.app`。

## 行為與資料邊界

- 新Drop預設60秒，另選90秒／整首；秒數為每首。片段各自選起點，完整模式各用原長度。目標模式／曲風由API重新讀取，SQL鎖定與配對過濾，不能在建場後改來源、時長或片段。發起者只發布卡片，不偷偷配另一位發起者；接戰才進配對。
- 新Drop／Q Crash接受公開Suno、YouTube或本人Aipoger公開單曲深層連結。伺服器解析並簽署來源，優先讀公開metadata；正式雲端YouTube頁缺少時長時，改由可見官方播放器讀取，API只對已驗證YouTube缺時長的來源接受有限正值，標記embedded_player。實際播放再核對官方長度，差異超過2秒停止／顯示錯誤；不是伺服器獨立驗證時長的證明。已取得伺服器長度時忽略client覆寫，來源／帳號與接戰模式仍由API鎖定。本人作品需再查公開資格及單曲分類，不複製原音檔。
- 兩種新投稿不再接收影音檔案；舊upload-hook及signed-url POST回410。封面圖片可另上傳（10MB內），原作品／Profile封面回退保留；這不代表封面不再占儲存。Suno沿既有串流，不新增轉存；仍可能有播放流量費。
- Q Crash保留整首、邀請、本人兩版本、可暫停快轉、2小時預設與自訂30分鐘至3天、密封投票／評論及五軸回饋；日韓沿原英文回退。新模式不改投票資格、3位不同非參賽觀眾門檻、勝負、點數或盲聽計分。
- 原雙唱盤與Q雙作品卡設計保留；YouTube接可見官方播放器。片段相對時間、A/B互停、原暫停限制、跨端共享時鐘、晚到進度、失效判斷及背景結算均使用快照長度。整首場次不被舊45秒計時提早結算；SQL也阻擋新場次提前finish。瀏覽器自動播放阻擋仍須點擊開聲，晚到者依原共享時鐘續播。
- 正式成果卡與對戰記錄接上新來源重播；只有已完成的正式封存紀錄才提供新媒體端點。私人既有音檔在讀取時簽發短效URL；DB快照保存原path。
- 新建API採非匿名會員驗證、權利確認、服務專用RPC、同request去重與同角色交易鎖；本人第二版本仍限制同一Q邀請僅一個有效加入。舊短片段接戰保留原45秒機制與不足原長，不重算歷史資料。
- `/drop-guide`改四語SSR三模式指南：盲聽、Drop、Q Crash及連結／權利說明；補四語canonical／hreflang／Sitemap，沿既有黑底Header與舞台，移除過時酒吧／Discord導流。

## 資料庫

- 本機新增`20261024202323_battle_link_modes.sql`，正式ledger `20261024211426`／`battle_link_modes`，已套用及讀回。
- 僅加佇列模式、區段／來源快照與索引，battle快照，service-only新建RPC，來源鎖定／配對與完成時間guard；舊資料預設legacy，不改原音檔或投票。沿原attempt_matchmaking的既有auth/definer邊界增模式及有效期篩選，沒有新增definer API。
- 新RPC：anon／authenticated不可直接execute，service_role可執行。原封存、結算、歌曲戰績及Credit summary函式hash前後相同。
- 正式service_role下交易建立90秒卡、request重試、錯模式拒絕、接戰配對及提前finish／來源改寫拒絕全部通過，整筆ROLLBACK。
- 更新前後165佇列音檔／狀態hash、55場對戰狀態／winner hash及8份完整封存hash完全一致；battle-audio仍private，沒有正式測試場次、通知或音檔保留。安全advisor沒有新增WARN。

## 驗收

- 全套805項：774通過、31既有選用DB略過、0失敗。PGlite執行真實SQL：同角色限制、本人Q第二版本、mode／source鎖定、60／90／full、整首不同長度、舊音檔保留、service grant、Auth表不可讀及同request重試。
- API實際程式測試：伺服器綁定actor／來源／長度、接戰覆蓋偽造模式、YouTube缺時長回退／非法長度拒絕／不覆寫已知時長、權利／匿名／失效來源／外人封面拒絕、公開目標資訊、完成且3人後的新重播媒體資格。
- TypeScript、webpack正式build及雲端build通過；lint 0 errors／9既有warnings。
- 隔離真實YouTube：90秒從60秒起，至149.976秒停止並轉A；A/B不重疊。表單改歌詞保留同iframe且繼續播放。Q Crash由A切B，A停11.924秒、B持續92.878秒，輸入評論不重建播放器，沒有送出票。
- 四語320px指南與Drop接戰表單無水平溢出；90秒目標的三個選項均disabled、90被選中。Q原卡片320px通過。手機為瀏覽器尺寸，非iOS真機。
- 正式四語指南、Drop／Q投稿入口及MV HTTP200；指南初始HTML有實際三模式與四語hreflang。受保護候選以vercel curl既有登入驗證，沒有更改Deployment Protection；缺目標409、匿名投稿401。
- 正式登入唯讀試聽：Suno讀到206.12秒並播放，輸入歌詞後仍播放6.52秒；YouTube經官方播放器讀到長度並播放，輸入歌詞前後同widget2、8.08→8.36秒持續播放，後續至26秒仍正常。未勾選權利或送出正式投稿／投票。缺時長的YouTube由使用者啟用官方播放器；初次iframe未ready時自動重建一次，已ready／正在播放的iframe不重建。
- 正式9個入口HTTP200，四語Guide初始HTML有正文／hreflang；最終build runtime error／fatal查詢無紀錄。Chrome最後試聽無來源錯誤，測試分頁已關閉並停止播放，保留正式指南分頁供檢視。
- 私人截圖與隔離fixture只在`/Users/huangyihong/Documents/New project/audits/2026-10-25-battle-link-modes/`；臨時QA route已刪除且正式build route表無QA，未加入部署。
