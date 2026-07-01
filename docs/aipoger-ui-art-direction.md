# AIPOGER UI And Art Direction

Last updated: 2026-06-24

This document protects AIPOGER's visual identity. Use it before redesigning any page, adding major UI, or changing user-facing copy.

For Battle Pool-specific hero, star CTA, character, and mobile layout rules, also read `docs/aipoger-battle-pool-art-direction.md`.

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
- Gold/yellow only for honor, qualification, or highlighted records.
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
- `榮譽榜`
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

## Homepage

Role:

- First-viewport brand stage.
- Give users clear routes into Battle, Bar Heartbreak, rules, and Honor Board.

Must preserve:

- AIPOGER as the first signal.
- Music/stage energy.
- Primary action to Battle.
- Secondary paths to public listening and rules.

### Homepage 2026-06-24 Baseline

Today’s homepage baseline should be preserved unless the user explicitly redesigns it again.

Copy:

- Use `AI 音樂擂台` for the large desktop Chinese title.
- Do not use `AI 音樂播台` as the large title; it feels off-brand and has been rejected.
- Mobile hero should not visually show the large Chinese `AI 音樂擂台` title. Keep it as screen-reader-only if semantic heading structure is needed.
- Mobile hero copy should read as two centered lines:
  - `上傳你的最強 Drop`
  - `讓聽眾決定誰最好聽`
- The mobile Drop Signal card body can use one compact line: `上傳你的最強 Drop，讓聽眾決定誰最好聽`.

Desktop layout:

- The left hero stack should align visually with the top of the right-side action panel.
- Do not let the left hero block drift lower than the right-side panel; avoid vertical centering that makes the stage feel unbalanced.
- The desktop `AIPOGER` wordmark should be large, dominant, and left-stage, while the right-side logo panel supports navigation rather than competing as the primary brand signal.
- The right-side panel logo area should feel centered inside its upper disc zone. If the AIPOGER logo looks small or off-center, enlarge the disc/logo together and verify the visual center in a rendered desktop screenshot.
- The right-side logo should remain bigger than the small header logo and should feel like a record/emblem, not a tiny icon.
- Desktop social icons belong under the left hero stats/social area, replacing the left waveform position. Do not place them as a floating orphan under the right panel.
- Remove decorative waveforms that sit under the right panel or create clutter near the social icons. Keep only waveforms that support the center stage composition.
- The row of lower navigation cards should sit close enough to the main hero to feel connected. Do not let it sink too low with excessive empty space.

Mobile layout:

- The mobile `AIPOGER` wordmark must be centered within its visible section and should not feel optically left-heavy.
- Social icons on mobile should sit below the Drop Signal card, bright enough to read quickly.
- Do not add extra explanatory labels such as `與音波同行`; the icons should speak for themselves.

Social icons:

- Use colored Instagram, Discord, and Facebook icons for the public homepage cluster.
- Discord uses the permanent invite URL `https://discord.gg/3bWVgyPKk`.
- Facebook should link to the AIPOGER group when using the public social cluster.

## Drop Battle

Role:

- Fast, competitive, hook/drop-focused.
- The energy is challenge, speed, and punch.

UI direction:

- Use competitive language.
- Make waiting/challenge states clear.
- Keep actions obvious: start, accept, cancel, enter room.
- Do not blur Drop Battle with 24H Full Song; they are different products.

## 24H Full Song Battle

Role:

- Full-track one-on-one battle.
- Slower, more complete, more listening-focused than Drop Battle.

UI direction:

- Use `24H Full Song` or `24H Daily Battle` consistently where appropriate.
- Make it clear the full song is uploaded and listeners can take time.
- Keep global active limits visible when they are implemented.
- Treat finished winners as Honor Board records, not ranked placements.

## Bar Heartbreak

Role:

- Public survival radio for AI music.
- The audience helps decide what stays.

Must preserve:

- No explicit play/pause control in the main public radio experience.
- Listening is open.
- Voting/commenting requires sign-in.
- Reaction copy near buttons should encourage active voting.
- The record visual is central and should feel like a public broadcast.
- Lyrics area should be substantial enough to read, visually aligned with the comments area where practical.
- Challenger is the entry point for new submissions before public-pool promotion.
- Visitors can play all public songs or choose one of the 10 fixed genres.
- Each genre has a 36-song public pool. Survival and Honor timing start only after that genre reaches 36 public songs.

Copy direction:

- Bar Heartbreak is not a ranking list.
- It is a survival room / public radio / listener test.
- Use emotional but clear language.

## Honor Board

Role:

- Real records of victory and heat.
- No fake content.
- No numbered placement language.

Current sections:

- `熱血 Drop 抓波勝利榜`
- `24H Full Song 勝利榜`
- `傷心酒吧熱播榜`

UI direction:

- Use `WIN`, `24H`, `HOT` badges rather than numeric rank badges.
- Present records as honor cards.
- The page should feel prestigious, not like a top-10 chart.

## Account And Login

Role:

- Keep auth useful but not dominant.

Rules:

- Listening surfaces should not feel blocked by login.
- Uploading, voting, commenting, and Battle actions should clearly ask users to sign in.
- Error copy should explain what is blocked and what remains open.

## Admin / Operational UI

Role:

- Quiet, utility-first, dense enough for repeated work.

Direction:

- Admin pages can be more functional than public pages.
- Avoid oversized hero design in admin tools.
- Keep image/audio review and moderation actions clear.
