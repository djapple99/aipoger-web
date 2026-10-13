# AIPOGER 版面與使用流程

文件整理：2026-10-13；產品實作基準：2026-10-13。主文件 3／6；產品門檻與權限以 [產品規則](aipoger-product-rules.md) 為準。Showtime 純黑底、月榜分享與管理已正式發布；Choice 管理精簡與收藏順序見 [最新發布紀錄](releases/2026-09-18-choice-management-simplify-release.md)。

This document protects AIPOGER's visual identity. Use it before redesigning any page, adding major UI, or changing user-facing copy.

導覽：品牌與首頁 → Drop／Q Crash → 酒吧 → Showtime／Choice → 帳號／後台／聖經 → Battle 細節 → 本次資訊層級。

## Core Feeling

AIPOGER should feel like:

- AI music.
- DJ culture.
- Night-stage energy.
- Creator battle.
- Public radio.
- A slightly emotional, stylish, music-community room.

It should not feel like:

- A generic SaaS dashboard.
- A plain upload utility.
- A stock music marketplace.
- A cold ranking site.
- A beige creator portfolio.

## Visual Language

Base:

- Black or near-black background.
- Orange light as the main brand energy.
- Cyan as a small electric accent.
- Gold/yellow only for highlighted music records and compact accents, not retired certification or qualification badges.
- Use glow, border, and glass-like depth sparingly; keep the interface readable.

Avoid:

- Random bright palettes.
- One-note purple/blue gradient branding.
- Generic cards everywhere.
- Big marketing sections where the app itself should be visible.
- Decorative shapes that do not support music, stage, or battle identity.

## Typography And Copy Tone

Chinese copy should feel direct, musical, and a little stage-like.

Use:

- `公播`
- `挑戰池`
- `正在拼人氣`
- `AIPOGER Showtime`
- `勝利榜`
- `熱播`
- `封存紀錄`
- `聽眾反應`

Avoid:

- Over-explaining rules inside the app.
- Calling Bar Heartbreak a ranking chart.
- Calling Challenger a waiting room in the main UI.
- Too much admin/product-manager language.
- Empty marketing slogans.

## MV 放映室

2026-10-13 使用者選定的黑橘放映室已在 `/mv` 上線：`MUSIC VIDEO`、大標「值得一看的 MV」、左側寬幅封面與右側作品資訊、橘色觀看按鈕、下方三欄 16:9 MV 清單；手機改為單欄。共用首頁頂欄，MV 為目前頁面，Logo 返回精選首頁。

- 主視覺使用真實影片封面、高解析縮圖回退及原作品介紹／公開署名留言；社群精選與新作標示遵循產品規則。按下才嵌入影片，關閉影片卸載播放器。
- 「更多 MV」有最新投稿／本週支持、實際曲風選單、件數及作品／創作者搜尋。先排除上方全部精選作品（包含同票），再排序及逐次載入 12 件，將位置留給其他作品；搜尋符合精選時提示並提供上方跳轉。現有資料沒有劇情／動畫分類，因此不猜測這些標籤。完整舊作仍可搜尋。
- 卡片資料只用兩排：第一排歌名，右側並排大愛心、本週票數與白色評論圖示；第二排創作者。圖示 34px、點擊範圍至少 44px；歌名較長時換行。愛心直接切換原作品 Heart／收藏，評論不另占第三排；讀取失敗提供重試，送出時防止連點，失敗不假裝成功。
- 卡片封面開啟原生影片 dialog，提供關閉、原平台與評論入口；標題連回 Explore 原作品。評論圖示開啟同一作品的 dialog，上方影片、下方留言，沿用首頁評論及原作品 ID；點觀看才播放，收起影片保留評論／草稿，關閉整個視窗返回原卡片並恢復焦點。客人登入返回 MV 頁；首頁原評論視窗維持原使用方式。
- 頻道網址保留於下方獨立區塊，明示不是影片網址。投稿提示連既有音樂投稿及 Profile 原作品管理，補 MV 連結不再填第二份資料。
- 中英日韓文案與頁面 metadata，搜尋／篩選／載入更多、空結果重設及失敗重試均可操作。四語手機／桌機無水平溢出；手機導覽可左右捲動。共用音樂播放開始時關閉 MV；點 MV 先暫停音訊。

## 探索音樂

`/ai-music` 沿用選定黑橘參考圖，共用頂欄。第一層是「傷心酒吧」小電台，接著左側「探索音樂」大標、右側搜尋與測驗，再接分類控制與緊湊雙區布局；撤下原酒吧舞台、聊天、歌詞牆及投稿區。

- Radio 有全部／Jazz-Bossa／R&B／City-Pop 捷徑與完整14曲風選單；封面、歌名、創作者、上一首／播放／下一首、進度、音量、橘心及白評論同行。手機分配緊湊控制，不新增裝飾空行；歌曲採唯一共用音訊，電台可見時收起固定底部控制。
- 桌機左側 Top10 約占原六欄的兩欄，右側四封面一列；窄屏三欄、手機兩欄。手機榜單先顯示三首、平板四首，完整排行從 Top50 開啟原生可關閉視窗。Top10 不放評論標誌：點封面播放、Heart支持、歌名清除不相符篩選並展開、定位與短暫標亮原卡。
- 有耳朵主場才顯示單列四首「為你推薦」，約三主場／近鄰＋一探索；下方曲風列排除其ID。未測驗先展示實際曲風牆。每類收合四首，既有七日NEW／每創作者首屏最多一首NEW規則保留，完整展開可看其餘同曲風作品。
- 搜尋涵蓋全部符合三個月展示資格的原作品，作品／創作者／工具与曲風交集；無結果可重設、錯誤不偽裝空曲庫。資料每分鐘及回到頁面時刷新，保留訪客篩選、展開及定位。
- 封面下是歌名旁大橘心與白評論，下行創作者，接戰作品保留攻擂；分享／戰績在原封面位置，不增加互動橫列。按評論開原作品modal，公開可讀，登入才留言／按心。榜單數字是不同非作者支持人数，累計每日Heart在按鈕提示／無障礙文字可查，不混為榜票。
- 所有投稿入口進 `/profile?submit=1&lang=...#submit-work`，登入後打開自己的「我的作品」上傳表；既有檔案、metadata、手選曲風、額度与審核流程沿用。到期作品在新版創作者中心標記推廣期結束並保留管理／預覽；歷史最高名次仍是後續設計。
- GUIDE保留X、Escape、backdrop、focus trap／return，四語完整；舊 `/listen-bar` 和 `/l/...` 保留曲風／語言導到小電台，舊投稿hash導到Profile。原戰績與攻擂明確同意機制保留。

## Homepage

2026-10-13 首頁改版：以使用者選定的黑橘編輯式首頁為方向，主視覺「本週值得一看」只展示 MV，下方「探索音樂」先排除上方全部精選作品，再展示最新三首公開可播單曲；候選不足時少顯示，不重複填滿。首頁不展示專輯區塊。桌機為左側寬幅封面、右側作品資訊；手機依序放封面、資訊與單曲列。

- 導覽：精選、探索音樂、MV、Showtime、Battle、創作聖經。探索連到 `/ai-music`，Showtime 保持 `/rank`，Battle 保持 `/battle`，創作聖經沿用 `/ai-music-bible`；MV 直接連到 `/mv` 放映室。
- 主視覺使用真實創作者作品、YouTube 封面與既有 optional MV URL。支援高解析封面逐級回退。按「觀看 MV」才嵌入官方播放器；切換至 MV 先暫停共用音訊，改播單曲則移除 MV 播放器，不讓兩種音源重疊。
- 社群支持最多的 MV 標「本週社群精選」，展示不同非作者支持者數；同票提供左右切換與「同票精選」，不宣稱正式冠軍。全週零支持時只展示最新 MV，標「新作放映」，不冒充社群入選。沒有有效 MV、沒有可播音訊及資料讀取失敗各有真實狀態。
- 推薦理由優先展示公開且 moderation-visible 的非作者留言，保留留言者署名；沒有可展示留言時標「作品介紹」，使用創作者原文。不將社群入選冒署為「愛波哥推薦」。
- 「評論與支持」開啟首頁原作品視窗，公開評論可讀；登入會員透過既有留言與 Heart API 參與，沿用相同作品 ID、收藏與審核。留言失敗保留文字，客人先登入；不因觀看、留言或 Heart 發點數。原有 Explore 卡片仍能送 Heart，但沒有獨立歌曲評論功能，所以首頁不將此按鈕誤連到卡片。
- 三首單曲使用既有底部共用播放器，歌曲標題連回 Explore 原作品；保留「進傷心酒吧」的持續聆聽入口。「投稿作品」進入 `/profile?submit=1&lang=...#submit-work`，手機頁尾也能投稿；不新增 MV 重複投稿表。
- 頂欄沿用官方 Logo、四語切換與登入入口；登入後保留原有帳號頭像／通知與 owner 後台入口。首頁、MV 放映室與探索音樂隱藏中央固定 presence badge 及重複的固定 Logo／語系／訪客登入控制；登入後帳號與通知保留。
- 中英日韓文案與類型名稱一起本地化，創作者的作品名稱與介紹保留原文。Explore 卡片原有首次上架 7 × 24 小時 `NEW` 與 `接戰` 角標規則保留，不能互相蓋住或遮住播放操作。

## Drop Battle

Role:

- Fast, competitive, hook/drop-focused.
- The energy is challenge, speed, and punch.

UI direction:

- Use competitive language.
- Make waiting/challenge states clear.
- Keep actions obvious: start, accept, cancel, enter room.
- Do not blur Drop Battle with 24H Full Song; they are different products.

### Q Crash

- `Q Crash` is the asynchronous Full Song Battle mode, not a survey or ordinary social poll. Its source and timing rules are defined in `aipoger-product-rules.md`.
- Keep the same black stage, orange battle energy, small cyan electrical accent, A/B confrontation, and music-first language.
- Desktop uses two side-by-side work seats with a compact VS signal. Mobile stacks the seats and keeps both play/vote actions easy to reach without horizontal overflow.
- Each work seat shows the work-specific cover, work/version label, song, creator, genre, AI tool, full-track duration when available, one play action, and one vote action. Q Crash creation accepts a public Suno link or an MP3/WAV upload; a creator profile cover is only a fallback.
- Keep the `Q CRASH` title compact so the work comparison starts high in the viewport. Lyrics open as an in-page HUD below the work pair; missing lyrics say `歌詞未提供` rather than leaving a blank panel.
- Playback uses one fixed bottom A/B player with explicit A/B switches, play/pause, seek, previous/next, volume on desktop, and close. Do not embed a native audio control in each work card.
- Voting state shows only the mode, deadline, work information, and the listener's private submitted state. A shared bottom rating dock switches between A and B and contains exactly five keys: 押韻、爆點、旋律、情緒、結構. Never show a count, percentage, total audience, feedback total, leader, radar, or visual progress toward a winner before settlement.
- Winner voting uses a two-step action: selecting A or B only marks a private, reversible pending choice; a separate `確定送出` / `Confirm Vote` control creates the immutable vote. Before confirmation the listener can replay, seek, and switch sides; after confirmation the choice is locked.
- Keep confirmation in a fixed high-contrast dock above the A/B player. The dock states the selected work, explains that selection is not yet a vote, changes to `登入並投作品 A/B` for signed-out listeners, and remains readable at 390x844 and 1440x900 without covering playback.
- Official results use a compact result panel and show the winning work's pentagon feedback distribution. An insufficient Q Crash shows no radar.
- Q Crash share invitations should feel like a friend asking for a quick listen and decision, not a system announcement: `這兩首歌到底哪首比較好聽啊？我有點選不出來！進來聽完整歌曲，幫我決定哪首勝出！`
- Q Crash uses Traditional Chinese only when `lang=zh`; English is the fallback for `en`, `ja`, and `ko`, including the card, creation flow, controls, share copy, and social metadata.
- Final copy leads with the winning work and then its creator. Never say that a creator defeated themself when both works have one owner.
- The Battle Pool exposes one compact `建立 Q Crash` mode panel before the ordinary public Drop challenge pool; it must not push the normal pool out of the first viewport at 1440x900 or 390x844. Every active Q Crash appears as one paired A/B battle card, never two ordinary queue cards.
- Battle Pool mode identity must remain unmistakable on desktop and mobile: the Q Crash introduction and matchup section use cyan live-text ribbons and cyan borders, while the public Drop Battle section uses red/coral live-text ribbons and red borders. Solid cyan/red mode labels and primary actions use near-black text; ordinary dark-card titles and supporting copy remain white/gray.

## 24H Full Song Battle（保留系統，非前台主推）

Role:

- Full-track one-on-one battle.
- Slower, more complete, more listening-focused than Drop Battle.

UI direction:

- Use `24H Full Song` or `24H Daily Battle` consistently where appropriate.
- Make it clear the full song is uploaded and listeners can take time.
- Keep global active limits visible when they are implemented.
- Keep actual finished winner records and authorized historical audio in the Battle archive flow; do not present them as Showtime certification or monthly chart placements.

## Bar Heartbreak

「傷心酒吧」是探索音樂上方的持續電台，詳見上一節；不再提供獨立大型酒吧布局或聊天。選擇曲風才建立循環佇列，進頁不自動播放；歌曲、音量、進度與卡片／固定底部播放器同步。

- 歌曲與評論沿用原ID；公開聽歌不用登入，Heart／留言需登入。NEW保留七日語意；正式Battle及Showtime月榜另依原規則。
- 投稿搬到Profile自己的作品區；手動曲風与可選音訊建議面板、上傳前21秒片段告知、建議逐一採用／自行選擇、worker未啟用時手選回退均保留。讀metadata不默改曲風。
- 不呈現Challenger席位、保護時間、生存日數、容量淘汰、房間故事留言、舊移動跑馬燈或大型金色招牌。舊聊天24小時API是歷史相容，不是前台入口。
- 一般會員連結／音檔共用個人168小時／三首額度，Owner顯示「投稿不限數量」且無數量限制，每曲風五首active上限取消，公開展示三個日曆月不等於刪檔或退額度。物理容量處理待另行設計。

## AIPOGER Showtime

Role:

- Front-stage name is `AIPOGER Showtime`; old `Honor Board` wording is legacy/internal context, not the main public name.
- `/rank` presents Choice and Monthly Charts together. No view tabs; `#choice-weekly` and `#monthly-charts` remain real section anchors.
- 2026-09-21 版面：桌機仍以約 70/30 分配 Choice 與月榜；Choice 上方一張大封面、右側上下兩張等大的小封面，間距一致且上下對齊，封面底部放標題與操作。第 4 張起在下方「更多 Choice」等寬排列，供更多策展人加入。手機為大圖、並排兩張小卡、月榜、更多 Choice；少於三張時自然縮排，不複製歌單或留下空廣告位。月榜與個人策展保持不同訊號。No certification catalog, certification badges, six-defense progress, invitation gate or fake content.

Monthly chart layout:

- Keep the `AIPOGER SHOWTIME` heading compact above the music with one Make My Choice action. Use the user's selected option 1 neutral pure-black base `#070809`, restrained orange actions and cyan curator names; existing real covers carry the color. Do not import generated mock covers, titles or counts.
- Month, genre and search live under an accessible filter icon; current month/state and ordered playback remain visible. Show up to five actual rows initially and allow full expansion/collapse. Month labels use Taiwan calendar months; distinguish the updating current month from frozen historical snapshots with concise state labels.
- Each row shows actual rank, small square cover, song title, creator, genre, monthly distinct non-author supporter count, play, song Heart and share. Use fixed rank/cover/action tracks; mobile titles may wrap to two lines without covering counts or controls.
- Unresolved equal-support groups show `名次待定`, not parallel numeric ranks. Owner-decided order appears only after the server validates it. Below the product-rule minimum, retain the separate compact support-building state. Do not invent ranks, crowns, full Top 10 lists or movement arrows.
- Put whole-chart share beside the header filter/rules icons, with an accessible localized name. Its URL preserves month/genre/language and restores that view; individual song-share buttons stay in their rows.
- `/admin/charts` provides pending-month counts, same-score preview/playback, move-up/down controls and explicit save, plus audit history and confirmed soft-withdraw for suspected duplicates. Already settled decisions are disabled. Link it to `/admin/choice` and the owner overview; link to the published Choice moderation list, never a second curation editor.
- The history selector contains only snapshots from launch onward; absent history, insufficient support and data errors have concise truthful states. Monthly counts must not be labeled lifetime Hearts, Battle wins, Choice popularity or Earworm affinity.
- Hide/moderation and playback restrictions remain effective in historical views; preserve the record without exposing restricted music or silently renumbering the frozen month.
- No Drop victory / Bar heat / certification source tabs, duplicate Featured rows, certificate subtitle or marketing paragraph explaining how the new system works. Operational labels and accessible tooltips are enough.

Choice shelf and selection:

- Use Beatport-inspired square artwork hierarchy, not a branded clone: larger lead cover, smaller companion, compact more-cover grid. The owner selects the feature from published Choices in the existing admin library. Without a valid designation the heading is simply Choice Playlists, not Featured. Preserve original cover proportions and do not invent separate campaign artwork. Keep authored title, curator/date, recommendation excerpt on the lead, full intro in HUD/share page, sequential play, tracklist, collection Heart/save, share and comments. Do not add `CURATOR SETS`, a standalone article HUD or explanatory marketing copy.
- `製作我的 Choice` enters `/profile/choice` private favorites selection. Any signed-in account can use it; request sign-in only at the protected action boundary and return to the intended flow. Do not display certified-work, prior-upload or invitation requirements.
- Show all of the user's public playable favorites, regardless of song age or historical certification. Most recently saved songs come first in the top row; legacy saves without reliable per-user time stay in stable order behind dated saves. Search/genre filters keep this ordering; the selected playlist keeps manual order. Use compact cover rows with distinct selection checkboxes, play and existing song Heart/favorite controls; keep a separate selected list with ordering, title, introduction, preview, publish and withdrawal. An empty favorites state offers a direct Explore action without marketing text.
- 2026-09-21 編輯流程：收藏歌曲可連續勾選最多 10 首，跨搜尋／類型保留勾選，按「確定選曲」更新右側待儲存歌單。每首透過數字選單直接指定順位，其餘歌曲自動補位；文字輸入、選曲、排序、移除封面均先留在畫面，按「儲存」才送出。顯示尚未儲存，切換期數或離開頁面提醒。保存失敗不清除輸入；發布／撤回也保存目前已確認的整份編輯。新期數不需先建立伺服器草稿，回到工作台續編既有已存草稿。
- Selection checkboxes must never look like or act as Hearts. Unselecting a song does not remove its favorite; removing a favorite or cancelling its Heart does not remove it from an existing Choice. Unavailable or moderated selections retain an honest disabled state and cannot silently play.
- Choice 完整頁的曲目列表下方直接顯示評論區，頂部評論入口跳到 `#choice-comments`。顯示留言者頭像、名稱、時間與回覆入口；未登入者可閱讀並在留言時登入，返回原歌單評論位置。Showtime 卡片仍保留快速評論視窗，與頁面共用留言資料；中英日韓介面，送出失敗保留文字。
- Preserve the existing interactive tracklist HUD and usable `/choice/{id}` share page. Both show stored intro, ordered songs, song actions, Play All and the shared player; public Choice remains non-ranked.
- `/admin/choice` is a compact published-only management list with search, pagination, real covers, curator/date/song count, public-view link, owner-only feature toggle and confirmed deletion. No official editor, draft creation, cover upload or selection pool. The owner uses `/profile/choice` to create, like everyone else; `/admin/showtime` redirects to works management. No manual-certification review queue, certification-only catalog or award actions. Do not add social-publishing controls to the personal workbench.

Own works and playback:

- Merge all creator-owned community song metadata editing into `Profile / 我的作品`, including formerly certified songs. Keep one compact paginated list and editor for cover, permitted display metadata, lyrics, YouTube and reviewed external support links; do not split normal works from locked Showtime works or place that editor above Choice selection.
- Audio, ownership, actual Battle wins/losses, votes, Hearts and historical provenance remain protected, not editable form fields. Challenge status is a separate explicit creator action in own works, never a side effect of saving metadata or appearing in a chart/Choice. Previously certified tracks require fresh opt-in after reset; keep the normal pending-invitation Drop lock.
- Public playable historical community works appear normally on Explore and Bar without certification badges or founder-only Showtime placement. Actual Battle history remains accessible in the information HUD; remove all six-defense promotion copy.
- Use one shared bottom player across charts, Choice, Explore, Bar and Profile, including play/pause, seek, previous/next, volume and lyrics. No native audio controls or waveforms per row. Preserve authorized historical audio/share access without displaying it as a fabricated monthly rank.
- Preserve the existing black/orange music-stage identity. Keep controls compact, accessible and readable on desktop/mobile; use state labels and action names, not in-app redesign explanations or marketing copy.

## 創作者作品表現

- 個人頁提供「作品表現」入口，前往 `/profile/insights?lang=<lang>`；中英日韓介面，顯示「只有你看得到」及返回我的作品。
- 最近 28 天、作品搜尋、每首歌曲的聆聽與轉換數據集中在私人頁；目前支持者／收藏者另標為目前狀態。正式對戰得票率獨立列出，不混成歌曲總評分。
- 桌機四欄、手機兩欄數據，保留黑橘視覺與全站首頁 Logo。詳細定義預設收合；比例同時顯示分子／分母，資料不足與錯誤均有真實狀態。
- 登出或換帳號立即清除舊資料，未登入保留返回路徑前往登入。公開歌曲頁不加整排分析數據。

## Account And Login

Owner task badge (2026-09-18): show the red pending-task count at the avatar's upper-right, separately linked to the admin task list; retain Profile at the avatar center and account/Battle notices at the bell. When both notice types exist, move the existing account-count marker to the upper-left so counts do not overlap. Red badge labels support zh/en/ja/ko. Admin overview lists actionable categories and counts with direct module links; opening it never dismisses unresolved work. New-song promotion and all Choice drafts are excluded. The existing Bar promotion count remains inside Bar admin for manual checking.

Role:

- Keep auth useful but not dominant.

Rules:

- Listening surfaces should not feel blocked by login.
- Keep authentication out of large marketing headlines and explanatory hero paragraphs. Use the normal product promise first, then a compact modal or sheet at the protected action boundary, with one primary sign-in action, a dismiss action, and the intended return path.
- Protected actions ask users to sign in at the action boundary. Anonymous Drop arena exceptions and Q Crash requirements follow the product rules.
- Error copy should explain what is blocked and what remains open.
- Profile saved music follows the same compact fixed-bottom player language as Explore, Showtime, and Choice. Keep one play action in each song row; do not place waveforms, native audio controls, or competing mini players inside the account list.

## 創作者中心：個人資料、作品與投稿

`/profile` 沿用選定的黑橘桌機稿：簡短標題與身分列、三項私人統計、同位置 Credit、左側作品／收藏／收到的評論、右側投稿。一般會員只看自己的資料；owner 多一個後台入口，原大型身分區移到「編輯資料」。

- 作品表每頁 4 件，提供封面播放、狀態、有效支持人數、評論與編輯；搜尋及狀態篩選保留。桌機數據有獨立欄，手機把支持／評論數收進歌名下既有資訊行，維持 44px 圖示操作，不增設整排工具區。完整歷史原資料管理仍每頁 10 件。
- 收藏統計含歌曲及 Choice；歌曲列表分頁，Choice 與批次收藏管理從明確入口進原管理介面。收到的評論可打開原作品的既有評論 dialog；最新兩則可見評論放在表下。沒有評論就顯示真實空狀態，不填示意評論。
- 單首「編輯」只展開該首原編輯表，取消或儲存後關閉；Battle／對戰／勝出／Choice 等原操作集中在「更多紀錄」。原待接戰、批次管理、個人作品表現、頭像與身分修改仍可從這些入口取得。
- 投稿來源為「貼作品連結／上傳音檔」。連結先在同面板預覽實際播放器，顯示取得的歌名、自己的創作者顯示名與來源，歌名及作者可展開修改。必選曲風與 AI 工具保持紧凑並排；YouTube 的 MV 勾選、權利確認及最後確認按鈕放在同區。
- 音檔先在本機預覽，播放與確認權利後才送出。封面、歌詞、MV、專輯與介紹等選填資料可展開；既有格式、大小、手選曲風、可選分析及審核規範保留。
- 預覽讀取和實際可播放是不同狀態；YouTube 用實際播放事件，另外兩種來源由作者手動確認。預覽不發布、不用額度，換來源重置播放／權利確認。連結只走可見來源播放器，持續小電台不以外站網址冒充音檔。
- 統計載入顯示「—」；讀取失敗有重試。Credit 保留位置，未啟用時不顯示數字餘額或虛構交易；owner 顯示免扣點。
- 桌機左右分欄；平板與手機把投稿區接在總覽下方，接著作品區。保留既有帳號／通知 dock，撤下 Profile 的重複首頁圖示、語言與現場 badge。手機／平板的帳號通知避開頂欄導覽，其他頁儲存位置不改。新中心與投稿文案有中英日韓；原管理細節沿用原介面。

## Admin / Operational UI

Role:

- Quiet, utility-first, dense enough for repeated work.

Direction:

- Admin pages can be more functional than public pages.
- Avoid oversized hero design in admin tools.
- Keep image/audio review and moderation actions clear.
- Repeated filter and sorting controls in one toolbar must share a consistent height, radius, type scale, and responsive grid. Do not let one control wrap into a tall pill while its neighbors remain short.
- Music-review lists use one compact play button per item and one fixed bottom preview player; do not embed a separate native audio bar inside every management card.

## 音樂分析工具入口

`/music-analysis` 使用精簡標題與三張工具卡：Tunebat、Loudness Penalty、Cyanite。每張說明用途、免費範圍與「怎麼使用」，主要按鈕另開外站，次要連結為官方說明。頁尾可回 Music Bible；桌機三欄、手機單欄，四語皆有完整文案。沒有登入等待、分析引擎狀態、範例評分、站內上傳、貼回結果表單或下載筆記。所有音樂分析由使用者自行在外站操作。

## AI Music Practice Bible

### Music Bible 2.0 已發布介面

- 會員頁 hero／章節導航後提供五入口：Knowledge、Style DNA、Prompts、Workflows、Solve My Problem。原 practice map、章節 ID、搜尋、評論、複製與試聽保留。
- Knowledge 導向曲風詞彙、歌曲段落／人聲及拆軌；Style DNA 導向既有索引；Prompts 導向招式庫；Workflows 提供三段創作路徑及既有六步流程；Solve My Problem 展開既有排錯。
- 前台不把資料標為新／舊或 Reference / Legacy Library，也不顯示新增 metadata 狀態。所有資料照常可搜尋與複製；平台、模型、版本、最後驗證與狀態先保留在資料層及 owner 編輯介面。原證據與來源說明保留。
- Ask Music Agent 尚未成立，入口與準備中需求單皆隱藏；待真正功能完成後另行開放。
- 新入口採繁中／英文；日韓會員內容沿用英文回退。公開登入入口維持四語，會員資料不移至公開頁。


- Studio Mastering Prompt examples use one compact `15 秒試聽` action only on cards with a real audio asset.
- Route every Prompt example through the shared fixed bottom player. Do not autoplay, expand card height with waveforms, or place a native audio control in each card.
- Keep the example disclaimer visible and quiet: the clip demonstrates a sound direction and does not promise an identical Suno generation.
- When `錄音室 Mastering` is selected, keep the second-level `錄音室類型` filter wrapped on narrow screens; use the 15 approved music-family labels (`Electronic`, `Hip-Hop`, `Soul & R&B`, `New Age & Ambient`, `Rock & Roll`, `Indie Dance`, `Disco & Funk`, `Jazz & Bossa`, `Pop`, `Classical & Cinematic`, `Latin & Caribbean`, `African & Amapiano`, `Asian & Middle Eastern`, `Country & Folk`, `DJ Edit / Extended`) and show the selected family as a compact orange card badge.
- `Modern Taiwanese Pop` is fully withdrawn from the free Prompt catalog. Do not leave a disabled card, premium lock, price, or placeholder in the free library; a future paid version needs its own approved product surface.


## Battle Pool 細節

### Purpose

Battle Pool should feel like a live AI music challenge stage, not a plain list of uploads.

The page must make visitors understand three things immediately:

- This is where AI music enters a public battle.
- Creators can start or accept a Drop challenge.
- The battle surface is music-first, stage-like, and usable on mobile.

### Core Feeling

Use:

- Black / near-black stage background.
- Red and orange light as battle energy.
- Red-orange for the main challenge CTA and small cyan accents for navigation.
- A compact two-character stage visual that supports, rather than replaces, the working interface.
- Dark tool surfaces with readable contrast and restrained borders.

Avoid:

- Plain SaaS list pages.
- Stock marketplace layouts.
- Decorative or fake waveforms, EQ bars, deck controls, or audio controls that do not operate.
- Overly complex rule text in the hero.
- Mobile hero elements that overlap the title or CTA.
- PPT-style mastheads that push the public challenge pool below the first viewport.

### Main CTA

The main CTA is a real text-and-icon button.

Chinese:

- `發起挑戰`

English:

- `Start a Challenge`

Rules:

- Do not use `我要挑戰` for this primary CTA.
- Keep the button accessible: the actual button text and `aria-label` must match the locale.
- Use the crossed-swords icon with visible localized text.
- Keep it compact, high contrast, keyboard accessible, and visually separate from share.
- On click, it should begin the same Battle start flow as the normal `Start a Challenge` action.

### Quick Navigation

The Battle hero quick navigation is a compact command strip, not a row of dashboard cards.

Required order:

- `探索音樂`
- `傷心酒吧`
- `對戰記錄`
- `Showtime`
- `Drop 規則`

Share is a separate command beside `發起挑戰`; it must not look like another destination tab.

### Desktop Hero

Desktop Battle Pool hero should preserve:

- Eyebrow: `AIPOGER BATTLE POOL`.
- Main headline: `AI 音樂鬥歌場`.
- Supporting line: short, stage-like, and direct.
- Left side: title, subtitle, primary challenge CTA, and share.
- Right side: two character cutouts with a central `VS`.
- Compact functional navigation at the bottom of the hero.

Desktop character direction:

- Use transparent PNG character cutouts.
- Female City-pop / gold performer on the left.
- Male gatekeeper / street fighter character on the right.
- Characters should be large enough to create battle energy, but must not make the nav cards unreadable.
- The `VS` can remain on desktop because there is enough space.
- The `VS` mark should sit between the two character centers, not over one character or the title.

The hero must not include a fake waveform, decorative play button, deck, or EQ. Actual audio previews remain on the Drop cards below.

### Mobile Hero

Mobile hero must be simpler than desktop.

Approved mobile structure:

- Compact copy block with eyebrow, one-line title, short subtitle, `發起挑戰`, and share.
- Two supporting character cutouts on the right/lower side.
- A horizontally scrollable quick navigation strip that starts with `探索音樂`.

Mobile rules:

- `AI 音樂鬥歌場` must stay on one line.
- Do not display `VS`, fake waveform, decorative play control, star CTA, or dashboard cards.
- Do not let the title, subtitle, CTA, or navigation overlap either character's face.
- The first public challenge-pool heading must remain visible within a 390x844 first viewport.

### Battle Pool Header

The pool header should introduce the public challenge pool directly.

Use:

- Label: `60S DROP BATTLE POOL`
- Main title: `Drop Battle 公開挑戰池`

Do not use:

- `挑戰最強90s抓波`
- `挑戰最強60s抓波`
- Long rule explanations in the header.
- Empty motivational English slogans.

### Official Gatekeeper Cards

Official Drop cards should feel like challenge gates.

Use:

- `歡迎任何人來挑戰 AIPOGER 官方關卡`
- Actual song title.
- `GATE 01`, `GATE 02`, etc.
- Genre badge from the normal Battle genre menu.
- Highlight copy: `歡迎挑戰這首官方 Drop，設定開戰時間並分享拉人投票。看看你的歌能不能打`.
- Small music metadata such as BPM, key, and Drop duration when available.
- Red pill action such as `挑戰這首 Drop`.
- Put `挑戰這首 Drop` in the same action row as `5 秒預播`.

Do not:

- Repeat a section heading/subheading such as `官方 DROP 挑戰` / `歡迎任何人來挑戰` above the cards.
- Put star CTAs inside each Drop card.
- Let official cards look like normal ranking records.
- Show full audio controls on the card; teaser behavior is enough.

### Filters

Genre filters should be compact and direct.

Use examples:

- `K-Pop 韓式動感`
- `Rap 街頭說唱`
- `Disco / Funk / City-Pop`
- `R&B 深情瞬間`
- `Band Rock 熱血搖滾`

The genre source is the creator-selected upload genre. Do not treat it as a challenge type or platform category.
Battle Pool filters should not show `全部風格` / `All Styles`; the default unselected state still displays all official gates and open cards. Clicking the selected genre again clears the selection.

### Copy Rules

Battle Pool copy should be clear first, stylish second.

Use:

- `發起挑戰`
- `Start a Challenge`
- `Drop Battle 公開挑戰池`
- `挑戰這首 Drop`
- `約朋友一起挑戰`
- `邀請觀戰投票`

Avoid:

- `我要挑戰` as the main start CTA.
- `全部風格` / `All Styles` in the Battle Pool genre filter.
- Repeated section headings like `官方 DROP 挑戰` above official Gatekeeper cards.
- `挑戰最強90s抓波`.
- `挑戰最強60s抓波`.
- Rule-heavy explanations in the first viewport.
- Decorative English slogans that do not explain the action.



## 2026-09-06 第一批資訊層級

- Battle 模式介紹只保留一組標籤、短句與建立按鈕；無 Q Crash 時只顯示一行空狀態。有場次時保留青色 A/B 對戰卡區，不改資料與模式順序。
- Explore 的依類型／正在升溫控制放在個人推薦前；切到正在升溫時直接顯示熱度作品，個人推薦保留在依類型視角。
- 一般零戰績作品收起零挑戰數與不能操作的暫不接戰；資訊按鈕仍可查真實完整戰績。依 2026-09-17 確認規則，所有認證標章與守擂 0/6 晉級進度退役；接戰狀態只依創作者明確選擇與實際資格顯示。
- 資訊按鈕可用滑鼠與鍵盤操作，桌機 hover 仍保留；播放、支持、分享與真實攻擂入口不變。
- 對戰記錄使用得票率；本月摘要和兩模式內容遵循同一月份。跨場 audienceCount 加總稱投票人次。
- Showtime／Choice 以本文件上方 2026-09-21 版面與編輯流程為準；未完成項目只列在 roadmap，文件整理不能當作發布證據。

## 音樂分析的表達框架

分析入口只提供外部工具的用途、免費範圍與操作方法，不製作 A&R 報告、歌詞診斷、市場評分或認證。Music Bible 六步流程的第三步為「三種分析工具」，按需前往 Tunebat、Loudness Penalty、Cyanite；第五步為查看 Showtime 月榜與從收藏歌曲製作 Choice，不設分析／認證前置門檻。BPM／調性、串流音量調整、曲風情緒標籤都是參考讀數，不代表品質或商業成功。

## 共用播放器

- 酒吧、探索、Showtime／Choice、個人歌單使用唯一root播放器：播放／暫停、歷史上一首、下一首、進度、手機／桌機音量、歌詞、關閉；電台可見時使用其緊湊控制，離開可視區再顯示底部控制，音訊不卸載。原公播作品可按心與開同作品評論，其他來源沿用原收藏語意。
- 電台沒有舊六首佇列預覽或聊天室；顯示目前歌名／創作者及曲風，無聲音／無曲風作品時呈現明確狀態。
- 換頁維持目前音訊與佇列；選歌／選曲風才換佇列，新投稿不插入既有佇列。三個月到期或既有公開資格不符的歌曲由相同API剔除。

## MV分享及評論導覽

MV原愛心與評論操作旁新增44px觸控分享鍵，桌機三欄與手機單欄不增加額外操作排；精選及播放視窗也有分享。原生分享、複製成功與手動複製連結提示有四語。站內分享保留原MV ID與語言，接收者開原作品的可播放封面與評論，不自動播放。

MV評論視窗保留原內容與草稿，使用橘色thumb／深色track及右下角「往下看評論」提示。提示只在評論入口仍在下方時顯示，點擊捲至評論、不發送留言，看到評論後收起；窄螢幕與reduced motion一起驗證。
