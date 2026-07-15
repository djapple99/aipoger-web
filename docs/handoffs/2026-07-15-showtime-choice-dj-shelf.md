# 2026-07-15 Showtime Choice DJ Shelf Handoff

## Decision

- `/rank` starts with a dedicated `AIPOGER Choice` curator shelf at `#choice-weekly`.
- The shelf shows published Choices as compact square cards: two columns on mobile and six at normal desktop width. Cover play starts sequential playback; the tracklist control opens all songs.
- Do not show `CURATOR SETS` or `由創作者選出他們心目中的歌單`.
- Creator Choices always use the creator's current profile. The owner workbench can explicitly choose per collection between the official AIPOGER brand identity and the personal `愛波哥` profile identity.
- Stored recommendation copy appears as a card excerpt; its article action opens a dedicated readable HUD, separate from the tracklist HUD.
- Showtime follows below, grouped by genre in a compact 2 / 3 / 4 / 6-card catalog.
- Choice and Showtime share one bottom queue player with seek, previous/next, and mobile volume.
- Showtime header copy is one sentence: `收錄保留已獲得反應、正式戰績或策展認可的作品： 入選後不再接受挑戰`.

## Data And Safety

- `/api/creator-choice/public` returns the latest published Choice per creator.
- It resolves only current catalog items that are both `isPublic` and `selectable`.
- Existing 5-10 item publication, creator eligibility, owner Choice separation, and no-auto-social rules remain unchanged.
- `aipoger_choice_collections.curator_identity` stores `official` or `personal`; the owner API is the only app writer for this field.
- The 2026-07-13 published collection is set to `personal`, preserving its ten items and publication state.
- The currently published collection still has an empty `intro`; the app does not fabricate recommendation copy. The owner must save the article text before the article control appears publicly.

## Verification And Release

- App commit: `396a137 Add explicit Choice curator identities`.
- Production deployment: `dpl_adjzTvAcs7HeMv61RCzwR8oYCmXh`, aliased to `https://aipoger.com`.
- Production `/api/choice/current` returns `curatorIdentity: personal`, `curatorName: 愛波哥`, and the current personal profile avatar.
- Live `/rank` smoke confirms Choice and Showtime use six columns at 1440 px and two columns at 390 px, with no horizontal overflow.
- `npm test`: 172 passing; focused Showtime catalog tests: 8 passing.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass. Lint retains 11 pre-existing warnings outside this change.
