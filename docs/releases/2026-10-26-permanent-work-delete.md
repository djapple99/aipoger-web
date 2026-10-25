# 本人作品永久刪除 — 2026-10-26

使用者最新要求：作品下架後直接刪除資料，不要留「已下架」歷史。此要求取代前輪軟下架／保存附屬互動的規則。核心應用13a584d、SQL修訂2b775f0，分支codex/public-rule-copy；最終應用50af0a81d785ebc90f145ee0b07e05781fc1dc91，Vercel dpl_5mfEhykxfdzh5RVJxBzbka3hcMWT（aipoger-web-rnz8-o3alparmp-yohungs-projects.vercel.app）已READY並promote至aipoger.com／www。

## 最終行為

- 本人單曲、MV連結與專輯，包含以前下架或期滿的作品，確認後永久DELETE原listen_bar_tracks資料列；外鍵連動刪除附屬留言、作者回覆、十分制評分、愛心、review receipt等。Choice多型來源引用同交易刪除。清單整列、總件數及分頁同步移除，不建立已刪除作品的列表或回收桶。
- 每列44px垃圾桶及舊版批次入口一致，中英日韓確認窗明列作品名與不可復原、留言／評分同刪；已用投稿額度及Credit不退。非公開篩選保留審核／管理用途，標「未公開」，不作為本人已刪除歷史。
- 伺服器Auth getUser核對非匿名會員，body不能指定actor或Owner；service-only SECURITY INVOKER RPC鎖定本人community作品並執行交易。其他作者或official拒絕，已不存在者冪等成功。舊頁面未送permanent:true回409要求重新整理、重新確認，避免把舊的軟下架確認默默變成永久刪除。
- 原Credit／投稿額度流水與獨立完成戰績不改寫。作品刪除不移除其他作品或對戰仍使用的音檔；專輯成員沿原公開曲庫交集排除已不存在的單曲，不刪另一張專輯。
- 本人專用且無引用的原上傳MP3／封面清除；YouTube等外站影音不刪除。新verified MP3沿既有owner claim、共享來源鎖定與Storage清理；舊檔以本人路徑、原路徑／public URL及作品／對戰／封存／歌單封面引用核對。失敗留下短期service-only檔案清理工作，原每小時cron重試，完成即刪工作；不存作品名稱、已下架狀態或作品ID。

## 資料庫與驗收

- 新增20261025162815_creator_work_permanent_delete.sql，正式ledger20261025163615；新增前進修訂20261025164026_creator_work_delete_auth_boundary.sql，正式ledger20261025164112，均已實際套用。預檢發現service_role沒有auth.users SELECT，第二份將身分核對留在既有server Auth API，不新增私有Auth表讀權。對外應用在修訂後才promote。
- 新清理表RLS啟用，anon／authenticated不能讀寫；兩個新RPC均撤銷PUBLIC／anon／authenticated EXECUTE，僅service_role可執行。Security advisor仍兩筆既有WARN，只新增service-only清理表無policy的INFO。
- 全套862項：826通過／36既有選用測試略過／0失敗。TypeScript、本機webpack與Vercel原雲端build通過；lint0 errors／9既有warnings。本機TypeScript曾與build清理.next同時執行導致生成型別暫缺，build完成後獨立重跑通過，沒有修改tsconfig規避。
- 真實PGlite PostgreSQL執行兩份migration及實際TypeScript API→RPC→DELETE：公開及原已下架作品可刪、他人拒絕、重送冪等、FK連動互動刪除、Choice引用刪除、點數／額度流水保留、資料庫失敗整筆回滾（包括清理工作）。服務角色沒有auth.users SELECT時仍正常。元件測試確認取消／失敗／舊客戶端不刪資料，成功移除整列與件數，僅停止該作品播放、他曲不中斷，四語提示保留。
- 檔案清理測試覆蓋本人未引用檔清除、共享檔保留、外部URL／跨作者／越界路徑拒絕、Storage失敗保留工作後重試及verified MP3既有保護流程。
- 依使用者本次指令，實際刪除其截圖中已下架舊MV一筆，以原ID／本人／community／inactive／removed鎖定，未擴成全站歷史批次清理。舊MV原0留言／0評分，刪後原資料列0、附屬資料0；外部連結沒有自有檔案，清理工作0。全站作品390→389，其餘389筆保留；同名新上架MV原ID仍active。這是使用者指定資料刪除，不是另刪真人作品作測試。
- 正式舊作品獨立頁404，首頁／Profile／auth／Explore／MV各200，訪客刪除POST401且private/no-store。Chrome正式登入新分頁確認14件原有效作品、舊的已下架列消失、新上架同名版本仍在；console error為空。沒有按任何其他作品的刪除確認。

## 發布與維護

正式應用核心13a584d及dpl_4kQ1kPETUzC6BSvEeZRp7SZHgnCR已READY並promote；SQL前進修訂2b775f0的migration已套用，不需為僅SQL變更重建相同應用。舊批次介面的英文輔助文案再統一為permanent delete，最終應用50af0a8已重新完成雲端build並promote，現行文件使用此基準；此末次只統一舊批次入口英文輔助文案，核心862項測試結果沿用，該TSX另外通過eslint。回復舊版軟下架應用不會恢復已永久刪除的資料，不能把應用rollback宣稱為資料復原。

私人證據：New project/audits/2026-10-26-permanent-work-delete/，含production-http.json、production-work-list.png與測試／TypeScript／lint／build log。實際作者UUID不放公開report。現行規則、體驗、工程、索引及agent原地更新，Drive沿既有ID同步；舊guard修復report註明已被本次使用者規則取代。
