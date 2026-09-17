# AIPOGER 開發與維運

更新：2026-09-18 05:04 Asia/Taipei。主文件 4／6。先看架構與發布流程，再按改動選讀下方回歸章節；驗收清單不創造產品規則。

## 最新發布：Choice 管理精簡與收藏順序

- 應用 `147dbc6`／`codex/choice-management-simplify`；Vercel `dpl_FfPbhR4V3nXbMaJswnNf5vZ9Yw5t` READY，2026-09-18 05:04 Asia/Taipei 已 promote 至 aipoger.com。
- 444 項測試、TypeScript、本機／雲端 build 通過；lint 0 errors／16 既有 warnings。無 SQL migration、歷史收藏時間回填或正式資料刪除。
- 收藏時間為私有 interactions store 的 per-user 欄位，由 Heart 與 favorite 路徑共同維護；只影響個人 Choice 選曲順序。新歌宣傳／官方草稿不再進入待辦彙總。詳見 [發布紀錄](archive/2026-09-18-choice-management-simplify-release.md)。

## 前版發布：頭像後台待辦

- `9fc7074`／`codex/owner-task-avatar`：全站 owner 頭像紅色待辦數、後台彙總及分類入口；不取代 Profile 或原帳號通知。Vercel `dpl_CYiSQUWJWdaXxnQCGG4neeZFwoAw` READY 並 promote 至 aipoger.com。
- 無 DB migration／正式資料寫入。437 項測試、TypeScript、本機及雲端 build 通過；lint 0 errors／16 既有 warnings。正式 API 未登入／無效 token 為 401；owner 真實登入操作未執行，隔離 runtime 已涵蓋帳號切換、更新及紅點顯示。
- 新後台工作流要接入 `src/lib/admin-tasks.ts` 及 `/api/admin/tasks` 的真實待處理來源；新歌宣傳、所有 Choice 草稿、普通活動、已停用頁面或完成紀錄均不得誤算成待辦。詳見 [發布紀錄](archive/2026-09-18-owner-task-avatar-release.md)。

## 前版：排行榜管理與分享

- 使用者明確回覆 `do it` 後，`9f96865`／`codex/showtime-chart-admin` 已部署並 promote 至 aipoger.com：第 1 款純黑底、整份月榜分享、owner 排行榜管理與 Choice 管理入口整合。
- Vercel `dpl_EoRgvvWvNPfDNMyZSfg1BJjgfnox` READY；Supabase 已套用本機 `20260917180000_monthly_chart_owner_decisions.sql`，正式 migration ledger 版本 `20260917184048`、名稱 `monthly_chart_owner_decisions`，兩者是同一份 SQL，不重複套用。
- 429 項測試、TypeScript、本機及雲端 build 通過；lint 0 errors、16 項既有 warnings。正式資料／公開頁／API 權限驗證與限制見 [發布紀錄](archive/2026-09-18-showtime-chart-admin-release.md)。

## 前版發布：同頁策展

- Showtime 同頁策展版面：`6343ea0`，`codex/showtime-editorial` 已 push；Vercel `dpl_6q3DgSbgTmGzirmtyxdm4P5dH8RE` 已 promote 並驗證 aipoger.com。417 項測試通過，無新 DB migration。詳見 [本次發布紀錄](archive/2026-09-18-showtime-editorial-release.md)。

## 前一版基礎發布

- Showtime 月榜與收藏製作 Choice：應用 commit `79e53bd`（主實作 `e5eab5b`），分支 `codex/showtime-charts-choice`，已 push 與 promote 至 aipoger.com。
- Vercel `dpl_8WEW1DehGhKjNfrW1vSTNF7GbjLv`；三份 Supabase 遷移已套用，405 項測試通過、0 略過。詳細資料核對、瀏覽器驗證與限制見 [發布紀錄](archive/2026-09-17-showtime-charts-choice-release.md)。

## 架構與資料來源

- Next.js App Router、React、TypeScript、Tailwind；精確版本讀 package.json／lockfile，不在文件複製版本號。
- src/app 放頁面／API，src/components 放共用 UI，src/lib 放規則與資料轉換，tests 使用 Node test runner，supabase 放遷移。
- Explore 與酒吧共用 listen_bar_tracks／Heart；Showtime 月榜只彙總此曲庫的有效支持，Choice 是獨立歌單；Q Crash 使用自己的完整作品與密封票資料，不可混合跨來源 ID 或收藏語意。
- Supabase 與 Vercel 依使用者背景為 Pro；配額、費用、同時在線能力必須重新實測，舊容量估算不是承諾。
- 公開／私密資料邊界依產品規則。前端隱藏不等於權限；server 驗證 token、owner 與來源狀態。
- 發布使用 Vercel 既有 project link；不得建立錯誤新專案或更改帳號。環境值不寫進本文件。

## 發布與回復

1. 記錄分支、HEAD、git status，明確列出既有無關變更。
2. 先跑相關測試，再跑下方 Standard Commands。既有失敗需對照基準，不宣稱全通過。
3. 視覺改動用真實瀏覽器驗證桌機 1440×900、手機 390×844、中英與相關語系，檢查鍵盤、播放、返回路徑和 console。
4. 只提交本任務檔案。工作區有無關改動時，從待發布 commit 建立乾淨 worktree，僅使用必要的本機環境配置，禁止將環境檔或截圖提交。
5. 若涉及 DB，先完成對應遷移與授權範圍核對；未套用不能宣稱完整上線。資料庫變更需有遷移與驗證紀錄。
6. 發布後確認 Ready、alias 與正式 aipoger.com 的改動頁。記下 commit／deployment，不能只看本機。
7. 需要回復時，定位上一個已驗證 deployment／commit；依問題範圍回復應用，不能假設回復程式會撤銷 SQL 或真實資料變更。

## 帳號與事故排查

- 品牌信箱 aipoger99@gmail.com；Supabase project ref rwueinzgjaaefjvmsyem。SMTP sender 與品牌帳號須一致，精確設定到 dashboard 核對，密碼永不記錄。
- OAuth 回到首頁卻未登入時，檢查 code 是否進 auth/callback、www → apex、PKCE/session 交換與回程保存；不要把歷史成功紀錄當目前通過。
- 手機 App 內建瀏覽器可能阻擋 OAuth；Email Magic Link 為可用替代，測試必須回原操作頁。
- 自動播放阻擋先檢查恢復控制。手機音量要確認實際聲音／gain，不只百分比；本機音訊成功不等於 iOS 真機通過。
- 字型／外部媒體／分析服務冷啟動與不可用需要真實錯誤狀態，不可用 mock 成功。

## 回歸清單導航

以下按功能查閱：登入 → 首頁 → Drop／Q Crash → Explore 攻擂 → 隱藏 24H → 酒吧 → 作品 → 聖經／審核 → 耳朵蟲 → Showtime → 手機／流暢度。

## Standard Commands

Run before production deploy:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Known current lint warnings:

- `@next/next/no-img-element` warnings in admin Listen Bar UI.
- Existing React hook dependency warnings in Battle pages.

These are known warnings, not current blockers, unless a new change introduces new warnings/errors.

## Production Deploy

Deploy command:

```bash
npx vercel deploy --prod --yes
```

After deploy:

- Confirm Vercel aliases `https://aipoger.com`.
- Confirm the affected page returns HTTP 200.
- Open the affected production URL in the in-app browser when UI changed.
- Check console errors/warnings on the changed page.

## Auth Smoke Test

Check:

- Logged-out visitors can open home, Battle list, Bar Heartbreak, AIPOGER Showtime, rules pages.
- Logged-out visitors can listen to public Bar Heartbreak tracks.
- Logged-out visitors can browse and listen on Explore AI Music without sign-in.
- Logged-out visitors opening `/ai-music-bible` see the normal Bible title/value preview and a focused sign-in dialog, not the searchable Bible content. No large hero headline says "sign in" or "unlock"; the primary dialog action preserves the Bible return path.
- Logged-out visitors cannot vote or comment in Bar Heartbreak.
- Hearts and saved favorites on public listening surfaces require sign-in. Pressing Heart while signed out opens the focused sign-in dialog and preserves the exact track return path; it does not replace the public-listening hero with login copy.
- Logged-out visitors are asked to sign in before upload/Battle actions.
- Logged-in users can see profile/fighter identity where expected.
- Profile `收藏歌曲` supports batch selection and batch removal, and removing saved favorites does not delete historical Heart reactions.
- Creator and listener Profile saved songs both open the same fixed bottom queue player. Each song row has one play action, and the shared player exposes play/pause, seek, previous/next, volume on mobile and desktop, and close without covering the final song row.
- Profile saved favorites can be removed while that day's Heart remains active; this direct Profile action does not cancel or recount the Heart. Re-pressing the public Heart button must cancel that day's Heart and synchronized favorite, then allow a new Heart afterward.
- Profile creator data lists songs in pages of 10; `收藏歌曲` can batch-delete saved favorites, and the creator's own Bar Heartbreak songs can be batch-removed from public/battle surfaces.

## Homepage Checklist

Check:

- Desktop right-side destinations appear in this order: `探索 AI 音樂`, `傷心酒吧`, `Drop Battle`, `Showtime`; only Explore uses the solid-orange primary treatment.
- `Drop Battle` links to `/battle?lang=<lang>` and exposes the localized 60s Drop Battle hover/focus description.
- At 1440x900, all four desktop actions remain inside the right panel and the panel does not overlap the lower navigation cards.
- At desktop reference widths, the compact social row ends above the divider and does not overlap the five lower navigation cards; the lower row remains fully visible in the first viewport.
- At 390x844, the four destinations use a 2 x 2 grid with readable labels, usable tap targets, and no horizontal overflow.

## Drop Battle Checklist

Check:

- Battle setup page loads.
- Audio upload/cut flow still works.
- Duplicate active Drop audio is blocked when audio hash exists.
- User cannot keep multiple active Drop Battle intents.
- A user with an active Drop Battle can still start one active 24H Full Song challenge.
- Drop challenge cards older than 24 hours are cancelled by cleanup.
- If no instant opponent exists, user can open a Drop Battle challenge card.
- Public challenge cards render on the Battle page.
- The same battle/match group renders only once in the public Battle Pool.
- Share links from a Drop Battle card or live battle use `/b/{shortId}` and open the specific arena, not the Battle Pool.
- Drop Battle share thumbnails render as black background with the white AIPOGER logo.
- Logged-out visitors can enter a Battle arena link, vote, send arena danmaku, and tap feedback/reaction buttons.
- Logged-out visitors who try to accept/challenge a Battle card are sent to sign in before challenger upload.
- Bar Heartbreak reactions/comments/uploads/removals still require sign-in.
- Legacy `/battle?focusBattle=...` and `/battle?focusQueue=...` links redirect to `/battle/[id]`.
- Ended `/battle/[id]` links with no active rematch redirect to `/listen-bar`.
- Ended `/battle/[id]` links with active or uploaded rematch stay in the battle flow.
- Accepting a challenge card respects genre and ownership rules.
- A creator-owned waiting card shows `用另一首 Drop 挑戰` / `Challenge With Another Drop`; that explicit target flow may compare two same-genre Drops from the same account, while automatic pairing still never self-matches.
- Both participants can cancel an unfinished Drop Battle when the user is eligible.
- Quick start labels and stored start times are based on successful publish time, not a stale `expires_at`.
- Waiting room opens correctly.
- 0-2 distinct audience voters becomes audience-insufficient / no contest and does not create a result card, Showtime archive, song battle stats, battle history, or rematch window.
- 3+ distinct audience voters creates an official result that can be archived.
- Drop 勝出作品保留在正式對戰記錄，不再授予 Showtime 認證或直接進月榜。
- Upload-time full-song consent is captured before the Drop is published; the client cannot rewrite that consent or the stored full-song path afterward. After an official win, only the winning creator can submit an HTTPS YouTube MV URL from Battle Records.
- The submitted YouTube MV URL remains on the official Battle Record; no link appears for an opted-out winner, an unofficial result, a non-winner, or a Q Crash card using its separate editorial workflow.
- Apply and verify `supabase/20260802143000_battle_winner_release_links.sql` before enabling the winner release form. Confirm direct client updates to release fields are rejected while the server winner-release endpoint accepts only the verified winner.

### Q Crash

- Battle Pool shows one compact `建立 Q Crash` entry while keeping the existing live Drop Battle CTA and challenge pool unchanged.
- Creating work A offers `Paste Suno Link` or `Upload Audio File` (MP3/WAV), stores a unified full-song Track, captures the rights confirmation, and creates one pending Q Crash card without opening the Drop cropper.
- Work A and Work B may each attach their own cover; the selected cover is stored with that queue/work and appears on the matching A/B seat. Suno playback uses the public Mango rights handshake and just-in-time in-memory decryption; the audio is never persisted, copied into Storage, transcoded, or cropped.
- The creator may place a second own work, leave the card open for a shared invite, or target an existing creator account. A targeted creator receives a readable account notification linked to the pending card.
- Work B must use a distinct queue entry and the exact same fixed genre. A different creator must own the submitted track; the original creator may intentionally submit a second own track.
- The first successful work-B acceptance wins the pending-card claim. Two simultaneous accepts must not create duplicate battles.
- Voting begins only after both works lock. Both creators see the same battle ID and `/b/{shortId}` share link.
- Battle Pool shows exactly one paired Q Crash card for that ID and suppresses both A/B queue rows from the ordinary card list.
- Battle Pool places Q Crash matchup cards in a distinct blue/cyan section directly below the Q Crash introduction. The red/orange `Drop Battle 公開挑戰池` contains only official/public Drop cards and its genre filters do not hide Q Crash cards.
- At 1440x900 and the 1092px desktop reference width, Q Crash introduction/matchups read as one cyan system and the public Drop Battle pool reads as a separate red/coral system. Cyan/red live-text ribbons and solid primary CTAs use black text; ordinary card titles remain white, and the page has no horizontal overflow.
- Server time sets the immutable 30-minute / 2-hour / 12-hour / custom-up-to-3-day deadline; 2 hours is the default. Custom windows use whole-minute values from 30 minutes through 3 days.
- Logged-out visitors can open, listen to either full song, switch A/B playback, pause, seek, see time remaining, and share. Suno works resolve their public media metadata and playback-rights handshake, then play inside the Q Crash player; a failed source shows an in-app error and never silently falls back to opening Suno. Pressing the protected vote path returns through sign-in to the exact card.
- Before leaving for sign-in, the selected A/B draft is stored with the voting deadline. Email and OAuth callbacks keep the exact return target until the Q Crash destination really loads, use a full-page return navigation, restore the draft without auto-submitting it, and do not fall back to `/`.
- Participants cannot vote. A signed-in audience account can vote once and cannot recast.
- Selecting A/B does not write a vote. A fixed, explicit confirmation dock remains visible above the player; before confirmation the listener may replay, seek, and switch choices, and after confirmation the vote cannot change. Logged-out copy says `登入並投作品 A/B`.
- Before confirming the vote, that voter may enter one optional comment of at most 120 characters and send it with the A/B vote. After confirmation, the API/UI rejects new, edited, or deleted comments; before settlement it returns no public comment list/count, and after settlement visible comments are public. Comments never affect voting or five-axis feedback.
- Each signed-in non-participant may select 押韻、爆點、旋律、情緒、結構 once per work. Every key locks immediately; participants cannot submit feedback.
- During voting, the public API/UI returns no tally, percentage, total audience, feedback aggregate, leader, radar, or inference signal. It may return only the current listener's own selected feedback keys. Direct guest voting and the normal `cast_vote` path reject Q Crash.
- Owner Analytics records a private funnel with distinct browser sessions: open, both works played, A/B selected, sign-in encountered, and vote submitted. Playback duration and completion never gate voting, and no funnel count appears in any public or participant-facing pre-deadline surface.
- Deadline settlement runs from the 5-minute Battle fallback cron and also settles opportunistically on a post-deadline card read.
- Verify 0, 1, and 2 valid audience accounts settle as insufficient with no archive/stats/Showtime/rematch. Verify 3+ creates an official work-first result and saves the winning queue/work ID.
- Verify official ties reuse the stable formal Drop Battle tie breaker.
- Final notifications and result copy name the winning work first and then the creator. Same-owner comparisons never say the creator defeated themself.
- Official result shows the winning work's five-axis pentagon distribution. Insufficient result shows no radar or feedback aggregate.
- Battle Records places official Q Crash results in a separate cyan section, labels them `Q CRASH`, and links to `/b/{shortId}` / the interactive Q Crash card rather than only the generic result page.
- After an official result, signed-in non-participants can choose a separate preferred work A/B and change it later; the UI labels it as post-result preference and never mixes it into official vote totals or winner stats.
- Legacy archives without `source: drop_battle` or `source: q_crash` stay in storage but are hidden from the public Battle Records list.
- Every work opens an in-page lyrics HUD and has a readable `歌詞未提供` fallback.
- Check the pending, voting, voted, insufficient, official-result, cancelled, and expired screens at 1440x900 and 390x844. The shared five-key dock, fixed vote-plus-optional-comment confirmation dock, and fixed bottom A/B player must not cover one another or create horizontal overflow. Before confirmation, the optional comment is sent together with the vote; after confirmation, no comment editor or edit/delete action is shown.
- Confirm ordinary live Drop Battle guest voting, Battle Records, official gatekeepers, rematch, Explore challenges, and Showtime do not regress.
- Before enabling Q Crash in production, apply and verify `supabase/20260731_q_crash_async_drop_battle.sql`, `supabase/20260731193000_q_crash_feedback.sql`, `supabase/20260731233000_q_crash_voter_comments.sql`, `supabase/20260801055052_q_crash_work_covers.sql`, and `supabase/migrations/20260901090000_q_crash_full_song_tracks.sql`; code deployment without these schemas/columns is a release blocker.
- Apply and verify `supabase/20260801070000_q_crash_post_result_preferences.sql` before enabling the post-result A/B preference controls; until then the card must remain readable without breaking official Q Crash results.

## Explore AI Music Challenge Checklist

Check:

- `/ai-music` loads real Bar Heartbreak/public-airplay works and only lights the challenge button when the track status is `等人挑戰` and a defender 60s Drop is prepared.
- The `/ai-music` bottom mini player exposes a draggable playback progress bar, time labels, and a lyrics HUD popup with a side lyrics scroll slider.
- Profile creator data lets the owner switch each public track among `僅展示`, `等人挑戰`, and `自定開戰`.
- Profile shows `尚未準備守擂 Drop` before a defender Drop exists, routes the owner to the 60s Drop cropper, and blocks replacing the defender Drop while an attack invite is pending.
- Challenging from Explore opens the 60s Drop cropper/setup flow, carries the defender track ID through upload, and requires a start time.
- Submitted Explore challenges copy the defender's prepared Drop at invite creation; they must not use the full public-airplay song as the defender battle audio.
- Submitted Explore challenges create a pending battle/invite; the battle room allows both 5-second previews but voting remains closed.
- Submitted Explore challenges write a defender-side in-app notification. The right-top notification dock shows a red dot or unread number, opens a readable account-notice card, and routes Explore challenge invites to Profile's `待接戰` section.
- Profile / 我的作品 shows `待接戰` cards with song title, challenger, genre, scheduled start time, defender 5-second preview, challenger 5-second preview, Accept, and Reject.
- The individual track row shows `待回覆` / locked defender Drop state while a pending invite exists; replacing the defender Drop is blocked until the invite is accepted, rejected, or expired.
- Defender accept moves the battle to active/live according to the scheduled time; reject closes the invite without stats.
- Defender timeout expires the invite and linked battle/queues without stats, Showtime progress, or either-side win/loss. The same challenger cannot keep multiple pending invites against the same track.
- A challenger is blocked after 6 outgoing Explore attack invites in the Taiwan day.
- Explore challenge results need 3 distinct non-participant voters; tied official results award the defender; under-3 shows audience-insufficient/no result.

Drop cropper keyboard check:

- In `/battle/hook-cut`, Space toggles preview only when focus is not inside textarea/input/select/contenteditable/`role="textbox"`, no meta/ctrl/alt is pressed, and IME composition is not active.
- Lyrics textarea, song title input, creator input, AI tool fields, genre select, notes/description, and other text-editing targets can enter Chinese and English spaces normally without `preventDefault`.

When the 10-card limit is implemented, also check:

- The 11th public Drop challenge is blocked before or at queue insert.
- User-facing copy says the Drop challenge field is full.

## 24H Full Song Checklist（僅修改此保留系統時）

Check:

- 24H upload mode loads.
- Full-song file size limit message is visible.
- Single active 24H per-user limit is enforced.
- Finished, cancelled, or expired 24H entries release the user to start another 24H challenge.
- A user with an active 24H Full Song challenge can still start one active Drop Battle.
- Duplicate active 24H audio is blocked when audio hash exists.
- Queued 24H challenge appears on Battle page.
- Queued 24H share links use `/d/{shortId}`.
- Another user can accept a queued 24H challenge.
- Live 24H battle page loads.
- Live 24H share links use `/h/{shortId}`.
- Voting requires login.
- Finished 24H battle records winner when not tied.
- Legacy 24H results remain historical Battle records; they do not grant certification or enter monthly charts automatically.

When the 10 active limit is implemented, also check:

- Count includes both `queued` and `live`.
- The 11th active 24H Full Song entry is blocked before storage upload.
- User-facing copy says the 24H Full Song field is full.

## Bar Heartbreak Checklist

Check:

- Page loads at `/listen-bar?lang=zh`.
- Public listening works without sign-in.
- The lower hero action strip shows `Drop Battle` directly beside `探索 AI 音樂`; it links to `/battle?lang=<lang>`. On mobile, both actions remain centered side by side on the second row without horizontal overflow.
- There is no explicit play/pause button in the public radio UI.
- Record/cover image renders.
- Progress bar and public volume control render.
- Lyrics area is readable and does not collapse too short.
- Comment box appears near reactions.
- Logged-out voting shows sign-in message.
- Logged-out commenting shows sign-in message.
- Logged-in Heart reactions allow one active Heart per track per Asia/Taipei day.
- Re-pressing Heart on the same track cancels that day's Heart and synchronized favorite, decrements the shared total, and allows a subsequent new Heart.
- Bar Heartbreak room-message surface title is `傷心的故事傾訴留言`, not `AI 音樂交流區`, and general room messages are retained for 24H.
- Public music surfaces show total Heart count only as the public metric; the viewer's own Heart button may light to show today's active Heart, but the page must not show public favorite state, favorite-user count, or who saved the song.
- Explore AI Music and Bar Heartbreak show the same total Heart count for the same `listen_bar_tracks` song and write through the same reaction flow.
- Track comments persist.
- Track comments notify the song creator through account notifications, except self-comments.
- Upload requires sign-in.
- Upload policy copy is visible.
- My Bar Tracks shows creator's Challenger/public tracks after sign-in.
- Creator can remove own Challenger.
- Creator can remove own public-pool song.

Challenger and public pool:

- Visitors can switch Bar Heartbreak playback between all public airplay and the 11 fixed music genres.
- Genre filter UI shows current track counts, with each genre using a 36-track public-pool target.
- New submissions enter the selected genre's public pool while that genre has fewer than 36 active public songs; full genres send new submissions into same-genre Challenger with 36-hour protection.
- New submissions are blocked when the creator already has 5 or more active public-pool songs in the selected genre; the creator must reduce that genre to 4 public songs before uploading that genre again.
- Creators with 30 or more active public-pool songs across all genres can successfully upload at most 1 active song per Taiwan day.
- Creator upload flows require a fixed genre and must not silently default missing genres.
- Creator Challenger slots use the per-creator, per-genre 3/2/1 ladder: 0-2 same-genre active public songs allows 3 active Challengers, 3-5 allows 2, and 6+ allows 1.
- Public-pool songs do not occupy Challenger slots and must not be removed by this slot limit.
- Public pool progress shows current total over 396 and per-genre counts over 36.
- Public-pool elimination starts only when a genre has more than 36 public songs and removes at most 3 per pass from overfull genre pools.
- `GET /api/listen-bar/process-rotation` is manual/monitoring dry-run preview only.
- Mutation requires protected POST and `LISTEN_BAR_ROTATION_ENABLED=true`.

Choice and retired Spotlight:

- `/admin/listen-bar` song management lists 10 songs per page; `選取本頁` selects only the current page, while bulk update / hide / restore / delete still works for accumulated selections.
- `/admin/listen-bar` defaults to the `全部上架` active/on-air view, has no duplicate `隱藏下架` filter, keeps removed songs out of both active and hidden views, and provides separate `只看下架` and `已移除` views with restore. It shows `NEW` for `created_at` within seven rolling days and persists the owner-only external-promotion checkbox without changing `promoted_at`.
- `/admin/listen-bar` search/filter toolbar uses one consistent control height and radius at desktop and mobile widths, with no vertically wrapped button labels or orphaned sort control.
- `/admin/listen-bar` metadata and bulk-metadata saves preserve the current visibility, genre, month, search, sort, and page view; editing while sorted by upload time must not jump to update-time sorting.
- `/admin/listen-bar` upload preview and track rows each expose one play action. Every preview switches the same fixed bottom player with play/pause, seek, volume, and close controls; no track card renders its own native audio control.
- `/admin/listen-bar` has no Daily Spotlight selector, date, copy, media, preview, save, or draft-generation controls, and makes no Daily Spotlight API request.
- `/listen-bar?spotlight=YYYY-MM-DD&lang=zh` returns normal Bar Heartbreak with no specified-song playback or Spotlight panel.
- `/today?lang=zh` returns 307 to `/rank?lang=zh#choice-weekly`.
- `/admin/social` remains the only draft, approval, and manual publishing console; Discord publishing still requires an approved draft plus its explicit publish action.
- /admin/showtime 不再提供授證；舊入口導至 Choice 管理，作品管理使用 /admin/listen-bar。音檔、實際 Battle 結果、票數及 Heart 不可改寫。
- /admin/choice 僅管理已發布歌單，owner 統一使用 /profile/choice 製作。官方新增／編輯／發布／封面 API 回傳 410，管理 GET 不返回草稿或選曲庫，分頁讀取全部已發布歌單；不自動生成社群草稿或對外發布。
- Existing `listen_bar_daily_spotlights`, historical assets, and old social drafts are not deleted during this retirement.

## AI Music Works Checklist

Check:

- Homepage first-layer primary action says `探索 AI 音樂` and links to `/ai-music?lang=zh`.
- `/ai-music?lang=zh` returns 200 and uses the main title `AI 音樂作品`.
- The `/ai-music` header is a compact, centered catalog stage. Its eyebrow, live `[作品庫] {count} 首公開作品 · 11 種風格` marker, title, yellow subtitle, submission prompt, cross-surface navigation, and local view control share one central axis; the public UI does not show `真實資料，不含 mock` / `Real records only`.
- The `/ai-music` header includes the upload prompt `上傳音樂讓大家看到你的作品，請從傷心酒吧投稿。` and links it to Bar Heartbreak submission.
- The `/ai-music` internal navigation order is `作品瀏覽` -> `傷心酒吧` -> `Drop Battle` -> `Showtime` -> `Choice`.
- The fixed icon-only `/guide.png` button opens the `/ai-music` GUIDE HUD. Verify its accessible name, X, Escape, backdrop close, focus trap and focus return, its Chinese and English copy, mobile scrolling above the mini player, and that no visible `<details>` explainer remains.
- An Explore share URL has the shape `/ai-music?lang=<lang>&track=<id>#works`, stays on Explore rather than Bar Heartbreak, expands the matching style lane, and scrolls to the shared work without autoplay.
- The masthead is compact and cover-led: the first genre title and first covers are visible at 1440x900 and 390x844 without a fake waveform, `Live Drop Signal`, `60s READY`, dashboard cards, or a long gameplay explainer occupying the first screen.
- `依類型 | 正在升溫` is a local Explore control. The default preserves genre lanes; Hot Now remains separate from Showtime and Choice, but uses the same compact cover-card density: mobile horizontal scrolling and desktop 3 / 4 / 6-column grid, never a wide rank table.
- Hot Now reads only 7-day distinct Heart supporters, official Battle audience votes from archives meeting the 3-voter threshold, latest qualified interaction, then created_at/id. It never uses all-time Hearts, play counts, mock scores, or Heat Score. Signal-less works are `正在累積` with no rank number; this remains separate from monthly chart counting.
- The page groups works by the current 11 fixed music genres and shows at most 6 cards per genre before `看更多`.
- Explore has no standalone `最新上架` / `New Arrivals` / `72 小時新歌` shelf, route, category, or independent `看更多`; new eligible works appear at the front of their existing genre lane.
- `NEW` uses `created_at` younger than a rolling 7 x 24 hours for both its badge and Explore sorting priority; it expires from both at the seven-day boundary and never reads `updated_at`.
- Explore places `NEW` at the cover top-left and keeps `接戰` at the top-right without overlap on desktop/mobile. Bar Heartbreak shows `NEW` on the now-playing cover and beside new tracks in the visible queue, Challenger pool, and creator track list.
- A NEW work (within rolling 7 x 24 hours by `created_at`, never `updated_at`) appears ahead of established works in its genre lane; lanes with NEW works lead the wall by newest NEW `created_at`, while lanes without NEW works keep the fixed genre order.
- The collapsed first 6 cards in a genre lane show at most one NEW work per creator; all other NEW works remain visible after that lane's `看更多` expansion.
- Cards show song title, creator, AI tool, heart count, and challenge count.
- Cards that are truly challenge-ready show a non-clickable red angled `接戰` badge at the cover's top-right on desktop and mobile; non-ready, retired, hidden/removed/moderation-held, missing-drop, or unplayable works do not show it. Old certification alone is no longer a gate; the creator must explicitly opt in after the one-time reset.
- The card's bottom `攻擂` button remains the only challenge action; the `接戰` badge must not replace it or use `攻擂` as badge text.
- Signed-in users with today's active Heart see the Heart button lit on `/ai-music` cards and the bottom mini player; re-pressing it cancels the Heart and synchronized favorite while the card still shows only total Heart count publicly.
- Desktop hover exposes the Battle Record HUD.
- Mobile exposes an equivalent expanded HUD via the info action.
- Cards and Battle HUD retain actual wins/losses; six-defense certification progress and promotion promises are removed.
- Card play opens the bottom mini player and does not expand per-card audio controls.
- `Drop Battle`, `Showtime`, `傷心酒吧`, and `Choice` are internal options on `/ai-music`.
- Old genre labels are not shown as current category headings.
- /api/ai-music/tracks 不再排除舊認證作品；8 敗退場及既有歷史豁免仍在。挑戰由公開狀態、未退場、創作者自行 opt in 和準備好的 Drop 決定。
- /rank 改讀月榜 RPC 與公開 Choice，不從認證或 Battle archive 建造另一份作品牆。

## AI Music Practice Bible Checklist

- Homepage lower navigation shows `AI 音樂練功聖經` with the book icon and links to `/ai-music-bible?lang=zh`; the old homepage `歌曲分析` card is absent.
- `/ai-music-bible?lang=zh` returns 200. Signed-out visitors see the normal Bible title/value preview, a focused sign-in dialog, and public links to Explore and Bar Heartbreak; signed-in members see the complete Bible and A&R Gate remains only inside its practice map/toolbox.
- The Bible Hero exposes a clear localized `分享聖經` / `Share Bible` action in both access states. It keeps the current `lang` in the shared URL, uses native sharing when available, and shows the copy fallback without requiring sign-in.
- Desktop at 1440x900 keeps the full `AI 音樂練功聖經` title together without a single orphan character; mobile at 390x844 has no horizontal page overflow.
- `#suno-prompt-library` and nested `#lyric-control-library` are directly reachable from the practice map and render complete Chinese and English variants.
- The Suno library contains 163 unique free prompt moves, 21 unique lyric moves, at least 80 unique normalized genre terms, and six production-flow steps. The lyric library includes the five-layer basic vocal direction cues for delivery, character and tone, effects, placement, and transitions. The 163 prompts include the original Studio Mastering pack plus five Disco directions, 45 Beatport screenshot expansion prompts, core prompt moves, and 40 modular instrument-tone directions for common instruments, recording, effects, and mix/master balance. Every move has bilingual title, summary, use case, copy text, source attribution, and an official / field-tested / version-sensitive evidence label.
- The credited community guide and Apache-2.0 open skill remain internal provenance for seven deduplicated bilingual moves; the public library does not expose original-source buttons or attribution labels. Community cue counts, prompt lengths, bracket behavior, BPM, and key suggestions are not mislabeled as guaranteed Suno commands.
- Prompt, lyric, and genre search/filter interactions work on desktop and mobile; technique cards and genre groups copy the expected text, and Show All reveals the complete catalog without page-level horizontal overflow. Selecting `錄音室 Mastering` reveals the 15 wrapping music-family filters, family selection narrows the 100 Studio Mastering cards, and every studio card keeps a visible family badge.
- Prompt and lyric search panels include a visible instruction, readable placeholder, live result count, clear-search action, 44px-or-larger category targets, `aria-pressed` selected state, and wrapping category controls without a mobile horizontal scrollbar.
- `#suno-inspiration-index` is reachable from the practice map and shows two obvious database tabs: 772 artist sonic-DNA references (771 encyclopedia entries plus one labeled AIPOGER addition) and 747 canonical prompt recipes. The source total is 750 recipes and exactly three duplicate combinations are removed.
- Artist and recipe searches accept Chinese and English terms, selected genre filters are unmistakable, result counts update live, clear-all resets every condition, and Load More adds 18 cards without page-level horizontal overflow.
- Artist cards show the lookup name but the copy action exports only sonic traits plus the no-direct-imitation guard. Recipe cards expose Chinese dimensions and copy a concise English prompt.
- Every index card exposes comments after member sign-in. The comments GET endpoint rejects missing/expired bearer tokens; signed-in users can post up to 280 characters, delete only their own comments, and report other comments.
- `ai_music_bible_entry_comments` has RLS enabled and no public/anon/authenticated table grants. The same-origin API validates catalog keys, authenticates bearer tokens with `auth.getUser`, rate-limits writes, and degrades to a compact preparing state when the schema is unavailable.
- The library labels the supplied V4.5/V5 material as older than current V5.5, links to official Suno documentation, and does not claim bracket tags, percentage recipes, key changes, or mix/master wording are guaranteed commands.
- `#suno-control-desk` exposes three distinct Style / Lyrics / Title starter channels, one copyable starter template, an eight-item resettable pre-flight checklist, and six symptom-led troubleshooting routes in Chinese and English.
- The pre-flight chapter explicitly labels 4-7 Style cues and three-render comparison as field methods rather than official Suno limits. Troubleshooting never promises that bracket labels, structure cues, or mix/master wording will force a result.
- The signed-in sticky Bible dock exposes high-contrast chapter shortcuts at desktop and mobile widths; `Command/Ctrl + K` and `/` open search, Arrow Up/Down change the active result, Enter navigates, and Escape/backdrop/X close the dialog. It must not overlap the floating account/avatar dock.
- `#suno-version-watch` and `#rights-release` show page-updated and official-cross-check dates separately. Official feature cards link only to current Suno help pages, and rights copy distinguishes paid/free generation context, non-retroactive rights, and copyright uncertainty without presenting legal advice.
- The server-rendered public starter and five-question FAQ are localized for Chinese, English, Japanese, and Korean. They remain high-level, expose none of the complete 1,519-entry member index, and match the localized `TechArticle` / `FAQPage` JSON-LD plus canonical, hreflang, Open Graph, and Twitter metadata.
- `#stem-separation-guide` renders complete Chinese and English variants with 10 unique engine families, 7 unique goal routes, and official source links that open externally.
- Choosing a Stem goal updates the recommendation and highlights only the matching engine cards; accordion cards expose strengths, limits, implementations, and source links on desktop and mobile.
- The Stem guide credits the owner-provided PDF and its credited author, shows the 2026-07-17 cross-check date, treats FL Studio's underlying engine as undisclosed, and does not repeat the PDF's unconfirmed LALAL.AI direct-synthesis claim as fact.
- The Stem section remains readable at 1440x900 and 390x844 without page-level horizontal overflow.
- All 100 audited free Studio Mastering Prompt cards show one localized `15 秒試聽` / `15s preview` action and the generation-variability note. `Modern Taiwanese Pop` must not appear as a free searchable/copyable card or expose a stale preview action. `Chinese Gufeng Cinematic` must be searchable in Chinese and English and expose its approved preview. Clicking any example opens the shared fixed bottom player with seek, previous/next, mobile/desktop volume, and close; cards do not autoplay or render native audio controls.
- All 100 public audited Prompt preview MP3 URLs return `200`, have a duration of 15 seconds within normal encoding tolerance, keep a consistent perceived loudness without clipping, and can be traced to a corresponding Suno-generated source and crop point. Beatport expansion clips are demo sketches for direction listening and must not be described as formal mastering references.

## Comment Moderation Checklist

- `/admin/comments` rejects signed-out and non-owner accounts, and the API validates the bearer token with `auth.getUser` plus the owner allowlist.
- The desk loads Bar Heartbreak, Choice, and Bible persistent comments into one newest-first list without exposing user email addresses.
- Search, source filters, status filters, report-first view, target links, refresh, and pagination work on desktop and mobile.
- Hide removes a comment from its public/member API while preserving its body and moderation audit fields; restore makes it visible again.
- Resolving a reported comment closes matching open/reviewing `content_reports`; hide and permanent delete also resolve matching reports.
- Permanent deletion requires a second confirmation and removes only the selected source/id pair.
- Production moderation schema was applied and verified on 2026-07-17 with `20260716180323_ai_music_bible_entry_comments.sql`, `20260716185707_centralized_comment_moderation.sql`, and `20260717093516_comment_moderation_audit_indexes.sql`. All 20 pre-existing Bar Heartbreak comments remained `visible`; Choice and Bible began empty; no comment was deleted. All three tables have RLS enabled, no `anon` or `authenticated` grants, complete `service_role` access, moderation constraints, lookup indexes, and covered moderator audit foreign keys.
- The Taiwanese lab contains 38 unique seed rows, searches across meaning/recommended form/Suno form/note, filters by category, copies the Suno form, and switches from a desktop table to mobile cards.
- The lab disclaimer distinguishes AI singing phonetic experiments from recommended Taiwanese orthography.
- New suggestions require meaning, Suno writing, and a test note. Successful submissions show a pending-review confirmation instead of claiming immediate publication.
- `ai_music_bible_contributions` has RLS enabled; `anon` and `authenticated` have no direct table read/write grants; only the server service role can insert/review rows.
- `/admin/ai-music-bible` lets an owner search three editable groups, save bilingual copy/category/evidence fields or Taiwanese pronunciation notes, and restore a single row to its default. The page must show a clear migration-unavailable state instead of implying a save succeeded.
- `ai_music_bible_content_overrides` has RLS enabled with no `anon`/`authenticated` grants; public/member Bible reads and owner edits are server-mediated and preserve the static catalog as a fallback.
- Contribution requests reject foreign origins, use a honeypot, validate lengths and enums, and limit a request fingerprint to 6 submissions per hour.

## Earworm Checklist

Check:

- `/earworm` loads 10 real public playable works without a genre selector.
- Genre labels stay hidden during the questions and appear only in the final personality result.
- All four reactions are available immediately because Earworm records first impressions; there is no minimum listening time. Each track attempts automatic playback, and a visible `下一首` action records `無感` before advancing.
- Progress advances exactly once per answered work and reveals the result only after 10 answers.
- The result shows one `目前最接近` primary genre, two nearby genres, and listening keywords. Its vertical action order is `去探索音樂` -> `去傷心酒吧` -> `看看為我挑的歌` -> share -> retest; Explore and Bar use equal destination-card treatment.
- A signed-out visitor can see the result without a save prompt. Signed-in results save silently; the result has no `結果已保存`, account-save status, or separate save control.
- Ordinary `/ai-music?lang=zh` entry shows a dismissible Earworm invitation only when no fresh completion or skip exists; track/share/genre/challenge links bypass it. `先逛逛` suppresses it for 7 days and a completion suppresses it for 30 days.
- Completion writes a compact browser-local result for guests and members without per-song reactions. Explore shows one approximately 70/30 match/discovery recommendation shelf; the standard catalog remains available.
- The API rejects fewer/more than 10 answers, duplicate track IDs, invalid reactions, negative observed listening seconds, unavailable tracks, and a mismatched quiz key.
- Earworm exposes no APC copy, reward field, daily point limit, or point-award RPC call.
- `earworm_personality_results` has RLS enabled, no direct `anon` or `authenticated` grants, service-role access, and one-result-per-quiz protection.
- `earworm_track_reactions` has RLS enabled, no direct `anon` or `authenticated` grants, service-role access, and unique `(user_id, track_id)` protection. Retesting updates the latest aggregate input instead of adding a second public sample; no per-song personal history is exposed in Explore or Bar Heartbreak.
- `earworm_track_affinity_stats` is service-role-only. Explore and Bar Heartbreak read the same track aggregate, hide percentages below 20 distinct accounts, and show `好感度累積中` for tested small-sample works.
- Production Supabase application was verified on 2026-07-22: `earworm_personality_results` and `earworm_track_reactions` have RLS enabled; anon/authenticated direct reads are revoked; the service-role aggregate view is available. `20260725_earworm_instant_reactions.sql` was applied to relax only the listening-time check from eight seconds to non-negative observed time; all 10 existing reaction rows remained and RLS/grants were unchanged.
- Blind affinity never changes Heart totals, Bar pool/survival order, Battle votes/results, defense progress, Showtime certification, Choice, or public rankings.
- Earworm writes no formal Battle votes, results, wins/losses, defense progress, or Showtime state.
- Verify 1440x900 and 390x844 layouts, Explore invitation/skip/reopen, the single recommendation shelf, public favorability labels without personal-answer chips in Explore and Bar, first-load autoplay fallback, play/pause, seek, immediate reactions, `下一首`, next-track autoplay after a user gesture, tenth-answer result, the exact five-action result order, retest, and no browser console errors.

## Showtime 月榜與 Choice 驗收（2026-09-17）

- /rank 保留 AIPOGER Showtime 品牌，Choice 與月榜同時掛載，不用頁籤；#choice-weekly／#monthly-charts 是原生錨點。桌機約 70/30，手機為主推、月榜摘要、更多 Choice；僅一個製作入口，空／少內容不留廣告占位。
- 主推設定存於私有 listen-bar-data/choice/featured.json；僅 /api/admin/choice 的 owner guard 後可寫入。set_featured 驗證 kind、UUID、已發布及可播歌曲；公開讀取排除草稿／撤下／刪除，畫面再與公開可播歌單交集，不能靠主推繞過可見性。無 DB schema 變更，不修改認證、曲庫、票數或收藏。
- 月榜摘要最多五筆；完整展開及月份／類型／搜尋可用，Play All 依完整篩選名次。測試實際 API 權限與主推儲存失敗，既有 auth race／跨日愛心／共享播放器測試必須保留。
- 月榜讀 /api/charts/monthly，DB 依台灣曆月逐筆有效 Heart 去重、排除作者自投，至少 3 位支持才列名次，同分 1、1、3；類型榜使用各類型名次。不得從前端陣列索引或累積愛心捏造順位。
- 月份選單只顯示啟用後真實月份；本期更新、過期封存，零支持月份仍封存一次。歷史榜不得因下架重排；下架、未公開、審核中或無音檔歌曲不可播放。
- monthly_charts migration 的讀取／封存 RPC 僅 service_role 可執行；表格 RLS 開啟。來源寫入與月末封存共用 advisory lock；以獨立 PostgreSQL 測試驗證去重、跨月、取消支持、同分、權限、不可改寫及超過 1000 筆。
- /api/cron/monthly-charts 驗證 CRON_SECRET，每日台灣 00:05 執行；資料讀取與來源寫入也會補結算已完成月份。缺少 schema／權限不可偽装成正常空榜。
- 圖片、播放、收藏與分享沿用真實歌曲。月榜愛心使用歌曲 /api/listen-bar/reaction，Choice 歌單收藏與既有歌曲收藏保持各自語意；不新增第二套歌曲人氣分數。
- 公開 Choice 使用 PublicChoiceGallery 與 ShowtimeChoiceShelf，保留策展者身分封面、期別、標題、推薦介紹、HUD、評論、獨立歌單收藏與分享頁。官方／個人身分不可從標題猜測。
- 任何登入創作者可從 /profile/choice 開啟自己的收藏選曲；搜尋／類型篩選、獨立勾選框、已選清單、第一首自動建草稿、排序與手機上下移動、預覽、發布 5–10 首。單週一份 Choice 不改。
- 取消收藏不連帶刪除已選 Choice，移出 Choice 不取消歌曲收藏；未收藏新歌不可繞過 API 加入。既有公開歌單及舊 Battle 選曲保留來源 ID／音檔公開同意，不會因認證退役而消失。
- 所有創作者自有作品由 Profile 管理顯示資料與外部支持連結，音檔、戰績、票數不可改寫；修改外部支持連結仍進既有審核。平台不處理支付或金額。
- 認證入口、六次守擂認證進度、官方認證標章及認證資格 gating 移除。舊認證 metadata 僅歷史保存，新增資料不得授證。
- 原認證歌曲在退休遷移時一次設為 showcase；創作者可自行重新 opt in，重跑遷移不得覆蓋之後設定。歷史 8 敗豁免保留，未新增或恢復酒吧淘汰。
- 中英日韓、桌機 1440x900／手機 390x844 檢查：封面可见、文字換行、無橫向溢出、頁籤鍵盤操作、規則 HUD 關閉、底部唯一播放器不遮操作。
- 未登入者可聽歌與看榜；收藏／管理要求登入。驗證 auth 切換時清除舊私人資料，忽略舊請求，錯誤能重試且不鎖死 busy 狀態。

## Storage Checklist

Before large upload-related releases, check:

- Total Supabase Storage usage.
- `battle-audio` bucket usage.
- `listen-bar-audio` bucket usage.
- Largest file size.
- Current 24H queued/live count.
- Current Drop open challenge count.

Reference measurement from 2026-05-29:

- Total Storage: about 1.78 GB.
- `battle-audio`: about 1.15 GB.
- `listen-bar-audio`: about 606.5 MB.
- Largest observed file: about 44.7 MB.
- Drop open: 0.
- 24H queued: 1.
- 24H live: 0.

## Mobile Checklist

Check at least one mobile viewport after UI changes:

- Home first viewport.
- Battle page.
- Battle setup.
- Bar Heartbreak now-playing area.
- Bar Heartbreak upload form.
- AIPOGER Showtime.
- Bar Heartbreak volume slider changes the effective audio level on a volume-locked mobile-media simulation, not only the displayed percentage; playback still advances after the gain node is connected.

Look for:

- Text clipping.
- Overlapping cards.
- Buttons too small to tap.
- Horizontally overflowing content.
- Audio controls crowding layout.
- Fixed home, language, and account controls do not cover page kickers or headings.
- Logged-out visitors see a sign-in action rather than a profile avatar with an empty notification bell; `/profile` returns them to sign-in and preserves the Profile return path.
- Signed-in users can click the center of the floating avatar to open Profile even when an account/Battle notice is present; the small bell is the separate notice control.
- Floating-avatar click is not swallowed by drag handling: pointer capture starts only after more than 8px of movement, while a real drag still persists its edge-relative position across release, reload, and viewport resize.
- Owner and non-owner signed-in sessions both render the floating Profile entry; Supabase auth-state changes update the dock when a session is signed in, signed out, or switched without requiring a full reload.

## Smoothness Checklist

Check:

- The desktop Battle Pool start-challenge artwork stays inside its header and does not cover genre filters or challenge cards.
- The Battle Pool first viewport shows `探索音樂` / `Explore Music`, `傷心酒吧`, `對戰記錄`, `Showtime`, and `Drop 規則` in that order; share is separate from destination navigation.
- At 1440x900 and 390x844, the public challenge-pool heading is visible without a fake waveform, decorative play control, deck/EQ decoration, oversized navigation cards, character overlap, or mobile `VS`.
- Desktop Battle Pool shows a large, legible `VS` between the fighters. The signed-in account dock defaults to the safe upper-right slot and does not jump back or drift into central content after drag, reload, or viewport resize.
- `/battle/results?lang=zh` uses `對戰記錄`; `/battle/results?lang=en` uses `Battle Records`. No public entry should still say `成果牆` / `Result Wall`.
- Bar Heartbreak shows one static Explore hint when there are no live Battle messages; duplicated marquee content is reserved for an active scrolling ticker.
- Legacy `/watch?lang=<lang>` keeps the supported language when it redirects to `/battle`.
- Music analysis cold starts return a non-error warming response while Render wakes; an actual upstream failure still returns a service error.


## 第一批版面與戰績回歸

- 空 Q Crash 不渲染大型空棚架；有卡時 A/B 卡仍存在且不進 Drop 列表。
- 無活躍 Q Crash 時，桌機與手機首屏可見 Drop 公開挑戰池主標。
- 個人推薦存在時，Explore 分類切換仍在其前；Heart、分享、播放、HUD 與開放接戰入口可用。
- 對戰記錄切換月份後，兩模式與本月摘要一致；超過 12 場 Q Crash 也不截斷本月小計。
- 4:3 顯示得票率 57%；缺少雙方票數不捏造百分比。

## 傷心酒吧持續聆聽切換（2026-09-08）

- `supabase/migrations/20260907182740_retire_bar_survival.sql` 已套用正式 Supabase；先以 transaction rollback 驗證，再正式套用，RPC 回傳全零。
- Vercel rotation cron 移除，GET/POST 相容端點不讀寫資料；DB 仍阻擋系統容量淘汰，保留明確人工撤下。
- 曲庫 API 分頁讀取並嚴格檢查公開狀態，Showtime 認證不再排除酒吧播放；前端不截斷 396 首。
- 遷移前後：280 筆作品、628 愛心、45 筆認證、91 筆非公開狀態一致。可公開播放的社群作品為 189 首。
- 回復程式不會回復 DB；原函式定義保存在私人 audits/2026-09-08-bar/database-functions-before.json。不要為回復畫面自動恢復淘汰。

## 共用播放器回歸（2026-09-08）

- 根 layout 透過 GlobalListenBarDock 掛載唯一 GlobalMusicPlayer；ShowtimeQueuePlayer 保留 imperative API 作為無音訊的相容入口。頁面使用 music-player-store 訂閱目前歌曲及進度。
- 酒吧下一首預告直接讀同一個 session queue；歌單建立後不受換頁、探索排序或新投稿影響。曲風庫每分鐘核對下架資料，僅從既有酒吧佇列移除不可播歌曲，不插入新歌曲。
- 驗證有限歌單結尾、單曲曲風循環、上一首歷史、快速連續跳歌、暫停後跨頁、拖曳後自然接播、音量、歌詞 Escape 與未登入愛心提示。桌機、手機及中英日韓控制項需渲染檢查。
- 首頁背景音樂在已有共用播放 session 時不自動啟動；使用者主動播放其他音訊會暫停共用音訊，避免重疊。

## 創作者七日上傳額度與 Choice 發布（2026-09-17 22:42 Asia/Taipei）

- 正式程式提交 `86f837e`，發布分支 `codex/creator-upload-week`；從正式版基準 `034238ba` 建立乾淨 worktree，再帶入 Choice 提交 `f92356e` 與本次額度修正。未混入原工作區其他未提交變更。
- Vercel deployment `dpl_45MNJq2frL4vRY8YbYYDnkR3j7vY` 為 READY，正式網址 https://aipoger.com；版本網址 https://aipoger-web-rnz8-kcqshch4n-yohungs-projects.vercel.app 。本節是部署後證據，文件提交不改變上述程式版本。
- 正式 Supabase 已套用 `20260917142731_creator_upload_week.sql`。獨立帳號計數列保留刪歌後額度；原子 upsert 防止並行投稿超額。沒有回填或修改既有歌曲。
- `tests/creator-upload-week.sql` 已以 transaction rollback 驗證第三首成功、第四首拒絕、刪除與編輯不退額度、168 小時到期重啟、失敗交易不計數及帳號隔離／權限。不是實際多連線壓測；沒有留下測試歌曲。
- 遷移及回滾測試前後：歌曲 292、啟用 196、Heart 661 一致，額度表為 0 列。正式公播 API 回傳 196 首；公開 Choice API 為 200，未登入管理 Choice API 為 401。
- TypeScript、37 項相關 Node 測試與正式雲端 build 通過；lint 0 errors、16 項既有 warnings。本機 build 因已遮蔽的本機金鑰出現 sitemap API-key 提示，但雲端 build 使用正式環境設定並成功。
- 瀏覽器檢查中文桌機 1440x900、手機 390x844 與中英日韓額度文案，手機無橫向溢出；未登入提示為登入後查看。未使用登入帳號實際上傳歌曲，登入者完整端到端投稿仍需人工驗收。額度約束已由上述資料庫回滾測試驗證。
- 原工作區保持原分支與既有未提交變更；本次程式、SQL、測試及主文件亦同步留在原 repo。後續發布須以此發布分支或更新正式版為基準，不能從較舊 HEAD 直接覆蓋正式站。
