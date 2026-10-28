# 2026-10-29 全站正式 Prompt 8 點與 Owner 免扣

## 授權、範圍與來源

使用者確認：教學快捷範例免費，其他正式Prompt所有入口每次複製8點、扣點成功才提供全文；每日回訪15與其他獎勵、原餘額及紀錄保留，測試後直接部署。同輪明確補充Owner保留餘額／使用紀錄，但不受點數費用或不足規則限制。

基準為`c4b191e`（正式應用`e662882`），`codex/public-rule-copy`；前正式`dpl_CufBFRAUUSDnCcs1jYJEErYRcUuZ`。主repo既有未提交內容保留，本輪在乾淨發布worktree修改。Deezer新聞、原五篇文章及Sitemap edition保留。

- 正式共1,763份：223招（含111錄音室及49表情／對照卡）、21歌詞控制、772聲音DNA、747配方。首頁、完整庫、錄音室、歌詞、DNA及配方同一元件／API／白名單。
- 免費教學包含入門三招、欄位速查／起手模板、指令教學與三段短人聲示範。曲風詞彙／台語字音為教學參考，不當作完整配方收費。正式卡快捷入口無免費旁路；分享網址不收點。
- API描述投影不送正式全文，DNA原始English tags／sourcePrompt與完整搜尋別名也移除，會員端用描述查詢。扣點後原卡揭曉；教學、試聽、搜尋、展開用途免費。
- 共用複製元件保留同帳號／卡片／語言receipt、忙碌鎖與網路／剪貼簿重試。跨入口的同一pending操作共用receipt；新成功操作再複製才建新receipt。
- 服務端沿既有確認Auth的Owner predicate；不接受client Owner旗標。Owner不扣點、不因餘額或欠額擋住，新使用記0點`owner_prompt_copy`。原Owner投稿不限次／免扣沿用；沒有修改評分／投票等非點數權限。

## 資料庫與保留證據

- CLI產生遷移`supabase/migrations/20261028175604_bible_formal_prompt_copy_credit.sql`；檔名使用CLI UTC，產品確認／發布日採Asia/Taipei 2026-10-29。
- 私人key registry白名單1,763鍵，不儲存Prompt全文；RLS開啟、一般角色無權限、service只讀。
- 既有receipt表沿用並以FK擴充正式鍵，允許既有-5／-8及Owner 0點紀錄；共享credit view及所有獎勵函式不改。新service-only `bible_prompt_copy`同一會員鎖、價錢確認與receipt去重，舊`bible_expression_copy`轉接同政策，舊頁面與舊收據可重試。
- 正式套用前共6份receipt（4份-5、2份-8），既有receipt內容MD5 `e7040c6b48242ca7219a6b7983f468f9`，保留檢查cutoff為2026-10-28T18:12:58.436474Z；已核對既有表約束、owner predicate與service權限。沒有回填、刪除或重設會員流水。

## 本機驗證

- 33項定向全通過；全套952項，920通過／32既有選用略過／0失敗。包含全部1,763鍵與正文、會員API投影、各類copy API的canonical text／身分與防client偽造、教學免費、共用元件失敗不揭曉／剪貼簿重試、真實PostgreSQL的8點、舊收據、Owner零餘額／欠額免扣、未確認Owner拒絕、0點歷史、RLS／grant及獎勵函式不變。
- 本機webpack／TypeScript通過；Lint 0 errors／9筆既有img warnings。250份公開JS／map檢查1,763份正文，0命中；實際卡片本機桌機及320px截圖無水平溢出，教學可見、正式卡無Prompt區塊。
- React檢查：共用複製狀態／元件、只有點擊才取全文、不新增依賴；按鍵44px、錯誤status與費用可讀、來源資料server-only。

## 正式套用與部署

- 正式migration ledger `20261028181706` 已套用；私人白名單1,763鍵、RLS=true，anon／authenticated無新RPC執行權。以service_role實際交易回滾驗證一般會員8點／receipt重試／Owner免扣與餘額不變，0測試receipt殘留。6份既有receipt MD5仍為原值，5個creator_credit獎勵函式內容hash全部不變。
- Supabase security advisors比較：0個新WARN／ERROR；新私人service-only key表出現1個INFO「RLS enabled no policy」，符合只供bypassrls service_role讀取、一般角色無grant的設計。既有15個WARN未由本輪新增，未擴張任一member權限。
- 本機最終952測試920通過／32略過，TypeScript／webpack／lint通過。待本輪待發布／正式HTTP及會員瀏覽器驗收後補上應用commit、部署ID與Owner實際0點使用證據。

私人QA：`/Users/huangyihong/Documents/New project/operations/qa/2026-10-29-all-prompt-credit/`。環境檔、憑證、截圖與工具輸出不提交。
