# AIPOGER Battle Pool Art Direction

Last updated: 2026-07-16

This file records the approved visual direction for the Battle Pool / AI 音樂鬥歌場 area. Use it before changing `/battle`, Battle Pool cards, Battle entry CTAs, or related mobile hero layouts.

## Purpose

Battle Pool should feel like a live AI music challenge stage, not a plain list of uploads.

The page must make visitors understand three things immediately:

- This is where AI music enters a public battle.
- Creators can start or accept a Drop challenge.
- The battle surface is music-first, stage-like, and usable on mobile.

## Core Feeling

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

## Main CTA

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

## Quick Navigation

The Battle hero quick navigation is a compact command strip, not a row of dashboard cards.

Required order:

- `探索音樂`
- `傷心酒吧`
- `對戰記錄`
- `Showtime`
- `Drop 規則`

Share is a separate command beside `發起挑戰`; it must not look like another destination tab.

## Desktop Hero

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

## Mobile Hero

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

## Battle Pool Header

The pool header should introduce the public challenge pool directly.

Use:

- Label: `60S DROP BATTLE POOL`
- Main title: `Drop Battle 公開挑戰池`

Do not use:

- `挑戰最強90s抓波`
- `挑戰最強60s抓波`
- Long rule explanations in the header.
- Empty motivational English slogans.

## Official Gatekeeper Cards

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

## Filters

Genre filters should be compact and direct.

Use examples:

- `K-Pop 韓式動感`
- `Rap 街頭說唱`
- `Disco / Funk / City-Pop`
- `R&B 深情瞬間`
- `Band Rock 熱血搖滾`

The genre source is the creator-selected upload genre. Do not treat it as a challenge type or platform category.
Battle Pool filters should not show `全部風格` / `All Styles`; the default unselected state still displays all official gates and open cards. Clicking the selected genre again clears the selection.

## Copy Rules

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

## Implementation Notes

Production character assets:

- `public/images/battle/battle-fighter-citypop-female.png`
- `public/images/battle/battle-fighter-gatekeeper-male.png`

Current mock reference from the design iteration:

- `/private/tmp/aipoger-battle-pool-design.html`
- `/private/tmp/aipoger-battle-pool-design-refined-v12.png`

The mock paths are not durable production assets. When implementing, move the final PNG assets into the repository and wire them through normal app components.

## QA Checklist

Before shipping Battle Pool visual changes:

- Check desktop and mobile.
- Check Chinese and English labels.
- Confirm the challenge CTA text matches the locale and is keyboard/focus accessible.
- Confirm `探索音樂` is the first quick-navigation destination on desktop and mobile.
- Confirm `對戰記錄` is used instead of `成果牆` / `Result Wall`.
- Confirm mobile title stays on one line and mobile `VS` is not visible.
- Confirm fake waveform, deck, EQ, and decorative play controls are absent.
- Confirm no text overlaps characters, cards, or CTA.
- Confirm the CTA starts the Battle creation flow.
- Confirm the first public challenge-pool heading is visible at 1440x900 and 390x844.
