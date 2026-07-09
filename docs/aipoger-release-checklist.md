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
- AIPOGER Showtime reads Drop winners as `熱血 Drop 抓波勝利榜`.

## Explore AI Music Challenge Checklist

Check:

- `/ai-music` loads real Bar Heartbreak/public-airplay works and only lights the challenge button when the track status is `等人挑戰` and a defender 60s Drop is prepared.
- Profile creator data lets the owner switch each public track among `僅展示`, `等人挑戰`, and `自定開戰`.
- Profile shows `尚未準備守擂 Drop` before a defender Drop exists, routes the owner to the 60s Drop cropper, and blocks replacing the defender Drop while an attack invite is pending.
- Challenging from Explore opens the 60s Drop cropper/setup flow, carries the defender track ID through upload, and requires a start time.
- Submitted Explore challenges copy the defender's prepared Drop at invite creation; they must not use the full public-airplay song as the defender battle audio.
- Submitted Explore challenges create a pending battle/invite; the battle room allows both 5-second previews but voting remains closed.
- Defender accept moves the battle to active/live according to the scheduled time; reject closes the invite without stats.
- A challenger is blocked after 6 outgoing Explore attack invites in the Taiwan day.
- Explore challenge results need 3 distinct non-participant voters; tied official results award the defender; under-3 shows audience-insufficient/no result.

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
- AIPOGER Showtime reads 24H winners as `24H Full Song 勝利榜`.

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
- Logged-in reactions allow one reaction per track.
- Clicking another reaction changes the reaction.
- Clicking the same reaction cancels the reaction.
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

Daily Spotlight:

- `/admin/listen-bar` shows the Daily Spotlight admin surface inside Bar Heartbreak admin.
- Admin can select the date and a Bar Heartbreak track, then generate recommendation copy and social caption.
- The public short entry is `https://aipoger.com/today`; QR codes and short-form captions should use this fixed URL, not a dated `spotlight=` URL.
- `/today` redirects by Taiwan date to the current spotlight route.
- Spotlight reactions and comments apply to the same Bar Heartbreak track, not a separate duplicate record.
- Saving the spotlight creates or updates social drafts only. It must not automatically publish to Discord, Facebook, Instagram, TikTok, or YouTube.
- Discord publishing requires an approved draft plus the explicit Discord publish action, and should store message/channel response when Discord returns it.

## AI Music Works Checklist

Check:

- Homepage first-layer primary action says `探索 AI 音樂` and links to `/ai-music?lang=zh`.
- `/ai-music?lang=zh` returns 200 and uses the main title `AI 音樂作品`.
- The page groups works by the current 11 fixed music genres and shows at most 6 cards per genre before `看更多`.
- Cards show song title, creator, AI tool, heart count, and challenge count.
- Desktop hover exposes the Battle Record HUD.
- Mobile exposes an equivalent expanded HUD via the info action.
- Card play opens the bottom mini player and does not expand per-card audio controls.
- `Drop Battle`, `Showtime`, `傷心酒吧`, and `Choice` are internal options on `/ai-music`.
- Old genre labels are not shown as current category headings.

## AIPOGER Showtime Checklist

Check:

- Page loads at `/rank?lang=zh`.
- Main title says `AIPOGER Showtime`.
- Homepage exposes an `AIPOGER Choice Weekly` entry that lands on `/rank?lang=zh#choice-weekly`.
- Showtime includes a Choice Weekly direction block without claiming a complete weekly automation workflow.
- Sections are:
  - `熱血 Drop 抓波勝利榜`
  - `24H Full Song 勝利榜`
  - `傷心酒吧熱播榜`
- Cards do not show numeric rank badges.
- Drop cards use victory/result language.
- 24H cards use Full Song victory language.
- Bar Heartbreak cards use hot/response language.
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
