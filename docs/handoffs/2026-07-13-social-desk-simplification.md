# Social Desk simplification - 2026-07-13

## Current production rule

- `/admin/social` is the only social publishing console. It shows a compact connection strip, a single draft entry point, and collapsed draft rows; platform content opens only when an admin chooses to manage that draft.
- A `configured` connection status means the relevant runtime credential exists. It is not a delivery test and must not trigger automatic outbound traffic.
- Discord uses `SOCIAL_DISCORD_WEBHOOK_URL` (or the legacy Discord webhook aliases) and only sends after approval plus an explicit platform send action.
- X direct publishing requires `X_USER_ACCESS_TOKEN` or `SOCIAL_X_USER_ACCESS_TOKEN` with user-context `tweet.write`; do not use an app-only bearer token for publishing.
- Instagram and YouTube are draft-only. Facebook Group publishing is manual. TikTok is excluded from active UI, new draft generation, and publish actions, while historical rows remain retained.

## Release verification

- Verify `/api/admin/social` returns the five active platform statuses without exposing environment key names or secrets.
- Verify the authenticated Social Desk shows `手動公告 | Battle 戰報`, the compact status strip, and no TikTok control.
- Do not create, approve, or publish a social post during a connection check unless the user has explicitly requested that external action.
