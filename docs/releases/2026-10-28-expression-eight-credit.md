# 表情詞與對照卡：每次複製8 Credit

使用者於2026-10-28（Asia/Taipei）確認：這批表情詞與對照卡改8點，其他獎勵維持不變，賺點任務將評分與評論置前；保留原點數與紀錄，測試後直接部署。本頁保存發布證據，現行規則以產品正文為準。

## 正式發布

- 應用commit：`cb7a7221ec217efce1b3a602e8350307eedfa6fc`，分支`codex/public-rule-copy`，已push。
- Vercel專案：`aipoger-web-rnz8`／`prj_2vuiLRv5OYE9mcAG3AF4oLZYK6G5`。
- 部署：`dpl_5GCDUYakRuHNw6yj9436aN33XkHL`，READY；待驗收網址`https://aipoger-web-rnz8-azgwayoml-yohungs-projects.vercel.app`。
- 先使用`deploy --prod --skip-domain`建立版本，再在資料庫與待驗收API確認後promote同一build。正式`https://aipoger.com`及www重新導向後，HTML部署識別均為上述ID。
- 本機migration：`20261027194224_bible_expression_copy_eight_credit.sql`；正式ledger版本`20261027194919`，名稱`bible_expression_copy_eight_credit`。檔名／ledger為UTC日期，發布日為台灣10月28日，不混用。

## 實作與保留

- 僅46個表情詞及3張A／B／C對照卡，共49張的新成功複製改為8 Credit。按鈕與不足額門檻、API／RPC及四語點數使用說明一致；其他Prompt的既有複製規則保留。
- 「如何賺點數」依序為評分與評論＋10、盲聽＋3、每日回訪＋15、送出愛心＋3。作者首次回覆每則他人評論＋2、投稿168小時（一週）前三件免費／之後60等原規則不變。
- 原精簡點數視窗不擴張：預設餘額、使用規則與兩個小入口；任務／明細點開才看，明細每頁5筆。
- migration只改receipt預設值與可接受的歷史delta、替換複製RPC，沒有重寫會員餘額／獎勵流水。舊receipt仍為-5，新receipt明確寫入-8；constraint同時接受-5及-8。
- 已付費receipt先核對並返回原文字快照，重試`charged: 0`，不受新價格或剩餘額度影響。新增`expectedCost`比對：舊頁面／舊API省略時以5處理，尚未付費的新請求回`COPY_PRICE_CHANGED`，要求刷新；不會在舊畫面仍顯示5時默扣8。
- 原固定49個key白名單、會員登入驗證、user-first advisory lock、security invoker與service_role限定執行保留；瀏覽器不能選擇任意價格或直接操作帳本。原播放、留言及評分的程式與資料未修改。

## 驗證

- 11項定向測試全部通過，包含catalog49個key、client/API價格同步、409刷新提示、複製／網路重試、四語wallet任務順序與PostgreSQL整合。
- 全套`npm test`：933項，901通過、32項選用測試略過、0失敗。使用既有PGlite模組執行資料庫測試，這輪新增的扣點整合測試沒有略過。
- `npx tsc --noEmit`通過；`npm run lint`為0 errors／9筆既有圖片warnings；本機`next build --webpack`及Vercel正式build通過；`git diff --check`通過。因現有node_modules為symlink，本機採webpack。建置階段原公開Choice讀取有fallback訊息，正式頁面及API驗收正常。
- 本機migration連續套用兩次成功，舊-5 receipt內容與原獎勵函式hash不變；15點複製後7點、第二次不足阻擋、剛好8點可用至0、重試不扣／衝突拒絕及欠額／Owner等分支通過。
- 正式資料庫以臨時測試會員、`SET LOCAL ROLE service_role`及完整交易ROLLBACK驗證：原每日回訪＋15後，新複製扣8至7；同receipt及舊參數已付款重試不扣；第二次新複製不足阻擋；舊價格新請求拒絕。交易後測試會員0、測試receipt0殘留。
- 正式既有4筆複製收據仍總計-20，逐列內容指紋前後相同：`f4f94b6b1022c2045b8661d67b10f1ce`。原history view hash `8b8be6153b60802b87b5789b23315bc9`與既有獎勵函式hash均不變。瀏覽器核對發布前後會員餘額與最近5筆收支一致，舊-5顯示保留；本次沒有對真實會員帳戶做付費複製測試。
- 正式Chrome會員介面：49張按鈕均顯示「複製・8 點」；Sotto voce桌機與320px卡片無水平溢出。點數視窗中英日韓320px均顯示8點且第一項為評分與評論＋10；原收合及5筆分頁保留。
- 正式10項HTTP驗證通過：首頁、Profile、聖經、探索、MV、Battle皆200且同部署；Credit與會員聖經content未登入401，copy POST未登入401；www導向正式apex且同部署。
- 發布查核時Chrome console error為0；本部署最近30分鐘Vercel error／fatal查無紀錄。
- 安全advisor前後一致：32筆service-only表RLS無policy INFO、14筆既有definer WARN、1筆既有Auth密碼保護WARN；沒有新增WARN。新RPC不授權anon／authenticated，僅service_role可執行。

## 修改範圍與證據位置

程式：`src/lib/bible-prompt-copy.ts`、`src/app/api/ai-music-bible/copy/route.ts`、`src/components/suno-practice-library-section.tsx`、`src/components/credit-wallet.tsx`、`src/lib/credit-copy.ts`、新增migration及三份相關測試。現行產品／體驗／工程、文件索引及協作入口同步更新，既有Drive ID原地同步。

私人QA證據：`/Users/huangyihong/Documents/New project/operations/qa/2026-10-28-eight-credit/`，包含完整測試／build／部署紀錄、正式HTTP JSON、四語手機與桌機截圖及本人的發布前後餘額核對；私人帳戶資訊不寫入公開report。
