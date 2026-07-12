# 愛波哥私人介紹文檔

> 最後更新：2026-07-10
> 本文件由 Mavis 維護。修改前請確認沒有覆蓋使用者既有變更。

## 執行前必讀

每次在本 project 中開始執行任務前，請先閱讀本文件，並以本文件的指引作為優先參考。

相關延伸文件（按需搭配讀）：

- `CURSOR_TODO.md` — 任務清單、待跑 SQL、修復細節。
- `docs/aipoger-agent-brief.md` — 給新 AI agent 快速理解 AIPOGER 部署、規則、願景的簡介。
- `docs/aipoger-ui-art-direction.md` — 視覺與文案規範（做 UI / 改文案前必讀）。
- `docs/aipoger-product-rules.md` — 產品規則。

## MD 文件精簡規則（2026-06-10）

不要每次任務都讀完整 `docs/`。先按任務選核心文件：

- 一般網站修改：先讀本檔 + `docs/aipoger-product-rules.md`。
- UI / 文案 / 視覺：加讀 `docs/aipoger-ui-art-direction.md`。
- 部署 / QA：加讀 `docs/aipoger-release-checklist.md`。
- 傷心酒吧規則：加讀 `docs/heartbreak-bar-v1-survival-radio.md`。
- Drop Battle 當前規則：以 `docs/aipoger-product-rules.md` 為準；舊 plan / task list 只當歷史參考。
- 榮譽榜延伸、成就卡、profile badge 等草案文件，只有做對應功能時才讀。

若文件內容衝突，優先順序為：使用者最新指令 > `docs/aipoger-product-rules.md` > 本檔 > release checklist > 舊 spec / plan / handoff。

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
- 讓喜歡音樂的人可以使用 drop / 抓波進行 battle。
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
- 傷心酒吧新投稿音檔只接受 MP3 / M4A / AAC / OGG，單檔上限 30MB；不要把它接回官方守門 Drop 的 100MB / WAV / AIFF 標準音檔政策。
- 現行正式音樂類型是 11 類；`台語熊high` 是正式類型，不是舊 alias。探索 AI 音樂、傷心酒吧、Drop Battle、Showtime、後台統計與 genre normalize 必須共用同一套類型。
- 公開音樂頁的愛心公開資訊只顯示總愛心數；不要顯示收藏人數、誰收藏、或把收藏管理放到前台。Heart 按鈕可以為已登入使用者亮起，表示這個帳號在 24H 冷卻內已送過 Heart；按 Heart 等同 24H 支持並同步收藏，自己的收藏管理放在 Profile / 後台。探索 AI 音樂與傷心酒吧同一首歌必須讀寫同一個 `listen_bar_tracks` 總愛心數，不可分成兩套統計。
- 探索 AI 音樂底部 mini player 要有可拖曳播放進度條、時間標示與「歌詞」HUD；歌詞 HUD 在播放器上方彈出，旁邊提供可拖動的歌詞瀏覽滑桿，不要把歌詞展開到作品卡或列表中。
- 探索 AI 音樂的新歌曝光不做獨立 `最新上架` / `New Arrivals` / `72 小時新歌` 橫列、路由、看更多或 NEW 分類。符合展示條件的新歌以 `created_at`（不可用 `updated_at`）在 72 小時內排到自己的 genre lane 最前面；含新歌的 lane 依最新新歌 `created_at desc` 前推，沒有新歌的 lane 維持現行 11 類順序。同類型收合前 6 張中，同創作者最多一首 fresh work，其他仍留在該類型的看更多；完整展開仍是新歌優先、再依公開正向反應與時間排序。
- 探索 AI 音樂是 cover-led 音樂目錄，不可再做 PPT 式大型 masthead。`Live Drop Signal`、fake waveform、60s ready 儀表、dashboard 統計與三欄首屏玩法說明不得壓在作品前。作品瀏覽可在同頁切換 `依類型 | 正在升溫`；正在升溫只依近 7 日不同帳號 Heart 支持、已成立正式 Battle 的非參賽者有效票、最近合格互動與 created_at/id 排序，不使用 all-time Heart、假播放數、mock score 或黑箱 Heat Score。Showtime 可列出但顯示 SHOWTIME 並不可攻擂；無近期訊號的作品只標示正在累積、不給假排名。
- 探索 AI 音樂頁首是 compact 的中央目錄舞台：eyebrow、實際作品數的 `[作品庫]` marker、主標、黃色副標與投稿提示、跨頁導覽、`依類型 | 正在升溫` 都以同一中央軸排列，桌機與手機首屏仍要看到作品。固定 `/guide.png` icon-only GUIDE（tooltip / accessible name 為 `這裡怎麼玩？` / `How this works`）開啟可及 HUD，不可回到可見 `<details>` 說明；HUD 支援 X、Escape、backdrop、焦點圈與回焦，解釋 Heart 同步收藏、接戰守擂 60s Drop、3 位非參賽者投票與 Showtime 不再接戰。Explore 作品分享必須使用 `/ai-music?lang=<lang>&track=<id>#works`，載入後展開目標類型並定位作品，不能導回傷心酒吧或自動播放。
- 三個音樂展示面的定位不可混淆：傷心酒吧是 AI 音樂公播池與投稿入口；探索 AI 音樂是公開上傳作品牆；Showtime 是認證作品庫。Showtime 作品入選後不再接受挑戰，也不適用 8 敗退場。未進 Showtime 的探索作品若開放守擂並守下 6 場正式探索攻擂，進入 Showtime；同一挑戰者對同一首歌最多計入 1 次守擂成功。未進 Showtime 的探索作品若累積 8 場正式敗績，會從探索公開牆退場並停止接戰。以上只計入至少 3 位非參賽者投票成立的正式戰績；拒絕、超時、觀眾不足、未開打、自定開戰不算。
- Showtime 前台一律是認證作品目錄，不再分舊 Drop 勝利 / Bar 熱播分榜或 source tabs；所有正式 Battle 認證、探索守擂認證與傷心酒吧公播認證作品統一展示，認證來源寫在單首歌介紹內。`AIPOGER Choice` 只在作品目錄後方以薄策展列展示已發布的人工選曲與 `#choice-weekly` 舊連結錨點，不做上方大卡、排名或第二張榜。`/admin/showtime` 只管理認證與公開展示收回／恢復，不改音檔、Battle 戰績、票數、Heart 或重新開戰；`/admin/choice` 只從公開 Showtime 作品建立每週 5-10 首的人工 Choice、排序與發布／撤回。
- 探索 AI 音樂作品卡右上角紅色斜角 `接戰` 是狀態角標，不是按鈕；只有真正可被攻擂的作品顯示。底部 `攻擂` 才是發起挑戰的操作。未準備守擂 Drop、僅展示、暫不接戰、已進 Showtime、已退場、hidden / removed / moderation hold 或不可播放作品都不可顯示 `接戰`。
- 每日推薦歌 / Daily Spotlight 已退役：不再是傷心酒吧、Explore、`/admin/listen-bar` 或社群發布工作流，也不建立新的單曲 Spotlight 替代品。`/today` 只保留歷史連結相容並固定導向 `/rank?lang=<lang>#choice-weekly`；`/listen-bar?spotlight=...` 必須正常開啟一般公播。`AIPOGER Choice` 是唯一人為策展方向，每週 5-10 首、不排名、可跨類型；`/admin/choice` 是 Choice 選曲管理，`/admin/social` 仍是唯一社群草稿、批准與手動發布中控台。
- 傷心酒吧首屏右上角不要堆主要 CTA；`我要播歌`、`分享吧台`、`AI 音樂鬥歌場`、`榮譽榜` 放在下方 action strip，`練功聖經` / `關於愛波哥` 不放在該區。傷心酒吧分享要用 `/l/all` 或 `/l/{genreIndex}` 短網址，分類分享必須回到同一播放類型。
- 傷心酒吧首屏招牌不可改成含中文字的圖片字，因為語言切換會失效；主標、副標與 `AIPOGER RADIO` / `BAR HEARTBREAK` 必須用 live text。手機版 action strip 第一排放 `我要播歌`、`分享吧台`、`榮譽榜`，第二排 `AI 音樂鬥歌場` 置中。
- 傷心酒吧手機音量不能只改 `<audio>.volume` 後就視為完成；對鎖住媒體音量的手機瀏覽器，使用者觸碰音量滑桿後要改用 Web Audio gain 控制，且恢復播放時同步恢復 audio context。若瀏覽器連 gain 都不可用，才提示搭配手機側邊音量鍵。

## AIPOGER Battle 帳號限制規則

- 每個帳號**同時**可以擁有：
  - **最多 1 場 24H Full Song battle**
- Drop battle（最多 60 秒）拆成兩種可並存狀態：
  - **最多 1 張自己開的 Drop 戰帖卡 / founder state**
  - **最多 1 場正在挑戰別人的 Drop / challenger state**
- 24H Full Song、Drop founder、Drop challenger 三種狀態可以**並行**。
- 同一種狀態**不能並行**。例如已經開一張 Drop 戰帖卡，就不能再開第二張；已經接一張別人的 Drop 戰帖，就不能再接第二張。
- 一般 Drop Battle 允許創作者指定挑戰自己的公開戰帖卡，用兩首同類型歌曲請觀眾投票比較；但自動隨機配對不應主動把同一帳號配給自己。
- 「開新一場 / 接新一場」的條件：同狀態的現有 battle 必須是 `finished` / `cancelled` / `cancelled_no_challenger` / `cancelled_founder` / `completed` / `expired` 其中之一。
- 觀戰自由，不要求登入；留言、投票、互動、取消挑戰等會寫入資料或影響戰鬥狀態的操作必須登入。
- 這個限制在 `src/lib/daily-battle-rules.ts` 跟 battle_pool 邏輯中實作

## AIPOGER 官方守門 Drop 規則（2026-06-19）

- 官方守門 Drop 是最多四張 owner 管理的常駐模板卡，放在鬥歌池讓任何人挑戰。
- owner 只在後台上傳守門歌、裁切 60 秒內 Drop、設定類型、封面、歌詞、啟用 / 停用；owner 不設定開戰時間。
- 後台設定官方守門 Drop 的類型時，必須使用與 Battle 上傳一致的固定類型選單，不使用自由手打，避免鬥歌池 / 成果牆 / 榮譽榜分類不一致。
- 官方守門 Drop 音檔上傳沿用標準音檔限制：MP3 / WAV / AIFF / M4A / AAC / OGG，單檔上限 100MB，並必須進 60 秒 Drop 裁切器後再保存。封面沿用標準圖片格式，上限 10MB；歌詞可選填或匯入文字檔。
- 正式站必須先套用 `supabase/20260618_official_gatekeeper_drops.sql` 與 `supabase/20260619_official_gatekeeper_media.sql`，否則後台只能看到預設卡，不能完整保存音檔、封面、歌詞或啟用卡片。
- 挑戰者點「挑戰這首 Drop」後，上傳自己的 Drop，並由挑戰者設定 10 / 15 / 20 分鐘或 24 小時內自訂開戰時間，方便自己約人投票。
- 每次挑戰都會產生一場新的 Battle Room：系統複製官方 defender queue，再建立挑戰者 challenger queue。官方守門音檔、歌詞、封面必須帶進 defender 端，讓開出來的卡可以像一般擂台一樣進場觀戰、播放、看歌詞與分享。原本四張官方卡不能被消耗或消失。
- 官方 defender queue 不應佔用 owner 的個人 active Drop Battle 名額，也不應像 owner 親自參戰一樣通知 owner。
- owner/admin 可以挑戰自己上傳的官方守門 Drop；這種情況下仍只把挑戰者側算入 personal challenger active intent。
- 鬥歌池官方守門卡要顯示實際歌曲名稱、GATE 與類型徽章，並只提供與一般 Battle 卡一致的 5 秒預播；不可在鬥歌池卡片上提供完整音檔播放器。歌詞可存於模板並帶進戰場，但不需要在鬥歌池卡片上展開。
- 官方守門 Drop 與一般 Drop Battle 門檻一致：0-2 位不同非參賽聽眾皆為觀眾不足 / no contest，不產生成果卡、不進 Showtime、不寫勝敗；3+ 位不同非參賽聽眾才是正式結果 / Showtime 資格。

## AIPOGER Drop Battle 流程記憶（2026-06-03，2026-06-19 更新秒數）

- Drop Battle 裁切上限為 60 秒；可剪短，不強制剪滿。對外建議範圍是 30-60 秒，讓作品有足夠時間到達爆點，但仍保持 battle 節奏。
- Drop Battle 不再使用獨立 waiting room / 預等區。使用者開戰帖或進戰帖後，應直接進 `/battle/[id]` 戰場，在戰場裡看倒數、聽 5 秒預播、聊天預測；時間到後直接猜拳開打。
- 開戰時間可選 10 / 15 / 20 分鐘後。若正式 Supabase 尚未有 `scheduled_start_at` / `cancellation_evaluation_at` 欄位，程式必須用 `expires_at` fallback 保存與推算時間，不可再出現「選 10 分鐘後卻變明天」。
- 快速開戰時間是「戰帖發布成功後 + 10 / 15 / 20 分鐘」，不是使用者剛點快速選項的時間；自訂時間才是固定絕對開打時間。
- 在開戰時間內，發起者與觀眾都可以離開再回來；戰場狀態不應要求使用者留在預等頁。
- 戰場的 5 秒 teaser 對外中文標示統一用「預播」，並用紅底白字呈現；不要再用不清楚的 `PLAY 5S`。戰鬥卡、邀請卡、分享預覽也要同步用「5 秒預播」。
- 分享 Battle 的文案要包含發起對戰者名、歌名、開戰時間、類型 / 風格與 5 秒預播邀請；分享網址必須盡量短，Drop arena 優先用 `/b/{shortId}`，Drop 成果卡用 `/r/{shortId}`，24H queued card 用 `/d/{shortId}`，24H live battle 用 `/h/{shortId}`。
- 戰場中點雙方頭像觸發的 emoji 反應，必須全場 Realtime broadcast，讓雙方與所有觀眾都看得到，不可只留在本機畫面。
- 投票 UI 不顯示假進度條或預設 50% 條。投票提示要明確寫「投票請按愛心」；最終揭票時可以顯示票數，但不要用沒有意義的進度條誤導觀眾。
- 正式開打前最後 5 秒要有舞台感倒數與 announcer 音效 / 文案：`Ladies and gentlemen, fighters!`。正式音檔使用 `/public/sfx/drop-battle-announcer.wav`，這是 battle 氣氛的一部分，不是一般 countdown。
- 使用者人在 battle arena 裡時，不應再跳出全域「是否接受挑戰 / 找到對手」提示框；這會打斷戰鬥。全域 Battle 提醒只應在非戰場頁協助回場或清理。
- Battle 結束後必須清場：達到 3 位不同非參賽聽眾並產生成果卡時，`battles` 應進 `finished`，兩邊 `battle_queue` 應進 `completed`；0-2 位觀眾不足 / no contest 則應走 `expired` / no contest 清場，不產生成果卡、不進 Showtime、不寫勝敗。
- 鬥歌池與右上角帳號提醒都不應殘留已完成 / 已過期 / 已取消的 Drop Battle。若看到 `matched` queue 殘影，要檢查 linked battle 是否已 `finished` / `expired`，並優先清 queue 狀態與未讀 `battle_matched` 通知。

## AIPOGER Drop Battle 連戰挑戰記憶（2026-06-07）

- Drop Battle 宣布有效 winner 後，先給全場 5 秒倒數詢問是否有人要挑戰擂主。
- 5 秒只用來搶挑戰資格；有人按「我要挑戰擂主」後，挑戰者取得挑戰席，再給約 120 秒上傳歌曲與分享挑戰連結，不要求 5 秒內完成上傳。
- 若有人挑戰，上一場 winner 變成守擂方 / 擂主，勝出 drop 暫留場上；戰鬥池中的卡片先不清掉，狀態顯示「熱鬥中」或「擂台熱鬥中」。
- 120 秒備戰期間，觀眾畫面應顯示挑戰者準備中、擂主守擂中、倒數與分享入口，讓人留在場內等下一場。
- 若 5 秒倒數結束沒人挑戰，直接自動進成果卡，不停留在守擂倒數畫面。
- 若 120 秒內挑戰者沒有完成上傳，挑戰失效，釋放挑戰席，回到原本結算 / 清場流程。
- 如果上一場是 0:0 no contest，不能產生擂主，也不應進入 5 秒挑戰流程。
- 第一版先做一位挑戰者接入；排隊、多位挑戰者、連勝加成與觀眾集氣可放第二階段。

## AIPOGER Battle 結果判定記憶

- 所有 AIPOGER 比賽規則一致：如果整場比賽沒有任何觀眾投票（0 票、0:0），一律判定為 no contest / 未分勝負。
- 0-2 位不同非參賽聽眾的 no contest / 觀眾不足場次不產生成果卡、不寫入 Showtime、不應被視為勝場或可展示成果。
- 只有至少 3 位不同非參賽聽眾投票，比賽才可以產生成果。一般 Drop 同票可使用穩定決勝規則；探索 AI 音樂攻擂同票時關主（fighter_a）勝。
- 不要把「有觀眾的同票」和「完全沒觀眾票」混為一談。前者可成立 battle 結果，後者沒有市場驗證，不應進入 AIPOGER 認可紀錄。

## 探索 AI 音樂守擂接戰記憶（2026-07-09）

- 探索 AI 音樂的可挑戰作品必須先來自 AI 音樂公播池 / 傷心酒吧 `listen_bar_tracks` 資料流，不從舊 Drop 挑戰池直接產生作品卡。
- 創作者在 Profile 管理每首公播歌的接戰狀態：`僅展示`、`等人挑戰`、`自定開戰`。
- `等人挑戰` 必須先切好 / 指定守擂 60s Drop。沒有守擂 Drop 時，探索頁不可亮起挑戰按鈕，Profile 顯示 `尚未準備守擂 Drop` 並導向 Drop 裁切 / 指定流程。
- 挑戰者送出探索攻擂邀請時，系統必須鎖定關主當下的守擂 Drop，複製到 battle / queue；不可拿整首公播音檔當 defender battle audio。
- 若該作品已有待回覆攻擂邀請，關主不可修改守擂 Drop。拒絕不算戰績；接受後依預定時間開打。
- 原 Drop 挑戰池保留為臨時約戰 / 不經探索頁的快速 Drop Battle 區，不與探索作品攻擂互相取代。

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
