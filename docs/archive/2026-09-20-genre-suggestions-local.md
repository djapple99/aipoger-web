# 2026-09-20 曲風建議與三個新分類 — 本機完成，未部署

使用者確認：先給曲風建議，由上傳者自行決定是否接受。新增兒歌、Latin／Reggae／Reggaeton 合併類及電影配樂。本次延續「先不部署」範圍。

## 已完成

- 傷心酒吧投稿在選擇音檔後自動抽取最多 21 秒音訊，透過需登入的同源 API 交給既有分析服務的新 `/api/genre`。分析器實際使用 MS-CLAP 比較 14 類，不以歌名／檔名猜測。
- 建議區最多三項；只有明確按「採用建議」會填入類型。手動選單始終可用，採用後可更改；不再自動填入 ID3 曲風。略過、無法判斷、無法解碼、逾時與服務不可用均不阻擋手動投稿。
- 換檔、登出或略過會取消／忽略舊請求；投稿成功清除建議。投稿中禁止更換音檔或採用新的類型，保留提交時的選擇。
- 共用音樂分類從 11 增至 14：`Children's Music 兒歌`、`Latin / Reggae 拉丁雷鬼`、`Cinematic 電影配樂`。共用選单、API 驗證及耳朵蟲結果可使用新類型。中英日韓類型標籤已補齊。
- 原 `/l/1` 至 `/l/11` 不改；新增 `/l/12`、`/l/13`、`/l/14`。準備增量 SQL，更新月榜 canonical/valid genre 函式，不改歌曲或冻结榜單。
- 分析 API 不寫入歌曲、戰績、Heart、投稿額度或分類結果。Worker 使用私人暫存片段並自動清除，不放入公開 `/media`。

## 驗證

- 網站完整測試：449 pass，0 fail，0 skip（包含隔離 PGlite SQL 測試）。隨後新增的短連結路由測試與曲風/API 測試專項共 8 項通過。
- Python 5 項測試通過：音訊驗證、靜音棄答、分類結果、頻率限制、真正本機 HTTP handler 的權限與錯誤處理。
- TypeScript 通過；lint 0 errors / 16 既有 warnings。
- Next build 通過。原 `.env.production.local` 的 Supabase URL 格式無效，建置時只在子程序覆用 `.env.local` 中的有效 URL，未修改任何環境檔。既有建置憑證使 sitemap 的 Choice 資料讀取回報 `Invalid API key`，未阻擋建置；這不代表已驗證正式登入與完整 sitemap 資料。
- Playwright 使用真實 React 元件、瀏覽器 Web Audio 抽樣與隔離 session/API fixture，驗證手動選擇不被覆寫、明確接受、接受後改選、略過、A→B 換歌舊結果、登出、失敗／重試及無建議狀態。未用真實帳號投稿，也沒有把 fixture 加進產品路由。
- 中英日韓各驗證 390×844、1440×900；無水平溢出，建議按钮触控高度至少 40px。截圖位於本機 `output/genre-qa/`；視覺人工檢閱中文手機畫面。Console 只有測試靜態伺服器 favicon 404，無元件錯誤。
- 實際模型以現有音訊執行；電影交響例輸出 Cinematic、metalcore 例輸出 Rock、ambient 例輸出 Ambient。Disco 例的 EDM 與 Disco 候選接近；hip-hop/trap 例仍傾向 K-Pop/R&B。這是少量 smoke checks，不是有人工真值的準確率評測。英文短類名與描述雙提示已降低單一廣義流行類的偏差，但混合曲風、語言與使用情境仍需作者判斷。

## 尚未上線的條件

1. 取得部署授權後，套用 `supabase/migrations/20260920120000_three_music_genres.sql`，驗證 14 類月榜篩選。
2. 在分析服務安裝 `genre` optional dependency；Docker 使用 `INSTALL_GENRE=1` build arg。設定 `AIPOGER_GENRE_ENABLED=1`，預熱模型並測量目標主機資源／延遲。
3. 網站設定 server-only `MUSIC_GENRE_ANALYSIS_URL`，網站與 worker 配置相同的 `MUSIC_GENRE_ANALYSIS_SECRET`。缺少配置時只顯示可手動選擇的不可用狀態。
4. 核對正式環境設定，部署後以真實登入帳號驗證整條建議流程。若擴為多 worker，先把每人頻率限制移到共用儲存。

本次沒有 push、正式部署、生產 SQL 或付費 API 呼叫。分析服務配置與限制見私人工作區 `tools/music-analysis/DEPLOY.md`。既有工作區大量無關變更保留，沒有整批提交。
