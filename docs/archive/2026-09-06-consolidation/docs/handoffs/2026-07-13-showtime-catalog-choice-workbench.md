# 2026-07-13 Showtime Catalog And Choice Workbench

## Delivered behavior

- `/admin/showtime` is now the owner-facing compact cover catalog: desktop uses six cards per row and 12 works per page, instead of one oversized full-width row per work.
- Community AI Music works can open a display editor for cover, title, creator, AI tool, fixed genre, production information, description/comment, lyrics, YouTube/MV URL, and external support URL.
- The editor does not write audio paths, certification source, Heart totals, votes, Battle results, wins/losses, or Showtime challenge state. Certified works remain `showcase` after metadata updates.
- `編輯本期 Choice` lives in the Showtime catalog. Owner can create/select a Monday-based Choice week, add or remove eligible public Showtime works with per-card checkboxes, reorder selections, and publish or withdraw the list.
- Choice continues to enforce 5-10 public Showtime works before publication. It does not create social drafts or publish externally. `/admin/choice` remains a direct route for the same stored Choice data.
- Creator Profile Showtime editing now also lets an owner replace the public cover while preserving its audio and recognition history.

## Verification to record after release

- Target Showtime/Choice tests, full test suite, lint, TypeScript and production build.
- Desktop and mobile authenticated screenshots of `/admin/showtime` showing six-card catalog and Choice selection mode.
- Production smoke on `https://aipoger.com/admin/showtime` without saving or publishing user content.
