# Creation Bible design QA — 2026-10-15

final result: passed

## Visual truth and evidence

- Approved source: `/Users/huangyihong/Documents/New project/output/designs/2026-10-15-bible/creation-bible-desktop.png` (1487×1058 raster; no authoritative CSS frame).
- Browser implementation: `/Users/huangyihong/Documents/New project/audits/2026-10-15-bible-redesign/production-desktop.png` (1425×1013 capture); Chrome viewport override 1440×1024 CSS px, actual client 1425×1024, devicePixelRatio 1. Browser capture excludes its scrollbars. Compared source uniformly normalized to implementation width (~0.9583), preserving the virtually identical aspect ratio.
- Mobile: `production-mobile.png` in the same evidence directory, 375×812 capture from 390×844 override; 320px also checked (305px client after scrollbar).
- State: live signed-in member, loaded real catalog (163 Prompt moves), Chinese, landing chapters closed. Production `6878560`, `dpl_7rPqErjZbvMsNiQqWUBbrrP3Vmk8` READY and apex/www aliases.
- Full source and full implementation were displayed together; focused comparison covered header/title, four route blocks, three lessons, and the common-moves/problem pair. These are vector/text UI, so separate asset crop comparison was unnecessary.

## Findings and resolutions

- No remaining actionable P0/P1/P2 findings.
- P2 fixed during implementation: repeated anchors could leave a collapsed chapter hidden; explicit hash notification and chapter matching now reopen it. Runtime test and real navigation passed.
- P2 fixed: search text could be lost before the lazy DNA index mounted; persist `bibleSearch` in the URL and restore on index mount/hash navigation. Tested with the actual index search.
- P2 fixed: mobile native category scrollbar was too bright; applied thin orange/dark styling, balanced color-block subtitles. Primary copy targets remain 44px.
- Initial temporary fixture used another URL and therefore showed old global overlays. Final local fixture used the actual route and production confirms one editorial header, no duplicate home/language/presence overlay. All fixture code was removed before TypeScript/build/commit; production fixture URL returns 404.

## Required fidelity surfaces

- Typography: native site sans stack, bold H1 46px desktop/34px phone, section heads 27px desktop/21px phone, short readable descriptions. The mock's illustrative lettering is approximated with the existing site family; CJK weight and hierarchy are preserved, not replaced by an unrelated display face. English and ja/ko member fallback were checked without horizontal overflow.
- Spacing/layout: four equal route columns, compact three-column lesson block, lower content roughly 2.25:1; 10–16px section gutters. Mobile routes are 2×2, lessons stack, long move descriptions are hidden. Full material is retained below in five collapsible chapters, an intentional functional extension beyond the mock's crop.
- Colors: charcoal #0b0d10 / #101419, orange #ff8c38, green #6ed2b5, purple #b79be9, blue #83b9f4. Dark colored route surfaces preserve depth and distinguish categories. No white-page jump.
- Assets: existing AIPOGER brand logo remains sharp; standard lucide piano/sliders/music/disc/mic icons use the established UI library. No generated illustration or product photography was required. Real account avatar and language control replace the mock's generic avatar as expected.
- Copy/content: matches approved four routes and three starter lessons. Seven-part DNA includes genre, subgenre, mood, instruments, tempo, key and texture. Common moves use actual editable catalog titles/copy rather than fabricated lesson content; summaries may be two-line truncated. No invented progress/popularity or Credit pricing.

## Interaction and production checks

- Local real browser: category change, full-text clipboard readback, direct move reveal, chorus recipe reveal, cross-index query, actual 15-second mastering audio playing (11.15s observed), shared bottom player.
- Production real member: 163 moves loaded, search “七格” opens correct expanded DNA move, mobile share clipboard contains the canonical Bible URL. Chinese, English, Japanese and Korean entrances checked; ja/ko member material follows existing English fallback. Widths: 390px override client=scroll=375; 320px client=scroll=305.
- Production console error log empty. Local dev had an extension-injected HTML hydration attribute and temporary local analytics configuration warnings; these did not reproduce on production.
- Signed-out API returns 401; signed-out IAB shows public preview/sign-in dialog, preserving the original membership boundary. No auth bypass or fixture route shipped.
- Full suite: 647 tests, 615 passed, 32 optional database tests skipped, zero failed. TypeScript and webpack production build passed. Lint zero errors / 14 pre-existing warnings outside touched files.

## Residual scope

No physical iOS/Safari device test. Public FAQ and member entry comments retain their existing behavior. No SQL, scoring, credit, price, permissions or storage changes. Documentation records the new route arrangement as the current design.
