# 音樂分析外站工具入口發布證據

發布日期：2026-09-28 Asia/Taipei。依使用者最新決定，只提供三個外站及使用方式，不內嵌工具或收回結果。

- 應用 `52e66c6`，分支 `codex/music-analysis-tools`，已 push。
- Vercel `dpl_EPwbVwxBDdZqYYtSoy5RswCHgdAB` READY，已 promote；以 aipoger.com 查詢解析到相同 ID。
- 部署：https://aipoger-web-rnz8-o2sl81nvn-yohungs-projects.vercel.app
- 正式入口：https://aipoger.com/music-analysis?lang=zh
- 回復基準：前版 Music Bible `ae1f196`／`dpl_J3kTgFEt1nof95Nb2wSvxZ6gcQnr`。

## 範圍

- `src/app/music-analysis/page.tsx`：以三張卡取代未接線分析引擎與示意報告；去除頁面登入阻擋、health 輪詢與 iframe，只保留外站連結、使用說明及返回 Bible。
- `src/lib/music-analysis-tools.ts`：固定外站 URL、官方資訊來源、核對日期，以及中英日韓用途、免費範圍、使用步驟。
- `src/components/ai-music-bible-page.tsx`：practice map／toolbox 入口介紹改為外部工具。
- 無新增 API、付費服務、套件、SQL、環境變數或資料寫入。原 Bible 全部內容及保護不變，獨立曲風建議 API 未修改。

## 官方依據

核對 2026-09-28：

- [Tunebat](https://tunebat.com/analyzer)：免費 Key／BPM；進階情緒指標與下載屬 Pro。基本音檔分析在瀏覽器執行。
- [Loudness Penalty](https://www.loudnesspenalty.com/)：免費網頁音量調整分析，官方表示音檔不會上傳。數值不是母帶目標或品質分數。
- [Cyanite FAQ](https://cyanite.ai/faq/)：需帳號，Web App 每月免費 5 首且功能有限；超出額度需付費，音檔上傳至其服務。

已透過實際瀏覽器確認 Tunebat 檔案選擇器與 Free／Pro 比較、Loudness Penalty 檔案入口、Cyanite 帳號入口。未使用使用者音樂執行外部分析、未註冊或購買，不將官方宣稱當作已實測的準確率。

## 驗收

- 全套 478 tests：447 passed、31 原有 optional DB skipped、0 failures。
- TypeScript、本機 production build 及 Vercel build 通過；完整 lint 0 errors／16 既有 warnings，最終修改檔案 lint 0 errors／0 warnings。
- 本機中英日韓與手機版正常；實際 viewport 寬 375、scrollWidth 375，無水平溢出。
- 正式頁三個工具入口、零 textbox、零 iframe；已登入及未登入皆為純導覽。沒有貼回資料或下載筆記功能。
- 正式站首頁、auth、listen-bar、music-analysis、battle/setup、ai-music-bible 健康檢查，並核對外站連結與四語 UI。
- 正式截圖放在使用者指定資料夾 `/Users/huangyihong/Desktop/Suno小技巧/AIPOGER-分析工具入口-20260928.png`。

限制：第三方免費額度與可用性可能變更；沒有承諾分析品質或對音樂的主觀判斷。配額與網址變更時直接更新集中管理的工具文案。
