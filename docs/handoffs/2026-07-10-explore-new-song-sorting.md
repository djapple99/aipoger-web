# Explore AI Music New-Song Sorting - 2026-07-10

## Active Rule

Explore remains one 11-genre work wall. It has no standalone `最新上架`, `New Arrivals`, or `72 小時新歌` shelf, route, category, independent `看更多`, or NEW label.

- A display-eligible public/community work is fresh for 72 hours from `created_at`.
- Fresh works lead their own genre lane by `created_at desc`, `id desc`.
- A lane with fresh works leads the wall by its newest fresh `created_at`; lanes without fresh works retain the fixed genre order.
- After fresh works, established works sort by public positive reactions, `created_at desc`, then `id desc`.
- In a collapsed lane, one creator gets at most one fresh card among the first 6. Their other fresh uploads remain in the expanded `看更多` view.
- `updated_at` is not part of freshness or lane ordering. Editing metadata cannot re-promote an older work.

## Implementation Map

- `src/lib/ai-music-explore-order.ts` owns the deterministic lane ordering and compact-lane anti-flood behavior.
- `src/app/ai-music/ai-music-client.tsx` renders the returned lane order and switches between `collapsedTracks` and the full same-lane list.
- `src/app/api/ai-music/tracks/route.ts` only supplies active, playable, current-genre, non-hidden/non-removed/non-moderation-hold community works. It returns `created_at` and does not select or use `updated_at` for Explore ordering.
- `tests/ai-music-new-arrivals-order.test.mjs` covers freshness, lane promotion, expiration, creator compact-lane limits, and no standalone shelf regression.
