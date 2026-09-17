# Showtime 排行榜管理與分享發布

更新：2026-09-18 02:45 Asia/Taipei。

## 發布

- 使用者回覆 `do it`，明確批准先前確認卡的正式新增式資料庫更新及部署。
- 應用提交 `9f96865`，分支 `codex/showtime-chart-admin`；Vercel `dpl_EoRgvvWvNPfDNMyZSfg1BJjgfnox` READY 並 promote 至 https://aipoger.com。
- 版本網址 https://aipoger-web-rnz8-y5zp9jy49-yohungs-projects.vercel.app 。後續文件提交不是額外應用版本。
- 本機遷移 `20260917180000_monthly_chart_owner_decisions.sql` 已原樣套用；正式 ledger 版本 `20260917184048`、名稱 `monthly_chart_owner_decisions`。不要因版本前綴不同而另行套用。

## 資料保護

- 遷移前後：歌曲 293、啟用 196、可公開播放 196、有效 Heart rows 670、舊月榜 snapshots 0、snapshot entries 0，一致。這些是遷移時點的核對值，不是固定營運上限。
- 沒有新增真實裁定、沒有再次撤下或刪除歌曲、沒有移轉或修改票數。先前保留加註版／撤下原歌名的操作仍是獨立事件。
- 正式 admin RPC：2026-09、live、27 首、0 同票待裁定組、0 裁定紀錄。新表 RLS 啟用；anon／authenticated 無管理 RPC 執行權，service_role 可執行。
- 公開 API 只有加註版本列第 1，4 位支持者；其他未達門檻留在人氣累積中。台語熊high 類型回傳 4 首，不製造名次。

## 驗證

- 同一應用提交上一輪已通過 429 項測試、TypeScript、本機 build；lint 0 errors／16 既有 warnings。本次正式雲端 build 成功。
- 正式 `/rank`、`/admin/charts`、`/admin/choice` 皆 HTTP 200；未登入的 `/api/admin/charts` 與 `/api/admin/choice` 回傳 401。公開月榜回應不含裁定者、成員稽核欄位或原始 storage path。
- 真實桌機 1440x900 顯示 rgb(7,8,9) 黑底、原始 Choice 封面與新增整榜分享鍵，無橫向溢出。手機 390x844 四語分享控制與排版檢查無橫向溢出。初始部分截圖早於 Choice 完成載入，不能當作缺圖；四語載入後再次確認實際封面正常。正式後台未登入畫面顯示 owner 登入提示，未讀取私人內容；驗證分頁最後取得的 console error 清單為空。
- 英文規則彈窗正常，包含 owner 同票裁定／不改票數說明。分享鍵已實際點擊；IAB 原生分享未回傳可讀剪貼簿，因此不宣稱已完成外部平台送出。月份／類型分享還原以正式 deep link 及既有 runtime 測試驗證。
- owner 帳號的真實保存／撤下沒有在正式站執行。本批沒有實際待裁定組可供 owner 驗收；同分保存、衝突、月底鎖定以隔離 TSX／API／PostgreSQL 測試驗證。

## 回復

- 上一個已驗證應用 deployment 為 `dpl_6q3DgSbgTmGzirmtyxdm4P5dH8RE`。回復應用不會撤銷 DB；新裁定表與歷史紀錄不可隨回復刪除。
- 新 DB 的 pending rank 語義需要本次前端；若回復舊前端，先評估待定顯示相容性，不可直接把新 wrapper 當成完全相同的舊契約。
