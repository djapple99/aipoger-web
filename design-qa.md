# Homepage design QA

final result: passed

Target: user-selected homepage mock, `/Users/huangyihong/Documents/New project/outputs/aipoger-homepage-concepts/01-home-editorial-mv-focus-revision.png` (1487 × 1058). Implementation: `http://localhost:3107/?lang=zh`, signed out, black theme, loaded authentic public works. Captures are 1487 × 1058 pixels at a 1487 × 1058 CSS viewport, density 1. The source has illustrative works; real creators, covers, descriptions and current-week zero-support state intentionally replace those illustrations. No fake vote state was inserted to match the mock.

Evidence directory: `/Users/huangyihong/Documents/New project/outputs/aipoger-homepage-release/`.

Iteration 1: `comparison-before.jpg` places the source and live screenshot in the same image. P2: the 16:9 desktop poster pushed discovery too low relative to the selected panoramic composition. P2: 480px YouTube artwork looked soft at desktop scale, and 155px single artwork reduced discovery's visual presence. P2: the main frame inset was 20px wider and header branding was too small.

Fixes: desktop poster uses a 2.28 ratio, mobile preserves 16:9; real YouTube maximum-resolution thumbnails fall back through standard resolutions and actual cover artwork; single covers enlarged to 210px; main frame aligns to 1360px; header branding enlarged using the existing official logo. No raster artwork was replaced with fabricated SVG or CSS art.

Iteration 2: `comparison-after.jpg`; final recheck: `comparison-final.jpg` and full-size work-info detail `comparison-detail.jpg`. Both pair the source and implementation. `comparison-after.jpg` places the revised capture and the same source together. No remaining actionable P0/P1/P2 differences. The source's composition and hierarchy remain clear: compact navigation, featured MV and work details, orange viewing action, three singles and radio entry. Short authentic titles, attribution, truthful release label, added language switch and support action are intentional product differences. The real cover crop retains the subject; source text baked into the creator thumbnail remains creator artwork.

Fidelity surfaces:
- Fonts/typography: existing Inter/Noto Sans TC/PingFang stack; strong 50px editorial heading, 48px work title, readable 14–20px body/card text; responsive line wrapping and accessible control names. Brand uses the official raster logo plus live wordmark text; the mock's illustrative lettering is not treated as a new logo.
- Spacing/layout rhythm: matching frame and panoramic poster, 36px hero gutter, fine separator, larger square artwork; mobile stacks with 18px side margins and separate row covers. Focused hero/title/header details inspected in the same paired captures. No overlaps or horizontal document overflow at 1487, 1440, or 390px.
- Colors/tokens: #050505 background, #f5f5f5 primary text, #ff6a00 accent, quiet white-opacity rules. Computed primary button is rgb(255,106,0). No new ornamental gradients or card grid treatment.
- Image quality: authentic 1280px YouTube thumbnail loads for the real featured MV; original single covers load. Higher-resolution selection fixes the first pass softness; fallback avoids missing or tiny placeholder thumbnails. Existing brand asset retained.
- Copy/content: first viewport is MV-only, discovery is singles-only; no albums. Community labels only accompany positive real support. Actual comments carry their authors, otherwise the creator description is labeled honestly. Navigation preserves existing destinations; future MV gallery is not fabricated.

Additional UI evidence: `mobile-zh.jpg`, `mobile-en.jpg`, `comments-mobile.jpg`. Four languages checked through the language control. The modal traps focus through native dialog behavior, closes with Escape, restores focus, and shows a real no-comments state. Guest access offers login; authenticated write/auth/failure behavior is covered by runtime tests, without posting test comments or hearts to production. The existing shared player plays a real single; user-initiated YouTube playback succeeds and pauses that audio. Support deduplication, week boundaries, ties, empty and unavailable states have targeted tests.

Limitations: no live signed-in owner session was used for UI QA. Existing account/notification components are preserved; authenticated feedback transport is tested with mocks. No production test votes, comments, submissions or database migrations.

# MV gallery design QA — 2026-10-13

final result: passed

Target: user-selected `/Users/huangyihong/Documents/New project/outputs/aipoger-mv-concepts/01-mv-curated.png`, 1487 × 1058. Implementation: `/mv?lang=zh`. Evidence: `/Users/huangyihong/Documents/New project/outputs/aipoger-mv-release/`.

`comparison.jpg` combines the selected source and loaded implementation at the same 1487 × 1058 viewport in one image, visually inspected together. P2 issues repaired: the initial desktop poster was too tall and moved the catalog too low; the global guest account control duplicated the inline login; a separate filter row disrupted the three-card composition. Revised panoramic poster, shared header with MV active, hidden duplicate global guest chrome and compact combined catalog controls resolve them. No remaining actionable P0/P1/P2 differences.

Fidelity: black #050505 canvas, orange action, official existing raster logo, large editorial heading, left poster/right information, hairline separators and three 16:9 cards. Actual 48 public creator videos replace illustrative mock artwork. Current-week support is zero, so the truthful New Release label and creator description replace fabricated community endorsement. Latest/support and actual musical genres replace unsupported narrative/animation metadata. Existing four-language control is intentional. Higher-resolution YouTube thumbnail fallback is verified, including standard-resolution fallback on a real older video.

Mobile 390 × 844: stacked hero, horizontally scrollable nav, one-column cards, full-width search, usable genre select, native focus-trapping video/comments dialogs, no document overflow. English/Japanese/Korean tested through the real language switch, without overflow. Evidence: `local-mobile*.jpg`, `local-comments-mobile.jpg`; desktop `local-desktop.jpg`. Search locates a May historical submission outside the first 12 cards; actual user-initiated YouTube playback succeeds (`historical-playback.jpg`). Search/genre intersection, empty result/reset, original feedback work ID and guest login return to `/mv` verified. All links retain creator text and original work identity. Guest comments loaded to a real empty state. No test comments, hearts or uploads were posted.

Authenticated writes are covered by runtime mocks; no live owner session was used. Existing signed-in account/notice control remains preserved. Battle-specific winner-release links retain their separate permissions and original record surface; database inventory currently contains no such release URL. This gallery aggregates existing public community music submissions, including historical Showtime metadata, and separately preserves three submitted channel URLs.

Production verification: `https://aipoger.com/mv?lang=zh`, deployment `dpl_6ntBxCmThoX1rXVpFqCzFy87xNPU`, app `6d36364`. Loaded all 48 cards and preserved 3 channel links; historical work search and actual comments read succeeded. `production-desktop.jpg`, `production-mobile.jpg`, `production-comments-mobile.jpg`; no horizontal overflow or console errors.

## Featured exposure deduplication — 2026-10-13

PASSED. App `8689575`, deployment `dpl_7Bs119NdHNPPncf4bTqjQRbaaSAQ`, promoted and verified on `aipoger.com`. At 1487 × 1058 desktop and 390 × 844 mobile, the featured 救生圈 appears only in the hero; the MV first row shows 還沒學會忘記, V O R A C I O U S and 聲聲攏是愛. Full expansion under support sorting shows 47 other works; the source catalog retains all 48 plus 3 channel links. Searching the featured work points back to the hero. Homepage singles also exclude featured IDs and fill with other songs. No horizontal overflow or console errors. Evidence: `/Users/huangyihong/Documents/New project/outputs/aipoger-feature-dedup-release/`.

## MV card support and comments — 2026-10-13

final result: passed

Source: user-approved `/Users/huangyihong/.codex/generated_images/01a11410-a7ad-7352-bd36-4ff0b48ba73f/exec-d7c8d193-05ec-4812-924e-56b1f7d9e60b.png`. Implementation: production build at `http://localhost:3110/mv?lang=zh`. Evidence directory: `/Users/huangyihong/Documents/New project/outputs/aipoger-mv-actions-release/`.

`comparison-initial.jpg` and `comparison-detail-initial.jpg` exposed a P2 mismatch: title and action icons were too small for the approved hierarchy. Title increased to 22px, creator to 15px, icons to 34px inside targets of at least 44px. `comparison-final.jpg` places source and built implementation side by side at exactly 1487 × 1058 CSS/pixel viewports, density 1; `comparison-detail-final.jpg` pairs their metadata rows. Both inspected together. No remaining actionable P0/P1/P2 differences.

Five fidelity surfaces checked: existing font stack and clear title/creator hierarchy; two-row metadata with actions beside the title and no third control row; original black/orange tokens; existing authentic artwork and its original 16:9 crop; localized real titles, creators and truthful weekly counts. Lucide MessageCircleMore is the existing library's comment symbol. The generated reference slightly shortened the posters; implementation preserves original artwork/aspect ratio. Official logo, navigation, hero, ranking and featured deduplication remain intact.

Desktop 1487 × 1058 and mobile 390 × 844 have no document overflow in all four languages. `local-built-desktop.jpg`, `local-mobile-cards.jpg`, `local-comments-desktop.jpg` and `local-comments-mobile.jpg` show the two-row controls and combined video/comment dialog. Public comments open for the selected original work; explicit Watch starts the real YouTube video and pauses shared audio. Actual playback observed. Collapsing video unloads the iframe while retaining the dialog. Guest Heart routes to login with `/mv` as return path. Fresh built-page console has no errors.

Full suite: 513 tests, 482 passed, 31 existing optional DB skips, 0 failures. TypeScript and build passed; lint 0 errors and 16 existing warnings. Runtime tests cover batch private daily state, direct reaction/favorite synchronization, duplicate-click lock, failure preservation, account-change races, dialog video/draft behavior and login routing. Authenticated writes used mocks; no live signed-in owner session, production votes/comments, uploads or database migrations were used.

Production: app `5d1178d`, READY deployment `dpl_J97UK5nFW6KQJaHurB9yoNJC7fhE`, promoted to `https://aipoger.com/mv?lang=zh` and apex verified. `production-desktop.jpg`, `production-mobile-cards.jpg`, `production-comments-mobile.jpg` inspected. Real YouTube playback at 2 seconds, public empty comments, iframe unloading, focus restoration and guest Heart's `/mv` login return verified. Console has no errors. Catalog retains 48 videos and 3 channels; homepage and gallery featured deduplication intact.


## Explore redesign — 2026-10-13

final result: passed

Target: exact user-approved `/Users/huangyihong/.codex/generated_images/01a11410-a7ad-7352-bd36-4ff0b48ba73f/exec-d7da2cc1-89e8-452d-8b10-0230f51108ec.png` (1487 × 1058). Render: `http://localhost:3111/ai-music?lang=zh`, loaded actual public catalog, Jazz / Bossa guest profile completed through the existing Earworm interface. Actual creator names and covers replace illustrative names/artwork. Source depicts a signed-in avatar; rendered guest view retains the normal sign-in action. Both paired captures show active playback; the existing shared player is intentionally preserved. No fake listening time, account, score or track was inserted.

Evidence: `/Users/huangyihong/Documents/New project/outputs/aipoger-explore-release/`. Source/live captures are 1487 × 1058 at CSS viewport 1487 × 1058, density 1. Explicit screenshot clips were required because the default IAB screenshot reflected its surrounding window dimensions. `comparison-final.jpg`, `comparison-header.jpg`, and `comparison-cards.jpg` contain source and implementation together; these combined inputs were opened and visually inspected.

Findings and iterations:

- [P2, fixed] At 320px in English, the genre selector shrank to 55px. A full-width selector row below the mode/guide controls now measures 284px. Evidence: `06-local-mobile-320-en.png` → `07-local-mobile-320-en-fixed.png`; the latter was opened and inspected.
- [P2, fixed] The first desktop headline was 50px against the mock's roughly 60px display heading. The final heading is 59.48px at the reference viewport, with first covers at y=334.42 versus y=331 in the reference. Evidence: updated `11-local-final-playing.png` and paired final/header comparisons.
- [P2, fixed] Hovering artwork exposed a large Battle HUD over the new cover-led layout. Record details now open explicitly through the original info action on desktop/mobile; hover/focus reveals the compact info/share controls. Actual Battle counts remain available.
- [P2, fixed] Old recommendations could persist above a loading/error state during a locale reload. Recommendation rendering now requires ready data; no stale success catalog is shown after a failed fetch.

Required fidelity surfaces:

- Fonts/typography: existing site sans/CJK fallbacks preserve the black/orange design's clean hierarchy. Heading ~60px desktop/36px phone; section titles 30px desktop/24px phone; song titles 20px/17px; creators 14px/13px. Actual longer work names clamp at two lines and retain full accessible/link text. Larger orange heart glyphs sit beside titles within 44px targets.
- Spacing/layout: compact common header, left title, right search/radio CTA, one control strip, six square covers on desktop and two columns on phones. No giant hero or nested recommendation panel. Existing recommendation IDs are excluded from lower lanes without changing original lane order or playback queues. Authentic long names and the bottom challenge action account for additional row height relative to short illustrative titles. Main frame's 9px reference inset difference is acceptable P3.
- Colors/tokens: #050505 background, #ff6a00 radio CTA, white titles, restrained gray metadata, orange selected state/heart; no new gradients or glow panel in the catalog. Existing red challenge and yellow NEW badges retain their semantic meaning.
- Image quality: original creator imagery, original approved logo and original covers only; no fabricated replacements or code-drawn artwork. Square cover crops and source artwork text remain intact. Lucide library icons match the outlined controls.
- Copy/content: h1 探索音樂, subtitle 找到對味的歌，讓好作品被聽見。, clear 傷心酒吧／連續聽電台, recommendation taste caption, more music and original genres. All four locales checked; actual work names/creators never transcreated into demo names. Total 225 public works/14 genres is truthful at QA time, placed below the catalog.

Interaction evidence: full catalog search (7 actual 愛波哥 tracks); Jazz intersection (2 tracks); no-match/reset; 0 duplicate card IDs; direct guest heart opens auth with the original work return path; playing real audio advances to >21s with readyState=4; close player; info expand/collapse; full guest Earworm completion and return; genre/Hot Now toggle and real recent rank; guide focus trap, Escape and return. Desktop and phone zh/en/ja/ko plus 320/768/1280 widths inspected; no page overflow; local console errors none.

Implementation checklist: all P0/P1/P2 findings resolved; responsive and interaction checks passed; real data/assets verified; production gate can proceed. Remaining P3: the authentic titles, support counts, public affinity badge, preserved player and signed-out account action intentionally differ from the illustrative mock. No further polish loop.

Production verification: app `e8f2977`, READY deployment `dpl_M3wZ23ATz3CPV6vjo9uUZkiYgKZW`, promoted to apex and www. Actual public catalog remains 225 works at acceptance time. The existing production-origin K-Pop guest profile remains intact. Full catalog search finds 7 愛波哥 songs, Jazz intersection finds 2, no-match/reset and 0 duplicated visible work IDs verified; original global Hot Now ranks and guest Heart return path preserved. Real audio advanced beyond 34 seconds at readyState 4, then the shared player was closed. Record info expanded/collapsed successfully. Production desktop and 390px phone in zh/en/ja/ko have no document overflow; screenshots `13-production-desktop.png` through `17-production-mobile-ja.png` saved privately. Homepage/MV/auth/radio still return HTTP 200. No live owner writes, test support, comments, submissions or SQL changes.
