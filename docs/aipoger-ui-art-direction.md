# AIPOGER UI And Art Direction

Last updated: 2026-07-04

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

## Homepage

Role:

- First-viewport brand stage.
- Give users clear routes into AI music discovery, Bar Heartbreak, AIPOGER Showtime, and Battle as a next action.

Must preserve:

- AIPOGER as the first signal.
- Music/stage energy.
- Primary action to `探索 AI 音樂`.
- Secondary paths to public listening and rules.

### Homepage 2026-07-09 Explore Entry

- Homepage first-layer main entry uses `探索 AI 音樂`, not `AI 音樂鬥歌場`.
- Link the primary action to `/ai-music`.
- Use the supporting idea `先探索 AI 音樂，再從喜歡的作品發起挑戰`.
- The AI music works page then contains `Drop Battle` / `AI 音樂鬥歌場` as internal options.
- Explore work cards use a compact yellow `NEW` badge at the cover's top-left for the first rolling 7 x 24 hours after `created_at`; the red angled `接戰` status stays at the top-right. Neither badge may cover the play control or each other.

### Homepage 2026-06-24 Baseline

Today’s homepage baseline should be preserved unless the user explicitly redesigns it again.

Copy:

- Use `AI 音樂擂台` for the large desktop Chinese title.
- Do not use `AI 音樂播台` as the large title; it feels off-brand and has been rejected.
- Mobile hero should not visually show the large Chinese `AI 音樂擂台` title. Keep it as screen-reader-only if semantic heading structure is needed.
- Mobile hero copy should read as two centered lines:
  - `探索 AI 音樂`
  - `喜歡再發起挑戰`
- The mobile first action label should be `探索`, and the signal body should describe browsing AI music works before challenging.
- The desktop stat row should use `公播 / 60s / 酒吧`; do not show the retired `90s` Drop Battle label.

Desktop layout:

- The left hero stack should align visually with the top of the right-side action panel.
- Do not let the left hero block drift lower than the right-side panel; avoid vertical centering that makes the stage feel unbalanced.
- The desktop `AIPOGER` wordmark should be large, dominant, and left-stage, while the right-side logo panel supports navigation rather than competing as the primary brand signal.
- The right-side panel logo area should feel centered inside its upper disc zone. If the AIPOGER logo looks small or off-center, enlarge the disc/logo together and verify the visual center in a rendered desktop screenshot.
- The right-side logo should remain bigger than the small header logo and should feel like a record/emblem, not a tiny icon.
- The right-side action panel has four destinations in this order: `探索 AI 音樂`, `傷心酒吧`, `Drop Battle`, `Showtime`. Explore remains the only solid-orange primary action; the other three stay dark secondary actions with their own hover/focus color.
- Adding the fourth destination must not make the panel collide with the lower navigation cards at 1440x900. Keep the panel footprint compact by reducing the upper record/logo zone and tightening button spacing instead of simply extending the panel downward.
- Desktop social icons belong under the left hero stats/social area, replacing the left waveform position. Do not place them as a floating orphan under the right panel.
- Remove decorative waveforms that sit under the right panel or create clutter near the social icons. Keep only waveforms that support the center stage composition.
- The row of lower navigation cards should sit close enough to the main hero to feel connected. Do not let it sink too low with excessive empty space.

Mobile layout:

- The mobile `AIPOGER` wordmark must be centered within its visible section and should not feel optically left-heavy.
- Social icons on mobile should sit below the Drop Signal card, bright enough to read quickly.
- The four homepage destinations use a readable 2 x 2 grid in the same order: Explore, Bar Heartbreak, Drop Battle, Showtime. Do not shrink them into four cramped one-line targets.
- Do not add extra explanatory labels such as `與音波同行`; the icons should speak for themselves.

Social icons:

- Use official brand icon paths for LINE, Instagram, Discord, and Facebook, rendered inside one consistent AIPOGER stage-button treatment. Do not mix hand-drawn sticker shapes, emoji, or unrelated glow styles.
- Discord uses the permanent invite URL `https://discord.gg/3bWVgyPKk`.
- Facebook should link to the AIPOGER group when using the public social cluster.
- LINE is the community action; its QR control opens a compact modal instead of permanently placing a QR image in the homepage strip.

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
- Treat finished winners as Showtime records, not ranked placements.

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
- For a track within its first rolling 7 x 24 hours after `created_at`, place the compact `NEW` badge at the now-playing cover's upper-left and beside track titles in visible queue/pool lists. Keep it static and do not add it to the moving Battle ticker.
- Lyrics area should be substantial enough to read, visually aligned with the comments area where practical.
- Underfilled genres send new submissions straight into the same-genre public pool.
- Challenger is shown only when that genre is already full and the new track is in 36-hour protection before public-pool promotion.
- The hero's top-right cluster should stay light; do not crowd it with the main action buttons. Put `我要播歌`, bar sharing, `探索 AI 音樂`, `Drop Battle`, and `Showtime` together in the lower hero action strip, with `Drop Battle` directly beside Explore.
- Do not show `練功聖經` or `關於愛波哥` inside the Bar Heartbreak hero action strip unless a later explicit redesign restores them.
- The hero action strip ticker is a moving Battle marquee, not a static truncated label.
- The queue header should expose a selected-genre share action so listeners can share the exact Bar Heartbreak category they are hearing.
- The Bar Heartbreak hero sign must remain text-driven and localizable. Do not replace the sign title/subtitle with a bitmap containing Chinese text, because language switching must keep working.
- The sign may visually reference the dark gold sci-fi plaque style, but the title, `AIPOGER RADIO`, `BAR HEARTBREAK`, and subtitle must be live text. The subtitle should use the same gold dimensional text family as the main title, scaled down for hierarchy.
- On desktop, keep the Bar Heartbreak sign compact rather than full-width. The plaque should sit around two-thirds of the previous oversized desktop treatment so it reads as a sign, not a giant banner that pushes the radio content down.
- On mobile, the lower hero action strip should place `我要播歌`, `分享吧台`, and `Showtime` on the first row, with `探索 AI 音樂` and `Drop Battle` centered side by side on the second row.
- The now-playing song title should keep short names dramatic, but long mixed Chinese/English titles must auto-size down and allow two lines before truncation. Do not lock every title to the largest fixed display size.

Copy direction:

- Bar Heartbreak is not a ranking list.
- It is a survival room / public radio / listener test.
- Use emotional but clear language.

## AIPOGER Showtime

Role:

- Certified works catalog.
- No fake content.
- No numbered placement language.
- Front-stage name is `AIPOGER Showtime`; old `Honor Board` wording is legacy/internal context, not the main public name.
- `AIPOGER Choice Weekly` is a curation direction from Showtime records, not a separate ranking chart.

Current layout:

- One unified catalog of certified songs.
- No Drop victory / Bar heat source tabs.
- No duplicate Featured row above the same results.
- Recognition source appears in each song card intro, for example `正式 Battle 認證`, `探索守擂認證`, or `傷心酒吧公播認證`.
- `AIPOGER Choice` is the first content shelf: a Beatport/DJ-style horizontal row of compact square editorial cover cards, never circular curator avatars. Use the curator's existing identity cover, a direct sequential-play control, a separate full-tracklist control, a visible recommendation article excerpt, and compact heart/save plus share actions. The title is large, designed `AIPOGER CHOICE`; do not render `CURATOR SETS` or `由創作者選出他們心目中的歌單`.
- Showtime follows underneath by genre. Use 2 cards on mobile, 3 on small desktop/tablet, 4 on large tablet, and 6 on wide desktop; cards use a shared bottom player instead of embedding a full audio control in every card.

Showtime admin layout:

- `/admin/showtime` is a dense cover-led owner catalog, not a vertical list: use 6 cards per desktop row, 3 per tablet row, 2 per mobile row, and keep each card focused on cover, identity, recognition and operations.
- `編輯本期 Choice` reveals selection checkboxes on eligible public works plus a compact weekly curation workbench. It is a selection state, not another dashboard panel or social-publishing control.
- The work editor may change display metadata and cover only; audio, recognition source, Hearts, votes and Battle history are visibly described as locked.
- `/profile/choice` is a creator workbench, not an owner dashboard: first show the creator's own Showtime works and their external-link controls, then a compact all-creator Showtime cover catalog for building a personal Choice. Eligibility is earned by one Showtime-certified work, but curators may select any currently public Showtime work. Keep this visually distinct from the official owner Choice and do not add social-publishing controls.

UI direction:

- Present records as playable music cards, not board tiles.
- The page should feel like a certified music shelf, not a top-10 chart or presentation slide.
- Keep the `AIPOGER SHOWTIME` heading compact and typographic; the one-sentence certified-archive subtitle uses a clearly visible yellow accent and does not contain a forced line break.

## Account And Login

Role:

- Keep auth useful but not dominant.

Rules:

- Listening surfaces should not feel blocked by login.
- Keep authentication out of large marketing headlines and explanatory hero paragraphs. Use the normal product promise first, then a compact modal or sheet at the protected action boundary, with one primary sign-in action, a dismiss action, and the intended return path.
- Uploading, voting, commenting, and Battle actions should clearly ask users to sign in.
- Error copy should explain what is blocked and what remains open.

## Admin / Operational UI

Role:

- Quiet, utility-first, dense enough for repeated work.

Direction:

- Admin pages can be more functional than public pages.
- Avoid oversized hero design in admin tools.
- Keep image/audio review and moderation actions clear.
- Repeated filter and sorting controls in one toolbar must share a consistent height, radius, type scale, and responsive grid. Do not let one control wrap into a tall pill while its neighbors remain short.
- Music-review lists use one compact play button per item and one fixed bottom preview player; do not embed a separate native audio bar inside every management card.
