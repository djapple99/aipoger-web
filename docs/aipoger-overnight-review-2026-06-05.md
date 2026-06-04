# AIPOGER Overnight Review - 2026-06-05

## 今日已完成

- Drop Battle 流程基本跑順：登入後回原入口、戰鬥池卡片可回到正確戰鬥/接戰流程、完成後不再殘留未完成提醒。
- 浮窗廣告與開戰前流程已調整：浮窗可自動循環播放，開打前淡出後接 5 秒預播與音效。
- 右上角帳號提醒已改成頭像 + 小鈴鐺組合，預設收合，不再擋中英切換。
- Battle 結束後帳號訊息、戰鬥池卡片與觀眾五個反應按鈕已整理成更清楚的完成狀態。
- 榮譽榜 Drop Battle 勝利歌曲可播放，但播放器已加 `nodownload`，並禁止右鍵下載入口。
- 成果卡分享縮圖已改成直式 `1080x1920`，包含 WINNER、雙方 VS、AI/觀眾評價與五邊雷達圖。
- 成果卡分享圖 URL 已縮短成 `battleId + v=portrait-20260605a`，降低 Facebook 因超長中文 query 抓不到圖的機率。
- 全站 favicon / SEO 圖示已補齊，搜尋結果前面應可改抓 AIPOGER logo。

## 美術檢查

- 視覺方向仍符合 `docs/aipoger-ui-art-direction.md`：黑底、橘光主能量、青色小面積點綴、金色只用於勝利/榮譽。
- 成果卡直式 OG 圖已本機與線上驗證為 `1080x1920 PNG`。
- 首頁搜尋圖示已新增：
  - `/favicon.ico`
  - `/favicon-48x48.png`
  - `/icon-192x192.png`
  - `/icon-512x512.png`
  - `/apple-touch-icon.png`
- 目前 public 內仍有多個歷史 logo 檔可後續整理，但現階段有些可能被舊分享或快取使用，先不硬刪。

## 大小寫與文案檢查

- 對外品牌字樣以 `AIPOGER` 為主。
- 已修正 AI Music Bible 英文頁少數 `Aipoger` 為 `AIPOGER`。
- `drop` / `抓波` 對外文案已優先使用；內部仍有 `hook` 命名存在，包含：
  - `/battle/hook-cut`
  - `hook-card` query
  - `upload-hook` API
  - `HookBattleRow` 等內部型別
- 這些 `hook` 多屬舊架構與路由相容層，不建議今晚一次硬改，避免破壞既有分享連結、callback 或上傳流程。

## 登入順序檢查

目前登入順序正確：

1. 使用者進入需要登入的入口時，先產生安全 `nextPath`。
2. Auth page 會把 `nextPath` 寫進 localStorage 與 cookie。
3. Google / Facebook OAuth 使用 `/auth/callback?next=...`。
4. Email magic link 也使用同一個 callback URL。
5. `/auth/callback` 讀取順序為 URL `next`、localStorage、cookie，最後才回首頁。
6. proxy 會把錯落在其他頁面的 `?code=` 拉回 `/auth/callback`。

目前仍要注意：

- App 內建瀏覽器可能擋 Google / Facebook，現行 UI 已把 Email magic link 放在前面，並提示 Safari / Chrome。
- 若觀眾回報「登入後回首頁」，優先檢查分享 URL 是否有 `next`，以及 callback 是否被平台內建瀏覽器改寫。

## 舊資料與清理

已清理：

- `public/music/AIPOGER AD1` 與 `public/music/AIPOGER AD1.mp4` checksum 完全相同，已刪除無副檔名重複檔。

保留未刪：

- `.cleanup-backups/`：包含 Supabase / battle / listen-bar 舊備份 JSON，可能仍有救援價值。
- `docs/drop-battle-accept-flow-plan.md`：接戰導流修復規劃文件，仍有流程記錄價值。
- `文件/`：使用者本機 PDF 資料，不屬於本次可安全清理範圍。

## 今天重要 commit / deploy

- `dbce97e` - Refine account notices and battle sharing
- `b2416ea` - Fix result card sharing and rank audio controls
- `6fcaeda` - Use portrait result cards and branded favicon

最新正式部署：

- `dpl_7X9UNWK6Fi6B2UYn2KehXZLjc1aX`

## 明天優先事項

- 用 Facebook Sharing Debugger 對成果卡 URL 重新 scrape，確認 FB 不再吃舊灰圖快取。
- 再跑一次實機登入：未登入觀眾點成果卡 / 戰鬥連結 -> login -> 回原頁。
- 規劃 legacy `hook` 內部命名整理，但要分階段，不要一次改 route。
- 視覺上可再微調成果卡直式圖：如果有 winner cover，優先使用 cover；沒有 cover 時 fallback AIPOGER logo。
- 待確認後再清 `.cleanup-backups/`，不要直接刪 production cleanup backup。
