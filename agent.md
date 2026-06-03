# 愛波哥私人介紹文檔

> 最後更新：2026-06-03
> 本文件由 Mavis 維護。修改前請確認沒有覆蓋使用者既有變更。

## 執行前必讀

每次在本 project 中開始執行任務前，請先閱讀本文件，並以本文件的指引作為優先參考。

相關延伸文件（按需搭配讀）：

- `CURSOR_TODO.md` — 任務清單、待跑 SQL、修復細節。
- `docs/aipoger-ui-art-direction.md` — 視覺與文案規範（做 UI / 改文案前必讀）。
- `docs/aipoger-product-rules.md` — 產品規則。

## 使用者背景

- 使用者稱呼與品牌核心：愛波哥。
- 使用者是住在台灣的資深 DJ。
- 主要語言偏好：繁體中文。
- YouTube 頻道名稱：愛波哥cheers。
- YouTube 頻道網址：https://www.youtube.com/@djapple2000
- 頻道內容重點：Suno 音樂使用教學、AI 音樂創作、音樂 MV 相關內容。
- 使用者喜歡藝術、設計，以及有美感與風格的呈現。

## 目前專案方向

使用者正在開發一個網站：`aipoger`，中文概念為「愛播歌」。

網站主要目標：

- 推廣 AI 音樂。
- 讓喜歡音樂的人可以使用 hook 進行 battle。
- 透過 battle 賺取點數。
- 讓 AI 音樂創作變得更好玩、更有參與感、更有社群感。

## 技術棧速查

> 給接手 agent 快速對齊用，避免每次重新撈 `package.json`。

- **Frontend**：Next.js 16.2.4（App Router）+ React 19.2.5
- **Language**：TypeScript 5.8.3
- **Styling**：Tailwind CSS 4.1.5
- **Backend / DB / Auth / Storage**：Supabase（`@supabase/supabase-js` 2.104）
- **Audio**：wavesurfer.js 7.12.6（波形 / 播放）
- **Image**：react-easy-crop 5.5.7（頭像裁切）
- **Deploy**：Vercel
- **Lint**：ESLint 9（`eslint-config-next`）
- **Test**：`node --test --experimental-strip-types tests/*.test.mjs`（純 node test，不是 jest/vitest）
- **Domain**：`aipoger`（已購買）
- **Supabase URL**：`rwueinzgjaaefjvmsyem.supabase.co`
  （⚠️ 容易打成 `rwueinzgjae**f**jvmsyem` 少一個 a，配置 OAuth / redirect URI 前請 double-check）

### 重要目錄

- `src/app/` — Next.js App Router 頁面（`battle/`、`listen-bar/`、`watch/`、`profile/`、`admin/` 等）
- `src/components/` — 共用組件（頭像裁切、語言切換、BGM、Hook 剪輯、分享按鈕等）
- `src/lib/` — 業務邏輯（supabase client、brand、battle rules、listen-bar、i18n、auth 等）
- `supabase/` — DB 與 Storage 遷移檔（按時間前綴命名，不要隨意改舊檔；新檔加新前綴）
- `docs/` — 產品、發佈、UI 方向文件
- `tests/` — `*.test.mjs` 純 node test

### 雷區（過去踩過的）

- `.env.local` 包含 Supabase key，已從 git 追蹤排除；GitHub push protection 會擋，需要在 Settings 允許或從 history 移除。
- 設定 Supabase redirect URI 時一定要核對 URL 拼法（見上 ⚠️）。
- 跨日 / 跨時區的排程邏輯請用 Supabase 端時間，不要只信 client 端。
- macOS 臨時目錄（`/var/folders/...`）的路徑無法直接讀取，分享截圖前請先複製到 `/tmp/`。

## 溝通偏好

- 使用繁體中文回覆。
- 答案要直接，不要繞圈。
- 先給結論，再補必要細節。
- 少講空話，多給可執行的建議或直接完成任務。
- 對設計、品牌、視覺、音樂與創意相關內容，可以更有品味與觀點。
- **「do it」是直通指令**：使用者說「do it」時，表示同意按 Mavis 的判斷直接開幹，不再逐項確認。

## 協作邊界

預設情況下，下列事項**直接做、不再問**：

- CRUD 邏輯、UI 微調、文案與 i18n 字串修改、元件重構。
- 套件升級、TypeScript / ESLint 警告清理。
- 文件、`CURSOR_TODO.md`、`agent.md` 維護。
- 補測試、寫 migration 草稿（不直接跑在 production）。
- 任何「可逆、可重來、不花錢、不影響真實資料」的事。

下列事項**先確認再開幹**：

- 任何會**動到付費 / 第三方帳號 / 真實用戶資料**的操作（生產環境 SQL、刪資料、發信、刷資料）。
- 會**修改商業邏輯核心**的決策（battle 規則、計點、晉級、勝率判定、是否破例承認 no contest）。
- 涉及**對外承諾 / 上線時程 / 公開品牌**的內容（社群公告、release notes 標題、視覺主視覺定稿）。
- 與使用者個人品牌（愛波哥、YouTube 頻道）相關的對外發言。

判斷口訣：能復原 → 直接做；不能復原 / 影響面子或鈔票 → 確認一次。

## 工作原則

- 先理解目前 project 結構，再進行修改。
- 修改前確認相關檔案內容，避免覆蓋使用者既有變更。
- 優先遵循本 project 既有的命名、格式與架構。
- 若需求不明確，先做合理假設；若風險高，再向使用者確認。
- 完成後簡要說明修改內容與驗證方式。
- 跨網站設計、後端邏輯、業務規則、視覺風格、品牌文案時，都應帶入音樂感、舞台感、創作者社群、battle 氛圍與品牌記憶點——不只 UI 本身。

## 視覺風格指引

> 完整版見 `docs/aipoger-ui-art-direction.md`。本節只放最高頻的幾條錨點，**做 UI / 改文案前請先讀完整版**。

### 核心氛圍

- 要的感覺：AI 音樂 + DJ 文化 + 夜舞台 + 創作者對決 + 公共電台 + 帶點情緒的音樂社群房間。
- 不要的感覺：通用 SaaS dashboard、純上傳工具、股票音樂市集、冷冰冰的排行榜、米白創作者作品集。

### 視覺基調

- 黑或近黑底。
- 橘光為主品牌能量。
- 青色作為小面積電氣感點綴。
- 金 / 黃只用於榮譽、晉級、重點紀錄。
- glow / border / glass 效果要克制，避免影響可讀性。

### 高頻詞彙（中文文案直接用）

`公播`、`挑戰池`、`正在拼人氣`、`榮譽榜`、`勝利榜`、`熱播`、`封存紀錄`、`聽眾反應`

### 高頻禁忌

- 不要把 Bar Heartbreak 講成排行榜。
- 不要把 Challenger 講成等待室。
- 不要用過多 admin / PM 語氣。
- 不要寫空洞的行銷口號。

## AIPOGER Battle 帳號限制規則

- 每個帳號**同時**可以擁有：
  - **最多 1 場 24H Full Song battle**
  - **最多 1 場 Drop battle（90 秒）**
- 兩種類型可以**並行**（同時間各 1 場）
- 同類型**不能並行**（譬如同時開 2 場 Drop battle 不行）
- 「開新一場」的條件：同類型的現有 battle 必須是 `finished` / `cancelled` / `cancelled_no_challenger` / `cancelled_founder` 其中之一
- 這個限制在 `src/lib/daily-battle-rules.ts` 跟 battle_pool 邏輯中實作

## AIPOGER Battle 結果判定記憶

- 所有 AIPOGER 比賽規則一致：如果整場比賽沒有任何觀眾投票（0 票、0:0），一律判定為 no contest / 未分勝負。
- 0 觀眾票的 no contest 場次不產生成果卡、不寫入榮譽榜、不應被視為勝場或可展示成果。
- 只要有至少 1 張觀眾票，比賽就可以產生成果；若雙方同票，才可使用穩定決勝規則產生 winner，讓成果卡與榮譽榜資料完整。
- 不要把「有觀眾的同票」和「完全沒觀眾票」混為一談。前者可成立 battle 結果，後者沒有市場驗證，不應進入 AIPOGER 認可紀錄。

## 待辦事項

> 高層次 roadmap。詳細 SQL / 修復清單見 `CURSOR_TODO.md`。

- [ ] 首頁 / 登入頁 i18n 雙語支援
- [ ] 頭像上傳到 Supabase Storage
- [ ] Realtime 啟用（Database → Replication）
- [ ] 觀戰頁（列出 live battles）
- [ ] 投票功能完整串接
- [ ] 每日簽到點數
- [ ] 段位 / 天梯系統（15 級）

## 備註

如需新增專案專屬規則，請直接補充在本文件中，並更新「最後更新」日期。
