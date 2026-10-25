# MV discovery design QA — 2026-10-25

Source: the user's selected first displayed design, `displayed-1-dual-column.png` (1487×1058). Implementation: the existing `/mv` component, 1440×1024 CSS viewport (1425px content width); captured JPEG 1425×1013. Comparison presents both complete captures at equal width. Evidence is in the private `audits/2026-10-25-mv-popularity/` folder; final combined input is `comparison-desktop-final.jpg`.

## Comparison history

- Initial implementation: rank detail text was too small and Heart hit areas were narrower than 44px; catalogue began at y=1075. Fixed detail text to 12px, interaction targets to 44px, and compacted desktop title/section/card spacing. Revised catalogue begins at y=999.9. Recaptured and compared the revised implementation against the selected source.
- Fonts/typography: existing AIPOGER font and weights retained; title, section headings, rank rows and caption hierarchy match the selected direction. Long real titles are ellipsized on desktop previews and use two lines on phones, with full titles in the original work view.
- Spacing/layout: persistent chart left, four newest works in a 2×2 landscape grid right, complete catalogue below. No review quotation hero or empty media column. The catalogue heading is slightly lower than the image mock because accessible controls retain 44px targets; this is an accepted P3 density difference.
- Colors/tokens: original near-black, orange actions/Hearts and muted dividers retained; no new card panels, shadows or alternate brand palette.
- Image quality: actual work-owned YouTube covers replace the mock's invented imagery. 16:9 cropping and existing maxres/SD/HQ fallbacks retained; the fourth new cover was verified to fall back from the 120px unavailable image to its 480×360 HQ cover. No generated mock identities, scores or rankings are published.
- Copy/content: ratings /10, rater count and distinct saves are separate. Newest exposure does not depend on rating. Actual public work IDs and names are preserved. The guide and metadata are translated in zh/en/ja/ko.

## Functional and responsive evidence

Local visual rendering used a sanitized snapshot of the existing public APIs because Vercel production secret values cannot be downloaded. This is a visual fixture, not evidence that local database access works. All local writes are blocked. Real server aggregation is separately covered by runtime tests and the staged production API check before release.

- Search for RUNRUNRUN filters to its original work ID; popularity sorting follows the chart while the newest area remains chronological.
- Complete catalogue pagination and continuous playback are covered by runtime regression tests, including END while review submission is pending.
- The original YouTube MV played to 45.99 seconds, with its original 9.1 rating / one rater and existing public comment read successfully. No new rating, comment or Heart was submitted.
- 320×800 CSS mobile checks in zh/en/ja/ko: content width and scroll width both 305px (scrollbar excluded), no horizontal overflow. Chart initially collapsed; expand/collapse works. Newest content remains visible in the first screen. Browser viewport checks, not physical iOS tests.
- Final production-build local preview has no application console error. Earlier dev-server errors were environment-only and are excluded from the final run.

No actionable P0/P1/P2 visual findings remain. The accepted P3 difference is the modest extra catalogue offset for real captions and accessible hit areas.

## Production follow-through

App `ea9ea8a`, deployment `dpl_DmFRys9uJtntpWB4cQn7qUd2ixem` is READY and aliased to aipoger.com/www. Real staged API confirms all 92 public MVs retained, all 58 eligible ranks exactly match Explore, prior ratings and saves unchanged. Production matches the staged dataset; original public comments unchanged. Actual YouTube playback reached 22.326 seconds, paused=false. Production desktop and four-language 320px mobile checks pass, with no horizontal overflow or console error/warning. Screenshot: `production-desktop.jpg` in the same private audit folder. Full tests: 780 passed / 31 existing optional DB skips / 0 failed (811 total). See `docs/releases/2026-10-25-mv-popularity-newest.md`.

final result: passed
