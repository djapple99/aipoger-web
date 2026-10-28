# 2026-10-28 表情 Prompt 扣點後才顯示

## 問題與範圍

49 張表情詞／A-B-C 卡原先在會員內容 API、標題與 Prompt 區直接提供原詞及完整文字，使用者可以先手動複製，與每次複製 8 點的設計矛盾。本輪將會員內容改為伺服器描述投影，先只提供描述、分類、用途與不帶原詞的卡片 ID；成功扣點後，copy API 才回傳原完整 Prompt，原卡揭曉並複製。

- 保留每次 8 點、所有其他獎勵／投稿額度與會員收支。沒有 SQL migration 或正式帳號／ledger 寫入。
- 原詞／別名保留在伺服器 canonical 資料與 Owner 編輯 API，後者仍需 Owner 權限。一般會員搜尋、展開說明、初始 HTML 與客戶端 bundle 不應提早取得這 49 張原詞或全文。
- 舊原詞卡片 deeplink 會轉到對應描述卡，舊 pending receipt 轉接同一原 key，不因改卡片 ID 重複扣點；舊 -5 receipt 仍沿原 idempotent RPC。
- 點數不足／登入失效／結果不確定不揭曉。剪貼簿失敗已付款則顯示文字，可按免費重試；完成後再次複製是新 8 點操作。這不是永久解鎖權，也不能撤回曾在舊版已看過或複製的內容。
- 原 174 張非本批 Prompt、歌詞與台語資料、111 段錄音室 Prompt／100 段試聽、既有播放／留言／評分均不改。
- 發布來源為 `codex/public-rule-copy`，接續已發布 Deezer 新聞 `25ef2fb`／`dpl_CTVmoRDa7qkwaGPnh64qGoKik3cv`，保留該篇與 sitemap edition 修正。

## 實作與驗證

- `bible-expression-preview.ts`：server-only、明確欄位 allowlist，編輯覆寫不會從摘要／metadata／搜尋欄位繞出付費本文；原 key／opaque ID 皆解析到同一白名單。
- 會員 content API 使用描述投影，拒絕訪客／匿名身分；copy API 仍以會員驗證、原 key、canonical 合併全文及原 RPC 扣點後回傳。
- UI 原卡預設沒有 Prompt 區塊，只留用途及清楚的複製並顯示價格按鈕；收到成功回應後才在記憶體顯示全文，不把全文寫入 sessionStorage。
- receipt 只儲存原操作 ID，兼容舊 key；重試、雙擊及剪貼簿失敗沿原保護。
- 定向 21 項全通過，包含實際 API／React rendering、全部 49 張中英預覽、覆寫／別名洩漏、舊連結與 receipt、失敗不揭曉、成功揭曉與免費重試，以及 PGlite 真實 PostgreSQL 的 8 點／舊 -5 收據／餘額與獎勵保留。

- 整站945項：913通過／32項既有選用略過／0失敗；TypeScript、webpack build與diff whitespace通過，lint0 errors／9既有img warnings。250份公開JS／map逐一比對46個原詞、49個原key及完整Prompt，命中0。實際React卡片本機桌機與320px驗收通過，未付款沒有Prompt區塊，手機無水平溢出。

## 發布狀態

- 正式應用 `e662882`，`codex/public-rule-copy` 已 push；從乾淨來源建立 production `--skip-domain`，Vercel `dpl_CufBFRAUUSDnCcs1jYJEErYRcUuZ` READY。待發布 host `aipoger-web-rnz8-oa2l3m73k-yohungs-projects.vercel.app` 完成14項HTTP後promote同一build；apex與www即時讀回同ID。
- 待發布與正式各14項HTTP全通過：聖經四語、訪客content／copy 401、公開導讀、Deezer新文／列表、首頁、MV、Explore、Battle與Sitemap。原五篇新聞及edition快取修正保留。
- 正式已登入Chrome確認49張描述卡、0個Prompt區塊、原詞未出現在標題／展開說明；舊sotto-voce deeplink會打開對應opaque卡。桌機與中英日韓各320px實測，document scrollWidth305／viewport320，沒有水平溢出；日韓正文沿原英文回退。未點擊真人帳號付費複製或製造正式測試流水；付費成功／不足／剪貼簿重試由前述真實API fixture、React rendering及PGlite驗證。
- Chrome console error0；本次指定deployment最近30分鐘error／fatal runtime logs查無紀錄，只代表該部署與觀察時間窗。
- 本機docs與既有Drive固定ID更新；產品／體驗／工程／協作入口／索引五份從Drive原始bytes讀回，與本機SHA-256逐一相同。沒有新增另一套正文或分享權限。
- 回復目標為前正式 `dpl_CTVmoRDa7qkwaGPnh64qGoKik3cv`。沒有修改DB、Auth、Storage、排程、依賴、環境變數或登入憑證。

私人 QA：`/Users/huangyihong/Documents/New project/operations/qa/2026-10-28-expression-prompt-gate/`；不提交環境檔、會員資料、截圖或工具輸出。
