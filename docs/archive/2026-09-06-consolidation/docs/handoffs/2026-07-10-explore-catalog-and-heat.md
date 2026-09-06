# Explore Catalog And Heat - 2026-07-10

## Active Layout

`/ai-music` is a cover-led music catalog. Keep the compact masthead, yellow subtitle, yellow Bar Heartbreak submission link, compact metadata, cross-surface navigation, 11 genre lanes, and bottom mini player. Do not restore the fake waveform, `Live Drop Signal`, `60s READY`, dashboard cards, or long first-screen gameplay explainer.

The local work-browser control is `依類型 | 正在升溫`:

- `依類型` is the default and keeps the 72-hour `created_at` fresh-work promotion and 11-lane ordering.
- `正在升溫` is a recent-discovery list, not a cross-genre strength claim, Showtime, or Choice.
- It orders real 7-day distinct Heart supporters, then official Battle audience votes, then last qualified interaction, then `created_at desc` / `id desc`.
- Official Battle votes count only from established archives with at least 3 non-participant audience voters.
- Never replace this with all-time Heart totals, play counts, mock data, a score field, or opaque Heat Score.
- No-signal works stay in `正在累積` without rank numbers. Showtime works may appear with `SHOWTIME` but no attack action.

## Data Map

- `/api/ai-music/tracks` reads `listen_bar_track_reactions` for 7-day distinct Heart account counts.
- It joins accepted Explore challenge invites to `battles` and `battle_result_archives` to include only official, recent audience votes.
- `src/lib/ai-music-heat.ts` owns the deterministic client ordering and rank/no-rank split.
