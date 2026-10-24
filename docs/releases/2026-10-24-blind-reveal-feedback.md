# 盲聽揭曉評論／評分與完整MV驗收

- 2026-10-24（Asia/Taipei）使用者要求利用揭曉作品旁的空間顯示評論／署名、邀請評論與評分，並為已有MV的作品增加完整觀看入口。
- 應用：`02180e17dba83a7c3b7b60a745b396674373838b`，分支 `codex/public-rule-copy`。
- Vercel：`dpl_EzKLEtKFcpqUWUYMv7JgavE38jyj`，READY，aipoger.com／www均綁定同一應用SHA。
- 前一正式應用 `98b7274`／`dpl_Eh7nMAM14soP4pnq8ZuH292kw9iY`；本輪沒有DB遷移或需要逆轉的資料修改。

## 實作

- 單選只掛載選中作品的評論預覽；平手每首分別顯示。桌機同列左側封面／作者／操作、右側評論；手機上下排列。既有匿名新題／選中才揭曉邊界不變。
- 使用原 `/api/listen-bar/track-comments` 讀取同一作品ID，顯示最近兩則可見評論及原公開署名。空狀態邀請第一則評論；讀取失敗獨立提示重試，不能假稱沒有評論。換作品／帳號時中止或忽略過期回應。
- 「評論與評分」於原頁開啟既有 `HomeWorkFeedback`／`MvRatingForm`，沿原歌曲評價API、完整評論清單、真實平均與人數、十分快填／一位小數輸入。分數初始留白；同作品已有評分仍讀原分並鎖定，一次文字修改、收據重試、公開舞台名及Credit規則全部沿用。
- 共用視窗新增選用 `reviewSurface`；盲聽歌曲評價使用 music 文案／路徑，即使該歌附有MV亦然。其他入口預設仍依MV資格選原surface。觀看MV用既有MV評價路徑，歌曲／MV共用同一原ID與評分紀錄。
- 正式揭曉回應只為已選中且仍公開的作品加入由原 `youtube_url` 經 `homeYouTubeId` 驗證的 `videoId`。沒有MV、不合法URL、未選中或不可用的作品不產生MV入口。新題／私有預備回應仍無影片身分。
- 「看完整MV」只在點擊後載入既有官方YouTube播放器。單純讀評論不載入iframe；評論視窗與MV按需載入。開窗先暫停A／B與共用音樂播放器，保留下一題已聽進度；關閉／Esc回原控制，重播盲聽仍沿原8秒計時。
- 評論儲存後刷新同一揭曉預覽；沒有自動評分、送心、額外票權或資料複製。無schema／RLS／grants／Auth／Storage設定變更。

## 驗證

- 全套750項：717通過、33既有選用DB測試略過、0失敗。TypeScript及webpack正式build通過；lint0 errors／14既有warnings。
- 新增／擴充測試覆蓋評論預覽與公開署名、空／失敗／重試、換作品舊回應隔離、原作品ID、評論刷新、歌曲surface與MVsurface、已選MV才揭曉、非法URL及未選MV不得替補、開窗暫停且保存盲聽進度。既有評論鎖分、一次修改、署名與去重測試均保留通過。
- 本機瀏覽器使用實際盲聽元件、評價表單與共用視窗；Auth與API為隔離fixture，不向正式站新增測試評論、分數、Heart、投票或Credit。
- 實際填寫8.75時阻擋送出，改8.7加35字評論後儲存，原分鎖定且顯示剩餘一次文字修改。關窗後預覽顯示新增的測試署名／文字；再開MV讀到同一8.7分與原評論。
- MV測試使用公開測試影片 `aqz-KE-bpKQ`，實際官方iframe播放；原頁及純評論視窗iframe均0，點擊MV才有iframe，A／B都暫停。此影片僅存在於本機fixture，不改寫任何正式作品的MV。
- 1440px桌機及320px中英日韓：單選／平手評論區與評價視窗無橫向溢出，揭曉控制至少44px。四語評價初始分數皆空白。非iOS真機驗收。
- 本機fixture頁與音訊已移除；開發server停止、產生的dev型別清除、viewport還原及測試分頁關閉；沒有提交或部署測試入口。
- 私人證據：`/Users/huangyihong/Documents/New project/audits/2026-10-24-blind-feedback/`。`desktop-comments-fixture.png`、`review-saved-fixture.png`與手機截圖均為明確的測試資料畫面。

## 正式站

- Vercel正式Ready；aipoger.com與www均核對為`02180e1`／`dpl_EzKLEtKFcpqUWUYMv7JgavE38jyj`。
- 正式Battle「這裡怎麼玩？」已讀到評論／評分與完整MV新說明，console errors為空。
- 使用者截圖原作品`b038db55-772d-40e6-8286-dc59a0b93c1d`仍有原1則評論／0筆評分，音檔存在，沒有附YouTube MV連結；所以此作品不顯示MV鍵。只讀查核原公開資料，沒有測試寫入。
- 路由與未登入權限檢查見`production-health.json`；本機完整互動驗收與正式只讀驗收分開記錄。

- 五個既有Drive ID的產品／體驗／工程／索引／私人協作正文已原地同步，讀回與本機文字逐字一致；沒有建立新副本。
