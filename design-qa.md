# Showtime Editorial Design QA

Updated: 2026-09-18 00:42 Asia/Taipei.

Previous Explore and other design QA evidence is preserved verbatim in [historical QA](docs/archive/2026-09-18-design-qa-history.md).

## Visual Target

- Source: user-provided Beatport reference, `/var/folders/z5/42v3w_nj2_b36bxx5c2559ph0000gn/T/TemporaryItems/NSIRD_screencaptureui_qMhc31/截屏2026-09-18 凌晨12.13.08.png` (2352 x 1478 pixels).
- This is an approved structural adaptation, not a pixel clone: Choice artwork replaces release advertising; monthly song support replaces sales ranks. No invented ad, exclusive ribbon, New Releases shelf or extra placeholder content.
- Local implementation: `http://localhost:3037/rank?lang=zh`, real production public GET data intercepted only in the test browser; no production content writes.
- Desktop viewport: 1440 x 900 CSS px, deviceScaleFactor 1; full-page evidence `output/playwright/editorial-zh-1440.png` (1440 x 1149). Mobile: 390 x 844 CSS px, full-page evidence `output/playwright/editorial-{zh,en,ja,ko}-390.png`. Source and implementation opened together in one comparison input; compared composition at proportional display scale, not raw pixel identity across different products.

## Findings And Iteration

- Initial P2: lead cover at the 1440px content width pushed title/actions too far below the first viewport. Fixed with a 1280px content constraint and a one-line lead excerpt. Re-captured the eight desktop/mobile language views.
- Initial captures sometimes preceded image completion. Replaced those evidence captures after checking every visible image was complete with nonzero natural width. This was a capture timing issue, not missing production assets.
- Local HTTP preview proxy prevented development hydration. Rechecked through direct Next dev connection with test-browser public GET interception. Local analytics lacks a service key and returns 500; later interaction checks stubbed only that local analytics write. Production is verified separately in the release report.
- No remaining actionable P0/P1/P2 visual findings in the revised capture.

## Required Surfaces

- Typography: existing Glow Sans/Righteous identity; compact 24/30px page title, 20px section headings; track titles wrap to two lines and do not collide with rank/actions. Zero added letter spacing.
- Layout: approximately 70/30 desktop grid; square lead/companion artwork; unframed sections, restrained rules. Mobile lead -> chart summary -> more Choices. One create action, no view tabs, no horizontal overflow at either size in zh/en/ja/ko.
- Colors: charcoal base, orange primary playback/action, cyan artist identity. Artwork supplies the varied color. No decorative gradients or ad placeholder.
- Images: existing uploaded covers and AIPOGER watermark retained; no generated replacement artwork. All visible images loaded in the revised eight captures. Aspect ratios remain square.
- Copy: clear Choice/monthly labels, honest unranked support-building section; no certification, fake Top 10 or automatic endorsement label. Source-image promotional copy is not an instruction or site copy.
- Focused review: mobile interactive tracklist `output/playwright/editorial-mobile-hud.png`; title, full intro, bounded scrolling rows and bottom actions remain readable. The reference does not include a modal/mobile state, so these are native product adaptations.

## Interaction Evidence

- Summary five rows, expand 27 real records, collapse; Taiwanese genre filter four records.
- Native chart-rules dialog opens/closes; ten-song Choice HUD opens; Play All starts actual audio with readyState 4 and advancing time; no mobile overflow.
- Automated runtime tests cover featured selection, missing/unplayable feature, HUD freshness/removal, summary/expansion and full ranked queue.
- Owner API tests cover 401/403, invalid keys, withdrawn/deleted/unplayable selections, clear, private storage errors and featured collections beyond the usual read limit. No real account mutation used for QA.

## Residual Scope

- Only two public Choices currently exist; no more-cover desktop shelf is fabricated. Additional real entries populate the existing grid.
- Previously documented comments-network-rejection/localization follow-up is unchanged; not a new editor or comments rewrite.
- Authenticated owner UI save is not exercised against production; actual route execution is covered with isolated I/O tests.

final result: passed
