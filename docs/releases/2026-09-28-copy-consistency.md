# 2026-09-28 全站文案一致性修正

- 應用：`3618ef7`，分支 `codex/music-analysis-tools`，已 push。
- 正式部署：`dpl_9u5dxcQCnJFYfWkvUotFaLNZEspc`，READY，已 promote；以 `aipoger.com` 查 deployment 確認指向同一版本。
- URL：`https://aipoger-web-rnz8-7vipe8ugg-yohungs-projects.vercel.app`。
- 前版可回復部署：`dpl_EPwbVwxBDdZqYYtSoy5RswCHgdAB`（app `52e66c6`）。

## 修正與範圍

使用者指出 Music Bible 六步流程仍叫人上傳至 A&R Gate。搜尋整個 src／public 的分析、認證、生存、APC 相關文案，對照現行產品正文後修正：

- `src/lib/suno-practice-library.ts`：第三步改「三種分析工具」，列明 Tunebat BPM／Key、Loudness Penalty 串流音量、Cyanite 曲風情緒；按需使用，不要求三站通過。第五步改 Showtime 月榜及收藏的公開可播放歌曲製作 Choice，移除認證門檻。
- `src/components/suno-practice-library-section.tsx`：同步中英摘要，新增 `/music-analysis?lang=<locale>` 入口；維持收合與原章節 ID。
- `src/lib/suno-reference-guide.ts`：準備發表提示移除 A&R 與認證前置路線。
- `src/lib/i18n.tsx`：四語分析按鈕統一為分析工具，移除英文 A&R Check。
- `src/app/page.tsx`：四語酒吧提示改為持續公播及投稿，移除 Survival Bar。
- `src/app/battle/result/battle-result-client.tsx`：分享結果卡移除 +188 APC 承諾。
- `src/app/battle/page.tsx`：移除把 public_vote_score 當 APC 獎勵的顯示；原資料與投票計算保留。
- `src/components/global-battle-call-overlay.tsx`：移除 APC POT 標章；保留配對資料相容型別與行為。
- `src/app/api/battle-pool/attempt-matchmaking/route.ts`：新配對通知改為找到對手／確認參戰，不再用公測免 APC 話術；不重寫歷史通知。
- `src/app/battle/hook-cut/page.tsx`：內部註解改為 APC 尚未啟用，無功能變更。
- `tests/ai-music-bible.test.mjs`：移除原本強制保留 A&R 的過時斷言，核對三種工具雙語內容。
- `tests/public-copy-consistency.test.mjs`：掃描 src／public，防止這次確認已退役的公開承諾再次混入。

未改 Prompt、配方、歌曲、收藏、勝敗、月榜計分、歷史豁免欄位或會員權限。沒有 SQL、環境、API key、依賴或第三方服務變更。歷史資料相容欄位與實際 Explore 退役規則未刪除；不把 legitimate ear checks 或對戰 Challenger 字眼當錯誤移除。

## 驗收

- 全部 479 項測試：448 通過、31 原有可選 DB 測試略過、0 失敗。
- TypeScript 通過；lint 0 errors／16 既有 warnings；本機及 Vercel build 通過。
- 正式 Chrome 會員頁實測中英六步流程及新工具連結。API 資料載入後 163 Prompt moves、21 lyric moves、1,519 indexed references、38 台語條目正常；第三及第五步為新版文字。
- 工具頁三個固定外站 href、另開分頁與 noopener noreferrer 正確；中英連結保留語言。
- 正式首頁使用鍵盤聚焦酒吧入口，確認新公播／投稿提示；此次瀏覽 console 未見 error。
- 390×844 工具頁單欄正常、無水平溢出；重設驗收 viewport。
- 正式 `/`、`/auth`、`/ai-music-bible?lang=zh`、`/music-analysis?lang=zh`、`/listen-bar`、`/ai-music`、`/rank`、`/battle`、`/battle/setup?lang=zh` 均 HTTP 200。
- 截圖：`/Users/huangyihong/Desktop/Suno小技巧/AIPOGER-六步流程修正-20260928.png`。

邊界：本次全站為原始碼／文案一致性掃描，實機回歸聚焦修改入口；未為驗收建立真實戰鬥、投票或重寫正式資料，不宣稱所有帳號狀態與業務流程都完成端到端測試。第三方分析品質與免費額度沿用同日已核對的工具入口版本，本次不重新上傳使用者歌曲。
