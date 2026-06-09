# AIPOGER Product Rules

Last updated: 2026-06-10

This document is the product-rule source of truth for AIPOGER. Use it before changing Battle, Bar Heartbreak, Honor Board, auth, upload, or deployment behavior.

## Product Principle

AIPOGER is an AI music community built around participation, battle, public listening, and creator honor.

The product should favor:

- Real creator activity over mock/demo content.
- Relative fairness over impossible absolute fairness.
- Clear public rules over hidden platform behavior.
- Early-stage limits that keep the room lively and manageable.
- Music-first language, not generic SaaS language.

## Auth Rules

- Anyone can listen to public music surfaces.
- Sign-in is required for uploading, voting, commenting, music analysis, Battle participation, and creator-owned track deletion.
- Bar Heartbreak voting and track comments require sign-in.
- Bar Heartbreak listening does not require sign-in.
- Bar Heartbreak must remain publicly listenable; do not block the radio/player behind auth.
- Music analysis entry and any future analysis API must require sign-in before upload, scoring, or report generation.
- These auth rules are system behavior rules. Do not surface them as a long rule block in the product UI unless a help/legal page explicitly needs them.
- A signed-in account can keep only one reaction per Bar Heartbreak track.
- Clicking another reaction changes the reaction.
- Clicking the same reaction again cancels it.
- V1 allows creators to react to their own Bar Heartbreak song.

## Music Analysis / AI A&R Gate

Current behavior target:

- The homepage `分析你的音樂` entry must open an AIPOGER-owned route first, not a localhost URL.
- Visitors who are not signed in should be sent to auth before they can upload or analyze a song.
- Signed-in users may continue to the configured analysis service when `NEXT_PUBLIC_MUSIC_ANALYSIS_URL` is set.
- If no production analysis service URL is configured, the entry should fail closed with a clear internal connection state rather than sending users to `127.0.0.1`.
- Analysis output is advisory. AI-assisted judgement should support creator decisions, not replace creator instinct.

## Drop Battle

Current behavior:

- Drop Battle uses a short hook/drop cut rather than the full song.
- Drop Battle quick start options are relative to successful battle-card publishing: `發布後 10 / 15 / 20 分鐘`. Custom start time is an absolute user-selected time and should not move with upload/cutting duration.
- `battle_queue.expires_at` is only a cleanup/expiry deadline. It must never be used as a Battle start time; opening time must come from `scheduled_start_at` or `cancellation_evaluation_at`.
- Fast start options must calculate the visible start time only after the queue/battle data has been successfully written. Do not pre-render a time label that ignores upload, cutting, or network duration.
- Automatic pairing must not inherit an old or stale `expires_at` value as tomorrow's start time.
- Shared Drop Battle links must enter the specific battle arena directly. If nobody has challenged yet, the arena must show the accept-challenge state; if a challenger already joined, the same link must enter the live/waiting arena.
- Open Drop Battle arena links are publicly enterable. Anonymous visitors may vote, send arena danmaku, and tap feedback/reaction buttons inside the Battle arena only.
- Accepting a challenge, uploading a challenger Drop, opening a new Battle card, cancelling a creator-owned Battle, and claiming a rematch slot still require sign-in.
- Anonymous Battle arena access does not change Bar Heartbreak rules: Bar Heartbreak listening stays public, but reactions/comments/uploads/removals still require sign-in.
- The Battle Pool is an index, not the destination for a shared arena link. Legacy `focusBattle` / `focusQueue` URLs should redirect to `/battle/[id]`.
- If a shared `/battle/[id]` link points to an already-ended Drop Battle with no active rematch, send the visitor to Bar Heartbreak (`/listen-bar`) instead of the Battle Pool or a dead arena.
- If the ended Drop Battle still has an open/claimed/uploaded rematch path, keep the visitor in the battle flow: stay on the source arena for open/claimed rematch, or redirect to the next battle when `next_battle_id` exists.
- The same battle/match group should appear only once in the Battle Pool, even if both fighters have queue rows.
- Both participants in an unfinished Drop Battle should be able to cancel from the arena or eligible Battle Pool card.
- Finished 90s Drop Battles open a short king-of-the-hill rematch window only after the result is official: at least 3 distinct audience voters, a valid winner, no existing next battle, and a formal Drop Battle type. The window is 5 seconds to claim the challenger slot, then 120 seconds for the challenger to upload their Drop.
- If nobody claims the 5-second rematch slot, the battle should go directly to the result card and should not leave a lingering rematch card.
- A 0:0 no contest never creates a result card, defender/rematch window, Honor Board record, or formal battle stats.
- A battle with 1-2 distinct audience voters may show an unofficial battle result in the arena/result flow, but it must not create a Honor Board record, `battle_result_archives` row, song battle stats, or defender/rematch window.
- A battle with at least 3 distinct audience voters is an official Drop Battle result and may create the result archive, feed the Honor Board, update per-song battle stats, and open the defender/rematch window.
- The official-result audience threshold counts distinct listeners only: one signed-in `battle_votes.user_id` or one anonymous `battle_guest_votes.guest_id` per battle. Fighter participation does not count toward the 3-audience minimum.
- A user can have only one active Drop Battle intent at a time.
- Drop Battle and 24H Full Song can coexist for the same account; their active limits are separate.
- Drop Battle challenge cards expire automatically after at most 24 hours and are cancelled by cleanup.
- Open Drop states include `searching`, `waiting`, `waiting_challenge`, `public_voting`, and `ghost_battle`.
- If no immediate same-genre opponent is available, the user may open a Drop Battle challenge card or go to Bar Heartbreak to find listeners/opponents.
- Duplicate active Drop audio should be blocked by audio hash when the column exists.
- Battle result archives feed the Honor Board as real winner records.
- Battle history should focus on the song, not the fighter profile. Cards may show per-song challenge count, wins, losses, ties, and win rate.
- V1 song battle stats do not open URL upload or a full creator song-library UI. They only group the same creator's repeated Drop Battle entries by normalized song title and show battle count, wins, losses, votes, win rate, and Honor Board count.
- Waiting cards should provide a `約人鬥歌` share action.
- Live or public-voting cards should provide an `邀請觀戰投票` share action.

Initial operating target:

- Public Drop challenge cards should be limited to 10 open cards across the platform.
- This is a product target and should be enforced before upload or before Battle queue insert, so storage and UI do not fill with stale challenges.

## 24H Full Song Battle

Current behavior:

- 24H Full Song uses the complete uploaded song.
- Each account can keep only one active 24H Full Song entry at a time.
- `queued`, `matched`, and `live` 24H entries block starting another 24H entry.
- `finished`, `cancelled`, and `expired` 24H entries release the account to start another 24H entry.
- 24H Full Song is not limited to one per calendar day.
- 24H queued entries can be accepted by another creator.
- Finished 24H battles with a winner feed the Honor Board as winner records.
- Duplicate active 24H audio should be blocked by audio hash when the column exists.
- Battle history should focus on the full song entry, not the creator profile. Cards may show per-song challenge count, wins, losses, ties, and win rate.
- Queued cards should provide a `約人鬥歌` share action.
- Live cards should provide an `邀請觀戰投票` share action.

Initial operating target:

- `queued + live` 24H Full Song battles should be limited to 10 active battles across the platform.
- Count both queued and live because live battles hold space for 24 hours.
- This limit is about flow control and bandwidth, not only storage size.
- The user-facing message should be direct: `目前 24H Full Song 鬥歌場已滿，請稍後再來。`

## Bar Heartbreak

Authoritative detailed spec: `docs/heartbreak-bar-v1-survival-radio.md`.

Current rules:

- Bar Heartbreak main rotation contains creator submissions only.
- Official AIPOGER songs do not count as active public-pool songs.
- If there are no community submissions, hidden fallback store music may prevent a silent station; it must not count toward survival results.
- Public pool target: 88 community songs.
- Before 88 public songs, new submissions go directly into the public pool and the Challenger section remains hidden.
- Once the public pool reaches 88, new submissions enter Challenger.
- Each creator can have up to 3 active Challenger songs.
- Public-pool songs do not count toward the 3 Challenger limit.
- A creator may remove their own Challenger songs.
- A creator may remove their own public-pool songs.
- Challenger observation period: 24 hours.
- A Challenger needs at least 1 positive reaction to become eligible for public-pool promotion after the pool is full.
- Own reaction can satisfy the V1 minimum support threshold.
- Judgement interval: every 8 hours.
- Public-pool elimination only runs when there are more than 88 public songs.
- Each elimination pass removes up to 3 low-performing public-pool songs.
- If the public pool is at or below 88 songs, elimination stops.
- Challenger + public pool shared rotation target: 100 songs.
- A song with 30 positive reactions becomes Honor Board eligible.
- New submissions get priority after the current song finishes; each priority batch starts when the first upload arrives, airs up to 8 new uploads within 1 hour, and pushes overflow to the next hour.

Product language:

- Use `Challenger`, `挑戰池`, `挑戰席位`, `正在拼人氣`.
- Avoid calling Challenger a waiting room in user-facing copy.
- Avoid implying Bar Heartbreak is a ranking chart.
- Bar Heartbreak is an AI music survival radio, not a leaderboard.

## Honor Board

The Honor Board is not a numbered ranking.

Current board sections:

- `熱血 Drop 抓波勝利榜`: shows Drop Battle winners.
- `24H Full Song 勝利榜`: shows 24H Full Song winners.
- `傷心酒吧熱播榜`: shows Bar Heartbreak hot tracks.

Display principles:

- Do not present these boards as first/second/third-place rankings.
- Use honor/record language: victory, archive, hot track, public response.
- Card badges can say `WIN`, `24H`, or `HOT`.
- Do not show mock records as real Honor Board content.

Creator stages:

- Stage 1: `熱血音樂工匠` / Lv.1-Lv.3
- Stage 2: `潮流音樂大師` / Lv.4-Lv.7
- Stage 3: `殿堂級音樂師尊` / Lv.8-Lv.10

## Storage And Bandwidth

Latest measured usage on 2026-05-29:

- Total Supabase Storage: about 1.78 GB.
- `battle-audio`: about 1.15 GB across 152 files.
- `listen-bar-audio`: about 606.5 MB across 62 files.
- `listen-bar-covers`: about 34.0 MB across 32 files.
- Largest observed file: about 44.7 MB.

Plan assumption:

- The project is believed to be on Supabase Pro.
- Supabase Pro includes 100 GB file storage.
- Storage is currently not the bottleneck if Pro is active.
- 24H Full Song bandwidth and playback load are more important early risks than raw storage.

Operating guidance:

- Keep 24H Full Song active count conservative at launch.
- Prefer blocking full-song uploads before storage upload when the global active cap is reached.
- Keep duplicate-file checks active for Battle and 24H surfaces.
- Consider cleanup policies for cancelled, expired, or orphaned uploaded files before public scale.

## Deployment Safety

Before deploying changes that touch product rules:

- Confirm whether the change affects auth, upload, Battle queueing, Bar Heartbreak rotation, Honor Board display, or storage.
- Update this document if a rule changes.
- Update `docs/aipoger-release-checklist.md` if a new verification step is needed.
- Update `docs/aipoger-ui-art-direction.md` if visual language or page identity changes.
