# AIPOGER Agent Brief

Last updated: 2026-06-10

Use this file to onboard a new AI agent quickly. It is a compact overview only. For implementation, always re-read `agent.md`, `docs/aipoger-product-rules.md`, and the files directly related to the task.

## One-line Product Definition

AIPOGER is an AI music recognition system: creators upload AI music, listeners participate through battles and public listening, and proven songs become visible records through the Honor Board.

## Current Deployment

- Production domain: `https://aipoger.com`
- Hosting: Vercel
- Backend, auth, database, and storage: Supabase
- Main repo: `aipoger-web`
- Framework: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Tests: Node test runner via `npm test`
- Standard verification before production deploy:
  - `npx tsc --noEmit`
  - `npm test`
  - `npm run lint`
  - `npm run build`
- Production deploy command:
  - `npx vercel deploy --prod --yes`

## Main Product Surfaces

- `/battle`: AI music battle field. Shows Drop Battle public challenge pool, 24H Full Song entries, and active battles.
- `/battle/[id]`: Drop Battle arena. Shared Drop Battle links should enter this arena directly through short URL `/b/{shortId}`.
- `/battle/result`: Drop Battle result card. Official result shares use `/r/{shortId}`.
- `/listen-bar`: Bar Heartbreak, a public AI music survival radio.
- `/rank`: Honor Board, the record archive for proven songs.
- `/profile`: Creator profile and account-facing identity surface.
- `/admin/*`: Operational review and moderation surfaces.

## Product Vision

AIPOGER is not just a music uploader, chart, or generic AI tool. The goal is to build a creator-recognition loop for AI music:

1. Creators publish music.
2. Listeners react, vote, comment, and battle.
3. Songs earn public proof through audience behavior.
4. Winning or hot songs are archived on the Honor Board.
5. The best songs can later move toward playback, curation, licensing, release, or commercial use.

The strategic direction is: website first, battle loop first, creator recognition first. The app, if built later, should be more like a playback and discovery outlet for proven songs, not the place where battles happen.

## Tone And Design

AIPOGER should feel like AI music, DJ culture, night stage, creator battle, public radio, and an emotional music community room.

Use:

- `公播`
- `挑戰池`
- `正在拼人氣`
- `榮譽榜`
- `勝利榜`
- `熱播`
- `封存紀錄`
- `聽眾反應`

Avoid:

- Generic SaaS wording.
- Calling Bar Heartbreak a ranking chart.
- Calling Challenger a waiting room.
- Fake demo records.
- Over-explaining rules inside product UI.
- Treating AIPOGER like a stock music marketplace.

Visual direction:

- Black or near-black background.
- Orange as the main brand energy.
- Cyan as small electric accent.
- Gold only for honor, qualification, and important records.
- Keep glow, glass, and borders controlled so the UI stays readable.

## Auth Rules

- Public listening should be open.
- Bar Heartbreak listening does not require sign-in.
- Uploading, voting, commenting, music analysis, accepting challenges, opening Battle cards, cancelling creator-owned battles, and deleting creator-owned songs require sign-in.
- Anonymous visitors may enter public Drop Battle arena links and interact as audience inside the arena where the current implementation allows it.
- Do not block the public radio/player behind auth.

## Drop Battle Rules

Drop Battle is the fast hook/drop battle format. It uses a short cut rather than a full song.

Current rules:

- A user can have only one active Drop Battle intent of each relevant role.
- Drop founder state and Drop challenger state are separate.
- Drop Battle and 24H Full Song can coexist for the same account.
- Quick start options are relative to successful battle-card publishing: `發布後 10 / 15 / 20 分鐘`.
- `battle_queue.expires_at` is cleanup/expiry only, not battle start time.
- Shared Drop Battle links must enter the specific arena directly.
- Short share route: `/b/{shortId}`.
- Battle result share route: `/r/{shortId}`.
- Drop Battle share preview image should be black background with white AIPOGER logo.
- Waiting cards should use `約人鬥歌`.
- Live or public-voting cards should use `邀請觀戰投票`.
- Public Drop challenge cards should be capped at 10 active cards when the operating limit is enforced.

Result rules:

- 0 audience voters means no contest.
- 0:0 no contest must not create a result card, Honor Board record, song battle stats, or rematch window.
- 1-2 distinct audience voters may show an unofficial result, but must not create Honor Board archives or formal stats.
- 3+ distinct audience voters creates an official Drop Battle result.
- Only official results can create archive records, feed the Honor Board, update per-song battle stats, and open the defender/rematch window.

Rematch rules:

- Finished official Drop Battle can open a king-of-the-hill rematch window.
- The rematch claim window is 5 seconds.
- The claimed challenger gets about 120 seconds to upload.
- If nobody claims, go to result card.
- If upload expires, release the slot and continue cleanup/result flow.

## 24H Full Song Battle Rules

24H Full Song is the slower full-track one-on-one battle format.

Current rules:

- Uses the complete uploaded song.
- Each account can keep only one active 24H Full Song entry at a time.
- `queued`, `matched`, and `live` block starting another 24H entry.
- `finished`, `cancelled`, and `expired` release the account to start another 24H entry.
- It is not a once-per-calendar-day feature.
- 24H and Drop Battle active limits are separate.
- Queued 24H entries can be accepted by another creator.
- Finished 24H battles with a winner feed the Honor Board.
- Queued card share route: `/d/{shortId}`.
- Live battle share route: `/h/{shortId}`.
- Queued cards should use `約人鬥歌`.
- Live cards should use `邀請觀戰投票`.
- The early operating target is 10 total active `queued + live` 24H battles.

## Bar Heartbreak Rules

Bar Heartbreak is a public AI music survival radio, not a leaderboard.

Current rules:

- Public listening is open.
- Voting/reactions and comments require sign-in.
- Creator submissions form the public rotation.
- Official AIPOGER fallback songs must not count as active public-pool songs.
- Public pool target is 88 community songs.
- Before 88 public songs, new submissions enter public pool and Challenger stays hidden.
- After 88 public songs, new submissions enter Challenger.
- Each creator can have up to 3 active Challenger songs.
- Challenger observation period is 24 hours.
- Challenger needs at least 1 positive reaction to become eligible for public-pool promotion after the pool is full.
- Public-pool elimination runs only when there are more than 88 public songs.
- Each elimination pass removes up to 3 low-performing public-pool songs.
- A song with 30 positive reactions becomes Honor Board eligible.
- New uploads get priority play after the current song finishes; up to 8 new uploads can air within a 1-hour priority batch.

## Honor Board Rules

The Honor Board is not a numbered ranking. It is a record archive.

Sections:

- `熱血 Drop 抓波勝利榜`
- `24H Full Song 勝利榜`
- `傷心酒吧熱播榜`

Display principles:

- Use honor, record, victory, archive, hot track, and public response language.
- Use badges like `WIN`, `24H`, and `HOT`.
- Do not show mock/demo records as real content.
- Cards may show lyrics when provided.
- If lyrics exist, show them in a readable modal.
- If lyrics are missing, show `歌詞未提供` / `No Lyrics`.
- Lyrics are a viewing feature for recognized songs, not a creator library feature.

## Current Feature Boundaries

Do not build these unless the user explicitly reopens them:

- URL music upload.
- Full creator song library.
- App-side battle.
- Complex multi-challenger rematch queue.
- Commercial release automation before curation and rights review.

Allowed V1 song memory:

- Group repeated Drop Battle entries from the same creator by normalized song title.
- Show battle count, wins, losses, votes, win rate, and Honor Board count.
- Do not turn this into URL upload or full library management.

## Engineering Rules For Agents

- Start by reading `agent.md`.
- For product-rule changes, read `docs/aipoger-product-rules.md`.
- For UI/copy/visual changes, also read `docs/aipoger-ui-art-direction.md`.
- For deploy or release QA, read `docs/aipoger-release-checklist.md`.
- For Bar Heartbreak logic, read `docs/heartbreak-bar-v1-survival-radio.md`.
- Preserve existing patterns in the codebase.
- Do not overwrite user changes.
- Do not run production SQL or destructive data operations without explicit confirmation.
- If product rules change, update `docs/aipoger-product-rules.md`.
- If release verification changes, update `docs/aipoger-release-checklist.md`.
- If visual language changes, update `docs/aipoger-ui-art-direction.md`.

## Default QA Expectation

For meaningful changes, do not stop at code edits. Run the relevant checks and verify the affected surface.

Recommended full loop:

1. Read the relevant rule docs.
2. Inspect current git status.
3. Make the smallest scoped change.
4. Run `npx tsc --noEmit`.
5. Run `npm test`.
6. Run `npm run lint` when relevant.
7. Run `npm run build`.
8. Use browser QA for changed UI surfaces.
9. Deploy only when requested or when the user clearly says to complete end to end.
10. Verify production at `https://aipoger.com`.

## User Communication Style

- Reply in Traditional Chinese.
- Be direct.
- Lead with the conclusion.
- Avoid empty encouragement.
- When the user says `do it`, implement without over-confirming.
- When the user says rules may need redesign, stop implementation and clarify before editing.

## North Star

Every feature should answer this question:

Does this help AI music creators get heard, tested by real listeners, recognized through public proof, and moved toward a more valuable stage?

If not, simplify it, postpone it, or remove it.
