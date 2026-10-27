# 我的點數：精簡視窗與按需展開

發布／驗收：2026-10-27（Asia/Taipei）。應用`35137ce`，分支`codex/public-rule-copy`。

## 結果

- 預設只顯示可用餘額、簡短使用規則及「如何賺點數／查看收支明細」兩個小入口；移除大任務卡與預設展開的50筆長流水。
- 桌機對話框由1100×794縮為560×381。手機維持自然換行，320px四語預設高度437／505／461／437px，皆無水平溢出。
- 任務點開為精簡列表，原四個任務連結、獎勵數值、作者回覆說明及完整規則保留。一次只開一區，關閉再開回預設摘要。
- 明細點開先顯示最新5筆，以「較新／更早」每頁5筆翻閱既有近期紀錄；切換區塊或重新開啟回最新5筆。時間顯示使用Asia/Taipei。
- 原餘額、全部持續儲存的流水、獎勵、扣點與168小時（一週）投稿額度均保留。只改前端元件與對話框樣式，無API、SQL、migration、資料刪除或正式扣點測試。

## 修改與驗證

- `credit-wallet.tsx`承接原收支資料，複製陣列後依時間排序，加入收合與5筆分頁；`creator-center.tsx`沿用原Credit讀取並移除重複長清單；CSS只縮小Credit對話框，其他作品／設定對話框尺寸不變。
- 新增3項runtime測試：預設精簡／任務與明細互斥、最新5筆與翻頁／重開／資料縮短／輸入不變、四語／空紀錄／欠額／0餘額；原wallet SSR測試同步驗預設收合。定向28項通過。
- 全套906：874通過、32選用DB測試略過、0失敗。TypeScript及本機／雲端webpack通過；lint0 errors／9既有img warnings。
- 正式會員：原可用餘額一致；原50筆近期明細按10頁逐筆比對項目／增減數一致，每頁5筆。任務入口、明細切換、Escape關閉與重開回收合已驗。
- 正式桌機及中英日韓320px：預設無流水／任務清單、兩入口可操作，展開手機明細5筆且不水平溢出。沒有提交評論、愛心、投稿或新複製扣點。
- 正式9項HTTP：四語Profile、首頁、Bible均200；私人creator-center／credit／Prompt copy API訪客401。發布查核runtime error／fatal為0。

## 部署與文件

- Vercel：`dpl_9CYrmbg17t7qtGxGHDipXDYMDeyT` READY；[build](https://aipoger-web-rnz8-23k6y0myu-yohungs-projects.vercel.app)。先prod --skip-domain，以既有CLI授權核對私人API401，再promote同一build；apex識別一致。
- 前版`f463313`及原Credit遷移保持有效，無新增資料庫部署。
- 現行產品／體驗／工程／索引與協作入口同步更新，營運／roadmap不變；Drive使用既有ID原地更新並讀回比對。主repo其他未提交程式未部署。
- 私人QA證據：`/Users/huangyihong/Documents/New project/operations/qa/2026-10-27-compact-credit-wallet/`（正式桌機／手機截圖、原紀錄比對、四語尺寸及測試log）。

[查看我的點數](https://aipoger.com/profile?lang=zh#my-credit)
