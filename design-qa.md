# About / Partnerships design QA — 2026-10-24

final result: passed

## Comparison targets and evidence

Selected sources: `about-demo-natural.png` (1159×1357) and `partners-demo-records.png` (1159×1358), in the private design-demos/2026-10-24-about-partners folder. Browser: Codex in-app browser. Desktop viewport 1174×1358 including the 15px scrollbar; content captures are 1159px wide at CSS density 1. Earlier 1159px viewport captures had a 1144px content width and were superseded. Final full-page captures are in private audits/2026-10-24-brand-pages: about-desktop-final.png (1159×1378) and partners-desktop-final.png (1159×1395). Source and implementation were placed together in about-comparison-final.png / partners-comparison-final.png; text/CTA crops compared together in about-focus-final.png / partners-focus-final.png. Mobile: 390×844 and 320×844 (375px / 305px content with scrollbar). Closed accordions, logged-out state, zh-Hant source comparison. All four locales checked on both routes at desktop and 320px; no horizontal overflow after fixes.

## Findings and corrections

- P1: legacy floating login/presence controls overlapped the new header. Fixed by adding exactly /about and /partners to the existing editorial-route exclusions. Existing signed-in account dock remains available.
- P2: the first desktop hero cropped the listener's headphones/head. Sized the photo to the right 78% and kept its full seated composition, then recaptured and compared.
- P2: English desktop copy could expand the turntable grid's automatic minimum width and squeeze the text column to zero. Changed tracks to minmax(0, …), applied min-width:0 to the image, and adjusted non-Chinese heading sizes. All eight desktop route/locale checks now have scrollWidth === clientWidth (1159px).
- P2: heading scale and header spacing drifted from the approved mock. Adjusted scoped typography/header metrics and compared full views and focused text/CTA crops again.
- No remaining actionable P0/P1/P2 findings. P3: generated image crop and browser font glyphs are not pixel-identical to the raster mock; source subject, hierarchy, line structure, monochrome/orange palette and editorial rhythm are retained. The actual site's shared logo has an existing development-only Next image sizing warning. No production runtime console error was observed. Local Next development stylesheet HMR briefly logged removeChild errors while CSS was being edited; the rebuilt production pages do not use that HMR path.

## Required fidelity surfaces

- Typography: native site sans stack, heavy Chinese display headings and smaller labels/body copy; translated headings adapt rather than clipping. Visible Chinese headline/CTA comparison completed at 1:1 crop scale.
- Layout: full-bleed 2:1 about hero, four-column mission band, three policy rows; right photo / left copy partnership hero, three indexed rows and contact image strip. Mobile stacks images before copy and retains all actions.
- Tokens: #050505 background, #f5f5f5 heading, #ff6a00 accent, thin translucent rules, small CTA radius. Photo shading is a readability overlay, not a replacement for actual raster assets.
- Imagery: three independent generated assets matching the approved direction, WebP total 519716 bytes, responsive Next Image; heroes eager/priority and lower contact photo lazy. Existing supplied brand logo and lucide icon family reused.
- Content: approved Chinese copy; en/ja/ko introductions and partnership copy. Previous Chinese and English legal bodies, bullet items and links compared exactly against the existing source; Japanese/Korean retain the prior English legal-body fallback. Drop Battle guide source/rules unchanged.

## Interactions and accessibility

Native details open/close by click and keyboard Enter; partnership rows reveal contextual mailto links. Policy sections preserve upload rights, takedown, disclaimer and contact/source links. Correct business email and encoded subject links inspected without sending mail. Language button updates UI/URL. Home/Explore/Showtime/header/footer links keep locale; auth href returns to the same informational page. One H1 and one language control per page, visible focus outlines, descriptive hero alt, decorative photos empty alt, reduced-motion support. No backend, SQL, auth setting or real-user content writes.

## Validation

TypeScript, ESLint (0 errors / 14 pre-existing warnings), 750 tests (717 passed / 33 optional DB skipped / 0 failed) and production webpack build passed. Production verification and deployment identifiers are recorded in docs/releases/2026-10-24-brand-pages.md.
