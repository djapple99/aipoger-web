# 2026-10-15 公開留言署名隱私修復

確認日期：2026-10-15（Asia/Taipei）。使用者指出已設定舞台名稱，公開MV留言卻顯示登入姓名，要求查明並避免本名曝光。現行規則以 `aipoger-product-rules.md` 為準，本檔保存修復與驗收證據。

## 原因與修正

MV與歌曲共用 review API 原本直接讀取登入metadata，未查詢已儲存的舞台名稱；舊歌曲留言另接受客戶端署名，缺少時用Email前綴。Choice／聖經和分享metadata也有相同的不安全回退。

新增 `server-public-identity.ts` 統一名稱來源：先以 `user_profiles.fighter_name` 對齊Profile，只有沒有此值時才核對舊fighter名稱；舊註冊流程從OAuth／Email帶入的預設名稱不作回退。沒有名稱使用一般稱呼；查詢失敗停止送出。既有頭像行為保留。Profile原名稱說明補上「留言、評價」，沒有新增區塊。

本輪不重算排行榜或改變Credit；不更改Auth設定、OAuth帳號姓名或新註冊trigger。既有作品作者、歷史公開署名與手寫策展名稱未批次改寫。本修復涵蓋上述六個服務入口，並非宣稱完成全站個資稽核。

## 已執行資料修復

- 使用驗證的本人帳號與指定留言ID定位，不以同名廣泛匹配。交易內修正1則評論、1則通知、1筆重送receipt的姓名，採用本人當下儲存的舞台名稱。
- 交易斷言：除署名以外的評論欄位、本人評分列和完整Credit流水在修正前後相同。原8.2分保留，沒有重發點數。
- 修復後讀回三處署名一致；本人歌曲／Choice／聖經留言中沒有其本名署名殘留。其餘26則正常舊署名保留。
- 沒有schema migration、資料刪除或Storage變更；限定修復SQL與結果保存在私人audit資料夾，不將本名或Email放進此report。

## 驗證

- 42項相關測試全過：新名稱優先、登入狀態仍保留舊metadata、偽造客戶端名稱、私密fallback、查詢失敗、音樂與MV共用規則、Choice／聖經／分享預覽。
- 完整666項測試：634通過，32既有可選DB略過，0失敗。
- TypeScript、webpack正式build通過；lint 0 errors／14既有warnings。
- 正式原MV評論在桌機與390px手機均顯示正確舞台名稱及原8.2分，無水平溢出或console error；匿名公開GET也讀回修正名稱。五個留言POST入口均維持未登入401。沒有提交測試公開評論。

## 發布

應用commit：`b1afc1b4db2f64523c7307e5187854d2990e9e9c`，分支 `codex/public-rule-copy`。
Vercel：`dpl_4TqowW8DpSxdemgs6hkN4swiHTC6` READY，正式 `aipoger.com`／`www.aipoger.com` 已指向同一SHA。
私人證據：`/Users/huangyihong/Documents/New project/audits/2026-10-15-public-display-name/`。
