# Showtime 同頁策展版面發布

更新：2026-09-18 00:51 Asia/Taipei。

## 發布

- 應用提交：`6343ea0`，分支 `codex/showtime-editorial`，已 push。
- 正式站：<https://aipoger.com/rank?lang=zh>。
- Vercel：`dpl_6q3DgSbgTmGzirmtyxdm4P5dH8RE`，Ready，已 promote；部署 URL：<https://aipoger-web-rnz8-4npz9xlw3-yohungs-projects.vercel.app>。
- 本批沒有 DB migration、歌曲搬移、刪除、認證、投票或收藏資料改寫。主推設定未預先指定，正式讀取 `featuredKey: null`，不假裝已有人為主推。

## 實作

- Choice 與月榜同頁，不再分頁籤。桌機約 70/30；手機依序為首張 Choice、月榜摘要、更多 Choice。
- 沿用真實歌單封面，大小建立層級；不增加廣告占位、假 Top 10 或 New Releases 區。保留一次製作入口、播放、收藏、分享、評論及歌單 HUD。
- 月榜先呈現最多五筆真實歌曲，可展開完整榜；月份、類型與搜尋收進篩選。非總榜／搜尋狀態收合後仍顯示篩選條件。計分、三位支持門檻與同分順位不變。
- `/admin/choice` 可指定或取消一份已發布的官方／創作者歌單主推。私有 `listen-bar-data/choice/featured.json` 僅 owner API 可寫，驗證公開可播內容。原設定撤下、刪除或不可播放時不展示主推；超過公開常規讀取上限的舊主推仍會單獨讀取並驗證。
- HUD 改以 key 解析最新歌單資料，避免持有舊 items；歌單移除時關閉。舊 QA 文本逐位元保存在 `2026-09-18-design-qa-history.md`。

## 驗證

- 417 項測試通過，0 失敗、0 略過；包含隔離 PGlite。TypeScript、production build、Vercel cloud build 通過。Lint 0 error，16 個既有 warning。
- 新測試實際執行 owner API 與儲存 helper：401／403、格式驗證、草稿／刪除／不可播拒絕、取消、儲存失敗，以及超過 48／80 筆的主推。另測同頁 DOM 順序、未指定／不可播的誠實狀態、HUD 更新／移除、五筆摘要／完整佇列。
- 正式站 1440x900、390x844，中英日韓八個畫面：無橫向溢位、0 tabs、1 個製作入口、2 份真實 Choice、5 筆月榜摘要；可見封面完成載入，無 pageerror。
- 正式站展開月榜 27 首；十首歌 HUD 正常。Choice Play All 與月榜播放都驗證 audio 非暫停、currentTime > 0.3、readyState 4；完成後已暫停。訪客收藏提示登入，console error 0，未產生真實收藏或主推寫入。
- 本機類型篩選讀正式公開 API：台語熊high 4 首。月榜規則 dialog 開關與完整榜收合正常。
- 正式 `/`、`/rank`、`/auth`、`/listen-bar`、`/ai-music`、`/battle/setup` 皆 200；兩種公開 Choice API 與月榜 API 200，未登入 owner API 401。探索與酒吧各 196 首。
- `#choice-weekly` 實際開啟；公開分享路徑及原生月榜錨點保留。內嵌瀏覽器也確認正式新頁並留作檢視。
- 圖像證據留在忽略的 `output/playwright/production-editorial-{zh,en,ja,ko}-{1440,390}.png`、`production-editorial-mobile-hud.png`、`showtime-editorial-production-final.png`。前後視覺比較與限制見根目錄 `design-qa.md`。

## 工作區與限制

- 使用乾淨 release worktree 發布；原 repo 本批 21 個檔案先與 `e32ef6d` 比對，確認無衝突後同步，內容一致。發布文件隨後同步；原工作區分支、index 與其他既有未提交變更保留，不整包提交。
- 未使用真實登入帳號測試主推儲存；以實際 route 的隔離測試驗證權限／持久化，後台仍由 owner 操作。沒有 iOS 真機驗證。
- 既有 Choice 評論網路拒絕解鎖及日韓文案待修，未在本次擴寫評論系統。主推讀取失敗降級為正常歌單展示，不隱藏公開音樂。
- 本機預覽轉接曾阻擋 dev hydration，改直接 dev URL 加測試瀏覽器唯讀資料攔截；正式驗證全部移除攔截，使用真實 API。無 service key 的本機 analytics 500 是環境限制，非正式站錯誤。

## 回復

若需回復應用版面，可 promote 前一版 `https://aipoger-web-rnz8-lutvn4847-yohungs-projects.vercel.app`。本批無 DB 結構變更，不需回復歌曲／票數／收藏；舊版會忽略新增的主推設定。未執行回復。
