# 本人刪除操作被資料庫guard拒絕修復 — 2026-10-26

後續使用者明確改為永久刪除，原軟下架及歷史保留已被新規則取代，見[永久刪除report](2026-10-26-permanent-work-delete.md)。以下僅保留當輪guard修復的驗證證據。

使用者在「我的作品」按刪除後仍見作品，出現「未能刪除作品，請確認登入後重試」。應用 `8579b7aff2c4e3055a0b33f005ffb0513e1149af`、分支 `codex/public-rule-copy`，Vercel `dpl_GD8r35wYea9VmtJWh7BveXZbXdUq`（`aipoger-web-rnz8-dd5k3coi4-yohungs-projects.vercel.app`）。

## 實際原因與修復

- 前輪d7dfdeb將原本的內部moderation_note「Creator removed own Bar Heartbreak track.」改成「Creator removed own work.」。正式listen_bar_block_legacy_public_capacity_removal觸發器沿穩定前綴辨識作者明確撤下；新字串未被辨識，觸發例外，UPDATE回滾，作品沒有下架。這是應用改動造成的相容性回歸，不能歸因使用者未登入。
- 正式Supabase只讀錯誤紀錄確認台灣時間00:07:40、00:07:47、00:07:57、00:11:06及00:11:32共五次相同拒絕；沒有靠重按使用者作品來重現。
- 還原資料庫既有辨識標記，加程式註解明確其為內部契約，禁止隨對外品牌改名。未放寬觸發器、所有權、Auth或RLS，未新增SQL migration；資料庫不需修改。
- 前端依401／403／409／其他失敗分別提示登入失效、只能操作本人作品、狀態改變需刷新、系統失敗作品仍保留可稍後重試。未知或網路失敗不再統一顯示登入問題，也不直接顯示內部資料庫例外。
- 成功後仍軟下架，保留原媒體、留言、評分、愛心、戰績、額度及Credit流水；失敗與取消維持原作品與播放。沒有為驗收刪除真人作品或發表測試作品。

## 驗證

- 18項定向測試通過，涵蓋原API與元件權限／取消／重送／換帳號／播放保留，新增401、403、409及500的錯誤恢復行為。
- 新增真實PGlite PostgreSQL測試：從既有20260907182740_retire_bar_survival.sql載入同一guard並建立相同UPDATE觸發器；先確認短標記會觸發相同例外、原資料完整不變，再執行真正remove-track TypeScript handler，其實際payload與作者篩選送進PostgreSQL UPDATE。歌曲連結、MV與專輯均成功，重試不改下架時間，原媒體／投稿時間與六類歷史資料保持一致。正式與本機函式prosrc MD5均為93a6cfee175c0bc914efda603dc69b08。
- 全套856項：820通過／36既有選用測試略過／0失敗；本輪明確設定AIPOGER_REMOVE_PGLITE_MODULE執行新DB測試，並非略過。TypeScript通過，lint0 errors／9既有warnings，本機webpack與Vercel雲端build通過。
- 私人證據：New project/audits/2026-10-26-creator-delete-guard/，含diagnosis.json及定向／全套／TypeScript／lint／build log。沒有讀取瀏覽器cookie、token或下載正式敏感環境值。

## 發布與文件

發布後核對READY、apex／www同一部署、正式頁面與訪客401；私人Creator Center僅驗入口及原作品仍在，不聲稱真人作品刪除實測。本機真實PostgreSQL正向測試與正式唯讀查核分開記錄。工程、產品規則、體驗、索引與agent更新；Drive沿既有ID原地同步。前輪report補上回歸與驗收缺口，避免舊的通過紀錄被誤認已涵蓋正式刪除。

應用變更僅remove-track route、CreatorCenter錯誤提示與兩個測試檔。無資料庫或真實作品資料改動，回復應用不需SQL回滾。上一版d7dfdeb含已知同一缺陷，不應作為本功能回復目標。
