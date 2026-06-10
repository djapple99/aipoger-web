# AIPOGER Release Checklist

Last updated: 2026-06-10

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

- Logged-out visitors can open home, Battle list, Bar Heartbreak, Honor Board, rules pages.
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
- Share links from a Drop Battle card or live battle open `/battle/[id]` directly, not the Battle Pool.
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
- 0 audience voters becomes no contest and does not create a result card, Honor Board archive, or song battle stats.
- 1-2 distinct audience voters can show an unofficial result but does not create a Honor Board archive, song battle stats, or rematch window.
- 3+ distinct audience voters creates an official result that can be archived.
- Honor Board reads Drop winners as `熱血 Drop 抓波勝利榜`.

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
- Another user can accept a queued 24H challenge.
- Live 24H battle page loads.
- Voting requires login.
- Finished 24H battle records winner when not tied.
- Honor Board reads 24H winners as `24H Full Song 勝利榜`.

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
- Upload requires sign-in.
- Upload policy copy is visible.
- My Bar Tracks shows creator's Challenger/public tracks after sign-in.
- Creator can remove own Challenger.
- Creator can remove own public-pool song.

Opening phase:

- If public pool has fewer than 88 community songs, Challenger section is hidden.
- New submissions enter public pool.
- Public pool progress shows current count over 88.

After public pool reaches 88:

- Challenger section becomes visible automatically.
- New submissions enter Challenger.
- Creator Challenger count is capped at 3.
- Public-pool songs do not count toward the 3 Challenger limit.

## Honor Board Checklist

Check:

- Page loads at `/rank?lang=zh`.
- Main title says `AIPOGER 榮譽榜`.
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
- Honor Board.

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
