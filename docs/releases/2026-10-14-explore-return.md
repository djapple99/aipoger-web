# Explore 舊歌回歸發布驗收

2026-10-14；應用 `773e97f`，分支 `codex/homepage-mv-editorial`，前版 `567ce28`。

- 使用者要求10月1日前仍保留的舊歌回到Explore，排除作者／Owner／系統移除；小柒現存14首明確排除、風土55首維持撤下。Showtime暫緩，不挑20首、不發布外站紀錄、不清理Storage。
- 正式資料讀取建立205件固定名單與69件排除名單。候選全部有站內音檔、public phase、現行曲風及approved狀態；名單不冒充10月1日歷史快照，不清除任何moderation欄位。原API仍逐次驗證active／review／hidden／removed／Showtime撤下與Explore生命週期。
- Explore API、前台篩選、電台／既有全站電台隊列刷新、Top10／Top50及Profile公開狀態共用回歸資格。首頁單曲與盲聽仍按原三個月期限，沒有SQL、Auth、Credit、正式Battle或Showtime修改。原作品ID、created_at、音檔與評論保留。
- 回歸期截至Asia/Taipei 2026-11-01 00:00，該時點回復正常三個日曆月展示。固定名單內尚未期滿作品也暫留至截止；只有原期限已滿的回歸作品綜合分加5，API與client各從基礎分計算，不疊加兩次、不改Heart／盲聽票／MV評分人數。入榜仍要求實際有效支持或正盲聽偏好。無公開加分標籤，榜單文案為四語「目前公開曲庫」。未建立刪檔排程。

## 驗證

- 600項測試：569通過、31既有可選DB略過、0失敗。新增回歸名單／排除、無效時間、截止毫秒、加分冪等、source ID／排序與API後續下架／作者刪除／審核／生命週期限制等測試。
- TypeScript、本機及Vercel build通過；lint 0 errors／15既有warnings。
- 修改兩份TSX與排行榜文案後依React檢查清單核對：沿用useMemo／每分鐘poolNow，Set在模組建立，不新增網路waterfall、全域播放器或效應，無新layout與keyboard操作。
- 前版正式API120首，回歸版218首：102首期滿作品重新出現，另排除小柒尚在普通期限的4首。回歸102首全部不在前版API；69件排除名單零出現，隱藏／撤下／非approved零出現，逐筆綜合分與單次5點公式完全一致。受保護正式環境與promote後apex各驗證一次，彙總保留私人audits，沒有寫入假票／評論。
- 真實正式Chrome搜尋「十塊便當」（2026-05-22投稿）找到原作品卡，保持原ID及評論／歌詞入口；播放進度44.333558秒、duration122.719979秒、readyState4、error null，隨後按暫停。風土策展人及我是小柒搜尋均無結果。
- 真實390px手機中英日韓回歸卡均可見、無水平溢出；正式console errors為0。英文初次等待在API完成前逾時，後續fresh DOM確認載入完成並有原作品，未改程式或把等待失敗當成功。此為Chrome視窗驗收，不宣稱iOS真機。
- 正式截圖：私人 `outputs/aipoger-explore-return/production-desktop.jpg` 與 `production-mobile.jpg`；原回歸名單及彙總在私人 `audits/2026-10-14-explore-return/`，不將私人工具輸出送入網站部署。

## 部署

使用乾淨暫存worktree，僅複製既有Vercel project identity，不複製環境密鑰。Vercel `dpl_7zbk1K7gMEFcBbziMypHDLQ8qSoZ` READY：

`https://aipoger-web-rnz8-6yl5jyqlu-yohungs-projects.vercel.app`

先以`--prod --skip-domain`核對API，再promote。apex `https://aipoger.com` 返回218首／102首回歸；`vercel inspect`分別核對apex與www均解析到同deployment。回歸到期只下架展示，容量刪除與Showtime投票篩選另待使用者下一步。
