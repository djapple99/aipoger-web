# Battle Pool Compact Stage Handoff

Date: 2026-07-16

## Product Decision

- `/battle` is a compact working stage, not a poster or dashboard.
- Quick navigation order is `Explore Music`, `Bar Heartbreak`, `Battle Records`, `Showtime`, and `Drop Rules`.
- Share is a separate command beside the primary `Start a Challenge` action.
- The old `成果牆` / `Result Wall` name is retired in public UI. Use `對戰記錄` / `Battle Records` for the monthly archive; individual battle artifacts may still be called result cards / 成果卡.
- Battle Records describes established Battle results. Showtime remains the multi-source certified music catalog.

## Visual Audit Findings

Baseline captures at 1440x900 and 390x844 showed an oversized poster-like hero, fake waveform/deck/EQ decoration, navigation cards overlapping the character art, no Explore Music entry, hidden mobile quick links, and the public challenge pool pushed down.

The compact stage removes non-functional audio decoration, separates primary action from navigation, keeps two character cutouts inside the visual zone, hides `VS` on mobile, and exposes the public pool heading in the first viewport.

Follow-up refinement enlarges the desktop `VS` to a 108px high-contrast confrontation mark. The signed-in account dock now uses versioned edge-relative storage, ignores the obsolete absolute-pixel position, and listens for pointer move/up at window scope so a drag cannot be lost when the pointer leaves the avatar.

Audit captures are stored outside Git under `output/design-audit/2026-07-16-battle-pool/`.

## Main Files

- `src/app/battle/page.tsx`
- `src/app/globals.css`
- `src/lib/i18n.tsx`
- `src/app/battle/results/results-client.tsx`
- `src/app/battle/result/battle-result-client.tsx`
- `src/components/info-page-shell.tsx`
- `docs/aipoger-battle-pool-art-direction.md`
- `docs/aipoger-product-rules.md`
- `docs/aipoger-release-checklist.md`

## Required Verification

- 1440x900 and 390x844 rendered screenshots.
- Chinese and English route labels.
- `/ai-music`, `/listen-bar`, `/battle/results`, `/rank`, and `/hook-guide` quick-link destinations.
- `對戰記錄` / `Battle Records` heading and loading/error copy.
- `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
- Production deployment and `https://aipoger.com/battle?lang=zh` live smoke.

## Local Verification Completed

- Desktop and mobile before/after captures completed at 1440x900 and 390x844.
- Chinese and English quick-navigation labels verified, including Explore Music and Battle Records.
- `npm test`: 186 passed, 0 failed.
- `npm run lint`: 0 errors; 11 pre-existing warnings outside this Battle Pool change.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; 90 routes generated.
