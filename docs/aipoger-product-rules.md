# AIPOGER Product Rules

Last updated: 2026-07-01

This document is the product-rule source of truth for AIPOGER. Use it before changing Battle, Bar Heartbreak, Honor Board, auth, upload, or deployment behavior.

## Product Principle

AIPOGER is an AI music community built around participation, battle, public listening, and creator honor.

The product should favor:

- Real creator activity over mock/demo content.
- Relative fairness over impossible absolute fairness.
- Clear public rules over hidden platform behavior.
- Early-stage limits that keep the room lively and manageable.
- Music-first language, not generic SaaS language.

## Social Publishing

Current behavior target:

- `/admin/social` is a semi-automated social publishing console, not a fully autonomous posting bot.
- Every generated post must remain a draft or review item until an admin explicitly approves it.
- Supported first-version sources are Battle result/report drafts and manually created scheduled drafts.
- Social post states should include `draft`, `needs_review`, `scheduled`, `published`, and `failed`.
- Use `60s Drop Battle`, `30-60 秒抓波`, and `drop / 抓波` in social copy. Do not return to `45 秒` as the current public spec.
- Battle report copy should use winner, vote count, genre, battle/result link, and clear CTA.
- A 0:0 no contest must not generate a Winner Circle post.
- Winner posts that become image/video/Reels content should use the winning creator's music as the background track when rights and platform workflow allow it.
- Instagram image and video posting must preserve the original crop/aspect setting whenever the platform UI offers it.
- Discord may publish directly through official webhooks when configured.
- X may publish text/link posts through the official API when developer credentials are configured.
- Instagram, TikTok, and YouTube should start as draft/script/caption generators until their media and API workflows are fully verified.
- Facebook Groups must not be auto-posted through unstable browser automation or password-based login. For the AIPOGER group, provide copy, assets, and the group link for manual posting: `https://www.facebook.com/groups/aipoger`.
- Do not store social platform passwords. Tokens, webhooks, and API keys belong in environment variables or encrypted storage, never in repo, docs, or logs.
- If a platform token/webhook is not configured, show a disconnected/pending state and do not attempt publishing.

## Daily Spotlight / 每日推薦歌

Current behavior target:

- Daily Spotlight is the bridge between Bar Heartbreak and short-form promotion. It promotes one selected Bar Heartbreak track without interrupting the radio rotation.
- The fixed public entry is `https://aipoger.com/today`. It redirects by Taiwan date to the current day's spotlight page, such as `/listen-bar?spotlight=YYYY-MM-DD&lang=zh`.
- Shorts, Reels, Discord posts, Facebook group copy, QR codes, and on-screen video text should use `https://aipoger.com/today` instead of a dated `spotlight=` URL, so old videos keep pointing to the current daily recommendation entry.
- The spotlight page or highlighted Bar Heartbreak track should still use the normal Bar Heartbreak reaction system. Listeners who like the recommendation can press heart; those reactions count toward the same track record.
- Daily Spotlight must not force the selected song to play next in the main Bar Heartbreak rotation. Visitors coming from `/today` can open the spotlight track directly while the shared radio rotation keeps running normally.
- `/admin/listen-bar` is the working admin surface for choosing the daily recommended track, generating intro/caption copy, uploading the recommendation media asset, and creating social drafts.
- Recommendation media may be image or short video. Supported upload formats should include JPG, PNG, WebP, GIF, MP4, MOV, and WebM when storage/browser support allows.
- Saving a Daily Spotlight creates or updates social post drafts; it must not automatically publish to external platforms.
- `/admin/social` remains the publishing control room. A draft must be approved by an admin, and platform publishing still requires the appropriate platform action. Approval alone does not mean the post was sent.
- Discord may be directly published through the configured webhook after approval. Going forward, successful Discord sends should store the returned message id/channel response when Discord provides it, so missing-post debugging can distinguish "not sent" from "sent to another channel."
- Facebook group, Instagram, TikTok, and YouTube flows remain manual or draft-assisted unless their official publishing workflows are explicitly verified.
- QR code generation belongs to the Daily Spotlight workflow and should point to `https://aipoger.com/today`.

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
- AIPOGER's analysis product should feel like an AI music A&R Gate, not a generic audio metric report.
- The analysis framework should combine sonic DNA, lyric diagnostic, market positioning, content-use fit, AIPOGER routing, and one or two actionable revision suggestions.
- Sonic DNA may cover rhythm, harmony, instrumentation, production texture, genre fusion, and energy arc, but the user-facing output should translate those traits into market meaning.
- Lyric diagnostic may cover cliche, hook clarity, emotional depth, register fit, singability, and structure. If lyrics are not provided, the report should clearly say the judgement is sound-led.
- Do not claim deep audio feature extraction unless the analysis service actually extracted audio features. If the service only has upload metadata and user-provided lyrics, phrase output as A&R judgement based on submitted data.
- User-facing analysis should not mention external Codex skills or implementation tools.

## Drop Battle

Current behavior:

- Drop Battle uses a short drop cut rather than the full song.
- Drop Battle clips have a hard maximum of 60 seconds. Creators may cut shorter clips; the recommended public range is about 30-60 seconds so the hook/drop has enough time to reach its payoff without turning the battle into full-song listening.
- Drop Battle creators may opt in to publish the complete song only if the Drop reaches the Honor Board. If they do not opt in, the Honor Board must only expose the Drop clip. The complete song must not be publicly playable by default.
- When complete-song publishing is enabled, the Battle Room still uses only the Drop clip; `Full Song` is an Honor Board extension state, not a battle playback rule.
- Drop Battle quick start options are relative to successful battle-card publishing: `發布後 10 / 15 / 20 分鐘`. Custom start time is an absolute user-selected time and should not move with upload/cutting duration.
- `battle_queue.expires_at` is only a cleanup/expiry deadline. It must never be used as a Battle start time; opening time must come from `scheduled_start_at` or `cancellation_evaluation_at`.
- Fast start options must calculate the visible start time only after the queue/battle data has been successfully written. Do not pre-render a time label that ignores upload, cutting, or network duration.
- Automatic pairing must not inherit an old or stale `expires_at` value as tomorrow's start time.
- Shared Drop Battle links must enter the specific battle arena directly. If nobody has challenged yet, the arena must show the accept-challenge state; if a challenger already joined, the same link must enter the live/waiting arena.
- Public share URLs should stay short: Drop arena uses `/b/{shortId}`, Drop result card uses `/r/{shortId}`, 24H queued card uses `/d/{shortId}`, and 24H live battle uses `/h/{shortId}`. These routes may redirect internally to the canonical full route.
- Drop Battle share preview images should be black background with the white AIPOGER logo as the main visual.
- Open Drop Battle arena links are publicly enterable. Anonymous visitors may vote, send arena danmaku, and tap feedback/reaction buttons inside the Battle arena only.
- Accepting a challenge, uploading a challenger Drop, opening a new Battle card, cancelling a creator-owned Battle, and claiming a rematch slot still require sign-in.
- Anonymous Battle arena access does not change Bar Heartbreak rules: Bar Heartbreak listening stays public, but reactions/comments/uploads/removals still require sign-in.
- The Battle Pool is an index, not the destination for a shared arena link. Legacy `focusBattle` / `focusQueue` URLs should redirect to `/battle/[id]`.
- If a shared `/battle/[id]` link points to an already-ended Drop Battle with no active rematch, send the visitor to Bar Heartbreak (`/listen-bar`) instead of the Battle Pool or a dead arena.
- If the ended Drop Battle still has an open/claimed/uploaded rematch path, keep the visitor in the battle flow: stay on the source arena for open/claimed rematch, or redirect to the next battle when `next_battle_id` exists.
- The same battle/match group should appear only once in the Battle Pool, even if both fighters have queue rows.
- Both participants in an unfinished Drop Battle should be able to cancel from the arena or eligible Battle Pool card.
- Finished Drop Battles open a short king-of-the-hill rematch window only after the result is official: at least 3 distinct audience voters, a valid winner, no existing next battle, and a formal Drop Battle type. The window is 5 seconds to claim the challenger slot, then 120 seconds for the challenger to upload their Drop.
- If nobody claims the 5-second rematch slot, the battle should go directly to the result card and should not leave a lingering rematch card.
- A 0:0 no contest never creates a result card, defender/rematch window, Honor Board record, or formal battle stats.
- A battle with 1-2 distinct audience voters may create an unofficial result card and appear on the Result Wall / 成果牆, but it must not enter the Honor Board, update official song battle stats, or open the defender/rematch window.
- A battle with at least 3 distinct audience voters is an official Drop Battle result and may feed the Honor Board, update per-song battle stats, and open the defender/rematch window.
- The official-result audience threshold counts distinct listeners only: one signed-in `battle_votes.user_id` or one anonymous `battle_guest_votes.guest_id` per battle. Fighter participation does not count toward the 3-audience minimum.
- A user may hold one active Drop founder/open-card intent and one active Drop challenger intent at the same time.
- A creator may deliberately challenge their own open Drop Battle card when they want listeners to compare two same-genre songs from the same account. This is only allowed through a specific target card; automatic random pairing should not auto-match the creator against themself.
- Drop Battle and 24H Full Song can coexist for the same account; their active limits are separate.
- Drop Battle challenge cards expire automatically after at most 24 hours and are cancelled by cleanup.
- Open Drop states include `searching`, `waiting`, `waiting_challenge`, `public_voting`, and `ghost_battle`.
- If no immediate same-genre opponent is available, the user may open a Drop Battle challenge card or go to Bar Heartbreak to find listeners/opponents.
- Duplicate active Drop audio should be blocked by audio hash when the column exists.
- The Result Wall / 成果牆 is the monthly public result library. It may show both official and unofficial result cards, as long as there is at least 1 distinct audience voter and a valid winner.
- The Honor Board only consumes official Drop Battle results with at least 3 distinct audience voters.
- Battle history should focus on the song, not the fighter profile. Cards may show per-song challenge count, wins, losses, ties, and win rate.
- V1 song battle stats do not open URL upload or a full creator song-library UI. They only group the same creator's repeated Drop Battle entries by normalized song title and show battle count, wins, losses, votes, win rate, and Honor Board count.
- Waiting cards should provide a `約人鬥歌` share action.
- Live or public-voting cards should provide an `邀請觀戰投票` share action.

Official Gatekeeper Drops:

- AIPOGER may keep up to four owner-managed official Drop challenge templates in the Battle Pool.
- These official cards are templates, not normal `battle_queue` rows. They must not be consumed or disappear when someone challenges them.
- Only owner/admin accounts can upload, update, enable, or disable official Gatekeeper Drop audio, cover art, and lyrics.
- Owner/admin does not set a start time for official Gatekeeper Drops. The official song stays there as a standing gate.
- Owner/admin must choose the official Gatekeeper Drop genre from the same standard genre menu used by Battle upload. Do not use free-text genre entry for these cards.
- Official Gatekeeper Drop audio accepts standard AIPOGER audio formats with a 100MB single-file limit. The owner/admin upload flow must use the same 60-second Drop cropper used by normal Drop Battle.
- Official Gatekeeper Drop cover art accepts JPG, PNG, and GIF with a 10MB single-file limit. Lyrics are optional and stored with the official template.
- Production must have `supabase/20260618_official_gatekeeper_drops.sql` and `supabase/20260619_official_gatekeeper_media.sql` applied before audio, cover art, and lyrics can all be saved.
- Public cards should say `歡迎任何人來挑戰`, show the actual song name, `GATE` number, and genre/type badge, and avoid wording like `官方守門戰：傷心酒吧`.
- Public official Gatekeeper cards should only expose the same 5-second teaser behavior as normal Battle cards. Do not show full audio controls or let visitors play the whole stored Drop from the Battle Pool card.
- Official Gatekeeper Drop lyrics do not need to expand on the Battle Pool card. Lyrics may remain stored on the template and copied into the created Battle Room, where listeners can view them in context.
- A challenger can choose the start time using the normal Drop Battle schedule rules: quick 10 / 15 / 20 minutes after successful battle creation, or a custom time within 24 hours.
- When a challenger submits, the system creates a per-challenge battle instance: one copied official defender queue plus one challenger queue. Official audio, lyrics, and cover art must be copied into the defender side so the created Battle Room behaves like a normal Battle Room for listening, lyrics, cover display, watching, and sharing.
- The copied official defender queue must not count as the owner's personal active Drop Battle intent, must not notify the owner as if they personally entered a battle, and must not pollute owner-facing active battle limits.
- The challenger side counts as an active challenger intent until that battle ends or is cancelled. Owner/admin may also challenge their own official Gatekeeper Drop; the copied defender side still must not count as a personal active founder intent.
- Official Gatekeeper Drop results follow the same audience threshold rules as normal Drop Battle: 0:0 no result, 1-2 distinct voters unofficial Result Wall only, 3+ distinct voters official/Honor Board eligible.

Initial operating target:

- Public Drop challenge cards should be limited to 10 open cards across the platform.
- This is a product target and should be enforced before upload or before Battle queue insert, so storage and UI do not fill with stale challenges.

## 24H Full Song Battle

Current visibility:

- 24H Full Song Battle is currently hidden from the front-stage product.
- Do not present 24H Battle as a primary gameplay mode in pitch decks, public onboarding, homepage copy, or new-user explanations unless the user explicitly reopens it.
- Keep the implementation rules below as retained system behavior, not as current public positioning.

Current behavior:

- 24H Full Song uses the complete uploaded song.
- Each account can keep only one active 24H Full Song entry at a time.
- `queued`, `matched`, and `live` 24H entries block starting another 24H entry.
- `finished`, `cancelled`, and `expired` 24H entries release the account to start another 24H entry.
- 24H Full Song is not limited to one per calendar day.
- 24H queued entries can be accepted by another creator.
- Finished 24H battles with a winner feed the Honor Board as winner records.
- Duplicate active 24H audio should be blocked by audio hash when the column exists.
- 24H queued cards should share with `/d/{shortId}` and 24H live battles should share with `/h/{shortId}`.
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
- Public listening supports 11 playback choices: all public airplay plus the 10 fixed music genres.
- Each fixed music genre has its own 36-track public pool. With the current 10 genres, the full public-pool capacity is 360 community songs.
- New submissions must include a fixed music genre. Do not silently default missing genre values to `Original 自我風格`.
- New submissions enter Challenger first and receive 24H protection before public-pool promotion.
- Creator Challenger slots use a 3/2/1 ladder based on that creator's active public-pool songs: 0-2 public songs allows up to 3 active Challengers, 3-5 public songs allows up to 2 active Challengers, and 6+ public songs allows up to 1 active Challenger.
- Public-pool songs do not occupy Challenger slots and are not removed by this limit; they only reduce the creator's new Challenger concurrency.
- A creator may remove their own Challenger songs.
- A creator may remove their own public-pool songs.
- Challenger protection period: 24 hours.
- A Challenger can be played, reacted to, and commented on during protection, but it is not evicted.
- Per-track comments are persistent. A signed-in listener can edit their own Bar Heartbreak track comments. When someone comments on a creator's Bar Heartbreak track, the creator receives an account notification unless they commented on their own song.
- A Challenger automatically moves into the public pool after 24 hours. The old 1-positive-reaction promotion gate is retired.
- Own reaction remains allowed in V2, but it is only public support and does not guarantee survival.
- Judgement interval: every 8 hours.
- `GET /api/listen-bar/process-rotation` is a manual/monitoring dry-run preview only.
- Real promotion/removal requires the protected `POST` route with `LISTEN_BAR_ROTATION_ENABLED=true`.
- Public-pool elimination runs per genre only when that genre has more than 36 public songs.
- Bar Heartbreak survival and Honor Board eligibility start per genre only after that genre has reached 36 public songs. Existing public-pool time before that genre activation point must not be counted toward the 7-public-day Honor Board rule.
- Elimination must never bring an active genre public pool below 36 songs.
- Each elimination pass removes at most the overflow above 36 inside overfull genre pools, capped at 3 low-performing public-pool songs.
- If songs have the same positive reaction count, remove the older song first.
- If a genre public pool is at or below 36 songs, elimination stops for that genre and no refill action is needed.
- The legacy 30-day `completed` removal rule is retired and must not remove songs.
- Public pool target: 36 songs per genre, currently 360 songs across 10 genres. Challenger priority airplay can still surface protected new submissions.
- After that song's genre activation point, a song with 30 hearts/positive reactions or 7 public survival days becomes Honor Board eligible.
- A listener must sign in to react or comment. Pressing Heart on a Bar Heartbreak track also saves that track to the listener's favorites. Removing it later from favorites does not remove the historical heart reaction; pressing Heart again after unsaving saves it again without duplicate favorites.
- New submissions get priority after the current song finishes; each priority batch starts when the first upload arrives, airs up to 8 new uploads within 1 hour, and pushes overflow to the next hour.
- Bar Heartbreak upload metadata should stay compact: user-entered creator name, AI tool, and album/mood are limited to 12 CJK characters or about 24 English characters; one-line song description is limited to 16 CJK characters or about 32 English characters. Auto-detected song titles are not subject to this compact metadata limit.
- Daily Spotlight can feature a Bar Heartbreak track for promotion through `/today`, QR code, and social drafts. It is a curated spotlight layer, not a replacement for the shared radio rotation and not a separate reaction pool.

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
- Honor Board cards may expose a `歌詞` / `LYRICS` action when the archived or source track has lyrics.
- Drop Battle Honor Board cards may expose `Full Song` only when the winning creator explicitly enabled complete-song public playback. Otherwise they should show or play only the archived Drop clip.
- If lyrics exist, open them in a readable modal and preserve line breaks.
- If lyrics are not provided, show `歌詞未提供` / `No Lyrics` instead of hiding the feature or implying an error.
- Lyrics are a viewing feature for recognized songs; they are not a creator song-library feature and do not require URL upload support in V1.

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

## Image Upload Moderation

Current behavior target:

- Adult non-explicit swimwear, stage looks, and tasteful sexy fashion images are allowed on avatars and cover art.
- Prohibited image content remains: explicit nudity, sex acts, porn/adult redirects, sexualized minors, graphic violence, self-harm, hate/discrimination, scams, gambling redirects, drugs/weapons, personal data exposure, impersonation, stolen brand assets, celebrity likeness misuse, and infringing content.
- User-facing upload rules should clearly distinguish `non-explicit sexy styling is allowed` from `pornographic or exploitative content is banned`.

## Deployment Safety

Before deploying changes that touch product rules:

- Confirm whether the change affects auth, upload, Battle queueing, Bar Heartbreak rotation, Honor Board display, or storage.
- Update this document if a rule changes.
- Update `docs/aipoger-release-checklist.md` if a new verification step is needed.
- Update `docs/aipoger-ui-art-direction.md` if visual language or page identity changes.
