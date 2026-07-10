# AIPOGER Release Checklist

Last updated: 2026-07-09

Use this checklist before and after deploying production changes.

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
- Logged-out visitors cannot vote or comment in Bar Heartbreak.
- Logged-out visitors are asked to sign in before upload/Battle actions.
- Logged-in users can see profile/fighter identity where expected.
- Profile `收藏歌曲` supports batch selection and batch removal, and removing saved favorites does not delete historical Heart reactions.
- Profile saved favorites can be removed even during the active 24-hour Heart cooldown; re-pressing the public Heart button still must not cancel or duplicate the Heart.
- Profile creator data lists songs in pages of 10; `收藏歌曲` can batch-delete saved favorites, and the creator's own Bar Heartbreak songs can be batch-removed from public/battle surfaces.

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
- Both participants can cancel an unfinished Drop Battle when the user is eligible.
- Quick start labels and stored start times are based on successful publish time, not a stale `expires_at`.
- Waiting room opens correctly.
- 0-2 distinct audience voters becomes audience-insufficient / no contest and does not create a result card, Showtime archive, song battle stats, battle history, or rematch window.
- 3+ distinct audience voters creates an official result that can be archived.
- AIPOGER Showtime reads Drop winners as `正式 Battle 認證` rows inside the unified certified-works catalog.

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

## 24H Full Song Checklist

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
- 24H winners, if surfaced from legacy records, must appear as certified works in the unified Showtime catalog rather than a separate 24H board.

When the 10 active limit is implemented, also check:

- Count includes both `queued` and `live`.
- The 11th active 24H Full Song entry is blocked before storage upload.
- User-facing copy says the 24H Full Song field is full.

## Bar Heartbreak Checklist

Check:

- Page loads at `/listen-bar?lang=zh`.
- Public listening works without sign-in.
- There is no explicit play/pause button in the public radio UI.
- Record/cover image renders.
- Progress bar and public volume control render.
- Lyrics area is readable and does not collapse too short.
- Comment box appears near reactions.
- Logged-out voting shows sign-in message.
- Logged-out commenting shows sign-in message.
- Logged-in Heart reactions allow one Heart per track per 24-hour cooldown.
- Re-pressing Heart on the same track during the 24-hour cooldown does not duplicate or cancel the Heart.
- Bar Heartbreak room-message surface title is `傷心的故事傾訴留言`, not `AI 音樂交流區`, and general room messages are retained for 12H.
- Public music surfaces show total Heart count only as the public metric; the viewer's own Heart button may light to show the current 24-hour cooldown, but the page must not show public favorite state, favorite-user count, or who saved the song.
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
- `/admin/listen-bar` has no Daily Spotlight selector, date, copy, media, preview, save, or draft-generation controls, and makes no Daily Spotlight API request.
- `/listen-bar?spotlight=YYYY-MM-DD&lang=zh` returns normal Bar Heartbreak with no specified-song playback or Spotlight panel.
- `/today?lang=zh` returns 307 to `/rank?lang=zh#choice-weekly`.
- `/admin/social` remains the only draft, approval, and manual publishing console; Discord publishing still requires an approved draft plus its explicit publish action.
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
- `依類型 | 正在升溫` is a local Explore control. The default preserves genre lanes; Hot Now is a single cover-led list and remains separate from Showtime and Choice.
- Hot Now reads only 7-day distinct Heart supporters, official Battle audience votes from archives meeting the 3-voter threshold, latest qualified interaction, then created_at/id. It never uses all-time Hearts, play counts, mock scores, or Heat Score. Signal-less works are `正在累積` with no rank number; Showtime rows have no attack action.
- The page groups works by the current 11 fixed music genres and shows at most 6 cards per genre before `看更多`.
- Explore has no standalone `最新上架` / `New Arrivals` / `72 小時新歌` shelf, route, category, or independent `看更多`; new eligible works appear at the front of their existing genre lane.
- A fresh work (within 72 hours by `created_at`, never `updated_at`) appears ahead of established works in its genre lane; lanes with fresh works lead the wall by newest fresh `created_at`, while lanes without fresh works keep the fixed genre order.
- The collapsed first 6 cards in a genre lane show at most one fresh work per creator; all other fresh works remain visible after that lane's `看更多` expansion.
- Cards show song title, creator, AI tool, heart count, and challenge count.
- Cards that are truly challenge-ready show a non-clickable red angled `接戰` badge at the cover's top-right on desktop and mobile; non-ready, Showtime, retired, hidden/removed/moderation-held, missing-drop, or unplayable works do not show it.
- The card's bottom `攻擂` button remains the only challenge action; the `接戰` badge must not replace it or use `攻擂` as badge text.
- Signed-in users who already sent a Heart in the current 24-hour cooldown see the Heart button lit on `/ai-music` cards and the bottom mini player, while the card still shows only total Heart count publicly.
- Desktop hover exposes the Battle Record HUD.
- Mobile exposes an equivalent expanded HUD via the info action.
- Cards and the Battle Record HUD show the Showtime defense progress, for example `守擂進度 4 / 6，再守下 2 場正式挑戰，進入 Showtime`.
- Card play opens the bottom mini player and does not expand per-card audio controls.
- `Drop Battle`, `Showtime`, `傷心酒吧`, and `Choice` are internal options on `/ai-music`.
- Old genre labels are not shown as current category headings.
- `/api/ai-music/tracks` returns official Explore defense success progress toward the 6-defense Showtime threshold, filters non-Showtime works that have 8 official Explore losses, and `/api/ai-music/challenges` blocks attacks against Showtime-certified or retired works.
- `/rank?lang=zh` consumes the same AI Music lifecycle API so 6-defense-certified Explore works appear in Showtime.

## AIPOGER Showtime Checklist

Check:

- Page loads at `/rank?lang=zh`.
- Main title says `AIPOGER Showtime`.
- Header copy says Showtime is a certified works archive and that certified works no longer accept challenges.
- Homepage exposes an `AIPOGER Choice Weekly` entry that lands on `/rank?lang=zh#choice-weekly`.
- Showtime includes a slim `AIPOGER Choice` direction anchor after the catalog without claiming a complete weekly automation workflow.
- Showtime is one unified certified-works catalog, not separate Drop victory / Bar heat / 24H boards or source tabs.
- Song cards include the recognition source in the song intro, such as `正式 Battle 認證`, `探索守擂認證`, or `傷心酒吧公播認證`.
- Cards do not show numeric rank badges.
- Drop cards use victory/result language.
- Bar Heartbreak and Explore-certified cards use catalog/recognition language, not heat-board language.
- Empty state does not use mock/demo records.
- Cards with lyrics show a `歌詞` / `LYRICS` action that opens a readable modal.
- Cards without lyrics show `歌詞未提供` / `No Lyrics`.
- Lyrics modal fits mobile viewport and does not create horizontal overflow.
- Stage names are:
  - `熱血音樂工匠`
  - `潮流音樂大師`
  - `殿堂級音樂師尊`

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

Look for:

- Text clipping.
- Overlapping cards.
- Buttons too small to tap.
- Horizontally overflowing content.
- Audio controls crowding layout.

## Documentation Checklist

When a product rule changes, update:

- `docs/aipoger-product-rules.md`

When a visual identity or wording principle changes, update:

- `docs/aipoger-ui-art-direction.md`

When a new release verification step is needed, update:

- `docs/aipoger-release-checklist.md`

When Bar Heartbreak survival logic changes, also update:

- `docs/heartbreak-bar-v1-survival-radio.md`
