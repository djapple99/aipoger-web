# Homepage design QA

final result: passed

Target: user-selected homepage mock, `/Users/huangyihong/Documents/New project/outputs/aipoger-homepage-concepts/01-home-editorial-mv-focus-revision.png` (1487 × 1058). Implementation: `http://localhost:3107/?lang=zh`, signed out, black theme, loaded authentic public works. Captures are 1487 × 1058 pixels at a 1487 × 1058 CSS viewport, density 1. The source has illustrative works; real creators, covers, descriptions and current-week zero-support state intentionally replace those illustrations. No fake vote state was inserted to match the mock.

Evidence directory: `/Users/huangyihong/Documents/New project/outputs/aipoger-homepage-release/`.

Iteration 1: `comparison-before.jpg` places the source and live screenshot in the same image. P2: the 16:9 desktop poster pushed discovery too low relative to the selected panoramic composition. P2: 480px YouTube artwork looked soft at desktop scale, and 155px single artwork reduced discovery's visual presence. P2: the main frame inset was 20px wider and header branding was too small.

Fixes: desktop poster uses a 2.28 ratio, mobile preserves 16:9; real YouTube maximum-resolution thumbnails fall back through standard resolutions and actual cover artwork; single covers enlarged to 210px; main frame aligns to 1360px; header branding enlarged using the existing official logo. No raster artwork was replaced with fabricated SVG or CSS art.

Iteration 2: `comparison-after.jpg` places the revised capture and the same source together. No remaining actionable P0/P1/P2 differences. The source's composition and hierarchy remain clear: compact navigation, featured MV and work details, orange viewing action, three singles and radio entry. Short authentic titles, attribution, truthful release label, added language switch and support action are intentional product differences. The real cover crop retains the subject; source text baked into the creator thumbnail remains creator artwork.

Fidelity surfaces:
- Fonts/typography: existing Inter/Noto Sans TC/PingFang stack; strong 50px editorial heading, 48px work title, readable 14–20px body/card text; responsive line wrapping and accessible control names. Brand uses the official raster logo plus live wordmark text; the mock's illustrative lettering is not treated as a new logo.
- Spacing/layout rhythm: matching frame and panoramic poster, 36px hero gutter, fine separator, larger square artwork; mobile stacks with 18px side margins and separate row covers. Focused hero/title/header details inspected in the same paired captures. No overlaps or horizontal document overflow at 1487, 1440, or 390px.
- Colors/tokens: #050505 background, #f5f5f5 primary text, #ff6a00 accent, quiet white-opacity rules. Computed primary button is rgb(255,106,0). No new ornamental gradients or card grid treatment.
- Image quality: authentic 1280px YouTube thumbnail loads for the real featured MV; original single covers load. Higher-resolution selection fixes the first pass softness; fallback avoids missing or tiny placeholder thumbnails. Existing brand asset retained.
- Copy/content: first viewport is MV-only, discovery is singles-only; no albums. Community labels only accompany positive real support. Actual comments carry their authors, otherwise the creator description is labeled honestly. Navigation preserves existing destinations; future MV gallery is not fabricated.

Additional UI evidence: `mobile-zh.jpg`, `mobile-en.jpg`, `comments-mobile.jpg`. Four languages checked through the language control. The modal traps focus through native dialog behavior, closes with Escape, restores focus, and shows a real no-comments state. Guest access offers login; authenticated write/auth/failure behavior is covered by runtime tests, without posting test comments or hearts to production. The existing shared player plays a real single; user-initiated YouTube playback succeeds and pauses that audio. Support deduplication, week boundaries, ties, empty and unavailable states have targeted tests.

Limitations: no live signed-in owner session was used for UI QA. Existing account/notification components are preserved; authenticated feedback transport is tested with mocks. No production test votes, comments, submissions or database migrations.
