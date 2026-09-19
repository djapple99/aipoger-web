# 2026-07-10 Showtime Unified Catalog Handoff

## Decision

Showtime is now a single certified-works catalog. It no longer has separate front-stage source boards for Drop victories, Bar Heartbreak heat, or 24H records.

## Implementation Notes

- `/rank` combines official Battle archive rows and AI Music / Bar Heartbreak certified rows into one `displayRows` catalog.
- Recognition source is shown inside each card:
  - `正式 Battle 認證`
  - `探索守擂認證`
  - `傷心酒吧公播認證`
- The old source tab state, board share action, `SocialIconCluster`, `WIN/HOT` source badges, and duplicate Featured section were removed.
- `#choice-weekly` remains only as a compatibility anchor and slim curation note after the catalog.

## Verification Targets

- `/rank?lang=zh` shows `所有認證作品`.
- `/rank?lang=en` shows `All Certified Works`.
- No visible `熱血 Drop 抓波勝利榜`, `傷心酒吧熱播榜`, or `Share This Board`.
- `/today?lang=zh` redirects to `/rank?lang=zh#choice-weekly`.
- `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` should pass before deployment.
