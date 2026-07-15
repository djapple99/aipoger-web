# AIPOGER Choice Cover Shelf QA

Date: 2026-07-15

## Reference and final surface

- Reference: the supplied desktop production screenshot with the legacy circular
  `CURATOR SETS` treatment and the duplicated curator subtitle.
- Final: `https://aipoger.com/rank?lang=zh#choice-weekly` in the live desktop
  browser session. The live DOM confirms the new Choice shelf is rendered.

## Comparison checks

- `CURATOR SETS` and `由創作者選出他們心目中的歌單` are absent.
- `AIPOGER CHOICE` is the large lead treatment, with the orange Choice accent.
- Published Choice entries use compact square cover cards, rather than circular
  avatars.
- Each card exposes sequential play, playlist detail, a separate Choice Heart,
  and sharing controls without changing song Heart semantics.
- The editor intro is rendered on the cover card when the published Choice has
  one. The current official Choice's stored `intro` is empty, so no article
  excerpt is fabricated on the public card.
- Showtime begins below the Choice shelf and retains its existing catalog and
  filters.

## Validation

- Browser DOM smoke verified the new heading, square Choice card image, play,
  playlist, Heart, share controls, and the absence of the legacy labels on the
  live production alias.
- Screenshot capture on the production browser timed out at the CDP boundary;
  the same rendered implementation was visually checked locally before deploy,
  and production content was verified from the live rendered DOM.

final result: passed
