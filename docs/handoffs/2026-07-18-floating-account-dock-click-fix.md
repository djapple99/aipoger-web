# Floating Account Dock Click Fix

Date: 2026-07-18

## User-visible issue

The signed-in floating avatar was visible, but clicking it on the Explore AI Music page did not open Profile. The problem was reproducible in a user recording while an account/Battle notice indicator was present.

## Root cause

The account dock installed pointer capture on the outer draggable wrapper during `pointerdown`, before the browser could classify the interaction as a click. That could swallow the child Profile link's click event. A notice state also previously allowed the avatar itself to become a notice button, which made the avatar's destination ambiguous.

## Current behavior

- The avatar is always a Profile link for every signed-in account: `/profile?lang=<lang>`.
- The bell is a separate small button that opens the account-notice panel.
- Dragging starts only after the pointer moves more than 8px. Clicks remain clicks; real drags retain the edge-relative position.
- The dock listens to Supabase auth-state changes so a newly signed-in user, sign-out, or account switch updates the avatar state without requiring a full reload.
- Owners reach `/admin` from the owner-only Profile entry. The floating avatar is intentionally not a hidden admin-only shortcut.

## Files

- `src/components/global-battle-call-overlay.tsx`
- `tests/site-smoothness-regressions.test.mjs`
- `docs/aipoger-product-rules.md`
- `docs/aipoger-release-checklist.md`

## Verification

- `npx tsc --noEmit` passed.
- `npm test -- --runInBand`: 213 passed, 0 failed.
- `npm run build` passed.
- Production deployment `dpl_8ZGS6Yw8XJaHFgcsLibvnUA1FBXz` is READY and aliased to `https://aipoger.com`.
- Live smoke: `/ai-music`, `/profile`, and `/admin` returned HTTP 200.

## Regression test

Keep a desktop and mobile check for both states:

1. Click the avatar while there is no notice: Profile opens.
2. Click the avatar while a notice dot/count is present: Profile still opens.
3. Click the bell: the notice panel opens.
4. Move the avatar more than 8px: it drags and remains in the saved position after reload.
