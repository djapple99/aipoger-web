# 表情提示詞、複製扣點與我的點數

發布／驗收：2026-10-27（Asia/Taipei）。應用 `f463313`（功能提交 `418e064`），分支 `codex/public-rule-copy`。

## 已上線

- 創作聖經 Prompt 新增「表情與氛圍」：兩張原截圖的46個詞全數保留，加3張A/B/C對照卡，總Prompt223；人聲7／情緒12／力度10／性格17／對照3。原錄音室111及100個試聽檔／映射不變，新49張沒有新增試聽。
- 詞義、適用情境與英文片語可搜尋／複製；保留Slancio／Con slancio、Sonore／Sonoro別名。A不加表情詞、B只加原詞、C補英文描述，固定其餘條件。前台不顯示「尚未驗證／不保證有效」或lifecycle標籤，內部沒有捏造模型／日期／Verified紀錄。
- 新49張每次複製5 Credit，原內容維持原規則。按鈕先標費用，伺服器驗非匿名會員、從正式合併catalog取文字，不信任client的金額／身分／正文。Owner投稿豁免不延伸至Prompt複製。
- 同一個複製操作保留user＋request＋key＋locale receipt與已付文字快照。網路結果不明、剪貼簿失敗可用同筆重試；成功後下一次複製才建立新操作。sessionStorage只存會員範圍的receipt ID，不存token／Prompt正文。剪貼簿無API時先擋下，不扣點。
- 不足顯示「目前點數不足，查看我的點數」，連到`/profile?lang=<lang>#my-credit`並直接開既有點數視窗。只在這裡集中說明餘額、盲聽+3、有效評分評論+10、每日回訪+15、愛心+3、作者首次回覆+2與收支流水。日韓Bible正文沿既有英文回退，返回點數頁保留日韓語言。
- 投稿統一加註「每168小時（一週）前三件免費，之後每件成功投稿60點」，由第一件成功投稿起算；不是星期一重置。連結與MP3共用，刪除不退額度。
- 原播放、留言、評分、作品、戰績與獎勵均未重算。前端分類常數獨立為client-safe taxonomy，避免匯入分類時連帶打包會員Prompt正文。

## 資料庫與安全

- 本機遷移：[`20261027073526_bible_expression_copy_credit.sql`](../../supabase/migrations/20261027073526_bible_expression_copy_credit.sql)；正式ledger：`20261027074525`，已套用。
- 新receipt表啟用RLS，anon／authenticated沒有讀寫權。service-only `bible_expression_copy`採SECURITY INVOKER、固定search_path、49個key白名單及每筆-5，沿既有user-first advisory lock，與投稿／Heart／回訪／評論／作者回覆共享餘額。history保留原三種來源後加支出。
- API沿getUser核對會員，不新增auth.users SELECT grants。SQL只接受已驗證server caller傳入的身分，瀏覽器不能直接呼叫RPC。
- 正式service_role在單一transaction驗證15點收入、三次各扣5、同receipt取原文字／不重扣及第四次不足；完整rollback後測試帳號與receipt均0殘留。後續正式UI兩次真實複製照正常規則保留兩筆-5，共10點，餘額與流水一致；沒有發測試贈點或回改原流水。
- Advisor前後僅新增service-only表「RLS enabled no policy」預期INFO，因瀏覽器角色沒有存取權而不建立policy。原14個既有authenticated definer及密碼保護WARN未增加；未在本輪調整無關權限。

## 驗證

- 全套903：871通過、32選用DB測試略過、0失敗；新增7項涵蓋46詞／3對照、API身分與白名單、餘額不足／debt／receipt、保留舊流水、剪貼簿及網路重試、UI分類與四語wallet。最終修訂另有25項定向通過。
- TypeScript、webpack本機／雲端build通過；lint0 errors／9既有img warnings。
- 正式會員：49張分類與7／12／10／17／3子分類、Sonoro搜尋、兩次複製各5點及實際clipboard正文、Profile餘額／兩筆流水核對；四語wallet、320px無水平溢出、分類按鈕44px，原Studio與音訊保留。
- 正式11項HTTP：首頁／Bible／Profile／盲聽／Explore／MV／新聞200，會員catalog／copy／credit訪客401；15個初始公開JS chunks無抽查的會員Prompt正文。
- Runtime error／fatal：發布查核0筆。

## 部署與文件

- Vercel最終：`dpl_HGgqXaazUbsrvUq6giGHsoQxUFFa`，READY；[build](https://aipoger-web-rnz8-is34g8p4f-yohungs-projects.vercel.app)。先prod --skip-domain，以既有授權CLI驗401，再promote同一build；apex識別相同。
- 前段功能正式驗收build為`dpl_DoevDmNj7qu59bUM4BP2skmjezcK`；最終build追加保留日韓返回語言、載入失敗重試及實用文案整理，沒有再次遷移。
- 六份現行文件與索引依固定檔名維護，更新協作入口／產品／體驗／工程／索引，營運與roadmap不變；Drive沿七個既有ID原地同步與讀回核對。未部署主repo的其他未提交程式。
- 私人驗收證據：`/Users/huangyihong/Documents/New project/operations/qa/2026-10-27-expression-credit-wallet/`，含HTTP／browser QA、log及桌機手機截圖；未提交會員身分或餘額至公開repo。

開啟：[表情與氛圍](https://aipoger.com/ai-music-bible?lang=zh#bible-move-expression-sotto-voce) · [我的點數](https://aipoger.com/profile?lang=zh#my-credit)。
