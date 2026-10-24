# 盲聽選中才揭曉驗收

- 使用者確認：2026-10-24（Asia/Taipei）。投票前連歌名都隱藏；選 A／B 只揭曉選中作品，平手才揭曉兩首。沿用前一輪討論確認的愛心收藏／聽完整版與自動接題。
- 應用 commit：`98b727471ecc05a84a04941d5878a6d7d6f596fd`，發布分支 `codex/public-rule-copy`。
- 正式 deployment：`dpl_Eh7nMAM14soP4pnq8ZuH292kw9iY`；READY，aipoger.com／www 均核對為同一應用 SHA。
- 前一已驗證應用：`317331c`／`dpl_HDBZnYxRjh7mrZiJyvfyyqzbQgBZ`，可回復應用；本輪沒有資料庫遷移。

## 變更與邊界

- 匿名新題仍只有 question ID、到期時間、已聽秒數及 A／B 匿名音訊 ticket；不含原作品 ID、曲名、作者、封面與原始媒體路徑。模式分享仍是器材插畫，沒有題目身分。
- 原有 `reveal` 入口會在投票後讀回雙方；本輪改成按伺服器已儲存的 `choice` 決定選中側。A 只讀 A、B 只讀 B、tie 才讀雙方；重試及客戶端送入的另一個選擇不能改變揭曉。未投票／別人的題目不能揭曉。
- 揭曉沿同一作品 ID 使用原公開作品署名，不讀 OAuth 姓名或 Email。重新套用原盲聽公開資格與表面退役條件；選中作品不可用時只顯示不可用，不回退到另一首身分。
- 投票完成後，揭曉、下一題及 Credit 刷新並行。揭曉失敗回傳獨立錯誤狀態，前台只重試 `reveal`；不回滾成功偏好／收入，不要求再投票。下一題失敗同樣保留成功結果。
- 舞台下方保留上一題小卡至下一次有效作答；單選一張、平手兩張，可各自明確按 Heart 或聽完整版。Heart 沿既有每日切換／收藏／Credit 路徑，沒有自動按心或新作者追蹤系統。
- 完整版使用共用播放器、原音檔與原作品 ID；先暫停盲聽並保存本題聆聽進度，完整版不供應盲聽秒數。再播 A／B 會關閉共用播放器。歌名可依當前語言定位原探索作品。
- 揭曉元件使用 dynamic import，封面 lazy／async decoding，缺封面有圖示回退。中英日韓說明同步更新 Battle「這裡怎麼玩？」。
- 每側 8 秒、第 15–45 秒片段、每題 3 Credit、同一無序配對一次收入、排行與正式 Battle 邊界維持原規則。沒有 schema、RLS、grants、Auth 或 Storage 設定變更。

## 本機驗證

- 全套 736 項：703 通過、33 既有選用 DB 測試略過、0 失敗。盲聽相關 58 項通過，涵蓋實際 TypeScript 模組的 API／伺服器資格／揭曉邊界與 React 執行流程。
- A／B／tie、pending／skipped／跨會員／失效作品／合輯／到期／表面退役，以及匿名回應沒有身分均通過。
- 揭曉與接題失敗仍保存收入、揭曉重讀不重投、帳號切換清卡、手動 Heart、兩首獨立操作、完整版與盲聽互停及不增加盲聽秒數通過。
- TypeScript 通過。移除本機 fixture 後清理殘留的 Next dev 自動型別並重跑，0 錯誤。
- lint 0 errors／14 既有 warnings，沒有新增警告；本機 webpack 正式 build 通過。
- 本機 node_modules 為既有跨工作目錄 symlink，Turbopack dev 無法解析其 root；本機驗收與正式 build 使用 webpack。雲端使用乾淨 Git 安裝，結果另依 Vercel 狀態核對。

## 瀏覽器流程

- 本機專用 fixture 使用實際盲聽元件、既有 Heart hook 與共用播放器；音訊為本機測試 tone，Auth／API 回應為測試資料，未新增正式站評測、愛心或 Credit。
- 第一輪實際播放 A／B 各超過 8 秒才選擇 A，確認只揭曉 A；手動送 Heart 後再聽完整版，A／B 均暫停。
- 另驗選 B 只顯示 B；切回 A 時完整版關閉，只有 A 播放。平手兩首均可獨立操作。
- 1440px 桌機、390px 中文與320px中英日韓皆無水平溢出，四語揭曉操作均至少44px。四語視覺用已達門檻的 fixture，以免測試資料干擾正式投票；不宣稱為 iOS 真機驗收。
- 本機 fixture 頁、音訊檔及開發型別已移除，沒有提交或部署測試入口；瀏覽器 viewport 已還原，測試分頁已關閉。
- 私人截圖／數據／檢查 logs：`/Users/huangyihong/Documents/New project/audits/2026-10-24-blind-reveal/`。`revealed-desktop.png` 與手機圖為測試資料畫面。

## 正式站驗收

- Vercel 正式雲端建置 READY；aipoger.com／www 均為 `98b7274`／`dpl_Eh7nMAM14soP4pnq8ZuH292kw9iY`。
- `/battle/listen` 四語、首頁、登入、舊酒吧、音樂分析、Battle setup、專輯入口及盲聽舞台圖片均200；未登入 `/api/blind-listen` 回401。
- 真實已登入會員載入新題，A／B皆為匿名ticket、音訊readyState4、沒有track識別連結及揭曉卡；選擇保持停用。實際播放A至片段45秒自動停止，B未聽仍不能投；沒有送出偏好、Heart或新增盲聽Credit。console errors為空。
- 「離開評測」返回Battle，正式「這裡怎麼玩？」已顯示單選／平手揭曉、愛心收藏／完整版及自動接題新文案；原8秒／3Credit規則仍在。
- 正式截圖：`production-anonymous.png`、`production-rules.png`；HTTP結果：`production-health.json`。
- 現行產品／體驗／工程與索引及私人協作入口同步既有5個Drive ID，讀回與本機正文逐字比對一致；維持固定檔名，沒有新增雲端副本。
