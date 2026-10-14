# Credit整合核對與公開文案修訂

文件與驗收日期：2026-10-15 Asia/Taipei。

## 發布版本

- 前版：`4bfc46f7d89be5d56ad7187dc6291ed82934921f`／`codex/participation-credit-live`，Vercel `dpl_4GFbsbawZCWqAgRM7qbpPaQzxQEs`；正式Credit與四頁指南已部署，非本機試作。
- 本次：`b18931a9a983884cc4f58e59e9d95a8f51df9968`／`codex/public-rule-copy`，Vercel `dpl_BmR5kgXpmzCRsVAE2P6ik3dTYHyg`，READY且已alias aipoger.com／www.aipoger.com。
- Deployment：`https://aipoger-web-rnz8-hhkom6b6q-yohungs-projects.vercel.app`。應用commit只改兩份四語文案，44檔Credit整合完整繼承。後續文件commit不當成新的應用部署。

## 使用者確認與範圍

本聊天要求先完整核對另一個「檢視 Aipoger 最新改版進度」的改動，再撤下公开舊歌+5與Owner免扣點說明。該聊天中的直接使用者選擇確認取消／刪除追回、恢復同份獎勵、待追回欠額先補足、基本字數及反灌水後發點；這些規則維持。原平台方向、排行計算、數量豁免及作品資料均保留。其他新發現UI問題只列待辦，未順便改操作。

## 正式點數現況與只讀證據

台灣每日回訪15、有效評分評論10、歌曲／MV送Heart3、盲聽每題3、個人168小時前三件免費後額外成功投稿60已啟用。正式遷移`20261014164151_credit_participation`存在；launch為UTC2026-10-14 16:41:51（台灣10月15日00:41:51）。原盲聽12筆／36點保持不變。核對當下參與表僅2筆daily_visit／30點，沒有歷史Heart／評論補發。8個新trigger存在、4新表RLS開啟，authenticated不能直接寫流水或執行visit RPC，service_role可執行。沒有用正式資料庫跑QA夾具或做寫入。

## 文案修訂與驗收

- 四語Explore推廣期不顯示期滿回歸+5；仍說明三個日曆月與11月1日回歸結束。
- 四語共用Credit說明不顯示Owner免扣投稿點數；保留15／10／3／3／60及追回／恢復／欠額規則。Owner本人私人中心與後台權限不改，公開四頁指南無Owner例外標示。
- 16個guide surface／語言組合驗證無兩項標示，金額／段落保留；改動檔lint、TypeScript通過。
- 40項現行API／投稿／評價測試及1項隔離PGlite/PostgreSQL整合測試均通過。本機PGlite不代表真實伺服器多連線壓測或一般會員Auth／Storage端到端已完成。
- 雲端Next build READY；正式Explore指南可打開，實際DOM與截圖無兩項文字。390px指南DOM無水平溢出；非iOS真機。
- 驗收與核對紀錄：私人工作區`audits/2026-10-15-participation-review/`。公開指南入口現為13px灰字，新使用者容易忽略；尺寸／版位仍待決定。

## 後續問題

1. 評論PATCH成功回null，原公開留言清單不更新／重讀，可能仍顯示已修改或撤回的舊內容；需修刷新並驗證封面平均分同步。
2. 日／韓文音檔投稿仍有最多3首舊文案，與已可60點增額不同。
3. 盲聽next回應多一次Credit summary往返，實際延遲尚未量測。
4. 一般會員Auth／Storage完整發扣點流程及真實多連線壓測未完成；既有測試不冒充實機結果。
5. 文件與分支原未同步，已將現行主文件更新為本版並保留舊版的發布證據，不重建一套日期式產品正文。
