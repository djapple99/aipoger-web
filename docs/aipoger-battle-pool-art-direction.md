# AIPOGER Battle Pool Art Direction

Last updated: 2026-06-22

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
- Gold only for the main challenge CTA or honor-level highlights.
- Music signals such as waveform, deck, EQ, BPM, key, and Drop duration where they support the interface.
- Glassy dark panels with readable contrast.

Avoid:

- Plain SaaS list pages.
- Stock marketplace layouts.
- Decorative music elements that cover key UI.
- Overly complex rule text in the hero.
- Mobile hero elements that overlap the title or CTA.

## Main CTA

The star CTA is a real button, not just decoration.

Chinese:

- `發起挑戰`

English:

- `Start a Challenge`

Rules:

- Do not use `我要挑戰` for this primary CTA.
- Keep the button accessible: the actual button text and `aria-label` must match the locale.
- The star graphic can carry the visible text, but the underlying button must still have real text for accessibility and future interaction.
- Keep the star text visually horizontal and centered; do not rotate the text inside the star.
- The star must look clickable, with a button-like glow, ring, hover state, or arrow indicator.
- On click, it should begin the same Battle start flow as the normal `Start a Challenge` action.

## Star CTA Visual

Use a gold-orange 3D star with visible depth and shadow.

Approved direction:

- Orange-gold gradient, not flat yellow.
- Dimensional bevels and a soft drop shadow.
- Red dimensional Chinese lettering.
- No white outline around the CTA text.
- CTA text should not look crooked or misaligned.
- The star should look upright on mobile.

Desktop:

- The star can overlap the right side of the `Drop Battle 公開挑戰池` header area.
- Its center should align with the vertical center of the pool header.
- It should feel like a stage sticker / badge, not a normal rounded button.

Mobile:

- The star should sit between the two characters.
- Its center should align with the midpoint between the female and male character centers.
- Do not rotate the mobile star through CSS if the image asset already includes text or dimensional perspective.
- Keep it smaller than the characters so it reads as a CTA, not as the main character.

## Desktop Hero

Desktop Battle Pool hero should preserve:

- Eyebrow: `AIPOGER BATTLE POOL`.
- Main headline: `AI 音樂鬥歌場`.
- Supporting line: short, stage-like, and direct.
- Left side: title, subtitle, audio / music signal.
- Right side: two character cutouts with a central `VS`.
- Functional nav cards below the hero copy.

Desktop character direction:

- Use transparent PNG character cutouts.
- Female City-pop / gold performer on the left.
- Male gatekeeper / street fighter character on the right.
- Characters should be large enough to create battle energy, but must not make the nav cards unreadable.
- The `VS` can remain on desktop because there is enough space.
- The `VS` mark should sit between the two character centers, not over one character or the title.

Music elements:

- Desktop may use waveform, DJ deck, EQ meter, BPM / key / Drop duration, or mini-player accents.
- These elements should sit behind or beside the core UI, not over the CTA or card text.
- Do not show redundant `DROP CUT 00:05 PREVIEW` text in the hero; previews already exist on the Drop cards below.

## Mobile Hero

Mobile hero must be simpler than desktop.

Approved mobile structure:

- Top microcopy block:
  - `AIPOGER BATTLE POOL`
  - `挑戰 AI、對決全場。用 60 秒 Drop 讓聽眾投票。`
- Centered headline:
  - `AI 音樂鬥歌場`
- Left female character.
- Right male character.
- Gold-orange star CTA centered between the two characters.

Mobile rules:

- `AI 音樂鬥歌場` must stay on one line and be horizontally centered.
- Remove the mobile `VS`; it makes the small hero crowded.
- Do not show the mobile waveform behind the female character.
- Do not let the title overlap either character's face.
- Keep the star in the visual midpoint between characters, not pushed toward the right character.
- Keep the star upright and readable.

## Battle Pool Header

The pool header should introduce the public challenge pool directly.

Use:

- Label: `60S DROP BATTLE POOL`
- Main title: `Drop Battle 公開挑戰池`

Do not use:

- `挑戰最強90s抓波`
- Long rule explanations in the header.
- Empty motivational English slogans.

## Official Gatekeeper Cards

Official Drop cards should feel like challenge gates.

Use:

- `官方 DROP 挑戰`
- `歡迎任何人來挑戰`
- Actual song title.
- `GATE 01`, `GATE 02`, etc.
- Genre badge from the normal Battle genre menu.
- Small music metadata such as BPM, key, and Drop duration when available.
- Red pill action such as `挑戰這首 Drop`.

Do not:

- Put star CTAs inside each Drop card.
- Let official cards look like normal ranking records.
- Show full audio controls on the card; teaser behavior is enough.

## Filters

Genre filters should be compact and direct.

Use examples:

- `全部風格`
- `K-pop 動感風`
- `說唱街頭風`
- `復古 City-Pop`
- `感人抒情`
- `熱血搖滾`

The genre source is the creator-selected upload genre. Do not treat it as a challenge type or platform category.

## Copy Rules

Battle Pool copy should be clear first, stylish second.

Use:

- `發起挑戰`
- `Start a Challenge`
- `Drop Battle 公開挑戰池`
- `官方 DROP 挑戰`
- `挑戰這首 Drop`
- `約朋友一起挑戰`
- `邀請觀戰投票`

Avoid:

- `我要挑戰` as the main start CTA.
- `挑戰最強90s抓波`.
- Rule-heavy explanations in the first viewport.
- Decorative English slogans that do not explain the action.

## Implementation Notes

Recommended production asset naming:

- `public/images/battle/battle-fighter-citypop-female.png`
- `public/images/battle/battle-fighter-gatekeeper-male.png`
- `public/images/battle/battle-start-challenge-star-zh.png`
- `public/images/battle/battle-start-challenge-star-en.png`

Current mock reference from the design iteration:

- `/private/tmp/aipoger-battle-pool-design.html`
- `/private/tmp/aipoger-battle-pool-design-refined-v12.png`

The mock paths are not durable production assets. When implementing, move the final PNG assets into the repository and wire them through normal app components.

## QA Checklist

Before shipping Battle Pool visual changes:

- Check desktop and mobile.
- Check Chinese and English labels.
- Confirm the star CTA text matches the locale.
- Confirm the star button is keyboard/focus accessible.
- Confirm mobile title stays one line and centered.
- Confirm mobile `VS` and waveform are not visible.
- Confirm the star is between the two characters on mobile.
- Confirm no text overlaps characters, cards, or CTA.
- Confirm the CTA starts the Battle creation flow.
