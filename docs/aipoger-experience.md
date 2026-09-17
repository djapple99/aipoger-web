# AIPOGER 版面與使用流程

更新：2026-09-18 05:04 Asia/Taipei。主文件 3／6；產品門檻與權限以 [產品規則](aipoger-product-rules.md) 為準。Showtime 純黑底、月榜分享與管理已正式發布；Choice 管理精簡與收藏順序見 [最新發布紀錄](archive/2026-09-18-choice-management-simplify-release.md)。

This document protects AIPOGER's visual identity. Use it before redesigning any page, adding major UI, or changing user-facing copy.

導覽：品牌與首頁 → Drop／Q Crash → 酒吧 → Showtime／Choice → 帳號／後台／聖經 → Battle 細節 → 本次資訊層級。

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
- Gold/yellow only for highlighted music records and compact accents, not retired certification or qualification badges.
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

### Q Crash

- `Q Crash` is the asynchronous Full Song Battle mode, not a survey or ordinary social poll. Its source and timing rules are defined in `aipoger-product-rules.md`.
- Keep the same black stage, orange battle energy, small cyan electrical accent, A/B confrontation, and music-first language.
- Desktop uses two side-by-side work seats with a compact VS signal. Mobile stacks the seats and keeps both play/vote actions easy to reach without horizontal overflow.
- Each work seat shows the work-specific cover, work/version label, song, creator, genre, AI tool, full-track duration when available, one play action, and one vote action. Q Crash creation accepts a public Suno link or an MP3/WAV upload; a creator profile cover is only a fallback.
- Keep the `Q CRASH` title compact so the work comparison starts high in the viewport. Lyrics open as an in-page HUD below the work pair; missing lyrics say `歌詞未提供` rather than leaving a blank panel.
- Playback uses one fixed bottom A/B player with explicit A/B switches, play/pause, seek, previous/next, volume on desktop, and close. Do not embed a native audio control in each work card.
- Voting state shows only the mode, deadline, work information, and the listener's private submitted state. A shared bottom rating dock switches between A and B and contains exactly five keys: 押韻、爆點、旋律、情緒、結構. Never show a count, percentage, total audience, feedback total, leader, radar, or visual progress toward a winner before settlement.
- Winner voting uses a two-step action: selecting A or B only marks a private, reversible pending choice; a separate `確定送出` / `Confirm Vote` control creates the immutable vote. Before confirmation the listener can replay, seek, and switch sides; after confirmation the choice is locked.
- Keep confirmation in a fixed high-contrast dock above the A/B player. The dock states the selected work, explains that selection is not yet a vote, changes to `登入並投作品 A/B` for signed-out listeners, and remains readable at 390x844 and 1440x900 without covering playback.
- Official results use a compact result panel and show the winning work's pentagon feedback distribution. An insufficient Q Crash shows no radar.
- Q Crash share invitations should feel like a friend asking for a quick listen and decision, not a system announcement: `這兩首歌到底哪首比較好聽啊？我有點選不出來！進來聽完整歌曲，幫我決定哪首勝出！`
- Q Crash uses Traditional Chinese only when `lang=zh`; English is the fallback for `en`, `ja`, and `ko`, including the card, creation flow, controls, share copy, and social metadata.
- Final copy leads with the winning work and then its creator. Never say that a creator defeated themself when both works have one owner.
- The Battle Pool exposes one compact `建立 Q Crash` mode panel before the ordinary public Drop challenge pool; it must not push the normal pool out of the first viewport at 1440x900 or 390x844. Every active Q Crash appears as one paired A/B battle card, never two ordinary queue cards.
- Battle Pool mode identity must remain unmistakable on desktop and mobile: the Q Crash introduction and matchup section use cyan live-text ribbons and cyan borders, while the public Drop Battle section uses red/coral live-text ribbons and red borders. Solid cyan/red mode labels and primary actions use near-black text; ordinary dark-card titles and supporting copy remain white/gray.

## 24H Full Song Battle（保留系統，非前台主推）

Role:

- Full-track one-on-one battle.
- Slower, more complete, more listening-focused than Drop Battle.

UI direction:

- Use `24H Full Song` or `24H Daily Battle` consistently where appropriate.
- Make it clear the full song is uploaded and listeners can take time.
- Keep global active limits visible when they are implemented.
- Keep actual finished winner records and authorized historical audio in the Battle archive flow; do not present them as Showtime certification or monthly chart placements.

## Bar Heartbreak

Role:

- Continuous public listening for AI music.
- Creators submit immediately; owner curation and moderation remain available after publication.

Must preserve:

- Keep play/pause and other transport controls in the shared bottom player, not a competing radio player.
- Listening is open.
- Voting/commenting requires sign-in.
- Reaction copy near buttons should encourage active voting.
- The record visual is central and should feel like a public broadcast.
- For a track within its first rolling 7 x 24 hours after `created_at`, place the compact `NEW` badge at the now-playing cover's upper-left and beside track titles in visible queue/pool lists. Keep it static and do not add it to the moving Battle ticker.
- Lyrics area should be substantial enough to read, visually aligned with the comments area where practical.
- Eligible submissions enter public playback immediately under the unchanged personal upload and genre limits; show actual public song counts, not capacity denominators.
- Do not show retired Challenger seats, 36-hour protection, survival days or automatic elimination.
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
- It is a continuous public radio and listening space, not a survival game.
- Use emotional but clear language.

## AIPOGER Showtime

Role:

- Front-stage name is `AIPOGER Showtime`; old `Honor Board` wording is legacy/internal context, not the main public name.
- `/rank` presents Choice and Monthly Charts together. No view tabs; `#choice-weekly` and `#monthly-charts` remain real section anchors.
- Desktop uses approximately 70/30 columns: Choice lead/companion and more covers on the left, compact monthly rows on the right. Mobile reads lead Choice, chart summary, more Choices. Sparse catalogs collapse absent sections rather than showing empty ad slots. Monthly song support and personal curation remain different signals. No certification catalog, certification badges, six-defense progress, invitation gate or fake content.

Monthly chart layout:

- Keep the `AIPOGER SHOWTIME` heading compact above the music with one Make My Choice action. Use the user's selected option 1 neutral pure-black base `#070809`, restrained orange actions and cyan curator names; existing real covers carry the color. Do not import generated mock covers, titles or counts.
- Month, genre and search live under an accessible filter icon; current month/state and ordered playback remain visible. Show up to five actual rows initially and allow full expansion/collapse. Month labels use Taiwan calendar months; distinguish the updating current month from frozen historical snapshots with concise state labels.
- Each row shows actual rank, small square cover, song title, creator, genre, monthly distinct non-author supporter count, play, song Heart and share. Use fixed rank/cover/action tracks; mobile titles may wrap to two lines without covering counts or controls.
- Unresolved equal-support groups show `名次待定`, not parallel numeric ranks. Owner-decided order appears only after the server validates it. Below the product-rule minimum, retain the separate compact support-building state. Do not invent ranks, crowns, full Top 10 lists or movement arrows.
- Put whole-chart share beside the header filter/rules icons, with an accessible localized name. Its URL preserves month/genre/language and restores that view; individual song-share buttons stay in their rows.
- `/admin/charts` provides pending-month counts, same-score preview/playback, move-up/down controls and explicit save, plus audit history and confirmed soft-withdraw for suspected duplicates. Already settled decisions are disabled. Link it to `/admin/choice` and the owner overview; link to the published Choice moderation list, never a second curation editor.
- The history selector contains only snapshots from launch onward; absent history, insufficient support and data errors have concise truthful states. Monthly counts must not be labeled lifetime Hearts, Battle wins, Choice popularity or Earworm affinity.
- Hide/moderation and playback restrictions remain effective in historical views; preserve the record without exposing restricted music or silently renumbering the frozen month.
- No Drop victory / Bar heat / certification source tabs, duplicate Featured rows, certificate subtitle or marketing paragraph explaining how the new system works. Operational labels and accessible tooltips are enough.

Choice shelf and selection:

- Use Beatport-inspired square artwork hierarchy, not a branded clone: larger lead cover, smaller companion, compact more-cover grid. The owner selects the feature from published Choices in the existing admin library. Without a valid designation the heading is simply Choice Playlists, not Featured. Preserve original cover proportions and do not invent separate campaign artwork. Keep authored title, curator/date, recommendation excerpt on the lead, full intro in HUD/share page, sequential play, tracklist, collection Heart/save, share and comments. Do not add `CURATOR SETS`, a standalone article HUD or explanatory marketing copy.
- `製作我的 Choice` enters `/profile/choice` private favorites selection. Any signed-in account can use it; request sign-in only at the protected action boundary and return to the intended flow. Do not display certified-work, prior-upload or invitation requirements.
- Show all of the user's public playable favorites, regardless of song age or historical certification. Most recently saved songs come first in the top row; legacy saves without reliable per-user time stay in stable order behind dated saves. Search/genre filters keep this ordering; the selected playlist keeps manual order. Use compact cover rows with distinct selection checkboxes, play and existing song Heart/favorite controls; keep a separate selected list with ordering, title, introduction, preview, publish and withdrawal. An empty favorites state offers a direct Explore action without marketing text.
- Selecting the first song creates/resumes the current week's draft and adds it immediately; no preliminary create-draft task. Resume persisted work rather than clearing the selection when re-entering. Keep current week and selected count visible; publish validation follows the 5-10-song, one-per-Monday-week product rule.
- Selection checkboxes must never look like or act as Hearts. Unselecting a song does not remove its favorite; removing a favorite or cancelling its Heart does not remove it from an existing Choice. Unavailable or moderated selections retain an honest disabled state and cannot silently play.
- Preserve the existing interactive tracklist HUD and usable `/choice/{id}` share page. Both show stored intro, ordered songs, song actions, Play All and the shared player; public Choice remains non-ranked.
- `/admin/choice` is a compact published-only management list with search, pagination, real covers, curator/date/song count, public-view link, owner-only feature toggle and confirmed deletion. No official editor, draft creation, cover upload or selection pool. The owner uses `/profile/choice` to create, like everyone else; `/admin/showtime` redirects to works management. No manual-certification review queue, certification-only catalog or award actions. Do not add social-publishing controls to the personal workbench.

Own works and playback:

- Merge all creator-owned community song metadata editing into `Profile / 我的作品`, including formerly certified songs. Keep one compact paginated list and editor for cover, permitted display metadata, lyrics, YouTube and reviewed external support links; do not split normal works from locked Showtime works or place that editor above Choice selection.
- Audio, ownership, actual Battle wins/losses, votes, Hearts and historical provenance remain protected, not editable form fields. Challenge status is a separate explicit creator action in own works, never a side effect of saving metadata or appearing in a chart/Choice. Previously certified tracks require fresh opt-in after reset; keep the normal pending-invitation Drop lock.
- Public playable historical community works appear normally on Explore and Bar without certification badges or founder-only Showtime placement. Actual Battle history remains accessible in the information HUD; remove all six-defense promotion copy.
- Use one shared bottom player across charts, Choice, Explore, Bar and Profile, including play/pause, seek, previous/next, volume and lyrics. No native audio controls or waveforms per row. Preserve authorized historical audio/share access without displaying it as a fabricated monthly rank.
- Preserve the existing black/orange music-stage identity. Keep controls compact, accessible and readable on desktop/mobile; use state labels and action names, not in-app redesign explanations or marketing copy.

## Account And Login

Owner task badge (2026-09-18): show the red pending-task count at the avatar's upper-right, separately linked to the admin task list; retain Profile at the avatar center and account/Battle notices at the bell. When both notice types exist, move the existing account-count marker to the upper-left so counts do not overlap. Red badge labels support zh/en/ja/ko. Admin overview lists actionable categories and counts with direct module links; opening it never dismisses unresolved work. New-song promotion and all Choice drafts are excluded. The existing Bar promotion count remains inside Bar admin for manual checking.

Role:

- Keep auth useful but not dominant.

Rules:

- Listening surfaces should not feel blocked by login.
- Keep authentication out of large marketing headlines and explanatory hero paragraphs. Use the normal product promise first, then a compact modal or sheet at the protected action boundary, with one primary sign-in action, a dismiss action, and the intended return path.
- Protected actions ask users to sign in at the action boundary. Anonymous Drop arena exceptions and Q Crash requirements follow the product rules.
- Error copy should explain what is blocked and what remains open.
- Profile saved music follows the same compact fixed-bottom player language as Explore, Showtime, and Choice. Keep one play action in each song row; do not place waveforms, native audio controls, or competing mini players inside the account list.

## Admin / Operational UI

Role:

- Quiet, utility-first, dense enough for repeated work.

Direction:

- Admin pages can be more functional than public pages.
- Avoid oversized hero design in admin tools.
- Keep image/audio review and moderation actions clear.
- Repeated filter and sorting controls in one toolbar must share a consistent height, radius, type scale, and responsive grid. Do not let one control wrap into a tall pill while its neighbors remain short.
- Music-review lists use one compact play button per item and one fixed bottom preview player; do not embed a separate native audio bar inside every management card.

## AI Music Practice Bible

- Studio Mastering Prompt examples use one compact `15 秒試聽` action only on cards with a real audio asset.
- Route every Prompt example through the shared fixed bottom player. Do not autoplay, expand card height with waveforms, or place a native audio control in each card.
- Keep the example disclaimer visible and quiet: the clip demonstrates a sound direction and does not promise an identical Suno generation.
- When `錄音室 Mastering` is selected, keep the second-level `錄音室類型` filter wrapped on narrow screens; use the 15 approved music-family labels (`Electronic`, `Hip-Hop`, `Soul & R&B`, `New Age & Ambient`, `Rock & Roll`, `Indie Dance`, `Disco & Funk`, `Jazz & Bossa`, `Pop`, `Classical & Cinematic`, `Latin & Caribbean`, `African & Amapiano`, `Asian & Middle Eastern`, `Country & Folk`, `DJ Edit / Extended`) and show the selected family as a compact orange card badge.
- `Modern Taiwanese Pop` is fully withdrawn from the free Prompt catalog. Do not leave a disabled card, premium lock, price, or placeholder in the free library; a future paid version needs its own approved product surface.


## Battle Pool 細節

### Purpose

Battle Pool should feel like a live AI music challenge stage, not a plain list of uploads.

The page must make visitors understand three things immediately:

- This is where AI music enters a public battle.
- Creators can start or accept a Drop challenge.
- The battle surface is music-first, stage-like, and usable on mobile.

### Core Feeling

Use:

- Black / near-black stage background.
- Red and orange light as battle energy.
- Red-orange for the main challenge CTA and small cyan accents for navigation.
- A compact two-character stage visual that supports, rather than replaces, the working interface.
- Dark tool surfaces with readable contrast and restrained borders.

Avoid:

- Plain SaaS list pages.
- Stock marketplace layouts.
- Decorative or fake waveforms, EQ bars, deck controls, or audio controls that do not operate.
- Overly complex rule text in the hero.
- Mobile hero elements that overlap the title or CTA.
- PPT-style mastheads that push the public challenge pool below the first viewport.

### Main CTA

The main CTA is a real text-and-icon button.

Chinese:

- `發起挑戰`

English:

- `Start a Challenge`

Rules:

- Do not use `我要挑戰` for this primary CTA.
- Keep the button accessible: the actual button text and `aria-label` must match the locale.
- Use the crossed-swords icon with visible localized text.
- Keep it compact, high contrast, keyboard accessible, and visually separate from share.
- On click, it should begin the same Battle start flow as the normal `Start a Challenge` action.

### Quick Navigation

The Battle hero quick navigation is a compact command strip, not a row of dashboard cards.

Required order:

- `探索音樂`
- `傷心酒吧`
- `對戰記錄`
- `Showtime`
- `Drop 規則`

Share is a separate command beside `發起挑戰`; it must not look like another destination tab.

### Desktop Hero

Desktop Battle Pool hero should preserve:

- Eyebrow: `AIPOGER BATTLE POOL`.
- Main headline: `AI 音樂鬥歌場`.
- Supporting line: short, stage-like, and direct.
- Left side: title, subtitle, primary challenge CTA, and share.
- Right side: two character cutouts with a central `VS`.
- Compact functional navigation at the bottom of the hero.

Desktop character direction:

- Use transparent PNG character cutouts.
- Female City-pop / gold performer on the left.
- Male gatekeeper / street fighter character on the right.
- Characters should be large enough to create battle energy, but must not make the nav cards unreadable.
- The `VS` can remain on desktop because there is enough space.
- The `VS` mark should sit between the two character centers, not over one character or the title.

The hero must not include a fake waveform, decorative play button, deck, or EQ. Actual audio previews remain on the Drop cards below.

### Mobile Hero

Mobile hero must be simpler than desktop.

Approved mobile structure:

- Compact copy block with eyebrow, one-line title, short subtitle, `發起挑戰`, and share.
- Two supporting character cutouts on the right/lower side.
- A horizontally scrollable quick navigation strip that starts with `探索音樂`.

Mobile rules:

- `AI 音樂鬥歌場` must stay on one line.
- Do not display `VS`, fake waveform, decorative play control, star CTA, or dashboard cards.
- Do not let the title, subtitle, CTA, or navigation overlap either character's face.
- The first public challenge-pool heading must remain visible within a 390x844 first viewport.

### Battle Pool Header

The pool header should introduce the public challenge pool directly.

Use:

- Label: `60S DROP BATTLE POOL`
- Main title: `Drop Battle 公開挑戰池`

Do not use:

- `挑戰最強90s抓波`
- `挑戰最強60s抓波`
- Long rule explanations in the header.
- Empty motivational English slogans.

### Official Gatekeeper Cards

Official Drop cards should feel like challenge gates.

Use:

- `歡迎任何人來挑戰 AIPOGER 官方關卡`
- Actual song title.
- `GATE 01`, `GATE 02`, etc.
- Genre badge from the normal Battle genre menu.
- Highlight copy: `歡迎挑戰這首官方 Drop，設定開戰時間並分享拉人投票。看看你的歌能不能打`.
- Small music metadata such as BPM, key, and Drop duration when available.
- Red pill action such as `挑戰這首 Drop`.
- Put `挑戰這首 Drop` in the same action row as `5 秒預播`.

Do not:

- Repeat a section heading/subheading such as `官方 DROP 挑戰` / `歡迎任何人來挑戰` above the cards.
- Put star CTAs inside each Drop card.
- Let official cards look like normal ranking records.
- Show full audio controls on the card; teaser behavior is enough.

### Filters

Genre filters should be compact and direct.

Use examples:

- `K-Pop 韓式動感`
- `Rap 街頭說唱`
- `Disco / Funk / City-Pop`
- `R&B 深情瞬間`
- `Band Rock 熱血搖滾`

The genre source is the creator-selected upload genre. Do not treat it as a challenge type or platform category.
Battle Pool filters should not show `全部風格` / `All Styles`; the default unselected state still displays all official gates and open cards. Clicking the selected genre again clears the selection.

### Copy Rules

Battle Pool copy should be clear first, stylish second.

Use:

- `發起挑戰`
- `Start a Challenge`
- `Drop Battle 公開挑戰池`
- `挑戰這首 Drop`
- `約朋友一起挑戰`
- `邀請觀戰投票`

Avoid:

- `我要挑戰` as the main start CTA.
- `全部風格` / `All Styles` in the Battle Pool genre filter.
- Repeated section headings like `官方 DROP 挑戰` above official Gatekeeper cards.
- `挑戰最強90s抓波`.
- `挑戰最強60s抓波`.
- Rule-heavy explanations in the first viewport.
- Decorative English slogans that do not explain the action.



## 2026-09-06 第一批資訊層級

- Battle 模式介紹只保留一組標籤、短句與建立按鈕；無 Q Crash 時只顯示一行空狀態。有場次時保留青色 A/B 對戰卡區，不改資料與模式順序。
- Explore 的依類型／正在升溫控制放在個人推薦前；切到正在升溫時直接顯示熱度作品，個人推薦保留在依類型視角。
- 一般零戰績作品收起零挑戰數與不能操作的暫不接戰；資訊按鈕仍可查真實完整戰績。依 2026-09-17 確認規則，所有認證標章與守擂 0/6 晉級進度退役；接戰狀態只依創作者明確選擇與實際資格顯示。
- 資訊按鈕可用滑鼠與鍵盤操作，桌機 hover 仍保留；播放、支持、分享與真實攻擂入口不變。
- 對戰記錄使用得票率；本月摘要和兩模式內容遵循同一月份。跨場 audienceCount 加總稱投票人次。
- 手機耳朵蟲／酒吧的未發布高度調整仍以 roadmap 為準；Showtime／Choice 依上方 2026-09-17 已確認體驗實作，文件更新不能當作完成證據。

## 音樂分析的表達框架

A&R 報告使用一句真話、聲音 DNA、歌詞診斷、市場定位、最強使用場景、情緒記憶點、商業用處、最大風險、AIPOGER 投放建議與一至兩項修改方向。將聲音觀察翻成創作者能採取的行動；沒有音訊特徵抽取或歌詞時明說證據範圍，不假裝完成分析。避免只堆 BPM／Key／分數、空泛稱讚或宣稱保證爆紅。品牌、廣告、短影音、DJ 現場等適配度是建議，不是商業成功承諾；入口與登入規則以產品正文為準。

## 2026-09-08 傷心酒吧持續聆聽（歷史發布記錄）

- 酒吧取消曲風容量分母、容量進度条、Challenger 區與生存天數；顯示實際可播放歌曲數。
- 投稿即公開，主人可後續策展撤下；中英日韓使用一致的簡短投稿說明。
- 當批 Showtime 投稿歌曲沿用原 ID 回到酒吧輪播，當時未改探索或 NEW 日期；這不是現行曝光限制。2026-09-17 確認公開可播歷史社群作品同時出現在探索與酒吧，仍不重設 NEW 日期。
- 當批三入口為酒吧連續聽、探索找歌、Showtime 主題策展；目前 Showtime 已確認改為月榜與 Choice 頁籤，以上方正文為準。

## 2026-09-08 共用播放器

- 酒吧、探索、Showtime／Choice、個人歌單使用同一個底部播放器：播放／暫停、上一首、下一首、拖曳進度、手機與桌機音量、歌詞及關閉。酒吧與探索公播作品可在播放器送愛心；其他來源維持原卡片收藏語意。
- 酒吧六首預覽改為一行下一首，必須與共用佇列實際下一首一致。顯示播放範圍與本首曲風，保留各曲風真實歌曲數。
- 酒吧上方移除獨立音量與進度區；換頁維持目前音訊與佇列，選歌或選曲風才換佇列。新投稿不插入既有佇列。
