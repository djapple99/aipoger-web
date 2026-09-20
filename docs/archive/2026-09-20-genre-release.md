# 2026-09-20：14 類音樂已發布，曲風建議待分析服務啟用

## 已完成的正式發布

- 使用者在本機驗證結果後回覆 `do it`，授權發布與分類遷移。
- Web code commit：`e08687e`（主實作 `bb83487`），分支 `codex/genre-suggestions`，已 push。
- Vercel：`dpl_CfrCok6hkdHSv3AGjK7RzNP56zdt`，READY，alias 已確認為 `aipoger.com` 與 `www.aipoger.com`。
- 正式資料庫已套用 `three_music_genres`，migration ledger：`20260920055213`。對應本機檔 `20260920120000_three_music_genres.sql`，不可重複以新 migration 名稱套用。
- 兒歌、Latin / Reggae 拉丁雷鬼、Cinematic 電影配樂已加入共用 14 類選單；15 個播放頻道數依類型表自動計算。
- 分類建議元件與受保護 API 已發布；建議失敗／未配置時保留手動選擇，ID3 曲風不再自動替作者填入。

## 驗證

- 在上一個正式版本 `bc08db9` 建立乾淨 worktree `/tmp/aipoger-genre-release`，只帶入本次變更；原工作區的其他修改原樣保留。
- 完整網站測試 450 pass / 0 fail / 0 skip；PGlite 執行實際 SQL。TypeScript、lint（0 errors / 16 既有 warnings）、本機與雲端 build 通過。頻道數修正後再跑 TypeScript、該頁 lint、本機及雲端 build。
- 正式 SQL 驗證：三個新類型與舊類型都有效；未知值無效；anon/authenticated 沒有新增內部分類函式執行權。
- 正式 `/`、`/auth`、`/listen-bar`、`/music-analysis`、`/battle/setup` 皆 HTTP 200。`/l/12`、`/l/13`、`/l/14` 正確導向新分類並保留語言。
- 曲風 API 在無 token／無效 token 時都回 401。尚未用有效帳號取得正式模型建議。
- 正式中英日韓頁面的播放頻道數均為 15。Chrome 真實 UI 確認 14 類投稿選單；390×844 與 1440×900 無水平溢出，console 無 error。

## 尚未完成：實際音訊建議

- 既有 Render 分析服務 `/healthz` 回 200，但仍是 heuristic/fast analysis 舊部署，未包含啟用中的新 `/api/genre` worker。
- Worker 已在乾淨工作目錄 `/tmp/aipoger-genre-worker-release` 通過 5 項 Python 測試與 lockfile 檢查，commit `c8f7d7f` 已 push 至 `codex/genre-suggestions-worker`；沒有改 Render 現行主分支或啟動部署。
- Render 管理台目前未登入。已在 Chrome 開啟它的既有 GitHub 登入流程並請使用者完成登入；未讀取密碼、cookie 或瀏覽器憑證。
- 等登入後，先確認現有服務方案／記憶體是否足以跑 MS-CLAP；任何新增付費方案都需以具體價格另取得授權。接著安裝 genre extra、啟用 worker、配置兩端 server-only URL／共享 secret、預熱模型並以實際音訊驗證。若修改 Vercel 環境，需重新部署才生效。
- 在上述步驟完成前，自動音訊建議不可視為已可用；作者仍能自行選擇並投稿。不得把目前發布報告說成整個功能完全上線。
