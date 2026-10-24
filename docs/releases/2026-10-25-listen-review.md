# 播放、評論與評分同窗

2026-10-25正式發布。Vercel READY，aipoger.com及www皆綁定本次SHA。

- 應用提交：`d744ac333a8638b523ad351e910305e6399a7206`；分支`codex/public-rule-copy`。
- Vercel部署：`dpl_5g3YnGwCYCeUr3pH94MofS5HrJjs`，正式目標。
- Explore外部作品的播放／評論改用同一HomeWorkFeedback視窗，桌機左播右評、手機上播下評；MV觀看視窗共用相同版式。YouTube、Suno與Spotify沿原官方播放器，不抽取音訊。
- 媒體元件與原作品ID穩定保留；評分、留言及曲庫刷新不重新建立播放器。評論區獨立捲動，手機visualViewport調整只寫CSS尺寸，不改React播放器狀態。關閉／切換作品依原路徑處理。
- 原評論／評分API與資料、首次鎖分／文字修改、Credit、人氣公式均未修改；沒有DB migration。本機真實送出流程只寫隔離proxy記憶體，未向正式作品提交測試評論／評分／Heart。
- 本機760測試：727通過、33既有選用DB略過、0失敗；TypeScript、webpack正式建置通過，lint0 errors／14既有warnings。
- 實際YouTube影片在輸入中觀察至32秒，送出後54秒且同一iframe `widget2`，原測試評論和新留言並存。390×500模擬縮小可視高度後，播放器仍同一實例、textarea內容保留。這是瀏覽器尺寸／visualViewport驗收，非iOS真機鍵盤驗收。
- 四語桌機1440px為左右排版、四語手機320px為上下排版，無視窗水平溢出。另有390px與縮小可視高度驗收。
- 私人本機證據：`/Users/huangyihong/Documents/New project/audits/2026-10-25-listen-review/`；含公開曲庫快照、隔離送出紀錄、播放前後截圖、四語位置與尺寸JSON。隔離前端使用測試公開設定與假登入，正式部署由Git提交在Vercel正式環境建置，沒有上傳本機環境檔或fixtures。

## 正式驗收

- 首頁、Explore、MV、Auth、Battle setup及原作品評論／評分API全部HTTP200。
- 指定STILLINK作品公開評論與評分API發布前後逐份比對完全相同。正式Chrome登入狀態原9.1分及文字仍在，沒有修改／送出正式測試評價。
- 正式1440px左右排版、390px上下排版及四語320px無水平溢出；Explore與MV觀看入口都核對新排版。正式YouTube可播放，390px變更後同一iframe仍保留；console errors空。
- 正式畫面證據：`production-public-desktop.png`、`production-public-mobile.png`；API對帳`production-http-qa.json`、四語手機`production-mobile-four-language-qa.json`。登入後的既有本人評價另以Chrome DOM核對；隔離fixture負責實際寫入驗收。

五份本輪修改的固定文件／索引已同步既有Drive ID並讀回核對；沒有新增雲端副本。
