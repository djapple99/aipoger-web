# 精選首頁社群入口與緊湊頁尾 — 2026-10-24

- 應用 `7936c343b03696f8849391134fb9a0b1303ce0c6`，分支 `codex/public-rule-copy`，繼承關於與合作新版 `555b529`。
- Vercel `dpl_85sUMtwJs5VfnJ2qmm2XjfoYEMBR`：READY、production，aipoger.com／www 均綁定此部署。
- 正式入口：https://aipoger.com/?lang=zh#home-community-title 。

首頁底部加入「加入創作討論社群」，Facebook與LINE品牌圖示緊接標題，介紹文字與原投稿／關於／合作連結上提為同一精簡頁尾，移除額外分隔線與大段留白。圖示保留可存取名稱、滑過提示與44px點按範圍；連結沿既有品牌常數，新分頁開啟，沒有新增社群嵌入腳本。依使用者後續確認，Discord先不放在本次首頁入口；既有邀請在官方頁顯示無效，交由使用者檢查。LINE官方邀請頁確認為Aipoger社群。

四語文案與既有站內導覽保留；320px手機探索音樂操作列容許換行，修正較長英文／日文連結原有溢出。

## 驗收

- TypeScript、targeted ESLint、本機webpack正式build通過。全量lint為0 errors／14既有warnings；雲端建置READY。
- 首頁／評論／探索相關23項測試通過；後續精簡版再跑原首頁7項全通過，未新增鏡像測試或重跑無關DB套件。
- 四語桌機及320px手機的標題、原連結與社群入口核對，圖示44×44px、無橫向溢出。正式站四語桌機與手機檢查；為視窗模擬，非iOS真機。
- 正式首頁、apex／www、關於、合作、登入與Battle setup HTTP200；公開discovery正常提供真實1支精選與3首單曲，沒有新增測試留言或愛心。
- 正式中文首頁已載入真實作品、圖示與緊湊頁尾，console error為空。私人畫面與HTTP紀錄位於 `New project/audits/2026-10-24-community-footer/`。
- 本機開發資料服務曾因既有開發環境的Unregistered錯誤回503、analytics回500，正式公開API正常；本輪沒有修改該服務。開發Turbopack不接受既有node_modules外部symlink，驗收改用webpack。

只修改首頁呈現與四語文案，沒有DB／Auth／Credit／作品資料／盲聽／Drop Battle規則變動。
