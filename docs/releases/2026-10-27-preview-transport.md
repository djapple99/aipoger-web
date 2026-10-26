# 2026-10-27 錄音室試聽播放與暫停

使用者指出錄音室試聽播放控制不清楚，要求播放器必須能播放及暫停。原卡片每次只會重新start，底欄則僅有圖示切換；本輪同時修正兩個入口。

- 應用commit `0968840`，GitHub `codex/public-rule-copy`已推送。
- Vercel `dpl_GjpSN29pChZKdKvLee5YHAsF9Fd8` READY，先prod --skip-domain驗收，再promote同一build；正式apex返回相同部署ID。
- [正式錄音室示例](https://aipoger.com/ai-music-bible?lang=zh#bible-move-studio-mastering-classic-disco)；完整教材仍需會員登入。
- 待驗收網址 `https://aipoger-web-rnz8-nxjshjkdb-yohungs-projects.vercel.app`；回滾目標 `dpl_5jeEBqwSBfHouaKaL7nZnxL4VQxy`（`e83af71`）。

## 行為

共用原生音訊底欄同時顯示有文字、圖示的播放與暫停，兩顆均至少44px，四語對應；手機曲目資訊、操作、進度及音量重新對齊。播放為冪等續播，暫停保留音源與進度；以request序號取消未完成native play準備，避免暫停或關閉後又自行重啟。

教材卡片使用同一播放器與曲目ID：本曲播放中顯示暫停試聽，暫停後顯示繼續試聽，其他曲目仍15秒試聽。續播不重載音檔或重新建立佇列，切另一首保留原切換流程。按本曲狀態作store選取，進度更新不觸發所有教材重繪。100支素材、音檔順序、前後首／音量、YouTube原流程及會員全文限制不變；無DB／Auth／評分／Credit修改。

## 驗證

- 15項定向通過：四語獨立控制、原進度續播、重複按播放冪等、異步暫停／關閉取消、失敗保留／重試、卡片狀態、跨音訊／YouTube舊流程及原100支資產。
- 全套894項：862通過／32選用略過／0失敗。tsc、本機webpack、Vercel雲端build通過，ESLint0 errors／9既有img warnings；無新增應用依賴。
- 本機隔離fixture使用真實GlobalMusicPlayer、StudioAudioPreviewButton及原公開15秒MP3，僅模擬Auth／Analytics，不載入會員全文。桌機暫停在6.904092秒後保持，續播立即為7.192331；另一次同檔續播由0.057024→10.646129秒後再次暫停。320px四語按鍵44px、無水平溢出。
- 待驗收會員API未登入401；Classic Disco MP3 200／241206 bytes且SHA-256與原檔相同。
- 正式Chrome實際已登入會員：原教材卡播放後可由底欄暫停，卡片同步繼續試聽。暫停維持0.165220秒，續播再暫停為0.352617秒，原Classic Disco音源未換；正式320px兩鍵均44px、頁面無水平溢出。
- 正式11項HTTP通過：聖經四語、首頁／探索／MV／新聞、會員全文API401，以及兩支MP3原檔hash；前版首頁／新聞一大兩小結構保留。未在正式站提交評分、留言或獎勵。
- 證據：`/Users/huangyihong/Documents/New project/audits/2026-10-27-preview-transport/`，包含測試、實際音訊／排版、會員畫面、播放條裁切圖、HTTP及部署識別；runtime日誌另存。會員全文截圖只保留本機證據，不上傳到公開程式庫。

對應現行正文與索引共5份變更檔已使用既有Drive ID原地同步，營運與roadmap保持原內容；六份正文與索引共7份讀回逐位元組及SHA-256相同（drive-verification.json）。發布查核時runtime error／fatal為0筆。
