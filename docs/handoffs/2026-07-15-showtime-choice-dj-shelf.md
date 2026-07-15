# 2026-07-15 Showtime Choice DJ Shelf Handoff

## Decision

- `/rank` starts with a dedicated `AIPOGER Choice` curator shelf at `#choice-weekly`.
- The shelf shows only published curator avatars and compact names. Avatar play starts sequential playback; the tracklist control opens all songs.
- Public Choice copy is `由創作者選出他們心目中的歌單`.
- Showtime follows below, grouped by genre in a compact 2 / 3 / 4 / 6-card catalog.
- Choice and Showtime share one bottom queue player with seek, previous/next, and mobile volume.
- Showtime header copy is one sentence: `收錄保留已獲得反應、正式戰績或策展認可的作品： 入選後不再接受挑戰`.

## Data And Safety

- `/api/creator-choice/public` returns the latest published Choice per creator.
- It resolves only current catalog items that are both `isPublic` and `selectable`.
- Existing 5-10 item publication, creator eligibility, owner Choice separation, and no-auto-social rules remain unchanged.
- No schema migration or destructive data operation is part of this release.
