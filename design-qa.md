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

---

# Suno Practice-library Finder QA

Date: 2026-07-17

## Source visual truth

- Lyric-control finder: `/Users/huangyihong/Desktop/截屏2026-07-17 凌晨1.20.30.png`
- Prompt finder: `/Users/huangyihong/Desktop/截屏2026-07-17 凌晨1.20.40.png`
- The source issue was bounded to the two search/filter controls: the placeholder and inactive categories were too dim, the selected state relied mainly on a subtle tint, and the category row hid options behind horizontal scrolling on small screens.

## Implementation evidence

- Desktop prompt finder: `output/design-qa/suno-finder-desktop-after.png`
- Mobile prompt finder: `output/design-qa/suno-finder-mobile-after.png`
- Mobile lyric finder: `output/design-qa/lyric-finder-mobile-after.png`
- Focused prompt comparison: `output/design-qa/prompt-before-after.png`
- Focused lyric comparison: `output/design-qa/lyric-before-after.png`
- Desktop viewport: 1585 CSS px wide.
- Mobile viewport: 390 CSS px wide.
- Tested states: initial, keyword search, clear search, category selection, Chinese, and English.

## Comparison history

1. Initial review found three priority usability problems: no visible instruction, insufficient contrast, and a mobile category row that required undisclosed horizontal scrolling.
2. The panels were rebuilt with a visible task title and helper sentence, stronger input border and placeholder contrast, a live result-count badge, a clear-search action, and a labelled category group.
3. Selected categories now combine a check mark, brighter text, border, background, and `aria-pressed`; inactive categories remain readable.
4. Category buttons now wrap, keep a minimum 44 px target, and remain inside the 390 px viewport. Browser geometry measured document `scrollWidth === clientWidth` and category-container `scrollWidth === clientWidth`.
5. Focused before/after inspection confirmed that both controls now present their purpose and interaction model before the visitor starts using them.

## Interaction and implementation checks

- Searching `sidechain` reduced the Prompt result count to 2 and exposed the clear action.
- Clearing the query restored the search state.
- Selecting `舞曲能量` produced 3 results and a distinct checked selected state.
- The lyric-control anchor rendered the corresponding orange-accent finder.
- English rendered `Find the prompt move you need` and the English helper text.
- TypeScript, targeted ESLint, 194 automated tests, and the optimized Next.js production build passed.
- Browser inspection found no page-level horizontal overflow at the tested mobile viewport.

## Final result

passed
