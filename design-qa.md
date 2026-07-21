# Explore AI Music — Design QA

## Comparison Target

- Source visual truth: `/Users/huangyihong/.codex/generated_images/019f6b8e-0eca-7ec2-9043-42215ec62d81/exec-d4202539-e72d-48d4-9bc1-a89cc2f1de76.png`
- Original screen context: `/var/folders/z5/42v3w_nj2_b36bxx5c2559ph0000gn/T/TemporaryItems/NSIRD_screencaptureui_tRxKpx/截屏2026-07-17 凌晨1.56.44.png`
- Implementation screenshot: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/explore-redesign-implementation-1944x972.png`
- Normalized full-view comparison: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/explore-redesign-comparison-1944x972.png`
- Desktop evidence: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/explore-redesign-desktop-1440x900.png`
- Mobile evidence: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/explore-redesign-mobile-390x844.png`
- English mobile evidence: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/explore-redesign-mobile-en-390x844.png`
- Route/state: `/ai-music?lang=zh`, loaded `依類型` catalog with 75 public works; additional `正在升溫` and GUIDE HUD interaction checks.
- Viewports: 1944 × 972 comparison target, 1440 × 900 desktop product gate, 390 × 844 mobile product gate.

## Full-view Comparison Evidence

The normalized side-by-side image compares the chosen Frequency Editorial Gate concept with the browser-rendered implementation. The implementation preserves the concept's three main visual moves: a real vinyl/club-light raster backdrop, the split `AI | 音樂作品` editorial lockup, and the compact booth-like navigation/control rail. It intentionally compresses the mock's hero proportion so the first genre title and cover row remain visible at both required product viewports.

## Focused Region Evidence

- Header/title: the 1440 × 900 browser capture shows a complete live-text title, bright yellow promise, cyan submission link, and real background asset without text baked into the raster.
- Navigation/controls: the active navigation underline, orange selected view, high-contrast inactive view, and icon-only GUIDE button remain visually grouped and readable.
- Mobile: the 390 × 844 capture shows the full header, all five navigation destinations, the view switch, GUIDE, first genre title, and two cover cards without horizontal page overflow or clipped primary controls.
- English: the mobile English lockup fits as `AI | Music Works` without clipping; navigation and view controls remain legible.

## Required Fidelity Surfaces

- Fonts and typography: passed. `Noto Serif TC` gives the Traditional Chinese title the selected editorial contrast; Righteous provides the compact Latin display index. H1 remains semantically `AI 音樂作品` / `AI Music Works`, with a strong but compact scale and controlled wrapping.
- Spacing and layout rhythm: passed. Header, navigation, local view control, genre heading, and covers form one continuous central axis. The compact implementation is intentionally shorter than the exploratory mock to satisfy the cover-led catalog rule.
- Colors and visual tokens: passed. Near-black, warm orange, cream white, action yellow, and the restrained cyan accent match AIPOGER's existing palette. Active/inactive control contrast is materially clearer than the original screen.
- Image quality and asset fidelity: passed. The hero uses a dedicated 1800 × 520 WebP generated for the measured slot; it stays sharp, crops cleanly, fades to black, and contains no fake UI, logo, or baked-in copy.
- Copy and content: passed. Required title, catalog count, subtitle, submission prompt, navigation order, view labels, and accessible GUIDE name are unchanged.
- Icons: passed. The existing `/guide.png` source asset remains the only GUIDE artwork; no handcrafted SVG, CSS icon, emoji, or placeholder asset replaces it.
- Responsiveness and accessibility: passed. Required desktop/mobile first-view content remains visible, H1 is intact, tap targets are practical, selected state uses `aria-pressed`, GUIDE has an accessible name and dialog semantics, and focus-visible styling remains.

## Findings

- No actionable P0, P1, or P2 findings remain.

## Open Questions

- None blocking. The global live-count pill remains in the shared site header instead of being duplicated inside the Explore hero; this is an intentional product-shell constraint.

## Interaction And Runtime Checks

- `依類型` → `正在升溫`: selection changed and `aria-pressed="true"` was verified.
- GUIDE: opened as one accessible dialog, rendered visibly, and closed through the unique `關閉說明` control.
- Chinese and English title states were rendered at mobile width.
- Browser console errors checked: none.

## Comparison History

### Pass 1

- Earlier findings: none at P0/P1/P2. The first browser implementation already retained the selected visual direction while satisfying the stricter product rule that the catalog must remain visible above the fold.
- Fixes made after visual comparison: none required. The brighter, larger exploratory frequency texture was already reduced in implementation to protect copy contrast and cover visibility.
- Post-fix evidence: not applicable; no blocking visual fix was made after the first comparison.

## Follow-up Polish

- P3: the exact visual weight of the title can be tuned after observing real production traffic on narrower Android font fallbacks, but current Chinese and English browser captures are stable.

## Implementation Checklist

- [x] Real generated hero asset placed in the measured header slot.
- [x] Live, localizable title and copy preserved.
- [x] Navigation, view toggle, and GUIDE remain functional.
- [x] First genre and covers visible at 1440 × 900 and 390 × 844.
- [x] Desktop/mobile/English states visually checked.
- [x] Console checked with no errors.

final result: passed

---

# 耳朵蟲 — Design QA (2026-07-22)

## Comparison Target

- Source visual truth: `/Users/huangyihong/.codex/generated_images/019f8583-6aeb-75e0-b838-c9a80cfd6c5b/exec-514f2f06-5a02-415a-81b6-742f857dcfa6.png`
- Normalized full-view comparison: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/earworm-design-qa-comparison.png`
- Implementation desktop screenshot: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/earworm-design-qa-desktop-1440x1000.png`
- Implementation mobile screenshot: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/earworm-design-qa-mobile-390x844.png`
- Preview deployment: `https://aipoger-web-rnz8-2of1lc9x7-yohungs-projects.vercel.app/earworm` (Vercel Preview Authentication remains enabled.)
- Route/state: `/earworm?genre=Rap%20街頭說唱`, loaded public same-genre A/B works, signed out.
- Viewports: 1440 × 1000 desktop and 390 × 1300 full-page mobile capture.

## Full-view Comparison Evidence

The normalized comparison places the selected mock and the browser-rendered desktop state in one image. The implementation keeps the chosen concept's core moves: a dark stage, warm orange / cool cyan A/B lanes, real cover artwork, horizontal playback controls, a centered Earworm title, three-way decision buttons, and a skip path. The implementation uses live catalog content instead of the mock's fixed sample songs and retains AIPOGER's shared fixed shell.

## Focused Region Evidence

- Header: desktop capture shows the live AIPOGER logo, Earworm title, genre selector, round indicator, and shared login/language controls without clipping.
- A/B player rows: both rows contain real cover images, live track metadata, accessible play buttons, seekable range controls, duration labels, and an 8-second readiness gate.
- Decision panel: selected state, optional explanation field, disabled submit state, APC reward copy, and skip action are visible at the same time.
- Mobile: 390px capture shows the header tools below the shared shell, two vertically stacked track rows, one-column decision buttons, and no horizontal overflow (`scrollWidth === innerWidth`).

## Required Fidelity Surfaces

- Fonts and typography: passed. The title uses the existing AIPOGER serif display font, while the listening-game index and compact labels use the existing Righteous treatment; live Chinese copy remains readable at desktop and mobile sizes.
- Spacing and layout rhythm: passed after the mobile header adjustment. Desktop uses a four-column track rhythm; mobile collapses metadata and playback into a second row while preserving tap targets and content order.
- Colors and visual tokens: passed. Near-black stage, orange primary energy, cyan secondary lane, and gold decision framing follow the existing AIPOGER visual direction and the selected mock.
- Image quality and asset fidelity: passed. The implementation uses the existing real AIPOGER logo and real public cover artwork; no fake waveform, emoji, handcrafted SVG, or baked-in UI asset is used.
- Copy and content: passed. The page clearly states the same-genre listening goal, 8-second requirement, A/B/neutral choices, skip action, and APC reward.
- Responsiveness and accessibility: passed. A/B controls have accessible labels, vote buttons expose `aria-pressed`, the submit button exposes a disabled state, and desktop/mobile browser captures show no horizontal clipping.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3 accepted: the source mock has a more theatrical speaker backdrop and a lighter title treatment; the implementation intentionally uses the shared AIPOGER shell, live public cover assets, and a restrained CSS stage treatment so the game remains a real product surface rather than a static poster.

## Interaction And Runtime Checks

- Play A: row enters the active playing state.
- A/B playback: starting one player pauses the other.
- Vote gate: selecting A before both 8-second thresholds leaves submit disabled.
- Skip: advances to the next round and reloads a same-genre pair.
- Mobile and desktop route loaded successfully from the local Next app.
- Browser console errors checked: none.
- `npm run lint`: passed with the repository's existing 12 warnings and 0 errors.
- `npm test`: passed, 224 tests.
- `npm run build`: passed before final QA capture; a final post-capture build is run as the release gate.

## Comparison History

### Pass 1

- Earlier finding: P2 mobile shared-shell controls overlapped the Earworm genre selector and page logo at the top of the 390px viewport.
- Fix: increased the Earworm mobile top padding from 1.15rem to 5.5rem so the page header clears the shared fixed controls.
- Post-fix evidence: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/earworm-design-qa-mobile-390x844.png`; `scrollWidth === 390`.

### Pass 2

- Earlier findings: none at P0/P1/P2 after the responsive fix.
- Fixes: no further blocking visual fixes; the final comparison confirms the selected visual direction remains intact with live data.
- Post-fix evidence: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/earworm-design-qa-comparison.png` and the desktop/mobile implementation captures above.

## Implementation Checklist

- [x] Selected first visual direction translated into a live `/earworm` route.
- [x] Real same-genre A/B audio playback and seek controls work.
- [x] Selection, skip, listening threshold, auth gate, duplicate protection, and APC reward path are implemented.
- [x] Desktop/mobile browser evidence captured.
- [x] Console checked with no errors.
- [x] Migration and regression tests added.
- [ ] Apply `supabase/20260722_earworm_game.sql` in the production Supabase project before enabling rewards.

final result: passed

---

# Member Gate + Four-Language Release — Design QA (2026-07-17)

## Same-Viewport Comparison

- Combined before/after input: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/member-language-fix-comparison-2026-07-17.png`
- Bible before: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-qa-2026-07-17/01-bible-gate-zh-desktop.png`
- Bible after: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/01-bible-zh-desktop.png`
- Explore Japanese before: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-qa-2026-07-17/09-explore-ja-english-fallback.png`
- Explore Japanese after: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/06-explore-ja-desktop.png`
- Bar Japanese before: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-qa-2026-07-17/14-listen-bar-ja-partial.png`
- Bar Japanese after: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/09-listen-bar-ja-desktop.png`
- All comparison pairs: 1440 × 900, signed out, default first-view state.

## Focused Evidence

- Bible focused sign-in dialog: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/02-bible-signin-dialog-zh-desktop.png`
- Explore Heart dialog: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/07-explore-heart-dialog-ja.png`
- Bar Heart dialog: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/10-listen-bar-heart-dialog-ja.png`
- Bible mobile: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/03-bible-zh-mobile.png`
- Explore Korean mobile: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/08-explore-ko-mobile.png`
- Bar Korean mobile: `/Users/huangyihong/Documents/GitHub/aipoger-web/output/playwright/member-language-fix-2026-07-17/11-listen-bar-ko-mobile.png`

## Findings And Fix History

### Pass 1

- P1: the Bible used a large sign-in headline as its primary product message. Replaced it with the normal practice value proposition and content preview; authentication now appears only in a focused system dialog when the visitor enters the protected Bible.
- P1: Japanese and Korean surfaces fell back to English or mixed Chinese on Explore and Bar Heartbreak. Added localized navigation, filters, controls, upload fields, moderation labels, queue states, title metadata, and rule summaries.
- P1: signed-out Heart presses used an inline failure instead of a clear conversion step. Added the shared focused dialog and preserved the exact track return URL.
- P2: Bar Heartbreak's rule paragraph called out sign-in requirements inside the main editorial copy. Removed the auth sentence; protected actions now explain authentication at the moment of intent.
- P2: Bar Heartbreak's browser title was reset by the App Router shell after hydration. Added a guarded head synchronization so Japanese and Korean titles remain correct.
- P2: category/control labels were low-contrast or undersized in the earlier UI. Active states now use the established orange/cyan tokens and primary controls meet a 44 px touch target.

### Pass 2

- Compared the three old/new desktop pairs in one 2880 × 2700 visual input and inspected the combined image.
- Bible normal value hero, Explore Japanese catalog, and Bar Japanese broadcast surface retain AIPOGER's existing black/orange/cyan system without clipping, accidental reflow, or washed-out inactive controls.
- 390 × 844 checks report `scrollWidth === innerWidth`; desktop checks report 1440 px for both values.
- Dynamic creator names, song titles, lyrics, taxonomy names, and AI tool names intentionally remain source-authored rather than being machine-translated.
- No actionable P0, P1, or P2 visual findings remain.

## Interaction And Accessibility Checks

- Bible entry opens one dialog, traps focus, supports Escape/backdrop close, restores focus, and keeps the normal hero visible after dismissal.
- Explore and Bar Heart dialogs use localized copy and return to the exact language and track through `/auth?next=...`.
- Japanese/Korean document language, page title, mobile overflow, and visible 44 px controls were browser-verified.
- Full typecheck, 207 tests, ESLint (0 errors), and production build passed.

final result: passed
